# 🏭 KhumKhum ERP Modules Specification (erp-modules.md)

> **Scope:** Modul Internal ERP (`src/app/(shell)/*`)
> **Parent System:** `design-system/khumkhum/MASTER.md`
> **UI Rule Reference:** `AGENTS.md`

---

## 1. Arsitektur Layout Shell & Halaman ERP

Setiap halaman modul operasional ERP mengikuti struktur standar berikut:
1. **PageHeader**: Judul modul, deskripsi singkat tujuan operasional, breadcrumbs hierarki, dan action buttons utama (Create / Export / Refresh).
2. **Summary / Metric Cards**: Ringkasan KPI penting di bagian atas (menggunakan `Card` dengan indikator status dan icon Lucide).
3. **Tab Navigation (Tabs)**: Pemisahan alur kerja (contoh: Real-time, Mutasi/Ledger, Opname, Laporan).
4. **Data Table (DataTable)**: Tabel data terstruktur dengan sorting, filtering, pagination, dan status badge.
5. **Modal / Drawer Form**: Formulir input transaksional dengan validasi ketat, auto-calculate, dan konfirmasi.

---

## 2. Standar Desain per Modul

### A. Modul Inventory & Stock (`/inventory` & `/warehouse`)
- **Fitur Utama:**
  - Kartu Ringkasan Kategori (Bahan Baku Jamur, Produk Jadi) dengan status Reorder Point (ROP).
  - Data Table Real-time Stock dengan kolom SKU, Nama Item, Gudang, Stok Aktual, Min Stock, Status.
  - Kartu Stok Mutasi (Rekening Koran) dengan traceability No. Batch Produksi.
  - Form Stock Opname Fisik dengan auto-calculate deviasi dan akurasi stok (Target ≥ 98%).
  - Laporan Rekap Kerugian dari selisih minus opname.
  - Modal Penerimaan Bahan Baku Non-Jamur (Tepung, Minyak, Bumbu, Kemasan).
- **Icon Standar:**
  - `Sprout` (Bahan Baku), `Package` (Produk Jadi), `BarChart3` (Stok Real-time), `ClipboardList` (Kartu Stok), `Search` (Opname), `TrendingDown` (Kerugian), `CheckCircle2` (Tercapai), `AlertTriangle` (Perlu Cek).

### B. Modul PPIC & Forecasting (`/ppic`)
- **Fitur Utama:**
  - Meteran Perbandingan Pasokan vs Permintaan (Supply vs Demand Gap: Surplus / Deficit / Balanced).
  - Proyeksi Ketersediaan Daun Jamur 4 Minggu (Holt's Linear Trend / Double Exponential Smoothing).
  - Material Requirement Planning (MRP) otomatis untuk kebutuhan bumbu, minyak, dan pouch.
  - Analisis Permintaan Spesifik per Varian Rasa Produk Jadi.
  - Riwayat & Tren Output Jamur Matang Penggorengan (Kapasitas Produksi Harian & Mingguan).
  - Form Input Manual (Bypass) Historis Penggorengan dan Sortasi Daun.
- **Icon Standar:**
  - `LineChart` (Rencana Rasa), `Flame` (Jamur Matang), `Sprout` (Daun Sortasi), `Scale` (Seimbang), `Target` (Analisis Spesifik).

### C. Modul Manufaktur & Produksi (`/production`)
- **Struktur 2 Tab Kerja:**
  1. **Tab Produksi Goreng Jamur:**
     - Pencatatan per batch wajan goreng (default input: 800 gram / wajan, suhu minyak 160-180°C, durasi goreng).
     - Input hasil output jamur matang per wajan, jumlah longsong/ball yang dihasilkan, dan berat kremesan/remukan (gram) terpisah.
     - Live calculate rendemen penggorengan (Standar efisiensi ≥ 80%).
     - KPI Cards: Batch Wajan Hari Ini, Rata-rata Rendemen, Total Kremesan (kilogram), Reminder Longsong Belum Dipacking.
  2. **Tab Produksi Packing Rasa:**
     - Pencatatan packing per longsong (Varian rasa: Original, Balado, BBQ, Pedas Manis, Super Pedas).
     - **Integrasi Penuh dengan Hasil Goreng Jamur:**
       - Pemilihan SPK Produksi secara eksklusif hanya menampilkan SPK yang telah menyelesaikan tahap penggorengan jamur (memiliki output wajan & longsong matang).
       - Dropdown SPK menampilkan status: `{SPK} — {Varian} ({sisa} Longsong Siap Packing / {total} Longsong Masak)`.
       - Kartu status integrasi menampilkan: `Total Longsong Masak`, `Sudah Dipacking`, dan `Sisa Siap Packing`.
       - Pemilihan Wajan Asal (`frying_batch_id`) opsional untuk melacak asal wajan spesifik atau campuran SPK.
       - Auto-suggest nomor urut longsong berikutnya dan estimasi berat rata-rata per longsong.
     - Input data kemasan: Tipe Packaging (Standing Pouch, Toples, Pouch, Plastik Bantal, Box / Dus), berat per kemasan (50g, 75g, 100g, 150g, 250g), jumlah kemasan/packaging yang dihasilkan (pcs), berat longsong (gram), dan bumbu tabur yang digunakan (gram).
     - Reminder visual banner jika ada longsong matang yang belum dipacking.
     - Tabel packing menampilkan kolom terintegrasi `SPK & Wajan Asal` untuk penelusuran (*traceability*) batch produksi.
- **Alur Pembuatan Batch Terpisah (Regular vs HACCP Time Study):**
  - **1. Batch Goreng Biasa (Standar Operasional Wajan):**
    - Tombol: `Buat Batch Goreng Baru` (Primary, icon `Plus`).
    - Formulir persiapan operasional wajan cepat: SPK Produksi, Nomor Wajan, Berat Input (gram, default: 800g), Suhu Minyak (°C, default: 170°C), dan Catatan Operator.
    - Status awal: `Siap Goreng` dengan durasi stopwatch `0m 00s` (IDLE) dan tombol hijau `Mulai`.
    - Waktu tidak berjalan otomatis; operator menekan tombol `Mulai` saat mulai menggoreng, lalu mencatat hasil wajan via tombol `Input Hasil` (icon `Scale`) setelah selesai digoreng.
    - Pada modal `Input Hasil Goreng`, form input manual jam dinding ditiadakan. Operator cukup menginput `Berat Output Jamur *`, `Jumlah Longsong *`, dan `Berat Kremesan *`. Sistem secara otomatis mengkalkulasi waktu mulai, waktu selesai, dan durasi memasak wajan saat hasil disimpan.
  - **2. Batch HACCP Time Study (Kepatuhan Audit Bebas Handphone):**
    - Tombol: `Batch HACCP Time Study` (Secondary, icon `ClipboardCheck`).
    - Formulir khusus audit HACCP pencatatan dari jam dinding area steril: SPK, No Wajan, Input, Suhu.
    - Catatan Waktu Memasak HACCP: `Waktu Mulai Masak *` & `Waktu Selesai Masak *` (format `HH:mm`) dengan shortcut `Jam Sekarang` dan `+15 Menit`, auto-calculate durasi dan standar kepatuhan (15±5 mnt).
    - Hasil Goreng (Wajib Diisi): `Berat Output Jamur (gram) *` (> 0g), `Jumlah Longsong yang Dihasilkan *` (> 0), `Berat Kremesan/Remukan (gram) *` (≥ 0g), dan estimasi rendemen (≥ 80%).
    - Status langsung: `Selesai` dengan tampilan rentang jam HACCP pada kolom durasi dan tombol aksi `Edit Hasil` (icon `Pencil`).
- **Fitur Koreksi & Edit Hasil Batch (Pencil Action):**
  - Tersedia untuk seluruh batch wajan melalui tombol aksi `Edit Hasil` (icon `Pencil`).
  - Operator dapat mengoreksi data: `Berat Output Jamur (gram)`, `Jumlah Longsong yang Dihasilkan`, `Berat Kremesan (gram)`, dan `Catatan Operator`.
  - Perubahan data secara reaktif memperbarui tabel dan seluruh metrik KPI operasional (termasuk *Longsong Belum Packing* dan *Total Kremesan*) secara instan tanpa reload halaman.
- **Stopwatch Digital Terintegrasi:**
  - Stopwatch digital interaktif per baris wajan bagi terminal batas aman area produksi.
  - Kontrol inline per baris: `Mulai` (hijau), `Jeda` (kuning), `Lanjut` (biru), `Ulang` (abu-abu) tanpa emoji.
- **Icon Standar:**
  - `Flame`, `Package`, `Timer`, `Clock`, `Play`, `Pause`, `RotateCcw`, `CheckCircle2`, `BarChart3`, `Scale`, `Thermometer`, `Trash2`, `Info`, `Sparkles`, `Box`, `CookingPot`, `AlertTriangle`, `Pencil`, `ClipboardCheck`.

### D. Modul Penerimaan & Timbangan (`/receiving`)
- **Fitur Utama:**
  - Pencatatan berat kirim petani vs berat timbang pabrik.
  - Toleransi selisih berat (Maks. ±2%) dengan badge otomatis.
  - Integrasi WhatsApp Notifikasi otomatis ke nomor petani saat barang ditimbang.
- **Icon Standar:**
  - `Leaf`, `Check`, `AlertTriangle`, `ClipboardCheck`, `MessageCircle`.

### E. Modul Sortasi & Grading (`/sorting`)
- **Fitur Utama:**
  - Pencatatan pemisahan Daun Jamur (Grade A / B) dan Batang Jamur (Afkir / Limbah).
  - Kalkulasi % Rendemen Daun (Target ≥ 80%).
  - Penyesuaian otomatis stok gudang bahan baku bersih.
  - Integrasi pesan WhatsApp rekap grading ke petani.
- **Icon Standar:**
  - `Scale`, `CheckCircle`, `AlertTriangle`, `MessageCircle`.

### F. Modul Sales Order (`/sales`)
- **Fitur Utama:**
  - Pembuatan Pesanan Penjualan per Customer / Reseller.
  - Multi-item varian rasa dengan kalkulasi total otomatis.
  - Tombol hapus baris item dengan icon `Trash2` dan `aria-label="Hapus baris item"`.
  - Status pesanan: Draft, Confirmed, Processing, Shipped, Completed, Cancelled.
- **Icon Standar:**
  - `Plus`, `Trash2`, `Truck`, `FileText`, `CheckCircle`.

### G. Modul AI Forecast & Operational Insights (`/ai-forecast`)
- **Fitur Utama:**
  - Peramalan kebutuhan bahan baku multi-minggu.
  - Insight operasional otomatis (Anomali pasokan, peringatan ROP, rekomendasi shift kerja).
  - Rekomendasi tindakan taktis dengan icon `ArrowRight`.
- **Icon Standar:**
  - `Brain`, `Sparkles`, `TrendingUp`, `ArrowRight`, `ShieldAlert`.

### H. Modul Traceability Engine (`/traceability`)
- **Fitur Utama:**
  - Pelacakan 2 Arah: Forward Traceability (`RM-xxx` → Petani → Sortasi → Batch Produksi → QC) dan Backward Traceability (`PRD-xxx` → QC → Produksi → Sortasi → Penerimaan → Petani).
  - Visual timeline dengan step numbering dan status badge.
- **Icon Standar:**
  - `Search`, `ArrowRight`, `ArrowLeft`, `CheckCircle`, `AlertTriangle`.

---

## 3. Checklist Validasi Modul ERP

- [x] Semua icon menggunakan `lucide-react` tanpa emoji.
- [x] Semua icon dekoratif memiliki `aria-hidden="true"`.
- [x] Semua icon tombol mandiri memiliki `aria-label`.
- [x] Bebas error TypeScript (`tsc --noEmit`).
- [x] Sesuai alur bisnis UKM KhumKhum CV Khaira Buana Mas.
