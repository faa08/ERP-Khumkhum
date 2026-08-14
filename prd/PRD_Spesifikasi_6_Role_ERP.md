# Product Requirements Document (PRD)
## Spesifikasi Lengkap 6 Role, Alur Kerja, Input-Output & Strategi Implementasi Tim
### Sistem ERP & Ketertelusuran Berbasis Data — KhumKhum Jamur Crispy (CV Khaira Buana Mas)

**Nomor Dokumen:** PRD-KK-2026-002  
**Versi:** 1.0 (Dedicated Role & Team Implementation Specification)  
**Tanggal:** Agustus 2026  
**Status:** Dokumen Resmi Spesifikasi Rekayasa Perangkat Lunak  
**Program:** Startup for Industry 2026 – Kementerian Perindustrian Republik Indonesia  
**Instansi:** CV Khaira Buana Mas (KhumKhum Jamur Crispy) — Kulon Progo, D.I. Yogyakarta  

---

## 1. Pendahuluan & Filosofi Arsitektur Peran

### 1.1 Latar Belakang & Tujuan Produk
KhumKhum Jamur Crispy merupakan unit usaha IKM olahan pangan berbahan baku jamur tiram lokal di Kulon Progo dengan jaringan distribusi mencapai lebih dari 1.500 titik penjualan di 8 provinsi. Sistem ERP ini dirancang untuk mendigitalisasi seluruh rantai nilai pangan: dari penerimaan panen jamur segar petani, sortasi, penggorengan dan pembumbuan bertingkat, quality control, manajemen persediaan multi-gudang, sales order, hingga ketertelusuran produk (*two-way traceability*) dan integrasi gateway WhatsApp.

Untuk memastikan sistem mudah dioperasikan di lantai pabrik IKM, hak akses pengguna dibagi ke dalam **6 Peran Pengguna Utama (*Core User Roles*)**. Dokumen ini merinci fungsi bisnis, daftar fitur lengkap, aturan input-output, serta panduan teknis implementasi tim 3 developer agar proses *coding* berjalan paralel tanpa hambatan tabrakan berkas (*merge conflict*).

### 1.2 Prinsip Arsitektur RBAC (*Role-Based Access Control*)
1. **Prinsip Hak Akses Minimum (*Least Privilege Access*):** Setiap peran hanya dapat membaca, menginput, dan memodifikasi modul yang relevan dengan fungsinya.
2. **Konsolidasi Peran IKM (*Pragmatic Role Consolidation*):** Menggabungkan fungsi Gudang, Logistik, Penjualan, dan PPIC ke dalam 1 peran terpadu (`ROLE_WAREHOUSE`) untuk efisiensi operasional skala IKM.
3. **Pengalaman Petani Tanpa Aplikasi (*Zero-App Farmer UX*):** Petani mitra tidak perlu login ke aplikasi web, melainkan berinteraksi secara instan dan transparan via **WhatsApp Gateway (Fonnte) & Webhook Bot**.
4. **Integritas Data & Jejak Audit Abadi (*Immutable Audit Logging*):** Seluruh mutasi data (*create, update, delete, void*) otomatis mencatat *user_id*, *timestamp*, *IP address*, dan rekaman perubahan (*diff snapshot*).

---

## 2. Strategi Implementasi Tim Paralel (3 Pengembang)

Untuk menghindari konflik *merge* Git dan saling tunggu antar anggota tim, pengembangan dibagi menjadi 3 pembagian tanggung jawab (*workstream*) yang terisolasi secara modul dan folder:

```
┌───────────────────────────────────────────────────────────────────────────┐
│ 👨‍💻 DEVELOPER 1 (Lead Web & Core Architect):                              │
│   • Peran yang Dipegang:                                                  │
│     1. ROLE_SUPER_ADMIN (User Management, Audit Logs, Global Settings)    │
│     2. ROLE_FARMER (WhatsApp Gateway Fonnte, Webhook Bot, Nota Otomatis)  │
│   • Tanggung Jawab Fondasi:                                               │
│     Setup Database Supabase, Auth/RBAC Middleware, Shell Layout Navigasi  │
├───────────────────────────────────────────────────────────────────────────┤
│ 👨‍💻 DEVELOPER 2 (Operations, Logistik & Eksekutif):                       │
│   • Peran yang Dipegang:                                                  │
│     1. ROLE_WAREHOUSE (Penerimaan Bahan Baku, Sortasi, Multi-Gudang, SO)  │
│     2. ROLE_MANAGEMENT (Executive KPI Dashboard, Traceability 2-Arah)     │
├───────────────────────────────────────────────────────────────────────────┤
│ 👨‍💻 DEVELOPER 3 (Quality Assurance & Manufaktur Lini Produksi):            │
│   • Peran yang Dipegang:                                                  │
│     1. ROLE_QC (Konfigurasi Mutu, Inspeksi Sampling Defect, Pareto Chart) │
│     2. ROLE_PRODUCTION (Batch WIP, Lini Penggorengan & Rendemen)          │
└───────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Struktur Folder Terisolasi (*Zero-Conflict Directory Architecture*)
Seluruh pengembang bekerja di dalam foldernya masing-masing di dalam Next.js App Router:

```text
src/
├── app/
│   ├── (auth)/login/                <-- [DEV 1] Login & Autentikasi
│   ├── (dashboard)/
│   │   ├── admin/                   <-- [DEV 1] Modul Super Admin
│   │   │   ├── users/page.tsx
│   │   │   ├── settings/page.tsx
│   │   │   └── audit-logs/page.tsx
│   │   ├── warehouse/               <-- [DEV 2] Modul Warehouse & PPIC
│   │   │   ├── receipts/page.tsx
│   │   │   ├── sortation/page.tsx
│   │   │   ├── inventory/page.tsx
│   │   │   └── sales-orders/page.tsx
│   │   ├── management/              <-- [DEV 2] Modul Eksekutif & Traceability
│   │   │   ├── dashboard/page.tsx
│   │   │   └── traceability/page.tsx
│   │   ├── qc/                      <-- [DEV 3] Modul Quality Control
│   │   │   ├── inspection/page.tsx
│   │   │   └── standards/page.tsx
│   │   └── production/              <-- [DEV 3] Modul Produksi
│   │       ├── batches/page.tsx
│   │       └── rendemen/page.tsx
│   └── api/
│       ├── auth/                    <-- [DEV 1]
│       ├── webhooks/whatsapp/       <-- [DEV 1] Webhook Bot Fonnte
│       ├── whatsapp/send-receipt/   <-- [DEV 1] Service Kirim WA
│       ├── raw-materials/           <-- [DEV 2]
│       ├── sortation/               <-- [DEV 2]
│       ├── inventory/               <-- [DEV 2]
│       ├── sales-orders/            <-- [DEV 2]
│       ├── traceability/            <-- [DEV 2]
│       ├── qc/                      <-- [DEV 3]
│       └── production/              <-- [DEV 3]
├── components/
│   ├── ui/                          <-- [SHARED] Button, Input, Modal, Badge
│   ├── admin/                       <-- [DEV 1] Komponen UI Super Admin
│   ├── warehouse/                   <-- [DEV 2] Komponen UI Warehouse
│   ├── management/                  <-- [DEV 2] Komponen UI Manajemen
│   ├── qc/                          <-- [DEV 3] Komponen UI QC
│   └── production/                  <-- [DEV 3] Komponen UI Produksi
├── lib/
│   ├── supabase.ts                  <-- [DEV 1] Client Supabase DB
│   ├── auth.ts                      <-- [DEV 1] Konfigurasi Auth.js / NextAuth
│   └── whatsapp.ts                  <-- [DEV 1] Helper Fonnte API
└── types/
    └── index.ts                     <-- [SHARED] Tipe Data TypeScript Global
```

### 2.2 Strategi Git Branching & Integrasi
* **Branch `main`:** Versi stabil siap produksi / demo.
* **Branch `dev`:** Branch integrasi bersama.
* **Branch Fitur Mandiri:**
  * Developer 1: `git checkout -b feat/admin-farmer-gateway`
  * Developer 2: `git checkout -b feat/warehouse-management`
  * Developer 3: `git checkout -b feat/qc-production`
* **Prosedur Merge:** Selalu lakukan `git pull origin dev` sebelum membuat Pull Request (PR) ke branch `dev`.

---

## 3. Matriks Hak Akses Modul & Fitur (CRUD & Action Matrix)

**Keterangan Simbol:**
* **FULL** : Hak Penuh (*Create, Read, Update, Delete, Export, Approve, Void*)
* **C/R/U** : *Create, Read, Update* (tanpa izin hapus permanen)
* **C/R** : *Create & Read* (pencatatan data baru dan membaca riwayat)
* **R** : *Read-Only* (hanya melihat data dan mencetak laporan)
* **-** : *No Access* (menu sidebar disembunyikan, route ditolak HTTP 403)
* **WA** : Interaksi data 2 arah via WhatsApp Bot / Webhook

| Modul & Fitur Sistem | Super Admin | QC & Ops | Warehouse & PPIC | Produksi | Manajemen | Petani Mitra |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Manajemen Pengguna & Role** | FULL | - | - | - | - | - |
| **Audit Logs & Keamanan** | FULL | R | - | - | R | - |
| **Konfigurasi Standar Mutu** | FULL | FULL | R | - | R | - |
| **Master Data (Petani, Produk, Gudang)** | FULL | R | C/R/U | - | R | - |
| **Penerimaan Bahan Baku Jamur** | FULL | R | C/R | - | R | WA (Terima Nota) |
| **Sortasi & Grading Jamur** | FULL | R | C/R | - | R | WA (Info Mutu) |
| **Produksi WIP & Rendemen** | FULL | R | R | C/R | R | - |
| **Quality Control & Defect** | FULL | C/R/U | R | - | R | - |
| **Persediaan & Kartu Stok** | FULL | R | C/R/U | R | R | - |
| **Stock Opname & Rekonsiliasi** | FULL | R | C/R/U | - | R | - |
| **Sales Order & Pengiriman** | FULL | R | C/R/U | - | R | - |
| **PPIC & Forecasting AI** | FULL | R | C/R/U | R | R | - |
| **WhatsApp Gateway & Webhook** | FULL | R | C/R | - | R | WA (Interaktif) |
| **Ketertelusuran (*Traceability*)** | FULL | FULL (R) | FULL (R) | FULL (R) | FULL (R) | - |
| **Executive KPI Dashboard** | FULL | R | R | R | FULL (R) | - |

---

## 4. Spesifikasi Mendalam 6 Peran Pengguna (Fungsi, Fitur, Input & Output)

---

### 4.1 Role 1: Super Admin (`ROLE_SUPER_ADMIN`)
* **Pengembang Bertanggung Jawab:** Developer 1 (Lead Web)
* **Persona Pengguna:** Pemilik Usaha / Tim IT Administrator
* **Perangkat Akses:** Desktop / Laptop (Browser Web Terproteksi 2FA)

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ FUNGSI UTAMA:                                                                           │
│ Menjaga keandalan sistem, mengelola otorisasi staf, mengawasi log audit, konfigurasi    │
│ parameter master, serta menangani koreksi transaksi pembatalan (void).                  │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

#### A. Rincian Fitur Lengkap
1. **Manajemen Pengguna & RBAC:**
   - Menambah akun staf baru dengan sistem undangan email (token aktif 24 jam).
   - Menetapkan dan mengubah peran pengguna (*Role Assignment*).
   - Mengaktifkan / menonaktifkan akun staf yang berhenti bekerja.
   - Mereset autentikasi dua faktor (2FA) dan membuka blokir akun terkunci.
2. **Pusat Log Audit Sistem (*Security & Audit Trail*):**
   - Monitoring riwayat aktivitas seluruh user secara real-time (User, Role, Aksi, Waktu, Modul, IP, User Agent).
   - Rekaman *diff snapshot* data sebelum dan sesudah perubahan.
3. **Pembatalan Transaksi Khusus (*Void & Emergency Override*):**
   - Membatalkan transaksi salah input dengan kewajiban mengisi alasan audit resmi.
   - Memulihkan (*reversal*) stok barang otomatis ke status sebelum transaksi dibuat.
4. **Konfigurasi WhatsApp Gateway (Fonnte):**
   - Menyimpan API Token Fonnte dan mengatur nomor resmi WhatsApp bot perusahaan.
   - Pengujian koneksi kirim pesan teks uji coba.

#### B. Spesifikasi Input & Validasi
* **Nama Lengkap:** Text (3-100 karakter, wajib).
* **Email Staf:** Format email valid RFC 5322 (unik di sistem).
* **Pilihan Role:** Enum (`ROLE_SUPER_ADMIN`, `ROLE_QC`, `ROLE_WAREHOUSE`, `ROLE_PRODUCTION`, `ROLE_MANAGEMENT`).
* **Toleransi Timbang Global:** Decimal (default `2.00%`, batas 0.1% – 10.0%).
* **Token API Fonnte:** String terenkripsi di *environment vault*.
* **Alasan Void Transaksi:** Text area (minimal 10 karakter wajib diisi).

#### C. Spesifikasi Output & Efek Samping
* **Email Undangan Aktivasi:** Link aktivasi akun dengan token JWT sekali pakai.
* **Tabel Log Audit:** Rekaman aktivitas real-time + opsi Export CSV/PDF.
* **Status Sistem:** Widget indikator hijau/merah koneksi Supabase DB, Auth, dan Fonnte Gateway.
* **Status Reversal Transaksi:** Record transaksi bertanda `VOIDED` dan mutasi stok dikembalikan.

---

### 4.2 Role 2: Quality Control & Ops (`ROLE_QC`)
* **Pengembang Bertanggung Jawab:** Developer 3
* **Persona Pengguna:** Inspektur Penjamin Mutu Pangan (Quality Assurance)
* **Perangkat Akses:** Tablet / Laptop di Laboratorium & Area Finishing

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ FUNGSI UTAMA:                                                                           │
│ Memastikan standar mutu bahan baku dan produk jadi jamur crispy memenuhi standar mutu,  │
│ menetapkan status rilis produk (Released/Rework/Reject), dan menganalisis pareto defect.│
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

#### A. Rincian Fitur Lengkap
1. **Konfigurasi Standar Kualitas Mutu:**
   - Mengatur batas minimum daun jamur bersih (default $\ge 75\%$).
   - Mengatur target baseline rendemen (default $\ge 80\%$).
   - Mengelola master kategori cacat: *Gosong, Keasinan/Bumbu Tidak Rata, Kemasan Bocor, Remuk/Patah Berlebih, Melempem*.
2. **Inspeksi Sampel Produk Jadi per Batch Produksi:**
   - Memilih nomor batch produksi (`PRD-YYYYMMDD-XXX`) dari antrean status `COMPLETED_WIP`.
   - Menginput jumlah sampel uji ($N_{sample}$) dan menghitung produk cacat per kategori.
   - Mengunggah foto bukti cacat ke Supabase Storage `qc-evidences`.
3. **Penetapan Keputusan Kualitas (*QC Decision*):**
   - **RELEASED:** Produk memenuhi syarat; stok dialokasikan ke Gudang Produk Jadi.
   - **REWORK:** Produk membutuhkan proses perbaikan (penggorengan ulang peniris/bumbu).
   - **REJECTED:** Produk cacat berat dan dialihkan ke barang afkir/limbah.
4. **Analisis Pareto Cacat & Lembar Hasil Uji (PDF):**
   - Visualisasi diagram pareto 80/20 untuk evaluasi penyebab defect terbesar.
   - Cetak Sertifikat Kelayakan Mutu Batch (*QC Release Certificate PDF*).

#### B. Spesifikasi Input & Validasi
* **Pilihan Batch:** Dropdown reference `PRD-xxxx` (hanya batch yang belum diinspeksi).
* **Jumlah Sampel ($N_{sample}$):** Integer positif ($\ge 1$).
* **Tally Cacat per Kategori:** Integer ($\ge 0$, total cacat $\le N_{sample}$).
* **Foto Bukti Cacat:** File gambar (`JPG/PNG/WEBP`, maks. 5MB).
* **Keputusan Mutu:** Radio enum (`RELEASED`, `REWORK`, `REJECTED`).
* **Catatan Korektif:** Text area (wajib jika `REWORK` atau `REJECTED`).

#### C. Spesifikasi Output & Efek Samping
* **Perhitungan Defect Rate (%):**
  $$\text{Defect Rate (\%)} = \left( \frac{\sum \text{Jumlah Produk Cacat}}{N_{sample}} \right) \times 100\%$$
* **Update Status Stok Batch:** Otomatis menambah stok produk jadi siap jual jika `RELEASED`.
* **Grafik Pareto Cacat:** Diagram batang berurut dan garis persentase kumulatif.
* **Dokumen Sertifikat QC (PDF):** Dokumen bukti inspeksi batch bertanda tangan digital.

---

### 4.3 Role 3: Warehouse, Logistics & PPIC (`ROLE_WAREHOUSE`)
* **Pengembang Bertanggung Jawab:** Developer 2
* **Persona Pengguna:** Kepala Gudang, Staf Logistik, Admin Sales & PPIC
* **Perangkat Akses:** Tablet / Laptop di Area Bongkar Muat & Gudang Distribusi

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ FUNGSI UTAMA:                                                                           │
│ Mencatat penerimaan jamur dari petani, melakukan sortasi daun/batang, memicu nota WA,   │
│ mengelola stok 5 kategori gudang, stock opname, sales order distributor, & forecasting. │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

#### A. Rincian Fitur Lengkap
1. **Modul Penerimaan Bahan Baku Jamur (`RM-YYYYMMDD-XXX`):**
   - Memilih Petani Mitra dan menginput Berat Kirim ($W_{kirim}$) serta Berat Timbang Aktual ($W_{terima}$).
   - Mengunggah foto timbangan digital dan validasi selisih timbangan ($\pm 2\%$).
2. **Modul Sortasi & Grading Bahan Baku:**
   - Memisahkan Berat Daun ($W_{daun}$) dan Berat Batang ($W_{batang}$).
   - Sistem otomatis menghitung persentase daun ($\% \text{Daun}$) vs standar $\ge 75\%$.
   - Mengelompokkan Grade Mutu (Grade A $\ge 80\%$, Grade B $75-79.9\%$, Grade C $< 75\%$).
3. **Pemicu Pengiriman Nota Digital WhatsApp Petani:**
   - Memicu otomatis pesan nota timbangan & estimasi total rupiah ke WhatsApp petani (< 5 detik).
4. **Manajemen Persediaan Terpadu Multi-Kategori:**
   - Monitoring stok real-time untuk 5 kategori: Jamur Bersih, Minyak & Tepung, Bumbu, Kemasan, Produk Jadi.
   - Buku besar mutasi stok (*Stock Ledger*) dan alert otomatis *Reorder Point* (ROP).
5. **Stock Opname & Rekonsiliasi Fisik:**
   - Input hasil hitung fisik di gudang, menghitung Akurasi Stok (target $\ge 98\%$), dan simpan rekonsiliasi.
6. **Modul Sales Order & Pengiriman Distributor (`SO-YYYYMMDD-XXX`):**
   - Mencatat pesanan distributor/toko, alokasi stok otomatis, update status pengiriman, dan cetak Surat Jalan PDF.
7. **Modul PPIC & Peramalan Permintaan (Forecasting Engine):**
   - Algoritma *Exponential Smoothing (Holt-Winters)* untuk proyeksi permintaan 1-4 minggu ke depan.
   - Material Requirement Planning (MRP) dan monitoring estimasi panen petani dari bot WA.

#### B. Spesifikasi Input & Validasi
* **ID Petani Mitra:** Dropdown reference (petani aktif).
* **Berat Kirim & Terima:** Decimal (2 desimal, kg, wajib $> 0$).
* **Foto Timbangan:** File gambar bukti timbangan.
* **Berat Daun & Batang:** Decimal ($W_{daun} + W_{batang} = W_{terima}$).
* **Item Sales Order:** Array produk (SKU, Qty Pack, Harga Satuan).
* **Stok Fisik Opname:** Decimal hasil hitung fisik di rak gudang.

#### C. Spesifikasi Output & Efek Samping
* **Perhitungan Selisih Timbang:**
  $$\Delta W = W_{terima} - W_{kirim}, \quad \% \Delta W = \left( \frac{W_{terima} - W_{kirim}}{W_{kirim}} \right) \times 100\%$$
* **Perhitungan % Daun:**
  $$\% \text{Daun} = \left( \frac{W_{daun}}{W_{daun} + W_{batang}} \right) \times 100\%$$
* **Pesan WhatsApp Nota Timbangan:** Terkirim ke nomor HP petani via Fonnte Gateway.
* **Perhitungan Akurasi Stok (%):**
  $$\text{Akurasi (\%)} = \left( 1 - \frac{|Stok_{fisik} - Stok_{sistem}|}{Stok_{sistem}} \right) \times 100\%$$
* **Dokumen Surat Jalan & Invoice (PDF):** Dokumen fisik siap cetak untuk pengiriman distributor.
* **Proyeksi Kebutuhan Bahan (MRP):** Angka estimasi kebutuhan kg jamur dan bumbu mingguan.

---

### 4.4 Role 4: Petugas Produksi (`ROLE_PRODUCTION`)
* **Pengembang Bertanggung Jawab:** Developer 3
* **Persona Pengguna:** Operator Lantai Penggorengan, Mesin Spinner & Pembumbuan
* **Perangkat Akses:** Layar Sentuh Tablet Kios (Touchscreen) di Ruang Produksi

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ FUNGSI UTAMA:                                                                           │
│ Mencatat proses manufaktur di lantai produksi, memantau rasio rendemen per wajan/shift, │
│ dan menerbitkan nomor batch produksi unik sebagai kunci ketertelusuran produk.          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

#### A. Rincian Fitur Lengkap
1. **Penerbitan Batch Produksi Baru (`PRD-YYYYMMDD-XXX`):**
   - Memilih lot jamur bersih sortasi yang diambil dari gudang bahan baku.
   - Memilih varian rasa (Original, Balado, BBQ, Jagung Bakar, Pedas Ekstra).
2. **Pencatatan Tahap 1: Penggorengan & Penirisan (Frying & Spinning):**
   - Menginput berat jamur basah + adonan tepung ($W_{input\_fry}$).
   - Menginput berat jamur matang setelah ditiriskan minyaknya ($W_{output\_fry}$).
3. **Pencatatan Tahap 2: Pembumbuan & Pengemasan WIP:**
   - Menginput berat bumbu bubuk dan berat total jamur crispy siap kemas ($W_{output\_final}$).
   - Mencatat jam mulai dan jam selesai untuk perhitungan durasi kerja.
4. **Monitoring Rendemen Real-Time:**
   - Menghitung Rendemen (%) otomatis.
   - Status Hijau ("Sesuai Standar") jika $\ge 80\%$, Status Merah ("Di Bawah Standar") jika $< 80\%$ (wajib memilih faktor penyebab).
5. **Serah Terima Batch ke Quality Control:**
   - Menyimpan batch dengan status `COMPLETED_WIP` agar masuk ke antrean uji QC.

#### B. Spesifikasi Input & Validasi
* **Pilihan Lot Sortasi:** Dropdown reference lot jamur bersih tersedia.
* **Varian Produk (SKU):** Dropdown varian rasa KhumKhum.
* **Berat Bahan Masuk ($W_{input}$):** Decimal (kg, wajib $> 0$ dan $\le$ stok tersedia).
* **Berat Bahan Keluar ($W_{output}$):** Decimal (kg, wajib $> 0$).
* **Waktu Mulai & Selesai:** Datetime timestamp.
* **Faktor Anomali Rendemen:** Dropdown alasan (wajib jika rendemen $< 80\%$).

#### C. Spesifikasi Output & Efek Samping
* **Nomor Batch Produksi:** Format `PRD-YYYYMMDD-XXX` (kunci stempel kemasan & traceability).
* **Perhitungan Rendemen (%):**
  $$\text{Rendemen (\%)} = \left( \frac{W_{output}}{W_{input}} \right) \times 100\%$$
* **Badge Indikator Status:** Tampilan visual Hijau ($\ge 80\%$) atau Merah ($< 80\%$).
* **Pengurangan Stok Bahan Baku:** Stok jamur mentah, minyak, dan bumbu berkurang otomatis.
* **Tiket Antrean QC:** Batch berpindah ke daftar antrean pemeriksaan tim Quality Control.

---

### 4.5 Role 5: Manajemen & Eksekutif Viewer (`ROLE_MANAGEMENT`)
* **Pengembang Bertanggung Jawab:** Developer 2
* **Persona Pengguna:** Direksi CV Khaira Buana Mas, Investor & Auditor Kemenperin RI
* **Perangkat Akses:** Desktop PC / iPad / Laptop Eksekutif

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ FUNGSI UTAMA:                                                                           │
│ Pengawasan kinerja bisnis terpadu (read-only), investigasi ketertelusuran produk (< 10   │
│ menit), dan pengunduhan laporan resmi standar Kemenperin RI & evaluasi kemitraan petani.│
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

#### A. Rincian Fitur Lengkap
1. **Executive KPI Dashboard Real-Time:**
   - Visualisasi ringkasan: Total Pasokan Jamur Masuk, Rata-rata Rendemen Pabrik, Defect Rate Keseluruhan, Akurasi Stok Gudang, dan Omset Penjualan.
   - Filter dinamis berdasarkan rentang tanggal dan varian produk.
2. **Mesin Penelusuran Ketertelusuran Dua Arah (*Two-Way Traceability Engine*):**
   - **Forward Traceability:** No. Penerimaan Jamur $\to$ Batch Produksi $\to$ Distributor Penerima.
   - **Backward Traceability:** Kode Batch Kemasan $\to$ Hasil QC $\to$ Lot Sortasi $\to$ Nama Petani Asal Jamur (< 10 menit).
3. **Pusat Unduh Laporan Eksekutif & Kemenperin:**
   - Cetak Laporan Kinerja Operasional (PDF resmi kop surat CV Khaira Buana Mas).
   - Ekspor data mentah ke format Excel / CSV.
   - Rekapitulasi ranking performa kualitas petani mitra.

#### B. Spesifikasi Input & Validasi
* **Filter Periode:** Date Range Picker (Hari Ini, 7 Hari, Bulan Ini, Custom).
* **Kata Kunci Traceability:** String input (No Batch `PRD-xxx` atau No Penerimaan `RM-xxx`).
* **Filter Varian:** Multi-select dropdown produk.
* **Pilihan Format Ekspor:** Enum (`PDF`, `EXCEL`, `CSV`).

#### C. Spesifikasi Output & Efek Samping
* **Kartu Metrik KPI:** Widget visual metrik operasional teragregasi.
* **Pohon Silsilah Traceability:** Diagram visual relasi silsilah bahan hingga kemasan.
* **Laporan Kinerja Resmi (PDF):** Dokumen siap cetak untuk rapat direksi dan kementerian.
* **Tabel Ranking Petani:** Evaluasi petani dengan pasokan paling konsisten dan % daun tertinggi.

---

### 4.6 Role 6: Petani Mitra (`ROLE_FARMER`)
* **Pengembang Bertanggung Jawab:** Developer 1 (Lead Web)
* **Persona Pengguna:** Petani Jamur Tiram Lokal (Kulon Progo, DIY)
* **Perangkat Akses:** Smartphone / Handphone Standar (**Aplikasi WhatsApp Saja**)

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ FUNGSI UTAMA:                                                                           │
│ Menerima transparansi timbangan & harga secara instan pasca setor, serta mengonfirmasi  │
│ estimasi kapasitas panen esok hari via chat WhatsApp interaktif tanpa perlu aplikasi.   │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

#### A. Rincian Fitur Lengkap
1. **Penerimaan Nota Timbangan Digital Otomatis:**
   - Pesan WhatsApp masuk otomatis dalam $< 5$ detik setelah jamur selesai disortasi di pabrik.
   - Memuat: No. Nota, Berat Kirim, Berat Terima, Persentase Daun, Kategori Grade, dan Estimasi Nominal Pembayaran (Rp).
2. **Pengingat Jadwal Panen Sore Hari (16.00 WIB):**
   - Pesan otomatis dikirim oleh server cron setiap sore menanyakan kesiapan panen besok.
3. **Konfirmasi Pasokan Panen Interaktif (Webhook Bot):**
   - Petani membalas pesan teks:
     * Format Setor: `SETOR [JUMLAH_KG]` (Contoh: `SETOR 35` atau `SETOR 40 KG`).
     * Format Libur: `LIBUR` atau `TIDAK PANEN`.
   - Bot otomatis mencatat data ke database PPIC pabrik dan membalas konfirmasi sukses.

#### B. Spesifikasi Input (Pesan WhatsApp Petani)
* **Pesan Balasan Panen:** Format teks `SETOR 40` (Regex parser: mengekstrak float `40.0`).
* **Pesan Balasan Libur:** Format teks `LIBUR` (Mengisi estimasi besok = `0.0 kg`).
* **Teks Lain / Typo:** Bot mengirim balasan panduan format yang ramah secara otomatis.

#### C. Spesifikasi Output (Pesan WhatsApp yang Diterima Petani)

**1. Template Nota Timbangan Digital:**
> Halo Pak *Sugeng*, terima kasih atas setoran jamurnya hari ini! 🍄
> 
> 📄 *No. Penerimaan:* RM-20260812-005  
> ⚖️ *Berat Kirim:* 53.0 kg  
> 📦 *Berat Terima:* 52.5 kg (Selisih: -0.5 kg)  
> 🍃 *Kualitas Daun:* 78.5% (Grade A - Sesuai Standar)  
> 💵 *Est. Pembayaran:* Rp 787.500  
> 
> _CV Khaira Buana Mas (KhumKhum Jamur Crispy)_

**2. Template Pengingat Panen Sore Hari (16.00 WIB):**
> Sugeng sore Pak *Sugeng* 🌾
> 
> Untuk persiapan jadwal produksi pabrik besok, apakah ada perkiraan panen jamur tiram yang siap disetor?
> 
> Silakan balas pesan ini dengan format:  
> 👉 *SETOR [JUMLAH KG]* (Contoh: *SETOR 30*)  
> 👉 Jika besok libur panen, balas: *LIBUR*

**3. Template Konfirmasi Balasan Bot:**
> Terima kasih Pak *Sugeng*! Estimasi setoran *35 kg* untuk jadwal besok telah berhasil dicatat oleh sistem pabrik KhumKhum. 👍

---

## 5. Matriks Komparasi Input & Output Antar 6 Role

| ID Role | Nama Role | Input Utama (Form / Pesan) | Output Utama (Data / Hitungan / Dokumen) |
|---|---|---|---|
| `ROLE_SUPER_ADMIN` | **Super Admin** | • Data Pengguna & Role<br>• Toleransi Timbang Global<br>• Token API Fonnte<br>• Alasan Void Transaksi | • Token Email Aktivasi Akun<br>• Log Audit Perubahan Lengkap<br>• Reversal Stok Transaksi Void<br>• Dashboard Status Kesehatan Sistem |
| `ROLE_QC` | **Quality Control & Ops** | • Batas Standar Mutu<br>• Pilihan No. Batch (`PRD-xxx`)<br>• Tally Produk Cacat per Kategori<br>• Foto Cacat & Keputusan Mutu | • Kalkulasi Defect Rate (%)<br>• Alokasi Stok (Gudang vs Afkir)<br>• Diagram Pareto Cacat (80/20)<br>• Sertifikat Kelayakan Mutu (PDF) |
| `ROLE_WAREHOUSE` | **Warehouse & PPIC** | • Berat Kirim & Terima Jamur<br>• Foto Timbangan Digital<br>• Berat Daun & Batang Sortasi<br>• Data Sales Order Pelanggan<br>• Hasil Hitung Fisik Opname | • Kalkulasi Selisih Timbang ($\Delta W, \%\Delta W$)<br>• Kalkulasi % Daun vs Standar 75%<br>• Pesan WhatsApp Nota ke Petani<br>• Kartu Stok Multi-Gudang Real-Time<br>• Persentase Akurasi Stok Opname<br>• Surat Jalan & Invoice PDF<br>• Proyeksi Kebutuhan Bahan (MRP) |
| `ROLE_PRODUCTION` | **Petugas Produksi** | • Pilihan Lot Sortasi Asal<br>• Varian Rasa Produk (SKU)<br>• Berat Masuk ($W_{input}$ kg)<br>• Berat Keluar ($W_{output}$ kg)<br>• Jam Kerja & Alasan Anomali | • Nomor Batch Resmi (`PRD-YYYYMMDD-XXX`)<br>• Kalkulasi Rendemen (%) vs Target 80%<br>• Badge Indikator Hijau / Merah<br>• Pengurangan Stok Bahan Mentah & Bumbu<br>• Antrean Tiket Batch ke QC |
| `ROLE_MANAGEMENT` | **Manajemen (Viewer)** | • Filter Tanggal & Varian Produk<br>• Keyword Pencarian Traceability<br>• Pilihan Format Ekspor Laporan | • Executive KPI Dashboard Interaktif<br>• Silsilah Pohon Traceability (< 10 mnt)<br>• Laporan Kinerja Resmi Eksekutif (PDF)<br>• Rekapitulasi Data Mutu Kemenperin RI |
| `ROLE_FARMER` | **Petani Mitra** | • Fisik Jamur Segar Setoran<br>• Balasan Chat WA (`SETOR 30` / `LIBUR`) | • Nota Digital Timbangan & Rupiah (WA)<br>• Pengingat Panen Sore (16.00 WIB)<br>• Konfirmasi Pencatatan Jadwal PPIC |

---

## 6. Skema Relasi Database Supabase PostgreSQL (9 Tabel Inti)

```sql
-- 1. Enum Tipe Role
CREATE TYPE user_role AS ENUM (
  'ROLE_SUPER_ADMIN', 
  'ROLE_QC', 
  'ROLE_WAREHOUSE', 
  'ROLE_PRODUCTION', 
  'ROLE_MANAGEMENT', 
  'ROLE_FARMER'
);

-- 2. Tabel Pengguna
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20),
    role user_role NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabel Petani Mitra
CREATE TABLE farmers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    village VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    price_per_kg DECIMAL(10,2) DEFAULT 15000.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabel Penerimaan Bahan Baku
CREATE TABLE raw_material_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_number VARCHAR(50) UNIQUE NOT NULL,
    farmer_id UUID REFERENCES farmers(id) ON DELETE RESTRICT,
    received_by UUID REFERENCES users(id),
    weight_sent DECIMAL(10,2) NOT NULL,
    weight_received DECIMAL(10,2) NOT NULL,
    weight_difference DECIMAL(10,2) GENERATED ALWAYS AS (weight_received - weight_sent) STORED,
    diff_percentage DECIMAL(5,2) GENERATED ALWAYS AS (((weight_received - weight_sent) / weight_sent) * 100) STORED,
    scale_photo_url TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'RECEIVED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabel Sortasi & Grading
CREATE TABLE sortation_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_id UUID UNIQUE REFERENCES raw_material_receipts(id) ON DELETE RESTRICT,
    leaf_weight DECIMAL(10,2) NOT NULL,
    stem_weight DECIMAL(10,2) NOT NULL,
    leaf_percentage DECIMAL(5,2) GENERATED ALWAYS AS ((leaf_weight / (leaf_weight + stem_weight)) * 100) STORED,
    quality_grade VARCHAR(10) NOT NULL,
    is_standard_compliant BOOLEAN GENERATED ALWAYS AS ((leaf_weight / (leaf_weight + stem_weight)) * 100 >= 75.00) STORED,
    sorted_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Tabel Batch Produksi WIP & Rendemen
CREATE TABLE production_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_number VARCHAR(50) UNIQUE NOT NULL,
    sortation_id UUID REFERENCES sortation_results(id) ON DELETE RESTRICT,
    product_variant VARCHAR(50) NOT NULL,
    input_weight DECIMAL(10,2) NOT NULL,
    output_weight DECIMAL(10,2) NOT NULL,
    yield_percentage DECIMAL(5,2) GENERATED ALWAYS AS ((output_weight / input_weight) * 100) STORED,
    is_yield_compliant BOOLEAN GENERATED ALWAYS AS ((output_weight / input_weight) * 100 >= 80.00) STORED,
    operator_id UUID REFERENCES users(id),
    status VARCHAR(30) DEFAULT 'COMPLETED_WIP',
    started_at TIMESTAMP WITH TIME ZONE,
    finished_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Tabel Quality Control & Defect
CREATE TABLE quality_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID UNIQUE REFERENCES production_batches(id) ON DELETE RESTRICT,
    inspector_id UUID REFERENCES users(id),
    sample_size INT NOT NULL,
    defect_burnt INT DEFAULT 0,
    defect_salty INT DEFAULT 0,
    defect_leaking_pack INT DEFAULT 0,
    defect_crushed INT DEFAULT 0,
    defect_soggy INT DEFAULT 0,
    total_defects INT GENERATED ALWAYS AS (defect_burnt + defect_salty + defect_leaking_pack + defect_crushed + defect_soggy) STORED,
    defect_rate DECIMAL(5,2) GENERATED ALWAYS AS (((defect_burnt + defect_salty + defect_leaking_pack + defect_crushed + defect_soggy)::DECIMAL / sample_size) * 100) STORED,
    decision VARCHAR(20) NOT NULL,
    photo_evidence_url TEXT,
    notes TEXT,
    inspected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Tabel Log WhatsApp Gateway
CREATE TABLE whatsapp_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID REFERENCES farmers(id) ON DELETE SET NULL,
    phone_number VARCHAR(20) NOT NULL,
    message_type VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING',
    gateway_response JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Tabel Estimasi Panen Petani (PPIC)
CREATE TABLE farmer_harvest_estimates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID REFERENCES farmers(id) ON DELETE CASCADE,
    expected_date DATE NOT NULL,
    estimated_kg DECIMAL(10,2) NOT NULL,
    source VARCHAR(20) DEFAULT 'WA_BOT',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Tabel Audit Logs
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_email VARCHAR(255),
    role VARCHAR(50),
    action VARCHAR(50) NOT NULL,
    module VARCHAR(50) NOT NULL,
    record_id VARCHAR(100),
    diff_data JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 7. Kriteria Penerimaan Pengujian Sistem (UAT Acceptance Criteria)

| ID UAT | Target Peran | Aksi Pengujian | Hasil yang Diharapkan (Pass Criteria) |
|---|---|---|---|
| **UAT-01** | `ROLE_PRODUCTION` | Mencoba membuka URL `/dashboard/warehouse/sales-orders` | Akses ditolak otomatis (HTTP 403 Forbidden) dan dialihkan ke dashboard produksi. |
| **UAT-02** | `ROLE_SUPER_ADMIN` | Melakukan Void transaksi penerimaan jamur | Wajib mengisi alasan audit; status berubah `VOIDED` dan stok dibatalkan. |
| **UAT-03** | `ROLE_QC` | Memasukkan 100 sampel dengan 5 cacat | Defect Rate $= 5.00\%$. Jika status `RELEASED`, stok produk jadi bertambah di gudang. |
| **UAT-04** | `ROLE_WAREHOUSE` | Menginput timbangan jamur kirim 50 kg & terima 49.5 kg | Selisih $-1.00\%$ ditandai hijau "Dalam Toleransi" ($\le 2\%$). |
| **UAT-05** | `ROLE_WAREHOUSE` | Menyimpan sortasi daun 39 kg & batang 11 kg | $\% \text{Daun} = 78.0\%$ (Grade A) & nota WA terkirim ke HP petani $< 5$ detik. |
| **UAT-06** | `ROLE_PRODUCTION` | Menginput bahan masuk 25 kg & hasil 21 kg | Rendemen $= 84.0\%$ (Status Hijau) & menerbitkan batch `PRD-YYYYMMDD-XXX`. |
| **UAT-07** | `ROLE_MANAGEMENT` | Mengetik No. Batch `PRD-20260812-001` di Traceability | Dalam waktu $< 2$ detik, silsilah rantai pasok dari petani hingga distributor tampil utuh. |
| **UAT-08** | `ROLE_FARMER` | Petani membalas WA pengingat sore: `SETOR 35` | Webhook bot merespons otomatis & angka 35 kg tercatat di tabel PPIC panen besok. |

---

## 8. Kesimpulan & Penutup

Dokumen PRD ini menjadi pedoman resmi arsitektur dan eksekusi teknis untuk seluruh tim pengembang aplikasi ERP KhumKhum Jamur Crispy. Dengan pembagian 3 developer yang terisolasi, skema database PostgreSQL Supabase yang terpadu, dan spesifikasi input-output yang baku, proses pengembangan dapat diselesaikan secara cepat, konsisten, dan memenuhi seluruh kriteria program Startup for Industry 2026 Kementerian Perindustrian RI.
