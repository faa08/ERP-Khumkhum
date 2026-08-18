import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lkyoshivpvtggzrfruzd.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxreW9zaGl2cHZ0Z2d6cmZydXpkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjQ0OTk5OCwiZXhwIjoyMTAyMDI1OTk4fQ.0VAFkwI53yGZT1LBF9T_1h1n5zkEUk29UVURPBDYIfU';

const supabase = createClient(supabaseUrl, serviceKey);

async function testQcDecision() {
  console.log('Testing createQcInspection database payload...');
  try {
    const { data: po } = await supabase
      .from('production_orders')
      .select('id, batch_number')
      .in('status', ['COMPLETED_WIP', 'QC_PENDING', 'DRAFT'])
      .limit(1)
      .single();

    if (!po) {
      console.log('No production order found');
      return;
    }
    console.log('Testing on production order:', po);

    const now = new Date().toISOString();
    const payload = {
      reference_type: 'PRODUCTION',
      reference_id: po.id,
      sample_size: 50,
      defect_rate: 20.0,
      decision: 'REWORK',
      is_passed: false,
      defect_type: 'Gosong: 10, Asin: 0, Bocor: 0, Remuk: 0, Melempem: 0 (Total: 10)',
      notes: 'jangan terlalu matang',
      inspected_by: null,
      inspection_date: now,
      created_at: now,
    };

    const { data, error } = await supabase
      .from('qc_inspections')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error('❌ Insert error on qc_inspections:', error);
    } else {
      console.log('✅ QC inspection created successfully:', data);
    }

  } catch (err) {
    console.error('Crash error:', err);
  }
}

testQcDecision();
