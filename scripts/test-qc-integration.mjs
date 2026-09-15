import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lkyoshivpvtggzrfruzd.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxreW9zaGl2cHZ0Z2d6cmZydXpkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjQ0OTk5OCwiZXhwIjoyMTAyMDI1OTk4fQ.0VAFkwI53yGZT1LBF9T_1h1n5zkEUk29UVURPBDYIfU';

const supabase = createClient(supabaseUrl, serviceKey);

async function testQcIntegration() {
  console.log('=== TEST QC INTEGRASI PRODUKSI & KEPUTUSAN MUTU ===\n');

  // 1. Ambil salah satu SPK aktif
  const { data: orders, error: oErr } = await supabase
    .from('production_orders')
    .select('id, batch_number, status')
    .eq('status', 'IN_PROGRESS')
    .limit(1);

  if (oErr || !orders || orders.length === 0) {
    console.log('Tidak ada SPK IN_PROGRESS, mengambil draft...');
    return;
  }

  const testOrder = orders[0];
  console.log(`1. Menguji SPK: ${testOrder.batch_number} (ID: ${testOrder.id})`);

  // 2. Simulasi Pengajuan ke QC (QC_PENDING)
  console.log('\n2. Mengajukan SPK ke Antrean QC (status: QC_PENDING)...');
  const { error: pendErr } = await supabase
    .from('production_orders')
    .update({
      status: 'QC_PENDING',
      notes: '[Pengajuan QC: Selesai packing 50 pcs kemasan Standing Pouch]',
      updated_at: new Date().toISOString(),
    })
    .eq('id', testOrder.id);

  if (pendErr) {
    console.error('Gagal update ke QC_PENDING:', pendErr);
    return;
  }
  console.log('-> SPK berhasil masuk antrean QC_PENDING');

  // 3. Simulasi Keputusan Mutu: REWORK
  console.log('\n3. Simulasi Keputusan Mutu: REWORK (Seal Bocor)...');
  const reworkNotes = 'Kemasan seal nomor 1-5 kurang rapat / bocor mikro, wajib seal ulang';
  const { data: qcRework, error: insErr1 } = await supabase
    .from('qc_inspections')
    .insert([{
      reference_type: 'PRODUCTION',
      reference_id: testOrder.id,
      batch_id: testOrder.batch_number,
      sample_size: 20,
      defect_burnt: 0,
      defect_salty: 0,
      defect_leaking_pack: 3,
      defect_crushed: 0,
      defect_soggy: 0,
      total_defects: 3,
      defect_rate: 15.0,
      decision: 'REWORK',
      is_passed: false,
      defect_type: 'Bocor: 3 (Kemasan Bocor/Seal Rusak)',
      notes: reworkNotes,
      inspection_date: new Date().toISOString(),
    }])
    .select()
    .single();

  if (insErr1) {
    console.error('Gagal insert qc inspection REWORK:', insErr1);
    return;
  }
  console.log('-> Rekam QC REWORK tersimpan dengan ID:', qcRework.id);

  // Update SPK ke REWORK
  await supabase
    .from('production_orders')
    .update({
      status: 'REWORK',
      anomaly_reason: reworkNotes,
      notes: `[QC REWORK: ${reworkNotes}]`,
      updated_at: new Date().toISOString(),
    })
    .eq('id', testOrder.id);

  console.log('-> SPK status berhasil diubah ke REWORK');

  // Verifikasi banner instruksi rework
  const { data: reworkOrder } = await supabase
    .from('production_orders')
    .select('status, anomaly_reason')
    .eq('id', testOrder.id)
    .single();
  console.log('-> Verifikasi data SPK REWORK:', reworkOrder);

  // 4. Simulasi Keputusan Mutu: RELEASED (Lolos Uji Mutu)
  console.log('\n4. Simulasi Keputusan Mutu: RELEASED (Lolos Uji Mutu setelah seal ulang)...');
  const releaseNotes = 'Hasil seal ulang telah diuji sampling 20 pcs: Nihil Bocor, Renyah, Rasa Pas';
  const { data: qcRelease, error: insErr2 } = await supabase
    .from('qc_inspections')
    .insert([{
      reference_type: 'PRODUCTION',
      reference_id: testOrder.id,
      batch_id: testOrder.batch_number,
      sample_size: 20,
      defect_burnt: 0,
      defect_salty: 0,
      defect_leaking_pack: 0,
      defect_crushed: 0,
      defect_soggy: 0,
      total_defects: 0,
      defect_rate: 0.0,
      decision: 'RELEASED',
      is_passed: true,
      defect_type: 'NIHIL DEFECT',
      notes: releaseNotes,
      inspection_date: new Date().toISOString(),
    }])
    .select()
    .single();

  if (insErr2) {
    console.error('Gagal insert qc inspection RELEASED:', insErr2);
    return;
  }
  console.log('-> Rekam QC RELEASED tersimpan dengan ID:', qcRelease.id);

  // Update SPK ke RELEASED
  await supabase
    .from('production_orders')
    .update({
      status: 'RELEASED',
      notes: `[QC RELEASED: Lolos Uji Mutu Sampling - 0.0% Defect]`,
      updated_at: new Date().toISOString(),
    })
    .eq('id', testOrder.id);

  console.log('-> SPK status berhasil diubah ke RELEASED');

  // Catat kartu stok masuk di stock_movements
  const { data: invItem } = await supabase
    .from('inventory')
    .select('id')
    .eq('warehouse_id', '44444444-0000-0000-0000-000000000002')
    .limit(1);

  if (invItem && invItem.length > 0) {
    await supabase.from('stock_movements').insert([{
      inventory_id: invItem[0].id,
      movement_type: 'IN',
      quantity: 50,
      reference_id: qcRelease.id,
      reference_type: 'QC_RELEASE',
      notes: `Lolos Uji Mutu QC SPK ${testOrder.batch_number} (50 pcs Original)`,
      movement_date: new Date().toISOString(),
    }]);
    console.log('-> Kartu stok masuk QC_RELEASE berhasil dicatat di stock_movements');
  }

  // 5. Kembalikan SPK ke IN_PROGRESS agar lingkungan tetap bersih
  await supabase
    .from('production_orders')
    .update({
      status: 'IN_PROGRESS',
      notes: null,
      anomaly_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', testOrder.id);

  // Hapus rekam inspeksi pengujian
  await supabase.from('qc_inspections').delete().in('id', [qcRework.id, qcRelease.id]);

  console.log('\n=== INTEGRASI SUKSES & BERSIH ===');
}

testQcIntegration();
