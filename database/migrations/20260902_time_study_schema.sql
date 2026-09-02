-- ==============================================================================
-- TIME STUDY, CLOCK IN/OUT, & BATCH TRACKING SCHEMA
-- ==============================================================================

-- 1. CLEANUP SISTEM LAMA (Jam Operasional & Shift)
-- ==============================================================================
-- Hapus kolom planned_shift dari production_orders (karena freelance tidak pakai shift)
ALTER TABLE production_orders DROP COLUMN IF EXISTS planned_shift;

-- Hapus setting jam operasional dari tabel settings
DELETE FROM settings WHERE key = 'operating_hours_standards';

-- 2. MASTER DATA BARU UNTUK TIME STUDY
-- ==============================================================================
CREATE TABLE IF NOT EXISTS master_operations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  operation_name VARCHAR(255) NOT NULL, -- e.g., 'Penggorengan', 'Penimbangan', 'Packing'
  description TEXT,
  rating_factor DECIMAL(5,2) DEFAULT 1.00, -- 1.00 = 100% (Normal)
  allowance_percentage DECIMAL(5,2) DEFAULT 0.15, -- 0.15 = 15% Kelonggaran
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert Default Operations
INSERT INTO master_operations (operation_name, description, rating_factor, allowance_percentage) VALUES
('Pencampuran Adonan & Penggorengan', 'Menggoreng jamur crispy per batch', 1.00, 0.20),
('Penirisan (Spinning)', 'Meniriskan minyak dengan mesin spinner', 1.00, 0.10),
('Pembumbuan (Seasoning)', 'Mencampur jamur matang dengan bumbu', 1.00, 0.15),
('Pengemasan (Packing)', 'Memasukkan produk ke dalam kemasan', 1.00, 0.15)
ON CONFLICT DO NOTHING;

-- 3. CLOCK IN / CLOCK OUT & JEDA (SESI KERJA)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS worker_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_id UUID REFERENCES users(id) NOT NULL,
  worker_name VARCHAR(255) NOT NULL,
  operation_id UUID REFERENCES master_operations(id) NOT NULL,
  production_order_id UUID REFERENCES production_orders(id), -- Opsional
  
  clock_in_time TIMESTAMP WITH TIME ZONE NOT NULL,
  clock_out_time TIMESTAMP WITH TIME ZONE,
  
  total_working_minutes DECIMAL(10,2), -- Durasi bersih
  total_paused_minutes DECIMAL(10,2) DEFAULT 0, -- Total waktu istirahat
  
  status VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE, PAUSED, COMPLETED
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Session Breaks (Jeda)
CREATE TABLE IF NOT EXISTS session_breaks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES worker_sessions(id) NOT NULL,
  
  pause_start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  pause_end_time TIMESTAMP WITH TIME ZONE,
  
  duration_minutes DECIMAL(10,2),
  reason VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. TIME STUDY BATCH (PENGUKURAN WAKTU SIKLUS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS time_study_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  operation_id UUID REFERENCES master_operations(id) NOT NULL,
  
  -- Data Batch
  batch_quantity DECIMAL(10,2) NOT NULL,
  defect_quantity DECIMAL(10,2) DEFAULT 0, -- Jumlah reject/cacat dalam batch
  duration_minutes DECIMAL(10,2) NOT NULL,
  
  notes TEXT,
  recorded_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- View untuk Menghitung Waktu Baku
DROP VIEW IF EXISTS vw_standard_times;
CREATE VIEW vw_standard_times AS
SELECT 
    m.id AS operation_id,
    m.operation_name,
    COUNT(t.id) AS total_batches_sampled,
    SUM(t.batch_quantity) AS total_units_sampled,
    SUM(t.duration_minutes) AS total_duration_minutes,
    
    (SUM(t.duration_minutes) / NULLIF(SUM(t.batch_quantity), 0)) AS average_cycle_time_per_unit,
    
    m.rating_factor,
    ((SUM(t.duration_minutes) / NULLIF(SUM(t.batch_quantity), 0)) * m.rating_factor) AS normal_time,
    
    m.allowance_percentage,
    (((SUM(t.duration_minutes) / NULLIF(SUM(t.batch_quantity), 0)) * m.rating_factor) * (1 + m.allowance_percentage)) AS standard_time

FROM master_operations m
LEFT JOIN time_study_batches t ON m.id = t.operation_id
GROUP BY m.id, m.operation_name, m.rating_factor, m.allowance_percentage;
