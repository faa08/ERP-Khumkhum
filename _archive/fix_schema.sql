-- Hapus View yang bergantung pada tabel ini
DROP VIEW IF EXISTS vw_standard_times;

-- Hapus tabel lama yang strukturnya sudah tidak sesuai (kolom start_time dsb)
DROP TABLE IF EXISTS time_study_batches CASCADE;

-- Buat ulang tabel dengan struktur yang benar dan bersih
CREATE TABLE time_study_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  operation_id UUID REFERENCES master_operations(id) NOT NULL,
  
  -- Data Batch
  batch_quantity DECIMAL(10,2) NOT NULL,
  defect_quantity DECIMAL(10,2) DEFAULT 0,
  duration_minutes DECIMAL(10,2) NOT NULL,
  temperature DECIMAL(5,2), -- Tambahan Suhu Penggorengan
  
  notes TEXT,
  recorded_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Buat kembali View untuk Kalkulasi Waktu Baku
CREATE VIEW vw_standard_times AS
SELECT 
    m.id AS operation_id,
    m.operation_name,
    COUNT(t.id) AS total_batches_sampled,
    SUM(t.batch_quantity) AS total_units_sampled,
    SUM(t.duration_minutes) AS total_duration_minutes,
    
    -- Waktu Siklus Rata-rata (Ws)
    CASE WHEN SUM(t.batch_quantity) > 0 THEN 
        SUM(t.duration_minutes) / SUM(t.batch_quantity) 
    ELSE 0 END AS average_cycle_time_per_unit,
    
    m.rating_factor,
    m.allowance_percentage,
    
    -- Waktu Normal (Wn) = Ws x Rating Factor
    (CASE WHEN SUM(t.batch_quantity) > 0 THEN 
        SUM(t.duration_minutes) / SUM(t.batch_quantity) 
    ELSE 0 END) * m.rating_factor AS normal_time,
    
    -- Waktu Baku (Wb) = Wn / (1 - Allowance) atau Wn + (Wn * Allowance)
    -- Kita gunakan Wn * (1 + Allowance) untuk kesederhanaan
    ((CASE WHEN SUM(t.batch_quantity) > 0 THEN 
        SUM(t.duration_minutes) / SUM(t.batch_quantity) 
    ELSE 0 END) * m.rating_factor) * (1 + m.allowance_percentage) AS standard_time
    
FROM master_operations m
LEFT JOIN time_study_batches t ON m.id = t.operation_id
GROUP BY m.id, m.operation_name, m.rating_factor, m.allowance_percentage;
