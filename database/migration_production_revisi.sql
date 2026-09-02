-- =============================================
-- Migration: Revisi Modul Produksi KhumKhum
-- Date: 2026-09-02
-- Description: Pemisahan produksi goreng & packing,
--              time study, pencatatan per wajan/longsong
-- =============================================

-- 1. Kolom tambahan di production_orders
ALTER TABLE production_orders
  ADD COLUMN IF NOT EXISTS total_kremesan_gram INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_longsong_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unpacked_longsong_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cycle_time_avg_seconds DECIMAL,
  ADD COLUMN IF NOT EXISTS normal_time_seconds DECIMAL,
  ADD COLUMN IF NOT EXISTS standard_time_seconds DECIMAL,
  ADD COLUMN IF NOT EXISTS rating_factor DECIMAL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS allowance_factor DECIMAL DEFAULT 0.15;

-- 2. Tabel production_frying_batches (per wajan goreng)
CREATE TABLE IF NOT EXISTS production_frying_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_order_id UUID NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
  wajan_number INTEGER NOT NULL DEFAULT 1,
  batch_weight_gram INTEGER NOT NULL DEFAULT 800,
  oil_temp_celsius DECIMAL,
  frying_duration_minutes DECIMAL,
  output_weight_gram INTEGER,
  longsong_count INTEGER DEFAULT 0,
  kremesan_weight_gram INTEGER DEFAULT 0,
  notes TEXT,
  operator_id UUID REFERENCES users(id),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabel production_packing_entries (per longsong/ball packing)
CREATE TABLE IF NOT EXISTS production_packing_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  frying_batch_id UUID REFERENCES production_frying_batches(id) ON DELETE SET NULL,
  production_order_id UUID NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
  flavor_variant TEXT NOT NULL DEFAULT 'Original',
  longsong_number INTEGER NOT NULL DEFAULT 1,
  longsong_weight_gram INTEGER,
  packaged_toples_count INTEGER DEFAULT 0,
  packaging_weight_gram TEXT DEFAULT '100g',
  seasoning_used_gram DECIMAL DEFAULT 0,
  is_packed BOOLEAN DEFAULT FALSE,
  packed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Tabel time_study_samples (stopwatch per sample)
CREATE TABLE IF NOT EXISTS time_study_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_order_id UUID NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
  stage TEXT NOT NULL DEFAULT 'FRYING' CHECK (stage IN ('FRYING', 'PACKING')),
  sample_number INTEGER NOT NULL DEFAULT 1,
  started_at TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ,
  duration_seconds DECIMAL,
  operator_id UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_frying_batches_order ON production_frying_batches(production_order_id);
CREATE INDEX IF NOT EXISTS idx_packing_entries_order ON production_packing_entries(production_order_id);
CREATE INDEX IF NOT EXISTS idx_packing_entries_frying ON production_packing_entries(frying_batch_id);
CREATE INDEX IF NOT EXISTS idx_packing_entries_unpacked ON production_packing_entries(is_packed) WHERE is_packed = FALSE;
CREATE INDEX IF NOT EXISTS idx_time_study_order ON time_study_samples(production_order_id);

-- 6. RLS Policies
ALTER TABLE production_frying_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_packing_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_study_samples ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated" ON production_frying_batches FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON production_packing_entries FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON time_study_samples FOR ALL USING (true);
