'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-guard';
import { logAuditEvent } from '@/actions/audit';
import { format } from 'date-fns';
import { revalidatePath } from 'next/cache';
import type {
  DbProductionOrder,
  DbProductionMaterial,
  DbProductionResult,
  DbRawMaterial,
  DbProduct,
  DbFryingBatch,
  DbPackingEntry,
  DbTimeStudySample,
} from '@/types/database';

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

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
    await requireAuth(['PRODUCTION', 'QC', 'WAREHOUSE', 'SUPER_ADMIN', 'MANAGEMENT']);

    const { data: orders, error } = await supabaseAdmin
      .from('production_orders')
      .select(`
        *,
        creator:users!production_orders_created_by_fkey(id, name)
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

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
        product_variant: res?.product?.name || order.product_variant || 'Jamur Crispy Original 100g',
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
    await requireAuth(['PRODUCTION', 'QC', 'WAREHOUSE', 'SUPER_ADMIN', 'MANAGEMENT']);

    const { data: order, error } = await supabaseAdmin
      .from('production_orders')
      .select(`
        *,
        creator:users!production_orders_created_by_fkey(id, name)
      `)
      .eq('id', id)
      .single();

    if (error || !order) throw error || new Error('Batch produksi tidak ditemukan');

    const [{ data: materials }, { data: results }] = await Promise.all([
      supabaseAdmin
        .from('production_materials')
        .select(`*, raw_material:raw_materials(id, code, name, uom)`)
        .eq('production_order_id', id),
      supabaseAdmin
        .from('production_results')
        .select(`*, product:products(id, sku, name)`)
        .eq('production_order_id', id),
    ]);

    const res = (results || [])[0];
    const mats = materials || [];
    const totalInput = mats.reduce((acc, m) => acc + Number(m.consumption_quantity || 0), 0);
    const yieldPct = res?.yield_percentage != null ? Number(res.yield_percentage) : (order.yield_percentage != null ? Number(order.yield_percentage) : null);

    const enriched: DbProductionOrder = {
      ...order,
      product: res?.product || null,
      product_id: res?.product_id || order.product_id || null,
      product_variant: res?.product?.name || order.product_variant || 'Jamur Crispy Original 100g',
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
}

export async function createProductionOrder(input: CreateProductionOrderInput): Promise<{
  success: boolean;
  data?: DbProductionOrder;
  error?: string;
}> {
  try {
    const { user } = await requireAuth(['PRODUCTION', 'SUPER_ADMIN', 'WAREHOUSE']);

    if (!input.product_variant || input.target_quantity <= 0) {
      return { success: false, error: 'Varian produk dan target kuantitas (> 0) wajib diisi' };
    }

    const issueDate = input.start_date ? new Date(input.start_date).toISOString() : new Date().toISOString();
    const batch_number = generateProductionBatchNumber(input.start_date);
    const now = new Date().toISOString();

    const payload = {
      batch_number,
      status: 'DRAFT',
      start_date: issueDate,
      created_by: user.userId,
      created_at: issueDate,
      updated_at: now,
    };

    const { data, error } = await supabaseAdmin
      .from('production_orders')
      .insert([payload])
      .select('*')
      .single();

    if (error) throw error;

    let productObj = null;
    if (input.product_id) {
      const { data: p } = await supabaseAdmin
        .from('products')
        .select('id, sku, name')
        .eq('id', input.product_id)
        .single();
      productObj = p;

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

    await logAuditEvent({
      userId: user.userId,
      action: 'CREATE',
      entityType: 'production_order',
      entityId: data.id,
      details: { batch_number, target_quantity: input.target_quantity, product_variant: input.product_variant },
    });

    const fullData: DbProductionOrder = {
      ...data,
      product: productObj,
      product_id: input.product_id || null,
      product_variant: productObj?.name || input.product_variant,
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
      supabaseAdmin.from('products').select('*').order('name'),
      supabaseAdmin.from('raw_materials').select('*').order('name'),
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

    // 1. Get all products
    const { data: products } = await supabaseAdmin
      .from('products')
      .select('id, name, sku')
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

    if (settingsData?.value) {
      const config = settingsData.value as any;
      const activeShifts = (config.shifts || []).filter((s: any) => s.is_active);
      activeShiftCount = activeShifts.length;
      maxBatchesPerDay = activeShifts.reduce((s: number, sh: any) => s + (sh.max_fryer_batches || 0), 0);
    }

    // Estimate: each batch ~5kg output (adjustable)
    const estimatedKgPerBatch = 5;
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
// MEMORY FALLBACK STORES (Jika tabel Supabase belum di-migrate)
// ─────────────────────────────────────────────
let memoryFryingBatches: DbFryingBatch[] = [];
let memoryPackingEntries: DbPackingEntry[] = [];
let memoryTimeStudySamples: DbTimeStudySample[] = [];

// ─────────────────────────────────────────────
// FRYING BATCH CRUD
// ─────────────────────────────────────────────

export interface CreateFryingBatchInput {
  production_order_id: string;
  wajan_number: number;
  batch_weight_gram?: number;
  oil_temp_celsius: number;
  frying_duration_minutes: number;
  notes?: string;
}

export async function createFryingBatch(input: CreateFryingBatchInput): Promise<{
  success: boolean;
  data?: DbFryingBatch;
  error?: string;
}> {
  try {
    const session = await requireAuth(['PRODUCTION', 'SUPER_ADMIN']);

    let createdBatch: DbFryingBatch | undefined;

    const { data, error } = await supabaseAdmin
      .from('production_frying_batches')
      .insert({
        production_order_id: input.production_order_id,
        wajan_number: input.wajan_number,
        batch_weight_gram: input.batch_weight_gram || 800,
        oil_temp_celsius: input.oil_temp_celsius,
        frying_duration_minutes: input.frying_duration_minutes,
        notes: input.notes,
        operator_id: session.user.id,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.warn('Fallback memory for createFryingBatch:', error.message);
      const fallbackItem: DbFryingBatch = {
        id: 'fb-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
        production_order_id: input.production_order_id,
        wajan_number: input.wajan_number,
        batch_weight_gram: input.batch_weight_gram || 800,
        oil_temp_celsius: input.oil_temp_celsius,
        frying_duration_minutes: input.frying_duration_minutes,
        longsong_count: 0,
        kremesan_weight_gram: 0,
        notes: input.notes || null,
        operator_id: session.user.id,
        started_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        operator: { id: session.user.id, name: session.user.name || 'Operator Produksi' },
      };
      memoryFryingBatches.unshift(fallbackItem);
      createdBatch = fallbackItem;
    } else {
      createdBatch = data;
    }

    // Update production order status to IN_PROGRESS if still DRAFT
    try {
      await supabaseAdmin
        .from('production_orders')
        .update({ status: 'IN_PROGRESS', updated_at: new Date().toISOString() })
        .eq('id', input.production_order_id)
        .eq('status', 'DRAFT');
    } catch (_) {}

    await logAuditEvent({
      action: 'CREATE',
      entityType: 'production_frying_batch',
      entityId: createdBatch?.id,
      userId: session.user.id,
      details: {
        wajan_number: input.wajan_number,
        batch_weight_gram: input.batch_weight_gram || 800,
        oil_temp_celsius: input.oil_temp_celsius,
      },
    });

    revalidatePath('/production');
    return { success: true, data: createdBatch };
  } catch (err: any) {
    console.error('createFryingBatch error:', err);
    return { success: false, error: err.message || 'Gagal membuat batch goreng' };
  }
}

export interface CompleteFryingBatchInput {
  frying_batch_id: string;
  output_weight_gram: number;
  longsong_count: number;
  kremesan_weight_gram?: number;
}

export async function completeFryingBatch(input: CompleteFryingBatchInput): Promise<{
  success: boolean;
  data?: DbFryingBatch;
  error?: string;
}> {
  try {
    await requireAuth(['PRODUCTION', 'SUPER_ADMIN']);

    let updatedBatch: DbFryingBatch | undefined;

    const { data, error } = await supabaseAdmin
      .from('production_frying_batches')
      .update({
        output_weight_gram: input.output_weight_gram,
        longsong_count: input.longsong_count,
        kremesan_weight_gram: input.kremesan_weight_gram || 0,
        finished_at: new Date().toISOString(),
      })
      .eq('id', input.frying_batch_id)
      .select()
      .single();

    if (error) {
      console.warn('Fallback memory for completeFryingBatch:', error.message);
      const idx = memoryFryingBatches.findIndex(b => b.id === input.frying_batch_id);
      if (idx !== -1) {
        memoryFryingBatches[idx] = {
          ...memoryFryingBatches[idx],
          output_weight_gram: input.output_weight_gram,
          longsong_count: input.longsong_count,
          kremesan_weight_gram: input.kremesan_weight_gram || 0,
          finished_at: new Date().toISOString(),
        };
        updatedBatch = memoryFryingBatches[idx];
      }
    } else {
      updatedBatch = data;
    }

    revalidatePath('/production');
    return { success: true, data: updatedBatch };
  } catch (err: any) {
    console.error('completeFryingBatch error:', err);
    return { success: false, error: err.message || 'Gagal menyelesaikan batch goreng' };
  }
}

export async function getFryingBatchesByOrder(orderId: string): Promise<{
  success: boolean;
  data?: DbFryingBatch[];
  error?: string;
}> {
  try {
    await requireAuth(['PRODUCTION', 'QC', 'WAREHOUSE', 'SUPER_ADMIN', 'MANAGEMENT']);

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
    await requireAuth(['PRODUCTION', 'QC', 'WAREHOUSE', 'SUPER_ADMIN', 'MANAGEMENT']);

    const { data, error } = await supabaseAdmin
      .from('production_frying_batches')
      .select('*, operator:users!production_frying_batches_operator_id_fkey(id, name)')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      return { success: true, data: memoryFryingBatches };
    }
    return { success: true, data: data || [] };
  } catch (err: any) {
    console.error('getAllFryingBatches error:', err);
    return { success: true, data: memoryFryingBatches };
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
  packaging_weight_gram?: string;
  seasoning_used_gram: number;
  notes?: string;
}

export async function createPackingEntry(input: CreatePackingEntryInput): Promise<{
  success: boolean;
  data?: DbPackingEntry;
  error?: string;
}> {
  try {
    await requireAuth(['PRODUCTION', 'SUPER_ADMIN']);

    let createdPacking: DbPackingEntry | undefined;

    const { data, error } = await supabaseAdmin
      .from('production_packing_entries')
      .insert({
        frying_batch_id: input.frying_batch_id || null,
        production_order_id: input.production_order_id,
        flavor_variant: input.flavor_variant,
        longsong_number: input.longsong_number,
        longsong_weight_gram: input.longsong_weight_gram || null,
        packaged_toples_count: input.packaged_toples_count,
        packaging_weight_gram: input.packaging_weight_gram || '100g',
        seasoning_used_gram: input.seasoning_used_gram,
        is_packed: false,
        notes: input.notes,
      })
      .select()
      .single();

    if (error) {
      console.warn('Fallback memory for createPackingEntry:', error.message);
      const fallbackItem: DbPackingEntry = {
        id: 'pk-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
        frying_batch_id: input.frying_batch_id || null,
        production_order_id: input.production_order_id,
        flavor_variant: input.flavor_variant,
        longsong_number: input.longsong_number,
        longsong_weight_gram: input.longsong_weight_gram || null,
        packaged_toples_count: input.packaged_toples_count,
        packaging_weight_gram: input.packaging_weight_gram || '100g',
        seasoning_used_gram: input.seasoning_used_gram,
        is_packed: false,
        notes: input.notes || null,
        created_at: new Date().toISOString(),
      };
      memoryPackingEntries.unshift(fallbackItem);
      createdPacking = fallbackItem;
    } else {
      createdPacking = data;
    }

    revalidatePath('/production');
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
    const session = await requireAuth(['PRODUCTION', 'SUPER_ADMIN']);

    const { data, error } = await supabaseAdmin
      .from('production_packing_entries')
      .update({
        is_packed: true,
        packed_at: new Date().toISOString(),
      })
      .eq('id', packingEntryId)
      .select('production_order_id')
      .single();

    if (error) {
      console.warn('Fallback memory for markLongsongPacked:', error.message);
      const idx = memoryPackingEntries.findIndex(p => p.id === packingEntryId);
      if (idx !== -1) {
        memoryPackingEntries[idx] = {
          ...memoryPackingEntries[idx],
          is_packed: true,
          packed_at: new Date().toISOString(),
        };
      }
    }

    await logAuditEvent({
      action: 'UPDATE',
      entityType: 'production_packing_entry',
      entityId: packingEntryId,
      userId: session.user.id,
      details: { status: 'PACKED', packed_at: new Date().toISOString() },
    });

    revalidatePath('/production');
    return { success: true };
  } catch (err: any) {
    console.error('markLongsongPacked error:', err);
    return { success: false, error: err.message };
  }
}

export async function getPackingEntriesByOrder(orderId: string): Promise<{
  success: boolean;
  data?: DbPackingEntry[];
  error?: string;
}> {
  try {
    await requireAuth(['PRODUCTION', 'QC', 'WAREHOUSE', 'SUPER_ADMIN', 'MANAGEMENT']);

    const { data, error } = await supabaseAdmin
      .from('production_packing_entries')
      .select('*, frying_batch:production_frying_batches(id, wajan_number, batch_weight_gram)')
      .eq('production_order_id', orderId)
      .order('longsong_number', { ascending: true });

    if (error) {
      return { success: true, data: memoryPackingEntries.filter(p => p.production_order_id === orderId) };
    }
    return { success: true, data: data || [] };
  } catch (err: any) {
    console.error('getPackingEntriesByOrder error:', err);
    return { success: true, data: memoryPackingEntries.filter(p => p.production_order_id === orderId) };
  }
}

export async function getAllPackingEntries(): Promise<{
  success: boolean;
  data?: DbPackingEntry[];
  error?: string;
}> {
  try {
    await requireAuth(['PRODUCTION', 'QC', 'WAREHOUSE', 'SUPER_ADMIN', 'MANAGEMENT']);

    const { data, error } = await supabaseAdmin
      .from('production_packing_entries')
      .select('*, frying_batch:production_frying_batches(id, wajan_number, batch_weight_gram)')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      return { success: true, data: memoryPackingEntries };
    }
    return { success: true, data: data || [] };
  } catch (err: any) {
    console.error('getAllPackingEntries error:', err);
    return { success: true, data: memoryPackingEntries };
  }
}

export async function getUnpackedLongsongReminder(): Promise<{
  success: boolean;
  data?: DbPackingEntry[];
  count?: number;
  error?: string;
}> {
  try {
    await requireAuth(['PRODUCTION', 'SUPER_ADMIN', 'MANAGEMENT']);

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
    await requireAuth(['PRODUCTION', 'SUPER_ADMIN']);

    const { error } = await supabaseAdmin
      .from('time_study_samples')
      .delete()
      .eq('id', sampleId);

    if (error) {
      memoryTimeStudySamples = memoryTimeStudySamples.filter(s => s.id !== sampleId);
    }

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
    await requireAuth(['PRODUCTION', 'SUPER_ADMIN', 'MANAGEMENT']);

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
    totalKremesanGramToday: number;
    unpackedLongsongCount: number;
    packedToplesToday: number;
    totalSeasoningGramToday: number;
  };
  error?: string;
}> {
  try {
    await requireAuth(['PRODUCTION', 'QC', 'WAREHOUSE', 'SUPER_ADMIN', 'MANAGEMENT']);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayISO = todayStart.toISOString();

    let activeFrying = 0;
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
        const yieldsToday = fryingToday
          .filter(b => b.output_weight_gram && b.batch_weight_gram)
          .map(b => ((b.output_weight_gram || 0) / b.batch_weight_gram) * 100);
        avgYield = yieldsToday.length > 0
          ? Number((yieldsToday.reduce((s, y) => s + y, 0) / yieldsToday.length).toFixed(1))
          : 0;
      } else {
        activeFrying = memoryFryingBatches.length;
        totalKremesan = memoryFryingBatches.reduce((s, b) => s + (b.kremesan_weight_gram || 0), 0);
        const yieldsToday = memoryFryingBatches
          .filter(b => b.output_weight_gram && b.batch_weight_gram)
          .map(b => ((b.output_weight_gram || 0) / b.batch_weight_gram) * 100);
        avgYield = yieldsToday.length > 0
          ? Number((yieldsToday.reduce((s, y) => s + y, 0) / yieldsToday.length).toFixed(1))
          : 0;
      }
    } catch (_) {}

    // Unpacked and packed
    try {
      const { count } = await supabaseAdmin
        .from('production_packing_entries')
        .select('id', { count: 'exact', head: true })
        .eq('is_packed', false);
      unpackedCount = count || memoryPackingEntries.filter(p => !p.is_packed).length;

      const { data: packingToday } = await supabaseAdmin
        .from('production_packing_entries')
        .select('packaged_toples_count, seasoning_used_gram')
        .gte('created_at', todayISO)
        .eq('is_packed', true);

      if (packingToday) {
        packedToples = packingToday.reduce((s, p) => s + (p.packaged_toples_count || 0), 0);
        totalSeasoning = packingToday.reduce((s, p) => s + Number(p.seasoning_used_gram || 0), 0);
      }
    } catch (_) {
      unpackedCount = memoryPackingEntries.filter(p => !p.is_packed).length;
    }

    return {
      success: true,
      data: {
        activeFryingBatchesToday: activeFrying,
        avgYieldToday: avgYield,
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

