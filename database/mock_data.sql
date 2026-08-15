-- ==============================================================================
-- SCHEMA PATCH (Menyesuaikan kolom yang kurang dari schema.sql dengan kebutuhan UI)
-- ==============================================================================

ALTER TABLE farmers ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50);

ALTER TABLE receivings ADD COLUMN IF NOT EXISTS weight_sent DECIMAL(10,2);
ALTER TABLE receivings ADD COLUMN IF NOT EXISTS weight_difference DECIMAL(10,2);
ALTER TABLE receivings ADD COLUMN IF NOT EXISTS diff_percentage DECIMAL(5,2);
ALTER TABLE receivings ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'RECEIVED';

ALTER TABLE sortings ADD COLUMN IF NOT EXISTS leaf_weight DECIMAL(10,2);
ALTER TABLE sortings ADD COLUMN IF NOT EXISTS stem_weight DECIMAL(10,2);
ALTER TABLE sortings ADD COLUMN IF NOT EXISTS leaf_percentage DECIMAL(5,2);
ALTER TABLE sortings ADD COLUMN IF NOT EXISTS quality_grade VARCHAR(50);

ALTER TABLE qc_inspections ADD COLUMN IF NOT EXISTS defect_rate DECIMAL(5,2);
ALTER TABLE qc_inspections ADD COLUMN IF NOT EXISTS decision VARCHAR(50);
ALTER TABLE qc_inspections ADD COLUMN IF NOT EXISTS sample_size INTEGER;

-- ==============================================================================
-- MOCK DATA FOR WAREHOUSE, MANAGEMENT & TRACEABILITY TESTING
-- ==============================================================================

-- 1. MASTER DATA
-- Farmers
INSERT INTO farmers (id, name, contact, phone_number, address) VALUES
('f1111111-0000-0000-0000-000000000000', 'Pak Sugeng', 'Sugeng', '081234567890', 'Desa Sukamaju'),
('f2222222-0000-0000-0000-000000000000', 'Bu Siti', 'Siti', '081234567891', 'Desa Sukatani'),
('f3333333-0000-0000-0000-000000000000', 'Pak Harto', 'Harto', '081234567892', 'Desa Makmur'),
('f4444444-0000-0000-0000-000000000000', 'Pak Joko', 'Joko', '081234567893', 'Desa Sejahtera')
ON CONFLICT (id) DO NOTHING;

-- Raw Materials
INSERT INTO raw_materials (id, code, name, uom) VALUES
('11111111-0000-0000-0000-000000000001', 'RM-DAUN-01', 'Daun Kratom Basah', 'kg')
ON CONFLICT (id) DO NOTHING;

-- Products
INSERT INTO products (id, sku, name, description) VALUES
('22222222-0000-0000-0000-000000000001', 'FG-KRT-M01', 'Kratom Powder - Maeng Da', 'Kratom powder premium grade'),
('22222222-0000-0000-0000-000000000002', 'FG-KRT-B01', 'Kratom Powder - Borneo', 'Kratom powder standard grade')
ON CONFLICT (id) DO NOTHING;

-- Customers
INSERT INTO customers (id, name, contact, address) VALUES
('33333333-0000-0000-0000-000000000001', 'Global Botanicals LLC', 'John Doe', '123 Export Ave, US')
ON CONFLICT (id) DO NOTHING;

-- Warehouses
INSERT INTO warehouses (id, name, location) VALUES
('44444444-0000-0000-0000-000000000001', 'Gudang Utama', 'Pusat Pontianak')
ON CONFLICT (id) DO NOTHING;


-- 2. WAREHOUSE OPERATIONS (Receiving & Sorting)
-- Receivings
INSERT INTO receivings (id, batch_number, farmer_id, raw_material_id, weight, weight_sent, weight_difference, diff_percentage, status, received_date) VALUES
('55555555-0000-0000-0000-000000000001', 'RM-20260815-001', 'f1111111-0000-0000-0000-000000000000', '11111111-0000-0000-0000-000000000001', 500.00, 502.00, -2.00, -0.40, 'SORTED', NOW() - INTERVAL '5 days'),
('55555555-0000-0000-0000-000000000002', 'RM-20260815-002', 'f2222222-0000-0000-0000-000000000000', '11111111-0000-0000-0000-000000000001', 450.00, 450.00, 0.00, 0.00, 'SORTED', NOW() - INTERVAL '3 days'),
('55555555-0000-0000-0000-000000000003', 'RM-20260815-003', 'f3333333-0000-0000-0000-000000000000', '11111111-0000-0000-0000-000000000001', 300.00, 305.00, -5.00, -1.64, 'RECEIVED', NOW() - INTERVAL '1 days')
ON CONFLICT (id) DO NOTHING;

-- Sortings
INSERT INTO sortings (id, receiving_id, leaf_weight, stem_weight, leaf_percentage, quality_grade, grade, accepted_quantity, rejected_quantity, waste) VALUES
('66666666-0000-0000-0000-000000000001', '55555555-0000-0000-0000-000000000001', 420.00, 70.00, 84.00, 'A', 'A', 420.00, 0.00, 10.00),
('66666666-0000-0000-0000-000000000002', '55555555-0000-0000-0000-000000000002', 350.00, 80.00, 77.77, 'B', 'B', 350.00, 0.00, 20.00)
ON CONFLICT (id) DO NOTHING;


-- 3. PRODUCTION & QC
-- Production Orders
INSERT INTO production_orders (id, batch_number, status, start_date, end_date) VALUES
('77777777-0000-0000-0000-000000000001', 'PRD-20260815-001', 'COMPLETED', NOW() - INTERVAL '4 days', NOW() - INTERVAL '3 days'),
('77777777-0000-0000-0000-000000000002', 'PRD-20260815-002', 'IN_PROGRESS', NOW() - INTERVAL '1 days', NULL)
ON CONFLICT (id) DO NOTHING;

-- Production Results
INSERT INTO production_results (id, production_order_id, product_id, finished_goods_quantity, wip_quantity, yield_percentage) VALUES
('88888888-0000-0000-0000-000000000001', '77777777-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 350.00, 0.00, 83.33)
ON CONFLICT (id) DO NOTHING;

-- QC Inspections
INSERT INTO qc_inspections (id, reference_type, reference_id, is_passed, defect_rate, decision, sample_size, notes) VALUES
('99999999-0000-0000-0000-000000000001', 'PRODUCTION', '77777777-0000-0000-0000-000000000001', true, 2.50, 'RELEASED', 50, 'Warna hijau cerah, tekstur halus')
ON CONFLICT (id) DO NOTHING;


-- 4. INVENTORY & STOCK
-- Inventory (Raw Material)
INSERT INTO inventory (id, warehouse_id, item_type, item_id, batch_number, quantity, last_updated_at) VALUES
('aaaaaaaa-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000001', 'RAW_MATERIAL', '11111111-0000-0000-0000-000000000001', 'RM-20260815-003', 300.00, NOW())
ON CONFLICT (id) DO NOTHING;

-- Inventory (Finished Good)
INSERT INTO inventory (id, warehouse_id, item_type, item_id, batch_number, quantity, last_updated_at) VALUES
('aaaaaaaa-0000-0000-0000-000000000002', '44444444-0000-0000-0000-000000000001', 'PRODUCT', '22222222-0000-0000-0000-000000000001', 'PRD-20260815-001', 350.00, NOW())
ON CONFLICT (id) DO NOTHING;


-- 5. SALES
-- Sales Orders
INSERT INTO sales_orders (id, customer_id, status, order_date) VALUES
('bbbbbbbb-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', 'PENDING', NOW() - INTERVAL '2 days')
ON CONFLICT (id) DO NOTHING;

-- Sales Order Items
INSERT INTO sales_order_items (id, sales_order_id, product_id, quantity) VALUES
('cccccccc-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 350.00)
ON CONFLICT (id) DO NOTHING;
