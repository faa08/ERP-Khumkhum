-- 1. Hapus semua data ganda (sisakan satu untuk setiap nama operasi)
DELETE FROM master_operations
WHERE id IN (
    SELECT id
    FROM (
        SELECT id,
        ROW_NUMBER() OVER(PARTITION BY operation_name ORDER BY id) as row_num
        FROM master_operations
    ) t
    WHERE t.row_num > 1
);

-- 2. Tambahkan UNIQUE constraint agar tidak ada duplikat di masa depan
ALTER TABLE master_operations ADD CONSTRAINT unique_operation_name UNIQUE (operation_name);

-- 3. Masukkan kembali role-role yang sempat terhapus (Penerimaan, Sortasi, dll)
INSERT INTO master_operations (operation_name, description, rating_factor, allowance_percentage) VALUES
('Penerimaan Bahan Baku', 'Penerimaan jamur dari petani', 1.00, 0.15),
('Sortasi & Grading', 'Mensortir dan mengelompokkan jamur', 1.00, 0.15),
('Penyimpanan (Gudang)', 'Penyimpanan bahan baku di gudang', 1.00, 0.10),
('Quality Control (QC)', 'Pengecekan kualitas produk', 1.00, 0.15)
ON CONFLICT (operation_name) DO NOTHING;
