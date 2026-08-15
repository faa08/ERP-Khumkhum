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
