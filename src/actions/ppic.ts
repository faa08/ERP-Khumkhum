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
