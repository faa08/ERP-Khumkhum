'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-guard';
import type { DbInventory, DbStockMovement } from '@/types/database';

export async function getInventorySummary(): Promise<{
  success: boolean;
  data?: DbInventory[];
  error?: string;
}> {
  try {
    await requireAuth(['WAREHOUSE', 'SALES', 'SUPER_ADMIN', 'MANAGEMENT', 'QC', 'PRODUCTION']);

    const { data, error } = await supabaseAdmin
      .from('inventory')
      .select(`
        *,
        warehouse:warehouses(id, name)
      `)
      .order('last_updated_at', { ascending: false });

    if (error) throw error;

    // Enrich with item names via batched queries
    const rmIds = data?.filter(inv => inv.item_type === 'RAW_MATERIAL').map(inv => inv.item_id) || [];
    const prodIds = data?.filter(inv => inv.item_type === 'PRODUCT').map(inv => inv.item_id) || [];

    const [rmRes, prodRes] = await Promise.all([
      rmIds.length > 0 ? supabaseAdmin.from('raw_materials').select('id, name').in('id', rmIds) : { data: [] },
      prodIds.length > 0 ? supabaseAdmin.from('products').select('id, name').in('id', prodIds) : { data: [] }
    ]);

    const rmMap = new Map(rmRes.data?.map(rm => [rm.id, rm.name]) || []);
    const prodMap = new Map(prodRes.data?.map(p => [p.id, p.name]) || []);

    const enriched = (data || []).map((inv: any) => {
      let item_name = 'Unknown';
      if (inv.item_type === 'RAW_MATERIAL') {
        item_name = rmMap.get(inv.item_id) || 'Bahan Baku';
      } else if (inv.item_type === 'PRODUCT') {
        item_name = prodMap.get(inv.item_id) || 'Produk';
      }
      return { ...inv, item_name };
    });

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
    await requireAuth(['WAREHOUSE', 'SALES', 'SUPER_ADMIN', 'MANAGEMENT']);

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

import { subDays, format, addDays } from 'date-fns';

export async function getInventoryForecasting(inventoryId: string): Promise<{
  success: boolean;
  data?: {
    date: string;
    actualOut?: number;
    forecastOut?: number;
    projectedStock?: number;
  }[];
  metrics?: {
    currentStock: number;
    averageDailyUsage: number;
    daysOfSupply: number;
    status: 'SAFE' | 'WARNING' | 'CRITICAL';
    recommendedRestock: number;
  };
  error?: string;
}> {
  try {
    await requireAuth(['WAREHOUSE', 'SUPER_ADMIN', 'MANAGEMENT', 'QC', 'PRODUCTION']);

    // 1. Get current stock
    const { data: invData, error: invError } = await supabaseAdmin
      .from('inventory')
      .select('quantity, reorder_point')
      .eq('id', inventoryId)
      .single();

    if (invError) throw invError;
    const currentStock = Number(invData.quantity);
    const rop = Number(invData.reorder_point || 0);

    // 2. Get past 30 days of OUT movements
    const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
    const { data: movements, error: moveError } = await supabaseAdmin
      .from('stock_movements')
      .select('movement_date, quantity')
      .eq('inventory_id', inventoryId)
      .eq('movement_type', 'OUT')
      .gte('movement_date', thirtyDaysAgo)
      .order('movement_date', { ascending: true });

    if (moveError) throw moveError;

    // Group by day
    const dailyOut: Record<string, number> = {};
    for (let i = 30; i >= 0; i--) {
      const d = format(subDays(new Date(), i), 'yyyy-MM-dd');
      dailyOut[d] = 0;
    }

    (movements || []).forEach(m => {
      const d = format(new Date(m.movement_date), 'yyyy-MM-dd');
      if (dailyOut[d] !== undefined) {
        dailyOut[d] += Number(m.quantity);
      }
    });

    const dataPoints: { date: string; actualOut?: number; forecastOut?: number; projectedStock?: number; }[] = [];
    
    // Calculate 7-day average for naive forecast
    const dates = Object.keys(dailyOut).sort();
    let sum7 = 0;
    let count7 = 0;

    for (let i = 0; i < dates.length; i++) {
      const out = dailyOut[dates[i]];
      dataPoints.push({
        date: format(new Date(dates[i]), 'dd MMM'),
        actualOut: out
      });
      if (i >= dates.length - 7) {
        sum7 += out;
        count7++;
      }
    }

    const avgOut = count7 > 0 ? (sum7 / count7) : 0;
    const avgOutRounded = Number(avgOut.toFixed(2));
    
    // 3. Forecast next 14 days
    let runningStock = currentStock;
    for (let i = 1; i <= 14; i++) {
      const d = format(addDays(new Date(), i), 'dd MMM');
      runningStock -= avgOut;
      dataPoints.push({
        date: d,
        forecastOut: avgOutRounded,
        projectedStock: Number(Math.max(0, runningStock).toFixed(2))
      });
    }

    // 4. Calculate Actionable Metrics
    const daysOfSupply = avgOut > 0 ? Math.floor(currentStock / avgOut) : 999;
    
    let status: 'SAFE' | 'WARNING' | 'CRITICAL' = 'SAFE';
    let recommendedRestock = 0;
    
    const leadTimeDays = 3; // Asumsi lead time pengadaan
    const safeDays = leadTimeDays + 4; // Minimal stok untuk 1 minggu ke depan

    if (daysOfSupply <= leadTimeDays || currentStock <= rop) {
      status = 'CRITICAL';
      // Rekomendasi restock = Kebutuhan 14 hari ke depan + ROP - Stok saat ini
      recommendedRestock = Math.ceil((avgOut * 14) + rop - currentStock);
    } else if (daysOfSupply <= safeDays) {
      status = 'WARNING';
      recommendedRestock = Math.ceil((avgOut * 14) + rop - currentStock);
    }

    return { 
      success: true, 
      data: dataPoints, 
      metrics: {
        currentStock,
        averageDailyUsage: avgOutRounded,
        daysOfSupply,
        status,
        recommendedRestock: Math.max(0, recommendedRestock)
      }
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function receiveNonMushroomItem(payload: { item_name: string, uom: string, quantity: number, notes?: string }): Promise<{ success: boolean; error?: string }> {
  try {
    const { user } = await requireAuth(['WAREHOUSE', 'SUPER_ADMIN']);
    const batchNumber = `INB-NONJMR-${format(new Date(), 'yyyyMMdd')}-${Math.floor(Math.random() * 10000)}`;

    // 1. Find or create raw_material
    let rawMaterialId = '';
    const { data: existingRm } = await supabaseAdmin.from('raw_materials').select('id').ilike('name', payload.item_name).maybeSingle();
    
    if (existingRm) {
      rawMaterialId = existingRm.id;
    } else {
      const code = `RM-${payload.item_name.substring(0,3).toUpperCase()}-${Math.floor(Math.random()*1000)}`;
      const { data: newRm, error: rmError } = await supabaseAdmin.from('raw_materials').insert({
        code,
        name: payload.item_name,
        uom: payload.uom || 'kg',
        min_stock: 0,
        rop: 0
      }).select('id').single();
      
      if (rmError) throw rmError;
      rawMaterialId = newRm.id;
    }

    // 2. Find or create inventory
    let inventoryId = '';
    let currentQty = 0;
    const { data: existingInv } = await supabaseAdmin.from('inventory')
      .select('id, quantity')
      .eq('item_type', 'RAW_MATERIAL')
      .eq('item_id', rawMaterialId)
      .maybeSingle();

    if (existingInv) {
      inventoryId = existingInv.id;
      currentQty = existingInv.quantity;
      await supabaseAdmin.from('inventory').update({ 
        quantity: currentQty + payload.quantity, 
        last_updated_at: new Date().toISOString() 
      }).eq('id', inventoryId);
    } else {
      // Find a warehouse
      const { data: wh } = await supabaseAdmin.from('warehouses').select('id').limit(1).single();
      const warehouseId = wh?.id;
      if (!warehouseId) throw new Error('No warehouse found');

      const { data: newInv, error: invError } = await supabaseAdmin.from('inventory').insert({
        warehouse_id: warehouseId,
        item_type: 'RAW_MATERIAL',
        item_id: rawMaterialId,
        quantity: payload.quantity,
        reorder_point: 0
      }).select('id').single();

      if (invError) throw invError;
      inventoryId = newInv.id;
    }

    // 3. Create movement
    await supabaseAdmin.from('stock_movements').insert({
      inventory_id: inventoryId,
      movement_type: 'IN',
      quantity: payload.quantity,
      reference_type: 'MANUAL_INBOUND',
      notes: payload.notes ? `${payload.notes} (Batch: ${batchNumber})` : `Batch: ${batchNumber}`,
      created_by: user.userId
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

import type { DbStockOpnameItem } from '@/types/database';

export async function saveStockOpname(items: DbStockOpnameItem[]): Promise<{ success: boolean; error?: string }> {
  try {
    const { user } = await requireAuth(['WAREHOUSE', 'MANAGEMENT', 'SUPER_ADMIN']);
    
    for (const item of items) {
      // Save to stock_opnames even if difference is 0 to track the event
      await supabaseAdmin.from('stock_opnames').insert({
        inventory_id: item.inventory_id,
        system_quantity: item.system_qty,
        physical_quantity: item.physical_qty,
        difference: item.difference,
        created_by: user.userId
      });

      if (item.difference !== 0) {
        // Update inventory
        await supabaseAdmin.from('inventory').update({
          quantity: item.physical_qty,
          last_updated_at: new Date().toISOString()
        }).eq('id', item.inventory_id);

        // Create movement
        await supabaseAdmin.from('stock_movements').insert({
          inventory_id: item.inventory_id,
          movement_type: 'ADJUSTMENT',
          quantity: item.difference,
          reference_type: 'STOCK_OPNAME',
          notes: `Stock Opname adjustment. Sys: ${item.system_qty}, Phys: ${item.physical_qty}`,
          created_by: user.userId
        });
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getLossReport(): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    await requireAuth(['WAREHOUSE', 'MANAGEMENT', 'SUPER_ADMIN']);
    const { data, error } = await supabaseAdmin
      .from('stock_opnames')
      .select(`
        *,
        inventory:inventory_id (
           item_type,
           item_id,
           warehouse:warehouses (name)
        ),
        user:users (name)
      `)
      .lt('difference', 0)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Enrich with item names via batched queries
    const rmIds = data?.filter(op => op.inventory?.item_type === 'RAW_MATERIAL').map(op => op.inventory.item_id) || [];
    const prodIds = data?.filter(op => op.inventory?.item_type === 'PRODUCT').map(op => op.inventory.item_id) || [];

    const [rmRes, prodRes] = await Promise.all([
      rmIds.length > 0 ? supabaseAdmin.from('raw_materials').select('id, name').in('id', rmIds) : { data: [] },
      prodIds.length > 0 ? supabaseAdmin.from('products').select('id, name').in('id', prodIds) : { data: [] }
    ]);

    const rmMap = new Map(rmRes.data?.map(rm => [rm.id, rm.name]) || []);
    const prodMap = new Map(prodRes.data?.map(p => [p.id, p.name]) || []);

    const enriched = (data || []).map((opname: any) => {
      let item_name = 'Unknown';
      if (opname.inventory?.item_type === 'RAW_MATERIAL') {
        item_name = rmMap.get(opname.inventory.item_id) || 'Bahan Baku';
      } else if (opname.inventory?.item_type === 'PRODUCT') {
        item_name = prodMap.get(opname.inventory.item_id) || 'Produk';
      }
      return { ...opname, item_name };
    });

    return { success: true, data: enriched };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
