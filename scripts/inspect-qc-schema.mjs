import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lkyoshivpvtggzrfruzd.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxreW9zaGl2cHZ0Z2d6cmZydXpkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjQ0OTk5OCwiZXhwIjoyMTAyMDI1OTk4fQ.0VAFkwI53yGZT1LBF9T_1h1n5zkEUk29UVURPBDYIfU';

const supabase = createClient(supabaseUrl, serviceKey);

async function inspectQcSchema() {
  console.log('Inspecting qc_inspections table in live Supabase...');
  try {
    const { data: sample, error } = await supabase
      .from('qc_inspections')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Error selecting from qc_inspections:', error);
      return;
    }

    console.log('Columns in qc_inspections:', Object.keys(sample[0] || {}));
    console.log('Sample row:', sample[0]);
  } catch (err) {
    console.error('Crash error:', err);
  }
}

inspectQcSchema();
