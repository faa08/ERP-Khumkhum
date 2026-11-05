const { createClient } = require('@supabase/supabase-js');
const { loadEnvConfig } = require('@next/env');
loadEnvConfig(process.cwd());

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixDb() {
  console.log('Fetching duplicate sales orders...');
  let ids = [];
  let from = 0;
  const pageSize = 1000;
  
  while (true) {
    const { data, error } = await supabase
      .from('sales_orders')
      .select('id')
      .eq('notes', 'Impor dari datapen')
      .range(from, from + pageSize - 1);
      
    if (error || !data || data.length === 0) break;
    ids = ids.concat(data.map(d => d.id));
    if (data.length < pageSize) break;
    from += pageSize;
  }
  
  console.log(`Found ${ids.length} duplicate orders. Deleting items...`);
  
  for (let i = 0; i < ids.length; i += 500) {
    const chunk = ids.slice(i, i + 500);
    await supabase.from('sales_order_items').delete().in('sales_order_id', chunk);
    process.stdout.write('.');
  }
  
  console.log('\nDeleting orders...');
  for (let i = 0; i < ids.length; i += 500) {
    const chunk = ids.slice(i, i + 500);
    await supabase.from('sales_orders').delete().in('id', chunk);
    process.stdout.write('.');
  }
  
  console.log('\nSuccessfully deleted duplicate records!');
}

fixDb();
