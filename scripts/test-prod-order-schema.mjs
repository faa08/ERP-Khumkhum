import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lkyoshivpvtggzrfruzd.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxreW9zaGl2cHZ0Z2d6cmZydXpkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjQ0OTk5OCwiZXhwIjoyMTAyMDI1OTk4fQ.0VAFkwI53yGZT1LBF9T_1h1n5zkEUk29UVURPBDYIfU';

const supabase = createClient(supabaseUrl, serviceKey);

async function inspectSchema() {
  console.log('Inspecting production_orders table in live Supabase...');
  try {
    const { data: sample, error: err1 } = await supabase
      .from('production_orders')
      .select('*')
      .limit(1);

    if (err1) {
      console.error('Error selecting * from production_orders:', err1);
    } else {
      console.log('Columns in production_orders:', Object.keys(sample[0] || {}));
      console.log('Sample row:', sample[0]);
    }

    // Try joining with products
    const { data: joinData, error: joinErr } = await supabase
      .from('production_orders')
      .select('*, product:products(*)')
      .limit(1);

    if (joinErr) {
      console.error('Join error with products:', joinErr);
    } else {
      console.log('Join with products SUCCESS:', joinData);
    }

  } catch (err) {
    console.error('Crash error:', err);
  }
}

inspectSchema();
