-- 1. Hapus riwayat batch produksi dan sesi yang mengunci operasi (agar bisa di-reset bersih)
DELETE FROM time_study_batches;
DELETE FROM worker_sessions;
DELETE FROM master_operations;

-- 2. Pastikan ada UNIQUE constraint agar tidak ada duplikat di masa depan
DO $$ 
BEGIN
  IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'unique_operation_name'
  ) THEN
      ALTER TABLE master_operations ADD CONSTRAINT unique_operation_name UNIQUE (operation_name);
  END IF;
END $$;

-- 3. Masukkan role operasional yang SEJAJAR dengan modul sistem (High-Level)
INSERT INTO master_operations (operation_name, description, rating_factor, allowance_percentage) VALUES
('Inbound (Penerimaan)', 'Penerimaan jamur dari petani', 1.00, 0.15),
('Sortasi & Grading', 'Mensortir dan mengelompokkan jamur', 1.00, 0.15),
('Warehouse (Bahan Baku)', 'Penyimpanan bahan baku di gudang', 1.00, 0.10),
('Produksi (Penggorengan)', 'Proses utama pembuatan jamur crispy', 1.00, 0.20),
('Quality Control (QC)', 'Pengecekan kualitas produk', 1.00, 0.15),
('Pengemasan (Packing)', 'Memasukkan produk ke kemasan final', 1.00, 0.15),
('Inventaris (Produk Jadi)', 'Pengelolaan stok barang matang', 1.00, 0.10)
ON CONFLICT (operation_name) DO NOTHING;
