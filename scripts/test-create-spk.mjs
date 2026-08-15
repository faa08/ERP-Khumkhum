import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lkyoshivpvtggzrfruzd.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxreW9zaGl2cHZ0Z2d6cmZydXpkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjQ0OTk5OCwiZXhwIjoyMTAyMDI1OTk4fQ.0VAFkwI53yGZT1LBF9T_1h1n5zkEUk29UVURPBDYIfU';

const supabase = createClient(supabaseUrl, serviceKey);

async function testCreateSpk() {
  console.log('Testing create SPK logic...');
  try {
    const { data: prod } = await supabase.from('products').select('id, name').limit(1).single();
    console.log('Using product:', prod);

    const now = new Date().toISOString();
    const batchNumber = `PRD-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(Math.random()*9000)+1000}`;

    const { data: newOrder, error: orderErr } = await supabase
      .from('production_orders')
      .insert([
        {
          batch_number: batchNumber,
          status: 'DRAFT',
          start_date: now,
          created_at: now,
          updated_at: now,
        }
      ])
      .select('*')
      .single();

    if (orderErr) {
      console.error('Order insert error:', orderErr);
      return;
    }
    console.log('✅ Production order created:', newOrder);

    if (prod?.id) {
      const { data: newRes, error: resErr } = await supabase
        .from('production_results')
        .insert([
          {
            production_order_id: newOrder.id,
            product_id: prod.id,
            finished_goods_quantity: 500,
            wip_quantity: 0,
            yield_percentage: 0,
            created_at: now,
          }
        ])
        .select('*')
        .single();

      if (resErr) {
        console.error('Result insert error:', resErr);
        return;
      }
      console.log('✅ Production result target created:', newRes);
    }

    console.log('🎉 SPK creation test passed successfully!');
  } catch (err) {
    console.error('Crash error:', err);
  }
}

testCreateSpk();
