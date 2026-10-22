-- FIX: Nonaktifkan trigger double counting pada stock_movements
-- Alasan: Seluruh Server Action di aplikasi (Inventory, Produksi, Sorting, Sales, QC, Setup Master)
-- sudah menghitung dan mengupdate tabel `inventory` secara langsung. 
-- Keberadaan trigger ini membuat setiap penambahan stok bertambah 2x lipat (+1000 jadi +2000)
-- dan setiap pengurangan stok terpotong 2x lipat.

DROP TRIGGER IF EXISTS trigger_stock_movement_update ON stock_movements;
DROP FUNCTION IF EXISTS update_inventory_on_stock_movement();
