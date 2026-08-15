import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lkyoshivpvtggzrfruzd.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxreW9zaGl2cHZ0Z2d6cmZydXpkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjQ0OTk5OCwiZXhwIjoyMTAyMDI1OTk4fQ.0VAFkwI53yGZT1LBF9T_1h1n5zkEUk29UVURPBDYIfU';

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function seedComprehensiveMockData() {
  console.log('🚀 Memulai seeding data tiruan (Mock Data) komprehensif untuk ERP KhumKhum...\n');

  try {
    // ─────────────────────────────────────────────
    // 1. USERS & OPERATORS
    // ─────────────────────────────────────────────
    console.log('1. Seeding Users...');
    const users = [
      {
        id: '23bd0f70-a263-4118-b1d4-4a81793cc0a0',
        email: 'admin@khumkhum.id',
        password: '$2a$10$abcdefghijklmnopqrstuv', // hashed dummy
        name: 'Super Administrator',
        role: 'SUPER_ADMIN',
        is_active: true,
      },
      {
        id: 'a1111111-1111-1111-1111-111111111111',
        email: 'produksi@khumkhum.com',
        password: '$2a$10$abcdefghijklmnopqrstuv',
        name: 'Budi Santoso (Operator Produksi)',
        role: 'PRODUCTION',
        is_active: true,
      },
      {
        id: 'b2222222-2222-2222-2222-222222222222',
        email: 'qc@khumkhum.com',
        password: '$2a$10$abcdefghijklmnopqrstuv',
        name: 'Dewi Lestari (Quality Assurance)',
        role: 'QC',
        is_active: true,
      },
      {
        id: '2f89cec4-1a13-4dca-8a78-74dff1efe915',
        email: 'warehouse@khumkhum.com',
        password: '$2a$10$abcdefghijklmnopqrstuv',
        name: 'Rian Kurniawan (Kepala Gudang)',
        role: 'WAREHOUSE',
        is_active: true,
      },
      {
        id: '437a1fec-e513-4605-91d3-59b767571e10',
        email: 'management@khumkhum.com',
        password: '$2a$10$abcdefghijklmnopqrstuv',
        name: 'H. Suryadi (Direksi CV Khaira Buana Mas)',
        role: 'MANAGEMENT',
        is_active: true,
      },
    ];

    for (const u of users) {
      await supabase.from('users').upsert(u, { onConflict: 'id' });
    }
    console.log('   ✅ 5 Users ready');

    // ─────────────────────────────────────────────
    // 2. MASTER DATA (Farmers, Products, Raw Materials, Warehouses, Customers)
    // ─────────────────────────────────────────────
    console.log('2. Seeding Master Data KhumKhum...');
    
    // Farmers
    const farmers = [
      { id: 'f1111111-0000-0000-0000-000000000000', name: 'Pak Sugeng Riyadi', contact: 'Sugeng', phone_number: '081234567890', address: 'Kelompok Tani Tunas Makmur, Nanggulan, Kulon Progo' },
      { id: 'f2222222-0000-0000-0000-000000000000', name: 'Bu Siti Rahayu', contact: 'Siti', phone_number: '081234567891', address: 'Desa Agro Jamur Mandiri, Sentolo, Kulon Progo' },
      { id: 'f3333333-0000-0000-0000-000000000000', name: 'Pak Harto Wibowo', contact: 'Harto', phone_number: '081234567892', address: 'Dusun Kalibawang, Kulon Progo' },
      { id: 'f4444444-0000-0000-0000-000000000000', name: 'Pak Joko Subagyo', contact: 'Joko', phone_number: '081234567893', address: 'Desa Pengasih, Kulon Progo' },
    ];
    for (const f of farmers) await supabase.from('farmers').upsert(f, { onConflict: 'id' });

    // Products (Finished Goods Jamur Crispy)
    const products = [
      { id: '22222222-0000-0000-0000-000000000001', sku: 'FG-KHK-ORIG-100G', name: 'Jamur Crispy Original 100g', description: 'Jamur crispy gurih renyah original rasa otentik KhumKhum' },
      { id: '22222222-0000-0000-0000-000000000002', sku: 'FG-KHK-BLD-100G', name: 'Jamur Crispy Balado Pedas 100g', description: 'Jamur crispy bumbu balado pedas manis khas Minang' },
      { id: '22222222-0000-0000-0000-000000000003', sku: 'FG-KHK-BBQ-100G', name: 'Jamur Crispy BBQ Smoked 100g', description: 'Jamur crispy bumbu aroma barbekyu panggang lezat' },
      { id: '22222222-0000-0000-0000-000000000004', sku: 'FG-KHK-JGB-100G', name: 'Jamur Crispy Jagung Bakar 100g', description: 'Jamur crispy gurih manis jagung bakar mentega' },
      { id: '22222222-0000-0000-0000-000000000005', sku: 'FG-KHK-PDS-100G', name: 'Jamur Crispy Pedas Ekstra 100g', description: 'Jamur crispy sensasi cabai rawit pedas meledak' },
    ];
    for (const p of products) await supabase.from('products').upsert(p, { onConflict: 'id' });

    // Raw Materials
    const rawMaterials = [
      { id: '11111111-0000-0000-0000-000000000001', code: 'RM-JAMUR-BERSIH', name: 'Jamur Tiram Bersih Sortasi', uom: 'kg' },
      { id: '11111111-0000-0000-0000-000000000002', code: 'RM-TEPUNG-PREMIKS', name: 'Tepung Premiks Bumbu KhumKhum', uom: 'kg' },
      { id: '11111111-0000-0000-0000-000000000003', code: 'RM-MINYAK-SAWIT', name: 'Minyak Goreng Sawit Kemasan', uom: 'liter' },
      { id: '11111111-0000-0000-0000-000000000004', code: 'RM-BUMBU-BALADO', name: 'Bumbu Tabur Balado Pedas', uom: 'kg' },
      { id: '11111111-0000-0000-0000-000000000005', code: 'RM-BUMBU-BBQ', name: 'Bumbu Tabur BBQ Smoked', uom: 'kg' },
      { id: '11111111-0000-0000-0000-000000000006', code: 'RM-POUCH-100G', name: 'Kemasan Stand Pouch Alumunium 100g', uom: 'pcs' },
    ];
    for (const rm of rawMaterials) await supabase.from('raw_materials').upsert(rm, { onConflict: 'id' });

    // Warehouses
    const warehouses = [
      { id: '44444444-0000-0000-0000-000000000001', name: 'Gudang Bahan Baku (Pusat)', location: 'Lantai 1 - Area Bongkar & Sortasi' },
      { id: '44444444-0000-0000-0000-000000000002', name: 'Gudang Produk Jadi (Siap Jual)', location: 'Lantai 2 - Ruang AC Suhu Terkontrol' },
      { id: '44444444-0000-0000-0000-000000000003', name: 'Gudang Karantina & Afkir', location: 'Ruang Isolasi Pengujian' },
    ];
    for (const w of warehouses) await supabase.from('warehouses').upsert(w, { onConflict: 'id' });

    // Customers
    const customers = [
      { id: '33333333-0000-0000-0000-000000000001', name: 'Toko Oleh-oleh Bakpia Pathok 25', contact: 'Ibu Ratna', address: 'Jl. KS Tubun No. 50, Yogyakarta' },
      { id: '33333333-0000-0000-0000-000000000002', name: 'Distributor Snack Nusantara Jaya', contact: 'Pak Hendra', address: 'Kawasan Industri Candi, Semarang' },
      { id: '33333333-0000-0000-0000-000000000003', name: 'Pusat Jajanan Bandara YIA', contact: 'Mbak Lisa', address: 'Bandara Internasional Yogyakarta, Kulon Progo' },
    ];
    for (const c of customers) await supabase.from('customers').upsert(c, { onConflict: 'id' });
    console.log('   ✅ Master data 5 entitas ready');

    // ─────────────────────────────────────────────
    // 3. INVENTORY STOCK
    // ─────────────────────────────────────────────
    console.log('3. Seeding Inventory Stock...');
    const inventoryItems = [
      // Raw materials in warehouse 1
      { id: 'inv00001-0000-0000-0000-000000000001', warehouse_id: '44444444-0000-0000-0000-000000000001', item_type: 'RAW_MATERIAL', item_id: '11111111-0000-0000-0000-000000000001', batch_number: 'RM-SORTED-001', quantity: 380.0, reorder_point: 50.0 },
      { id: 'inv00001-0000-0000-0000-000000000002', warehouse_id: '44444444-0000-0000-0000-000000000001', item_type: 'RAW_MATERIAL', item_id: '11111111-0000-0000-0000-000000000002', batch_number: 'RM-TEPUNG-001', quantity: 150.0, reorder_point: 30.0 },
      { id: 'inv00001-0000-0000-0000-000000000003', warehouse_id: '44444444-0000-0000-0000-000000000001', item_type: 'RAW_MATERIAL', item_id: '11111111-0000-0000-0000-000000000003', batch_number: 'RM-MINYAK-001', quantity: 220.0, reorder_point: 40.0 },
      { id: 'inv00001-0000-0000-0000-000000000004', warehouse_id: '44444444-0000-0000-0000-000000000001', item_type: 'RAW_MATERIAL', item_id: '11111111-0000-0000-0000-000000000004', batch_number: 'RM-BALADO-001', quantity: 65.0, reorder_point: 10.0 },
      { id: 'inv00001-0000-0000-0000-000000000005', warehouse_id: '44444444-0000-0000-0000-000000000001', item_type: 'RAW_MATERIAL', item_id: '11111111-0000-0000-0000-000000000005', batch_number: 'RM-BBQ-001', quantity: 45.0, reorder_point: 10.0 },
      { id: 'inv00001-0000-0000-0000-000000000006', warehouse_id: '44444444-0000-0000-0000-000000000001', item_type: 'RAW_MATERIAL', item_id: '11111111-0000-0000-0000-000000000006', batch_number: 'RM-POUCH-001', quantity: 3500.0, reorder_point: 500.0 },

      // Finished goods in warehouse 2
      { id: 'inv00002-0000-0000-0000-000000000001', warehouse_id: '44444444-0000-0000-0000-000000000002', item_type: 'PRODUCT', item_id: '22222222-0000-0000-0000-000000000001', batch_number: 'PRD-20260814-1001', quantity: 500.0, reorder_point: 100.0 },
      { id: 'inv00002-0000-0000-0000-000000000002', warehouse_id: '44444444-0000-0000-0000-000000000002', item_type: 'PRODUCT', item_id: '22222222-0000-0000-0000-000000000002', batch_number: 'PRD-20260813-0902', quantity: 420.0, reorder_point: 80.0 },
    ];
    for (const inv of inventoryItems) await supabase.from('inventory').upsert(inv, { onConflict: 'id' });
    console.log('   ✅ 8 Inventory stock items ready');

    // ─────────────────────────────────────────────
    // 4. PRODUCTION ORDERS (Siklus 5 Skenario Batch!)
    // ─────────────────────────────────────────────
    console.log('4. Seeding Production Batches (5 Skenario Testing)...');
    
    // Batch 1: COMPLETED (Lolos QC)
    const batch1Id = '77777777-0000-0000-0000-000000000001';
    await supabase.from('production_orders').upsert({
      id: batch1Id,
      batch_number: 'PRD-20260814-1001',
      product_id: '22222222-0000-0000-0000-000000000001',
      product_variant: 'Jamur Crispy Original 100g',
      target_quantity: 500.0,
      input_weight: 60.0,
      output_weight: 50.0,
      yield_percentage: 83.33,
      is_yield_compliant: true,
      status: 'COMPLETED',
      start_date: new Date(Date.now() - 86400000 * 2).toISOString(),
      end_date: new Date(Date.now() - 86400000 * 1.8).toISOString(),
      created_by: 'a1111111-1111-1111-1111-111111111111',
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 1.8).toISOString(),
    }, { onConflict: 'id' });

    // Batch 1 Results & Materials
    await supabase.from('production_materials').upsert([
      { id: 'pm000001-0000-0000-0000-000000000001', production_order_id: batch1Id, raw_material_id: '11111111-0000-0000-0000-000000000001', consumption_quantity: 50.0 },
      { id: 'pm000001-0000-0000-0000-000000000002', production_order_id: batch1Id, raw_material_id: '11111111-0000-0000-0000-000000000002', consumption_quantity: 12.5 },
      { id: 'pm000001-0000-0000-0000-000000000003', production_order_id: batch1Id, raw_material_id: '11111111-0000-0000-0000-000000000003', consumption_quantity: 15.0 },
    ], { onConflict: 'id' });

    await supabase.from('production_results').upsert({
      id: 'pr000001-0000-0000-0000-000000000001',
      production_order_id: batch1Id,
      product_id: '22222222-0000-0000-0000-000000000001',
      finished_goods_quantity: 500.0,
      wip_quantity: 0.0,
      yield_percentage: 83.33,
    }, { onConflict: 'id' });

    // Batch 2: COMPLETED_WIP (Siap diuji QC oleh User!)
    const batch2Id = '77777777-0000-0000-0000-000000000002';
    await supabase.from('production_orders').upsert({
      id: batch2Id,
      batch_number: 'PRD-20260815-2002',
      product_id: '22222222-0000-0000-0000-000000000002',
      product_variant: 'Jamur Crispy Balado Pedas 100g',
      target_quantity: 400.0,
      input_weight: 50.0,
      output_weight: 41.5,
      yield_percentage: 83.0,
      is_yield_compliant: true,
      status: 'COMPLETED_WIP',
      start_date: new Date(Date.now() - 3600000 * 5).toISOString(),
      end_date: new Date(Date.now() - 3600000 * 2).toISOString(),
      created_by: 'a1111111-1111-1111-1111-111111111111',
      created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    }, { onConflict: 'id' });

    await supabase.from('production_materials').upsert([
      { id: 'pm000002-0000-0000-0000-000000000001', production_order_id: batch2Id, raw_material_id: '11111111-0000-0000-0000-000000000001', consumption_quantity: 40.0 },
      { id: 'pm000002-0000-0000-0000-000000000002', production_order_id: batch2Id, raw_material_id: '11111111-0000-0000-0000-000000000002', consumption_quantity: 10.0 },
      { id: 'pm000002-0000-0000-0000-000000000004', production_order_id: batch2Id, raw_material_id: '11111111-0000-0000-0000-000000000004', consumption_quantity: 3.2 },
    ], { onConflict: 'id' });

    // Batch 3: QC_PENDING dengan Warning Anomali Rendemen
    const batch3Id = '77777777-0000-0000-0000-000000000003';
    await supabase.from('production_orders').upsert({
      id: batch3Id,
      batch_number: 'PRD-20260815-2003',
      product_id: '22222222-0000-0000-0000-000000000003',
      product_variant: 'Jamur Crispy BBQ Smoked 100g',
      target_quantity: 300.0,
      input_weight: 40.0,
      output_weight: 30.5,
      yield_percentage: 76.25,
      is_yield_compliant: false,
      anomaly_reason: 'Kadar air jamur basah agak tinggi (sortasi Grade B) dan penirisan minyak spinner diperpanjang.',
      status: 'QC_PENDING',
      start_date: new Date(Date.now() - 3600000 * 3).toISOString(),
      end_date: new Date(Date.now() - 3600000 * 1).toISOString(),
      created_by: 'a1111111-1111-1111-1111-111111111111',
      created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 1).toISOString(),
    }, { onConflict: 'id' });

    // Batch 4: IN_PROGRESS (Sedang Dimasak di Wajan #2)
    const batch4Id = '77777777-0000-0000-0000-000000000004';
    await supabase.from('production_orders').upsert({
      id: batch4Id,
      batch_number: 'PRD-20260815-3004',
      product_id: '22222222-0000-0000-0000-000000000004',
      product_variant: 'Jamur Crispy Jagung Bakar 100g',
      target_quantity: 450.0,
      input_weight: 55.0,
      output_weight: null,
      yield_percentage: null,
      status: 'IN_PROGRESS',
      start_date: new Date(Date.now() - 3600000 * 1).toISOString(),
      created_by: 'a1111111-1111-1111-1111-111111111111',
      created_at: new Date(Date.now() - 3600000 * 1).toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

    await supabase.from('production_materials').upsert([
      { id: 'pm000004-0000-0000-0000-000000000001', production_order_id: batch4Id, raw_material_id: '11111111-0000-0000-0000-000000000001', consumption_quantity: 45.0 },
      { id: 'pm000004-0000-0000-0000-000000000002', production_order_id: batch4Id, raw_material_id: '11111111-0000-0000-0000-000000000002', consumption_quantity: 10.0 },
    ], { onConflict: 'id' });

    // Batch 5: DRAFT (SPK Baru Menunggu Konsumsi Bahan)
    const batch5Id = '77777777-0000-0000-0000-000000000005';
    await supabase.from('production_orders').upsert({
      id: batch5Id,
      batch_number: 'PRD-20260815-4005',
      product_id: '22222222-0000-0000-0000-000000000005',
      product_variant: 'Jamur Crispy Pedas Ekstra 100g',
      target_quantity: 600.0,
      input_weight: null,
      output_weight: null,
      yield_percentage: null,
      status: 'DRAFT',
      notes: 'Jadwal penggorengan shift sore wajan #1',
      start_date: new Date().toISOString(),
      created_by: 'a1111111-1111-1111-1111-111111111111',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

    console.log('   ✅ 5 Production batches seeded (Completed, Ready QC, Warning Yield, In Progress, Draft)');

    // ─────────────────────────────────────────────
    // 5. QC INSPECTIONS & DEFECT TALLY
    // ─────────────────────────────────────────────
    console.log('5. Seeding QC Inspections (Pareto & Certificates)...');
    const qcInspections = [
      {
        id: '99999999-0000-0000-0000-000000000001',
        reference_type: 'PRODUCTION',
        reference_id: batch1Id,
        batch_id: 'PRD-20260814-1001',
        sample_size: 50,
        defect_burnt: 1,
        defect_salty: 0,
        defect_leaking_pack: 0,
        defect_crushed: 0,
        defect_soggy: 0,
        total_defects: 1,
        defect_rate: 2.0,
        decision: 'RELEASED',
        is_passed: true,
        defect_type: 'Gosong minor 1 pcs',
        notes: 'Warna kuning keemasan, kerenyahan sangat baik, seal kemasan rapat sempurna.',
        inspected_by: 'b2222222-2222-2222-2222-222222222222',
        inspector_id: 'b2222222-2222-2222-2222-222222222222',
        inspection_date: new Date(Date.now() - 86400000 * 1.8).toISOString(),
        created_at: new Date(Date.now() - 86400000 * 1.8).toISOString(),
      },
      {
        id: '99999999-0000-0000-0000-000000000002',
        reference_type: 'PRODUCTION',
        reference_id: batch1Id,
        batch_id: 'PRD-20260813-0902',
        sample_size: 50,
        defect_burnt: 0,
        defect_salty: 1,
        defect_leaking_pack: 2,
        defect_crushed: 0,
        defect_soggy: 0,
        total_defects: 3,
        defect_rate: 6.0,
        decision: 'REWORK',
        is_passed: false,
        defect_type: 'Kemasan bocor 2 pcs, bumbu gumpal 1 pcs',
        notes: 'Dua kemasan sealer kurang panas, diarahkan re-pack kemasan baru.',
        inspected_by: 'b2222222-2222-2222-2222-222222222222',
        inspector_id: 'b2222222-2222-2222-2222-222222222222',
        inspection_date: new Date(Date.now() - 86400000 * 3).toISOString(),
        created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
      },
      {
        id: '99999999-0000-0000-0000-000000000003',
        reference_type: 'PRODUCTION',
        reference_id: batch1Id,
        batch_id: 'PRD-20260812-0801',
        sample_size: 50,
        defect_burnt: 4,
        defect_salty: 2,
        defect_leaking_pack: 3,
        defect_crushed: 1,
        defect_soggy: 2,
        total_defects: 12,
        defect_rate: 24.0,
        decision: 'REJECTED',
        is_passed: false,
        defect_type: 'Gosong berlebih & melempem',
        notes: 'Suhu minyak sempat melonjak > 190°C. Batch dialihkan ke gudang afkir.',
        inspected_by: 'b2222222-2222-2222-2222-222222222222',
        inspector_id: 'b2222222-2222-2222-2222-222222222222',
        inspection_date: new Date(Date.now() - 86400000 * 4).toISOString(),
        created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
      },
    ];

    for (const qc of qcInspections) {
      await supabase.from('qc_inspections').upsert(qc, { onConflict: 'id' });
    }
    console.log('   ✅ 3 QC Inspections ready (Released, Rework, Rejected for Pareto)');

    // ─────────────────────────────────────────────
    // 6. INBOUND RECEIVINGS & SORTINGS (Untuk Traceability)
    // ─────────────────────────────────────────────
    console.log('6. Seeding Receivings & Sortings...');
    const receivings = [
      {
        id: '55555555-0000-0000-0000-000000000001',
        batch_number: 'RM-20260814-001',
        farmer_id: 'f1111111-0000-0000-0000-000000000000',
        raw_material_id: '11111111-0000-0000-0000-000000000001',
        weight: 120.0,
        weight_sent: 121.0,
        weight_difference: -1.0,
        diff_percentage: -0.83,
        status: 'SORTED',
        received_date: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
      {
        id: '55555555-0000-0000-0000-000000000002',
        batch_number: 'RM-20260815-002',
        farmer_id: 'f2222222-0000-0000-0000-000000000000',
        raw_material_id: '11111111-0000-0000-0000-000000000001',
        weight: 95.0,
        weight_sent: 95.0,
        weight_difference: 0.0,
        diff_percentage: 0.0,
        status: 'SORTED',
        received_date: new Date(Date.now() - 86400000 * 1).toISOString(),
      },
    ];

    for (const r of receivings) await supabase.from('receivings').upsert(r, { onConflict: 'id' });

    const sortings = [
      {
        id: '66666666-0000-0000-0000-000000000001',
        receiving_id: '55555555-0000-0000-0000-000000000001',
        leaf_weight: 100.0,
        stem_weight: 20.0,
        leaf_percentage: 83.33,
        quality_grade: 'A',
        accepted_quantity: 100.0,
        rejected_quantity: 0.0,
        waste: 20.0,
        sorting_date: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
      {
        id: '66666666-0000-0000-0000-000000000002',
        receiving_id: '55555555-0000-0000-0000-000000000002',
        leaf_weight: 78.0,
        stem_weight: 17.0,
        leaf_percentage: 82.1,
        quality_grade: 'A',
        accepted_quantity: 78.0,
        rejected_quantity: 0.0,
        waste: 17.0,
        sorting_date: new Date(Date.now() - 86400000 * 1).toISOString(),
      },
    ];

    for (const s of sortings) await supabase.from('sortings').upsert(s, { onConflict: 'id' });
    console.log('   ✅ Inbound receiving & sortings ready');

    console.log('\n🎉 SEMUA MOCK DATA BERHASIL DITANAM KE SUPABASE LIVE!');
    console.log('----------------------------------------------------');
    console.log('Data siap digunakan untuk testing:');
    console.log('1. Lini Produksi (/production) -> 5 Batch dengan berbagai status');
    console.log('2. Quality Control (/quality-control) -> 2 Batch di antrean QC & riwayat Pareto');
    console.log('3. Standar Produksi & QC (/master/production-standards & /qc-standards)');
    console.log('4. AI Forecast (/ai-forecast) -> Proyeksi MRP 4 minggu');
    console.log('----------------------------------------------------');

  } catch (err) {
    console.error('❌ Gagal seeding mock data:', err);
  }
}

seedComprehensiveMockData();
