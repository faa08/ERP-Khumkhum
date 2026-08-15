import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lkyoshivpvtggzrfruzd.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxreW9zaGl2cHZ0Z2d6cmZydXpkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjQ0OTk5OCwiZXhwIjoyMTAyMDI1OTk4fQ.0VAFkwI53yGZT1LBF9T_1h1n5zkEUk29UVURPBDYIfU';

const supabase = createClient(supabaseUrl, serviceKey);

async function inspectBatches() {
  console.log('Inspecting all production orders in Supabase...');
  try {
    const { data: orders, error } = await supabase
      .from('production_orders')
      .select('id, batch_number, status, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching production_orders:', error);
      return;
    }
    console.log(`Total orders found: ${orders.length}`);
    console.table(orders);

    const { data: pending } = await supabase
      .from('production_orders')
      .select('id, batch_number, status')
      .in('status', ['COMPLETED_WIP', 'QC_PENDING']);

    console.log(`Pending QC batches count: ${pending?.length}`);
    console.table(pending);

  } catch (err) {
    console.error('Crash error:', err);
  }
}

inspectBatches();
