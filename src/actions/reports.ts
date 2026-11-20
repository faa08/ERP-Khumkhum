'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-guard';
import { format } from 'date-fns';

export type ReportType = 'receiving' | 'sorting' | 'production' | 'qc' | 'inventory' | 'sales' | 'frying';

export async function generateReportData(
  type: ReportType,
  startDate?: string,
  endDate?: string
): Promise<{ success: boolean; data?: any[]; error?: string; metadata?: any }> {
  try {
    await requireAuth(['MANAGEMENT', 'SUPER_ADMIN', 'QC', 'WAREHOUSE', 'PRODUCTION']);

    let query: any;
    let fryingPenerimaanRows: any[] = [];
    
    switch (type) {
      case 'frying': {
        // 1. Ambil data Penerimaan & Sortasi untuk tabel PENERIMAAN
        let rcvQuery = supabaseAdmin
          .from('receivings')
          .select(`
            id, batch_number, weight, notes, received_date, created_at,
            farmer:farmers (id, name),
            receiver:users (id, name),
            sortings (
              id, leaf_weight, stem_weight, accepted_quantity, waste, quality_grade, sorted_by, sorting_date
            )
          `)
          .order('received_date', { ascending: false });

        if (startDate) rcvQuery = rcvQuery.gte('received_date', `${startDate}T00:00:00Z`);
        if (endDate) rcvQuery = rcvQuery.lte('received_date', `${endDate}T23:59:59Z`);

        const { data: rcvList } = await rcvQuery;

        const penerimaanDateMap = new Map<string, string>();
        fryingPenerimaanRows = (rcvList || []).map((r: any) => {
          const sorting = r.sortings?.[0] || null;
          const supplierName = r.farmer?.name || 'Petani Mitra';
          const dateStr = r.received_date || r.created_at;
          const d = new Date(dateStr);
          const dateFormatted = !isNaN(d.getTime()) ? format(d, 'yyyyMMdd') : '20261120';
          const cleanSupplier = supplierName
            .replace(/^(pak|ibu|bpk|kelompok\s*tani|mitra)\s+/i, '')
            .trim()
            .split(/\s+/)[0]
            .toUpperCase() || 'PETANI';
          const mushroomCode = `${cleanSupplier}-${dateFormatted}`;

          const totalWeightKg = Number(r.weight || 0);
          const leafWeightKg = Number(sorting?.leaf_weight ?? sorting?.accepted_quantity ?? (totalWeightKg * 0.8));
          const stemWeightKg = Number(sorting?.stem_weight ?? sorting?.waste ?? (totalWeightKg * 0.2));
          const officer = r.receiver?.name || 'Petugas Inbound';

          const dateKey = !isNaN(d.getTime()) ? format(d, 'yyyy-MM-dd') : 'default';
          if (!penerimaanDateMap.has(dateKey)) {
            penerimaanDateMap.set(dateKey, mushroomCode);
          }

          return {
            id: r.id,
            date: dateStr,
            supplier_name: supplierName,
            total_weight_kg: Number(totalWeightKg.toFixed(2)),
            leaf_weight_kg: Number(leafWeightKg.toFixed(2)),
            stem_weight_kg: Number(stemWeightKg.toFixed(2)),
            mushroom_code: mushroomCode,
            officer: officer
          };
        });

        // 2. Ambil data batch penggorengan untuk tabel PENGGORENGAN
        let fryingQuery = supabaseAdmin
          .from('production_frying_batches')
          .select(`
            id, production_order_id, wajan_number, batch_weight_gram, output_weight_gram,
            frying_duration_minutes, oil_temp_celsius, started_at, finished_at, created_at, notes,
            operator_id
          `)
          .order('created_at', { ascending: false });

        if (startDate) fryingQuery = fryingQuery.gte('created_at', `${startDate}T00:00:00Z`);
        if (endDate) fryingQuery = fryingQuery.lte('created_at', `${endDate}T23:59:59Z`);

        const { data: dbFryingBatches } = await fryingQuery;

        // Ambil data SPK Frying (production_orders)
        let poQuery = supabaseAdmin
          .from('production_orders')
          .select(`
            id, batch_number, status, start_date, created_at, product_variant, input_weight, output_weight, yield_percentage, created_by, notes
          `)
          .order('created_at', { ascending: false });

        if (startDate) poQuery = poQuery.gte('created_at', `${startDate}T00:00:00Z`);
        if (endDate) poQuery = poQuery.lte('created_at', `${endDate}T23:59:59Z`);

        const { data: dbOrders } = await poQuery;
        const poMap = new Map((dbOrders || []).map(po => [po.id, po]));

        // Mapping user operator
        const opIds = Array.from(new Set([
          ...(dbFryingBatches || []).map(b => b.operator_id).filter(Boolean),
          ...(dbOrders || []).map(po => po.created_by).filter(Boolean)
        ]));

        let userMap = new Map<string, string>();
        if (opIds.length > 0) {
          const { data: users } = await supabaseAdmin.from('users').select('id, name').in('id', opIds);
          (users || []).forEach(u => userMap.set(u.id, u.name));
        }

        const fryingRows: any[] = [];
        const processedPoIds = new Set<string>();

        if (dbFryingBatches && dbFryingBatches.length > 0) {
          dbFryingBatches.forEach(b => {
            const po = poMap.get(b.production_order_id);
            if (b.production_order_id) processedPoIds.add(b.production_order_id);

            const dStr = b.started_at || b.created_at || po?.start_date || po?.created_at || new Date().toISOString();
            const d = new Date(dStr);
            const dateKey = !isNaN(d.getTime()) ? format(d, 'yyyy-MM-dd') : 'default';
            const mushroomCode = penerimaanDateMap.get(dateKey) ||
                                (fryingPenerimaanRows[0]?.mushroom_code) ||
                                `KHUMKHUM-${!isNaN(d.getTime()) ? format(d, 'yyyyMMdd') : '20261120'}`;

            const rawGram = Number(b.batch_weight_gram || 800);
            const premixGram = Math.round(rawGram * 0.25);
            const kalduGram = '20 gr';
            const fryingMins = Number(b.frying_duration_minutes || 15);
            const spinnerMins = 5;
            const outputGram = b.output_weight_gram ? Number(b.output_weight_gram) : Math.round(rawGram * 0.8);
            const outputChipsStr = outputGram >= 1000 ? `${(outputGram / 1000).toFixed(2)} kg` : `${outputGram} gr`;
            const batchNoStr = po?.batch_number ? `${po.batch_number} (Wajan ${b.wajan_number})` : `Wajan ${b.wajan_number}`;
            const officer = (b.operator_id ? userMap.get(b.operator_id) : null) || (po?.created_by ? userMap.get(po.created_by) : null) || 'Petugas Goreng';

            fryingRows.push({
              id: b.id,
              date: dStr,
              officer: officer,
              mushroom_code: mushroomCode,
              batch_number: batchNoStr,
              shredded_mushroom_gram: rawGram,
              seasoned_flour_gram: premixGram,
              mushroom_broth: kalduGram,
              frying_minutes: fryingMins,
              spinner_minutes: spinnerMins,
              output_chips: outputChipsStr,
              output_chips_num: outputGram,
              yield_percentage: rawGram > 0 ? Number(((outputGram / rawGram) * 100).toFixed(1)) : 80
            });
          });
        }

        // Sertakan juga SPK Frying (Rekap Langsung tanpa rincian timer per wajan)
        (dbOrders || []).forEach(po => {
          const isFrying = (po.product_variant || '').toLowerCase().includes('curah') ||
                           (po.product_variant || '').toLowerCase().includes('polos') ||
                           (po.product_variant || '').toLowerCase().includes('goreng') ||
                           (po.notes || '').toLowerCase().includes('goreng') ||
                           !processedPoIds.has(po.id);

          if (isFrying && !processedPoIds.has(po.id)) {
            const dStr = po.start_date || po.created_at || new Date().toISOString();
            const d = new Date(dStr);
            const dateKey = !isNaN(d.getTime()) ? format(d, 'yyyy-MM-dd') : 'default';
            const mushroomCode = penerimaanDateMap.get(dateKey) ||
                                (fryingPenerimaanRows[0]?.mushroom_code) ||
                                `KHUMKHUM-${!isNaN(d.getTime()) ? format(d, 'yyyyMMdd') : '20261120'}`;

            const inputKg = Number(po.input_weight || 10);
            const inputGram = Math.round(inputKg * 1000);
            const premixGram = Math.round(inputGram * 0.25);
            const kalduGram = `${Math.round(inputKg * 25)} gr`;
            const fryingMins = 15;
            const spinnerMins = 5;
            const outputKg = po.output_weight ? Number(po.output_weight) : Number((inputKg * 0.8).toFixed(2));
            const outputChipsStr = `${outputKg} kg`;

            fryingRows.push({
              id: po.id,
              date: dStr,
              officer: (po.created_by ? userMap.get(po.created_by) : null) || 'Petugas Produksi',
              mushroom_code: mushroomCode,
              batch_number: po.batch_number || 'SPK-GORENG',
              shredded_mushroom_gram: inputGram,
              seasoned_flour_gram: premixGram,
              mushroom_broth: kalduGram,
              frying_minutes: fryingMins,
              spinner_minutes: spinnerMins,
              output_chips: outputChipsStr,
              output_chips_num: Math.round(outputKg * 1000),
              yield_percentage: inputKg > 0 ? Number(((outputKg / inputKg) * 100).toFixed(1)) : 80
            });
          }
        });

        // Sample data default jika database baru/kosong agar form pengendalian tetap dapat dicetak
        if (fryingRows.length === 0 && fryingPenerimaanRows.length === 0) {
          const nowStr = new Date().toISOString();
          fryingPenerimaanRows.push({
            id: 'sample-rcv-1',
            date: nowStr,
            supplier_name: 'Pak Sutikno (Mitra Cilegon)',
            total_weight_kg: 50.0,
            leaf_weight_kg: 41.5,
            stem_weight_kg: 8.5,
            mushroom_code: 'SUTIKNO-20261120',
            officer: 'Ahmad Fauzi'
          });
          fryingRows.push({
            id: 'sample-fry-1',
            date: nowStr,
            officer: 'Dedi Kusnadi',
            mushroom_code: 'SUTIKNO-20261120',
            batch_number: 'SPK-FRY-001 (Wajan 1)',
            shredded_mushroom_gram: 800,
            seasoned_flour_gram: 200,
            mushroom_broth: '20 gr',
            frying_minutes: 15,
            spinner_minutes: 5,
            output_chips: '650 gr',
            output_chips_num: 650,
            yield_percentage: 81.2
          });
          fryingRows.push({
            id: 'sample-fry-2',
            date: nowStr,
            officer: 'Dedi Kusnadi',
            mushroom_code: 'SUTIKNO-20261120',
            batch_number: 'SPK-FRY-001 (Wajan 2)',
            shredded_mushroom_gram: 800,
            seasoned_flour_gram: 200,
            mushroom_broth: '20 gr',
            frying_minutes: 15,
            spinner_minutes: 5,
            output_chips: '640 gr',
            output_chips_num: 640,
            yield_percentage: 80.0
          });
        }

        return {
          success: true,
          data: fryingRows,
          metadata: {
            penerimaan: fryingPenerimaanRows,
            title: 'FORM PENGENDALIAN PROSES PRODUKSI'
          }
        };
      }
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
            id, grade, quality_grade, accepted_quantity, rejected_quantity, waste, leaf_weight, stem_weight, sorting_date, created_at,
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
            id, batch_number, status, start_date, end_date, created_at, product_variant, yield_percentage, output_weight, target_quantity,
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
            id, reference_type, is_passed, defect_type, notes, inspection_date, created_at,
            inspector:users!qc_inspections_inspected_by_fkey (name)
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
            id, order_number, status, order_date, total_amount,
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
      processedData = data.map((po: any, idx: number) => {
        const prodName = po.results?.filter((r: any) => r.product?.name).map((r: any) => r.product?.name).join(', ') || po.product_variant || 'Jamur Crispy';
        const totalFin = po.results?.reduce((sum: number, r: any) => sum + Number(r.finished_goods_quantity || 0), 0) || po.target_quantity || (po.output_weight ? Math.round(Number(po.output_weight) * 10) : 0);
        const resultYield = po.results?.length ? (po.results.reduce((sum: number, r: any) => sum + Number(r.yield_percentage || 0), 0) / po.results.length) : null;
        const avgYield = resultYield != null ? resultYield : Number(po.yield_percentage || 0);

        return {
          id: po.id || `po-${idx}`,
          batch_number: po.batch_number,
          status: po.status,
          date: po.start_date || po.created_at,
          products: prodName,
          total_finished: totalFin,
          avg_yield: avgYield,
        };
      });
    } else if (type === 'inventory') {
      const rmIds = data?.filter((mv: any) => mv.inventory?.item_type === 'RAW_MATERIAL').map((mv: any) => mv.inventory.item_id) || [];
      const prodIds = data?.filter((mv: any) => mv.inventory?.item_type === 'PRODUCT').map((mv: any) => mv.inventory.item_id) || [];

      const [rmRes, prodRes] = await Promise.all([
        rmIds.length > 0 ? supabaseAdmin.from('raw_materials').select('id, name, uom').in('id', rmIds) : { data: [] },
        prodIds.length > 0 ? supabaseAdmin.from('products').select('id, name').in('id', prodIds) : { data: [] }
      ]);

      const rmMap = new Map(rmRes.data?.map(rm => [rm.id, rm]) || []);
      const prodMap = new Map(prodRes.data?.map(p => [p.id, p.name]) || []);

      processedData = (data || []).map((mv: any, idx: number) => {
        let item_name = 'Unknown';
        let uom = 'kg';
        if (mv.inventory?.item_type === 'RAW_MATERIAL') {
          const rm = rmMap.get(mv.inventory.item_id);
          item_name = rm?.name || 'Bahan Baku';
          uom = rm?.uom || 'kg';
        } else if (mv.inventory?.item_type === 'PRODUCT') {
          item_name = prodMap.get(mv.inventory.item_id) || 'Produk';
          uom = 'pcs';
        }
        return {
          id: mv.id || `inv-${idx}`,
          date: mv.movement_date,
          item_name,
          uom,
          warehouse: mv.inventory?.warehouse?.name || 'Gudang Utama',
          movement_type: mv.movement_type,
          quantity: mv.quantity,
          notes: mv.notes || '-'
        };
      });
    } else if (type === 'sales') {
      processedData = data.map((so: any, idx: number) => ({
        id: so.id || `so-${idx}`,
        order_number: so.order_number || '-',
        date: so.order_date || so.created_at,
        customer: so.customer?.name || 'Pelanggan Retail',
        status: so.status,
        total_items: so.items?.length || 0,
        total_quantity: so.items?.reduce((s: number, i: any) => s + Number(i.quantity || 0), 0) || 0,
        total_amount: Number(so.total_amount || 0),
        products: so.items?.map((i: any) => `${i.product?.name || 'Produk'} (${i.quantity} pcs)`).join(', ') || '-'
      }));
    } else if (type === 'receiving') {
      processedData = data.map((r: any, idx: number) => ({
         id: r.id || `rcv-${idx}`,
         date: r.received_date || r.created_at,
         batch_number: r.batch_number,
         farmer: r.farmer?.name || '-',
         material: r.raw_material?.name || 'Jamur Tiram Segar',
         weight: Number(r.weight || 0),
         uom: r.raw_material?.uom || 'kg',
         notes: r.notes || '-'
      }));
    } else if (type === 'sorting') {
      processedData = data.map((s: any, idx: number) => ({
         id: s.id || `sort-${idx}`,
         date: s.sorting_date || s.created_at,
         batch_number: s.receiving?.batch_number || '-',
         grade: s.quality_grade || s.grade || 'A',
         accepted: Number(s.accepted_quantity ?? s.leaf_weight ?? 0),
         rejected: Number(s.rejected_quantity ?? 0),
         waste: Number(s.waste ?? s.stem_weight ?? 0)
      }));
    } else if (type === 'qc') {
      processedData = data.map((qc: any, idx: number) => ({
         id: qc.id || `qc-${idx}`,
         date: qc.inspection_date || qc.created_at,
         reference_type: qc.reference_type || 'QC',
         is_passed: qc.is_passed ? 'Lulus' : 'Gagal',
         defect_type: qc.defect_type || 'Nihil Cacat',
         notes: qc.notes || '-',
         inspector: qc.inspector?.name || 'Petugas QC'
      }));
    }

    return { success: true, data: processedData };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
