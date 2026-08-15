'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-guard';
import { logAuditEvent } from '@/actions/audit';
import { sendWhatsAppMessage, formatSortationSummaryMessage } from '@/lib/whatsapp';
import type { DbSorting, DbReceiving } from '@/types/database';

export async function getSortings(): Promise<{
  success: boolean;
  data?: DbSorting[];
  error?: string;
}> {
  try {
    await requireAuth(['WAREHOUSE', 'SUPER_ADMIN', 'MANAGEMENT', 'QC']);

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
    await requireAuth(['WAREHOUSE', 'SUPER_ADMIN']);

    // Ambil receiving IDs yang sudah punya sortasi
    const { data: sortedIds } = await supabaseAdmin
      .from('sortings')
      .select('receiving_id');

    const usedIds = (sortedIds || []).map((s: any) => s.receiving_id);

    let query = supabaseAdmin
      .from('receivings')
      .select('id, batch_number, weight, farmer_id, farmer:farmers(id, name, phone_number)')
      .eq('status', 'PENDING_SORTING')
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
    const { user } = await requireAuth(['WAREHOUSE', 'SUPER_ADMIN']);

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

    return { success: true, data: data as DbSorting };
  } catch (err: any) {
    console.error('createSorting error:', err);
    return { success: false, error: err.message };
  }
}
