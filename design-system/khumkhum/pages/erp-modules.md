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
     - Input berat longsong, bumbu tabur yang digunakan (gram), jumlah toples, dan ukuran gramatur kemasan (50g, 100g, 150g, 250g).
     - Reminder visual banner jika ada longsong matang yang belum dipacking.
     - Aksi `Tandai Selesai` per entri longsong.
- **Time Study Stopwatch (Ramah Operator Lanjut Usia):**
  - Stopwatch digital built-in dengan display timer besar (`font-mono text-4xl`).
  - Fitur kontrol lengkap tanpa emoji:
    - `Mulai` (`Play className="w-5 h-5" aria-hidden="true"`)
    - `Jeda` & `Lanjut` (`Pause className="w-5 h-5"` / `Play className="w-5 h-5"`) untuk istirahat/jeda.
    - `Ulang` (`RotateCcw className="w-4 h-4"`) untuk mereset waktu ke 0 jika salah pencet tanpa menyimpan sample cacat.
    - `Selesai & Simpan` (`CheckCircle2 className="w-5 h-5"`) untuk menyimpan sample.
  - Perhitungan Waktu Baku otomatis setelah minimal 10 sample:
    - `Waktu Normal = Waktu Siklus Rata-rata × Rating Faktor`
    - `Waktu Baku = Waktu Normal × (1 + Kelonggaran/Allowance)`
- **Icon Standar:**
  - `Flame`, `Package`, `Timer`, `Play`, `Pause`, `RotateCcw`, `CheckCircle2`, `BarChart3`, `Scale`, `Thermometer`, `Trash2`, `Info`, `Sparkles`, `Box`, `CookingPot`, `AlertTriangle`.

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
