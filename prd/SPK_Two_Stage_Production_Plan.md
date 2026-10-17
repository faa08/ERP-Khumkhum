# Rencana Arsitektur: SPK 2-Tahap & Pemotongan Otomatis Bahan Baku Gudang
**Sistem ERP KhumKhum Jamur Crispy (CV Khaira Buana Mas)**

---

## 📌 1. Keputusan Desain SPK: Opsi 3 (Two-Stage Linked Production)

Berdasarkan kesepakatan, sistem mengadopsi **Opsi 3: SPK Masak Curah $\to$ Sesi Packing Dinamis**:

```mermaid
flowchart TD
    subgraph Tahap 1: SPK Masak Curah (Penggorengan & Spinner)
        A["Bahan Baku Gudang:\n- Jamur Tiram Segar kg\n- Tepung Premix kg\n- Minyak Goreng L"] -->|Auto-Deduct OUT| B[SPK Masak Harian]
        B --> C["Batch Wajan @0.8 kg - CCP 15 Mnt"]
        C --> D["Spinner Minyak - CCP 5 Mnt"]
        D -->|Auto-Add IN| E["Stok WIP:\nLongsong Jamur Polos Curah"]
    end

    subgraph Transisi: Buffer Longsong
        E -->|Monitoring HACCP| F{"Kartu Reminder:\nLongsong Belum Dikemas"}
    end

    subgraph Tahap 2: Sesi Packing Dinamis (Finishing & Bumbu)
        F -->|Buka Sesi Packing| G[Pilih Longsong Asal]
        G --> H["Pilih Varian Bumbu:\nBalado / BBQ / Ori / Pedas Manis / Super Pedas"]
        G --> I["Pilih Jenis Kemasan:\nPouch 100g / Toples 150g"]
        H & I -->|Auto-Deduct OUT| J[Bumbu Tabur & Kemasan Gudang]
        E -->|Auto-Deduct OUT| K[Konsumsi Longsong WIP]
        J & K --> L[Output Selesai Packing]
        L -->|Auto-Add IN| M[Barang Jadi Siap Jual / FG pcs]
        L -->|Auto-Add IN| N["Produk Sampingan: Kremesan kg"]
    end
```

---

## ⚙️ 2. Mekanisme Pemotongan Bahan Baku Otomatis (*Auto-Deduction / Backflushing*)

Agar stok bahan baku di gudang otomatis berkurang saat produksi selesai tanpa operator harus input manual dua kali ke modul gudang, kita menerapkan teknik **BOM-Based Backflushing with Confirmation**.

### A. Rumus Konsumsi Bahan Baku (BOM Dasar)

Sesuai master standar yang sudah tersimpan di `src/actions/standards.ts`:

#### 1. Konsumsi Tahap 1 (Goreng & Spinner):
Setiap **$1.0\text{ kg}$ Jamur Tiram Segar** yang digoreng, menghabiskan:
* **Jamur Segar:** $1.00 \times \text{Input Jamur (kg)}$
* **Tepung Premix:** $0.25 \times \text{Input Jamur (kg)}$ (atau sesuai formula premix)
* **Minyak Goreng Sawit:** $0.30 \times \text{Input Jamur (L)}$

> **Contoh:** Jika SPK Masak mengeksekusi $50\text{ kg}$ jamur segar:
> - Jamur Segar berkurang: **$50.0\text{ kg}$**
> - Tepung Premix berkurang: $50 \times 0.25 = \mathbf{12.5\text{ kg}}$
> - Minyak Goreng berkurang: $50 \times 0.30 = \mathbf{15.0\text{ Liter}}$

#### 2. Konsumsi Tahap 2 (Packing & Pembumbuan):
Saat $X\text{ pcs}$ kemasan selesai dipacking dari Longsong:
* **Stok Longsong (WIP):** Berkurang sesuai berat jamur yang masuk kemasan ($+ \text{kremesan}$).
* **Bumbu Tabur:** Berkurang sesuai rasio varian (misal: Balado $8\%$, BBQ $7\%$, Super Pedas $10\%$).
* **Kemasan (Pouch / Toples):** Berkurang sejumlah $X\text{ pcs}$ ($+ \text{toleransi reject seal}$).

---

## 🗄️ 3. Alur Mutasi Tabel Database (`inventory` & `stock_movements`)

Setiap pengurangan bahan baku wajib mencatat **Kartu Stok Keluar** agar audit gudang tidak selisih:

```sql
-- 1. Kurangi Quantity di Tabel inventory
UPDATE inventory 
SET 
  quantity = quantity - :consumed_quantity,
  last_updated_at = NOW()
WHERE 
  warehouse_id = :raw_material_warehouse_id 
  AND item_type = 'RAW_MATERIAL' 
  AND item_id = :raw_material_id;

-- 2. Catat Riwayat Mutasi di stock_movements
INSERT INTO stock_movements (
  inventory_id,
  movement_type,        -- 'OUT'
  quantity,             -- Jumlah yang dikonsumsi
  reference_type,       -- 'PRODUCTION_CONSUMPTION'
  reference_id,         -- ID SPK / ID Batch Masak
  notes,                -- 'Konsumsi bahan baku SPK #BATCH-001 (50 kg Jamur)'
  movement_date,
  created_by
) VALUES (...);
```

---

## 🚀 4. Trigger Waktu Pemotongan: Kapan Stok Harus Berkurang?

1. **Trigger Utama: Saat SPK Masak / Sesi Penggorengan Selesai**
   * Begitu tim goreng menyelesaikan seluruh batch wajan pada hari itu dan menekan `[Selesaikan SPK Masak]`:
   * Modal konfirmasi menampilkan ringkasan otomatis:
     > *"Menyelesaikan SPK akan memotong stok gudang: 50 kg Jamur Segar, 12.5 kg Tepung Premix, 15 L Minyak Goreng. Konfirmasi?"*
   * Begitu ditekan **Ya, Selesaikan**, server action langsung mengeksekusi mutasi `OUT` secara atomik.

2. **Trigger Kedua: Saat Sesi Packing Selesai**
   * Setiap kali operator mencatat hasil packing (misal 100 bungkus Balado):
   * Otomatis memotong stok bumbu tabur Balado & plastik pouch sesuai rasio kemasan, dan memasukkan produk jadi siap jual ke gudang.
