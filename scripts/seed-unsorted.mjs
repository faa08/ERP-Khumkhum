import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lkyoshivpvtggzrfruzd.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxreW9zaGl2cHZ0Z2d6cmZydXpkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjQ0OTk5OCwiZXhwIjoyMTAyMDI1OTk4fQ.0VAFkwI53yGZT1LBF9T_1h1n5zkEUk29UVURPBDYIfU';

const supabase = createClient(supabaseUrl, serviceKey);

async function seedUnsortedReceiving() {
  console.log('Menambahkan batch penerimaan jamur baru (status: RECEIVED) untuk testing sortasi...');

  const newReceivings = [
    {
      id: '55555555-0000-0000-0000-000000000003',
      batch_number: 'RM-20260815-003',
      farmer_id: 'f3333333-0000-0000-0000-000000000000', // Pak Harto
      raw_material_id: '11111111-0000-0000-0000-000000000001',
      weight: 150.0,
      weight_sent: 151.0,
      weight_difference: -1.0,
      diff_percentage: -0.66,
      status: 'RECEIVED',
      received_date: new Date().toISOString(),
    },
    {
      id: '55555555-0000-0000-0000-000000000004',
      batch_number: 'RM-20260815-004',
      farmer_id: 'f4444444-0000-0000-0000-000000000000', // Pak Joko
      raw_material_id: '11111111-0000-0000-0000-000000000001',
      weight: 200.0,
      weight_sent: 200.0,
      weight_difference: 0.0,
      diff_percentage: 0.0,
      status: 'RECEIVED',
      received_date: new Date().toISOString(),
    },
  ];

  for (const r of newReceivings) {
    await supabase.from('receivings').upsert(r, { onConflict: 'id' });
  }

  console.log('✅ 2 Penerimaan baru (RM-20260815-003 & RM-20260815-004) siap disortir!');
}

seedUnsortedReceiving();
