import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lkyoshivpvtggzrfruzd.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxreW9zaGl2cHZ0Z2d6cmZydXpkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjQ0OTk5OCwiZXhwIjoyMTAyMDI1OTk4fQ.0VAFkwI53yGZT1LBF9T_1h1n5zkEUk29UVURPBDYIfU';

const supabase = createClient(supabaseUrl, serviceKey);

async function testConnection() {
  console.log('Testing Supabase connection...');
  try {
    const { data: users, error: userErr } = await supabase.from('users').select('id, name, email, role').limit(5);
    if (userErr) {
      console.error('Error fetching users:', userErr);
    } else {
      console.log('✅ Users query success:', users?.length, 'records found');
      console.log(users);
    }

    const { data: farmers, error: farmerErr } = await supabase.from('farmers').select('id, name').limit(5);
    if (farmerErr) {
      console.error('Error fetching farmers:', farmerErr);
    } else {
      console.log('✅ Farmers query success:', farmers?.length, 'records found');
    }

    const { data: products, error: prodErr } = await supabase.from('products').select('id, name, sku').limit(5);
    if (prodErr) {
      console.error('Error fetching products:', prodErr);
    } else {
      console.log('✅ Products query success:', products?.length, 'records found');
      console.log(products);
    }

    const { data: orders, error: orderErr } = await supabase.from('production_orders').select('id, batch_number, status').limit(5);
    if (orderErr) {
      console.error('Error fetching production_orders:', orderErr);
    } else {
      console.log('✅ Production orders query success:', orders?.length, 'records found');
      console.log(orders);
    }

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

testConnection();
