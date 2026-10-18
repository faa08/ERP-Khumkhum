-- =============================================
-- Migration: Tabel production_longsong_containers
-- Date: 2026-10-17
-- Description: Pencatatan kartu fisik wadah longsong (WIP buffer)
--              dengan berat awal, sisa berat, dan status pemakaian
-- =============================================

CREATE TABLE IF NOT EXISTS production_longsong_containers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_order_id UUID REFERENCES production_orders(id) ON DELETE CASCADE,
  container_number INTEGER NOT NULL,
  initial_weight_kg DECIMAL NOT NULL,
  current_weight_kg DECIMAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'AVAILABLE', -- 'AVAILABLE', 'PARTIAL', 'EMPTY'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_longsong_containers_order ON production_longsong_containers(production_order_id);
CREATE INDEX IF NOT EXISTS idx_longsong_containers_status ON production_longsong_containers(status);

ALTER TABLE production_longsong_containers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated" ON production_longsong_containers;
CREATE POLICY "Allow all for authenticated" ON production_longsong_containers FOR ALL USING (true);
