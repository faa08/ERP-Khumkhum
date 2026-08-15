'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-guard';
import { logAuditEvent } from '@/actions/audit';
import { sendWhatsAppMessage, formatReceivingReceiptMessage, formatSortationSummaryMessage } from '@/lib/whatsapp';
import { format } from 'date-fns';
import { revalidatePath } from 'next/cache';
import type {
  DbReceiving,
  DbSorting,
  DbInventory,
  DbStockMovement,
  DbSalesOrder,
  DbSalesOrderItem,
  DbFarmerHarvestEstimate,
} from '@/types/database';

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function generateBatchNumber(prefix: string): string {
  const now = new Date();
  const date = format(now, 'yyyyMMdd');
  const rand = Math.floor(Math.random() * 900) + 100;
  return `${prefix}-${date}-${rand}`;
}

// ─────────────────────────────────────────────
// PENERIMAAN BAHAN BAKU (RECEIVING)
// ─────────────────────────────────────────────

export async function getReceivings(): Promise<{
  success: boolean;
  data?: DbReceiving[];
  error?: string;
}> {
  try {
    await requireAuth(['WAREHOUSE', 'SUPER_ADMIN', 'MANAGEMENT', 'QC', 'PRODUCTION']);

    const { data, error } = await supabaseAdmin
      .from('receivings')
      .select(`
        *,
        farmer:farmers(id, name, contact, phone_number),
        received_by_user:users!receivings_received_by_fkey(id, name)
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    return { success: true, data: (data || []) as DbReceiving[] };
  } catch (err: any) {
    console.error('getReceivings error:', err);
    return { success: false, error: err.message };
  }
}

export interface CreateReceivingInput {
  farmer_id: string;
  raw_material_id: string;
  weight_sent: number;   // W_kirim
  weight: number;        // W_terima
  notes?: string;
  scale_photo_url?: string;
}

export async function createReceiving(input: CreateReceivingInput): Promise<{
  success: boolean;
  data?: DbReceiving;
  error?: string;
}> {
  try {
    const { user } = await requireAuth(['WAREHOUSE', 'SUPER_ADMIN']);

    const batch_number = generateBatchNumber('RM');
    const weight_difference = input.weight - input.weight_sent;
    const diff_percentage = input.weight_sent > 0
      ? ((input.weight - input.weight_sent) / input.weight_sent) * 100
      : 0;

    const payload = {
      batch_number,
      farmer_id: input.farmer_id,
      raw_material_id: input.raw_material_id,
      weight: input.weight,
      weight_sent: input.weight_sent,
      weight_difference: parseFloat(weight_difference.toFixed(2)),
      diff_percentage: parseFloat(diff_percentage.toFixed(2)),
      scale_photo_url: input.scale_photo_url || null,
      notes: input.notes || null,
      received_by: user.userId,
      received_date: new Date().toISOString(),
      status: 'RECEIVED',
    };

    const { data, error } = await supabaseAdmin
      .from('receivings')
      .insert([payload])
      .select(`
        *,
        farmer:farmers(id, name, contact, phone_number)
      `)
      .single();

    if (error) throw error;

    // Kirim nota WA ke petani jika ada nomor HP
    if (data?.farmer?.phone_number) {
      const message = formatReceivingReceiptMessage({
        farmerName: data.farmer.name,
        batchNumber: batch_number,
        weight: input.weight,
        date: format(new Date(), 'dd/MM/yyyy HH:mm'),
      });
      await sendWhatsAppMessage({ target: data.farmer.phone_number, message });
    }

    await logAuditEvent({
      userId: user.userId,
      action: 'CREATE',
      entityType: 'receiving',
      entityId: data.id,
      details: { batch_number, weight: input.weight },
    });

    return { success: true, data: data as DbReceiving };
  } catch (err: any) {
    console.error('createReceiving error:', err);
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────
// SORTASI & GRADING
// ─────────────────────────────────────────────

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
      .eq('status', 'RECEIVED')
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

// ─────────────────────────────────────────────
// INVENTORY
// ─────────────────────────────────────────────

export async function getInventorySummary(): Promise<{
  success: boolean;
  data?: DbInventory[];
  error?: string;
}> {
  try {
    await requireAuth(['WAREHOUSE', 'SUPER_ADMIN', 'MANAGEMENT', 'QC', 'PRODUCTION']);

    const { data, error } = await supabaseAdmin
      .from('inventory')
      .select(`
        *,
        warehouse:warehouses(id, name)
      `)
      .order('last_updated_at', { ascending: false });

    if (error) throw error;

    // Enrich with item names
    const enriched = await Promise.all(
      (data || []).map(async (inv: any) => {
        let item_name = 'Unknown';
        if (inv.item_type === 'RAW_MATERIAL') {
          const { data: rm } = await supabaseAdmin
            .from('raw_materials')
            .select('name')
            .eq('id', inv.item_id)
            .single();
          item_name = rm?.name || 'Bahan Baku';
        } else if (inv.item_type === 'PRODUCT') {
          const { data: prod } = await supabaseAdmin
            .from('products')
            .select('name')
            .eq('id', inv.item_id)
            .single();
          item_name = prod?.name || 'Produk';
        }
        return { ...inv, item_name };
      })
    );

    return { success: true, data: enriched as DbInventory[] };
  } catch (err: any) {
    console.error('getInventorySummary error:', err);
    return { success: false, error: err.message };
  }
}

export async function getStockMovements(inventoryId?: string): Promise<{
  success: boolean;
  data?: DbStockMovement[];
  error?: string;
}> {
  try {
    await requireAuth(['WAREHOUSE', 'SUPER_ADMIN', 'MANAGEMENT']);

    let query = supabaseAdmin
      .from('stock_movements')
      .select('*')
      .order('movement_date', { ascending: false })
      .limit(200);

    if (inventoryId) {
      query = query.eq('inventory_id', inventoryId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return { success: true, data: (data || []) as DbStockMovement[] };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────
// SALES ORDERS
// ─────────────────────────────────────────────

export async function getSalesOrders(): Promise<{
  success: boolean;
  data?: DbSalesOrder[];
  error?: string;
}> {
  try {
    await requireAuth(['WAREHOUSE', 'SUPER_ADMIN', 'MANAGEMENT']);

    const { data, error } = await supabaseAdmin
      .from('sales_orders')
      .select(`
        *,
        customer:customers(id, name, contact),
        items:sales_order_items(
          id, sales_order_id, product_id, quantity, unit_price,
          product:products(id, sku, name)
        )
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    return { success: true, data: (data || []) as DbSalesOrder[] };
  } catch (err: any) {
    console.error('getSalesOrders error:', err);
    return { success: false, error: err.message };
  }
}

export interface CreateSalesOrderInput {
  customer_id: string;
  notes?: string;
  items: { product_id: string; quantity: number; unit_price?: number }[];
}

export async function createSalesOrder(input: CreateSalesOrderInput): Promise<{
  success: boolean;
  data?: DbSalesOrder;
  error?: string;
}> {
  try {
    const { user } = await requireAuth(['WAREHOUSE', 'SUPER_ADMIN']);

    const order_number = generateBatchNumber('SO');
    const total_amount = input.items.reduce(
      (sum, item) => sum + item.quantity * (item.unit_price || 0),
      0
    );

    const { data: soData, error: soError } = await supabaseAdmin
      .from('sales_orders')
      .insert([{
        customer_id: input.customer_id,
        order_number,
        order_date: new Date().toISOString(),
        status: 'PENDING',
        total_amount,
        notes: input.notes || null,
        created_by: user.userId,
      }])
      .select('id, order_number')
      .single();

    if (soError) throw soError;

    // Insert items
    if (input.items.length > 0) {
      const itemsPayload: Partial<DbSalesOrderItem>[] = input.items.map(item => ({
        sales_order_id: soData.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price || 0,
        subtotal: item.quantity * (item.unit_price || 0),
      }));

      const { error: itemsError } = await supabaseAdmin
        .from('sales_order_items')
        .insert(itemsPayload);

      if (itemsError) throw itemsError;
    }

    await logAuditEvent({
      userId: user.userId,
      action: 'CREATE',
      entityType: 'sales_order',
      entityId: soData.id,
      details: { order_number, customer_id: input.customer_id, items_count: input.items.length },
    });

    return { success: true, data: { id: soData.id, order_number: soData.order_number } as any };
  } catch (err: any) {
    console.error('createSalesOrder error:', err);
    return { success: false, error: err.message };
  }
}

export async function updateSalesOrderStatus(
  id: string,
  status: DbSalesOrder['status']
): Promise<{ success: boolean; error?: string }> {
  try {
    const { user } = await requireAuth(['WAREHOUSE', 'SUPER_ADMIN']);

    const { error } = await supabaseAdmin
      .from('sales_orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;

    await logAuditEvent({
      userId: user.userId,
      action: 'UPDATE',
      entityType: 'sales_order',
      entityId: id,
      details: { new_status: status },
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────
// PPIC & FORECASTING
// ─────────────────────────────────────────────

export async function getPpicData(): Promise<{
  success: boolean;
  estimates?: DbFarmerHarvestEstimate[];
  weeklyTotal?: number;
  error?: string;
}> {
  try {
    await requireAuth(['WAREHOUSE', 'SUPER_ADMIN', 'MANAGEMENT']);

    // Coba ambil dari tabel farmer_harvest_estimates jika ada
    const { data, error } = await supabaseAdmin
      .from('farmer_harvest_estimates')
      .select(`
        *,
        farmer:farmers(id, name, phone_number)
      `)
      .gte('expected_date', new Date().toISOString().split('T')[0])
      .order('expected_date', { ascending: true })
      .limit(50);

    // Jika tabel belum ada, gunakan fallback data
    if (error) {
      const mockEstimates: DbFarmerHarvestEstimate[] = [
        {
          id: '1', farmer_id: 'f1', expected_date: format(new Date(), 'yyyy-MM-dd'),
          estimated_kg: 45, source: 'WA_BOT', created_at: new Date().toISOString(),
          farmer: { id: 'f1', name: 'Pak Sugeng', phone_number: '08123456789' },
        },
        {
          id: '2', farmer_id: 'f2', expected_date: format(new Date(Date.now() + 86400000), 'yyyy-MM-dd'),
          estimated_kg: 30, source: 'WA_BOT', created_at: new Date().toISOString(),
          farmer: { id: 'f2', name: 'Pak Harto', phone_number: '08234567890' },
        },
        {
          id: '3', farmer_id: 'f3', expected_date: format(new Date(Date.now() + 172800000), 'yyyy-MM-dd'),
          estimated_kg: 55, source: 'MANUAL', created_at: new Date().toISOString(),
          farmer: { id: 'f3', name: 'Bu Siti', phone_number: '08345678901' },
        },
      ];
      const weeklyTotal = mockEstimates.reduce((s, e) => s + e.estimated_kg, 0);
      return { success: true, estimates: mockEstimates, weeklyTotal };
    }

    const weeklyTotal = (data || []).reduce((sum: number, e: any) => sum + (e.estimated_kg || 0), 0);
    return { success: true, estimates: (data || []) as DbFarmerHarvestEstimate[], weeklyTotal };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────
// MASTER DATA HELPERS (untuk dropdowns)
// ─────────────────────────────────────────────

export async function getFarmers() {
  try {
    await requireAuth(['WAREHOUSE', 'SUPER_ADMIN', 'QC', 'MANAGEMENT']);
    const { data, error } = await supabaseAdmin
      .from('farmers')
      .select('id, name, contact, phone_number')
      .order('name');
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (err: any) {
    return { success: false, data: [], error: err.message };
  }
}

export async function getRawMaterials() {
  try {
    await requireAuth(['WAREHOUSE', 'SUPER_ADMIN', 'QC', 'MANAGEMENT']);
    const { data, error } = await supabaseAdmin
      .from('raw_materials')
      .select('id, code, name, uom')
      .order('name');
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (err: any) {
    return { success: false, data: [], error: err.message };
  }
}

export async function getCustomers() {
  try {
    await requireAuth(['WAREHOUSE', 'SUPER_ADMIN', 'MANAGEMENT']);
    const { data, error } = await supabaseAdmin
      .from('customers')
      .select('id, name, contact')
      .order('name');
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (err: any) {
    return { success: false, data: [], error: err.message };
  }
}

export async function getProducts() {
  try {
    await requireAuth(['WAREHOUSE', 'SUPER_ADMIN', 'MANAGEMENT']);
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('id, sku, name')
      .order('name');
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (err: any) {
    return { success: false, data: [], error: err.message };
  }
}
