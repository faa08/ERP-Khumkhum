import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lkyoshivpvtggzrfruzd.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxreW9zaGl2cHZ0Z2d6cmZydXpkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjQ0OTk5OCwiZXhwIjoyMTAyMDI1OTk4fQ.0VAFkwI53yGZT1LBF9T_1h1n5zkEUk29UVURPBDYIfU';

const supabase = createClient(supabaseUrl, serviceKey);

async function seedPendingQcBatches() {
  console.log('Seeding pending QC batches (status: COMPLETED_WIP)...');
  try {
    const now = new Date().toISOString();
    const { data: prod1 } = await supabase.from('products').select('id, name').ilike('name', '%Original%').limit(1).single();
    const { data: prod2 } = await supabase.from('products').select('id, name').ilike('name', '%Balado%').limit(1).single();

    // Batch 1: Selesai masak, rendemen 84% (Siap QC)
    const b1Id = '77777777-0000-0000-0000-000000000011';
    await supabase.from('production_orders').upsert({
      id: b1Id,
      batch_number: 'PRD-20260815-5001',
      status: 'COMPLETED_WIP',
      start_date: new Date(Date.now() - 3600000 * 3).toISOString(),
      end_date: new Date(Date.now() - 3600000 * 1).toISOString(),
      created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

    if (prod1?.id) {
      await supabase.from('production_results').upsert({
        id: 'pr000011-0000-0000-0000-000000000001',
        production_order_id: b1Id,
        product_id: prod1.id,
        finished_goods_quantity: 500,
        wip_quantity: 0,
        yield_percentage: 84.0,
        created_at: now,
      }, { onConflict: 'id' });
    }

    // Batch 2: Selesai masak, rendemen 82% (Siap QC)
    const b2Id = '77777777-0000-0000-0000-000000000012';
    await supabase.from('production_orders').upsert({
      id: b2Id,
      batch_number: 'PRD-20260815-5002',
      status: 'COMPLETED_WIP',
      start_date: new Date(Date.now() - 3600000 * 2).toISOString(),
      end_date: new Date(Date.now() - 3600000 * 0.5).toISOString(),
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

    if (prod2?.id) {
      await supabase.from('production_results').upsert({
        id: 'pr000012-0000-0000-0000-000000000001',
        production_order_id: b2Id,
        product_id: prod2.id,
        finished_goods_quantity: 400,
        wip_quantity: 0,
        yield_percentage: 82.0,
        created_at: now,
      }, { onConflict: 'id' });
    }

    console.log('✅ 2 Batch COMPLETED_WIP berhasil ditambahkan dan siap muncul di antrean QC!');
  } catch (err) {
    console.error('Crash error:', err);
  }
}

seedPendingQcBatches();
