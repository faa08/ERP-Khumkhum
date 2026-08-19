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
