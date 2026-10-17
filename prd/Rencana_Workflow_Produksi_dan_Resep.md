# Rencana Final (Disesuaikan dengan Pembaruan `main`): Alur Kerja Produksi, Premix, & Auto-Deduct
**Sistem ERP KhumKhum Jamur Crispy (CV Khaira Buana Mas)**

---

## 🔄 1. Analisis & Penyelarasan dengan Pembaruan `main` (Fast-Forward)

Setelah melakukan `git pull origin main`, terdapat 3 perubahan arsitektural besar yang **sangat menguntungkan dan selaras dengan rencana kita**:

1. **Halaman Khusus Peracikan Premix & Bumbu Sudah Ada:**
   - Telah ditambahkan halaman [`src/app/(shell)/production/premix/page.tsx`](file:///c:/Users/FACHRY/Documents/project%20-%20porto%20and%20pkl/1ag%20-%20khumkhum/ERP-Khumkhum/src/app/(shell)/production/premix/page.tsx) dan role `PREMIX`.
   - Modul ini sudah memiliki fitur dinamis: memilih bahan mentah dari gudang, template formula racikan (*Standard Premix* & *Bumbu Balado*), serta mencatat mutasi stok keluar bahan baku dan masuk produk premix.
   - **Keputusan:** Kita **tidak perlu membuat form mixing dari nol**, melainkan mengadopsi halaman `/production/premix` sebagai **Level 1 (Sub-Assembly)** dalam pipeline produksi.

2. **Wajan Penggorengan Bebas dari Ikatan SPK Kaku (Nullable SPK):**
   - Di migrasi `20261012_add_premix_and_packaging.sql`:
     ```sql
     -- Kolom production_order_id diubah menjadi NULLABLE
     -- Karena wajan hanya menggoreng jamur dasar (polos) dan masuk selongsong curah pool pabrik
     ALTER TABLE production_frying_batches ALTER COLUMN production_order_id DROP NOT NULL;
     ```
   - Validasi wajan di UI sudah tidak lagi mewajibkan `production_order_id`.
   - **Keputusan:** Ini membuktikan arah sistem kita 100% tepat: wajan menggoreng jamur polos curah (Longsong/Pool), baru nanti di packing dipecah ke varian rasa.

3. **Master Bahan Kemasan Sudah Mendukung Variasi:**
   - Kolom `packaging_type`, `flavor_variant`, dan `package_weight` telah ditambahkan ke tabel `raw_materials`.

---

## 🏗️ 2. Penyesuaian Alur Kerja Produksi Hulu ke Hilir (Updated Pipeline)

```mermaid
flowchart TD
    subgraph Level 1: Peracikan Premix & Bumbu (/production/premix)
        A1[Tepung Terigu / Aci / Maizena kg] & A2[Bumbu Halus / Bawang kg] -->|Auto-Deduct OUT Gudang| M[Halaman Premix & Bumbu]
        M -->|Auto-Add IN Gudang| B1[Item Gudang: Tepung Premix KhumKhum kg]
    end

    subgraph Level 2: Penggorengan Jamur Curah (/production)
        B1 & C1[Jamur Tiram Segar kg] & C2[Minyak Goreng Sawit L] -->|Auto-Deduct OUT Gudang| F[Wajan Goreng & Spinner CCP]
        F -->|Auto-Add IN WIP| D1[Buffer: Longsong Jamur Polos Curah]
    end

    subgraph Level 3: Finishing & Pembumbuan (/production)
        D1 & E1[Bumbu Tabur Balado/BBQ/dll kg] & E2[Kemasan Pouch/Toples pcs] -->|Auto-Deduct OUT Gudang & WIP| P[Sesi Packing Rasa]
        P -->|Auto-Add IN Gudang Siap Jual| FG[Barang Jadi Siap Jual pcs]
        P -->|Auto-Add IN Gudang Produk Sekunder| KR[Produk Sampingan: Kremesan kg]
    end
```

---

## 🧭 3. Penataan Menu Navigasi Sidebar yang Disesuaikan

Dengan hadirnya menu `/production/premix`, urutan menu di grup **Operasional** untuk tim produksi diselaraskan menjadi:

```
OPERASIONAL:
├── 1. Inbound (Penerimaan Jamur Petani)      (/receiving)
├── 2. Sortasi & Grading Jamur Segar          (/sorting)
├── 3. Resep & Standar BOM Produksi           (/master/production-standards)  👈 [Baru: Buka akses untuk role PRODUCTION]
├── 4. Peracikan Premix & Bumbu               (/production/premix)            👈 [Sudah ada dari main]
├── 5. Warehouse Bahan Baku (Stok Mentah)     (/warehouse)                    👈 [Read Only untuk PRODUCTION]
├── 6. PPIC & Jadwal Kerja                    (/ppic)
├── 7. Produksi & Rendemen (Wajan & Packing)  (/production)
├── 8. Quality Control (QC)                   (/quality-control)
├── 9. Inventaris Produk Jadi                 (/inventory)                    👈 [Read Only untuk PRODUCTION]
├── 10. Sales Order & Pengiriman              (/sales)
└── 11. Ketertelusuran (Traceability)         (/traceability)
```

---

## 🔐 4. Penyesuaian Matriks Hak Akses (RBAC) di `src/types/auth.ts`

Di `origin/main` saat ini:
```typescript
PRODUCTION: ['dashboard', 'production', 'premix', 'ppic', 'inventory', 'traceability']
```

**Disesuaikan Menjadi:**
```typescript
PRODUCTION: [
  'dashboard',
  'standards',    // Resep & BOM (Bisa atur formula & rasio wajan)
  'premix',       // Peracikan Premix & Bumbu
  'warehouse',    // Gudang bahan baku (Read-Only: cek ketersediaan jamur/minyak)
  'ppic',         // Jadwal kerja
  'production',   // Wajan & Packing
  'inventory',    // Gudang barang jadi (Read-Only: cek hasil packing masuk)
  'traceability'  // Lacak batch
]
```

---

## ⚡ 5. Item yang Harus Kita Bangun Sekarang (Action Plan)

Dari hasil pull `main`, tinggal **2 kepingan puzzle penting** yang belum selesai:
1. **Otomatisasi Pemotongan Bahan Baku Masak Wajan (Auto-Deduct SPK Masak):**
   - Saat SPK Masak / Sesi Goreng harian diselesaikan di `/production`, sistem otomatis menghitung pemakaian Jamur Segar, Tepung Premix (hasil racikan premix), dan Minyak Goreng berdasarkan rasio resep wajan, lalu memotong stok di `inventory` dan mencatat `stock_movements` (`OUT`).
2. **Penyelarasan Akses Role & Read-Only Guard:**
   - Tambahkan `'standards'` dan `'warehouse'` ke role `PRODUCTION`.
   - Pasang proteksi read-only di `/warehouse` dan `/inventory` agar role `PRODUCTION` hanya bisa melihat stok tanpa bisa utak-atik mutasi manual.
