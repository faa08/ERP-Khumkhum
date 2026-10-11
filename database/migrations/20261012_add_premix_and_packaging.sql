-- ==============================================================================
-- Migration: Add PREMIX Role, Packaging Variation Columns, and Optional Frying Order
-- Date: 2026-10-12
-- ==============================================================================

-- 1. Tambah Role PREMIX ke Enum user_role jika belum ada
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'user_role' AND e.enumlabel = 'PREMIX'
  ) THEN
    ALTER TYPE user_role ADD VALUE 'PREMIX';
  END IF;
END $$;

-- 2. Tambah Kolom Variasi & Ukuran Kemasan ke raw_materials
ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS packaging_type TEXT;
ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS flavor_variant TEXT;
ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS package_weight TEXT;

-- 3. Izinkan production_order_id bersifat opsional (Nullable) di production_frying_batches
-- Karena wajan hanya menggoreng jamur dasar (polos) dan masuk selongsong curah pool pabrik
ALTER TABLE production_frying_batches ALTER COLUMN production_order_id DROP NOT NULL;
