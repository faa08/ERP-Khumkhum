'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-guard';
import { logAuditEvent } from '@/actions/audit';
import { getProductionStandards } from '@/actions/standards';
import { format } from 'date-fns';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';
import type {
  DbProductionOrder,
  DbProductionMaterial,
  DbProductionResult,
  DbRawMaterial,
  DbProduct,
  DbFryingBatch,
  DbPackingEntry,
  DbLongsongContainer,
  DbTimeStudySample,
  ProductionStandardConfig,
  isFryingSpk,
} from '@/types/database';

// ─────────────────────────────────────────────
// HELPERS & MEMORY STORES
// ─────────────────────────────────────────────

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUuid(id?: string | null): boolean {
  return typeof id === 'string' && UUID_REGEX.test(id.trim());
}

let memoryProductionOrders: DbProductionOrder[] = [];

function generateProductionBatchNumber(customDate?: string): string {
  const d = customDate ? new Date(customDate) : new Date();
  const date = format(d, 'yyyyMMdd');
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `PRD-${date}-${rand}`;
}

// ─────────────────────────────────────────────
// GET PRODUCTION ORDERS
// ─────────────────────────────────────────────

export async function getProductionOrders(): Promise<{
  success: boolean;
  data?: DbProductionOrder[];
  error?: string;
}> {
  try {
    await requireAuth(['PRODUCTION', 'QC', 'WAREHOUSE', 'SUPER_ADMIN', 'MANAGEMENT', 'PREMIX', 'SALES']);

    const { data: orders, error } = await supabaseAdmin
      .from('production_orders')
      .select(`
        *,
        creator:users!production_orders_created_by_fkey(id, name)
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.warn('Fallback to memory for getProductionOrders:', error.message);
      return { success: true, data: memoryProductionOrders };
    }

    // Fetch related materials and results for all orders
    const orderIds = (orders || []).map((o: any) => o.id);

    let materialsByOrder: Record<string, DbProductionMaterial[]> = {};
    let resultsByOrder: Record<string, DbProductionResult[]> = {};

    if (orderIds.length > 0) {
      const [{ data: matData }, { data: resData }] = await Promise.all([
        supabaseAdmin
          .from('production_materials')
          .select(`*, raw_material:raw_materials(id, code, name, uom)`)
          .in('production_order_id', orderIds),
        supabaseAdmin
          .from('production_results')
          .select(`*, product:products(id, sku, name)`)
          .in('production_order_id', orderIds),
      ]);

      (matData || []).forEach((m: any) => {
        if (!materialsByOrder[m.production_order_id]) materialsByOrder[m.production_order_id] = [];
        materialsByOrder[m.production_order_id].push(m);
      });

      (resData || []).forEach((r: any) => {
        if (!resultsByOrder[r.production_order_id]) resultsByOrder[r.production_order_id] = [];
        resultsByOrder[r.production_order_id].push(r);
      });
    }

    const enrichedOrders: DbProductionOrder[] = (orders || []).map((order: any) => {
      const res = (resultsByOrder[order.id] || [])[0];
      const mats = materialsByOrder[order.id] || [];

      // Hitung total input weight dari raw materials
      const totalInput = mats.reduce((acc, m) => acc + Number(m.consumption_quantity || 0), 0);
      const yieldPct = res?.yield_percentage != null ? Number(res.yield_percentage) : (order.yield_percentage != null ? Number(order.yield_percentage) : null);

      return {
        ...order,
        product: res?.product || null,
        product_id: res?.product_id || order.product_id || null,
        product_variant: res?.product?.name || order.product_variant || 'Jamur Crispy',
        target_quantity: res?.finished_goods_quantity || order.target_quantity || 500,
        input_weight: totalInput > 0 ? totalInput : (order.input_weight || null),
        output_weight: res?.finished_goods_quantity ? (res.finished_goods_quantity * 0.1) : (order.output_weight || null),
        yield_percentage: yieldPct,
        is_yield_compliant: yieldPct != null ? yieldPct >= 80.0 : null,
        materials: mats,
        results: resultsByOrder[order.id] || [],
      };
    });

    return { success: true, data: enrichedOrders };
  } catch (err: any) {
    console.error('getProductionOrders error:', err);
    return { success: false, error: err.message || 'Gagal memuat data perintah produksi' };
  }
}

export async function getProductionOrderById(id: string): Promise<{
  success: boolean;
  data?: DbProductionOrder;
  error?: string;
}> {
  try {
    await requireAuth(['PRODUCTION', 'QC', 'WAREHOUSE', 'SUPER_ADMIN', 'MANAGEMENT', 'PREMIX', 'SALES']);

    let order: any = null;
    if (isValidUuid(id)) {
      const { data: dbOrder, error } = await supabaseAdmin
        .from('production_orders')
        .select(`
          *,
          creator:users!production_orders_created_by_fkey(id, name)
        `)
        .eq('id', id)
        .maybeSingle();
      if (!error && dbOrder) {
        order = dbOrder;
      }
    }

    if (!order) {
      order = memoryProductionOrders.find(o => o.id === id);
    }

    if (!order) {
      return { success: false, error: 'Batch produksi tidak ditemukan' };
    }

    let materials: any[] = [];
    let results: any[] = [];
    if (isValidUuid(id)) {
      const [{ data: matData }, { data: resData }] = await Promise.all([
        supabaseAdmin
          .from('production_materials')
          .select(`*, raw_material:raw_materials(id, code, name, uom)`)
          .eq('production_order_id', id),
        supabaseAdmin
          .from('production_results')
          .select(`*, product:products(id, sku, name)`)
          .eq('production_order_id', id),
      ]);
      materials = matData || [];
      results = resData || [];
    }

    const res = results[0];
    const mats = materials || [];
    const totalInput = mats.reduce((acc, m) => acc + Number(m.consumption_quantity || 0), 0);
    const yieldPct = res?.yield_percentage != null ? Number(res.yield_percentage) : (order.yield_percentage != null ? Number(order.yield_percentage) : null);

    const enriched: DbProductionOrder = {
      ...order,
      product: res?.product || order.product || null,
      product_id: res?.product_id || order.product_id || null,
      product_variant: res?.product?.name || order.product_variant || 'Jamur Crispy',
      target_quantity: res?.finished_goods_quantity || order.target_quantity || 500,
      input_weight: totalInput > 0 ? totalInput : (order.input_weight || null),
      output_weight: res?.finished_goods_quantity ? (res.finished_goods_quantity * 0.1) : (order.output_weight || null),
      yield_percentage: yieldPct,
      is_yield_compliant: yieldPct != null ? yieldPct >= 80.0 : null,
      materials: mats,
      results: results || [],
    };

    return { success: true, data: enriched };
  } catch (err: any) {
    console.error('getProductionOrderById error:', err);
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────
// CREATE PRODUCTION ORDER (SPK)
// ─────────────────────────────────────────────

export interface CreateProductionOrderInput {
  product_id?: string;
  product_variant: string;
  target_quantity: number;
  notes?: string;
  start_date?: string;
  spk_type?: 'FRYING' | 'PACKING';
}

export async function createProductionOrder(input: CreateProductionOrderInput): Promise<{
  success: boolean;
  data?: DbProductionOrder;
  error?: string;
}> {
  try {
    const { user } = await requireAuth(['PRODUCTION', 'SUPER_ADMIN', 'WAREHOUSE', 'PREMIX', 'MANAGEMENT']);

    if (!input.product_variant || input.target_quantity <= 0) {
      return { success: false, error: 'Varian produk dan target kuantitas (> 0) wajib diisi' };
    }

    const issueDate = input.start_date ? new Date(input.start_date).toISOString() : new Date().toISOString();
    const batch_number = generateProductionBatchNumber(input.start_date);
    const now = new Date().toISOString();

    let productObj = null;
    let variantName = input.product_variant;

    if (input.product_id) {
      const { data: p } = await supabaseAdmin
        .from('products')
        .select('id, sku, name')
        .eq('id', input.product_id)
        .maybeSingle();
      if (p) {
        productObj = p;
        variantName = p.name;
      }
    }

    const spkType = input.spk_type || (input.product_id ? 'PACKING' : 'FRYING');
    const spkTag = spkType === 'FRYING' ? '[Tipe: GORENG_CURAH]' : '[Tipe: PACKING_RASA]';
    const notesWithTag = input.notes ? `${input.notes} ${spkTag}` : spkTag;

    const payload = {
      batch_number,
      status: 'DRAFT',
      start_date: issueDate,
      product_id: input.product_id || null,
      product_variant: variantName,
      target_quantity: input.target_quantity,
      notes: notesWithTag,
      created_by: user.userId,
      created_at: issueDate,
      updated_at: now,
    };

    let createdOrder: any = null;

    const { data, error } = await supabaseAdmin
      .from('production_orders')
      .insert([payload])
      .select('*')
      .single();

    if (error) {
      console.warn('Fallback memory for createProductionOrder:', error.message);
      const fallbackId = 'po-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
      const fallbackOrder: DbProductionOrder = {
        id: fallbackId,
        batch_number,
        status: 'DRAFT',
        start_date: issueDate,
        product_id: input.product_id || null,
        product_variant: variantName,
        target_quantity: input.target_quantity,
        notes: input.notes || null,
        created_by: user.userId,
        created_at: issueDate,
        updated_at: now,
        product: productObj,
        materials: [],
        results: [],
      };
      memoryProductionOrders.unshift(fallbackOrder);
      createdOrder = fallbackOrder;
    } else {
      createdOrder = data;
      if (input.product_id) {
        await supabaseAdmin.from('production_results').insert([
          {
            production_order_id: data.id,
            product_id: input.product_id,
            finished_goods_quantity: input.target_quantity,
            wip_quantity: 0,
            yield_percentage: 0,
            created_at: now,
          },
        ]);
      }
    }

    await logAuditEvent({
      userId: user.userId,
      action: 'CREATE',
      entityType: 'production_order',
      entityId: createdOrder.id,
      details: { batch_number, target_quantity: input.target_quantity, product_variant: variantName },
    });

    const fullData: DbProductionOrder = {
      ...createdOrder,
      product: productObj,
      product_id: input.product_id || null,
      product_variant: variantName,
      target_quantity: input.target_quantity,
      input_weight: null,
      output_weight: null,
      yield_percentage: null,
      is_yield_compliant: null,
      materials: [],
      results: [],
    };

    revalidatePath('/production');
    return { success: true, data: fullData };
  } catch (err: any) {
    console.error('createProductionOrder error:', err);
    return { success: false, error: err.message || 'Gagal membuat perintah produksi (SPK)' };
  }
}

export async function completeProductionOrder(orderId: string, notes?: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { user } = await requireAuth(['PRODUCTION', 'SUPER_ADMIN', 'MANAGEMENT']);

    const now = new Date().toISOString();
    let updated = false;

    if (isValidUuid(orderId)) {
      const { data: curr } = await supabaseAdmin
        .from('production_orders')
        .select('id, notes, status')
        .eq('id', orderId)
        .maybeSingle();

      if (curr) {
        const appendedNotes = notes ? (curr.notes ? `${curr.notes} | ${notes}` : notes) : curr.notes;
        const { error } = await supabaseAdmin
          .from('production_orders')
          .update({
            status: 'COMPLETED',
            end_date: now,
            notes: appendedNotes,
            updated_at: now,
          })
          .eq('id', orderId);

        if (!error) updated = true;
      }
    }

    const memIdx = memoryProductionOrders.findIndex(o => o.id === orderId);
    if (memIdx !== -1) {
      memoryProductionOrders[memIdx] = {
        ...memoryProductionOrders[memIdx],
        status: 'COMPLETED',
        end_date: now,
        notes: notes ? (memoryProductionOrders[memIdx].notes ? `${memoryProductionOrders[memIdx].notes} | ${notes}` : notes) : memoryProductionOrders[memIdx].notes,
        updated_at: now,
      };
      updated = true;
    }

    if (!updated) {
      return { success: false, error: 'Perintah produksi tidak ditemukan' };
    }

    await logAuditEvent({
      userId: user.userId,
      action: 'UPDATE',
      entityType: 'production_order',
      entityId: orderId,
      details: { status: 'COMPLETED', action: 'manual_or_auto_completion', notes },
    });

    revalidatePath('/production');
    return { success: true };
  } catch (err: any) {
    console.error('completeProductionOrder error:', err);
    return { success: false, error: err.message || 'Gagal menyelesaikan SPK' };
  }
}

// ─────────────────────────────────────────────
// UPDATE PRODUCTION ORDER (EDIT SPK)
// ─────────────────────────────────────────────

export interface UpdateProductionOrderInput {
  target_quantity?: number;
  start_date?: string;
  notes?: string;
  product_variant?: string;
}

export async function updateProductionOrder(
  orderId: string,
  input: UpdateProductionOrderInput
): Promise<{ success: boolean; data?: DbProductionOrder; error?: string }> {
  try {
    const { user } = await requireAuth(['PRODUCTION', 'SUPER_ADMIN', 'MANAGEMENT']);

    const now = new Date().toISOString();
    const updatePayload: any = { updated_at: now };
    if (input.target_quantity !== undefined) updatePayload.target_quantity = input.target_quantity;
    if (input.start_date !== undefined) updatePayload.start_date = new Date(input.start_date).toISOString();
    if (input.notes !== undefined) updatePayload.notes = input.notes;
    if (input.product_variant !== undefined) updatePayload.product_variant = input.product_variant;

    if (isValidUuid(orderId)) {
      const { data, error } = await supabaseAdmin
        .from('production_orders')
        .update(updatePayload)
        .eq('id', orderId)
        .select('*')
        .maybeSingle();

      if (error) {
        console.warn('Update SPK in DB warning:', error.message);
      }
    }

    const memIdx = memoryProductionOrders.findIndex(o => o.id === orderId);
    if (memIdx !== -1) {
      memoryProductionOrders[memIdx] = {
        ...memoryProductionOrders[memIdx],
        ...updatePayload,
      };
    }

    await logAuditEvent({
      userId: user.userId,
      action: 'UPDATE',
      entityType: 'production_order',
      entityId: orderId,
      details: input,
    });

    revalidatePath('/production');
    return { success: true };
  } catch (err: any) {
    console.error('updateProductionOrder error:', err);
    return { success: false, error: err.message || 'Gagal memperbarui SPK' };
  }
}

// ─────────────────────────────────────────────
// DELETE PRODUCTION ORDER (HAPUS / BATALKAN SPK)
// ─────────────────────────────────────────────

export async function deleteProductionOrder(orderId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { user } = await requireAuth(['PRODUCTION', 'SUPER_ADMIN', 'MANAGEMENT']);

    if (isValidUuid(orderId)) {
      // 1. Kembalikan (Revert) stok bahan baku yang terlanjur dipotong dari gudang untuk SPK ini
      try {
        // Ambil ID batch wajan terkait SPK ini jika ada
        const { data: batches } = await supabaseAdmin
          .from('production_frying_batches')
          .select('id')
          .eq('production_order_id', orderId);
        const batchIds = (batches || []).map(b => b.id);

        let query = supabaseAdmin
          .from('stock_movements')
          .select('*')
          .eq('movement_type', 'OUT');

        if (batchIds.length > 0) {
          query = query.or(`reference_id.eq.${orderId},reference_id.in.(${batchIds.join(',')})`);
        } else {
          query = query.eq('reference_id', orderId);
        }

        const { data: movements } = await query;

        if (movements && movements.length > 0) {
          for (const mov of movements) {
            if (mov.inventory_id && mov.quantity > 0) {
              const { data: inv } = await supabaseAdmin
                .from('inventory')
                .select('id, quantity')
                .eq('id', mov.inventory_id)
                .maybeSingle();

              if (inv) {
                const restoredQty = Number(inv.quantity) + Number(mov.quantity);
                await supabaseAdmin
                  .from('inventory')
                  .update({
                    quantity: restoredQty,
                    last_updated_at: new Date().toISOString(),
                  })
                  .eq('id', inv.id);
              }
            }
          }

          // Hapus mutasi stok OUT yang dibatalkan
          if (batchIds.length > 0) {
            await supabaseAdmin
              .from('stock_movements')
              .delete()
              .or(`reference_id.eq.${orderId},reference_id.in.(${batchIds.join(',')})`);
          } else {
            await supabaseAdmin
              .from('stock_movements')
              .delete()
              .eq('reference_id', orderId);
          }
        }
      } catch (stockErr) {
        console.warn('Revert stock error on deleteProductionOrder:', stockErr);
      }

      // 2. Hapus data turunan jika ada (wadah longsong, batch wajan, packing, qc, materials, results)
      try {
        await supabaseAdmin.from('production_materials').delete().eq('production_order_id', orderId);
        await supabaseAdmin.from('production_results').delete().eq('production_order_id', orderId);
        await supabaseAdmin.from('qc_records').delete().eq('production_order_id', orderId);
        await supabaseAdmin.from('packing_entries').delete().eq('production_order_id', orderId);
        await supabaseAdmin.from('frying_batches').delete().eq('production_order_id', orderId);
        await supabaseAdmin.from('production_longsong_containers').delete().eq('production_order_id', orderId);
        await supabaseAdmin.from('production_frying_batches').delete().eq('production_order_id', orderId);
        await supabaseAdmin.from('production_packing_entries').delete().eq('production_order_id', orderId);
      } catch (_) {}

      const { error } = await supabaseAdmin
        .from('production_orders')
        .delete()
        .eq('id', orderId);

      if (error) {
        console.warn('Delete SPK in DB warning:', error.message);
      }
    }

    memoryProductionOrders = memoryProductionOrders.filter(o => o.id !== orderId);
    memoryFryingBatches = memoryFryingBatches.filter(b => b.production_order_id !== orderId);
    memoryLongsongContainers = memoryLongsongContainers.filter(c => c.production_order_id !== orderId);
    memoryPackingEntries = memoryPackingEntries.filter(p => p.production_order_id !== orderId);

    await logAuditEvent({
      userId: user.userId,
      action: 'DELETE',
      entityType: 'production_order',
      entityId: orderId,
      details: { note: 'SPK dibatalkan / dihapus oleh operator' },
    });

    revalidatePath('/production');
    revalidatePath('/inventory');
    revalidatePath('/warehouse');
    return { success: true };
  } catch (err: any) {
    console.error('deleteProductionOrder error:', err);
    return { success: false, error: err.message || 'Gagal menghapus SPK' };
  }
}

// ─────────────────────────────────────────────
// RECORD FRYING RUN COMPLETION (REKAP SELESAI MASAK SPK)
// ─────────────────────────────────────────────

export interface RecordFryingRunCompletionInput {
  production_order_id: string;
  actual_mushroom_kg: number;
  actual_premix_kg: number;
  actual_cooking_oil_liter: number;
  output_finished_kg: number;
  output_longsong_count: number;
  is_partial?: boolean;
  containers?: { container_number: number; weight_kg: number }[];
  batches?: {
    wajan_number: number;
    duration_minutes: number;
    oil_temp_celsius?: number;
    batch_weight_gram?: number;
    output_weight_gram?: number;
    notes?: string;
  }[];
  notes?: string;
}

export async function recordFryingRunCompletion(input: RecordFryingRunCompletionInput): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    const session = await requireAuth(['PRODUCTION', 'SUPER_ADMIN', 'MANAGEMENT']);
    const nowIso = new Date().toISOString();

    const orderId = input.production_order_id;
    if (!orderId) {
      return { success: false, error: 'ID Perintah Produksi (SPK) wajib diisi' };
    }

    if (!input.is_partial) {
      if (input.actual_mushroom_kg <= 0 || input.output_finished_kg <= 0 || input.output_longsong_count <= 0) {
        return { success: false, error: 'Untuk menyelesaikan SPK, jamur aktual, output matang, dan jumlah longsong harus lebih dari 0' };
      }
    } else {
      if (input.actual_mushroom_kg <= 0 && input.output_finished_kg <= 0) {
        return { success: false, error: 'Mohon isi jamur yang dimasak atau output matang yang diperoleh' };
      }
    }

    // 0. Validasi Ketersediaan Stok Gudang untuk 3 Bahan Baku Penggorengan
    const materialsToCheck = [
      { name: 'Jamur Tiram Segar', qty: input.actual_mushroom_kg, uom: 'kg', code: 'JMR-TRM', keywords: ['jamur tiram segar', 'jamur tiram'], exclude: 'gagang' },
      { name: 'Tepung Premix KhumKhum', qty: input.actual_premix_kg, uom: 'kg', code: 'RM-PRX', keywords: ['tepung premix khumkhum', 'tepung premix', 'premix'], exclude: 'terigu' },
      { name: 'Minyak Goreng', qty: input.actual_cooking_oil_liter, uom: 'liter', code: 'RM-MINY', keywords: ['minyak goreng', 'minyak'], exclude: 'pelumas' },
    ];

    for (const mat of materialsToCheck) {
      if (mat.qty <= 0) continue;
      try {
        let found: { id: string; name: string; uom: string } | null = null;
        if (mat.code) {
          const { data: byCode } = await supabaseAdmin
            .from('raw_materials')
            .select('id, name, uom')
            .is('deleted_at', null)
            .ilike('code', mat.code)
            .limit(1)
            .maybeSingle();
          if (byCode) found = byCode;
        }

        if (!found) {
          let q = supabaseAdmin
            .from('raw_materials')
            .select('id, name, uom')
            .is('deleted_at', null)
            .or(mat.keywords.map(k => `name.ilike.%${k}%`).join(','));
          if (mat.exclude) {
            q = q.not('name', 'ilike', `%${mat.exclude}%`);
          }
          const { data: byName } = await q.limit(1).maybeSingle();
          found = byName;
        }

        if (found?.id) {
          const { data: invList } = await supabaseAdmin
            .from('inventory')
            .select('quantity')
            .eq('item_type', 'RAW_MATERIAL')
            .eq('item_id', found.id)
            .limit(1);

          const currentStock = invList && invList.length > 0 ? Number(invList[0].quantity) || 0 : 0;
          if (currentStock < mat.qty) {
            return {
              success: false,
              error: `Stok gudang untuk "${found.name || mat.name}" tidak mencukupi (Tersedia: ${currentStock.toFixed(1)} ${found.uom || mat.uom}, Dibutuhkan: ${mat.qty.toFixed(1)} ${mat.uom}). Harap lakukan Inbound / Restock terlebih dahulu.`,
            };
          }
        }
      } catch (err) {
        console.warn('Cek stok bahan penggorengan warning:', err);
      }
    }

    const yieldPct = Number(((input.output_finished_kg / input.actual_mushroom_kg) * 100).toFixed(1));
    const isCompliant = yieldPct >= 65;

    let orderBatchNumber = 'SPK';

    // 0. Hitung Cycle Time Avg & Kepatuhan HACCP dari batch wajan
    let cycleTimeAvgSec = 15 * 60;
    if (input.batches && input.batches.length > 0) {
      const validBatches = input.batches.filter(b => Number(b.duration_minutes) > 0);
      if (validBatches.length > 0) {
        const totalMin = validBatches.reduce((s, b) => s + Number(b.duration_minutes), 0);
        cycleTimeAvgSec = Math.round((totalMin / validBatches.length) * 60);
      }
    } else {
      try {
        let batchesList: any[] = [];
        if (isValidUuid(orderId)) {
          const { data: dbBatches } = await supabaseAdmin
            .from('production_frying_batches')
            .select('frying_duration_minutes, finished_at')
            .eq('production_order_id', orderId);
          if (dbBatches && dbBatches.length > 0) {
            batchesList = dbBatches;
          }
        }
        if (batchesList.length === 0) {
          batchesList = memoryFryingBatches.filter(b => b.production_order_id === orderId);
        }
        const finishedBatches = batchesList.filter(b => b.finished_at && Number(b.frying_duration_minutes) > 0);
        if (finishedBatches.length > 0) {
          const totalMin = finishedBatches.reduce((s, b) => s + (Number(b.frying_duration_minutes) || 15), 0);
          cycleTimeAvgSec = Math.round((totalMin / finishedBatches.length) * 60);
        }
      } catch (_) {}
    }

    // Catat sampel ke time_study_samples untuk analisis HACCP jika diinput saat rekap
    if (input.batches && input.batches.length > 0) {
      try {
        for (const b of input.batches) {
          const durMin = Number(b.duration_minutes) || 15;
          const oilTemp = Number(b.oil_temp_celsius) || 165;
          const durSec = durMin * 60;

          if (isValidUuid(orderId)) {
            await supabaseAdmin.from('time_study_samples').insert({
              production_order_id: orderId,
              stage: 'FRYING',
              sample_number: b.wajan_number,
              started_at: new Date(Date.now() - durSec * 1000).toISOString(),
              finished_at: nowIso,
              duration_seconds: durSec,
              operator_id: session.user.id,
              notes: `Wajan #${b.wajan_number} (${oilTemp}°C) - Rekap SPK`,
            });
          }
        }
      } catch (sampleErr) {
        console.warn('Sync time study samples warning:', sampleErr);
      }
    }

    // Rincian fisik wadah longsong
    const containerInputs = input.containers && input.containers.length > 0
      ? input.containers
      : Array.from({ length: input.output_longsong_count }, (_, idx) => ({
          container_number: idx + 1,
          weight_kg: Number((input.output_finished_kg / input.output_longsong_count).toFixed(2)),
        }));

    const containerJson = JSON.stringify(containerInputs.map(c => ({
      no: c.container_number,
      kg: c.weight_kg,
    })));

    const isPartial = Boolean(input.is_partial);
    let totalInputWeight = input.actual_mushroom_kg;
    let totalOutputWeight = input.output_finished_kg;
    let totalLongsongs = input.output_longsong_count;
    let totalUnpackedLongsongs = input.output_longsong_count;

    // 1. Update status SPK di Database / Memory
    if (isValidUuid(orderId)) {
      const { data: ord } = await supabaseAdmin
        .from('production_orders')
        .select('*')
        .eq('id', orderId)
        .maybeSingle();

      if (ord) {
        orderBatchNumber = ord.batch_number || orderBatchNumber;
        const prevInput = Number(ord.input_weight) || 0;
        const prevOutput = Number(ord.output_weight) || 0;
        const prevLongsongs = Number(ord.total_longsong_count) || 0;
        const prevUnpacked = Number(ord.unpacked_longsong_count) || 0;

        totalInputWeight = prevInput + input.actual_mushroom_kg;
        totalOutputWeight = prevOutput + input.output_finished_kg;
        totalLongsongs = prevLongsongs + input.output_longsong_count;
        totalUnpackedLongsongs = prevUnpacked + input.output_longsong_count;

        const accumulatedYieldPct = totalInputWeight > 0 ? parseFloat(((totalOutputWeight / totalInputWeight) * 100).toFixed(1)) : yieldPct;
        const accumulatedIsCompliant = accumulatedYieldPct >= 65;

        const cleanBaseNotes = (ord.notes || '').replace(/\s*\[Longsongs:.*?\]\s*/g, '').trim();
        const baseWithInput = input.notes ? (cleanBaseNotes ? `${cleanBaseNotes} | ${input.notes}` : input.notes) : cleanBaseNotes;
        const appendedNotes = `${baseWithInput} [Longsongs: ${containerJson}]`.trim();

        const updatePayload: Record<string, any> = {
          status: isPartial ? 'IN_PROGRESS' : 'COMPLETED',
          input_weight: totalInputWeight,
          output_weight: totalOutputWeight,
          yield_percentage: accumulatedYieldPct,
          is_yield_compliant: accumulatedIsCompliant,
          end_date: isPartial ? null : nowIso,
          notes: appendedNotes,
          updated_at: nowIso,
        };

        const { error: updateErr } = await supabaseAdmin
          .from('production_orders')
          .update(updatePayload)
          .eq('id', orderId);

        if (updateErr) {
          console.error('Update production_orders error:', updateErr);
        }
      }
    }

    const memIdx = memoryProductionOrders.findIndex(o => o.id === orderId);
    if (memIdx !== -1) {
      orderBatchNumber = memoryProductionOrders[memIdx].batch_number || orderBatchNumber;
      const memOrd = memoryProductionOrders[memIdx];
      const prevInput = Number(memOrd.input_weight) || 0;
      const prevOutput = Number(memOrd.output_weight) || 0;
      const prevLongsongs = Number(memOrd.total_longsong_count) || 0;
      const prevUnpacked = Number(memOrd.unpacked_longsong_count) || 0;

      totalInputWeight = prevInput + input.actual_mushroom_kg;
      totalOutputWeight = prevOutput + input.output_finished_kg;
      totalLongsongs = prevLongsongs + input.output_longsong_count;
      totalUnpackedLongsongs = prevUnpacked + input.output_longsong_count;

      const accumulatedYieldPct = totalInputWeight > 0 ? parseFloat(((totalOutputWeight / totalInputWeight) * 100).toFixed(1)) : yieldPct;
      const accumulatedIsCompliant = accumulatedYieldPct >= 65;

      const memBase = (memOrd.notes || '').replace(/\s*\[Longsongs:.*?\]\s*/g, '').trim();
      const memWithInput = input.notes ? (memBase ? `${memBase} | ${input.notes}` : input.notes) : memBase;
      const memAppendedNotes = `${memWithInput} [Longsongs: ${containerJson}]`.trim();

      memoryProductionOrders[memIdx] = {
        ...memoryProductionOrders[memIdx],
        status: isPartial ? 'IN_PROGRESS' : 'COMPLETED',
        input_weight: totalInputWeight,
        output_weight: totalOutputWeight,
        yield_percentage: accumulatedYieldPct,
        is_yield_compliant: accumulatedIsCompliant,
        total_longsong_count: totalLongsongs,
        unpacked_longsong_count: totalUnpackedLongsongs,
        cycle_time_avg_seconds: cycleTimeAvgSec,
        standard_time_seconds: 15 * 60,
        end_date: isPartial ? null : nowIso,
        notes: memAppendedNotes,
        updated_at: nowIso,
      };
    }

    // Buat objek kartu wadah Longsong
    const newContainers: DbLongsongContainer[] = containerInputs.map(c => ({
      id: randomUUID(),
      production_order_id: orderId,
      container_number: c.container_number,
      initial_weight_kg: c.weight_kg,
      current_weight_kg: c.weight_kg,
      status: 'AVAILABLE',
      notes: `SPK ${orderBatchNumber} - Wadah #${c.container_number}`,
      created_at: nowIso,
      updated_at: nowIso,
      production_order: { id: orderId, batch_number: orderBatchNumber, start_date: nowIso },
    }));

    // Simpan ke memory (tambahkan wadah baru tanpa menghapus wadah lama dari SPK yang sama)
    memoryLongsongContainers = [
      ...newContainers,
      ...memoryLongsongContainers.filter(mc => !newContainers.some(nc => nc.id === mc.id || (nc.production_order_id === mc.production_order_id && nc.container_number === mc.container_number)))
    ];
    await savePersistedContainers(memoryLongsongContainers);

    // Coba simpan ke Supabase jika tabel tersedia
    try {
      await supabaseAdmin.from('production_longsong_containers').insert(
        newContainers.map(c => ({
          id: c.id,
          production_order_id: isValidUuid(c.production_order_id) ? c.production_order_id : null,
          container_number: c.container_number,
          initial_weight_kg: c.initial_weight_kg,
          current_weight_kg: c.current_weight_kg,
          status: c.status,
          notes: c.notes,
          created_at: c.created_at,
          updated_at: c.updated_at,
        }))
      );
    } catch (_) {}

    // 2. Potong Stok Gudang untuk 3 Bahan Baku Penggorengan (Jamur Tiram, Premix, Minyak)
    const materialsToDeduct = [
      { name: 'Jamur Tiram Segar', qty: input.actual_mushroom_kg, uom: 'kg', code: 'JMR-TRM', keywords: ['jamur tiram segar', 'jamur tiram'], exclude: 'gagang' },
      { name: 'Tepung Premix KhumKhum', qty: input.actual_premix_kg, uom: 'kg', code: 'RM-PRX', keywords: ['tepung premix khumkhum', 'tepung premix', 'premix'], exclude: 'terigu' },
      { name: 'Minyak Goreng', qty: input.actual_cooking_oil_liter, uom: 'liter', code: 'RM-MINY', keywords: ['minyak goreng', 'minyak'], exclude: 'pelumas' },
    ];

    for (const mat of materialsToDeduct) {
      if (mat.qty <= 0) continue;

      let found: { id: string } | null = null;
      if (mat.code) {
        const { data: byCode } = await supabaseAdmin
          .from('raw_materials')
          .select('id')
          .is('deleted_at', null)
          .ilike('code', mat.code)
          .limit(1)
          .maybeSingle();
        if (byCode) found = byCode;
      }

      if (!found) {
        let q = supabaseAdmin
          .from('raw_materials')
          .select('id')
          .is('deleted_at', null)
          .or(mat.keywords.map(k => `name.ilike.%${k}%`).join(','));
        if (mat.exclude) {
          q = q.not('name', 'ilike', `%${mat.exclude}%`);
        }
        const { data: byName } = await q.limit(1).maybeSingle();
        found = byName;
      }

      const matId = found?.id;
      if (!matId) continue;

      const { data: invList } = await supabaseAdmin
        .from('inventory')
        .select('id, quantity')
        .eq('item_type', 'RAW_MATERIAL')
        .eq('item_id', matId)
        .limit(1);

      let invId = '';
      if (invList && invList.length > 0) {
        invId = invList[0].id;
        const currentQty = Number(invList[0].quantity) || 0;
        const newQty = Math.max(0, currentQty - mat.qty);
        await supabaseAdmin
          .from('inventory')
          .update({ quantity: newQty, last_updated_at: nowIso })
          .eq('id', invId);
      } else {
        const { data: wh } = await supabaseAdmin.from('warehouses').select('id').limit(1).maybeSingle();
        if (wh?.id) {
          const { data: newInv } = await supabaseAdmin
            .from('inventory')
            .insert({
              warehouse_id: wh.id,
              item_type: 'RAW_MATERIAL',
              item_id: matId,
              quantity: 0,
              last_updated_at: nowIso,
            })
            .select('id')
            .single();
          invId = newInv?.id || '';
        }
      }

      if (invId) {
        await supabaseAdmin.from('stock_movements').insert({
          inventory_id: invId,
          movement_type: 'OUT',
          quantity: mat.qty,
          movement_date: nowIso,
          reference_id: isValidUuid(orderId) ? orderId : null,
          reference_type: 'PRODUCTION_FRYING',
          notes: `Konsumsi masak SPK ${orderBatchNumber}: ${mat.qty} ${mat.uom} ${mat.name} (Aktual)`,
          created_by: session.user.id,
        });

        if (isValidUuid(orderId)) {
          await supabaseAdmin.from('production_materials').insert({
            production_order_id: orderId,
            raw_material_id: matId,
            consumption_quantity: mat.qty,
            created_at: nowIso,
          });
        }
      }
    }

    // 3. Catat Batch ke DB / Memory
    if (input.batches && input.batches.length > 0) {
      const perBatchOutputGram = Math.round((input.output_finished_kg * 1000) / input.batches.length);
      const totalLongsong = Math.max(0, input.output_longsong_count || 0);
      const baseLongsong = Math.floor(totalLongsong / input.batches.length);
      const remLongsong = totalLongsong % input.batches.length;

      const incomingWajanNumbers = new Set(input.batches.map(b => b.wajan_number));
      memoryFryingBatches = memoryFryingBatches.filter(
        mb => !(mb.production_order_id === orderId && incomingWajanNumbers.has(mb.wajan_number))
      );

      for (let idx = 0; idx < input.batches.length; idx++) {
        const b = input.batches[idx];
        const perBatchLongsong = idx < remLongsong ? baseLongsong + 1 : baseLongsong;
        const batchWeight = b.batch_weight_gram || Math.round((input.actual_mushroom_kg * 1000) / input.batches.length);
        const outputWeight = b.output_weight_gram || perBatchOutputGram;
        const batchItem: DbFryingBatch = {
          id: randomUUID(),
          production_order_id: orderId,
          wajan_number: b.wajan_number,
          batch_weight_gram: batchWeight,
          output_weight_gram: outputWeight,
          longsong_count: perBatchLongsong,
          kremesan_weight_gram: 0,
          frying_duration_minutes: b.duration_minutes,
          oil_temp_celsius: b.oil_temp_celsius || 165,
          notes: b.notes || input.notes || `SPK ${orderBatchNumber} - Wajan #${b.wajan_number}`,
          operator_id: session.user.id,
          started_at: nowIso,
          finished_at: nowIso,
          timer_started_at: null,
          created_at: nowIso,
          operator: { id: session.user.id, name: session.user.name || 'Operator Produksi' },
        };

        try {
          await supabaseAdmin.from('production_frying_batches').insert({
            id: batchItem.id,
            production_order_id: isValidUuid(orderId) ? orderId : null,
            wajan_number: batchItem.wajan_number,
            batch_weight_gram: batchItem.batch_weight_gram,
            output_weight_gram: batchItem.output_weight_gram,
            longsong_count: batchItem.longsong_count,
            kremesan_weight_gram: 0,
            frying_duration_minutes: batchItem.frying_duration_minutes,
            oil_temp_celsius: batchItem.oil_temp_celsius,
            notes: batchItem.notes,
            operator_id: session.user.id,
            started_at: nowIso,
            finished_at: nowIso,
            created_at: nowIso,
          });
        } catch (_) {}

        memoryFryingBatches.unshift(batchItem);
      }
    } else {
      const runBatchItem: DbFryingBatch = {
        id: randomUUID(),
        production_order_id: orderId,
        wajan_number: Math.round(input.actual_mushroom_kg / 0.8),
        batch_weight_gram: Math.round(input.actual_mushroom_kg * 1000),
        output_weight_gram: Math.round(input.output_finished_kg * 1000),
        longsong_count: input.output_longsong_count,
        kremesan_weight_gram: 0,
        notes: input.notes || `Rekap Selesai Masak SPK ${orderBatchNumber}`,
        operator_id: session.user.id,
        started_at: nowIso,
        finished_at: nowIso,
        timer_started_at: null,
        created_at: nowIso,
        operator: { id: session.user.id, name: session.user.name || 'Operator Produksi' },
      };

      try {
        await supabaseAdmin.from('production_frying_batches').insert({
          id: runBatchItem.id,
          production_order_id: isValidUuid(orderId) ? orderId : null,
          wajan_number: runBatchItem.wajan_number,
          batch_weight_gram: runBatchItem.batch_weight_gram,
          output_weight_gram: runBatchItem.output_weight_gram,
          longsong_count: runBatchItem.longsong_count,
          kremesan_weight_gram: 0,
          notes: runBatchItem.notes,
          operator_id: session.user.id,
          started_at: nowIso,
          finished_at: nowIso,
          created_at: nowIso,
        });
      } catch (_) {}

      memoryFryingBatches.unshift(runBatchItem);
    }

    // 4. Log Audit Event
    await logAuditEvent({
      userId: session.user.id,
      action: 'UPDATE',
      entityType: 'production_order',
      entityId: orderId,
      details: {
        action: 'RECORD_FRYING_RUN_COMPLETION',
        batch_number: orderBatchNumber,
        actual_mushroom_kg: input.actual_mushroom_kg,
        actual_premix_kg: input.actual_premix_kg,
        actual_cooking_oil_liter: input.actual_cooking_oil_liter,
        output_finished_kg: input.output_finished_kg,
        output_longsong_count: input.output_longsong_count,
        yield_percentage: yieldPct,
      },
    });

    revalidatePath('/production');
    revalidatePath('/inventory');
    revalidatePath('/warehouse');

    return {
      success: true,
      data: {
        orderId,
        batchNumber: orderBatchNumber,
        status: isPartial ? 'IN_PROGRESS' : 'COMPLETED',
        yieldPercentage: totalInputWeight > 0 ? parseFloat(((totalOutputWeight / totalInputWeight) * 100).toFixed(1)) : yieldPct,
        isCompliant: (totalInputWeight > 0 ? (totalOutputWeight / totalInputWeight) * 100 : yieldPct) >= 65,
        accumulatedInput: totalInputWeight,
        accumulatedOutput: totalOutputWeight,
        accumulatedLongsongs: totalLongsongs,
      },
    };
  } catch (err: any) {
    console.error('recordFryingRunCompletion error:', err);
    return { success: false, error: err.message || 'Gagal mencatat penyelesaian masak SPK' };
  }
}

// ─────────────────────────────────────────────
// RECORD MATERIAL CONSUMPTION (BOM) & DEDUCT INVENTORY
// ─────────────────────────────────────────────

export interface MaterialConsumptionItem {
  raw_material_id: string;
  consumption_quantity: number;
}

export interface RecordMaterialConsumptionInput {
  production_order_id: string;
  materials: MaterialConsumptionItem[];
  notes?: string;
}

export async function recordMaterialConsumption(input: RecordMaterialConsumptionInput): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { user } = await requireAuth(['PRODUCTION', 'SUPER_ADMIN']);

    if (!input.materials || input.materials.length === 0) {
      return { success: false, error: 'Daftar bahan baku konsumsi tidak boleh kosong' };
    }

    // 1. Verifikasi order
    const { data: order, error: orderErr } = await supabaseAdmin
      .from('production_orders')
      .select('*')
      .eq('id', input.production_order_id)
      .single();

    if (orderErr || !order) throw new Error('Order produksi tidak ditemukan');

    let totalInputWeight = 0;

    // 2. Insert ke production_materials dan potong stok di inventory
    for (const item of input.materials) {
      if (item.consumption_quantity <= 0) continue;

      totalInputWeight += Number(item.consumption_quantity);

      // Dapatkan informasi master data bahan baku
      const { data: rm } = await supabaseAdmin
        .from('raw_materials')
        .select('name, uom, code')
        .eq('id', item.raw_material_id)
        .maybeSingle();
      const rmName = rm?.name || 'Bahan Baku';
      const rmUom = rm?.uom || 'kg';

      // Insert consumption record
      await supabaseAdmin.from('production_materials').insert([
        {
          production_order_id: input.production_order_id,
          raw_material_id: item.raw_material_id,
          consumption_quantity: item.consumption_quantity,
          created_at: new Date().toISOString(),
        },
      ]);

      // Cari inventory bahan baku ini untuk dipotong stoknya
      const { data: invItems } = await supabaseAdmin
        .from('inventory')
        .select('*')
        .eq('item_type', 'RAW_MATERIAL')
        .eq('item_id', item.raw_material_id)
        .order('quantity', { ascending: false })
        .limit(1);

      let inventoryId = '';
      if (invItems && invItems.length > 0) {
        const inv = invItems[0];
        inventoryId = inv.id;
        const newQty = Math.max(0, Number(inv.quantity) - Number(item.consumption_quantity));

        await supabaseAdmin
          .from('inventory')
          .update({
            quantity: newQty,
            last_updated_at: new Date().toISOString(),
          })
          .eq('id', inv.id);
      } else {
        // Jika belum ada kartu inventory, cari gudang utama bahan baku
        const { data: wh } = await supabaseAdmin.from('warehouses').select('id').limit(1).maybeSingle();
        if (wh?.id) {
          const { data: newInv } = await supabaseAdmin
            .from('inventory')
            .insert([
              {
                warehouse_id: wh.id,
                item_type: 'RAW_MATERIAL',
                item_id: item.raw_material_id,
                quantity: 0,
                last_updated_at: new Date().toISOString(),
              },
            ])
            .select('id')
            .single();
          inventoryId = newInv?.id || '';
        }
      }

      // Catat mutasi stok OUT dengan referensi nomor batch yang jelas untuk kartu stok Dev 2
      if (inventoryId) {
        await supabaseAdmin.from('stock_movements').insert([
          {
            inventory_id: inventoryId,
            movement_type: 'OUT',
            quantity: item.consumption_quantity,
            reference_id: input.production_order_id,
            reference_type: 'PRODUCTION_BATCH',
            notes: `[${order.batch_number}] Pemakaian Bahan: ${rmName} (-${item.consumption_quantity} ${rmUom}) untuk ${order.product_variant || 'Produksi Jamur Crispy'}`,
            movement_date: new Date().toISOString(),
            created_by: user.userId,
          },
        ]);
      }
    }

    // 3. Update order status menjadi IN_PROGRESS
    await supabaseAdmin
      .from('production_orders')
      .update({
        status: 'IN_PROGRESS',
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.production_order_id);

    await logAuditEvent({
      userId: user.userId,
      action: 'UPDATE',
      entityType: 'production_order',
      entityId: input.production_order_id,
      details: {
        action: 'RECORD_MATERIAL_CONSUMPTION',
        materialsCount: input.materials.length,
        totalInputWeight,
      },
    });

    revalidatePath('/production');
    revalidatePath('/inventory');
    return { success: true };
  } catch (err: any) {
    console.error('recordMaterialConsumption error:', err);
    return { success: false, error: err.message || 'Gagal mencatat konsumsi bahan baku' };
  }
}

// ─────────────────────────────────────────────
// RECORD PRODUCTION RESULT & YIELD CALCULATION
// ─────────────────────────────────────────────

export interface RecordProductionResultInput {
  production_order_id: string;
  product_id?: string;
  output_weight: number; // kg jamur matang siap bumbu/kemas
  finished_goods_quantity: number; // pcs kemasan
  wip_quantity?: number;
  anomaly_reason?: string;
  notes?: string;
}

export async function recordProductionResult(input: RecordProductionResultInput): Promise<{
  success: boolean;
  yield_percentage?: number;
  is_yield_compliant?: boolean;
  error?: string;
}> {
  try {
    const { user } = await requireAuth(['PRODUCTION', 'SUPER_ADMIN']);

    if (input.output_weight <= 0) {
      return { success: false, error: 'Berat output hasil produksi harus lebih dari 0 kg' };
    }

    // 1. Ambil order & konsumsi bahan untuk hitung input weight
    const { data: order, error: orderErr } = await supabaseAdmin
      .from('production_orders')
      .select('*')
      .eq('id', input.production_order_id)
      .single();

    if (orderErr || !order) throw new Error('Order produksi tidak ditemukan');

    const { data: mats } = await supabaseAdmin
      .from('production_materials')
      .select('consumption_quantity')
      .eq('production_order_id', input.production_order_id);

    const totalMats = (mats || []).reduce((acc: number, m: any) => acc + Number(m.consumption_quantity || 0), 0);
    const inputWeight = totalMats > 0 ? totalMats : 50.0;

    // 2. Hitung Rendemen (%)
    // Rumus: (Output Weight / Input Weight) * 100%
    const yieldPercentage = parseFloat(((input.output_weight / inputWeight) * 100).toFixed(2));

    // Ambang batas standar rendemen: min 80%
    const isCompliant = yieldPercentage >= 80.0;

    if (!isCompliant && !input.anomaly_reason) {
      return {
        success: false,
        error: `Rendemen (${yieldPercentage}%) di bawah batas standar (80%). Wajib mengisi alasan anomali penyebab penurunan hasil.`,
      };
    }

    let productId = input.product_id;
    let productVariant = '';
    if (!productId) {
      const { data: existingRes } = await supabaseAdmin
        .from('production_results')
        .select('product_id, product:products(name)')
        .eq('production_order_id', input.production_order_id)
        .limit(1);
      productId = existingRes?.[0]?.product_id;
      if (existingRes?.[0]?.product) {
        productVariant = (existingRes[0].product as any).name;
      }
    }

    if (!productId) {
      const { data: anyProd } = await supabaseAdmin.from('products').select('id, name').limit(1).single();
      productId = anyProd?.id;
      productVariant = anyProd?.name || '';
    } else if (!productVariant) {
      const { data: prodData } = await supabaseAdmin.from('products').select('name').eq('id', productId).single();
      productVariant = prodData?.name || '';
    }

    const now = new Date().toISOString();

    // 3. Simpan ke production_results
    if (productId) {
      await supabaseAdmin.from('production_results').insert([
        {
          production_order_id: input.production_order_id,
          product_id: productId,
          finished_goods_quantity: input.finished_goods_quantity,
          wip_quantity: input.wip_quantity || 0,
          yield_percentage: yieldPercentage,
          created_at: now,
        },
      ]);
    }

    // 4. Update status batch ke COMPLETED_WIP (Siap diperiksa tim QC)
    await supabaseAdmin
      .from('production_orders')
      .update({
        status: 'COMPLETED_WIP',
        end_date: now,
        updated_at: now,
        input_weight: inputWeight,
        output_weight: input.output_weight,
        yield_percentage: yieldPercentage,
        is_yield_compliant: isCompliant,
        anomaly_reason: input.anomaly_reason || null,
        product_id: productId,
        product_variant: productVariant,
      })
      .eq('id', input.production_order_id);

    await logAuditEvent({
      userId: user.userId,
      action: 'UPDATE',
      entityType: 'production_order',
      entityId: input.production_order_id,
      details: {
        action: 'RECORD_PRODUCTION_RESULT',
        yieldPercentage,
        isCompliant,
        outputWeight: input.output_weight,
        finishedGoodsQty: input.finished_goods_quantity,
      },
    });

    revalidatePath('/production');
    revalidatePath('/quality-control');
    return {
      success: true,
      yield_percentage: yieldPercentage,
      is_yield_compliant: isCompliant,
    };
  } catch (err: any) {
    console.error('recordProductionResult error:', err);
    return { success: false, error: err.message || 'Gagal menyimpan hasil produksi' };
  }
}

// ─────────────────────────────────────────────
// UPDATE STATUS / CANCEL PRODUCTION ORDER
// ─────────────────────────────────────────────

export async function updateProductionOrderStatus(
  id: string,
  status: DbProductionOrder['status'],
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { user } = await requireAuth(['PRODUCTION', 'SUPER_ADMIN', 'QC']);

    const { error } = await supabaseAdmin
      .from('production_orders')
      .update({
        status,
        notes: notes || undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;

    await logAuditEvent({
      userId: user.userId,
      action: 'UPDATE',
      entityType: 'production_order',
      entityId: id,
      details: { status, notes },
    });

    revalidatePath('/production');
    return { success: true };
  } catch (err: any) {
    console.error('updateProductionOrderStatus error:', err);
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────
// METRICS & OPTIONS HELPERS
// ─────────────────────────────────────────────

export async function getProductionOverviewMetrics(): Promise<{
  success: boolean;
  data?: {
    activeBatches: number;
    avgYieldPercentage: number;
    completedThisMonth: number;
    yieldComplianceRate: number;
  };
  error?: string;
}> {
  try {
    await requireAuth(['PRODUCTION', 'QC', 'WAREHOUSE', 'SUPER_ADMIN', 'MANAGEMENT']);

    const { data: orders, error } = await supabaseAdmin
      .from('production_orders')
      .select('status, yield_percentage, is_yield_compliant, created_at');

    if (error) throw error;

    const allOrders = orders || [];
    const activeBatches = allOrders.filter(
      (o: any) => o.status === 'IN_PROGRESS' || o.status === 'COMPLETED_WIP' || o.status === 'QC_PENDING'
    ).length;

    const completed = allOrders.filter((o: any) => o.status === 'COMPLETED' || o.status === 'RELEASED');
    const withYield = allOrders.filter((o: any) => o.yield_percentage !== null && o.yield_percentage !== undefined);

    const avgYield = withYield.length > 0
      ? parseFloat((withYield.reduce((acc: number, o: any) => acc + Number(o.yield_percentage), 0) / withYield.length).toFixed(2))
      : 82.5;

    const compliantCount = withYield.filter((o: any) => o.is_yield_compliant === true).length;
    const complianceRate = withYield.length > 0
      ? parseFloat(((compliantCount / withYield.length) * 100).toFixed(1))
      : 100;

    return {
      success: true,
      data: {
        activeBatches,
        avgYieldPercentage: avgYield,
        completedThisMonth: completed.length,
        yieldComplianceRate: complianceRate,
      },
    };
  } catch (err: any) {
    console.error('getProductionOverviewMetrics error:', err);
    return { success: false, error: err.message };
  }
}

export async function getProductionFormOptions(): Promise<{
  success: boolean;
  products?: DbProduct[];
  rawMaterials?: (DbRawMaterial & { available_stock?: number })[];
  error?: string;
}> {
  try {
    await requireAuth(['PRODUCTION', 'SUPER_ADMIN', 'WAREHOUSE', 'MANAGEMENT']);

    const [{ data: products }, { data: rawMaterials }, { data: inventory }] = await Promise.all([
      supabaseAdmin.from('products').select('*').is('deleted_at', null).order('name'),
      supabaseAdmin.from('raw_materials').select('*').is('deleted_at', null).order('name'),
      supabaseAdmin.from('inventory').select('item_id, quantity').eq('item_type', 'RAW_MATERIAL'),
    ]);

    const stockMap: Record<string, number> = {};
    (inventory || []).forEach((inv: any) => {
      stockMap[inv.item_id] = (stockMap[inv.item_id] || 0) + Number(inv.quantity);
    });

    const enrichedRawMaterials = (rawMaterials || []).map((rm: any) => ({
      ...rm,
      available_stock: stockMap[rm.id] || 0,
    }));

    return {
      success: true,
      products: products || [],
      rawMaterials: enrichedRawMaterials,
    };
  } catch (err: any) {
    console.error('getProductionFormOptions error:', err);
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────
// SPK SUGGESTIONS (Auto-generated from History)
// ─────────────────────────────────────────────

export interface SpkSuggestion {
  id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  target_kg: number;
  target_pcs: number;
  avg_weekly_kg: number;
  total_historical_kg: number;
  weeks_of_data: number;
  bom: {
    material: string;
    needed_kg: number;
    note: string;
  }[];
}

export async function getSpkSuggestions(): Promise<{
  success: boolean;
  suggestions?: SpkSuggestion[];
  error?: string;
}> {
  try {
    await requireAuth(['PRODUCTION', 'SUPER_ADMIN', 'WAREHOUSE', 'MANAGEMENT']);

    // 1. Get all active products
    const { data: products } = await supabaseAdmin
      .from('products')
      .select('id, name, sku')
      .is('deleted_at', null)
      .order('name');

    if (!products || products.length === 0) {
      return { success: true, suggestions: [] };
    }

    // 2. Get historical production data (up to 3 years = ~156 weeks)
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

    const { data: historicalOrders } = await supabaseAdmin
      .from('production_orders')
      .select('product_id, product_variant, output_weight, created_at, status')
      .in('status', ['COMPLETED', 'RELEASED', 'COMPLETED_WIP'])
      .gte('created_at', threeYearsAgo.toISOString());

    // 3. Also check stock_movements OUT for sales velocity
    const { data: salesMovements } = await supabaseAdmin
      .from('stock_movements')
      .select('quantity, movement_date')
      .eq('movement_type', 'OUT')
      .gte('movement_date', threeYearsAgo.toISOString());

    // 4. Calculate average production per product per week
    const now = new Date();
    const totalWeeks = Math.max(1, Math.ceil(
      (now.getTime() - threeYearsAgo.getTime()) / (7 * 24 * 60 * 60 * 1000)
    ));

    // Aggregate production by product
    const productionByProduct: Record<string, { totalKg: number; count: number }> = {};
    (historicalOrders || []).forEach((order: any) => {
      const pid = order.product_id || 'unknown';
      if (!productionByProduct[pid]) {
        productionByProduct[pid] = { totalKg: 0, count: 0 };
      }
      productionByProduct[pid].totalKg += Number(order.output_weight || 0);
      productionByProduct[pid].count += 1;
    });

    // Total sales velocity as fallback
    const totalSalesKg = (salesMovements || []).reduce(
      (acc: number, m: any) => acc + Number(m.quantity || 0), 0
    );
    const avgWeeklySales = totalSalesKg / totalWeeks;

    // 5. Generate suggestions per product
    const suggestions: SpkSuggestion[] = products.map((product: any) => {
      const history = productionByProduct[product.id];
      
      // Use historical production average, or fall back to even split of sales
      let avgWeeklyKg: number;
      let totalHistoricalKg: number;
      let weeksOfData: number;

      if (history && history.totalKg > 0) {
        totalHistoricalKg = history.totalKg;
        weeksOfData = Math.min(totalWeeks, Math.max(1, history.count));
        avgWeeklyKg = totalHistoricalKg / weeksOfData;
      } else {
        // Fallback: distribute average sales evenly across products
        totalHistoricalKg = 0;
        weeksOfData = 0;
        avgWeeklyKg = products.length > 0 ? avgWeeklySales / products.length : 10;
      }

      // Round up to reasonable numbers
      const targetKg = Math.max(5, parseFloat(avgWeeklyKg.toFixed(1)));
      const targetPcs = Math.ceil((targetKg * 0.75) / 0.05); // rendemen 75%, pack 50g

      // BOM calculation
      const bom = [
        {
          material: 'Jamur Tiram Segar (Daun)',
          needed_kg: parseFloat((targetKg * 1.3).toFixed(1)),
          note: 'Estimasi rendemen 75% (1.3kg daun basah/kg produk)',
        },
        {
          material: 'Minyak Goreng',
          needed_kg: parseFloat((targetKg * 0.3).toFixed(1)),
          note: '30% serapan & sirkulasi wajan',
        },
        {
          material: 'Tepung Bumbu',
          needed_kg: parseFloat((targetKg * 0.08).toFixed(1)),
          note: '8% rasio adonan tepung',
        },
        {
          material: 'Kemasan Pouch 50g',
          needed_kg: targetPcs,
          note: `${targetPcs} pcs kemasan @50g`,
        },
      ];

      return {
        id: `suggestion-${product.id}`,
        product_id: product.id,
        product_name: product.name,
        product_sku: product.sku || '-',
        target_kg: targetKg,
        target_pcs: targetPcs,
        avg_weekly_kg: parseFloat(avgWeeklyKg.toFixed(2)),
        total_historical_kg: parseFloat(totalHistoricalKg.toFixed(1)),
        weeks_of_data: weeksOfData,
        bom,
      };
    });

    return { success: true, suggestions };
  } catch (err: any) {
    console.error('getSpkSuggestions error:', err);
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────
// PRODUCTION CAPACITY METRICS (For SPK Draft)
// ─────────────────────────────────────────────

export async function getProductionCapacityMetrics(): Promise<{
  success: boolean;
  data?: {
    avgDailyOutputKg: number;
    maxDailyCapacityKg: number;
    utilizationPct: number;
    loadLevel: 'RINGAN' | 'NORMAL' | 'BERAT' | 'OVER';
    activeShiftCount: number;
    maxBatchesPerDay: number;
  };
  error?: string;
}> {
  try {
    await requireAuth(['PRODUCTION', 'SUPER_ADMIN', 'WAREHOUSE', 'MANAGEMENT']);

    // 1. Get average daily output from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentOrders } = await supabaseAdmin
      .from('production_orders')
      .select('output_weight, created_at')
      .in('status', ['COMPLETED', 'COMPLETED_WIP', 'RELEASED'])
      .gte('created_at', thirtyDaysAgo.toISOString());

    const totalOutput = (recentOrders || []).reduce(
      (s: number, o: any) => s + Number(o.output_weight || 0), 0
    );
    const avgDailyOutput = Number((totalOutput / 30).toFixed(2));

    // 2. Get operating hours config for max capacity
    const { data: settingsData } = await supabaseAdmin
      .from('settings')
      .select('value')
      .eq('key', 'operating_hours_standards')
      .maybeSingle();

    let maxBatchesPerDay = 14; // Default
    let activeShiftCount = 1;
    let estimatedKgPerBatch = 5;

    if (settingsData?.value) {
      const config = settingsData.value as any;
      const activeShifts = (config.shifts || []).filter((s: any) => s.is_active);
      activeShiftCount = activeShifts.length;
      maxBatchesPerDay = activeShifts.reduce((s: number, sh: any) => s + (sh.max_fryer_batches || 0), 0);
      
      if (config.batch_parameters?.batch_capacity_kg) {
        estimatedKgPerBatch = Number(config.batch_parameters.batch_capacity_kg);
      }
    }

    const maxDailyCapacity = maxBatchesPerDay * estimatedKgPerBatch;

    const utilizationPct = maxDailyCapacity > 0
      ? Number(((avgDailyOutput / maxDailyCapacity) * 100).toFixed(1))
      : 0;

    let loadLevel: 'RINGAN' | 'NORMAL' | 'BERAT' | 'OVER' = 'NORMAL';
    if (utilizationPct < 40) loadLevel = 'RINGAN';
    else if (utilizationPct <= 75) loadLevel = 'NORMAL';
    else if (utilizationPct <= 100) loadLevel = 'BERAT';
    else loadLevel = 'OVER';

    return {
      success: true,
      data: {
        avgDailyOutputKg: avgDailyOutput,
        maxDailyCapacityKg: maxDailyCapacity,
        utilizationPct,
        loadLevel,
        activeShiftCount,
        maxBatchesPerDay,
      },
    };
  } catch (err: any) {
    console.error('getProductionCapacityMetrics error:', err);
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────
// MEMORY & PERSISTENCE FALLBACK STORES (Jika tabel Supabase belum di-migrate)
// ─────────────────────────────────────────────
let memoryFryingBatches: DbFryingBatch[] = [];
let memoryPackingEntries: DbPackingEntry[] = [];
let memoryTimeStudySamples: DbTimeStudySample[] = [];
let memoryLongsongContainers: DbLongsongContainer[] = [];

async function getPersistedContainers(): Promise<DbLongsongContainer[]> {
  try {
    const { data } = await supabaseAdmin
      .from('settings')
      .select('value')
      .eq('key', 'production_longsong_containers')
      .maybeSingle();
    if (data?.value && Array.isArray(data.value)) {
      return data.value as DbLongsongContainer[];
    }
  } catch (_) {}
  return [];
}

async function savePersistedContainers(containers: DbLongsongContainer[]): Promise<void> {
  try {
    await supabaseAdmin
      .from('settings')
      .upsert({
        key: 'production_longsong_containers',
        value: containers,
        updated_at: new Date().toISOString(),
      });
  } catch (_) {}
}

async function getPersistedPackingEntries(): Promise<DbPackingEntry[]> {
  try {
    const { data } = await supabaseAdmin
      .from('settings')
      .select('value')
      .eq('key', 'production_packing_entries')
      .maybeSingle();
    if (data?.value && Array.isArray(data.value)) {
      return data.value as DbPackingEntry[];
    }
  } catch (_) {}
  return [];
}

async function savePersistedPackingEntries(entries: DbPackingEntry[]): Promise<void> {
  try {
    await supabaseAdmin
      .from('settings')
      .upsert({
        key: 'production_packing_entries',
        value: entries,
        updated_at: new Date().toISOString(),
      });
  } catch (_) {}
}

export async function getMemoryPackingEntries(): Promise<DbPackingEntry[]> {
  if (memoryPackingEntries.length === 0) {
    const persisted = await getPersistedPackingEntries();
    if (persisted.length > 0) {
      memoryPackingEntries = persisted;
    }
  }
  return memoryPackingEntries;
}

export async function getLongsongContainers(productionOrderId?: string): Promise<{
  success: boolean;
  data?: DbLongsongContainer[];
  error?: string;
}> {
  try {
    await requireAuth(['PRODUCTION', 'QC', 'WAREHOUSE', 'SUPER_ADMIN', 'MANAGEMENT']);

    let containers: DbLongsongContainer[] = [];

    try {
      let query = supabaseAdmin
        .from('production_longsong_containers')
        .select(`
          *,
          production_order:production_orders(id, batch_number, start_date)
        `)
        .order('created_at', { ascending: false });

      if (productionOrderId) {
        query = query.eq('production_order_id', productionOrderId);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        containers = data;
      }
    } catch (_) {}

    // Check settings table persistence
    if (containers.length === 0) {
      const persisted = await getPersistedContainers();
      if (persisted.length > 0) {
        containers = productionOrderId
          ? persisted.filter(c => c.production_order_id === productionOrderId)
          : persisted;
      }
    }

    // Fallback & enrich from memory
    const memFiltered = productionOrderId
      ? memoryLongsongContainers.filter(c => c.production_order_id === productionOrderId)
      : memoryLongsongContainers;

    if (containers.length === 0) {
      containers = [...memFiltered];
    } else {
      const existingIds = new Set(containers.map(c => c.id));
      for (const m of memFiltered) {
        if (!existingIds.has(m.id)) {
          containers.push(m);
        }
      }
    }

    // Fallback from production_orders notes if containers are still empty
    if (containers.length === 0) {
      try {
        const { data: ordersWithNotes } = await supabaseAdmin
          .from('production_orders')
          .select('id, batch_number, notes, start_date, output_weight')
          .not('notes', 'is', null);

        (ordersWithNotes || []).forEach(o => {
          if (productionOrderId && o.id !== productionOrderId) return;
          const match = (o.notes || '').match(/\[Longsongs:\s*(\[.*?\])\]/);
          if (match) {
            try {
              const parsed = JSON.parse(match[1]);
              parsed.forEach((p: any) => {
                containers.push({
                  id: `order-${o.id}-c-${p.no}`,
                  production_order_id: o.id,
                  container_number: p.no,
                  initial_weight_kg: Number(p.kg) || 2.5,
                  current_weight_kg: Number(p.kg) || 2.5,
                  status: 'AVAILABLE',
                  notes: `SPK ${o.batch_number} - Wadah #${p.no}`,
                  created_at: o.start_date || new Date().toISOString(),
                  updated_at: o.start_date || new Date().toISOString(),
                  production_order: { id: o.id, batch_number: o.batch_number, start_date: o.start_date },
                });
              });
            } catch (_) {}
          } else if (Number(o.output_weight) > 0) {
            const totalKg = Number(o.output_weight);
            const count = Math.max(1, Math.round(totalKg / 2.6));
            const perKg = Number((totalKg / count).toFixed(2));
            for (let i = 1; i <= count; i++) {
              containers.push({
                id: `order-${o.id}-c-${i}`,
                production_order_id: o.id,
                container_number: i,
                initial_weight_kg: perKg,
                current_weight_kg: perKg,
                status: 'AVAILABLE',
                notes: `SPK ${o.batch_number} - Wadah #${i}`,
                created_at: o.start_date || new Date().toISOString(),
                updated_at: o.start_date || new Date().toISOString(),
                production_order: { id: o.id, batch_number: o.batch_number, start_date: o.start_date },
              });
            }
          }
        });

        if (containers.length > 0 && !productionOrderId) {
          await savePersistedContainers(containers);
        }
      } catch (_) {}
    }

    if (containers.length > 0 && !productionOrderId) {
      memoryLongsongContainers = containers;
    }

    return { success: true, data: containers };
  } catch (err: any) {
    console.error('getLongsongContainers error:', err);
    return { success: false, error: err.message || 'Gagal memuat wadah longsong' };
  }
}

// ─────────────────────────────────────────────
// CRUD ACTIONS FOR LONGSONG CONTAINERS
// ─────────────────────────────────────────────

export interface CreateLongsongContainerInput {
  production_order_id?: string;
  container_number: number;
  initial_weight_kg: number;
  notes?: string;
}

export async function createLongsongContainer(input: CreateLongsongContainerInput): Promise<{
  success: boolean;
  data?: DbLongsongContainer;
  error?: string;
}> {
  try {
    const { user } = await requireAuth(['PRODUCTION', 'SUPER_ADMIN', 'WAREHOUSE']);

    if (input.initial_weight_kg <= 0) {
      return { success: false, error: 'Berat wadah longsong harus lebih dari 0 kg' };
    }

    const now = new Date().toISOString();
    const payload = {
      production_order_id: input.production_order_id && isValidUuid(input.production_order_id) ? input.production_order_id : null,
      container_number: input.container_number || 1,
      initial_weight_kg: input.initial_weight_kg,
      current_weight_kg: input.initial_weight_kg,
      status: 'AVAILABLE' as const,
      notes: input.notes || null,
      created_at: now,
      updated_at: now,
    };

    let created: DbLongsongContainer | null = null;
    try {
      const { data, error } = await supabaseAdmin
        .from('production_longsong_containers')
        .insert([payload])
        .select('*')
        .single();
      if (!error && data) {
        created = data as DbLongsongContainer;
      }
    } catch (_) {}

    const resultCreated: DbLongsongContainer = created || {
      id: `manual-c-${Date.now()}`,
      ...payload,
    };

    if (!created) {
      memoryLongsongContainers.unshift(resultCreated);
      await savePersistedContainers(memoryLongsongContainers);
    }

    await logAuditEvent({
      userId: user.userId,
      action: 'CREATE',
      entityType: 'production_longsong_container',
      entityId: resultCreated.id,
      details: input,
    });

    revalidatePath('/production');
    return { success: true, data: resultCreated };
  } catch (err: any) {
    console.error('createLongsongContainer error:', err);
    return { success: false, error: err.message || 'Gagal membuat wadah longsong' };
  }
}

export interface UpdateLongsongContainerInput {
  current_weight_kg?: number;
  status?: 'AVAILABLE' | 'PARTIAL' | 'EMPTY';
  notes?: string;
}

export async function updateLongsongContainer(
  id: string,
  input: UpdateLongsongContainerInput
): Promise<{ success: boolean; data?: DbLongsongContainer; error?: string }> {
  try {
    const { user } = await requireAuth(['PRODUCTION', 'SUPER_ADMIN', 'WAREHOUSE']);

    const now = new Date().toISOString();
    const updatePayload: any = { updated_at: now };
    if (input.current_weight_kg !== undefined) {
      updatePayload.current_weight_kg = Math.max(0, input.current_weight_kg);
      if (updatePayload.current_weight_kg === 0) {
        updatePayload.status = 'EMPTY';
      }
    }
    if (input.status !== undefined) updatePayload.status = input.status;
    if (input.notes !== undefined) updatePayload.notes = input.notes;

    if (isValidUuid(id)) {
      try {
        await supabaseAdmin
          .from('production_longsong_containers')
          .update(updatePayload)
          .eq('id', id);
      } catch (_) {}
    }

    const memIdx = memoryLongsongContainers.findIndex(c => c.id === id);
    if (memIdx !== -1) {
      memoryLongsongContainers[memIdx] = {
        ...memoryLongsongContainers[memIdx],
        ...updatePayload,
      };
      await savePersistedContainers(memoryLongsongContainers);
    }

    await logAuditEvent({
      userId: user.userId,
      action: 'UPDATE',
      entityType: 'production_longsong_container',
      entityId: id,
      details: input,
    });

    revalidatePath('/production');
    return { success: true };
  } catch (err: any) {
    console.error('updateLongsongContainer error:', err);
    return { success: false, error: err.message || 'Gagal memperbarui wadah longsong' };
  }
}

export async function deleteLongsongContainer(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { user } = await requireAuth(['PRODUCTION', 'SUPER_ADMIN', 'WAREHOUSE']);

    if (isValidUuid(id)) {
      try {
        await supabaseAdmin.from('production_longsong_containers').delete().eq('id', id);
      } catch (_) {}
    }

    memoryLongsongContainers = memoryLongsongContainers.filter(c => c.id !== id);
    await savePersistedContainers(memoryLongsongContainers);

    await logAuditEvent({
      userId: user.userId,
      action: 'DELETE',
      entityType: 'production_longsong_container',
      entityId: id,
      details: { note: 'Wadah longsong dihapus / dibatalkan' },
    });

    revalidatePath('/production');
    return { success: true };
  } catch (err: any) {
    console.error('deleteLongsongContainer error:', err);
    return { success: false, error: err.message || 'Gagal menghapus wadah longsong' };
  }
}

export async function consumeLongsongForPacking(
  requiredKg: number
): Promise<{
  success: boolean;
  consumedKg: number;
  deductedContainers: { id: string; container_number: number; deductedKg: number; newWeightKg: number; status: string }[];
  error?: string;
}> {
  try {
    await requireAuth(['PRODUCTION', 'SUPER_ADMIN', 'WAREHOUSE']);

    const res = await getLongsongContainers();
    const containers = res.data || [];
    const active = containers
      .filter(c => (c.status === 'AVAILABLE' || c.status === 'PARTIAL') && Number(c.current_weight_kg) > 0)
      .sort((a, b) => (a.container_number || 0) - (b.container_number || 0));

    let remainingNeeded = Math.max(0, requiredKg);
    let totalConsumed = 0;
    const deducted: { id: string; container_number: number; deductedKg: number; newWeightKg: number; status: string }[] = [];

    for (const c of active) {
      if (remainingNeeded <= 0) break;
      const current = Number(c.current_weight_kg) || 0;
      if (current <= 0) continue;

      const toDeduct = Math.min(current, remainingNeeded);
      const newWeight = Math.max(0, Number((current - toDeduct).toFixed(2)));
      const newStatus = newWeight === 0 ? 'EMPTY' : 'PARTIAL';

      await updateLongsongContainer(c.id, {
        current_weight_kg: newWeight,
        status: newStatus as any,
        notes: `Dipakai packing (${toDeduct.toFixed(2)} kg)`,
      });

      remainingNeeded = Math.max(0, Number((remainingNeeded - toDeduct).toFixed(2)));
      totalConsumed += toDeduct;
      deducted.push({
        id: c.id,
        container_number: c.container_number,
        deductedKg: toDeduct,
        newWeightKg: newWeight,
        status: newStatus,
      });
    }

    revalidatePath('/production');
    return {
      success: true,
      consumedKg: totalConsumed,
      deductedContainers: deducted,
    };
  } catch (err: any) {
    console.error('consumeLongsongForPacking error:', err);
    return { success: false, consumedKg: 0, deductedContainers: [], error: err.message };
  }
}

// ─────────────────────────────────────────────
// MATERIAL DEDUCTION INTEGRATION (BOM RESEP & PACKAGING)
// ─────────────────────────────────────────────

/**
 * Otomatis potong stok bahan baku penggorengan (Jamur Tiram, Tepung Premix, Minyak Goreng)
 * berdasarkan standar resep formula (BOM) & berat wajan
 */
async function deductFryingRawMaterials(
  batchId: string,
  productionOrderId: string,
  batchWeightGram: number,
  userId?: string,
  wajanNumber?: number
): Promise<void> {
  try {
    const isBatchUuid = isValidUuid(batchId);

    // 1. Cek apakah sudah pernah dipotong stok untuk batch ini agar tidak double count
    if (isBatchUuid) {
      const { data: existingMov } = await supabaseAdmin
        .from('stock_movements')
        .select('id')
        .eq('reference_id', batchId)
        .eq('reference_type', 'PRODUCTION_FRYING')
        .limit(1);

      if (existingMov && existingMov.length > 0) return;
    }

    // 2. Ambil standar resep BOM
    const stdRes = await getProductionStandards();
    const standards = stdRes.data;
    const baseRecipe = standards.bom_recipes?.[0] || {
      raw_mushroom_ratio: 1.0,
      premix_flour_ratio: 0.25,
      cooking_oil_ratio: 0.30,
    };

    let materialsToDeduct: { id?: string; name: string; qty: number; uom: string; code?: string; keywords: string[]; exclude?: string }[] = [];

    if (baseRecipe.ingredients && baseRecipe.ingredients.length > 0) {
      materialsToDeduct = baseRecipe.ingredients.map(ing => ({
        id: ing.raw_material_id,
        name: ing.name,
        qty: Math.round(((batchWeightGram / 1000) * Number(ing.ratio_per_kg || 0)) * 1000) / 1000,
        uom: ing.uom || 'kg',
        keywords: [ing.name.toLowerCase()],
      }));
    } else {
      const mushroomRatio = Number(baseRecipe.raw_mushroom_ratio) || 1.0;
      const premixRatio = Number(baseRecipe.premix_flour_ratio) || 0.25;
      const oilRatio = Number(baseRecipe.cooking_oil_ratio) || 0.30;

      const mushroomKg = Math.round(((batchWeightGram / 1000) * mushroomRatio) * 1000) / 1000;
      const premixKg = Math.round(((batchWeightGram / 1000) * premixRatio) * 1000) / 1000;
      const oilLiter = Math.round(((batchWeightGram / 1000) * oilRatio) * 1000) / 1000;

      materialsToDeduct = [
        { id: baseRecipe.raw_mushroom_id, name: 'Jamur Tiram Segar', qty: mushroomKg, uom: 'kg', code: 'JMR-TRM', keywords: ['jamur tiram segar', 'jamur tiram'], exclude: 'gagang' },
        { id: baseRecipe.premix_flour_id, name: 'Tepung Premix KhumKhum', qty: premixKg, uom: 'kg', code: 'RM-PRX', keywords: ['tepung premix khumkhum', 'tepung premix', 'premix'], exclude: 'terigu' },
        { id: baseRecipe.cooking_oil_id, name: 'Minyak Goreng', qty: oilLiter, uom: 'liter', code: 'RM-MINY', keywords: ['minyak goreng', 'minyak'], exclude: 'pelumas' },
      ];
    }

    for (const mat of materialsToDeduct) {
      if (mat.qty <= 0) continue;

      let matId = mat.id;
      if (!matId || !isValidUuid(matId)) {
        let found: { id: string } | null = null;
        if (mat.code) {
          const { data: byCode } = await supabaseAdmin
            .from('raw_materials')
            .select('id')
            .is('deleted_at', null)
            .ilike('code', mat.code)
            .limit(1)
            .maybeSingle();
          if (byCode) found = byCode;
        }

        if (!found) {
          let q = supabaseAdmin
            .from('raw_materials')
            .select('id')
            .is('deleted_at', null)
            .or(mat.keywords.map(k => `name.ilike.%${k}%`).join(','));
          if (mat.exclude) {
            q = q.not('name', 'ilike', `%${mat.exclude}%`);
          }
          const { data: byName } = await q.limit(1).maybeSingle();
          found = byName;
        }

        matId = found?.id;
      }
      if (!matId) continue;

      // Cari inventory record
      const { data: invList } = await supabaseAdmin
        .from('inventory')
        .select('id, quantity')
        .eq('item_type', 'RAW_MATERIAL')
        .eq('item_id', matId)
        .limit(1);

      let invId = '';
      if (invList && invList.length > 0) {
        invId = invList[0].id;
        const currentQty = Number(invList[0].quantity) || 0;
        const newQty = Math.max(0, currentQty - mat.qty);
        await supabaseAdmin
          .from('inventory')
          .update({ quantity: newQty, last_updated_at: new Date().toISOString() })
          .eq('id', invId);
      } else {
        const { data: wh } = await supabaseAdmin.from('warehouses').select('id').limit(1).maybeSingle();
        if (wh?.id) {
          const { data: newInv } = await supabaseAdmin
            .from('inventory')
            .insert({
              warehouse_id: wh.id,
              item_type: 'RAW_MATERIAL',
              item_id: matId,
              quantity: 0,
              last_updated_at: new Date().toISOString(),
            })
            .select('id')
            .single();
          invId = newInv?.id || '';
        }
      }

      if (invId) {
        const refId = isBatchUuid ? batchId : (isValidUuid(productionOrderId) ? productionOrderId : null);
        const wajanLabel = wajanNumber ? `Wajan #${wajanNumber}` : `Wajan ${batchWeightGram}g`;

        await supabaseAdmin.from('stock_movements').insert({
          inventory_id: invId,
          movement_type: 'OUT',
          quantity: mat.qty,
          movement_date: new Date().toISOString(),
          reference_id: refId,
          reference_type: 'PRODUCTION_FRYING',
          notes: `Konsumsi penggorengan ${mat.name} (${mat.qty} ${mat.uom}) untuk ${wajanLabel}`,
          created_by: userId || null,
        });

        // Rekam ke production_materials jika terhubung dengan SPK spesifik
        if (isValidUuid(productionOrderId)) {
          await supabaseAdmin.from('production_materials').insert({
            production_order_id: productionOrderId,
            raw_material_id: matId,
            consumption_quantity: mat.qty,
            created_at: new Date().toISOString(),
          });
        }
      }
    }
  } catch (err) {
    console.error('deductFryingRawMaterials error:', err);
  }
}

/**
 * Otomatis potong stok bumbu tabur & bahan kemasan saat entri packing dicatat
 */
const FLAVOR_SEASONING_KEYWORDS: Record<string, string[]> = {
  balado: ['balado', 'bld'],
  bbq: ['bbq', 'barbeque', 'barbecue'],
  'pedas manis': ['pedas manis', 'manis pedas', 'bt-pm'],
  'super pedas': ['super pedas', 'extra pedas', 'bt-sp'],
  original: ['gurih', 'original', 'asin gurih', 'bumbu tabur original', 'paket bumbu'],
  'jagung bakar': ['jagung bakar', 'jagung'],
  keju: ['keju', 'cheese'],
};

/**
 * Otomatis potong stok bumbu tabur & bahan kemasan saat entri packing dicatat
 * Memastikan resep bumbu (sesuai rasio varian & gramatur kemasan) terpotong dari gudang bahan baku
 */
async function deductPackingMaterials(
  packingEntryId: string,
  input: CreatePackingEntryInput,
  userId?: string
): Promise<{ success: boolean; seasoningGrams?: number; packagingCount?: number }> {
  try {
    const isEntryUuid = isValidUuid(packingEntryId);
    if (isEntryUuid) {
      const { data: existingMov } = await supabaseAdmin
        .from('stock_movements')
        .select('id')
        .eq('reference_id', packingEntryId)
        .like('reference_type', 'PRODUCTION_PACKING_%')
        .limit(1);

      if (existingMov && existingMov.length > 0) {
        return { success: true };
      }
    }

    const stdRes = await getProductionStandards();
    const standards = stdRes?.data;

    const flavor = (input.flavor_variant || 'Original').trim();
    const packCount = Number(input.packaged_toples_count) || 0;
    const pkgType = input.packaging_type || 'Standing Pouch';
    const targetWeight = input.packaging_weight_gram || '60g';
    const weightGramPerPack = parseInt(targetWeight.replace(/\D/g, ''), 10) || 60;
    const defectCount = Number(input.defect_packaging_count) || 0;

    // 1. Hitung Takaran Bumbu Tabur Sesuai Resep Standar Varian Rasa
    const isOriginalFlavor = flavor.toLowerCase().includes('ori') || flavor.toLowerCase() === 'original';
    const seasoningConfig = standards?.seasoning_per_variant?.find(
      (s) => s.variant.toLowerCase() === flavor.toLowerCase()
    );

    let seasoningGrams = isOriginalFlavor ? 0 : (Number(input.seasoning_used_gram) || 0);
    if (!isOriginalFlavor && seasoningGrams <= 0 && packCount > 0) {
      const totalWeightKg = (packCount * weightGramPerPack) / 1000;
      const ratioPerKg = Number(seasoningConfig?.seasoning_ratio_per_kg) || 0.08;
      seasoningGrams = Math.round(totalWeightKg * ratioPerKg * 1000);
    }

    // ── Potong Stok Bumbu Tabur dari Warehouse Bahan Baku ──
    if (seasoningGrams > 0) {
      let seasoningMatId = seasoningConfig?.seasoning_material_id;
      if (!seasoningMatId) {
        const flavorKey = flavor.toLowerCase();
        const keywords = FLAVOR_SEASONING_KEYWORDS[flavorKey] || [flavorKey];

        const { data: allSeasonings } = await supabaseAdmin
          .from('raw_materials')
          .select('id, name, material_category, uom')
          .is('deleted_at', null);

        if (allSeasonings && allSeasonings.length > 0) {
          const matched = allSeasonings.find((rm: any) => {
            const nameL = rm.name.toLowerCase();
            const catL = (rm.material_category || '').toLowerCase();
            const isSeasoningType = catL.includes('seasoning') || catL.includes('bumbu') || nameL.includes('bumbu') || nameL.includes('tabur');
            return isSeasoningType && keywords.some((k) => nameL.includes(k));
          }) || allSeasonings.find((rm: any) => {
            const nameL = rm.name.toLowerCase();
            return keywords.some((k) => nameL.includes(k));
          });

          seasoningMatId = matched?.id;
        }
      }

      if (seasoningMatId) {
        const { data: whList } = await supabaseAdmin
          .from('warehouses')
          .select('id, name')
          .is('deleted_at', null);
        const mainWh = whList?.find((w: any) =>
          w.name.toLowerCase().includes('bahan baku') ||
          w.name.toLowerCase().includes('utama') ||
          w.name.toLowerCase().includes('pabrik')
        ) || whList?.[0];

        let targetInvId: string | null = null;
        let currentInvQty = 0;

        if (mainWh?.id) {
          const { data: sInv } = await supabaseAdmin
            .from('inventory')
            .select('id, quantity, warehouse_id')
            .eq('warehouse_id', mainWh.id)
            .eq('item_type', 'RAW_MATERIAL')
            .eq('item_id', seasoningMatId)
            .limit(1);

          if (sInv && sInv.length > 0) {
            targetInvId = sInv[0].id;
            currentInvQty = Number(sInv[0].quantity) || 0;
          } else {
            // Auto-provision inventory slot di gudang bahan baku jika belum ada record
            const { data: newInv } = await supabaseAdmin
              .from('inventory')
              .insert({
                warehouse_id: mainWh.id,
                item_type: 'RAW_MATERIAL',
                item_id: seasoningMatId,
                quantity: 0,
                last_updated_at: new Date().toISOString(),
              })
              .select('id, quantity')
              .single();
            if (newInv) {
              targetInvId = newInv.id;
              currentInvQty = 0;
            }
          }
        }

        if (targetInvId) {
          const { data: rmDetail } = await supabaseAdmin
            .from('raw_materials')
            .select('name, uom')
            .eq('id', seasoningMatId)
            .single();

          const isGramUom = rmDetail?.uom?.toLowerCase() === 'gram' || rmDetail?.uom?.toLowerCase() === 'gr';
          const deductQty = isGramUom ? seasoningGrams : Math.round((seasoningGrams / 1000) * 1000) / 1000;

          const newQty = Math.max(0, currentInvQty - deductQty);
          await supabaseAdmin
            .from('inventory')
            .update({ quantity: newQty, last_updated_at: new Date().toISOString() })
            .eq('id', targetInvId);

          await supabaseAdmin.from('stock_movements').insert({
            inventory_id: targetInvId,
            movement_type: 'OUT',
            quantity: deductQty,
            reference_id: isEntryUuid ? packingEntryId : null,
            reference_type: 'PRODUCTION_PACKING_SEASONING',
            notes: `Resep bumbu tabur ${flavor} (${seasoningGrams}g) untuk ${packCount} pcs @${targetWeight} [${rmDetail?.name || flavor}]`,
            created_by: userId || null,
          });
        }
      }
    }

    // 2. Potong Stok Bahan Kemasan Fisik (Standing Pouch / Toples + Defect Scrap)
    const totalPkgDeduct = packCount + defectCount;
    if (totalPkgDeduct > 0) {
      let pkgMatId = seasoningConfig?.packaging_material_id;

      // Cek spesifik di raw_materials berdasarkan type, weight, dan flavor
      if (!pkgMatId) {
        // 1. Coba cari kemasan cetak sablon rasa spesifik & gramasi sama
        const { data: specificPkg } = await supabaseAdmin
          .from('raw_materials')
          .select('id')
          .is('deleted_at', null)
          .eq('material_category', 'Packaging')
          .ilike('packaging_type', `%${pkgType}%`)
          .eq('package_weight', targetWeight)
          .ilike('flavor_variant', `%${flavor}%`)
          .limit(1)
          .maybeSingle();

        if (specificPkg) {
          pkgMatId = specificPkg.id;
        } else {
          // 2. Coba cari kemasan universal/polos dengan gramasi sama (misal Standing Pouch 60g)
          const { data: universalPkg } = await supabaseAdmin
            .from('raw_materials')
            .select('id')
            .is('deleted_at', null)
            .eq('material_category', 'Packaging')
            .ilike('packaging_type', `%${pkgType}%`)
            .eq('package_weight', targetWeight)
            .limit(1)
            .maybeSingle();
          if (universalPkg) {
            pkgMatId = universalPkg.id;
          }
        }
      }

      if (!pkgMatId && standards?.packaging_configs) {
        const pkgMatch = standards.packaging_configs.find((p: any) =>
          p.packaging_type.toLowerCase().includes(pkgType.toLowerCase()) ||
          p.packaging_name.toLowerCase().includes(targetWeight.toLowerCase())
        );
        pkgMatId = pkgMatch?.packaging_material_id;
      }

      if (!pkgMatId) {
        const isToples = pkgType.toLowerCase().includes('toples');
        const kw = isToples ? 'toples' : 'kemasan';
        const { data: foundPkg } = await supabaseAdmin
          .from('raw_materials')
          .select('id')
          .is('deleted_at', null)
          .ilike('name', `%${kw}%`)
          .limit(1)
          .maybeSingle();
        pkgMatId = foundPkg?.id;
      }

      if (pkgMatId) {
        // Cari Gudang Utama terlebih dahulu agar tidak salah gudang/konsinyasi
        const { data: whList } = await supabaseAdmin
          .from('warehouses')
          .select('id, name')
          .is('deleted_at', null);
        const mainWh = whList?.find((w: any) =>
          w.name.toLowerCase().includes('bahan baku') ||
          w.name.toLowerCase().includes('utama') ||
          w.name.toLowerCase().includes('pabrik')
        ) || whList?.[0];

        let targetPkgInvId: string | null = null;
        let currentPkgQty = 0;

        if (mainWh?.id) {
          const { data: pInv } = await supabaseAdmin
            .from('inventory')
            .select('id, quantity, warehouse_id')
            .eq('warehouse_id', mainWh.id)
            .eq('item_type', 'RAW_MATERIAL')
            .eq('item_id', pkgMatId)
            .limit(1);

          if (pInv && pInv.length > 0) {
            targetPkgInvId = pInv[0].id;
            currentPkgQty = Number(pInv[0].quantity) || 0;
          } else {
            // Auto-provision inventory slot jika belum ada di Gudang Utama
            const { data: newInv } = await supabaseAdmin
              .from('inventory')
              .insert({
                warehouse_id: mainWh.id,
                item_type: 'RAW_MATERIAL',
                item_id: pkgMatId,
                quantity: 0,
                last_updated_at: new Date().toISOString(),
              })
              .select('id, quantity')
              .single();
            if (newInv) {
              targetPkgInvId = newInv.id;
              currentPkgQty = 0;
            }
          }
        }

        if (targetPkgInvId) {
          const newQty = Math.max(0, currentPkgQty - totalPkgDeduct);
          await supabaseAdmin
            .from('inventory')
            .update({ quantity: newQty, last_updated_at: new Date().toISOString() })
            .eq('id', targetPkgInvId);

          await supabaseAdmin.from('stock_movements').insert({
            inventory_id: targetPkgInvId,
            movement_type: 'OUT',
            quantity: totalPkgDeduct,
            reference_id: isEntryUuid ? packingEntryId : null,
            reference_type: 'PRODUCTION_PACKING_MATERIAL',
            notes: `Pemakaian kemasan ${pkgType} ${targetWeight} (${packCount} pcs + defect ${defectCount} pcs) untuk ${flavor}`,
            created_by: userId || null,
          });
        }
      }
    }

    return {
      success: true,
      seasoningGrams,
      packagingCount: totalPkgDeduct,
    };
  } catch (err) {
    console.warn('deductPackingMaterials warning:', err);
    return { success: false };
  }
}

export interface CreateFryingBatchInput {
  production_order_id?: string;
  wajan_number: number;
  batch_weight_gram?: number;
  oil_temp_celsius: number;
  notes?: string;
  started_at?: string | null;
  finished_at?: string | null;
  frying_duration_minutes?: number | null;
  output_weight_gram?: number | null;
  longsong_count?: number | null;
  kremesan_weight_gram?: number | null;
}

export async function createFryingBatch(input: CreateFryingBatchInput): Promise<{
  success: boolean;
  data?: DbFryingBatch;
  error?: string;
}> {
  try {
    const session = await requireAuth(['PRODUCTION', 'SUPER_ADMIN', 'PREMIX']);

    let createdBatch: DbFryingBatch | undefined;

    // Resolve order ID: jika dipilih, gunakan ID tersebut. Jika tidak dipilih (Curah/Pool), gunakan null (kolom nullable).
    const resolvedOrderId = input.production_order_id && input.production_order_id.trim() !== ''
      ? input.production_order_id
      : null;

    const nowIso = new Date().toISOString();
    const startedAt = input.started_at !== undefined ? input.started_at : null;
    const finishedAt = input.finished_at !== undefined ? input.finished_at : null;
    const durationMinutes = input.frying_duration_minutes !== undefined ? input.frying_duration_minutes : null;

    const insertPayload: any = {
      production_order_id: resolvedOrderId,
      wajan_number: input.wajan_number,
      batch_weight_gram: input.batch_weight_gram || 800,
      oil_temp_celsius: input.oil_temp_celsius,
      notes: input.notes,
      operator_id: session.user.id,
      started_at: startedAt,
      timer_started_at: null, // Timer wajib IDLE (0m 00s) saat buat batch baru, baru berjalan jika operator klik 'Mulai'
      finished_at: finishedAt,
      frying_duration_minutes: durationMinutes,
      output_weight_gram: input.output_weight_gram ?? null,
      longsong_count: input.longsong_count ?? 0,
      kremesan_weight_gram: input.kremesan_weight_gram ?? 0,
    };

    const { data, error } = await supabaseAdmin
      .from('production_frying_batches')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.warn('Fallback memory for createFryingBatch:', error.message);
      const fallbackItem: DbFryingBatch = {
        id: randomUUID(),
        production_order_id: resolvedOrderId || 'pool-selongsong',
        wajan_number: input.wajan_number,
        batch_weight_gram: input.batch_weight_gram || 800,
        oil_temp_celsius: input.oil_temp_celsius,
        longsong_count: input.longsong_count ?? 0,
        kremesan_weight_gram: input.kremesan_weight_gram ?? 0,
        output_weight_gram: input.output_weight_gram ?? null,
        frying_duration_minutes: durationMinutes,
        notes: input.notes || null,
        operator_id: session.user.id,
        started_at: startedAt,
        finished_at: finishedAt,
        timer_started_at: null, // Tetap null agar tidak langsung berjalan 1 menit
        created_at: nowIso,
        operator: { id: session.user.id, name: session.user.name || 'Operator Produksi' },
      };
      memoryFryingBatches.unshift(fallbackItem);
      createdBatch = fallbackItem;
    } else {
      createdBatch = data;
    }

    // Update production order status & progress if linked to an order
    if (resolvedOrderId) {
      try {
        let totalInputGram = input.batch_weight_gram || 800;
        if (isValidUuid(resolvedOrderId)) {
          const { data: siblingBatches } = await supabaseAdmin
            .from('production_frying_batches')
            .select('batch_weight_gram')
            .eq('production_order_id', resolvedOrderId);
          if (siblingBatches && siblingBatches.length > 0) {
            totalInputGram = siblingBatches.reduce((s: number, b: any) => s + (Number(b.batch_weight_gram) || 800), 0);
          }
          const { data: ord } = await supabaseAdmin
            .from('production_orders')
            .select('target_quantity, status')
            .eq('id', resolvedOrderId)
            .maybeSingle();
          if (ord) {
            const targetKg = Number(ord.target_quantity) || 50;
            const inputKg = totalInputGram / 1000;
            const isCompleted = inputKg >= targetKg;
            const newStatus = isCompleted ? 'COMPLETED' : (ord.status === 'DRAFT' ? 'IN_PROGRESS' : ord.status);
            await supabaseAdmin
              .from('production_orders')
              .update({
                status: newStatus,
                input_weight: inputKg,
                updated_at: new Date().toISOString(),
              })
              .eq('id', resolvedOrderId);
          }
        }
      } catch (err) {
        console.warn('SPK frying status auto-update warning:', err);
      }
    }

    await logAuditEvent({
      action: 'CREATE',
      entityType: 'production_frying_batch',
      entityId: createdBatch?.id || 'unknown',
      userId: session.user.id,
      details: { wajan_number: input.wajan_number, batch_weight_gram: input.batch_weight_gram },
    });

    if (createdBatch) {
      await deductFryingRawMaterials(
        createdBatch.id,
        resolvedOrderId || '',
        input.batch_weight_gram || 800,
        session.user.id,
        input.wajan_number
      );
    }

    revalidatePath('/production');
    revalidatePath('/inventory');
    return { success: true, data: createdBatch };
  } catch (err: any) {
    console.error('createFryingBatch error:', err);
    return { success: false, error: err.message || 'Gagal membuat batch goreng' };
  }
}

export async function startFryingBatchTimer(fryingBatchId: string): Promise<{
  success: boolean;
  data?: DbFryingBatch;
  error?: string;
}> {
  try {
    const session = await requireAuth(['PRODUCTION', 'SUPER_ADMIN']);
    const nowIso = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('production_frying_batches')
      .update({
        timer_started_at: nowIso,
        started_at: nowIso,
      })
      .eq('id', fryingBatchId)
      .select()
      .single();

    if (error) {
      console.warn('Fallback memory for startFryingBatchTimer:', error.message);
      const idx = memoryFryingBatches.findIndex(b => b.id === fryingBatchId);
      if (idx !== -1) {
        memoryFryingBatches[idx] = {
          ...memoryFryingBatches[idx],
          timer_started_at: nowIso,
          started_at: nowIso,
        };
      }
    }

    await logAuditEvent({
      action: 'UPDATE',
      entityType: 'production_frying_batch',
      entityId: fryingBatchId,
      userId: session.user.id,
      details: { action: 'START_TIMER', timer_started_at: nowIso },
    });

    revalidatePath('/production');
    return { success: true };
  } catch (err: any) {
    console.error('startFryingBatchTimer error:', err);
    return { success: false, error: err.message || 'Gagal memulai timer' };
  }
}

export interface CompleteFryingBatchInput {
  frying_batch_id: string;
  output_weight_gram: number;
  longsong_count: number;
  kremesan_weight_gram?: number;
  frying_duration_minutes?: number;
  started_at?: string;
  finished_at?: string;
  notes?: string;
}

export async function completeFryingBatch(input: CompleteFryingBatchInput): Promise<{
  success: boolean;
  data?: DbFryingBatch;
  error?: string;
}> {
  try {
    await requireAuth(['PRODUCTION', 'SUPER_ADMIN', 'PREMIX', 'WAREHOUSE']);

    let updatedBatch: DbFryingBatch | undefined;

    const finishedAtIso = input.finished_at || new Date().toISOString();

    // Duration: use explicit duration if provided, or calculate from timer_started_at / started_at
    let durationMinutes: number | null = input.frying_duration_minutes != null ? input.frying_duration_minutes : null;
    let startedAtIso: string | undefined = input.started_at;

    try {
      const { data: existingBatch } = await supabaseAdmin
        .from('production_frying_batches')
        .select('timer_started_at, started_at, frying_duration_minutes')
        .eq('id', input.frying_batch_id)
        .single();
      if (existingBatch) {
        if (!startedAtIso && (existingBatch.started_at || existingBatch.timer_started_at)) {
          startedAtIso = existingBatch.started_at || existingBatch.timer_started_at;
        }
        if (durationMinutes == null) {
          if (existingBatch.frying_duration_minutes) {
            durationMinutes = existingBatch.frying_duration_minutes;
          } else if (startedAtIso) {
            durationMinutes = Math.round(((new Date(finishedAtIso).getTime() - new Date(startedAtIso).getTime()) / 60000) * 100) / 100;
          }
        }
      }
    } catch (_) {}

    // Fallback default duration if still null (15 minutes standard)
    if (durationMinutes == null || isNaN(durationMinutes) || durationMinutes <= 0) {
      durationMinutes = 15;
    }
    if (!startedAtIso) {
      startedAtIso = new Date(new Date(finishedAtIso).getTime() - durationMinutes * 60000).toISOString();
    }

    const updatePayload: any = {
      output_weight_gram: input.output_weight_gram,
      longsong_count: input.longsong_count,
      kremesan_weight_gram: input.kremesan_weight_gram || 0,
      finished_at: finishedAtIso,
      started_at: startedAtIso,
      frying_duration_minutes: durationMinutes,
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    };

    const { data, error } = await supabaseAdmin
      .from('production_frying_batches')
      .update(updatePayload)
      .eq('id', input.frying_batch_id)
      .select()
      .single();

    if (error) {
      console.warn('Fallback memory for completeFryingBatch:', error.message);
      const idx = memoryFryingBatches.findIndex(b => b.id === input.frying_batch_id);
      if (idx !== -1) {
        const memBatch = memoryFryingBatches[idx];
        const memTimerStart = startedAtIso || memBatch.timer_started_at || memBatch.started_at;
        const memDuration = durationMinutes != null
          ? durationMinutes
          : (memBatch.frying_duration_minutes || (memTimerStart ? Math.round(((new Date(finishedAtIso).getTime() - new Date(memTimerStart).getTime()) / 60000) * 100) / 100 : 15));
        memoryFryingBatches[idx] = {
          ...memBatch,
          output_weight_gram: input.output_weight_gram,
          longsong_count: input.longsong_count,
          kremesan_weight_gram: input.kremesan_weight_gram || 0,
          finished_at: finishedAtIso,
          started_at: memTimerStart || new Date(new Date(finishedAtIso).getTime() - memDuration * 60000).toISOString(),
          frying_duration_minutes: memDuration,
          ...(input.notes !== undefined ? { notes: input.notes } : {}),
        };
        updatedBatch = memoryFryingBatches[idx];
      }
    } else {
      updatedBatch = data;
    }

    // Recalculate and update parent SPK cycle time avg & HACCP compliance if linked
    const linkedOrderId = updatedBatch?.production_order_id;
    if (linkedOrderId && linkedOrderId !== 'pool-selongsong') {
      try {
        let batchesList: any[] = [];
        if (isValidUuid(linkedOrderId)) {
          const { data: dbBatches } = await supabaseAdmin
            .from('production_frying_batches')
            .select('frying_duration_minutes, finished_at')
            .eq('production_order_id', linkedOrderId);
          if (dbBatches && dbBatches.length > 0) batchesList = dbBatches;
        }
        if (batchesList.length === 0) {
          batchesList = memoryFryingBatches.filter(b => b.production_order_id === linkedOrderId);
        }
        const finishedBatches = batchesList.filter(b => b.finished_at && Number(b.frying_duration_minutes) > 0);
        if (finishedBatches.length > 0) {
          const totalMin = finishedBatches.reduce((s, b) => s + (Number(b.frying_duration_minutes) || 15), 0);
          const avgSec = Math.round((totalMin / finishedBatches.length) * 60);

          if (isValidUuid(linkedOrderId)) {
            await supabaseAdmin
              .from('production_orders')
              .update({
                cycle_time_avg_seconds: avgSec,
                standard_time_seconds: 15 * 60,
                updated_at: new Date().toISOString(),
              })
              .eq('id', linkedOrderId);
          }

          const memOrdIdx = memoryProductionOrders.findIndex(o => o.id === linkedOrderId);
          if (memOrdIdx !== -1) {
            memoryProductionOrders[memOrdIdx].cycle_time_avg_seconds = avgSec;
            memoryProductionOrders[memOrdIdx].standard_time_seconds = 15 * 60;
          }
        }
      } catch (_) {}
    }

    revalidatePath('/production');
    return { success: true, data: updatedBatch };
  } catch (err: any) {
    console.error('completeFryingBatch error:', err);
    return { success: false, error: err.message || 'Gagal menyelesaikan batch goreng' };
  }
}

export const updateFryingBatchOutput = completeFryingBatch;

export interface UpdateFryingBatchInput {
  wajan_number?: number;
  oil_temp_celsius?: number;
  frying_duration_minutes?: number;
  output_weight_gram?: number;
  longsong_count?: number;
  notes?: string;
}

export async function updateFryingBatch(
  batchId: string,
  input: UpdateFryingBatchInput
): Promise<{ success: boolean; data?: DbFryingBatch; error?: string }> {
  try {
    const session = await requireAuth(['PRODUCTION', 'SUPER_ADMIN']);

    const updatePayload: any = {};
    if (input.wajan_number !== undefined) updatePayload.wajan_number = input.wajan_number;
    if (input.oil_temp_celsius !== undefined) updatePayload.oil_temp_celsius = input.oil_temp_celsius;
    if (input.frying_duration_minutes !== undefined) updatePayload.frying_duration_minutes = input.frying_duration_minutes;
    if (input.output_weight_gram !== undefined) updatePayload.output_weight_gram = input.output_weight_gram;
    if (input.longsong_count !== undefined) updatePayload.longsong_count = input.longsong_count;
    if (input.notes !== undefined) updatePayload.notes = input.notes;

    if (isValidUuid(batchId)) {
      await supabaseAdmin
        .from('production_frying_batches')
        .update(updatePayload)
        .eq('id', batchId);
    }

    const idx = memoryFryingBatches.findIndex(b => b.id === batchId);
    if (idx !== -1) {
      memoryFryingBatches[idx] = {
        ...memoryFryingBatches[idx],
        ...updatePayload,
      };
    }

    await logAuditEvent({
      userId: session.user.userId,
      action: 'UPDATE',
      entityType: 'production_frying_batch',
      entityId: batchId,
      details: { updates: updatePayload },
    });

    revalidatePath('/production');
    return { success: true };
  } catch (err: any) {
    console.error('updateFryingBatch error:', err);
    return { success: false, error: err.message || 'Gagal memperbarui batch wajan' };
  }
}

export async function deleteFryingBatch(batchId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await requireAuth(['PRODUCTION', 'SUPER_ADMIN']);

    // Kembalikan (revert) mutasi stok bahan baku yang terlanjur dipotong
    try {
      const isBatchUuid = isValidUuid(batchId);
      if (isBatchUuid) {
        const { data: movements } = await supabaseAdmin
          .from('stock_movements')
          .select('*')
          .eq('reference_id', batchId)
          .eq('reference_type', 'PRODUCTION_FRYING');

        if (movements && movements.length > 0) {
          for (const mov of movements) {
            if (mov.inventory_id && mov.quantity > 0) {
              const { data: inv } = await supabaseAdmin
                .from('inventory')
                .select('id, quantity')
                .eq('id', mov.inventory_id)
                .maybeSingle();
              if (inv) {
                await supabaseAdmin
                  .from('inventory')
                  .update({ quantity: Number(inv.quantity) + Number(mov.quantity), last_updated_at: new Date().toISOString() })
                  .eq('id', inv.id);
              }
            }
          }
          await supabaseAdmin
            .from('stock_movements')
            .delete()
            .eq('reference_id', batchId)
            .eq('reference_type', 'PRODUCTION_FRYING');
        }
      }

      await supabaseAdmin.from('production_frying_batches').delete().eq('id', batchId);
    } catch (err) {
      console.warn('deleteFryingBatch db error:', err);
    }

    memoryFryingBatches = memoryFryingBatches.filter(b => b.id !== batchId);

    await logAuditEvent({
      action: 'DELETE',
      entityType: 'production_frying_batch',
      entityId: batchId,
      userId: session.user.id,
      details: { note: 'Batch wajan dibatalkan dan stok bahan dikembalikan' },
    });

    revalidatePath('/production');
    revalidatePath('/inventory');
    return { success: true };
  } catch (err: any) {
    console.error('deleteFryingBatch error:', err);
    return { success: false, error: err.message || 'Gagal menghapus batch goreng' };
  }
}

export async function getFryingBatchesByOrder(orderId: string): Promise<{
  success: boolean;
  data?: DbFryingBatch[];
  error?: string;
}> {
  try {
    await requireAuth(['PRODUCTION', 'QC', 'WAREHOUSE', 'SUPER_ADMIN', 'MANAGEMENT', 'PREMIX']);

    const { data, error } = await supabaseAdmin
      .from('production_frying_batches')
      .select('*, operator:users!production_frying_batches_operator_id_fkey(id, name)')
      .eq('production_order_id', orderId)
      .order('wajan_number', { ascending: true });

    if (error) {
      const fallback = memoryFryingBatches.filter(b => b.production_order_id === orderId);
      return { success: true, data: fallback };
    }
    return { success: true, data: data || [] };
  } catch (err: any) {
    console.error('getFryingBatchesByOrder error:', err);
    return { success: true, data: memoryFryingBatches.filter(b => b.production_order_id === orderId) };
  }
}

export async function getAllFryingBatches(): Promise<{
  success: boolean;
  data?: DbFryingBatch[];
  error?: string;
}> {
  try {
    await requireAuth(['PRODUCTION', 'QC', 'WAREHOUSE', 'SUPER_ADMIN', 'MANAGEMENT', 'PREMIX']);

    const { data, error } = await supabaseAdmin
      .from('production_frying_batches')
      .select('*, operator:users!production_frying_batches_operator_id_fkey(id, name)')
      .order('created_at', { ascending: false })
      .limit(200);

    const rawList = (!error && data && data.length > 0) ? data : memoryFryingBatches;
    const seenMap = new Map<string, DbFryingBatch>();
    for (const b of rawList) {
      const key = b.production_order_id ? `${b.production_order_id}_${b.wajan_number}` : b.id;
      if (!seenMap.has(key)) {
        seenMap.set(key, b);
      }
    }
    return { success: true, data: Array.from(seenMap.values()) };
  } catch (err: any) {
    console.error('getAllFryingBatches error:', err);
    const seenMap = new Map<string, DbFryingBatch>();
    for (const b of memoryFryingBatches) {
      const key = b.production_order_id ? `${b.production_order_id}_${b.wajan_number}` : b.id;
      if (!seenMap.has(key)) {
        seenMap.set(key, b);
      }
    }
    return { success: true, data: Array.from(seenMap.values()) };
  }
}

// ─────────────────────────────────────────────
// PACKING ENTRY CRUD
// ─────────────────────────────────────────────

export interface CreatePackingEntryInput {
  frying_batch_id?: string;
  production_order_id: string;
  flavor_variant: string;
  longsong_number: number;
  longsong_weight_gram?: number;
  packaged_toples_count: number;
  packaging_type?: string;
  packaging_weight_gram?: string;
  seasoning_used_gram: number;
  longsongs_used_count?: number;
  defect_packaging_count?: number;
  notes?: string;
  is_packed?: boolean;
}

/**
 * In-memory store untuk stok produk jadi hasil packing
 * Memastikan modul Sales & Order dapat membaca real-time bahkan jika ada kendala database
 */
export interface MemoryFinishedGoodsStockItem {
  id: string;
  product_id: string;
  product_name: string;
  sku: string;
  flavor: string;
  weight: string;
  packaging_type: string;
  quantity: number;
  batch_number: string;
  last_updated_at: string;
}

let memoryFinishedGoodsStock: Record<string, MemoryFinishedGoodsStockItem> = {};

export async function getMemoryPackedStock(): Promise<MemoryFinishedGoodsStockItem[]> {
  return Object.values(memoryFinishedGoodsStock);
}

export async function deductMemoryPackedStock(productId: string, quantity: number): Promise<void> {
  for (const key of Object.keys(memoryFinishedGoodsStock)) {
    if (memoryFinishedGoodsStock[key].product_id === productId) {
      memoryFinishedGoodsStock[key].quantity = Math.max(
        0,
        memoryFinishedGoodsStock[key].quantity - Number(quantity)
      );
    }
  }
}

export async function syncPackedGoodsToSalesInventory(
  entry: {
    id: string;
    production_order_id: string;
    flavor_variant: string;
    packaging_weight_gram?: string | null;
    packaging_type?: string | null;
    packaged_toples_count: number;
  },
  userId?: string
): Promise<{ success: boolean; product_id?: string; product_name?: string }> {
  try {
    const flavor = entry.flavor_variant || 'Original';
    const weight = entry.packaging_weight_gram || '100g';
    const pkgType = entry.packaging_type || 'Standing Pouch';
    const count = Math.max(0, Number(entry.packaged_toples_count) || 0);

    if (count <= 0) return { success: false };

    // 1. Ambil nomor batch SPK untuk ketertelusuran
    let batchNumber = 'PRD';
    try {
      const { data: order } = await supabaseAdmin
        .from('production_orders')
        .select('batch_number')
        .eq('id', entry.production_order_id)
        .maybeSingle();

      if (order?.batch_number) {
        batchNumber = order.batch_number;
      }
    } catch {
      // ignore
    }

    // 2. Cari produk yang cocok di tabel products
    let matchedProduct: any = null;
    try {
      const { data: prods } = await supabaseAdmin.from('products').select('*').is('deleted_at', null);
      if (prods && prods.length > 0) {
        // Coba cari nama produk yang memuat nama rasa dan berat
        matchedProduct = prods.find((p: any) => {
          const n = p.name.toLowerCase();
          return n.includes(flavor.toLowerCase()) && n.includes(weight.toLowerCase());
        });
        // Jika belum cocok, cari berdasarkan rasa
        if (!matchedProduct) {
          matchedProduct = prods.find((p: any) => p.name.toLowerCase().includes(flavor.toLowerCase()));
        }
      }
    } catch (err) {
      console.warn('Could not query products table:', err);
    }

    // 3. Jika belum terdaftar di master produk, buat produk baru
    if (!matchedProduct) {
      const cleanWeight = weight.replace(/\D/g, '') || '100';
      const flavorCode = flavor.slice(0, 3).toUpperCase();
      const typeCode = pkgType.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase();
      const sku = `FG-KHK-${flavorCode}-${cleanWeight}G-${typeCode || 'PK'}`;
      const name = `Jamur Crispy ${flavor} ${weight} (${pkgType})`;

      try {
        const { data: newProd } = await supabaseAdmin
          .from('products')
          .insert({
            sku,
            name,
            description: `KhumKhum Jamur Crispy ${flavor} kemasan ${pkgType} ${weight}`,
          })
          .select()
          .single();

        if (newProd) matchedProduct = newProd;
      } catch (insertErr) {
        console.warn('Failed to insert new product in Supabase:', insertErr);
        matchedProduct = {
          id: 'prod-' + flavorCode.toLowerCase() + '-' + cleanWeight,
          sku,
          name,
        };
      }
    }

    const productId = matchedProduct?.id || '22222222-0000-0000-0000-000000000001';
    const productName = matchedProduct?.name || `Jamur Crispy ${flavor} ${weight}`;
    const productSku = matchedProduct?.sku || 'FG-KHK-ORIG-100G';

    // 4. Update in-memory fallback store
    const memKey = `${productId}_${flavor}_${weight}_${pkgType}`;
    const prevMemQty = memoryFinishedGoodsStock[memKey]?.quantity || 0;
    memoryFinishedGoodsStock[memKey] = {
      id: memKey,
      product_id: productId,
      product_name: productName,
      sku: productSku,
      flavor,
      weight,
      packaging_type: pkgType,
      quantity: prevMemQty + count,
      batch_number: batchNumber,
      last_updated_at: new Date().toISOString(),
    };

    // 5. Update / Insert ke tabel inventory Supabase
    try {
      let fgWarehouseId = '44444444-0000-0000-0000-000000000002'; // default Gudang Produk Jadi
      const { data: whs } = await supabaseAdmin.from('warehouses').select('id, name');
      const foundWh = (whs || []).find((w: any) =>
        w.name.toLowerCase().includes('produk jadi') || w.name.toLowerCase().includes('siap jual')
      );
      if (foundWh?.id) fgWarehouseId = foundWh.id;

      const { data: existingInv } = await supabaseAdmin
        .from('inventory')
        .select('*')
        .eq('item_type', 'PRODUCT')
        .eq('item_id', productId)
        .limit(1);

      let inventoryId = '';
      const now = new Date().toISOString();

      if (existingInv && existingInv.length > 0) {
        const inv = existingInv[0];
        inventoryId = inv.id;
        const newQty = Number(inv.quantity || 0) + count;
        await supabaseAdmin
          .from('inventory')
          .update({
            quantity: newQty,
            batch_number: batchNumber,
            last_updated_at: now,
          })
          .eq('id', inv.id);
      } else {
        const { data: newInv } = await supabaseAdmin
          .from('inventory')
          .insert({
            warehouse_id: fgWarehouseId,
            item_type: 'PRODUCT',
            item_id: productId,
            batch_number: batchNumber,
            quantity: count,
            reorder_point: 50,
            lead_time_days: 0,
            last_updated_at: now,
          })
          .select('id')
          .single();
        inventoryId = newInv?.id || '';
      }

      // 6. Catat kartu stok masuk di stock_movements
      if (inventoryId) {
        await supabaseAdmin.from('stock_movements').insert({
          inventory_id: inventoryId,
          movement_type: 'IN',
          quantity: count,
          reference_id: entry.id,
          reference_type: 'PRODUCTION_PACKING',
          notes: `Hasil Packing Siap Jual: ${count} pcs ${productName} dari SPK ${batchNumber}`,
          movement_date: now,
          created_by: userId || null,
        });
      }
    } catch (dbErr) {
      console.warn('Database sync for inventory/stock_movements skipped or failed:', dbErr);
    }

    revalidatePath('/sales');
    revalidatePath('/inventory');
    return { success: true, product_id: productId, product_name: productName };
  } catch (err: any) {
    console.error('syncPackedGoodsToSalesInventory error:', err);
    return { success: false };
  }
}

export async function createPackingEntry(input: CreatePackingEntryInput): Promise<{
  success: boolean;
  data?: DbPackingEntry;
  error?: string;
}> {
  try {
    const { user } = await requireAuth(['PRODUCTION', 'SUPER_ADMIN', 'PREMIX', 'WAREHOUSE', 'QC', 'MANAGEMENT']);

    let createdPacking: DbPackingEntry | undefined;
    const isPacked = input.is_packed !== undefined ? input.is_packed : true;
    const packedAt = isPacked ? new Date().toISOString() : null;
    const packagingType = input.packaging_type || 'Standing Pouch';
    const cleanFryingBatchId = isValidUuid(input.frying_batch_id) ? input.frying_batch_id!.trim() : null;
    const isOrderUuid = isValidUuid(input.production_order_id);

    if (isOrderUuid) {
      const { data, error } = await supabaseAdmin
        .from('production_packing_entries')
        .insert({
          frying_batch_id: cleanFryingBatchId,
          production_order_id: input.production_order_id,
          flavor_variant: input.flavor_variant,
          longsong_number: input.longsong_number,
          longsong_weight_gram: input.longsong_weight_gram || null,
          packaged_toples_count: input.packaged_toples_count,
          packaging_type: packagingType,
          packaging_weight_gram: input.packaging_weight_gram || '100g',
          seasoning_used_gram: input.seasoning_used_gram,
          is_packed: isPacked,
          packed_at: packedAt,
          notes: input.notes || null,
        })
        .select()
        .single();

      if (error) {
        console.warn('Fallback memory for createPackingEntry:', error.message);
      } else {
        createdPacking = data;
      }
    }

    if (!createdPacking) {
      const fallbackItem: DbPackingEntry = {
        id: 'pk-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
        frying_batch_id: cleanFryingBatchId,
        production_order_id: input.production_order_id,
        flavor_variant: input.flavor_variant,
        longsong_number: input.longsong_number,
        longsong_weight_gram: input.longsong_weight_gram || null,
        packaged_toples_count: input.packaged_toples_count,
        packaging_type: packagingType,
        packaging_weight_gram: input.packaging_weight_gram || '100g',
        seasoning_used_gram: input.seasoning_used_gram,
        is_packed: isPacked,
        packed_at: packedAt,
        notes: input.notes || null,
        created_at: new Date().toISOString(),
      };
      const current = await getPersistedPackingEntries();
      const updated = [fallbackItem, ...current.filter(p => p.id !== fallbackItem.id)];
      await savePersistedPackingEntries(updated);
      memoryPackingEntries = updated;
      createdPacking = fallbackItem;
    }

    // ── Update Progres & Status di Production Order ──
    try {
      let totalPackagedPcs = Number(input.packaged_toples_count) || 0;
      if (isOrderUuid) {
        const { data: allPackings } = await supabaseAdmin
          .from('production_packing_entries')
          .select('packaged_toples_count, is_packed')
          .eq('production_order_id', input.production_order_id);
        if (allPackings && allPackings.length > 0) {
          totalPackagedPcs = allPackings.reduce((sum, p) => sum + (p.is_packed ? (Number(p.packaged_toples_count) || 0) : 0), 0);
        }
      }
      const memPcs = memoryPackingEntries
        .filter(p => p.production_order_id === input.production_order_id && p.is_packed && p.id !== createdPacking?.id)
        .reduce((sum, p) => sum + (Number(p.packaged_toples_count) || 0), 0);
      totalPackagedPcs += memPcs;

      if (isOrderUuid) {
        const { data: currOrder } = await supabaseAdmin
          .from('production_orders')
          .select('id, status, target_quantity')
          .eq('id', input.production_order_id)
          .maybeSingle();

        if (currOrder) {
          const isTargetReached = totalPackagedPcs >= (currOrder.target_quantity || 0);
          const nextStatus = isTargetReached
            ? 'COMPLETED'
            : (currOrder.status === 'DRAFT' ? 'IN_PROGRESS' : currOrder.status);

          await supabaseAdmin
            .from('production_orders')
            .update({
              status: nextStatus,
              updated_at: new Date().toISOString(),
            })
            .eq('id', input.production_order_id);

          await supabaseAdmin
            .from('production_results')
            .update({
              finished_goods_quantity: totalPackagedPcs,
            })
            .eq('production_order_id', input.production_order_id);
        }
      }

      // Memory fallback update
      const memOrderIdx = memoryProductionOrders.findIndex(o => o.id === input.production_order_id);
      if (memOrderIdx !== -1) {
        const o = memoryProductionOrders[memOrderIdx];
        const isTargetReached = totalPackagedPcs >= (o.target_quantity || 0);
        memoryProductionOrders[memOrderIdx] = {
          ...o,
          status: isTargetReached ? 'COMPLETED' : (o.status === 'DRAFT' ? 'IN_PROGRESS' : o.status),
          target_quantity: o.target_quantity,
        };
      }
    } catch (orderUpdateErr) {
      console.warn('Could not update order status/progress on packing:', orderUpdateErr);
    }

    // ── Potong Bahan Kemasan & Bumbu Tabur (Stok Produk Jadi menunggu Uji Mutu QC) ──
    if (isPacked && createdPacking) {
      // NOTE: Produk jadi TIDAK langsung masuk ke stok Siap Jual toko di sini!
      // Status kemasan adalah Karantina Produksi & BARU DISINKRONKAN ke Stok Siap Jual
      // saat tim Quality Control (QC) memutuskan RELEASED (Lolos Mutu) di src/actions/qc.ts.
      await deductPackingMaterials(createdPacking.id, input, user.userId);
    }

    await logAuditEvent({
      userId: user.userId,
      action: 'CREATE',
      entityType: 'production_packing_entry',
      entityId: createdPacking.id,
      details: {
        production_order_id: input.production_order_id,
        longsong_number: input.longsong_number,
        flavor_variant: input.flavor_variant,
        packaged_toples_count: input.packaged_toples_count,
        packaging_type: packagingType,
      },
    });

    revalidatePath('/production');
    revalidatePath('/sales');
    revalidatePath('/inventory');
    revalidatePath('/quality-control');
    return { success: true, data: createdPacking };
  } catch (err: any) {
    console.error('createPackingEntry error:', err);
    return { success: false, error: err.message || 'Gagal membuat entri packing' };
  }
}

export async function markLongsongPacked(packingEntryId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await requireAuth(['PRODUCTION', 'SUPER_ADMIN', 'PREMIX', 'WAREHOUSE', 'QC']);

    const isEntryUuid = isValidUuid(packingEntryId);
    let targetPacking: DbPackingEntry | undefined;

    if (isEntryUuid) {
      const { data, error } = await supabaseAdmin
        .from('production_packing_entries')
        .update({
          is_packed: true,
          packed_at: new Date().toISOString(),
        })
        .eq('id', packingEntryId)
        .select('*')
        .single();

      if (!error && data) {
        targetPacking = data;
      }
    }

    if (!targetPacking) {
      const idx = memoryPackingEntries.findIndex(p => p.id === packingEntryId);
      if (idx !== -1) {
        memoryPackingEntries[idx] = {
          ...memoryPackingEntries[idx],
          is_packed: true,
          packed_at: new Date().toISOString(),
        };
        targetPacking = memoryPackingEntries[idx];
        await savePersistedPackingEntries(memoryPackingEntries);
      }
    }

    // ── Sinkronisasi ke Stok Produk Jadi & Sales & Potong Bahan Kemasan/Bumbu ──
    if (targetPacking) {
      await syncPackedGoodsToSalesInventory(targetPacking, session.user.userId);
      await deductPackingMaterials(packingEntryId, targetPacking as any, session.user.userId);
    }

    await logAuditEvent({
      action: 'UPDATE',
      entityType: 'production_packing_entry',
      entityId: packingEntryId,
      userId: session.user.userId,
      details: { status: 'PACKED', packed_at: new Date().toISOString() },
    });

    revalidatePath('/production');
    revalidatePath('/sales');
    revalidatePath('/inventory');
    return { success: true };
  } catch (err: any) {
    console.error('markLongsongPacked error:', err);
    return { success: false, error: err.message };
  }
}

export interface UpdatePackingEntryInput {
  flavor_variant?: string;
  longsong_weight_gram?: number;
  packaged_toples_count?: number;
  packaging_type?: string;
  packaging_weight_gram?: string;
  seasoning_used_gram?: number;
  defect_packaging_count?: number;
  notes?: string;
}

export async function deletePackingEntry(packingEntryId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await requireAuth(['PRODUCTION', 'SUPER_ADMIN', 'PREMIX']);

    const isEntryUuid = isValidUuid(packingEntryId);
    let targetEntry: DbPackingEntry | undefined;

    if (isEntryUuid) {
      const { data } = await supabaseAdmin
        .from('production_packing_entries')
        .select('*')
        .eq('id', packingEntryId)
        .maybeSingle();
      if (data) targetEntry = data;
    }

    if (!targetEntry) {
      targetEntry = memoryPackingEntries.find(p => p.id === packingEntryId);
    }

    // 1. Revert stock movements (kembalikan stok bumbu tabur & kemasan, kurangi stok produk jadi jika ada)
    if (isEntryUuid) {
      const { data: movements } = await supabaseAdmin
        .from('stock_movements')
        .select('*')
        .eq('reference_id', packingEntryId);

      if (movements && movements.length > 0) {
        for (const mov of movements) {
          if (mov.inventory_id && mov.quantity > 0) {
            const { data: inv } = await supabaseAdmin
              .from('inventory')
              .select('id, quantity')
              .eq('id', mov.inventory_id)
              .maybeSingle();

            if (inv) {
              const currentQty = Number(inv.quantity) || 0;
              const newQty = mov.movement_type === 'OUT'
                ? currentQty + Number(mov.quantity)
                : Math.max(0, currentQty - Number(mov.quantity));

              await supabaseAdmin
                .from('inventory')
                .update({ quantity: newQty, last_updated_at: new Date().toISOString() })
                .eq('id', inv.id);
            }
          }
        }

        await supabaseAdmin
          .from('stock_movements')
          .delete()
          .eq('reference_id', packingEntryId);
      }

      await supabaseAdmin
        .from('production_packing_entries')
        .delete()
        .eq('id', packingEntryId);
    }

    // 2. Remove from memory store & persistence
    memoryPackingEntries = memoryPackingEntries.filter(p => p.id !== packingEntryId);
    const currentPersisted = await getPersistedPackingEntries();
    await savePersistedPackingEntries(currentPersisted.filter(p => p.id !== packingEntryId));

    // 3. Recalculate production_orders progress
    if (targetEntry?.production_order_id) {
      const orderId = targetEntry.production_order_id;
      if (isValidUuid(orderId)) {
        const { data: remainingEntries } = await supabaseAdmin
          .from('production_packing_entries')
          .select('packaged_toples_count, is_packed')
          .eq('production_order_id', orderId);

        let totalPcs = (remainingEntries || [])
          .filter(e => e.is_packed)
          .reduce((sum, e) => sum + (Number(e.packaged_toples_count) || 0), 0);

        const memPcs = memoryPackingEntries
          .filter(p => p.production_order_id === orderId && p.is_packed)
          .reduce((sum, p) => sum + (Number(p.packaged_toples_count) || 0), 0);
        totalPcs += memPcs;

        await supabaseAdmin
          .from('production_orders')
          .update({
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderId);

        await supabaseAdmin
          .from('production_results')
          .update({
            finished_goods_quantity: totalPcs,
          })
          .eq('production_order_id', orderId);
      }
    }

    // 4. Log audit event
    await logAuditEvent({
      action: 'DELETE',
      entityType: 'production_packing_entry',
      entityId: packingEntryId,
      userId: (session.user as any).userId || session.user.id,
      details: {
        note: `Entri packing longsong #${targetEntry?.longsong_number || ''} dibatalkan dan stok dikembalikan`,
        flavor_variant: targetEntry?.flavor_variant,
        packaged_toples_count: targetEntry?.packaged_toples_count,
      },
    });

    revalidatePath('/production');
    revalidatePath('/sales');
    revalidatePath('/inventory');
    revalidatePath('/quality-control');
    return { success: true };
  } catch (err: any) {
    console.error('deletePackingEntry error:', err);
    return { success: false, error: err.message || 'Gagal menghapus entri packing' };
  }
}

export async function updatePackingEntry(
  packingEntryId: string,
  input: UpdatePackingEntryInput
): Promise<{
  success: boolean;
  data?: DbPackingEntry;
  error?: string;
}> {
  try {
    const session = await requireAuth(['PRODUCTION', 'SUPER_ADMIN', 'PREMIX']);

    const isEntryUuid = isValidUuid(packingEntryId);
    let existingEntry: DbPackingEntry | undefined;

    if (isEntryUuid) {
      const { data } = await supabaseAdmin
        .from('production_packing_entries')
        .select('*')
        .eq('id', packingEntryId)
        .maybeSingle();
      if (data) existingEntry = data;
    }

    if (!existingEntry) {
      existingEntry = memoryPackingEntries.find(p => p.id === packingEntryId);
    }

    if (!existingEntry) {
      return { success: false, error: 'Entri packing tidak ditemukan' };
    }

    const nextFlavor = input.flavor_variant ?? existingEntry.flavor_variant;
    const nextPkgType = input.packaging_type ?? (existingEntry.packaging_type || 'Standing Pouch');
    const nextWeightGram = input.packaging_weight_gram ?? (existingEntry.packaging_weight_gram || '100g');
    const nextCount = input.packaged_toples_count !== undefined ? Number(input.packaged_toples_count) : existingEntry.packaged_toples_count;
    const nextSeasoning = input.seasoning_used_gram !== undefined ? Number(input.seasoning_used_gram) : existingEntry.seasoning_used_gram;
    const nextLongsongWeight = input.longsong_weight_gram !== undefined ? Number(input.longsong_weight_gram) : existingEntry.longsong_weight_gram;
    const nextNotes = input.notes !== undefined ? input.notes : existingEntry.notes;

    const hasMaterialChange =
      nextFlavor !== existingEntry.flavor_variant ||
      nextPkgType !== existingEntry.packaging_type ||
      nextWeightGram !== existingEntry.packaging_weight_gram ||
      nextCount !== existingEntry.packaged_toples_count ||
      nextSeasoning !== existingEntry.seasoning_used_gram;

    if (hasMaterialChange && isEntryUuid) {
      // Revert previous stock movements
      const { data: movements } = await supabaseAdmin
        .from('stock_movements')
        .select('*')
        .eq('reference_id', packingEntryId);

      if (movements && movements.length > 0) {
        for (const mov of movements) {
          if (mov.inventory_id && mov.quantity > 0) {
            const { data: inv } = await supabaseAdmin
              .from('inventory')
              .select('id, quantity')
              .eq('id', mov.inventory_id)
              .maybeSingle();

            if (inv) {
              const currentQty = Number(inv.quantity) || 0;
              const restoredQty = mov.movement_type === 'OUT'
                ? currentQty + Number(mov.quantity)
                : Math.max(0, currentQty - Number(mov.quantity));

              await supabaseAdmin
                .from('inventory')
                .update({ quantity: restoredQty, last_updated_at: new Date().toISOString() })
                .eq('id', inv.id);
            }
          }
        }

        await supabaseAdmin
          .from('stock_movements')
          .delete()
          .eq('reference_id', packingEntryId);
      }
    }

    let updatedPacking: DbPackingEntry | undefined;

    if (isEntryUuid) {
      const { data, error } = await supabaseAdmin
        .from('production_packing_entries')
        .update({
          flavor_variant: nextFlavor,
          packaging_type: nextPkgType,
          packaging_weight_gram: nextWeightGram,
          packaged_toples_count: nextCount,
          seasoning_used_gram: nextSeasoning,
          longsong_weight_gram: nextLongsongWeight,
          notes: nextNotes,
        })
        .eq('id', packingEntryId)
        .select('*, frying_batch:production_frying_batches(id, wajan_number, batch_weight_gram), production_order:production_orders(id, batch_number, product_variant)')
        .single();

      if (!error && data) {
        updatedPacking = data;
      }
    }

    if (!updatedPacking) {
      const idx = memoryPackingEntries.findIndex(p => p.id === packingEntryId);
      if (idx !== -1) {
        memoryPackingEntries[idx] = {
          ...memoryPackingEntries[idx],
          flavor_variant: nextFlavor,
          packaging_type: nextPkgType,
          packaging_weight_gram: nextWeightGram,
          packaged_toples_count: nextCount,
          seasoning_used_gram: nextSeasoning,
          longsong_weight_gram: nextLongsongWeight,
          notes: nextNotes,
        };
        updatedPacking = memoryPackingEntries[idx];
        const currentPersisted = await getPersistedPackingEntries();
        const pIdx = currentPersisted.findIndex(p => p.id === packingEntryId);
        if (pIdx !== -1) {
          currentPersisted[pIdx] = updatedPacking;
        } else {
          currentPersisted.unshift(updatedPacking);
        }
        await savePersistedPackingEntries(currentPersisted);
      }
    }

    // Re-deduct bahan jika ada perubahan dan entry is_packed
    if (hasMaterialChange && updatedPacking && updatedPacking.is_packed) {
      await deductPackingMaterials(packingEntryId, {
        production_order_id: updatedPacking.production_order_id,
        flavor_variant: nextFlavor,
        packaged_toples_count: nextCount,
        packaging_type: nextPkgType,
        packaging_weight_gram: nextWeightGram,
        seasoning_used_gram: nextSeasoning,
        longsong_number: updatedPacking.longsong_number,
        defect_packaging_count: input.defect_packaging_count || 0,
      }, (session.user as any).userId || session.user.id);
    }

    // Update order progress / results
    if (updatedPacking?.production_order_id && isValidUuid(updatedPacking.production_order_id)) {
      const orderId = updatedPacking.production_order_id;
      const { data: allPackings } = await supabaseAdmin
        .from('production_packing_entries')
        .select('packaged_toples_count, is_packed')
        .eq('production_order_id', orderId);

      const totalPcs = (allPackings || [])
        .filter(p => p.is_packed)
        .reduce((sum, p) => sum + (Number(p.packaged_toples_count) || 0), 0);

      await supabaseAdmin
        .from('production_orders')
        .update({
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      await supabaseAdmin
        .from('production_results')
        .update({
          finished_goods_quantity: totalPcs,
        })
        .eq('production_order_id', orderId);
    }

    await logAuditEvent({
      action: 'UPDATE',
      entityType: 'production_packing_entry',
      entityId: packingEntryId,
      userId: (session.user as any).userId || session.user.id,
      details: {
        changes: {
          flavor_variant: nextFlavor,
          packaged_toples_count: nextCount,
          packaging_type: nextPkgType,
          seasoning_used_gram: nextSeasoning,
        },
      },
    });

    revalidatePath('/production');
    revalidatePath('/sales');
    revalidatePath('/inventory');
    revalidatePath('/quality-control');
    return { success: true, data: updatedPacking };
  } catch (err: any) {
    console.error('updatePackingEntry error:', err);
    return { success: false, error: err.message || 'Gagal mengubah entri packing' };
  }
}

export async function getPackingEntriesByOrder(orderId: string): Promise<{
  success: boolean;
  data?: DbPackingEntry[];
  error?: string;
}> {
  try {
    await requireAuth(['PRODUCTION', 'QC', 'WAREHOUSE', 'SUPER_ADMIN', 'MANAGEMENT', 'PREMIX']);

    if (isValidUuid(orderId)) {
      const { data, error } = await supabaseAdmin
        .from('production_packing_entries')
        .select('*, frying_batch:production_frying_batches(id, wajan_number, batch_weight_gram)')
        .eq('production_order_id', orderId)
        .order('longsong_number', { ascending: true });

      if (!error && data) {
        return { success: true, data };
      }
    }

    const all = await getMemoryPackingEntries();
    return { success: true, data: all.filter(p => p.production_order_id === orderId) };
  } catch (err: any) {
    console.error('getPackingEntriesByOrder error:', err);
    const all = await getMemoryPackingEntries();
    return { success: true, data: all.filter(p => p.production_order_id === orderId) };
  }
}

export async function getAllPackingEntries(): Promise<{
  success: boolean;
  data?: DbPackingEntry[];
  error?: string;
}> {
  try {
    await requireAuth(['PRODUCTION', 'QC', 'WAREHOUSE', 'SUPER_ADMIN', 'MANAGEMENT', 'PREMIX']);

    const { data, error } = await supabaseAdmin
      .from('production_packing_entries')
      .select('*, frying_batch:production_frying_batches(id, wajan_number, batch_weight_gram), production_order:production_orders(id, batch_number, product_variant)')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      const persisted = await getPersistedPackingEntries();
      if (persisted.length > 0) {
        memoryPackingEntries = persisted;
        return { success: true, data: persisted };
      }
      return { success: true, data: memoryPackingEntries };
    }
    return { success: true, data: data || [] };
  } catch (err: any) {
    console.error('getAllPackingEntries error:', err);
    const persisted = await getPersistedPackingEntries();
    return { success: true, data: persisted.length > 0 ? persisted : memoryPackingEntries };
  }
}

export async function getUnpackedLongsongReminder(): Promise<{
  success: boolean;
  data?: DbPackingEntry[];
  count?: number;
  error?: string;
}> {
  try {
    await requireAuth(['PRODUCTION', 'SUPER_ADMIN', 'MANAGEMENT', 'PREMIX']);

    const { data, error, count } = await supabaseAdmin
      .from('production_packing_entries')
      .select('*, frying_batch:production_frying_batches(id, wajan_number, batch_weight_gram)', { count: 'exact' })
      .eq('is_packed', false)
      .order('created_at', { ascending: true });

    if (error) {
      const unpacked = memoryPackingEntries.filter(p => !p.is_packed);
      return { success: true, data: unpacked, count: unpacked.length };
    }
    return { success: true, data: data || [], count: count || 0 };
  } catch (err: any) {
    console.error('getUnpackedLongsongReminder error:', err);
    const unpacked = memoryPackingEntries.filter(p => !p.is_packed);
    return { success: true, data: unpacked, count: unpacked.length };
  }
}

export async function submitBatchToQc(
  productionOrderId: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireAuth(['PRODUCTION', 'SUPER_ADMIN', 'PREMIX', 'QC', 'WAREHOUSE']);
    const now = new Date().toISOString();

    const isOrderUuid = isValidUuid(productionOrderId);
    let order: any = null;

    if (isOrderUuid) {
      const { data, error: orderErr } = await supabaseAdmin
        .from('production_orders')
        .select('id, batch_number, status, notes')
        .eq('id', productionOrderId)
        .maybeSingle();
      if (!orderErr && data) {
        order = data;
      }
    }

    if (!order) {
      order = memoryProductionOrders.find(o => o.id === productionOrderId);
    }

    if (!order) {
      return { success: false, error: 'SPK Produksi tidak ditemukan' };
    }

    const appendNote = notes ? `[Pengajuan QC: ${notes}]` : '[Diajukan ke QC]';
    const updatedNotes = order.notes ? `${order.notes} | ${appendNote}` : appendNote;

    if (isOrderUuid) {
      const { error: updateErr } = await supabaseAdmin
        .from('production_orders')
        .update({
          status: 'QC_PENDING',
          notes: updatedNotes,
          updated_at: now,
        })
        .eq('id', productionOrderId);

      if (updateErr) {
        console.warn('submitBatchToQc DB update error:', updateErr.message);
      }
    }

    const memIdx = memoryProductionOrders.findIndex(o => o.id === productionOrderId);
    if (memIdx !== -1) {
      memoryProductionOrders[memIdx] = {
        ...memoryProductionOrders[memIdx],
        status: 'QC_PENDING',
        notes: updatedNotes,
        updated_at: now,
      };
    }

    await logAuditEvent({
      action: 'UPDATE',
      entityType: 'production_order',
      entityId: productionOrderId,
      userId: session.user.userId,
      details: {
        status: 'QC_PENDING',
        batch_number: order.batch_number,
        notes: notes || 'Batch packing diajukan ke antrean QC untuk uji mutu',
      },
    });

    revalidatePath('/production');
    revalidatePath('/quality-control');
    return { success: true };
  } catch (err: any) {
    console.error('submitBatchToQc error:', err);
    return { success: false, error: err.message || 'Gagal mengajukan SPK ke antrean QC' };
  }
}

export async function removeMemoryPackedStockByBatch(batchNumber: string): Promise<void> {
  for (const key of Object.keys(memoryFinishedGoodsStock)) {
    if (memoryFinishedGoodsStock[key].batch_number === batchNumber) {
      delete memoryFinishedGoodsStock[key];
    }
  }
}

// ─────────────────────────────────────────────
// TIME STUDY (STOPWATCH)
// ─────────────────────────────────────────────

export async function recordTimeStudySample(input: {
  production_order_id: string;
  stage: 'FRYING' | 'PACKING';
  sample_number: number;
  started_at: string;
  finished_at: string;
  duration_seconds: number;
  notes?: string;
}): Promise<{
  success: boolean;
  data?: DbTimeStudySample;
  error?: string;
}> {
  try {
    const session = await requireAuth(['PRODUCTION', 'SUPER_ADMIN']);

    let createdSample: DbTimeStudySample | undefined;

    const { data, error } = await supabaseAdmin
      .from('time_study_samples')
      .insert({
        production_order_id: input.production_order_id,
        stage: input.stage,
        sample_number: input.sample_number,
        started_at: input.started_at,
        finished_at: input.finished_at,
        duration_seconds: input.duration_seconds,
        operator_id: session.user.id,
        notes: input.notes,
      })
      .select()
      .single();

    if (error) {
      console.warn('Fallback memory for recordTimeStudySample:', error.message);
      const fallbackItem: DbTimeStudySample = {
        id: 'ts-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
        production_order_id: input.production_order_id,
        stage: input.stage,
        sample_number: input.sample_number,
        started_at: input.started_at,
        finished_at: input.finished_at,
        duration_seconds: input.duration_seconds,
        operator_id: session.user.id,
        notes: input.notes || null,
        created_at: new Date().toISOString(),
        operator: { id: session.user.id, name: session.user.name || 'Operator Produksi' },
      };
      memoryTimeStudySamples.push(fallbackItem);
      createdSample = fallbackItem;
    } else {
      createdSample = data;
    }

    await logAuditEvent({
      userId: session.user.userId,
      action: 'CREATE',
      entityType: 'time_study_sample',
      entityId: createdSample?.id,
      details: {
        production_order_id: input.production_order_id,
        stage: input.stage,
        duration_seconds: input.duration_seconds,
        sample_number: input.sample_number,
      },
    });

    revalidatePath('/production');
    return { success: true, data: createdSample };
  } catch (err: any) {
    console.error('recordTimeStudySample error:', err);
    return { success: false, error: err.message || 'Gagal mencatat sample time study' };
  }
}

export async function getTimeStudySamples(orderId: string, stage?: 'FRYING' | 'PACKING'): Promise<{
  success: boolean;
  data?: DbTimeStudySample[];
  error?: string;
}> {
  try {
    await requireAuth(['PRODUCTION', 'QC', 'SUPER_ADMIN', 'MANAGEMENT']);

    let query = supabaseAdmin
      .from('time_study_samples')
      .select('*, operator:users!time_study_samples_operator_id_fkey(id, name)')
      .eq('production_order_id', orderId)
      .order('sample_number', { ascending: true });

    if (stage) {
      query = query.eq('stage', stage);
    }

    const { data, error } = await query;
    if (error) {
      let filtered = memoryTimeStudySamples.filter(s => s.production_order_id === orderId);
      if (stage) {
        filtered = filtered.filter(s => s.stage === stage);
      }
      return { success: true, data: filtered };
    }
    return { success: true, data: data || [] };
  } catch (err: any) {
    console.error('getTimeStudySamples error:', err);
    let filtered = memoryTimeStudySamples.filter(s => s.production_order_id === orderId);
    if (stage) {
      filtered = filtered.filter(s => s.stage === stage);
    }
    return { success: true, data: filtered };
  }
}

export async function deleteTimeStudySample(sampleId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await requireAuth(['PRODUCTION', 'SUPER_ADMIN']);

    const { error } = await supabaseAdmin
      .from('time_study_samples')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', sampleId);

    if (error) {
      memoryTimeStudySamples = memoryTimeStudySamples.filter(s => s.id !== sampleId);
    }

    await logAuditEvent({
      userId: session.user.userId,
      action: 'DELETE',
      entityType: 'time_study_sample',
      entityId: sampleId,
    });

    revalidatePath('/production');
    return { success: true };
  } catch (err: any) {
    console.error('deleteTimeStudySample error:', err);
    memoryTimeStudySamples = memoryTimeStudySamples.filter(s => s.id !== sampleId);
    return { success: true };
  }
}

export async function calculateAndSaveStandardTime(input: {
  production_order_id: string;
  rating_factor: number;
  allowance_factor: number;
}): Promise<{
  success: boolean;
  cycle_time_avg?: number;
  normal_time?: number;
  standard_time?: number;
  error?: string;
}> {
  try {
    await requireAuth(['PRODUCTION', 'SUPER_ADMIN']);

    // Get all samples (either Supabase or memory fallback)
    let samples: { duration_seconds: number | null }[] = [];
    const { data, error } = await supabaseAdmin
      .from('time_study_samples')
      .select('duration_seconds')
      .eq('production_order_id', input.production_order_id)
      .not('duration_seconds', 'is', null);

    if (error || !data || data.length === 0) {
      samples = memoryTimeStudySamples
        .filter(s => s.production_order_id === input.production_order_id && s.duration_seconds != null)
        .map(s => ({ duration_seconds: s.duration_seconds || null }));
    } else {
      samples = data;
    }

    if (samples.length < 10) {
      return { success: false, error: `Minimal 10 sample dibutuhkan. Saat ini hanya ${samples.length} sample.` };
    }

    // Calculate cycle time (average)
    const totalDuration = samples.reduce((s, sam) => s + Number(sam.duration_seconds || 0), 0);
    const cycleTimeAvg = totalDuration / samples.length;

    // Normal Time = Cycle Time × Rating Factor
    const normalTime = cycleTimeAvg * input.rating_factor;

    // Standard Time = Normal Time × (1 + Allowance Factor)
    const standardTime = normalTime * (1 + input.allowance_factor);

    // Save to production_orders
    try {
      await supabaseAdmin
        .from('production_orders')
        .update({
          cycle_time_avg_seconds: Number(cycleTimeAvg.toFixed(2)),
          normal_time_seconds: Number(normalTime.toFixed(2)),
          standard_time_seconds: Number(standardTime.toFixed(2)),
          rating_factor: input.rating_factor,
          allowance_factor: input.allowance_factor,
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.production_order_id);
    } catch (_) {}

    const session = await requireAuth(['PRODUCTION', 'SUPER_ADMIN']);
    await logAuditEvent({
      userId: session.user.userId,
      action: 'UPDATE',
      entityType: 'production_standard_time',
      entityId: input.production_order_id,
      details: {
        cycle_time_avg: Number(cycleTimeAvg.toFixed(2)),
        normal_time: Number(normalTime.toFixed(2)),
        standard_time: Number(standardTime.toFixed(2)),
        rating_factor: input.rating_factor,
        allowance_factor: input.allowance_factor,
      },
    });

    revalidatePath('/production');
    return {
      success: true,
      cycle_time_avg: Number(cycleTimeAvg.toFixed(2)),
      normal_time: Number(normalTime.toFixed(2)),
      standard_time: Number(standardTime.toFixed(2)),
    };
  } catch (err: any) {
    console.error('calculateAndSaveStandardTime error:', err);
    return { success: false, error: err.message || 'Gagal menghitung waktu baku' };
  }
}

// ─────────────────────────────────────────────
// FRYING & PACKING OVERVIEW METRICS
// ─────────────────────────────────────────────

export async function getFryingPackingMetrics(): Promise<{
  success: boolean;
  data?: {
    activeFryingBatchesToday: number;
    avgYieldToday: number;
    totalOutputGramToday: number;
    totalKremesanGramToday: number;
    unpackedLongsongCount: number;
    packedToplesToday: number;
    totalSeasoningGramToday: number;
  };
  error?: string;
}> {
  try {
    await requireAuth(['PRODUCTION', 'QC', 'WAREHOUSE', 'SUPER_ADMIN', 'MANAGEMENT', 'PREMIX']);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayISO = todayStart.toISOString();

    let activeFrying = 0;
    let totalOutputGram = 0;
    let totalKremesan = 0;
    let avgYield = 0;
    let unpackedCount = 0;
    let packedToples = 0;
    let totalSeasoning = 0;

    // Frying batches today
    try {
      const { data: fryingToday, error: fryingErr } = await supabaseAdmin
        .from('production_frying_batches')
        .select('output_weight_gram, batch_weight_gram, kremesan_weight_gram')
        .gte('created_at', todayISO);

      if (!fryingErr && fryingToday) {
        activeFrying = fryingToday.length;
        totalKremesan = fryingToday.reduce((s, b) => s + (b.kremesan_weight_gram || 0), 0);
        totalOutputGram = fryingToday.reduce((s, b) => s + (b.output_weight_gram || 0), 0);
        const yieldsToday = fryingToday
          .filter(b => b.output_weight_gram && b.batch_weight_gram)
          .map(b => ((b.output_weight_gram || 0) / b.batch_weight_gram) * 100);
        avgYield = yieldsToday.length > 0
          ? Number((yieldsToday.reduce((s, y) => s + y, 0) / yieldsToday.length).toFixed(1))
          : 0;
      } else {
        activeFrying = memoryFryingBatches.length;
        totalKremesan = memoryFryingBatches.reduce((s, b) => s + (b.kremesan_weight_gram || 0), 0);
        totalOutputGram = memoryFryingBatches.reduce((s, b) => s + (b.output_weight_gram || 0), 0);
        const yieldsToday = memoryFryingBatches
          .filter(b => b.output_weight_gram && b.batch_weight_gram)
          .map(b => ((b.output_weight_gram || 0) / b.batch_weight_gram) * 100);
        avgYield = yieldsToday.length > 0
          ? Number((yieldsToday.reduce((s, y) => s + y, 0) / yieldsToday.length).toFixed(1))
          : 0;
      }
    } catch (_) {}

    // Longsong produced across completed frying batches
    // Longsong produced across physical containers or completed frying batches
    let totalLongsongProduced = 0;
    try {
      const { data: containers } = await supabaseAdmin
        .from('production_longsong_containers')
        .select('id, status');

      if (containers && containers.length > 0) {
        unpackedCount = containers.filter(c => c.status === 'AVAILABLE' || c.status === 'PARTIAL').length;
        totalLongsongProduced = containers.length;
      } else if (memoryLongsongContainers.length > 0) {
        unpackedCount = memoryLongsongContainers.filter(c => c.status === 'AVAILABLE' || c.status === 'PARTIAL').length;
        totalLongsongProduced = memoryLongsongContainers.length;
      } else {
        const { data: allBatches, error: bErr } = await supabaseAdmin
          .from('frying_batches')
          .select('longsong_count, finished_at');

        if (!bErr && allBatches) {
          totalLongsongProduced = allBatches
            .filter(b => b.finished_at && Number(b.longsong_count) > 0)
            .reduce((s, b) => s + (Number(b.longsong_count) || 0), 0);
        } else {
          totalLongsongProduced = memoryFryingBatches
            .filter(b => b.finished_at && Number(b.longsong_count) > 0)
            .reduce((s, b) => s + (Number(b.longsong_count) || 0), 0);
        }
      }
    } catch (_) {
      if (memoryLongsongContainers.length > 0) {
        unpackedCount = memoryLongsongContainers.filter(c => c.status === 'AVAILABLE' || c.status === 'PARTIAL').length;
        totalLongsongProduced = memoryLongsongContainers.length;
      }
    }

    // Packing entries & unpacked calculation if not using physical containers
    let totalLongsongPacked = 0;
    try {
      const { data: allPacking, error: packErr } = await supabaseAdmin
        .from('production_packing_entries')
        .select('id, is_packed, packaged_toples_count, seasoning_used_gram, created_at');

      if (!packErr && allPacking) {
        totalLongsongPacked = allPacking.filter(p => p.is_packed).length;

        const packingToday = allPacking.filter(p => p.is_packed && p.created_at && p.created_at >= todayISO);
        packedToples = packingToday.reduce((s, p) => s + (p.packaged_toples_count || 0), 0);
        totalSeasoning = packingToday.reduce((s, p) => s + Number(p.seasoning_used_gram || 0), 0);
      } else {
        totalLongsongPacked = memoryPackingEntries.filter(p => p.is_packed).length;
        const packingToday = memoryPackingEntries.filter(p => p.is_packed && p.created_at && p.created_at >= todayISO);
        packedToples = packingToday.reduce((s, p) => s + (p.packaged_toples_count || 0), 0);
        totalSeasoning = packingToday.reduce((s, p) => s + Number(p.seasoning_used_gram || 0), 0);
      }
    } catch (_) {
      totalLongsongPacked = memoryPackingEntries.filter(p => p.is_packed).length;
      const packingToday = memoryPackingEntries.filter(p => p.is_packed && p.created_at && p.created_at >= todayISO);
      packedToples = packingToday.reduce((s, p) => s + (p.packaged_toples_count || 0), 0);
      totalSeasoning = packingToday.reduce((s, p) => s + Number(p.seasoning_used_gram || 0), 0);
    }

    if (unpackedCount === 0 && (memoryLongsongContainers.length === 0)) {
      unpackedCount = Math.max(0, totalLongsongProduced - totalLongsongPacked);
    }

    return {
      success: true,
      data: {
        activeFryingBatchesToday: activeFrying,
        avgYieldToday: avgYield,
        totalOutputGramToday: totalOutputGram,
        totalKremesanGramToday: totalKremesan,
        unpackedLongsongCount: unpackedCount,
        packedToplesToday: packedToples,
        totalSeasoningGramToday: Number(totalSeasoning.toFixed(1)),
      },
    };
  } catch (err: any) {
    console.error('getFryingPackingMetrics error:', err);
    return { success: false, error: err.message };
  }
}


export interface MixPremixInput {
  premix_item_id: string; // The raw material ID of the Premix being produced
  output_qty: number;
  ingredients: { inventory_id: string, qty: number }[];
  notes?: string;
}

export interface PremixBatchIngredient {
  movement_id: string;
  inventory_id: string;
  item_name: string;
  item_code?: string;
  quantity: number;
  uom: string;
}

export interface PremixBatchSession {
  batch_id: string;
  batch_code: string;
  created_at: string;
  created_by?: string;
  output_item_name: string;
  output_quantity: number;
  output_uom: string;
  notes?: string;
  ingredients: PremixBatchIngredient[];
  total_ingredients_qty: number;
  movement_ids: string[];
}

export async function recordPremixMixing(input: MixPremixInput): Promise<{ success: boolean; error?: string }> {
  try {
    const { user } = await requireAuth(['PRODUCTION', 'SUPER_ADMIN', 'MANAGEMENT', 'PREMIX']);

    if (!input.premix_item_id || input.output_qty <= 0) {
      return { success: false, error: 'Premix dan hasil kuantitas harus diisi (>0)' };
    }

    if (!input.ingredients || input.ingredients.length === 0) {
      return { success: false, error: 'Bahan baku yang dipakai harus diisi' };
    }

    // 1. Validate all ingredients stock first
    for (const ing of input.ingredients) {
      const { data: inv } = await supabaseAdmin
        .from('inventory')
        .select('quantity, item_id, item_type')
        .eq('id', ing.inventory_id)
        .single();
      
      if (!inv || inv.quantity < ing.qty) {
        return { success: false, error: 'Stok bahan baku tidak mencukupi untuk salah satu komponen' };
      }
    }

    // Generate Batch ID and Code
    const batchId = crypto.randomUUID();
    const now = new Date();
    const ymd = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    const batchCode = `PRX-${ymd}-${timeStr}`;

    // 2. Deduct ingredients stock
    for (const ing of input.ingredients) {
      const { data: inv } = await supabaseAdmin
        .from('inventory')
        .select('quantity')
        .eq('id', ing.inventory_id)
        .single();
        
      if (inv) {
        await supabaseAdmin.from('inventory').update({ 
          quantity: inv.quantity - ing.qty,
          last_updated_at: new Date().toISOString()
        }).eq('id', ing.inventory_id);

        await supabaseAdmin.from('stock_movements').insert({
          inventory_id: ing.inventory_id,
          movement_type: 'OUT',
          quantity: ing.qty,
          reference_id: batchId,
          reference_type: 'MIXING_PREMIX',
          movement_date: new Date().toISOString(),
          notes: `[${batchCode}] Terpakai untuk racikan premix ${input.output_qty} kg`,
          created_by: user.userId
        });
      }
    }

    // 3. Add to Premix inventory
    // Find if premix inventory exists
    const { data: existingInv } = await supabaseAdmin
      .from('inventory')
      .select('id, quantity')
      .eq('item_type', 'RAW_MATERIAL')
      .eq('item_id', input.premix_item_id)
      .maybeSingle();

    let invId = '';
    if (existingInv) {
      invId = existingInv.id;
      await supabaseAdmin.from('inventory').update({
        quantity: existingInv.quantity + input.output_qty,
        last_updated_at: new Date().toISOString()
      }).eq('id', invId);
    } else {
      const { data: wh } = await supabaseAdmin.from('warehouses').select('id').limit(1).single();
      const warehouseId = wh?.id;
      
      if (!warehouseId) throw new Error('Warehouse not found');

      const { data: newInv, error: invError } = await supabaseAdmin.from('inventory').insert({
        warehouse_id: warehouseId,
        item_type: 'RAW_MATERIAL',
        item_id: input.premix_item_id,
        quantity: input.output_qty,
        reorder_point: 0
      }).select('id').single();

      if (invError) throw invError;
      invId = newInv.id;
    }

    // 4. Movement for Premix
    await supabaseAdmin.from('stock_movements').insert({
      inventory_id: invId,
      movement_type: 'IN',
      quantity: input.output_qty,
      reference_id: batchId,
      reference_type: 'MIXING_PREMIX',
      movement_date: new Date().toISOString(),
      notes: `[${batchCode}] ${input.notes || 'Hasil Produksi Premix'}`,
      created_by: user.userId
    });
    
    await logAuditEvent({
      userId: user.userId,
      action: 'CREATE',
      entityType: 'premix_batch',
      entityId: batchId,
      details: {
        batch_code: batchCode,
        premix_item_id: input.premix_item_id,
        output_qty: input.output_qty,
        notes: input.notes,
        ingredient_count: input.ingredients?.length,
      },
    });

    revalidatePath('/production');
    revalidatePath('/production/premix');
    revalidatePath('/warehouse');
    revalidatePath('/inventory');

    return { success: true };
  } catch (err: any) {
    console.error('recordPremixMixing error:', err);
    return { success: false, error: err.message };
  }
}

export async function deletePremixBatch(batchId: string, movementIds: string[]): Promise<{ success: boolean; error?: string }> {
  try {
    const { user } = await requireAuth(['PRODUCTION', 'SUPER_ADMIN', 'MANAGEMENT', 'PREMIX']);

    if (!movementIds || movementIds.length === 0) {
      return { success: false, error: 'Daftar transaksi mutasi peracikan tidak valid' };
    }

    // 1. Ambil data movements yang akan dibatalkan
    const { data: movements, error: movErr } = await supabaseAdmin
      .from('stock_movements')
      .select('id, inventory_id, movement_type, quantity, reference_id, notes')
      .in('id', movementIds);

    if (movErr || !movements || movements.length === 0) {
      return { success: false, error: 'Data mutasi tidak ditemukan atau sudah dibatalkan' };
    }

    // 2. Rollback stok inventori
    for (const mov of movements) {
      const { data: inv } = await supabaseAdmin
        .from('inventory')
        .select('id, quantity')
        .eq('id', mov.inventory_id)
        .maybeSingle();

      if (inv) {
        let newQty = inv.quantity;
        if (mov.movement_type === 'IN') {
          // Hasil premix yang bertambah harus dikurangi kembali
          newQty = Math.max(0, inv.quantity - Number(mov.quantity));
        } else if (mov.movement_type === 'OUT') {
          // Bahan baku yang terpakai harus dikembalikan/ditambahkan kembali
          newQty = inv.quantity + Number(mov.quantity);
        }

        await supabaseAdmin.from('inventory').update({
          quantity: newQty,
          last_updated_at: new Date().toISOString(),
        }).eq('id', inv.id);
      }
    }

    // 3. Hapus record mutasi dari stock_movements
    const { error: delErr } = await supabaseAdmin
      .from('stock_movements')
      .delete()
      .in('id', movementIds);

    if (delErr) {
      throw delErr;
    }

    await logAuditEvent({
      userId: user.userId,
      action: 'DELETE',
      entityType: 'premix_batch',
      entityId: batchId,
      details: {
        movement_ids: movementIds,
        reverted_count: movements.length,
      },
    });

    revalidatePath('/production');
    revalidatePath('/production/premix');
    revalidatePath('/warehouse');
    revalidatePath('/inventory');

    return { success: true };
  } catch (err: any) {
    console.error('deletePremixBatch error:', err);
    return { success: false, error: err.message };
  }
}

export async function getPremixData(): Promise<{
  success: boolean;
  premixItems?: any[];
  ingredients?: any[];
  history?: any[];
  batches?: PremixBatchSession[];
  error?: string;
}> {
  try {
    await requireAuth(['PRODUCTION', 'SUPER_ADMIN', 'MANAGEMENT', 'PREMIX', 'WAREHOUSE']);

    // 1. Ambil data raw_materials
    const { data: rawMats } = await supabaseAdmin
      .from('raw_materials')
      .select('id, code, name, uom, material_category, min_stock, stock_quantity');

    const allMaterials = rawMats || [];

    // Filter premix target items (Khusus Tepung Premix racikan internal, bukan bumbu tabur beli jadi)
    const premixItems = allMaterials.filter(m => {
      const cat = (m.material_category || '').toLowerCase();
      const n = (m.name || '').toLowerCase();
      const isBumbuTabur = n.includes('balado') || n.includes('barbeque') || n.includes('bbq') || n.includes('pedas') || n.includes('keju') || n.includes('jagung');
      if (isBumbuTabur) return false;
      return n.includes('premix') || (cat === 'tepung' && (n.includes('adonan') || n.includes('khumkhum') || n.includes('crispy')));
    });

    // 2. Ambil inventory stok bahan mentah
    const { data: inventories } = await supabaseAdmin
      .from('inventory')
      .select('id, item_id, item_type, quantity, warehouse_id')
      .eq('item_type', 'RAW_MATERIAL');

    const ingredients = (inventories || []).map(inv => {
      const rm = allMaterials.find(m => m.id === inv.item_id);
      return {
        ...inv,
        name: rm?.name || 'Unknown Material',
        code: rm?.code || '',
        uom: rm?.uom || 'kg',
        category: rm?.material_category || 'Bahan Mentah',
      };
    });

    // 3. Ambil riwayat peracikan premix dari stock_movements
    const { data: movements } = await supabaseAdmin
      .from('stock_movements')
      .select('id, inventory_id, movement_type, quantity, reference_id, reference_type, notes, movement_date, created_by')
      .eq('reference_type', 'MIXING_PREMIX')
      .order('movement_date', { ascending: false })
      .limit(200);

    const history = (movements || []).map(mov => {
      const inv = ingredients.find(i => i.id === mov.inventory_id);
      return {
        id: mov.id,
        inventory_id: mov.inventory_id,
        movement_type: mov.movement_type,
        quantity: mov.quantity,
        reference_id: mov.reference_id,
        notes: mov.notes,
        created_at: mov.movement_date,
        created_by: mov.created_by,
        itemName: inv?.name || 'Premix / Bahan Baku',
        uom: inv?.uom || 'kg',
      };
    });

    // 4. Kelompokkan menjadi Sesi Batch Pembuatan Premix
    // Kelompokkan berdasarkan reference_id (atau fallback menit tanggal untuk data legacy)
    const sessionMap = new Map<string, {
      batch_id: string;
      batch_code: string;
      created_at: string;
      created_by?: string;
      output_item_name: string;
      output_quantity: number;
      output_uom: string;
      notes?: string;
      ingredients: PremixBatchIngredient[];
      movement_ids: string[];
    }>();

    for (const mov of movements || []) {
      const inv = ingredients.find(i => i.id === mov.inventory_id);
      const itemName = inv?.name || 'Bahan';
      const itemCode = inv?.code;
      const uom = inv?.uom || 'kg';

      // Ekstrak kode batch jika ada di notes (misal: [PRX-20261022-1552])
      const match = (mov.notes || '').match(/\[(PRX-[^\]]+)\]/);
      const explicitCode = match ? match[1] : undefined;

      // Group key: pakai reference_id jika ada, atau fallback ke minute timestamp legacy
      const dateKey = mov.movement_date ? mov.movement_date.slice(0, 16) : mov.id;
      const groupKey = mov.reference_id || explicitCode || `legacy-${dateKey}`;

      if (!sessionMap.has(groupKey)) {
        const fallbackCode = explicitCode || `PRX-${dateKey.replace(/[-T:]/g, '').slice(0, 12)}`;
        sessionMap.set(groupKey, {
          batch_id: mov.reference_id || groupKey,
          batch_code: fallbackCode,
          created_at: mov.movement_date,
          created_by: mov.created_by,
          output_item_name: '',
          output_quantity: 0,
          output_uom: 'kg',
          notes: '',
          ingredients: [],
          movement_ids: [],
        });
      }

      const session = sessionMap.get(groupKey)!;
      session.movement_ids.push(mov.id);

      if (mov.movement_type === 'IN') {
        session.output_item_name = itemName;
        session.output_quantity += Number(mov.quantity);
        session.output_uom = uom;
        // Bersihkan tag [PRX-...] dari notes jika ada
        const cleanNote = (mov.notes || '').replace(/\[PRX-[^\]]+\]\s*/, '').trim();
        if (cleanNote) session.notes = cleanNote;
      } else {
        session.ingredients.push({
          movement_id: mov.id,
          inventory_id: mov.inventory_id,
          item_name: itemName,
          item_code: itemCode,
          quantity: Number(mov.quantity),
          uom,
        });
      }
    }

    const batches: PremixBatchSession[] = Array.from(sessionMap.values()).map(sess => {
      // Hitung total berat bahan baku dalam satuan KG dengan konversi UOM yang tepat
      const totalIngKg = sess.ingredients.reduce((sum, ing) => {
        const u = (ing.uom || '').toLowerCase().trim();
        let qtyInKg = ing.quantity;
        if (u === 'gram' || u === 'gr' || u === 'g') {
          qtyInKg = ing.quantity / 1000;
        } else if (u === 'mg') {
          qtyInKg = ing.quantity / 1000000;
        } else if (u === 'ons') {
          qtyInKg = ing.quantity / 10;
        }
        return sum + qtyInKg;
      }, 0);

      return {
        ...sess,
        output_item_name: sess.output_item_name || 'Tepung Premix Khumkhum',
        total_ingredients_qty: Math.round(totalIngKg * 1000) / 1000,
      };
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return {
      success: true,
      premixItems,
      ingredients,
      history,
      batches,
    };
  } catch (err: any) {
    console.error('getPremixData error:', err);
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────
// CONSOLIDATED PRODUCTION DASHBOARD DATA (HIGH PERFORMANCE)
// ─────────────────────────────────────────────

export interface ProductionDashboardData {
  orders: DbProductionOrder[];
  products: DbProduct[];
  rawMaterials: (DbRawMaterial & { available_stock?: number })[];
  fryingBatches: DbFryingBatch[];
  packingEntries: DbPackingEntry[];
  metrics: {
    activeFryingBatchesToday: number;
    avgYieldToday: number;
    totalOutputGramToday: number;
    totalKremesanGramToday: number;
    unpackedLongsongCount: number;
    packedToplesToday: number;
    totalSeasoningGramToday: number;
  };
  standards: ProductionStandardConfig | null;
  containers: DbLongsongContainer[];
}

export async function getProductionDashboardData(): Promise<{
  success: boolean;
  data?: ProductionDashboardData;
  error?: string;
}> {
  try {
    await requireAuth(['PRODUCTION', 'QC', 'WAREHOUSE', 'SUPER_ADMIN', 'MANAGEMENT', 'PREMIX', 'SALES']);

    const [
      ordersRes,
      optionsRes,
      fryingRes,
      packingRes,
      metricsRes,
      standardsRes,
      containersRes,
    ] = await Promise.all([
      getProductionOrders(),
      getProductionFormOptions(),
      getAllFryingBatches(),
      getAllPackingEntries(),
      getFryingPackingMetrics(),
      getProductionStandards(),
      getLongsongContainers(),
    ]);

    return {
      success: true,
      data: {
        orders: ordersRes.success && ordersRes.data ? ordersRes.data : [],
        products: optionsRes.success && optionsRes.products ? optionsRes.products : [],
        rawMaterials: optionsRes.success && optionsRes.rawMaterials ? optionsRes.rawMaterials : [],
        fryingBatches: fryingRes.success && fryingRes.data ? fryingRes.data : [],
        packingEntries: packingRes.success && packingRes.data ? packingRes.data : [],
        metrics: metricsRes.success && metricsRes.data ? metricsRes.data : {
          activeFryingBatchesToday: 0,
          avgYieldToday: 0,
          totalOutputGramToday: 0,
          totalKremesanGramToday: 0,
          unpackedLongsongCount: 0,
          packedToplesToday: 0,
          totalSeasoningGramToday: 0,
        },
        standards: standardsRes?.success && standardsRes.data ? standardsRes.data : null,
        containers: containersRes?.success && containersRes.data ? containersRes.data : [],
      },
    };
  } catch (err: any) {
    console.error('getProductionDashboardData error:', err);
    return { success: false, error: err.message || 'Gagal memuat data dashboard produksi' };
  }
}

