# PRD DEVELOPER 3 — Manufaktur Produksi, Rendemen, QC & Standar Mutu
**Sistem ERP KhumKhum Jamur Crispy (CV Khaira Buana Mas)**

---

## 1. Profil & Tanggung Jawab Developer 3
* **Peran:** Manufacturing Process & Quality Assurance Engineer
* **Role Sistem yang Dipegang:** 
  * `PETUGAS_PRODUKSI` (Perintah Kerja SPK, Konsumsi Bahan Baku, Pencatatan Output Jamur Crispy)
  * `PETUGAS_QC` (Inspeksi Mutu Sampling, Pengujian Defect, Keputusan Release/Reject)
* **Tanggung Jawab Utama:** 
  Mengelola proses transformasi bahan mentah menjadi produk jadi jamur crispy kemasan, memastikan akurasi perhitungan rendemen (rasio output vs input), menjalankan inspeksi kontrol mutu, dan menjaga kepatuhan standar mutu pangan.

---

## 2. Area Kerja & Isolasi File (Zero-Conflict)

### File & Folder Milik Developer 3 (Bebas Edit):
```text
src/
├── app/(shell)/
│   ├── production/page.tsx              <-- Lini Produksi, SPK & Output
│   ├── quality-control/page.tsx         <-- Inspeksi QC & Defect Logging
│   ├── ppic/page.tsx                    <-- Penjadwalan Rencana Produksi
│   ├── ai-forecast/page.tsx             <-- Forecasting Kebutuhan Bahan
│   └── master/
│       ├── production-standards/page.tsx<-- Standar Rendemen & Resep Formula
│       └── qc-standards/page.tsx        <-- Standar Parameter Mutu
├── actions/
│   ├── production.ts                    <-- Server Actions: SPK, Konsumsi & Rendemen
│   ├── qc.ts                            <-- Server Actions: Inspeksi & Keputusan Mutu
│   ├── standards.ts                     <-- Server Actions: Konfigurasi Nilai Ambang
│   └── forecast.ts                      <-- Server Actions: Rumus Prediksi Kebutuhan
└── types/
    ├── production.ts                    <-- Tipe Batch SPK, Bahan, Hasil
    ├── qc.ts                            <-- Tipe Inspeksi, Defect Enum
    └── forecast.ts                      <-- Tipe Peramalan AI/Statistik
```

> [!WARNING]
> **Larangan:** Developer 3 **DILARANG** mengedit file `src/app/(shell)/master/farmers/`, `src/app/(shell)/master/customers/`, `src/app/(shell)/sales/`, `src/lib/auth-guard.ts`, atau `src/app/(auth)/login/` untuk menghindari *git merge conflict*.

---

## 3. Tabel Database yang Dikelola (Schema SQL)
Sesuai `database/schema.sql`:
1. `production_orders` (`id`, `batch_number`, `status`, `start_date`, `end_date`, `created_by`, `created_at`, `updated_at`)
2. `production_materials` (`id`, `production_order_id`, `raw_material_id`, `consumption_quantity`, `created_at`)
3. `production_results` (`id`, `production_order_id`, `product_id`, `finished_goods_quantity`, `wip_quantity`, `yield_percentage`, `created_at`)
4. `qc_inspections` (`id`, `reference_type`, `reference_id`, `is_passed`, `defect_type`, `notes`, `inspected_by`, `inspection_date`)
5. Terkoneksi ke `inventory` & `stock_movements` (untuk potong stok bahan dan tambah stok produk jadi).

---

## 4. Rincian Tugas & Spesifikasi Fitur

### 4.1 Modul Surat Perintah Kerja (SPK) & Batch Produksi (`production_orders`)
* **Pembuatan Batch Produksi:**
  1. Generate nomor batch unik produksi: `PRD-YYYYMMDD-XXXX` (contoh: `PRD-20260814-0001`).
  2. Input target produk jadi yang akan diproduksi (misal: 500 pcs Jamur Crispy Original 100g).
  3. Status Siklus Hidup Batch:
     $$\text{DRAFT} \longrightarrow \text{IN\_PROGRESS (Sedang Digoreng/Dibumbui)} \longrightarrow \text{QC\_PENDING} \longrightarrow \text{COMPLETED}$$

### 4.2 Modul Konsumsi Bahan Baku / BOM (`production_materials`)
* **Pemotongan Stok Bahan Otomatis:**
  * Saat batch berstatus `IN_PROGRESS`, catat penggunaan bahan baku riil:
    * Jamur Tiram Bersih Hasil Sortasi (kg)
    * Tepung Premiks Bumbu (kg)
    * Minyak Goreng Sawit (liter/kg)
    * Bumbu Tabur Perasa (kg)
  * Buat mutasi otomatis di `stock_movements` (`movement_type: 'OUT'`) agar stok bahan baku di gudang terpotong secara *real-time*.

### 4.3 Modul Hasil Produksi & Kalkulasi Rendemen (`production_results`)
* **Rumus Perhitungan Rendemen Otomatis:**
  $$\text{Yield Percentage (\%)} = \left( \frac{\text{Total Berat Jamur Crispy Jadi (kg)}}{\text{Total Berat Jamur Tiram Mentah (kg)}} \right) \times 100\%$$
* **Pengecekan Ambang Batas:**
  * Jika Rendemen $\ge 25\%$ (Standar Bagus) $\to$ Status Hijau / Optimal.
  * Jika Rendemen $< 20\%$ (Di Bawah Standar / Boros) $\to$ Muncul notifikasi peringatan (*Warning Alert*).

### 4.4 Modul Quality Control & Inspeksi Defect (`qc_inspections`)
* **Alur Inspeksi Mutu:**
  1. Pilih objek inspeksi (`reference_type: 'PRODUCTION'` atau `'RECEIVING'` atau `'SORTING'`).
  2. Pilih ID Batch terkait.
  3. Form Uji Organoleptik & Fisik:
     * Kadar Air Jamur (Maks 12%)
     * Warna & Tingkat Kematangan (Cerah Keemasan / Gosong)
     * Kerenyahan (*Crispiness test*)
     * Kerapatan Sealing Kemasan (*Air-tight test*)
  4. **Keputusan Kualitas (`is_passed`):**
     * **PASSED (Lolos):** Status batch produksi menjadi `COMPLETED`, otomatis menambahkan stok produk jadi ke `inventory` Gudang Utama.
     * **FAILED (Gagal / Afkir):** Pilih Kategori Defect (`GOSONG`, `KADAR_AIR_TINGGI`, `SEAL_BOCOR`, `REMUK`), stok dialihkan ke Gudang Afkir/Karantina, dan batch ditandai sebagai *Rejected*.

### 4.5 Modul Standar Mutu & AI Forecasting Sederhana
* **Master Standar Mutu (`src/actions/standards.ts`):**
  * Halaman konfigurasi batas toleransi cacat, resep BOM standar per 1 kg jamur mentah, dan batas suhu minyak penggorengan.
* **Forecasting Bahan Baku (`src/actions/forecast.ts`):**
  * Perhitungan tren sederhana (*Moving Average / Exponential Smoothing*) di TypeScript native:
    $$\text{Prediksi Kebutuhan Jamur Minggu Depan} = \frac{\sum \text{Pemakaian 4 Minggu Terakhir}}{4} \times (1 + \text{Safety Factor 10\%})$$

---

## 5. Checklist Pengerjaan Developer 3
- [ ] Buat Server Actions `src/actions/production.ts` (SPK & Batch No `PRD-...`)
- [ ] Buat logika potong stok bahan baku otomatis (`production_materials` $\to$ `stock_movements: OUT`)
- [ ] Buat fungsi kalkulator rendemen otomatis di `src/actions/production.ts`
- [ ] Hubungkan UI `src/app/(shell)/production/page.tsx` ke database nyata
- [ ] Buat Server Actions `src/actions/qc.ts` (Inspeksi Defect & Passing Logic)
- [ ] Implementasikan auto-transfer stok ke gudang produk jadi saat QC Pass
- [ ] Hubungkan UI `src/app/(shell)/quality-control/page.tsx`
- [ ] Buat Server Actions `src/actions/standards.ts` dan hubungkan `src/app/(shell)/master/production-standards/` & `qc-standards/`
- [ ] Implementasikan rumus estimasi kebutuhan bahan di `src/actions/forecast.ts` & hubungkan `src/app/(shell)/ai-forecast/page.tsx`
