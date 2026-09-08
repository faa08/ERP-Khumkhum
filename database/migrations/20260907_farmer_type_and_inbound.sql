-- ==============================================================================
-- Migration: Add farmer_type and general settings
-- Date: 2026-09-07
-- Scope: Developer 1 Revisi (Petani Sekitar vs Mitra Besar & Standarisasi Satuan)
-- ==============================================================================

-- 1. Tambah kolom farmer_type di tabel farmers
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'farmers' AND column_name = 'farmer_type'
    ) THEN
        ALTER TABLE farmers ADD COLUMN farmer_type VARCHAR(20) DEFAULT 'SEKITAR';
    END IF;
END $$;

-- 2. Pastikan data petani eksisting memiliki nilai default SEKITAR
UPDATE farmers
SET farmer_type = 'SEKITAR'
WHERE farmer_type IS NULL;

-- 3. Tambahkan check constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_farmer_type'
    ) THEN
        ALTER TABLE farmers ADD CONSTRAINT chk_farmer_type CHECK (farmer_type IN ('SEKITAR', 'MITRA_BESAR'));
    END IF;
END $$;

-- 4. Default General Settings (Standarisasi Satuan Kilogram & Presisi Desimal)
INSERT INTO settings (key, value, updated_at)
VALUES (
    'general_settings',
    jsonb_build_object(
        'default_weight_uom', 'kg',
        'decimal_precision', 2,
        'min_weight_step', 0.01
    ),
    NOW()
)
ON CONFLICT (key) DO NOTHING;
