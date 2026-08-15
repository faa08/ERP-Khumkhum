'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-guard';
import { logAuditEvent } from '@/actions/audit';
import { sendWhatsAppMessage, formatSortationSummaryMessage } from '@/lib/whatsapp';
import { revalidatePath } from 'next/cache';
import type { DbSorting, DbReceiving } from '@/types/database';

export async function getSortings(): Promise<{
  success: boolean;
  data?: DbSorting[];
  error?: string;
}> {
  try {
    await requireAuth(['WAREHOUSE', 'SUPER_ADMIN', 'MANAGEMENT', 'QC', 'PRODUCTION']);

    const { data, error } = await supabaseAdmin
      .from('sortings')
      .select(`
        *,
        receiving:receivings(id, batch_number, weight, farmer_id, farmer:farmers(name, phone_number))
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    return { success: true, data: (data || []) as DbSorting[] };
  } catch (err: any) {
    console.error('getSortings error:', err);
    return { success: false, error: err.message };
  }
}

/** Get receivings yang belum disortasi */
export async function getUnsortedReceivings(): Promise<{
  success: boolean;
  data?: Pick<DbReceiving, 'id' | 'batch_number' | 'weight' | 'farmer_id' | 'farmer'>[];
  error?: string;
}> {
  try {
    await requireAuth(['WAREHOUSE', 'SUPER_ADMIN', 'PRODUCTION', 'QC']);

    // Ambil receiving IDs yang sudah punya sortasi
    const { data: sortedIds } = await supabaseAdmin
      .from('sortings')
      .select('receiving_id');

    const usedIds = (sortedIds || []).map((s: any) => s.receiving_id);

    let query = supabaseAdmin
      .from('receivings')
      .select('id, batch_number, weight, farmer_id, farmer:farmers(id, name, phone_number)')
      .in('status', ['RECEIVED', 'PENDING_SORTING'])
      .order('created_at', { ascending: false });

    if (usedIds.length > 0) {
      query = query.not('id', 'in', `(${usedIds.join(',')})`);
    }

    const { data, error } = await query;
    if (error) throw error;

    return { success: true, data: (data || []) as any };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export interface CreateSortingInput {
  receiving_id: string;
  leaf_weight: number;   // W_daun
  stem_weight: number;   // W_batang
}

export async function createSorting(input: CreateSortingInput): Promise<{
  success: boolean;
  data?: DbSorting;
  error?: string;
}> {
  try {
    const { user } = await requireAuth(['WAREHOUSE', 'SUPER_ADMIN', 'PRODUCTION']);

    const total = input.leaf_weight + input.stem_weight;
    const leaf_percentage = total > 0 ? (input.leaf_weight / total) * 100 : 0;
    const leafPct = parseFloat(leaf_percentage.toFixed(2));

    let quality_grade = 'C';
    if (leafPct >= 80) quality_grade = 'A';
    else if (leafPct >= 75) quality_grade = 'B';

    const is_standard_compliant = leafPct >= 75;

    const payload = {
      receiving_id: input.receiving_id,
      leaf_weight: input.leaf_weight,
      stem_weight: input.stem_weight,
      leaf_percentage: leafPct,
      quality_grade,
      is_standard_compliant,
      accepted_quantity: input.leaf_weight,
      rejected_quantity: 0,
      waste: input.stem_weight,
      sorted_by: user.userId,
      sorting_date: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from('sortings')
      .insert([payload])
      .select(`
        *,
        receiving:receivings(id, batch_number, weight, farmer_id, farmer:farmers(name, phone_number))
      `)
      .single();

    if (error) throw error;

    // Update receiving status menjadi SORTED
    await supabaseAdmin
      .from('receivings')
      .update({ status: 'SORTED' })
      .eq('id', input.receiving_id);

    // Tambahkan stok jamur bersih (leaf_weight) ke inventory Bahan Baku Siap Produksi
    const { data: rawJamur } = await supabaseAdmin
      .from('raw_materials')
      .select('id')
      .ilike('name', '%jamur%')
      .limit(1)
      .single();

    if (rawJamur?.id && input.leaf_weight > 0) {
      const { data: wh } = await supabaseAdmin
        .from('warehouses')
        .select('id')
        .limit(1)
        .single();

      if (wh?.id) {
        const { data: existingInv } = await supabaseAdmin
          .from('inventory')
          .select('*')
          .eq('warehouse_id', wh.id)
          .eq('item_type', 'RAW_MATERIAL')
          .eq('item_id', rawJamur.id)
          .limit(1);

        let invId = '';
        if (existingInv && existingInv.length > 0) {
          invId = existingInv[0].id;
          const newQty = Number(existingInv[0].quantity) + Number(input.leaf_weight);
          await supabaseAdmin
            .from('inventory')
            .update({ quantity: newQty, last_updated_at: new Date().toISOString() })
            .eq('id', invId);
        } else {
          const { data: newInv } = await supabaseAdmin
            .from('inventory')
            .insert([
              {
                warehouse_id: wh.id,
                item_type: 'RAW_MATERIAL',
                item_id: rawJamur.id,
                batch_number: data.receiving?.batch_number || 'RM-SORTED',
                quantity: input.leaf_weight,
                last_updated_at: new Date().toISOString(),
              },
            ])
            .select('id')
            .single();
          invId = newInv?.id || '';
        }

        if (invId) {
          await supabaseAdmin.from('stock_movements').insert([
            {
              inventory_id: invId,
              movement_type: 'IN',
              quantity: input.leaf_weight,
              reference_id: data.id,
              reference_type: 'SORTING_ACCEPTANCE',
              notes: `Hasil sortasi jamur bersih dari batch ${data.receiving?.batch_number || ''}`,
              movement_date: new Date().toISOString(),
              created_by: user.userId,
            },
          ]);
        }
      }
    }

    // Kirim WA info hasil sortasi
    const farmerPhone = data?.receiving?.farmer?.phone_number;
    const farmerName = data?.receiving?.farmer?.name;
    if (farmerPhone && farmerName) {
      const msg = formatSortationSummaryMessage({
        farmerName,
        batchNumber: data.receiving.batch_number,
        gradeA: quality_grade === 'A' ? input.leaf_weight : 0,
        gradeB: quality_grade === 'B' ? input.leaf_weight : 0,
        waste: input.stem_weight,
      });
      await sendWhatsAppMessage({ target: farmerPhone, message: msg });
    }

    await logAuditEvent({
      userId: user.userId,
      action: 'CREATE',
      entityType: 'sorting',
      entityId: data.id,
      details: { leaf_percentage: leafPct, quality_grade, receiving_id: input.receiving_id },
    });

    revalidatePath('/sorting');
    revalidatePath('/inventory');
    revalidatePath('/production');

    return { success: true, data: data as DbSorting };
  } catch (err: any) {
    console.error('createSorting error:', err);
    return { success: false, error: err.message };
  }
}

export interface UpdateSortingInput {
  id: string;
  leaf_weight: number;
  stem_weight: number;
}

export async function updateSorting(input: UpdateSortingInput): Promise<{
  success: boolean;
  data?: DbSorting;
  error?: string;
}> {
  try {
    const { user } = await requireAuth(['WAREHOUSE', 'SUPER_ADMIN', 'PRODUCTION']);

    // Ambil data sortasi lama
    const { data: oldSorting, error: oldErr } = await supabaseAdmin
      .from('sortings')
      .select(`
        *,
        receiving:receivings(id, batch_number, weight, farmer_id, farmer:farmers(name, phone_number))
      `)
      .eq('id', input.id)
      .single();

    if (oldErr || !oldSorting) throw new Error('Data sortasi tidak ditemukan');

    const total = input.leaf_weight + input.stem_weight;
    const leaf_percentage = total > 0 ? (input.leaf_weight / total) * 100 : 0;
    const leafPct = parseFloat(leaf_percentage.toFixed(2));

    let quality_grade = 'C';
    if (leafPct >= 80) quality_grade = 'A';
    else if (leafPct >= 75) quality_grade = 'B';

    const is_standard_compliant = leafPct >= 75;

    const payload = {
      leaf_weight: input.leaf_weight,
      stem_weight: input.stem_weight,
      leaf_percentage: leafPct,
      quality_grade,
      is_standard_compliant,
      accepted_quantity: input.leaf_weight,
      waste: input.stem_weight,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from('sortings')
      .update(payload)
      .eq('id', input.id)
      .select(`
        *,
        receiving:receivings(id, batch_number, weight, farmer_id, farmer:farmers(name, phone_number))
      `)
      .single();

    if (error) throw error;

    // Selisih penyesuaian stok jamur bersih
    const oldWeight = Number(oldSorting.leaf_weight || oldSorting.accepted_quantity || 0);
    const weightDiff = input.leaf_weight - oldWeight;

    if (weightDiff !== 0) {
      const { data: rawJamur } = await supabaseAdmin
        .from('raw_materials')
        .select('id')
        .ilike('name', '%jamur%')
        .limit(1)
        .single();

      if (rawJamur?.id) {
        const { data: invList } = await supabaseAdmin
          .from('inventory')
          .select('*')
          .eq('item_type', 'RAW_MATERIAL')
          .eq('item_id', rawJamur.id)
          .limit(1);

        if (invList && invList.length > 0) {
          const newQty = Math.max(0, Number(invList[0].quantity) + weightDiff);
          await supabaseAdmin
            .from('inventory')
            .update({ quantity: newQty, last_updated_at: new Date().toISOString() })
            .eq('id', invList[0].id);

          await supabaseAdmin.from('stock_movements').insert([
            {
              inventory_id: invList[0].id,
              movement_type: weightDiff > 0 ? 'IN' : 'OUT',
              quantity: Math.abs(weightDiff),
              reference_id: input.id,
              reference_type: 'SORTING_ADJUSTMENT',
              notes: `Koreksi timbangan sortasi batch ${oldSorting.receiving?.batch_number || ''}`,
              movement_date: new Date().toISOString(),
              created_by: user.userId,
            },
          ]);
        }
      }
    }

    // Kirim notifikasi WA koreksi ke petani
    const farmerPhone = data?.receiving?.farmer?.phone_number;
    const farmerName = data?.receiving?.farmer?.name;
    if (farmerPhone && farmerName) {
      const msg = `*KOREKSI HASIL SORTASI JAMUR*\n---------------------------------------\nHalo *${farmerName}*,\nTerdapat pembaruan data sortasi untuk batch *${data.receiving.batch_number}*:\n\n` +
        `✅ *Grade A (Jamur Bersih):* ${quality_grade === 'A' ? input.leaf_weight : 0} kg\n` +
        `⚠️ *Grade B (Cacat Ringan):* ${quality_grade === 'B' ? input.leaf_weight : 0} kg\n` +
        `❌ *Afkir / Batang:* ${input.stem_weight} kg\n\n` +
        `_Data terbaru telah disesuaikan di sistem ERP KhumKhum. Terima kasih!_`;
      await sendWhatsAppMessage({ target: farmerPhone, message: msg });
    }

    await logAuditEvent({
      userId: user.userId,
      action: 'UPDATE',
      entityType: 'sorting',
      entityId: input.id,
      details: { old_leaf_weight: oldWeight, new_leaf_weight: input.leaf_weight, quality_grade },
    });

    revalidatePath('/sorting');
    revalidatePath('/inventory');
    revalidatePath('/production');

    return { success: true, data: data as DbSorting };
  } catch (err: any) {
    console.error('updateSorting error:', err);
    return { success: false, error: err.message };
  }
}
