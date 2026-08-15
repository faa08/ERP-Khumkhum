import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lkyoshivpvtggzrfruzd.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxreW9zaGl2cHZ0Z2d6cmZydXpkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjQ0OTk5OCwiZXhwIjoyMTAyMDI1OTk4fQ.0VAFkwI53yGZT1LBF9T_1h1n5zkEUk29UVURPBDYIfU';

const supabase = createClient(supabaseUrl, serviceKey);

async function testQueryOrders() {
  console.log('Testing decoupled order query...');
  try {
    const { data: orders, error: err1 } = await supabase
      .from('production_orders')
      .select('*, creator:users!production_orders_created_by_fkey(id, name)')
      .order('created_at', { ascending: false });

    if (err1) {
      console.error('Error fetching production_orders:', err1);
      return;
    }
    console.log('Fetched orders count:', orders.length);

    const orderIds = orders.map(o => o.id);
    const { data: results, error: resErr } = await supabase
      .from('production_results')
      .select('*, product:products(id, sku, name)')
      .in('production_order_id', orderIds);

    if (resErr) {
      console.error('Error fetching production_results:', resErr);
      return;
    }
    console.log('Fetched results count:', results.length);

    const { data: materials, error: matErr } = await supabase
      .from('production_materials')
      .select('*, raw_material:raw_materials(id, code, name, uom)')
      .in('production_order_id', orderIds);

    if (matErr) {
      console.error('Error fetching production_materials:', matErr);
      return;
    }
    console.log('Fetched materials count:', materials.length);

    // Merge together
    const enriched = orders.map(o => {
      const res = results.find(r => r.production_order_id === o.id);
      const mats = materials.filter(m => m.production_order_id === o.id);
      return {
        ...o,
        product: res?.product || null,
        product_id: res?.product_id || null,
        product_variant: res?.product?.name || 'Jamur Crispy Original 100g',
        target_quantity: res?.finished_goods_quantity || 500,
        output_weight: res?.finished_goods_quantity ? (res.finished_goods_quantity * 0.1) : null,
        yield_percentage: res?.yield_percentage || null,
        is_yield_compliant: res?.yield_percentage ? res.yield_percentage >= 80 : null,
        materials: mats,
        results: results.filter(r => r.production_order_id === o.id),
      };
    });

    console.log('✅ Enriched sample:', enriched[0]);
  } catch (err) {
    console.error('Crash error:', err);
  }
}

testQueryOrders();
