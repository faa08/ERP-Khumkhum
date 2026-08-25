-- ==============================================================================
-- KHUMKHUM ERP — PRD REVISI KE-2 MIGRATION
-- Jalankan di Supabase SQL Editor
-- Script ini IDEMPOTENT (aman dijalankan berulang kali)
-- ==============================================================================

-- Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. TABEL RIWAYAT RAMALAN & PERBANDINGAN STOK (forecast_snapshots)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS forecast_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  forecast_week DATE NOT NULL,                   -- Tanggal awal pekan ramalan
  projected_cooked_mushroom_kg DECIMAL(10,2),    -- Perkiraan jamur matang masak (Hitungan Utama)
  projected_leaf_raw_kg DECIMAL(10,2),           -- Perkiraan daun jamur segar (Pelengkap)
  projected_demand_kg DECIMAL(10,2) NOT NULL,    -- Total kebutuhan dari pesanan pembeli
  gap_kg DECIMAL(10,2) NOT NULL,                 -- Selisih pasokan vs pesanan
  gap_status VARCHAR(20) NOT NULL,               -- 'SURPLUS', 'DEFICIT', 'BALANCED'
  actual_cooked_kg DECIMAL(10,2),                -- Realisasi jamur matang nyata
  actual_leaf_kg DECIMAL(10,2),                  -- Realisasi daun jamur nyata
  accuracy_percentage DECIMAL(5,2),              -- Nilai ketepatan ramalan (%)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 2. KOLOM TAMBAHAN PADA PRODUCTION ORDERS (Kapasitas & Shift)
-- ==============================================================================
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS capacity_utilization_pct DECIMAL(5,2);
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS planned_shift VARCHAR(50) DEFAULT 'SHIFT_1';

-- ==============================================================================
-- 3. MASTER DATA JAM OPERASIONAL PABRIK (Settings)
-- ==============================================================================
INSERT INTO settings (key, value) VALUES
(
  'operating_hours_standards',
  '{
    "work_days": ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"],
    "shifts": [
      {
        "shift_id": "SHIFT_1",
        "shift_name": "Shift 1 (Pagi - Reguler)",
        "start_time": "08:00",
        "end_time": "16:00",
        "break_minutes": 60,
        "effective_hours": 7.0,
        "max_fryer_batches": 14,
        "is_active": true
      },
      {
        "shift_id": "SHIFT_2",
        "shift_name": "Shift 2 (Sore - Lembur)",
        "start_time": "16:00",
        "end_time": "21:00",
        "break_minutes": 30,
        "effective_hours": 4.5,
        "max_fryer_batches": 9,
        "is_active": false
      }
    ],
    "batch_parameters": {
      "standard_frying_minutes": 15,
      "standard_spinning_minutes": 5,
      "standard_seasoning_minutes": 10,
      "total_cycle_minutes": 30
    }
  }'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- ==============================================================================
-- SELESAI! Migrasi PRD Revisi Ke-2 berhasil.
-- ==============================================================================
