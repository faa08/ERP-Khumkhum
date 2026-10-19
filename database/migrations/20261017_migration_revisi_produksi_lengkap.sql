-- =====================================================================
-- MIGRATION: REVISI MODUL PRODUKSI LENGKAP (FRYING, PACKING & LONGSONG)
-- Tanggal: 17 Oktober 2026
-- Instruksi: Buka Supabase Dashboard -> SQL Editor -> Tempel & Klik "Run"
-- =====================================================================

-- 0. Pastikan schema aktif adalah public
SET search_path TO public;

-- 1. Buat Tabel public.production_orders jika belum ada
CREATE TABLE IF NOT EXISTS public.production_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number VARCHAR(100) UNIQUE NOT NULL,
  product_id UUID,
  product_variant VARCHAR(255),
  target_quantity DECIMAL(10,2),
  status VARCHAR(50) DEFAULT 'DRAFT',
  input_weight DECIMAL(10,2),
  output_weight DECIMAL(10,2),
  yield_percentage DECIMAL(5,2),
  is_yield_compliant BOOLEAN,
  anomaly_reason TEXT,
  notes TEXT,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tambah Kolom Waktu Siklus HACCP & Longsong di public.production_orders
ALTER TABLE public.production_orders
  ADD COLUMN IF NOT EXISTS total_kremesan_gram INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_longsong_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unpacked_longsong_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cycle_time_avg_seconds DECIMAL,
  ADD COLUMN IF NOT EXISTS normal_time_seconds DECIMAL,
  ADD COLUMN IF NOT EXISTS standard_time_seconds DECIMAL DEFAULT 900,
  ADD COLUMN IF NOT EXISTS rating_factor DECIMAL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS allowance_factor DECIMAL DEFAULT 0.15;

-- 3. Tabel public.production_frying_batches (Pencatatan per wajan goreng & stopwatch HACCP)
CREATE TABLE IF NOT EXISTS public.production_frying_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_order_id UUID REFERENCES public.production_orders(id) ON DELETE CASCADE,
  wajan_number INTEGER NOT NULL DEFAULT 1,
  batch_weight_gram INTEGER NOT NULL DEFAULT 800,
  oil_temp_celsius DECIMAL,
  frying_duration_minutes DECIMAL,
  output_weight_gram INTEGER,
  longsong_count INTEGER DEFAULT 0,
  kremesan_weight_gram INTEGER DEFAULT 0,
  notes TEXT,
  operator_id UUID,
  started_at TIMESTAMPTZ,
  timer_started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Tabel public.production_longsong_containers (Kartu stok fisik wadah longsong / buffer WIP)
CREATE TABLE IF NOT EXISTS public.production_longsong_containers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_order_id UUID REFERENCES public.production_orders(id) ON DELETE CASCADE,
  container_number INTEGER NOT NULL,
  initial_weight_kg DECIMAL NOT NULL,
  current_weight_kg DECIMAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'AVAILABLE', -- 'AVAILABLE', 'PARTIAL', 'EMPTY'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Tabel public.production_packing_entries (Pencatatan packing varian rasa)
CREATE TABLE IF NOT EXISTS public.production_packing_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  frying_batch_id UUID REFERENCES public.production_frying_batches(id) ON DELETE SET NULL,
  production_order_id UUID NOT NULL REFERENCES public.production_orders(id) ON DELETE CASCADE,
  flavor_variant TEXT NOT NULL DEFAULT 'Original',
  longsong_number INTEGER NOT NULL DEFAULT 1,
  longsong_weight_gram INTEGER,
  packaged_toples_count INTEGER DEFAULT 0,
  packaging_type TEXT DEFAULT 'Standing Pouch',
  packaging_weight_gram TEXT DEFAULT '100g',
  seasoning_used_gram DECIMAL DEFAULT 0,
  longsongs_used_count INTEGER DEFAULT 1,
  defect_packaging_count INTEGER DEFAULT 0,
  is_packed BOOLEAN DEFAULT FALSE,
  packed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Tabel public.time_study_samples (Sampel studi waktu HACCP per batch)
CREATE TABLE IF NOT EXISTS public.time_study_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_order_id UUID NOT NULL REFERENCES public.production_orders(id) ON DELETE CASCADE,
  stage TEXT NOT NULL DEFAULT 'FRYING',
  sample_number INTEGER NOT NULL DEFAULT 1,
  started_at TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ,
  duration_seconds DECIMAL,
  operator_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Indexes untuk Performa Cepat
CREATE INDEX IF NOT EXISTS idx_frying_batches_order ON public.production_frying_batches(production_order_id);
CREATE INDEX IF NOT EXISTS idx_longsong_containers_order ON public.production_longsong_containers(production_order_id);
CREATE INDEX IF NOT EXISTS idx_longsong_containers_status ON public.production_longsong_containers(status);
CREATE INDEX IF NOT EXISTS idx_packing_entries_order ON public.production_packing_entries(production_order_id);
CREATE INDEX IF NOT EXISTS idx_packing_entries_unpacked ON public.production_packing_entries(is_packed) WHERE is_packed = FALSE;
CREATE INDEX IF NOT EXISTS idx_time_study_order ON public.time_study_samples(production_order_id);

-- 8. Row Level Security (RLS) Policies
ALTER TABLE public.production_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_frying_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_longsong_containers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_packing_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_study_samples ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for authenticated" ON public.production_orders;
CREATE POLICY "Allow all for authenticated" ON public.production_orders FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all for authenticated" ON public.production_frying_batches;
CREATE POLICY "Allow all for authenticated" ON public.production_frying_batches FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all for authenticated" ON public.production_longsong_containers;
CREATE POLICY "Allow all for authenticated" ON public.production_longsong_containers FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all for authenticated" ON public.production_packing_entries;
CREATE POLICY "Allow all for authenticated" ON public.production_packing_entries FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all for authenticated" ON public.time_study_samples;
CREATE POLICY "Allow all for authenticated" ON public.time_study_samples FOR ALL USING (true);

-- 9. Realtime Publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'production_orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.production_orders;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'production_frying_batches'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.production_frying_batches;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'production_longsong_containers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.production_longsong_containers;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'production_packing_entries'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.production_packing_entries;
  END IF;
END $$;
