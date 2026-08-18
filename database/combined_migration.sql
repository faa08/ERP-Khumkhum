-- ==============================================================================
-- KHUMKHUM ERP — COMBINED MIGRATION SCRIPT
-- Jalankan di Supabase SQL Editor jika belum pernah dijalankan sebelumnya
-- Script ini IDEMPOTENT (aman dijalankan berulang kali)
-- ==============================================================================

-- Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PATCH RECEIVINGS TABLE (Dev 2 — Warehouse)
-- ============================================================================
ALTER TABLE receivings ADD COLUMN IF NOT EXISTS weight_sent DECIMAL(10,2);
ALTER TABLE receivings ADD COLUMN IF NOT EXISTS weight_difference DECIMAL(10,2);
ALTER TABLE receivings ADD COLUMN IF NOT EXISTS diff_percentage DECIMAL(5,2);
ALTER TABLE receivings ADD COLUMN IF NOT EXISTS scale_photo_url TEXT;
ALTER TABLE receivings ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'RECEIVED';

-- ============================================================================
-- PATCH SORTINGS TABLE (Dev 2 — Warehouse)
-- ============================================================================
ALTER TABLE sortings ADD COLUMN IF NOT EXISTS leaf_weight DECIMAL(10,2);
ALTER TABLE sortings ADD COLUMN IF NOT EXISTS stem_weight DECIMAL(10,2);
ALTER TABLE sortings ADD COLUMN IF NOT EXISTS leaf_percentage DECIMAL(5,2);
ALTER TABLE sortings ADD COLUMN IF NOT EXISTS quality_grade VARCHAR(50);
ALTER TABLE sortings ADD COLUMN IF NOT EXISTS is_standard_compliant BOOLEAN;

-- ============================================================================
-- PATCH INVENTORY TABLE (Dev 2 — Warehouse)
-- ============================================================================
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS reorder_point DECIMAL(10,2);

-- ============================================================================
-- PATCH STOCK_MOVEMENTS TABLE (Dev 2 — Warehouse)
-- ============================================================================
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS reference_type VARCHAR(50);
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS notes TEXT;

-- ============================================================================
-- PATCH SALES_ORDERS TABLE (Dev 2 — Warehouse)
-- ============================================================================
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS order_number VARCHAR(100) UNIQUE;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS total_amount DECIMAL(15,2);
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS notes TEXT;

-- ============================================================================
-- PATCH SALES_ORDER_ITEMS TABLE (Dev 2 — Warehouse)
-- ============================================================================
ALTER TABLE sales_order_items ADD COLUMN IF NOT EXISTS unit_price DECIMAL(15,2);
ALTER TABLE sales_order_items ADD COLUMN IF NOT EXISTS subtotal DECIMAL(15,2);

-- ============================================================================
-- PATCH FARMERS TABLE (Dev 2 — Warehouse)
-- ============================================================================
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50);
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS price_per_kg DECIMAL(10,2) DEFAULT 15000.00;

-- ============================================================================
-- PATCH PRODUCTION_ORDERS TABLE (Dev 3 — Production & QC)
-- ============================================================================
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id);
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS target_quantity DECIMAL(10,2);
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS input_weight DECIMAL(10,2);
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS output_weight DECIMAL(10,2);
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS yield_percentage DECIMAL(5,2);
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS is_yield_compliant BOOLEAN;
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS anomaly_reason TEXT;
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS product_variant VARCHAR(100);
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS notes TEXT;

-- ============================================================================
-- PATCH QC_INSPECTIONS TABLE (Dev 3 — Production & QC)
-- ============================================================================
ALTER TABLE qc_inspections ADD COLUMN IF NOT EXISTS batch_id VARCHAR(100);
ALTER TABLE qc_inspections ADD COLUMN IF NOT EXISTS sample_size INTEGER;
ALTER TABLE qc_inspections ADD COLUMN IF NOT EXISTS defect_burnt INTEGER DEFAULT 0;
ALTER TABLE qc_inspections ADD COLUMN IF NOT EXISTS defect_salty INTEGER DEFAULT 0;
ALTER TABLE qc_inspections ADD COLUMN IF NOT EXISTS defect_leaking_pack INTEGER DEFAULT 0;
ALTER TABLE qc_inspections ADD COLUMN IF NOT EXISTS defect_crushed INTEGER DEFAULT 0;
ALTER TABLE qc_inspections ADD COLUMN IF NOT EXISTS defect_soggy INTEGER DEFAULT 0;
ALTER TABLE qc_inspections ADD COLUMN IF NOT EXISTS total_defects INTEGER DEFAULT 0;
ALTER TABLE qc_inspections ADD COLUMN IF NOT EXISTS defect_rate DECIMAL(5,2) DEFAULT 0.00;
ALTER TABLE qc_inspections ADD COLUMN IF NOT EXISTS decision VARCHAR(50);
ALTER TABLE qc_inspections ADD COLUMN IF NOT EXISTS inspector_id UUID REFERENCES users(id);
ALTER TABLE qc_inspections ADD COLUMN IF NOT EXISTS image_url TEXT;

-- ============================================================================
-- NEW TABLES (Dev 2 — PPIC & WhatsApp)
-- ============================================================================
CREATE TABLE IF NOT EXISTS farmer_harvest_estimates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farmer_id UUID REFERENCES farmers(id) NOT NULL,
  expected_date DATE NOT NULL,
  estimated_kg DECIMAL(10,2) NOT NULL,
  source VARCHAR(50) DEFAULT 'MANUAL',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS whatsapp_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farmer_id UUID REFERENCES farmers(id),
  phone_number VARCHAR(50) NOT NULL,
  message_type VARCHAR(50) NOT NULL,
  payload JSONB,
  status VARCHAR(50) DEFAULT 'PENDING',
  gateway_response JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- SEED DEFAULT SETTINGS (Dev 3 — Standards)
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
),
(
  'qc_standards',
  '{
    "max_defect_rate": 5.0,
    "max_moisture_percentage": 12.0,
    "min_sample_size": 20,
    "defect_categories": [
      {"id": "defect_burnt", "name": "Gosong / Overcooked", "weight": 1.0, "severity": "HIGH"},
      {"id": "defect_salty", "name": "Keasinan / Bumbu Tidak Rata", "weight": 0.8, "severity": "MEDIUM"},
      {"id": "defect_leaking_pack", "name": "Kemasan Bocor / Seal Rusak", "weight": 1.0, "severity": "CRITICAL"},
      {"id": "defect_crushed", "name": "Remuk / Patah Berlebih", "weight": 0.6, "severity": "LOW"},
      {"id": "defect_soggy", "name": "Melempem / Kurang Renyah", "weight": 0.9, "severity": "HIGH"}
    ]
  }'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- DONE! Semua kolom & tabel sudah tersedia.
-- ============================================================================
