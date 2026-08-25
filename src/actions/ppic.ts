'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-guard';
import { format } from 'date-fns';
import type { DbFarmerHarvestEstimate } from '@/types/database';

export async function getPpicData(weekString?: string): Promise<{
  success: boolean;
  estimates?: any[];
  weeklyTotal?: number;
  historicalData?: number[];
  error?: string;
}> {
  try {
    await requireAuth(['WAREHOUSE', 'SUPER_ADMIN', 'MANAGEMENT', 'PRODUCTION']);

    let startDateStr = '';
    let endDateStr = '';

    if (weekString) {
      const [y, w] = weekString.split('-W');
      const year = parseInt(y, 10);
      const week = parseInt(w, 10);

      const jan4 = new Date(year, 0, 4);
      const startOfJan4Week = new Date(jan4);
      startOfJan4Week.setDate(jan4.getDate() - (jan4.getDay() || 7) + 1); 

      const startDate = new Date(startOfJan4Week);
      startDate.setDate(startDate.getDate() + (week - 1) * 7);

      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);

      startDateStr = format(startDate, 'yyyy-MM-dd');
      endDateStr = format(endDate, 'yyyy-MM-dd');
    } else {
      const now = new Date();
      const day = now.getDay() || 7;
      const startDate = new Date(now);
      startDate.setDate(now.getDate() - day + 1);
      
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      
      startDateStr = format(startDate, 'yyyy-MM-dd');
      endDateStr = format(endDate, 'yyyy-MM-dd');
    }

    let sortQuery = supabaseAdmin
      .from('sortings')
      .select(`
        *,
        receiving:receivings(
          farmer:farmers(id, name, phone_number)
        )
      `)
      .gte('sorting_date', startDateStr);
      
    if (endDateStr) {
      sortQuery = sortQuery.lte('sorting_date', endDateStr);
    }

    const { data: sortingsData } = await sortQuery
      .order('sorting_date', { ascending: false })
      .limit(50);

    // Fetch historical data for the last 7 weeks (49 days) for forecasting
    const sevenWeeksAgo = new Date();
    sevenWeeksAgo.setDate(sevenWeeksAgo.getDate() - 49);
    
    const { data: historicalRows } = await supabaseAdmin
      .from('sortings')
      .select('sorting_date, leaf_weight')
      .lt('sorting_date', new Date().toISOString().split('T')[0])
      .gte('sorting_date', format(sevenWeeksAgo, 'yyyy-MM-dd'));
      
    let historicalData = Array(7).fill(0); // Default to zeros
    
    if (historicalRows && historicalRows.length > 0) {
      // Bucket into 7 weeks
      const buckets = Array(7).fill(0);
      historicalRows.forEach(row => {
        const d = new Date(row.sorting_date);
        const diffTime = Math.abs(new Date().getTime() - d.getTime());
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const weekIndex = 6 - Math.floor(diffDays / 7); // 6 is the most recent week, 0 is 7 weeks ago
        if (weekIndex >= 0 && weekIndex < 7) {
          buckets[weekIndex] += (row.leaf_weight || 0);
        }
      });
      historicalData = buckets;
    }

    const weeklyTotal = (sortingsData || []).reduce((acc: number, curr: any) => acc + (curr.leaf_weight || 0), 0);
    
    return { success: true, estimates: sortingsData || [], weeklyTotal, historicalData };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function addManualHistoricalSorting(date: string, weight: number, farmerId: string, grade: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { user } = await requireAuth(['WAREHOUSE', 'SUPER_ADMIN', 'MANAGEMENT', 'PRODUCTION']);

    if (!farmerId) {
      return { success: false, error: 'Petani harus dipilih.' };
    }

    // Cari bahan baku jamur
    const { data: rawJamur } = await supabaseAdmin
      .from('raw_materials')
      .select('id')
      .ilike('name', '%jamur%')
      .limit(1)
      .single();

    if (!rawJamur) {
      return { success: false, error: 'Data master bahan baku (jamur) tidak ditemukan.' };
    }

    // 1. Create a mock receiving
    const batchNumber = `MOCK-RCV-${Date.now()}`;
    const { data: receiving, error: rcvErr } = await supabaseAdmin
      .from('receivings')
      .insert([{
        farmer_id: farmerId,
        raw_material_id: rawJamur.id,
        batch_number: batchNumber,
        weight: weight,
        status: 'SORTED',
        received_by: user.userId,
      }])
      .select('id')
      .single();

    if (rcvErr || !receiving) throw rcvErr || new Error('Gagal membuat data receiving dummy');

    // 2. Create the sorting record
    const { error: sortErr } = await supabaseAdmin
      .from('sortings')
      .insert([{
        receiving_id: receiving.id,
        leaf_weight: weight,
        stem_weight: 0,
        leaf_percentage: grade === 'A' ? 100 : grade === 'B' ? 75 : 50,
        quality_grade: grade,
        is_standard_compliant: grade === 'A' || grade === 'B',
        accepted_quantity: weight,
        rejected_quantity: 0,
        waste: 0,
        sorted_by: user.userId,
        sorting_date: new Date(date).toISOString(),
      }]);

    if (sortErr) throw sortErr;

    return { success: true };
  } catch (err: any) {
    console.error('addManualHistoricalSorting error:', err);
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────
// RIWAYAT JAMUR MATANG PENGGORENGAN (WIP Plain)
// ─────────────────────────────────────────────

export async function getCookedMushroomHistory(): Promise<{
  success: boolean;
  data?: {
    entries: {
      id: string;
      date: string;
      batch_number: string;
      output_weight: number;
      input_weight: number;
      yield_percentage: number;
      status: string;
      source: 'production' | 'manual';
    }[];
    weeklyData: number[];
    dailyAverage: number;
    weeklyAverage: number;
    totalLast30Days: number;
  };
  error?: string;
}> {
  try {
    await requireAuth(['WAREHOUSE', 'SUPER_ADMIN', 'MANAGEMENT', 'PRODUCTION']);

    // Get completed production orders from last 60 days
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const { data: orders, error: ordersErr } = await supabaseAdmin
      .from('production_orders')
      .select('id, batch_number, start_date, created_at, status, input_weight, output_weight, yield_percentage')
      .in('status', ['COMPLETED', 'COMPLETED_WIP', 'RELEASED', 'QC_PENDING'])
      .gte('created_at', format(sixtyDaysAgo, 'yyyy-MM-dd'))
      .order('created_at', { ascending: false });

    if (ordersErr) throw ordersErr;

    const entries = (orders || []).map((o: any) => ({
      id: o.id,
      date: o.start_date || o.created_at,
      batch_number: o.batch_number || '-',
      output_weight: Number(o.output_weight || 0),
      input_weight: Number(o.input_weight || 0),
      yield_percentage: Number(o.yield_percentage || 0),
      status: o.status,
      source: 'production' as const,
    }));

    // Bucket into 8 weeks for trend
    const weeklyData = Array(8).fill(0);
    const now = new Date();
    entries.forEach(e => {
      const d = new Date(e.date);
      const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      const weekIdx = 7 - Math.floor(diffDays / 7);
      if (weekIdx >= 0 && weekIdx < 8) {
        weeklyData[weekIdx] += e.output_weight;
      }
    });

    // Last 30 days stats
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentEntries = entries.filter(e => new Date(e.date) >= thirtyDaysAgo);
    const totalLast30 = recentEntries.reduce((s, e) => s + e.output_weight, 0);
    const dailyAvg = totalLast30 / 30;
    const weeklyAvg = totalLast30 / 4;

    return {
      success: true,
      data: {
        entries,
        weeklyData,
        dailyAverage: Number(dailyAvg.toFixed(2)),
        weeklyAverage: Number(weeklyAvg.toFixed(2)),
        totalLast30Days: Number(totalLast30.toFixed(2)),
      },
    };
  } catch (err: any) {
    console.error('getCookedMushroomHistory error:', err);
    return { success: false, error: err.message };
  }
}

export async function addManualCookedMushroomEntry(payload: {
  date: string;
  output_weight: number;
  input_weight: number;
  notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { user } = await requireAuth(['PRODUCTION', 'SUPER_ADMIN', 'WAREHOUSE']);

    const batchNumber = `MANUAL-COOK-${format(new Date(payload.date), 'yyyyMMdd')}-${Math.floor(Math.random() * 1000)}`;
    const yieldPct = payload.input_weight > 0
      ? Number(((payload.output_weight / payload.input_weight) * 100).toFixed(2))
      : 0;

    const { error } = await supabaseAdmin.from('production_orders').insert({
      batch_number: batchNumber,
      status: 'COMPLETED_WIP',
      start_date: new Date(payload.date).toISOString(),
      input_weight: payload.input_weight,
      output_weight: payload.output_weight,
      yield_percentage: yieldPct,
      is_yield_compliant: yieldPct >= 75,
      notes: payload.notes ? `[Input Manual] ${payload.notes}` : '[Input Manual] Data jamur matang manual',
      created_by: user.userId,
      created_at: new Date(payload.date).toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('addManualCookedMushroomEntry error:', err);
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────
// PERBANDINGAN PASOKAN vs PESANAN (Supply vs Demand)
// ─────────────────────────────────────────────

export async function getSupplyDemandComparison(): Promise<{
  success: boolean;
  data?: {
    totalSupplyKg: number;
    totalDemandKg: number;
    gapKg: number;
    gapStatus: 'SURPLUS' | 'DEFICIT' | 'BALANCED';
    demandByProduct: { product_name: string; total_qty: number }[];
  };
  error?: string;
}> {
  try {
    await requireAuth(['WAREHOUSE', 'SUPER_ADMIN', 'MANAGEMENT', 'PRODUCTION']);

    // Supply: avg weekly cooked mushroom output (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: prodOrders } = await supabaseAdmin
      .from('production_orders')
      .select('output_weight, created_at')
      .in('status', ['COMPLETED', 'COMPLETED_WIP', 'RELEASED'])
      .gte('created_at', format(thirtyDaysAgo, 'yyyy-MM-dd'));

    const totalOutputLast30 = (prodOrders || []).reduce((s: number, o: any) => s + Number(o.output_weight || 0), 0);
    const weeklySupply = Number((totalOutputLast30 / 4).toFixed(2));

    // Demand: pending sales orders
    const { data: pendingOrders } = await supabaseAdmin
      .from('sales_orders')
      .select(`
        items:sales_order_items(
          quantity,
          product:products(name)
        )
      `)
      .in('status', ['PENDING', 'CONFIRMED']);

    let totalDemand = 0;
    const demandMap: Record<string, number> = {};

    (pendingOrders || []).forEach((so: any) => {
      (so.items || []).forEach((item: any) => {
        const qty = Number(item.quantity || 0);
        const name = item.product?.name || 'Unknown';
        totalDemand += qty;
        demandMap[name] = (demandMap[name] || 0) + qty;
      });
    });

    const gapKg = Number((weeklySupply - totalDemand).toFixed(2));
    let gapStatus: 'SURPLUS' | 'DEFICIT' | 'BALANCED' = 'BALANCED';
    if (gapKg > 10) gapStatus = 'SURPLUS';
    else if (gapKg < -10) gapStatus = 'DEFICIT';

    const demandByProduct = Object.entries(demandMap).map(([product_name, total_qty]) => ({
      product_name,
      total_qty,
    }));

    return {
      success: true,
      data: {
        totalSupplyKg: weeklySupply,
        totalDemandKg: totalDemand,
        gapKg,
        gapStatus,
        demandByProduct,
      },
    };
  } catch (err: any) {
    console.error('getSupplyDemandComparison error:', err);
    return { success: false, error: err.message };
  }
}
