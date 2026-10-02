-- FASE 1.1: SOFT DELETES
-- Menambahkan kolom deleted_at untuk mencegah hilangnya data secara permanen (Hard Delete).

ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE warehouse_pics ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE receivings ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE sortings ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE production_materials ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE production_results ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE qc_inspections ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE sales_order_items ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- FASE 1.2: RESOLUSI RACE CONDITION INVENTORY
-- Menggunakan Database Trigger agar kalkulasi stok sepenuhnya dikendalikan DB (ACID Compliant).

-- Buat Fungsi Kalkulasi Stok
CREATE OR REPLACE FUNCTION update_inventory_on_stock_movement()
RETURNS TRIGGER AS $$
BEGIN
    -- Update kolom quantity di tabel inventory berdasarkan tipe pergerakan
    IF TG_OP = 'INSERT' THEN
        IF NEW.movement_type = 'IN' THEN
            UPDATE inventory 
            SET quantity = quantity + NEW.quantity, last_updated_at = NOW()
            WHERE id = NEW.inventory_id;
        ELSIF NEW.movement_type = 'OUT' THEN
            UPDATE inventory 
            SET quantity = quantity - NEW.quantity, last_updated_at = NOW()
            WHERE id = NEW.inventory_id;
        ELSIF NEW.movement_type = 'ADJUSTMENT' THEN
            -- Adjustment dapat bernilai positif atau negatif dari aplikasi
            UPDATE inventory 
            SET quantity = quantity + NEW.quantity, last_updated_at = NOW()
            WHERE id = NEW.inventory_id;
        END IF;
        
        -- Catatan: Untuk 'TRANSFER', backend wajib melakukan 2 insert: 
        -- 1x 'OUT' untuk inventory sumber, dan 1x 'IN' untuk inventory tujuan.
        
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Hapus trigger jika sudah ada
DROP TRIGGER IF EXISTS trigger_stock_movement_update ON stock_movements;

-- Pasang trigger pada tabel stock_movements
CREATE TRIGGER trigger_stock_movement_update
AFTER INSERT ON stock_movements
FOR EACH ROW
EXECUTE FUNCTION update_inventory_on_stock_movement();


-- FASE 1.1b: UPDATABLE VIEWS UNTUK SOFT DELETE (CARA A)
-- Karena backend menggunakan supabaseAdmin (Service Role) yang membypass RLS,
-- kita me-rename tabel asli dan membuat updatable view dengan nama asli.

/* CONTOH PENERAPAN UNTUK TABEL FARMERS (Ulangi untuk tabel lain jika disetujui) */
-- ALTER TABLE farmers RENAME TO farmers_data;
-- CREATE VIEW farmers AS SELECT * FROM farmers_data WHERE deleted_at IS NULL;
