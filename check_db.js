const { createClient } = require('@supabase/supabase-js');
const { loadEnvConfig } = require('@next/env');
loadEnvConfig(process.cwd());

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDb() {
  const { data: counts, error } = await supabase
    .from('sales_orders')
    .select('notes', { count: 'exact' });
  
  if (error) {
    console.error(error);
    return;
  }
  
  const notesCount = {};
  counts.forEach(row => {
    notesCount[row.notes] = (notesCount[row.notes] || 0) + 1;
  });
  console.log('Sales orders grouped by notes:', notesCount);
}

checkDb();
