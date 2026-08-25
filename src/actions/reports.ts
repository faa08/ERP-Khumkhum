'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-guard';

export type ReportType = 'receiving' | 'sorting' | 'production' | 'qc' | 'inventory' | 'sales';

export async function generateReportData(
  type: ReportType,
  startDate?: string,
  endDate?: string
): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    await requireAuth(['MANAGEMENT', 'SUPER_ADMIN']);

    let query: any;
    
    switch (type) {
      case 'receiving':
        query = supabaseAdmin
          .from('receivings')
          .select(`
            id, batch_number, weight, notes, received_date,
            farmer:farmers (name),
            raw_material:raw_materials (name, uom),
            receiver:users (name)
          `)
          .order('received_date', { ascending: false });
        if (startDate) query = query.gte('received_date', `${startDate}T00:00:00Z`);
        if (endDate) query = query.lte('received_date', `${endDate}T23:59:59Z`);
        break;

      case 'sorting':
        query = supabaseAdmin
          .from('sortings')
          .select(`
            id, grade, accepted_quantity, rejected_quantity, waste, sorting_date,
            receiving:receivings (batch_number),
            sorter:users (name)
          `)
          .order('sorting_date', { ascending: false });
        if (startDate) query = query.gte('sorting_date', `${startDate}T00:00:00Z`);
        if (endDate) query = query.lte('sorting_date', `${endDate}T23:59:59Z`);
        break;

      case 'production':
        query = supabaseAdmin
          .from('production_orders')
          .select(`
            id, batch_number, status, start_date, end_date, created_at,
            results:production_results (
               product:products(name),
               finished_goods_quantity,
               wip_quantity,
               yield_percentage
            )
          `)
          .order('created_at', { ascending: false });
        if (startDate) query = query.gte('created_at', `${startDate}T00:00:00Z`);
        if (endDate) query = query.lte('created_at', `${endDate}T23:59:59Z`);
        break;

      case 'qc':
        query = supabaseAdmin
          .from('qc_inspections')
          .select(`
            id, reference_type, is_passed, defect_type, notes, inspection_date,
            inspector:users (name)
          `)
          .order('inspection_date', { ascending: false });
        if (startDate) query = query.gte('inspection_date', `${startDate}T00:00:00Z`);
        if (endDate) query = query.lte('inspection_date', `${endDate}T23:59:59Z`);
        break;

      case 'inventory':
        query = supabaseAdmin
          .from('stock_movements')
          .select(`
            id, movement_type, quantity, notes, movement_date,
            inventory:inventory_id (
              item_type,
              item_id,
              warehouse:warehouses(name)
            ),
            user:users (name)
          `)
          .order('movement_date', { ascending: false });
        if (startDate) query = query.gte('movement_date', `${startDate}T00:00:00Z`);
        if (endDate) query = query.lte('movement_date', `${endDate}T23:59:59Z`);
        break;

      case 'sales':
        query = supabaseAdmin
          .from('sales_orders')
          .select(`
            id, status, order_date,
            customer:customers (name),
            items:sales_order_items (
              quantity,
              product:products(name)
            )
          `)
          .order('order_date', { ascending: false });
        if (startDate) query = query.gte('order_date', `${startDate}T00:00:00Z`);
        if (endDate) query = query.lte('order_date', `${endDate}T23:59:59Z`);
        break;

      default:
        throw new Error('Invalid report type');
    }

    const { data, error } = await query;
    if (error) throw error;

    // Post-process specific reports
    let processedData = data;

    if (type === 'production') {
      processedData = data.map((po: any) => ({
        batch_number: po.batch_number,
        status: po.status,
        date: po.start_date || po.created_at,
        products: po.results?.map((r: any) => r.product?.name).join(', ') || '-',
        total_finished: po.results?.reduce((sum: number, r: any) => sum + Number(r.finished_goods_quantity), 0) || 0,
        avg_yield: po.results?.length ? (po.results.reduce((sum: number, r: any) => sum + Number(r.yield_percentage || 0), 0) / po.results.length) : 0
      }));
    } else if (type === 'inventory') {
      const rmIds = data?.filter((mv: any) => mv.inventory?.item_type === 'RAW_MATERIAL').map((mv: any) => mv.inventory.item_id) || [];
      const prodIds = data?.filter((mv: any) => mv.inventory?.item_type === 'PRODUCT').map((mv: any) => mv.inventory.item_id) || [];

      const [rmRes, prodRes] = await Promise.all([
        rmIds.length > 0 ? supabaseAdmin.from('raw_materials').select('id, name').in('id', rmIds) : { data: [] },
        prodIds.length > 0 ? supabaseAdmin.from('products').select('id, name').in('id', prodIds) : { data: [] }
      ]);

      const rmMap = new Map(rmRes.data?.map(rm => [rm.id, rm.name]) || []);
      const prodMap = new Map(prodRes.data?.map(p => [p.id, p.name]) || []);

      processedData = (data || []).map((mv: any) => {
        let item_name = 'Unknown';
        if (mv.inventory?.item_type === 'RAW_MATERIAL') {
          item_name = rmMap.get(mv.inventory.item_id) || 'Bahan Baku';
        } else if (mv.inventory?.item_type === 'PRODUCT') {
          item_name = prodMap.get(mv.inventory.item_id) || 'Produk';
        }
        return {
          date: mv.movement_date,
          item_name: item_name,
          warehouse: mv.inventory?.warehouse?.name,
          movement_type: mv.movement_type,
          quantity: mv.quantity,
          notes: mv.notes
        };
      });
    } else if (type === 'sales') {
      processedData = data.map((so: any) => ({
        date: so.order_date,
        customer: so.customer?.name,
        status: so.status,
        total_items: so.items?.length || 0,
        total_quantity: so.items?.reduce((s: number, i: any) => s + Number(i.quantity), 0) || 0,
        products: so.items?.map((i: any) => `${i.product?.name} (${i.quantity})`).join(', ') || ''
      }));
    } else if (type === 'receiving') {
      processedData = data.map((r: any) => ({
         date: r.received_date,
         batch_number: r.batch_number,
         farmer: r.farmer?.name,
         material: r.raw_material?.name,
         weight: r.weight,
         uom: r.raw_material?.uom,
         notes: r.notes
      }));
    } else if (type === 'sorting') {
      processedData = data.map((s: any) => ({
         date: s.sorting_date,
         batch_number: s.receiving?.batch_number,
         grade: s.grade,
         accepted: s.accepted_quantity,
         rejected: s.rejected_quantity,
         waste: s.waste
      }));
    } else if (type === 'qc') {
      processedData = data.map((qc: any) => ({
         date: qc.inspection_date,
         reference_type: qc.reference_type,
         is_passed: qc.is_passed ? 'Lulus' : 'Gagal',
         defect_type: qc.defect_type || '-',
         notes: qc.notes,
         inspector: qc.inspector?.name
      }));
    }

    return { success: true, data: processedData };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
