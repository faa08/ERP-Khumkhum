-- FASE 3.1: LANDASAN MODUL KEUANGAN (COSTING)
-- Menambahkan Harga Pokok Produksi (HPP) / Biaya Satuan ke dalam pergerakan stok

ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS unit_cost DECIMAL(15,2) DEFAULT 0;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS total_cost DECIMAL(15,2) DEFAULT 0;

-- Catatan Logika HPP ke depannya:
-- Saat RECEIVING (Beli barang): unit_cost diisi dari harga beli petani.
-- Saat PRODUCTION (Bikin barang): unit_cost produk jadi dihitung dari (Total unit_cost bahan baku yang dipakai + Biaya Overhead) / Jumlah produk jadi.
-- Saat SALES (Jual barang): unit_cost diambil dari nilai HPP rata-rata (Moving Average) atau FIFO yang ada di buku inventaris.
