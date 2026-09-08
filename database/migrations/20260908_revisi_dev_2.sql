-- =============================================
-- Migration: Revisi Modul Developer 2 (Penerimaan, Master, Gudang)
-- Date: 2026-09-08
-- Description: Tambahan kolom supplier_type, bank di farmers; lead_time di inventory
-- =============================================

-- 1. Tambah kolom di tabel farmers
ALTER TABLE farmers
  ADD COLUMN IF NOT EXISTS supplier_type TEXT DEFAULT 'FARMER_MICRO' CHECK (supplier_type IN ('FARMER_MICRO', 'FARMER_MAIN', 'EXTERNAL_SUPPLIER')),
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_number TEXT;

-- 2. Tambah kolom lead time di tabel inventory
ALTER TABLE inventory
  ADD COLUMN IF NOT EXISTS lead_time_days INTEGER DEFAULT 0;

-- 3. Tambah Gudang Konsinyasi (Jika Belum Ada)
INSERT INTO warehouses (name, location)
SELECT 'Gudang Display Mall / Modern Market', 'Lokasi Eksternal (Mall)'
WHERE NOT EXISTS (
    SELECT 1 FROM warehouses WHERE name = 'Gudang Display Mall / Modern Market'
);
