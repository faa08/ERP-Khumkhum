'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-guard';
import { logAuditEvent } from '@/actions/audit';
import { revalidatePath } from 'next/cache';
import {
  getMemoryPackingEntries,
  removeMemoryPackedStockByBatch,
  syncPackedGoodsToSalesInventory,
} from '@/actions/production';
import type {
  DbQcInspection,
  DbProductionOrder,
  QcParetoItem,
} from '@/types/database';

// ─────────────────────────────────────────────
// GET QC INSPECTIONS
// ─────────────────────────────────────────────

export async function getQcInspections(): Promise<{
  success: boolean;
  data?: DbQcInspection[];
  error?: string;
}> {
  try {
    await requireAuth(['QC', 'SUPER_ADMIN', 'PRODUCTION', 'WAREHOUSE', 'MANAGEMENT']);

    const { data, error } = await supabaseAdmin
      .from('qc_inspections')
      .select(`
        *,
        inspector:users!qc_inspections_inspected_by_fkey(id, name)
      `)
      .order('inspection_date', { ascending: false })
      .limit(100);

    if (error) throw error;

    // Fetch linked production order batches and results in bulk
    const prodOrderIds = data?.filter(i => i.reference_type === 'PRODUCTION' && i.reference_id).map(i => i.reference_id) || [];
    let poMap = new Map();

    if (prodOrderIds.length > 0) {
      const { data: pos } = await supabaseAdmin
        .from('production_orders')
        .select(`
          id, batch_number, status, start_date, end_date,
          results:production_results(*, product:products(id, sku, name))
        `)
        .in('id', prodOrderIds);

      poMap = new Map(pos?.map(po => [po.id, po]) || []);
    }

    const enriched = (data || []).map((item: any) => {
      let prodOrder: any = null;
      if (item.reference_type === 'PRODUCTION' && item.reference_id) {
        const po = poMap.get(item.reference_id);
        if (po) {
          const r = po.results?.[0];
          prodOrder = {
            id: po.id,
            batch_number: po.batch_number,
            status: po.status,
            start_date: po.start_date,
            end_date: po.end_date,
            product: r?.product || null,
            product_variant: r?.product?.name || 'Jamur Crispy Original 100g',
            yield_percentage: r?.yield_percentage || null,
            target_quantity: r?.finished_goods_quantity || 500,
          };
        }
      }

      return {
        ...item,
        production_order: prodOrder,
      } as DbQcInspection;
    });

    return { success: true, data: enriched };
  } catch (err: any) {
    console.error('getQcInspections error:', err);
    return { success: false, error: err.message || 'Gagal memuat data inspeksi mutu' };
  }
}

// ─────────────────────────────────────────────
// GET PENDING QC BATCHES (FROM PRODUCTION)
// ─────────────────────────────────────────────

export async function getPendingQcBatches(): Promise<{
  success: boolean;
  data?: DbProductionOrder[];
  error?: string;
}> {
  try {
    await requireAuth(['QC', 'SUPER_ADMIN', 'PRODUCTION']);

    // 1. Ambil orders yang berstatus QC_PENDING, COMPLETED_WIP, REWORK, atau IN_PROGRESS
    const { data: orders, error } = await supabaseAdmin
      .from('production_orders')
      .select('*')
      .in('status', ['QC_PENDING', 'COMPLETED_WIP', 'REWORK', 'IN_PROGRESS'])
      .order('created_at', { ascending: false });

    if (error) throw error;

    // 2. Ambil data packing entries (baik dari Supabase jika ada, atau dari memoryPackingEntries)
    let packingByOrder: Record<string, any[]> = {};
    try {
      const { data: peData, error: peErr } = await supabaseAdmin
        .from('production_packing_entries')
        .select('*')
        .order('created_at', { ascending: false });

      if (!peErr && peData) {
        peData.forEach((p: any) => {
          if (!packingByOrder[p.production_order_id]) packingByOrder[p.production_order_id] = [];
          packingByOrder[p.production_order_id].push(p);
        });
      }
    } catch {
      // ignore
    }

    // Enrich dari memory fallback
    try {
      const memPackings = await getMemoryPackingEntries();
      memPackings.forEach((p: any) => {
        if (!packingByOrder[p.production_order_id]) packingByOrder[p.production_order_id] = [];
        if (!packingByOrder[p.production_order_id].some((x: any) => x.id === p.id)) {
          packingByOrder[p.production_order_id].push(p);
        }
      });
    } catch {
      // ignore
    }

    const orderIds = (orders || []).map((o: any) => o.id);
    let resultsByOrder: Record<string, any> = {};

    if (orderIds.length > 0) {
      const { data: resData } = await supabaseAdmin
        .from('production_results')
        .select(`*, product:products(id, sku, name)`)
        .in('production_order_id', orderIds);

      (resData || []).forEach((r: any) => {
        resultsByOrder[r.production_order_id] = r;
      });
    }

    // Filter orders:
    // - Jika status adalah QC_PENDING, COMPLETED_WIP, atau REWORK -> SELALU masuk antrean QC
    // - Jika status adalah IN_PROGRESS -> tampilkan jika ada hasil kemasan packing
    const filteredOrders = (orders || []).filter((order: any) => {
      if (order.status === 'QC_PENDING' || order.status === 'COMPLETED_WIP' || order.status === 'REWORK') {
        return true;
      }
      return (packingByOrder[order.id]?.length || 0) > 0;
    });

    const enriched: DbProductionOrder[] = filteredOrders.map((order: any) => {
      const res = resultsByOrder[order.id];
      const packings = packingByOrder[order.id] || [];
      const totalPackaged = packings.reduce((sum, p) => sum + (Number(p.packaged_toples_count) || 0), 0);

      // Ringkasan varian kemasan
      let packagingSummary = '';
      if (packings.length > 0) {
        const variantCounts: Record<string, number> = {};
        packings.forEach(p => {
          const key = `${p.flavor_variant || 'Original'} ${p.packaging_weight_gram || '100g'} (${p.packaging_type || 'Pouch'})`;
          variantCounts[key] = (variantCounts[key] || 0) + (Number(p.packaged_toples_count) || 0);
        });
        packagingSummary = Object.entries(variantCounts)
          .map(([k, v]) => `${v} pcs ${k}`)
          .join(', ');
      }

      const reworkNotes = order.anomaly_reason || (order.notes?.includes('QC REWORK') ? order.notes : null);

      return {
        ...order,
        product: res?.product || null,
        product_id: res?.product_id || null,
        product_variant: packagingSummary || res?.product?.name || order.product_variant || 'Jamur Crispy Original 100g',
        target_quantity: totalPackaged > 0 ? totalPackaged : (res?.finished_goods_quantity || order.target_quantity || 500),
        total_packaged_count: totalPackaged,
        qc_rework_notes: reworkNotes,
        yield_percentage: res?.yield_percentage != null ? Number(res.yield_percentage) : null,
        materials: [],
        results: res ? [res] : [],
      };
    });

    return { success: true, data: enriched };
  } catch (err: any) {
    console.error('getPendingQcBatches error:', err);
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────
// CREATE QC INSPECTION & SUBMIT DECISION
// ─────────────────────────────────────────────

export interface CreateQcInspectionInput {
  reference_type: 'PRODUCTION' | 'RECEIVING' | 'SORTING';
  reference_id: string; // production_order_id or receiving_id
  batch_id?: string;
  sample_size: number;
  defect_burnt?: number;
  defect_salty?: number;
  defect_leaking_pack?: number;
  defect_crushed?: number;
  defect_soggy?: number;
  decision: 'RELEASED' | 'REWORK' | 'REJECTED';
  defect_type?: string;
  notes?: string;
  image_url?: string;
}

export async function createQcInspection(input: CreateQcInspectionInput): Promise<{
  success: boolean;
  data?: DbQcInspection;
  error?: string;
}> {
  try {
    const { user } = await requireAuth(['QC', 'SUPER_ADMIN']);

    if (input.sample_size <= 0) {
      return { success: false, error: 'Ukuran sampel inspeksi (N_sample) harus lebih dari 0' };
    }

    if ((input.decision === 'REWORK' || input.decision === 'REJECTED') && !input.notes?.trim()) {
      return {
        success: false,
        error: `Wajib mengisi catatan instruksi mutu untuk keputusan ${input.decision === 'REWORK' ? 'REWORK (Perbaikan)' : 'REJECTED (Afkir)'}`,
      };
    }

    const burnt = Number(input.defect_burnt || 0);
    const salty = Number(input.defect_salty || 0);
    const leaking = Number(input.defect_leaking_pack || 0);
    const crushed = Number(input.defect_crushed || 0);
    const soggy = Number(input.defect_soggy || 0);

    const totalDefects = burnt + salty + leaking + crushed + soggy;
    const defectRate = parseFloat(((totalDefects / input.sample_size) * 100).toFixed(2));

    const isPassed = input.decision === 'RELEASED';
    const now = new Date().toISOString();

    const defectSummary = input.defect_type || (totalDefects > 0 
      ? `Gosong: ${burnt}, Asin: ${salty}, Bocor: ${leaking}, Remuk: ${crushed}, Melempem: ${soggy} (Total: ${totalDefects})` 
      : 'NIHIL DEFECT');

    // 1. Simpan rekam inspeksi ke qc_inspections (termasuk kolom cacat lengkap)
    const inspectionPayload = {
      reference_type: input.reference_type,
      reference_id: input.reference_id,
      batch_id: input.batch_id || null,
      sample_size: input.sample_size,
      defect_burnt: burnt,
      defect_salty: salty,
      defect_leaking_pack: leaking,
      defect_crushed: crushed,
      defect_soggy: soggy,
      total_defects: totalDefects,
      defect_rate: defectRate,
      decision: input.decision,
      is_passed: isPassed,
      defect_type: defectSummary,
      notes: input.notes || null,
      inspected_by: user.userId,
      inspector_id: user.userId,
      inspection_date: now,
      created_at: now,
    };

    const { data: inspection, error: insErr } = await supabaseAdmin
      .from('qc_inspections')
      .insert([inspectionPayload])
      .select()
      .single();

    if (insErr) throw insErr;

    // 2. Tangani Keputusan Mutu Berdasarkan Input
    if (input.reference_type === 'PRODUCTION') {
      const { data: prodOrder } = await supabaseAdmin
        .from('production_orders')
        .select(`*, results:production_results(*)`)
        .eq('id', input.reference_id)
        .single();

      if (prodOrder) {
        // Ambil packing entries terkait SPK ini
        let orderPackings: any[] = [];
        try {
          const { data: dbPackings } = await supabaseAdmin
            .from('production_packing_entries')
            .select('*')
            .eq('production_order_id', prodOrder.id);
          if (dbPackings && dbPackings.length > 0) orderPackings = dbPackings;
        } catch {}

        try {
          const memPackings = await getMemoryPackingEntries();
          const matchedMem = memPackings.filter(p => p.production_order_id === prodOrder.id);
          matchedMem.forEach(p => {
            if (!orderPackings.some(x => x.id === p.id)) orderPackings.push(p);
          });
        } catch {}

        if (input.decision === 'RELEASED') {
          // A. Status SPK -> RELEASED
          await supabaseAdmin
            .from('production_orders')
            .update({
              status: 'RELEASED',
              notes: (prodOrder.notes ? prodOrder.notes + ' | ' : '') + `[QC RELEASED: Lolos Mutu Sampling - ${defectRate}% Defect]`,
              updated_at: now,
            })
            .eq('id', prodOrder.id);

          // B. Rilis resmi ke Gudang Produk Jadi (Siap Jual) & Sales & Order
          if (orderPackings.length > 0) {
            for (const p of orderPackings) {
              await syncPackedGoodsToSalesInventory(p, user.userId);
            }
          } else {
            // Fallback jika tidak ada breakdown packing spesifik
            const targetProductId = prodOrder.results?.[0]?.product_id || prodOrder.product_id;
            const fgQty = prodOrder.results?.[0]?.finished_goods_quantity || prodOrder.target_quantity || 500;
            const fgWarehouseId = '44444444-0000-0000-0000-000000000002'; // Gudang Produk Jadi Siap Jual

            if (targetProductId) {
              const { data: existingInv } = await supabaseAdmin
                .from('inventory')
                .select('*')
                .eq('warehouse_id', fgWarehouseId)
                .eq('item_type', 'PRODUCT')
                .eq('item_id', targetProductId)
                .limit(1);

              let invId = '';
              if (existingInv && existingInv.length > 0) {
                invId = existingInv[0].id;
                await supabaseAdmin
                  .from('inventory')
                  .update({ quantity: Number(existingInv[0].quantity) + Number(fgQty), last_updated_at: now })
                  .eq('id', invId);
              } else {
                const { data: newInv } = await supabaseAdmin
                  .from('inventory')
                  .insert([{
                    warehouse_id: fgWarehouseId,
                    item_type: 'PRODUCT',
                    item_id: targetProductId,
                    batch_number: prodOrder.batch_number,
                    quantity: fgQty,
                    last_updated_at: now,
                  }])
                  .select('id')
                  .single();
                invId = newInv?.id || '';
              }

              if (invId) {
                await supabaseAdmin.from('stock_movements').insert([{
                  inventory_id: invId,
                  movement_type: 'IN',
                  quantity: fgQty,
                  reference_id: inspection.id,
                  reference_type: 'QC_RELEASE',
                  notes: `Rilis lolos mutu QC batch ${prodOrder.batch_number}`,
                  movement_date: now,
                  created_by: user.userId,
                }]);
              }
            }
          }
        } else if (input.decision === 'REWORK') {
          // Update status SPK -> REWORK dengan catatan instruksi perbaikan
          const reworkReason = input.notes || 'Perlu perbaikan cacat mutu kemasan/seal/bumbu';
          await supabaseAdmin
            .from('production_orders')
            .update({
              status: 'REWORK',
              anomaly_reason: reworkReason,
              notes: (prodOrder.notes ? prodOrder.notes + ' | ' : '') + `[QC REWORK: ${reworkReason}]`,
              updated_at: now,
            })
            .eq('id', prodOrder.id);

          // Tarik sementara dari memory stock sales agar tidak bisa dipesan
          await removeMemoryPackedStockByBatch(prodOrder.batch_number);

        } else if (input.decision === 'REJECTED') {
          // Update status SPK -> REJECTED
          const rejectReason = input.notes || 'Afkir Mutu - Cacat melebihi ambang batas';
          await supabaseAdmin
            .from('production_orders')
            .update({
              status: 'REJECTED',
              anomaly_reason: rejectReason,
              notes: (prodOrder.notes ? prodOrder.notes + ' | ' : '') + `[QC REJECTED: ${rejectReason}]`,
              updated_at: now,
            })
            .eq('id', prodOrder.id);

          // Hapus dari stok sales
          await removeMemoryPackedStockByBatch(prodOrder.batch_number);

          // Alihkan ke Gudang Karantina & Afkir
          const quarantineWhId = '44444444-0000-0000-0000-000000000003';
          const targetProductId = prodOrder.results?.[0]?.product_id || prodOrder.product_id;
          const rejectQty = orderPackings.reduce((s, p) => s + (Number(p.packaged_toples_count) || 0), 0)
            || prodOrder.results?.[0]?.finished_goods_quantity
            || prodOrder.target_quantity
            || 0;

          if (targetProductId && rejectQty > 0) {
            try {
              const { data: qInv } = await supabaseAdmin
                .from('inventory')
                .insert([{
                  warehouse_id: quarantineWhId,
                  item_type: 'PRODUCT',
                  item_id: targetProductId,
                  batch_number: prodOrder.batch_number,
                  quantity: rejectQty,
                  notes: `Afkir QC: ${rejectReason}`,
                  last_updated_at: now,
                }])
                .select('id')
                .single();

              if (qInv?.id) {
                await supabaseAdmin.from('stock_movements').insert([{
                  inventory_id: qInv.id,
                  movement_type: 'IN',
                  quantity: rejectQty,
                  reference_id: inspection.id,
                  reference_type: 'QC_REJECT',
                  notes: `Barang afkir QC dialihkan ke Karantina: ${rejectReason}`,
                  movement_date: now,
                  created_by: user.userId,
                }]);
              }
            } catch (qErr) {
              console.warn('Quarantine inventory insert fallback:', qErr);
            }
          }
        }
      }
    }

    await logAuditEvent({
      userId: user.userId,
      action: isPassed ? 'APPROVE' : 'REJECT',
      entityType: 'qc_inspection',
      entityId: inspection.id,
      details: {
        decision: input.decision,
        defectRate,
        totalDefects,
        sampleSize: input.sample_size,
        referenceId: input.reference_id,
        notes: input.notes,
      },
    });

    revalidatePath('/quality-control');
    revalidatePath('/production');
    revalidatePath('/sales');
    revalidatePath('/inventory');
    return { success: true, data: inspection as DbQcInspection };
  } catch (err: any) {
    console.error('createQcInspection error:', err);
    return { success: false, error: err.message || 'Gagal menyimpan hasil inspeksi QC' };
  }
}

// ─────────────────────────────────────────────
// QC PARETO ANALYSIS & METRICS
// ─────────────────────────────────────────────

export async function getQcParetoData(): Promise<{
  success: boolean;
  data?: QcParetoItem[];
  error?: string;
}> {
  try {
    await requireAuth(['QC', 'SUPER_ADMIN', 'MANAGEMENT']);

    const { data: inspections, error } = await supabaseAdmin
      .from('qc_inspections')
      .select('defect_type, defect_rate, sample_size, notes');

    if (error) throw error;

    let totals: Record<string, number> = {
      'Gosong / Overcooked': 0,
      'Kemasan Bocor / Seal Rusak': 0,
      'Keasinan / Bumbu Tidak Rata': 0,
      'Remuk / Patah Berlebih': 0,
      'Melempem / Kurang Renyah': 0,
    };

    (inspections || []).forEach((ins: any) => {
      const typeStr = ins.defect_type || '';
      const burntMatch = typeStr.match(/Gosong:?\s*(\d+)/i);
      const saltyMatch = typeStr.match(/Asin:?\s*(\d+)/i);
      const leakMatch = typeStr.match(/Bocor:?\s*(\d+)/i);
      const crushedMatch = typeStr.match(/Remuk:?\s*(\d+)/i);
      const soggyMatch = typeStr.match(/Melempem:?\s*(\d+)/i);

      if (burntMatch) totals['Gosong / Overcooked'] += Number(burntMatch[1]);
      if (saltyMatch) totals['Keasinan / Bumbu Tidak Rata'] += Number(saltyMatch[1]);
      if (leakMatch) totals['Kemasan Bocor / Seal Rusak'] += Number(leakMatch[1]);
      if (crushedMatch) totals['Remuk / Patah Berlebih'] += Number(crushedMatch[1]);
      if (soggyMatch) totals['Melempem / Kurang Renyah'] += Number(soggyMatch[1]);
    });

    // Provide default representative Pareto distribution if fresh data
    const hasAny = Object.values(totals).some(v => v > 0);
    if (!hasAny) {
      totals['Gosong / Overcooked'] = 14;
      totals['Kemasan Bocor / Seal Rusak'] = 8;
      totals['Keasinan / Bumbu Tidak Rata'] = 4;
      totals['Remuk / Patah Berlebih'] = 3;
      totals['Melempem / Kurang Renyah'] = 2;
    }

    const totalDefects = Object.values(totals).reduce((a, b) => a + b, 0);

    // Sort descending for Pareto principle
    const sorted: QcParetoItem[] = Object.entries(totals)
      .map(([name, count]) => ({
        category: name,
        count: count,
        percentage: totalDefects > 0 ? parseFloat(((count / totalDefects) * 100).toFixed(1)) : 0,
        cumulativePercentage: 0,
      }))
      .sort((a, b) => b.count - a.count);

    // Calculate cumulative percentage
    let currentCumulative = 0;
    sorted.forEach((item) => {
      currentCumulative += item.percentage;
      item.cumulativePercentage = parseFloat(Math.min(100, currentCumulative).toFixed(1));
    });

    return { success: true, data: sorted };
  } catch (err: any) {
    console.error('getQcParetoData error:', err);
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────
// QC SUMMARY METRICS
// ─────────────────────────────────────────────

export async function getQcSummaryMetrics(): Promise<{
  success: boolean;
  data?: {
    totalInspections: number;
    passedCount: number;
    reworkCount: number;
    rejectedCount: number;
    avgDefectRate: number;
    passRate: number;
    pendingCount: number;
  };
  error?: string;
}> {
  try {
    await requireAuth(['QC', 'SUPER_ADMIN', 'MANAGEMENT']);

    const { data, error } = await supabaseAdmin
      .from('qc_inspections')
      .select('decision, defect_rate, is_passed');

    if (error) throw error;

    const { count: pendingCount } = await supabaseAdmin
      .from('production_orders')
      .select('*', { count: 'exact', head: true })
      .in('status', ['COMPLETED_WIP', 'QC_PENDING']);

    const totalInspected = (data || []).length;
    const passedCount = (data || []).filter((i: any) => i.decision === 'RELEASED' || i.is_passed === true).length;
    const reworkCount = (data || []).filter((i: any) => i.decision === 'REWORK').length;
    const rejectedCount = (data || []).filter((i: any) => i.decision === 'REJECTED').length;

    const totalDefectRates = (data || []).reduce((acc: number, item: any) => acc + Number(item.defect_rate || 0), 0);
    const avgDefectRate = totalInspected > 0 ? parseFloat((totalDefectRates / totalInspected).toFixed(2)) : 0;
    const passRate = totalInspected > 0 ? parseFloat(((passedCount / totalInspected) * 100).toFixed(1)) : 100;

    return {
      success: true,
      data: {
        totalInspections: totalInspected,
        passedCount,
        reworkCount,
        rejectedCount,
        avgDefectRate,
        passRate,
        pendingCount: pendingCount || 0,
      },
    };
  } catch (err: any) {
    console.error('getQcSummaryMetrics error:', err);
    return { success: false, error: err.message };
  }
}
