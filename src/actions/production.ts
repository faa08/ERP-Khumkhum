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
} from '@/types/database';

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function generateProductionBatchNumber(): string {
  const now = new Date();
  const date = format(now, 'yyyyMMdd');
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

    const batch_number = generateProductionBatchNumber();
    const now = new Date().toISOString();

    const payload = {
      batch_number,
      status: 'DRAFT',
      start_date: input.start_date || now,
      created_by: user.userId,
      created_at: now,
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

      if (invItems && invItems.length > 0) {
        const inv = invItems[0];
        const newQty = Math.max(0, Number(inv.quantity) - Number(item.consumption_quantity));

        await supabaseAdmin
          .from('inventory')
          .update({
            quantity: newQty,
            last_updated_at: new Date().toISOString(),
          })
          .eq('id', inv.id);

        // Catat mutasi stok OUT
        await supabaseAdmin.from('stock_movements').insert([
          {
            inventory_id: inv.id,
            movement_type: 'OUT',
            quantity: item.consumption_quantity,
            reference_id: input.production_order_id,
            reference_type: 'PRODUCTION_CONSUMPTION',
            notes: `Konsumsi produksi batch ${order.batch_number}`,
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
