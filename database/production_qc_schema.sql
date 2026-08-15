-- ==============================================================================
-- PRODUCTION & QUALITY CONTROL MODULE SCHEMA
-- ERP KhumKhum Jamur Crispy (CV Khaira Buana Mas)
-- ==============================================================================

-- 1. PATCH & EXTEND PRODUCTION ORDERS TABLE
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id);
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS target_quantity DECIMAL(10,2);
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS input_weight DECIMAL(10,2);
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS output_weight DECIMAL(10,2);
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS yield_percentage DECIMAL(5,2);
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS is_yield_compliant BOOLEAN;
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS anomaly_reason TEXT;
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS product_variant VARCHAR(100);
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. PATCH & EXTEND QC INSPECTIONS TABLE
ALTER TABLE qc_inspections ADD COLUMN IF NOT EXISTS batch_id VARCHAR(100);
ALTER TABLE qc_inspections ADD COLUMN IF NOT EXISTS sample_size INTEGER;
ALTER TABLE qc_inspections ADD COLUMN IF NOT EXISTS defect_burnt INTEGER DEFAULT 0;
ALTER TABLE qc_inspections ADD COLUMN IF NOT EXISTS defect_salty INTEGER DEFAULT 0;
ALTER TABLE qc_inspections ADD COLUMN IF NOT EXISTS defect_leaking_pack INTEGER DEFAULT 0;
ALTER TABLE qc_inspections ADD COLUMN IF NOT EXISTS defect_crushed INTEGER DEFAULT 0;
ALTER TABLE qc_inspections ADD COLUMN IF NOT EXISTS defect_soggy INTEGER DEFAULT 0;
ALTER TABLE qc_inspections ADD COLUMN IF NOT EXISTS total_defects INTEGER DEFAULT 0;
ALTER TABLE qc_inspections ADD COLUMN IF NOT EXISTS defect_rate DECIMAL(5,2) DEFAULT 0.00;
ALTER TABLE qc_inspections ADD COLUMN IF NOT EXISTS decision VARCHAR(50); -- 'RELEASED', 'REWORK', 'REJECTED'
ALTER TABLE qc_inspections ADD COLUMN IF NOT EXISTS inspector_id UUID REFERENCES users(id);
ALTER TABLE qc_inspections ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 3. SEED DEFAULT SETTINGS FOR STANDARDS
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
