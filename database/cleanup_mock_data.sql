-- ==============================================================================
-- CLEANUP SCRIPT: HAPUS MOCK DATA AI FORECASTING
-- Script ini akan menghapus SEMUA data percobaan (mock data) yang sebelumnya
-- dimasukkan melalui file `mock_forecast_data.sql`.
--
-- CARA PAKAI:
-- Copy dan jalankan di Supabase SQL Editor
-- ==============================================================================

-- Hapus berurutan dari bawah ke atas untuk menghindari error Foreign Key (Relasi)

-- 1. Hapus Sales Orders & Items
DELETE FROM sales_order_items WHERE id::text LIKE '88aaa001-%';
DELETE FROM sales_orders WHERE id::text LIKE '77aaa001-%';

-- 2. Hapus Inventory Stok
DELETE FROM inventory WHERE id::text LIKE '66aaa001-%';

-- 3. Hapus QC Inspections
DELETE FROM qc_inspections WHERE id::text LIKE '55aaa001-%';

-- 4. Hapus Production Materials & Orders
DELETE FROM production_materials WHERE id::text LIKE '44aaa001-%';
DELETE FROM production_orders WHERE id::text LIKE '33aaa001-%';

-- 5. Hapus Sortings & Receivings
DELETE FROM sortings WHERE id::text LIKE '22aaa001-%';
DELETE FROM receivings WHERE id::text LIKE '11aaa001-%';

-- 6. Hapus Settings BOM (opsional, jika ingin dikembalikan kosong)
-- DELETE FROM settings WHERE key = 'production_standards';

-- 7. Hapus Master Data (Gudang, Pelanggan, Petani, Produk, Bahan Baku)
DELETE FROM warehouses WHERE id::text LIKE 'ee000001-%';
DELETE FROM customers WHERE id::text LIKE 'dd000001-%';
DELETE FROM farmers WHERE id::text LIKE 'cc000001-%';
DELETE FROM products WHERE id::text LIKE 'bb000001-%';
DELETE FROM raw_materials WHERE id::text LIKE 'aa000001-%';

-- ==============================================================================
-- SELESAI! Semua mock data telah terhapus bersih dari database.
-- ==============================================================================
