import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lkyoshivpvtggzrfruzd.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxreW9zaGl2cHZ0Z2d6cmZydXpkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjQ0OTk5OCwiZXhwIjoyMTAyMDI1OTk4fQ.0VAFkwI53yGZT1LBF9T_1h1n5zkEUk29UVURPBDYIfU';

const supabase = createClient(supabaseUrl, serviceKey);

async function testUpdateOrder() {
  console.log('Testing production_orders update with extra columns...');
  const testOrderId = '88b01d7f-ed8d-4ad4-b0b1-9f9b6d3cfb41';

  // Test 1: Update with input_weight
  const { error: err1 } = await supabase
    .from('production_orders')
    .update({ input_weight: 50, status: 'IN_PROGRESS' })
    .eq('id', testOrderId);

  if (err1) {
    console.error('❌ Error with input_weight:', err1);
  } else {
    console.log('✅ Update with input_weight success');
  }

  // Test 2: Update with status only
  const { error: err2 } = await supabase
    .from('production_orders')
    .update({ status: 'COMPLETED_WIP', updated_at: new Date().toISOString() })
    .eq('id', testOrderId);

  if (err2) {
    console.error('❌ Error with status only:', err2);
  } else {
    console.log('✅ Update with status only SUCCESS!');
  }
}

testUpdateOrder();
