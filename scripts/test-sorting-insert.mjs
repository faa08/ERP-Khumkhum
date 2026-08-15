import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lkyoshivpvtggzrfruzd.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxreW9zaGl2cHZ0Z2d6cmZydXpkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjQ0OTk5OCwiZXhwIjoyMTAyMDI1OTk4fQ.0VAFkwI53yGZT1LBF9T_1h1n5zkEUk29UVURPBDYIfU';

const supabase = createClient(supabaseUrl, serviceKey);

async function testInsertSorting() {
  console.log('Testing createSorting payload in Supabase...');
  try {
    const { data: rec } = await supabase.from('receivings').select('id, batch_number').eq('status', 'RECEIVED').limit(1).single();
    if (!rec) {
      console.log('No unsorted receiving found');
      return;
    }
    console.log('Found receiving:', rec);

    const payload = {
      receiving_id: rec.id,
      leaf_weight: 120.0,
      stem_weight: 30.0,
      leaf_percentage: 80.0,
      quality_grade: 'A',
      is_standard_compliant: true,
      accepted_quantity: 120.0,
      rejected_quantity: 0,
      waste: 30.0,
      sorting_date: new Date().toISOString(),
    };

    console.log('Inserting payload:', payload);

    const { data, error } = await supabase
      .from('sortings')
      .insert([payload])
      .select(`
        *,
        receiving:receivings(id, batch_number, weight, farmer_id, farmer:farmers(name, phone_number))
      `)
      .single();

    if (error) {
      console.error('❌ Supabase insert error:', error);
    } else {
      console.log('✅ Insert success:', data);
    }

  } catch (err) {
    console.error('Crash error:', err);
  }
}

testInsertSorting();
