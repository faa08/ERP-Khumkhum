-- ==============================================================================
-- MOCK DATA UNTUK UJI COBA AI FORECASTING
-- KhumKhum ERP — Jamur Crispy
--
-- Data ini mencakup 8 minggu historis untuk menguji:
-- ✅ Holt's Double Exponential Smoothing (tren naik)
-- ✅ Agregasi per ISO week (multiple batch per minggu)
-- ✅ Multi-source fallback (production → receiving → sorting)
-- ✅ BOM recipe dari settings
-- ✅ Stok gudang aktual (inventory)
-- ✅ Cross-validation production_materials
-- ✅ QC Inspections (campuran pass/fail)
-- ✅ Sales Orders aktif
--
-- CARA PAKAI:
-- 1. Buka Supabase SQL Editor
-- 2. Paste dan jalankan script ini
-- 3. Buka halaman AI Forecasting di aplikasi
-- ==============================================================================

-- ============================================================================
-- 0. MASTER DATA — Bahan Baku (Raw Materials) untuk KhumKhum Jamur Crispy
-- ============================================================================

INSERT INTO raw_materials (id, code, name, uom, min_stock, rop, material_category) VALUES
('aa000001-0000-0000-0000-000000000001', 'RM-JMR-01', 'Jamur Tiram Segar', 'kg', 100, 200, 'Jamur'),
('aa000001-0000-0000-0000-000000000002', 'RM-TPG-01', 'Tepung Premiks Bumbu', 'kg', 30, 50, 'Tepung'),
('aa000001-0000-0000-0000-000000000003', 'RM-MNY-01', 'Minyak Goreng Kelapa Sawit', 'liter', 50, 80, 'Minyak'),
('aa000001-0000-0000-0000-000000000004', 'RM-BMB-01', 'Bumbu Tabur Balado', 'kg', 5, 10, 'Bumbu'),
('aa000001-0000-0000-0000-000000000005', 'RM-KMS-01', 'Kemasan Stand Pouch 100g', 'pcs', 500, 1000, 'Packaging')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  material_category = EXCLUDED.material_category,
  min_stock = EXCLUDED.min_stock,
  rop = EXCLUDED.rop;

-- Products (Finished Goods)
INSERT INTO products (id, sku, name, description) VALUES
('bb000001-0000-0000-0000-000000000001', 'FG-JC-ORI', 'Jamur Crispy Original 100g', 'Keripik jamur tiram crispy rasa original'),
('bb000001-0000-0000-0000-000000000002', 'FG-JC-BLD', 'Jamur Crispy Balado 100g', 'Keripik jamur tiram crispy rasa balado'),
('bb000001-0000-0000-0000-000000000003', 'FG-JC-KJU', 'Jamur Crispy Keju 100g', 'Keripik jamur tiram crispy rasa keju')
ON CONFLICT (id) DO NOTHING;

-- Farmers
INSERT INTO farmers (id, name, contact, phone_number, address, price_per_kg) VALUES
('cc000001-0000-0000-0000-000000000001', 'Pak Ahmad', 'Ahmad', '081200001111', 'Desa Ciburial, Bandung', 15000),
('cc000001-0000-0000-0000-000000000002', 'Bu Rina', 'Rina', '081200002222', 'Desa Sukatani, Garut', 14500),
('cc000001-0000-0000-0000-000000000003', 'Pak Dedi', 'Dedi', '081200003333', 'Desa Cikajang, Garut', 15500)
ON CONFLICT (id) DO NOTHING;

-- Customers
INSERT INTO customers (id, name, contact, address) VALUES
('dd000001-0000-0000-0000-000000000001', 'CV Mandiri Snack', 'Budi Santoso', 'Jl. Industri 45, Bandung'),
('dd000001-0000-0000-0000-000000000002', 'UD Makmur Jaya', 'Sri Mulyani', 'Jl. Raya Cimahi 12, Cimahi'),
('dd000001-0000-0000-0000-000000000003', 'Toko Oleh-oleh Nusantara', 'Agus Prasetyo', 'Jl. Dago 88, Bandung')
ON CONFLICT (id) DO NOTHING;

-- Warehouses
INSERT INTO warehouses (id, name, location) VALUES
('ee000001-0000-0000-0000-000000000001', 'Gudang Bahan Baku', 'Area Produksi KhumKhum'),
('ee000001-0000-0000-0000-000000000002', 'Gudang Produk Jadi', 'Area Distribusi KhumKhum')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 1. SETTINGS — BOM Recipe (Production Standards)
-- ============================================================================

INSERT INTO settings (key, value) VALUES
(
  'production_standards',
  '{
    "min_yield_percentage": 80.0,
    "warning_yield_percentage": 75.0,
    "oil_temp_min": 160,
    "oil_temp_max": 180,
    "frying_duration_minutes": 15,
    "spinning_duration_minutes": 5,
    "bom_recipes": [
      {
        "product_name": "Jamur Crispy Original 100g",
        "raw_mushroom_ratio": 1.0,
        "premix_flour_ratio": 0.25,
        "cooking_oil_ratio": 0.30,
        "seasoning_ratio": 0.05
      }
    ]
  }'::jsonb
)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- ============================================================================
-- 2. RECEIVINGS — 8 Minggu Data Penerimaan Jamur Segar
--    Tren: perlahan naik dari ~460 ke ~580 kg/minggu
-- ============================================================================

-- Minggu 1 (8 minggu lalu) — ~460 kg total
INSERT INTO receivings (id, batch_number, farmer_id, raw_material_id, weight, weight_sent, status, received_date, created_at) VALUES
('11aaa001-0001-0000-0000-000000000001', 'RCV-W1-001', 'cc000001-0000-0000-0000-000000000001', 'aa000001-0000-0000-0000-000000000001', 250.00, 252.00, 'SORTED', NOW() - INTERVAL '53 days', NOW() - INTERVAL '53 days'),
('11aaa001-0001-0000-0000-000000000002', 'RCV-W1-002', 'cc000001-0000-0000-0000-000000000002', 'aa000001-0000-0000-0000-000000000001', 210.00, 210.00, 'SORTED', NOW() - INTERVAL '51 days', NOW() - INTERVAL '51 days')
ON CONFLICT (id) DO NOTHING;

-- Minggu 2 (7 minggu lalu) — ~480 kg
INSERT INTO receivings (id, batch_number, farmer_id, raw_material_id, weight, weight_sent, status, received_date, created_at) VALUES
('11aaa001-0002-0000-0000-000000000001', 'RCV-W2-001', 'cc000001-0000-0000-0000-000000000001', 'aa000001-0000-0000-0000-000000000001', 260.00, 262.00, 'SORTED', NOW() - INTERVAL '46 days', NOW() - INTERVAL '46 days'),
('11aaa001-0002-0000-0000-000000000002', 'RCV-W2-002', 'cc000001-0000-0000-0000-000000000003', 'aa000001-0000-0000-0000-000000000001', 220.00, 222.00, 'SORTED', NOW() - INTERVAL '44 days', NOW() - INTERVAL '44 days')
ON CONFLICT (id) DO NOTHING;

-- Minggu 3 (6 minggu lalu) — ~470 kg
INSERT INTO receivings (id, batch_number, farmer_id, raw_material_id, weight, weight_sent, status, received_date, created_at) VALUES
('11aaa001-0003-0000-0000-000000000001', 'RCV-W3-001', 'cc000001-0000-0000-0000-000000000002', 'aa000001-0000-0000-0000-000000000001', 240.00, 242.00, 'SORTED', NOW() - INTERVAL '39 days', NOW() - INTERVAL '39 days'),
('11aaa001-0003-0000-0000-000000000002', 'RCV-W3-002', 'cc000001-0000-0000-0000-000000000001', 'aa000001-0000-0000-0000-000000000001', 230.00, 230.00, 'SORTED', NOW() - INTERVAL '37 days', NOW() - INTERVAL '37 days')
ON CONFLICT (id) DO NOTHING;

-- Minggu 4 (5 minggu lalu) — ~510 kg
INSERT INTO receivings (id, batch_number, farmer_id, raw_material_id, weight, weight_sent, status, received_date, created_at) VALUES
('11aaa001-0004-0000-0000-000000000001', 'RCV-W4-001', 'cc000001-0000-0000-0000-000000000003', 'aa000001-0000-0000-0000-000000000001', 270.00, 272.00, 'SORTED', NOW() - INTERVAL '32 days', NOW() - INTERVAL '32 days'),
('11aaa001-0004-0000-0000-000000000002', 'RCV-W4-002', 'cc000001-0000-0000-0000-000000000001', 'aa000001-0000-0000-0000-000000000001', 240.00, 240.00, 'SORTED', NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days')
ON CONFLICT (id) DO NOTHING;

-- Minggu 5 (4 minggu lalu) — ~530 kg
INSERT INTO receivings (id, batch_number, farmer_id, raw_material_id, weight, weight_sent, status, received_date, created_at) VALUES
('11aaa001-0005-0000-0000-000000000001', 'RCV-W5-001', 'cc000001-0000-0000-0000-000000000001', 'aa000001-0000-0000-0000-000000000001', 280.00, 282.00, 'SORTED', NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days'),
('11aaa001-0005-0000-0000-000000000002', 'RCV-W5-002', 'cc000001-0000-0000-0000-000000000002', 'aa000001-0000-0000-0000-000000000001', 250.00, 252.00, 'SORTED', NOW() - INTERVAL '23 days', NOW() - INTERVAL '23 days')
ON CONFLICT (id) DO NOTHING;

-- Minggu 6 (3 minggu lalu) — ~550 kg
INSERT INTO receivings (id, batch_number, farmer_id, raw_material_id, weight, weight_sent, status, received_date, created_at) VALUES
('11aaa001-0006-0000-0000-000000000001', 'RCV-W6-001', 'cc000001-0000-0000-0000-000000000003', 'aa000001-0000-0000-0000-000000000001', 300.00, 302.00, 'SORTED', NOW() - INTERVAL '18 days', NOW() - INTERVAL '18 days'),
('11aaa001-0006-0000-0000-000000000002', 'RCV-W6-002', 'cc000001-0000-0000-0000-000000000001', 'aa000001-0000-0000-0000-000000000001', 250.00, 250.00, 'SORTED', NOW() - INTERVAL '16 days', NOW() - INTERVAL '16 days')
ON CONFLICT (id) DO NOTHING;

-- Minggu 7 (2 minggu lalu) — ~540 kg
INSERT INTO receivings (id, batch_number, farmer_id, raw_material_id, weight, weight_sent, status, received_date, created_at) VALUES
('11aaa001-0007-0000-0000-000000000001', 'RCV-W7-001', 'cc000001-0000-0000-0000-000000000002', 'aa000001-0000-0000-0000-000000000001', 290.00, 292.00, 'SORTED', NOW() - INTERVAL '11 days', NOW() - INTERVAL '11 days'),
('11aaa001-0007-0000-0000-000000000002', 'RCV-W7-002', 'cc000001-0000-0000-0000-000000000001', 'aa000001-0000-0000-0000-000000000001', 250.00, 252.00, 'SORTED', NOW() - INTERVAL '9 days', NOW() - INTERVAL '9 days')
ON CONFLICT (id) DO NOTHING;

-- Minggu 8 (minggu lalu) — ~580 kg
INSERT INTO receivings (id, batch_number, farmer_id, raw_material_id, weight, weight_sent, status, received_date, created_at) VALUES
('11aaa001-0008-0000-0000-000000000001', 'RCV-W8-001', 'cc000001-0000-0000-0000-000000000001', 'aa000001-0000-0000-0000-000000000001', 310.00, 312.00, 'SORTED', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),
('11aaa001-0008-0000-0000-000000000002', 'RCV-W8-002', 'cc000001-0000-0000-0000-000000000003', 'aa000001-0000-0000-0000-000000000001', 270.00, 272.00, 'SORTED', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 3. SORTINGS — Sortasi setelah penerimaan
-- ============================================================================

INSERT INTO sortings (id, receiving_id, leaf_weight, stem_weight, leaf_percentage, quality_grade, accepted_quantity, rejected_quantity, waste, sorting_date, created_at) VALUES
-- Minggu 1
('22aaa001-0001-0000-0000-000000000001', '11aaa001-0001-0000-0000-000000000001', 210.00, 30.00, 87.50, 'A', 210.00, 10.00, 30.00, NOW() - INTERVAL '52 days', NOW() - INTERVAL '52 days'),
('22aaa001-0001-0000-0000-000000000002', '11aaa001-0001-0000-0000-000000000002', 175.00, 25.00, 87.50, 'A', 175.00, 10.00, 25.00, NOW() - INTERVAL '50 days', NOW() - INTERVAL '50 days'),
-- Minggu 2
('22aaa001-0002-0000-0000-000000000001', '11aaa001-0002-0000-0000-000000000001', 220.00, 30.00, 88.00, 'A', 220.00, 10.00, 20.00, NOW() - INTERVAL '45 days', NOW() - INTERVAL '45 days'),
('22aaa001-0002-0000-0000-000000000002', '11aaa001-0002-0000-0000-000000000002', 185.00, 25.00, 88.10, 'A', 185.00, 10.00, 25.00, NOW() - INTERVAL '43 days', NOW() - INTERVAL '43 days'),
-- Minggu 3
('22aaa001-0003-0000-0000-000000000001', '11aaa001-0003-0000-0000-000000000001', 200.00, 30.00, 86.96, 'A', 200.00, 10.00, 30.00, NOW() - INTERVAL '38 days', NOW() - INTERVAL '38 days'),
('22aaa001-0003-0000-0000-000000000002', '11aaa001-0003-0000-0000-000000000002', 195.00, 25.00, 88.64, 'A', 195.00, 10.00, 25.00, NOW() - INTERVAL '36 days', NOW() - INTERVAL '36 days'),
-- Minggu 4
('22aaa001-0004-0000-0000-000000000001', '11aaa001-0004-0000-0000-000000000001', 230.00, 30.00, 88.46, 'A', 230.00, 10.00, 30.00, NOW() - INTERVAL '31 days', NOW() - INTERVAL '31 days'),
('22aaa001-0004-0000-0000-000000000002', '11aaa001-0004-0000-0000-000000000002', 200.00, 30.00, 86.96, 'B', 200.00, 10.00, 30.00, NOW() - INTERVAL '29 days', NOW() - INTERVAL '29 days'),
-- Minggu 5
('22aaa001-0005-0000-0000-000000000001', '11aaa001-0005-0000-0000-000000000001', 240.00, 30.00, 88.89, 'A', 240.00, 10.00, 30.00, NOW() - INTERVAL '24 days', NOW() - INTERVAL '24 days'),
('22aaa001-0005-0000-0000-000000000002', '11aaa001-0005-0000-0000-000000000002', 210.00, 30.00, 87.50, 'A', 210.00, 10.00, 30.00, NOW() - INTERVAL '22 days', NOW() - INTERVAL '22 days'),
-- Minggu 6
('22aaa001-0006-0000-0000-000000000001', '11aaa001-0006-0000-0000-000000000001', 260.00, 30.00, 89.66, 'A', 260.00, 10.00, 30.00, NOW() - INTERVAL '17 days', NOW() - INTERVAL '17 days'),
('22aaa001-0006-0000-0000-000000000002', '11aaa001-0006-0000-0000-000000000002', 210.00, 30.00, 87.50, 'A', 210.00, 10.00, 30.00, NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days'),
-- Minggu 7
('22aaa001-0007-0000-0000-000000000001', '11aaa001-0007-0000-0000-000000000001', 245.00, 35.00, 87.50, 'A', 245.00, 10.00, 35.00, NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'),
('22aaa001-0007-0000-0000-000000000002', '11aaa001-0007-0000-0000-000000000002', 210.00, 30.00, 87.50, 'B', 210.00, 10.00, 30.00, NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days'),
-- Minggu 8
('22aaa001-0008-0000-0000-000000000001', '11aaa001-0008-0000-0000-000000000001', 265.00, 35.00, 88.33, 'A', 265.00, 10.00, 35.00, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
('22aaa001-0008-0000-0000-000000000002', '11aaa001-0008-0000-0000-000000000002', 230.00, 30.00, 88.46, 'A', 230.00, 10.00, 30.00, NOW() - INTERVAL '1 days', NOW() - INTERVAL '1 days')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 4. PRODUCTION ORDERS — 8 Minggu Batch Produksi
--    Tren naik: 380 → 490 kg input
--    Yield bervariasi: 77-86% (beberapa di bawah target 80%)
-- ============================================================================

INSERT INTO production_orders (id, batch_number, product_id, product_variant, status, input_weight, output_weight, yield_percentage, is_yield_compliant, start_date, end_date, created_at) VALUES
-- Minggu 1 (8 minggu lalu) — total input: 380 kg
('33aaa001-0001-0000-0000-000000000001', 'PRD-W1-001', 'bb000001-0000-0000-0000-000000000001', 'Original', 'COMPLETED', 200.00, 164.00, 82.00, true, NOW() - INTERVAL '52 days', NOW() - INTERVAL '51 days', NOW() - INTERVAL '52 days'),
('33aaa001-0001-0000-0000-000000000002', 'PRD-W1-002', 'bb000001-0000-0000-0000-000000000002', 'Balado', 'COMPLETED', 180.00, 141.00, 78.33, false, NOW() - INTERVAL '51 days', NOW() - INTERVAL '50 days', NOW() - INTERVAL '51 days'),
-- Minggu 2 — total input: 420 kg
('33aaa001-0002-0000-0000-000000000001', 'PRD-W2-001', 'bb000001-0000-0000-0000-000000000001', 'Original', 'COMPLETED', 220.00, 183.00, 83.18, true, NOW() - INTERVAL '45 days', NOW() - INTERVAL '44 days', NOW() - INTERVAL '45 days'),
('33aaa001-0002-0000-0000-000000000002', 'PRD-W2-002', 'bb000001-0000-0000-0000-000000000003', 'Keju', 'COMPLETED', 200.00, 168.00, 84.00, true, NOW() - INTERVAL '44 days', NOW() - INTERVAL '43 days', NOW() - INTERVAL '44 days'),
-- Minggu 3 — total input: 390 kg
('33aaa001-0003-0000-0000-000000000001', 'PRD-W3-001', 'bb000001-0000-0000-0000-000000000001', 'Original', 'COMPLETED', 200.00, 158.00, 79.00, false, NOW() - INTERVAL '38 days', NOW() - INTERVAL '37 days', NOW() - INTERVAL '38 days'),
('33aaa001-0003-0000-0000-000000000002', 'PRD-W3-002', 'bb000001-0000-0000-0000-000000000002', 'Balado', 'COMPLETED', 190.00, 160.00, 84.21, true, NOW() - INTERVAL '37 days', NOW() - INTERVAL '36 days', NOW() - INTERVAL '37 days'),
-- Minggu 4 — total input: 430 kg
('33aaa001-0004-0000-0000-000000000001', 'PRD-W4-001', 'bb000001-0000-0000-0000-000000000001', 'Original', 'COMPLETED', 230.00, 191.00, 83.04, true, NOW() - INTERVAL '31 days', NOW() - INTERVAL '30 days', NOW() - INTERVAL '31 days'),
('33aaa001-0004-0000-0000-000000000002', 'PRD-W4-002', 'bb000001-0000-0000-0000-000000000003', 'Keju', 'COMPLETED', 200.00, 170.00, 85.00, true, NOW() - INTERVAL '30 days', NOW() - INTERVAL '29 days', NOW() - INTERVAL '30 days'),
-- Minggu 5 — total input: 450 kg
('33aaa001-0005-0000-0000-000000000001', 'PRD-W5-001', 'bb000001-0000-0000-0000-000000000001', 'Original', 'COMPLETED', 240.00, 199.00, 82.92, true, NOW() - INTERVAL '24 days', NOW() - INTERVAL '23 days', NOW() - INTERVAL '24 days'),
('33aaa001-0005-0000-0000-000000000002', 'PRD-W5-002', 'bb000001-0000-0000-0000-000000000002', 'Balado', 'COMPLETED', 210.00, 163.00, 77.62, false, NOW() - INTERVAL '23 days', NOW() - INTERVAL '22 days', NOW() - INTERVAL '23 days'),
-- Minggu 6 — total input: 470 kg
('33aaa001-0006-0000-0000-000000000001', 'PRD-W6-001', 'bb000001-0000-0000-0000-000000000001', 'Original', 'COMPLETED', 250.00, 215.00, 86.00, true, NOW() - INTERVAL '17 days', NOW() - INTERVAL '16 days', NOW() - INTERVAL '17 days'),
('33aaa001-0006-0000-0000-000000000002', 'PRD-W6-002', 'bb000001-0000-0000-0000-000000000003', 'Keju', 'COMPLETED', 220.00, 181.00, 82.27, true, NOW() - INTERVAL '16 days', NOW() - INTERVAL '15 days', NOW() - INTERVAL '16 days'),
-- Minggu 7 — total input: 460 kg
('33aaa001-0007-0000-0000-000000000001', 'PRD-W7-001', 'bb000001-0000-0000-0000-000000000001', 'Original', 'COMPLETED', 240.00, 198.00, 82.50, true, NOW() - INTERVAL '10 days', NOW() - INTERVAL '9 days', NOW() - INTERVAL '10 days'),
('33aaa001-0007-0000-0000-000000000002', 'PRD-W7-002', 'bb000001-0000-0000-0000-000000000002', 'Balado', 'COMPLETED', 220.00, 172.00, 78.18, false, NOW() - INTERVAL '9 days', NOW() - INTERVAL '8 days', NOW() - INTERVAL '9 days'),
-- Minggu 8 (minggu lalu) — total input: 490 kg
('33aaa001-0008-0000-0000-000000000001', 'PRD-W8-001', 'bb000001-0000-0000-0000-000000000001', 'Original', 'COMPLETED', 260.00, 218.00, 83.85, true, NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days', NOW() - INTERVAL '3 days'),
('33aaa001-0008-0000-0000-000000000002', 'PRD-W8-002', 'bb000001-0000-0000-0000-000000000003', 'Keju', 'COMPLETED', 230.00, 196.00, 85.22, true, NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 days', NOW() - INTERVAL '2 days')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 5. PRODUCTION MATERIALS — Konsumsi Bahan per Batch
--    Ini digunakan untuk cross-validate rasio BOM aktual
-- ============================================================================

INSERT INTO production_materials (id, production_order_id, raw_material_id, consumption_quantity, created_at) VALUES
-- Batch PRD-W6-001 (input 250 kg jamur)
('44aaa001-0006-0001-0000-000000000001', '33aaa001-0006-0000-0000-000000000001', 'aa000001-0000-0000-0000-000000000001', 250.00, NOW() - INTERVAL '17 days'),
('44aaa001-0006-0001-0000-000000000002', '33aaa001-0006-0000-0000-000000000001', 'aa000001-0000-0000-0000-000000000002', 62.50, NOW() - INTERVAL '17 days'),
('44aaa001-0006-0001-0000-000000000003', '33aaa001-0006-0000-0000-000000000001', 'aa000001-0000-0000-0000-000000000003', 75.00, NOW() - INTERVAL '17 days'),
('44aaa001-0006-0001-0000-000000000004', '33aaa001-0006-0000-0000-000000000001', 'aa000001-0000-0000-0000-000000000004', 12.50, NOW() - INTERVAL '17 days'),
-- Batch PRD-W7-001 (input 240 kg jamur)
('44aaa001-0007-0001-0000-000000000001', '33aaa001-0007-0000-0000-000000000001', 'aa000001-0000-0000-0000-000000000001', 240.00, NOW() - INTERVAL '10 days'),
('44aaa001-0007-0001-0000-000000000002', '33aaa001-0007-0000-0000-000000000001', 'aa000001-0000-0000-0000-000000000002', 60.00, NOW() - INTERVAL '10 days'),
('44aaa001-0007-0001-0000-000000000003', '33aaa001-0007-0000-0000-000000000001', 'aa000001-0000-0000-0000-000000000003', 72.00, NOW() - INTERVAL '10 days'),
('44aaa001-0007-0001-0000-000000000004', '33aaa001-0007-0000-0000-000000000001', 'aa000001-0000-0000-0000-000000000004', 12.00, NOW() - INTERVAL '10 days'),
-- Batch PRD-W8-001 (input 260 kg jamur)
('44aaa001-0008-0001-0000-000000000001', '33aaa001-0008-0000-0000-000000000001', 'aa000001-0000-0000-0000-000000000001', 260.00, NOW() - INTERVAL '3 days'),
('44aaa001-0008-0001-0000-000000000002', '33aaa001-0008-0000-0000-000000000001', 'aa000001-0000-0000-0000-000000000002', 65.00, NOW() - INTERVAL '3 days'),
('44aaa001-0008-0001-0000-000000000003', '33aaa001-0008-0000-0000-000000000001', 'aa000001-0000-0000-0000-000000000003', 78.00, NOW() - INTERVAL '3 days'),
('44aaa001-0008-0001-0000-000000000004', '33aaa001-0008-0000-0000-000000000001', 'aa000001-0000-0000-0000-000000000004', 13.00, NOW() - INTERVAL '3 days')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 6. QC INSPECTIONS — Campuran hasil pass/fail untuk insight testing
-- ============================================================================

INSERT INTO qc_inspections (id, reference_type, reference_id, batch_id, is_passed, defect_type, defect_rate, total_defects, sample_size, decision, inspection_date, created_at) VALUES
-- Pass (defect rendah)
('55aaa001-0001-0000-0000-000000000001', 'PRODUCTION', '33aaa001-0001-0000-0000-000000000001', 'PRD-W1-001', true, NULL, 1.50, 1, 50, 'RELEASED', NOW() - INTERVAL '51 days', NOW() - INTERVAL '51 days'),
('55aaa001-0002-0000-0000-000000000001', 'PRODUCTION', '33aaa001-0002-0000-0000-000000000001', 'PRD-W2-001', true, NULL, 2.00, 1, 50, 'RELEASED', NOW() - INTERVAL '44 days', NOW() - INTERVAL '44 days'),
('55aaa001-0003-0000-0000-000000000001', 'PRODUCTION', '33aaa001-0003-0000-0000-000000000001', 'PRD-W3-001', true, NULL, 3.00, 2, 50, 'RELEASED', NOW() - INTERVAL '37 days', NOW() - INTERVAL '37 days'),
('55aaa001-0004-0000-0000-000000000001', 'PRODUCTION', '33aaa001-0004-0000-0000-000000000001', 'PRD-W4-001', true, NULL, 2.50, 1, 50, 'RELEASED', NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days'),
('55aaa001-0005-0000-0000-000000000001', 'PRODUCTION', '33aaa001-0005-0000-0000-000000000001', 'PRD-W5-001', true, NULL, 1.00, 1, 50, 'RELEASED', NOW() - INTERVAL '23 days', NOW() - INTERVAL '23 days'),
-- FAIL (defect > 5%) — trigger warning insight
('55aaa001-0006-0000-0000-000000000001', 'PRODUCTION', '33aaa001-0006-0000-0000-000000000001', 'PRD-W6-001', false, 'Kemasan Bocor / Seal Rusak', 7.50, 4, 50, 'REWORK', NOW() - INTERVAL '16 days', NOW() - INTERVAL '16 days'),
('55aaa001-0007-0000-0000-000000000001', 'PRODUCTION', '33aaa001-0007-0000-0000-000000000001', 'PRD-W7-001', true, NULL, 2.00, 1, 50, 'RELEASED', NOW() - INTERVAL '9 days', NOW() - INTERVAL '9 days'),
-- FAIL lagi
('55aaa001-0007-0000-0000-000000000002', 'PRODUCTION', '33aaa001-0007-0000-0000-000000000002', 'PRD-W7-002', false, 'Kemasan Bocor / Seal Rusak', 6.00, 3, 50, 'REWORK', NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days'),
('55aaa001-0008-0000-0000-000000000001', 'PRODUCTION', '33aaa001-0008-0000-0000-000000000001', 'PRD-W8-001', true, NULL, 1.50, 1, 50, 'RELEASED', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
('55aaa001-0008-0000-0000-000000000002', 'PRODUCTION', '33aaa001-0008-0000-0000-000000000002', 'PRD-W8-002', true, NULL, 2.50, 1, 50, 'RELEASED', NOW() - INTERVAL '1 days', NOW() - INTERVAL '1 days')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 7. INVENTORY — Stok Gudang Aktual (untuk MRP deduction)
-- ============================================================================

-- Bahan Baku
INSERT INTO inventory (id, warehouse_id, item_type, item_id, batch_number, quantity, reorder_point, last_updated_at) VALUES
('66aaa001-0001-0000-0000-000000000001', 'ee000001-0000-0000-0000-000000000001', 'RAW_MATERIAL', 'aa000001-0000-0000-0000-000000000001', 'STOCK-JMR', 120.00, 200.00, NOW()),
('66aaa001-0001-0000-0000-000000000002', 'ee000001-0000-0000-0000-000000000001', 'RAW_MATERIAL', 'aa000001-0000-0000-0000-000000000002', 'STOCK-TPG', 45.00, 50.00, NOW()),
('66aaa001-0001-0000-0000-000000000003', 'ee000001-0000-0000-0000-000000000001', 'RAW_MATERIAL', 'aa000001-0000-0000-0000-000000000003', 'STOCK-MNY', 30.00, 80.00, NOW()),
('66aaa001-0001-0000-0000-000000000004', 'ee000001-0000-0000-0000-000000000001', 'RAW_MATERIAL', 'aa000001-0000-0000-0000-000000000004', 'STOCK-BMB', 8.00, 10.00, NOW()),
('66aaa001-0001-0000-0000-000000000005', 'ee000001-0000-0000-0000-000000000001', 'RAW_MATERIAL', 'aa000001-0000-0000-0000-000000000005', 'STOCK-KMS', 2500.00, 1000.00, NOW())
ON CONFLICT (id) DO UPDATE SET
  quantity = EXCLUDED.quantity,
  reorder_point = EXCLUDED.reorder_point,
  last_updated_at = NOW();

-- Produk Jadi
INSERT INTO inventory (id, warehouse_id, item_type, item_id, batch_number, quantity, reorder_point, last_updated_at) VALUES
('66aaa001-0002-0000-0000-000000000001', 'ee000001-0000-0000-0000-000000000002', 'PRODUCT', 'bb000001-0000-0000-0000-000000000001', 'FG-ORI', 180.00, 100.00, NOW()),
('66aaa001-0002-0000-0000-000000000002', 'ee000001-0000-0000-0000-000000000002', 'PRODUCT', 'bb000001-0000-0000-0000-000000000002', 'FG-BLD', 95.00, 100.00, NOW()),
('66aaa001-0002-0000-0000-000000000003', 'ee000001-0000-0000-0000-000000000002', 'PRODUCT', 'bb000001-0000-0000-0000-000000000003', 'FG-KJU', 120.00, 100.00, NOW())
ON CONFLICT (id) DO UPDATE SET
  quantity = EXCLUDED.quantity,
  last_updated_at = NOW();

-- ============================================================================
-- 8. SALES ORDERS — Pesanan Aktif (PENDING/PROCESSING)
-- ============================================================================

INSERT INTO sales_orders (id, order_number, customer_id, status, total_amount, order_date, created_at) VALUES
('77aaa001-0001-0000-0000-000000000001', 'SO-2026-0045', 'dd000001-0000-0000-0000-000000000001', 'PENDING', 7500000, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
('77aaa001-0001-0000-0000-000000000002', 'SO-2026-0046', 'dd000001-0000-0000-0000-000000000002', 'PROCESSING', 4200000, NOW() - INTERVAL '1 days', NOW() - INTERVAL '1 days'),
('77aaa001-0001-0000-0000-000000000003', 'SO-2026-0047', 'dd000001-0000-0000-0000-000000000003', 'PENDING', 2800000, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO sales_order_items (id, sales_order_id, product_id, quantity, unit_price, subtotal) VALUES
-- SO-0045: CV Mandiri Snack — 300 kg total
('88aaa001-0001-0000-0000-000000000001', '77aaa001-0001-0000-0000-000000000001', 'bb000001-0000-0000-0000-000000000001', 150.00, 25000, 3750000),
('88aaa001-0001-0000-0000-000000000002', '77aaa001-0001-0000-0000-000000000001', 'bb000001-0000-0000-0000-000000000002', 100.00, 25000, 2500000),
('88aaa001-0001-0000-0000-000000000003', '77aaa001-0001-0000-0000-000000000001', 'bb000001-0000-0000-0000-000000000003', 50.00, 25000, 1250000),
-- SO-0046: UD Makmur Jaya — 168 kg total
('88aaa001-0002-0000-0000-000000000001', '77aaa001-0001-0000-0000-000000000002', 'bb000001-0000-0000-0000-000000000001', 100.00, 25000, 2500000),
('88aaa001-0002-0000-0000-000000000002', '77aaa001-0001-0000-0000-000000000002', 'bb000001-0000-0000-0000-000000000002', 68.00, 25000, 1700000),
-- SO-0047: Toko Oleh-oleh — 112 kg total
('88aaa001-0003-0000-0000-000000000001', '77aaa001-0001-0000-0000-000000000003', 'bb000001-0000-0000-0000-000000000001', 80.00, 25000, 2000000),
('88aaa001-0003-0000-0000-000000000002', '77aaa001-0001-0000-0000-000000000003', 'bb000001-0000-0000-0000-000000000003', 32.00, 25000, 800000)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SELESAI!
-- Total data yang di-seed:
--   • 5 Bahan Baku (raw_materials) — Jamur, Tepung, Minyak, Bumbu, Kemasan
--   • 3 Produk Jadi (products) — Original, Balado, Keju
--   • 3 Petani Mitra (farmers)
--   • 3 Pelanggan (customers)
--   • 16 Penerimaan (receivings) — 8 minggu × 2 batch/minggu
--   • 16 Sortasi (sortings)
--   • 16 Batch Produksi (production_orders) — tren naik 380→490 kg/minggu
--   • 12 Konsumsi Material (production_materials) — 3 batch × 4 material
--   • 10 Inspeksi QC (qc_inspections) — 8 pass, 2 fail (kemasan bocor)
--   • 5 Stok Bahan Baku (inventory) — minyak & jamur kritis
--   • 3 Stok Produk Jadi (inventory)
--   • 3 Sales Orders aktif + 7 items — total demand 580 kg
--   • 1 BOM Recipe (settings)
--
-- YANG SEHARUSNYA TERJADI DI UI:
-- 1. Banner hijau: "Data Memadai — Prediksi Akurat"
-- 2. Sumber data: "Data Batch Produksi (production_orders)"
-- 3. Tren naik terlihat di grafik (Holt's method)
-- 4. MRP menunjukkan stok Minyak & Jamur kritis (perlu pengadaan tinggi)
-- 5. MRP Kemasan menunjukkan stok cukup (pengadaan rendah)
-- 6. Insight: Warning rendemen (3 batch < 80%)
-- 7. Insight: Warning QC kemasan bocor (2 fail)
-- 8. Insight: 3 SO aktif, demand 580 kg
-- ============================================================================
