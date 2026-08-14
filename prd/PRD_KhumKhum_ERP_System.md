# Product Requirements Document (PRD)
## Sistem Manajemen Persediaan, Produksi & Ketertelusuran Berbasis Data & AI
### KhumKhum Jamur Crispy (CV Khaira Buana Mas)

**Versi:** 1.0
**Tanggal:** Agustus 2026
**Program:** Startup for Industry 2026 – Kementerian Perindustrian RI
**Status:** Draft untuk Tim Full Stack Developer

---

## 1. Ringkasan Eksekutif

### 1.1 Latar Belakang
KhumKhum Jamur Crispy adalah IKM pengolahan pangan berbahan baku jamur tiram lokal yang bermitra dengan petani jamur tiram di Kulon Progo, DIY, dan mendistribusikan produk melalui lebih dari 1.500 titik penjualan di 8 provinsi. Saat ini seluruh pencatatan operasional — penerimaan bahan baku, sortasi, produksi, quality control, hingga persediaan — masih dilakukan manual (logsheet), sehingga rawan tidak konsisten, sulit ditelusuri, dan menyulitkan pengambilan keputusan real-time.

### 1.2 Tujuan Produk
Membangun aplikasi web ERP yang mendigitalisasi seluruh alur operasional KhumKhum, dari penerimaan bahan baku hingga penjualan dan ketertelusuran produk, dengan dashboard KPI real-time dan kapabilitas forecasting permintaan berbasis data historis.

### 1.3 Ruang Lingkup

**Termasuk (in scope):**
- Landing page publik (profil, katalog produk, kontak)
- Aplikasi ERP privat dengan 9 modul operasional inti
- Dashboard & KPI Monitoring terpadu
- Forecasting permintaan berbasis data historis

**Tidak termasuk versi awal (out of scope):**
- Aplikasi mobile native (Android/iOS terpisah)
- Integrasi marketplace pihak ketiga (Shopee/Tokopedia API)
- Payment gateway
- Portal Petani publik (dipertimbangkan untuk fase 2)

### 1.4 Timeline
Implementasi 80 hari kalender (±3 bulan), dari analisis kebutuhan hingga go-live dan pendampingan.

---

## 2. Teknologi yang Digunakan

### 2.1 Prinsip Arsitektur
Sistem dibangun sebagai **Next.js full-stack application** (frontend, API layer, dan business logic dalam satu codebase), dideploy di **Vercel**. Pemisahan concern tetap dijaga secara logis (bukan fisik) melalui struktur folder yang disiplin, sesuai prinsip: teknologi fleksibel, tetapi pemisahan layer dan REST/JSON API tetap wajib dipertahankan.

### 2.2 Stack Teknologi

| Layer | Teknologi | Keterangan |
|---|---|---|
| **Frontend + Backend** | Next.js 14+ (App Router) + TypeScript | Server Actions & API Routes untuk business logic; satu deployment terpadu |
| **Styling** | Tailwind CSS | Konsisten dengan landing page & ERP |
| **Database** | PostgreSQL via **Supabase** | Managed database, mendukung relasi kompleks untuk traceability |
| **File/Object Storage** | **Supabase Storage** | Foto bukti timbang, dokumen QC, foto produk |
| **Autentikasi** | NextAuth.js / Auth.js (atau Supabase Auth) | Session/JWT-based, terintegrasi dengan RBAC |
| **Forecasting AI** | TypeScript native (exponential smoothing / moving average / regresi linear) | Dijalankan langsung sebagai Server Action — tanpa service Python terpisah |
| **Hosting/Deployment** | **Vercel** | Auto-deploy dari Git, serverless, CDN otomatis |
| **ORM** | Prisma atau Drizzle ORM | Type-safe query ke PostgreSQL, mendukung migrasi skema |
| **Validasi** | Zod | Validasi input di Server Actions & form |

### 2.3 Diagram Arsitektur (Ringkas)

```
┌─────────────────────────────────────────────┐
│         VERCEL (Next.js — 1 Project)          │
│  ┌───────────────┐   ┌──────────────────────┐│
│  │  Landing Page  │   │   ERP App (privat)   ││
│  │  (publik)      │   │   9 Modul + Dashboard││
│  └───────────────┘   └──────────────────────┘│
│  ┌──────────────────────────────────────────┐│
│  │ Server Actions / API Routes               ││
│  │ - Business logic (rendemen, traceability) ││
│  │ - Forecasting (TS: exp. smoothing)        ││
│  │ - RBAC middleware                         ││
│  └──────────────────────────────────────────┘│
└───────────────┬────────────────┬─────────────┘
                │                │
                ▼                ▼
     ┌────────────────┐  ┌──────────────────┐
     │    SUPABASE     │  │  SUPABASE STORAGE │
     │ (PostgreSQL DB) │  │  (file/gambar)    │
     └────────────────┘  └──────────────────┘
```

### 2.4 Alasan Pemilihan Stack
- **Next.js monolith**: mempercepat development untuk tim kecil, deployment sederhana di Vercel, type-safety end-to-end.
- **Supabase**: menghilangkan kebutuhan mengelola server database sendiri, sekaligus menyediakan storage & opsi auth dalam satu platform.
- **Forecasting berbasis TypeScript**: kebutuhan forecasting KhumKhum (prediksi permintaan mingguan/bulanan per varian) tidak memerlukan deep learning; exponential smoothing/moving average cukup akurat untuk skala IKM dan menghilangkan kebutuhan service Python terpisah (Railway/Render), sehingga seluruh sistem tetap dalam satu deployment Vercel.

---

## 3. Peran Pengguna (User Roles) & Hak Akses

Sistem menggunakan **Role-Based Access Control (RBAC)**, dikonfigurasi oleh Super Admin.

| Role | Deskripsi | Akses Modul Utama |
|---|---|---|
| **Super Admin** | Pemilik/manajemen puncak KhumKhum | Seluruh modul, manajemen user & role, dashboard KPI penuh |
| **Admin Operasional** | Staf kantor pengelola master data & konfigurasi | Master data, konfigurasi standar mutu (toleransi timbang, %daun, rendemen) |
| **Petugas Penerimaan** | Staf gudang penerima bahan baku dari petani | Modul Penerimaan Bahan Baku & Sortasi |
| **Petugas Produksi** | Operator lini produksi (penggorengan, pembumbuan) | Modul Produksi (WIP) & Rendemen |
| **Petugas QC** | Quality control | Modul Quality Control/Defect |
| **Staf Gudang/PPIC** | Pengelola stok & perencanaan | Modul Persediaan, PPIC & Forecasting |
| **Staf Sales/Order** | Tim penjualan & layanan pelanggan/retail | Modul Order & Penjualan, cek stok |
| **Manajemen (Viewer)** | Pemilik/investor, hanya memantau | Dashboard & KPI (read-only), Traceability |
| **Petani Mitra** *(opsional, fase 2)* | Akses terbatas melihat histori kirim & hasil sortasi | Portal Petani (read-only) |

**Prinsip akses:** least privilege — setiap role hanya memiliki akses sesuai kebutuhan fungsinya.

---

## 4. Fitur — Landing Page (Area Publik)

| Section | Isi | Fungsi |
|---|---|---|
| Header/Navbar | Logo, menu navigasi, tombol Login | Navigasi & akses sistem |
| Hero Section | Banner, tagline, CTA "Lihat Produk" | Menarik perhatian pengunjung |
| Tentang Kami | Profil CV Khaira Buana Mas, lokasi, visi kemitraan petani | Membangun kepercayaan brand |
| Katalog Produk | Varian produk KhumKhum, foto, deskripsi | Informasi untuk konsumen/reseller |
| Jejak Distribusi | Statistik 1.500+ titik penjualan, 8 provinsi | Menunjukkan skala bisnis |
| Mitra Petani | Cerita kemitraan petani lokal | Nilai keberlanjutan & CSR |
| Kontak & Lokasi | Alamat, form kontak, peta lokasi | Komunikasi calon mitra/distributor |
| Footer | Copyright, sosial media, kebijakan privasi | Informasi legal |

**Kebutuhan non-fungsional:** SEO dasar (meta tag, sitemap.xml), performa Core Web Vitals baik (lazy-load gambar), aksesibilitas WCAG 2.1 AA, HTTPS wajib di seluruh halaman.

---

## 5. Fitur — Autentikasi & Manajemen Akun

### 5.1 Login
- Field: email/username, password, "Tampilkan Password", "Lupa Password?", "Ingat saya"
- Validasi kredensial via endpoint aman (HTTPS)
- Token sesi (JWT Access + Refresh Token) setelah login berhasil
- Pesan error generik (tidak membocorkan apakah email terdaftar)
- Lockout otomatis setelah 5 kali gagal berturut-turut + notifikasi email
- Captcha anti-bot pada percobaan berulang
- Audit log setiap percobaan login
- **2FA/OTP wajib** untuk Super Admin & Admin Operasional

### 5.2 Manajemen Pengguna
Tidak ada self-registration publik — akun dibuat via undangan:
1. Admin membuka "Manajemen Pengguna" → "Tambah Pengguna Baru"
2. Isi nama, email, pilih role
3. Sistem kirim email undangan (link aktivasi berlaku 24–48 jam)
4. Pengguna aktivasi akun & buat password

### 5.3 Reset Password
1. Klik "Lupa Password?" → masukkan email
2. Sistem kirim token reset sekali pakai (berlaku maks. 60 menit)
3. Password baru dibuat → seluruh sesi aktif sebelumnya di-revoke

### 5.4 Kebijakan Keamanan Akun
- Password minimal 8 karakter (huruf besar/kecil, angka, simbol)
- Password di-hash (bcrypt/argon2), tidak pernah plain text
- Idle timeout 30 menit untuk perangkat bersama (area produksi/gudang)
- Seluruh komunikasi client-server via TLS/HTTPS (sesuai UU No. 27/2022 PDP)

---

## 6. Fitur — Dashboard Utama

Ditampilkan setelah login, ringkasan relevan dengan role pengguna.

| Widget | Data yang Ditampilkan |
|---|---|
| Ringkasan Penerimaan Hari Ini | Total berat kirim vs terima, jumlah petani, rata-rata selisih timbang |
| Klasifikasi Kualitas Pasokan | % daun vs batang dibanding standar minimum 75% |
| Rendemen Produksi | Rendemen rata-rata batch vs standar 80%, tren 7/30 hari |
| Defect Rate | Jumlah & persentase produk cacat per kategori, tren mingguan |
| Akurasi Stok | % akurasi stok fisik vs sistem (target ≥98%) |
| Status Order & Lead Time | Order pending, waktu konfirmasi rata-rata (target ≤1x24 jam) |
| Traceability Cepat | Pencarian nomor batch → asal petani (target <10 menit) |
| Notifikasi/Alert | Rendemen di bawah standar, stok menipis, anomali pemakaian bahan |

Setiap widget: filter periode (harian/mingguan/bulanan), ekspor Excel/PDF.

---

## 7. Fitur — Modul ERP (9 Modul Inti)

### 7.0 Master Data (Prasyarat)

| Master Data | Field Utama |
|---|---|
| Petani/Pemasok | ID, Nama, Alamat/Desa, No. HP, Rekening (opsional), Status Aktif |
| Produk | ID, Nama, Varian/Rasa, SKU, Satuan, Harga Jual, Foto |
| Bahan Baku & Penolong | ID, Nama, Kategori, Satuan, Stok Minimum |
| Standar Mutu (dapat dikonfigurasi) | Toleransi timbang, standar %daun (default 75%), standar rendemen (default 80%), kategori defect |
| Gudang/Lokasi | ID, Nama Lokasi (Bahan Baku, WIP, Produk Jadi, Kemasan) |
| Pelanggan/Retail/Distributor | ID, Nama, Jenis, Wilayah, Kontak |

### 7.1 Modul Penerimaan Bahan Baku
**Tujuan:** Digitalisasi pencatatan penerimaan jamur dari petani, verifikasi selisih timbang.

| Field | Tipe | Keterangan |
|---|---|---|
| No. Penerimaan | String | Auto: `RM-YYYYMMDD-XXX` |
| Tanggal & Waktu Terima | Datetime | Otomatis/disesuaikan |
| ID Petani | Reference | Ke master data Petani |
| Berat Kirim (kg) | Decimal | Dari surat jalan petani |
| Berat Terima (kg) | Decimal | Hasil timbang aktual |
| Selisih & % Selisih | Calculated | Otomatis vs toleransi |
| Status Toleransi | Enum | "Dalam Toleransi"/"Melebihi Toleransi" |
| Foto Bukti Timbang | File (Supabase Storage) | Wajib untuk audit |
| Petugas Penerima | Reference | Dari user login |

**Fitur wajib:** validasi input, riwayat per petani, cetak bukti (PDF), notifikasi selisih melebihi toleransi.

### 7.2 Modul Sortasi & Grading
**Tujuan:** Mencatat pemisahan daun/batang, membandingkan % daun terhadap standar 75%.

| Field | Tipe | Keterangan |
|---|---|---|
| No. Sortasi | String | Terhubung ke No. Penerimaan |
| Berat Daun (kg) | Decimal | |
| Berat Batang (kg) | Decimal | |
| % Daun terhadap Total | Calculated | |
| Status Kualitas | Enum | "Memenuhi Standar"(≥75%)/"Di Bawah Standar" |
| Grade (opsional) | Enum | A/B/C |

**Fitur wajib:** rekap kualitas pasokan per petani, grafik tren kualitas.

### 7.3 Modul Produksi (WIP) & Rendemen
**Tujuan:** Mencatat input-output tiap tahap produksi, hitung rendemen otomatis vs standar 80%.

| Field | Tipe | Keterangan |
|---|---|---|
| No. Batch Produksi | String | `PRD-YYYYMMDD-XXX`, kunci traceability |
| Tahap Proses | Enum | Penggorengan/Pembumbuan |
| Bahan Masuk (Input) | Reference + Decimal | Dari stok WIP hasil sortasi |
| Hasil Keluar (Output) | Decimal | Berat produk per tahap |
| Rendemen (%) | Calculated | Output/Input x 100% |
| Status Rendemen | Enum | "Sesuai"/"Di Bawah Standar" |
| Waktu Mulai & Selesai | Datetime | Untuk lead time |

**Fitur wajib:** grafik histori rendemen per batch/operator/periode, perbandingan antar shift (opsional).

### 7.4 Modul Quality Control / Defect
**Tujuan:** Mencatat jumlah & kategori produk cacat per batch.

| Field | Tipe | Keterangan |
|---|---|---|
| No. Inspeksi QC | String | Terhubung ke No. Batch |
| Jumlah Diperiksa | Decimal/Integer | Sesuai metode sampling |
| Jumlah Produk Cacat | Integer/Decimal | |
| Kategori Defect | Enum (multi) | Gosong, terlalu asin, kemasan bocor, dll — dikonfigurasi Admin |
| Defect Rate (%) | Calculated | |
| Tindakan | Enum | Reject/Rework/Diloloskan dengan catatan |

**Fitur wajib:** rekap defect rate per kategori/batch/periode (grafik pareto).

### 7.5 Modul Persediaan Terintegrasi (Real-time)
**Tujuan:** Kelola stok bahan baku, penolong, kemasan, WIP, produk jadi secara real-time.

| Field | Tipe | Keterangan |
|---|---|---|
| ID Item | Reference | |
| Kategori Stok | Enum | Bahan Baku/Penolong/Kemasan/WIP/Produk Jadi |
| Lokasi/Gudang | Reference | |
| Stok Masuk/Keluar | Decimal | Otomatis dari transaksi modul lain |
| Stok Sistem | Calculated | Real-time |
| Stok Fisik | Decimal | Input manual saat opname |
| Akurasi Stok (%) | Calculated | Target ≥98% |

**Fitur wajib:** notifikasi reorder, kartu stok per item, laporan stok per kategori/lokasi.

**Catatan implementasi:** setiap mutasi stok wajib menggunakan database transaction untuk mencegah race condition saat input paralel oleh banyak user (gudang & sales bersamaan).

### 7.6 Modul PPIC & Forecasting (Berbasis TypeScript)
**Tujuan:** Perencanaan produksi berbasis histori penjualan + prediksi permintaan.

| Field | Tipe | Keterangan |
|---|---|---|
| Periode Perencanaan | Date range | Mingguan/bulanan |
| Data Histori Permintaan | Time series | Dari Modul Order & Penjualan |
| Prediksi Permintaan | Decimal | Hasil model forecasting per produk/varian |
| Rencana Produksi | Decimal | Bisa disesuaikan manual PPIC |
| Kebutuhan Bahan Baku (MRP) | Calculated | Rencana produksi x rasio kebutuhan |
| Deteksi Anomali | Flag | Penandaan pemakaian bahan menyimpang signifikan |

**Pendekatan teknis forecasting:**
- Model: **Exponential Smoothing (Holt-Winters)** atau **moving average tertimbang**, diimplementasikan native dalam TypeScript, dijalankan sebagai Server Action/scheduled job (Vercel Cron)
- Tidak memerlukan service Python terpisah — cukup akurat untuk skala data historis IKM dengan seasonality sederhana
- Metrik evaluasi: MAPE (Mean Absolute Percentage Error) dihitung otomatis untuk membandingkan prediksi vs realisasi tiap periode
- Model dapat di-upgrade ke pendekatan lebih kompleks di fase berikutnya jika volume data historis sudah signifikan

**Fitur wajib:** dashboard "prediksi vs realisasi", evaluasi akurasi berkala.

### 7.7 Modul Order & Penjualan
**Tujuan:** Kelola pesanan pelanggan/retail dengan pengecekan stok real-time.

| Field | Tipe | Keterangan |
|---|---|---|
| No. Order | String | `SO-YYYYMMDD-XXX` |
| Pelanggan/Retail/Distributor | Reference | |
| Detail Produk & Jumlah | Table (multi-row) | Per varian |
| Ketersediaan Stok | Calculated (real-time) | |
| Status Order | Enum | Baru/Dikonfirmasi/Diproses/Dikirim/Selesai/Dibatalkan |
| Waktu Order & Konfirmasi | Datetime | Untuk lead time (target ≤1x24 jam) |

**Fitur wajib:** riwayat order per pelanggan, perhitungan otomatis rata-rata waktu konfirmasi.

**Catatan:** pertimbangkan skema harga berbeda per jenis pelanggan (retail vs distributor vs reseller) — perlu didiskusikan dengan pihak KhumKhum sebelum implementasi field harga.

### 7.8 Modul Ketertelusuran (Traceability) Dua Arah
**Tujuan:** Telusur produk jadi → bahan baku/petani asal, dan sebaliknya (target <10 menit/batch).

| Field | Tipe | Keterangan |
|---|---|---|
| Kode Batch/Lot | String | Dicetak pada kemasan |
| Rantai Keterkaitan | Relational | Batch ↔ Sortasi ↔ Penerimaan ↔ Petani |
| Riwayat Tanggal & Proses | Timeline | Terima → sortasi → produksi → QC → distribusi |

**Fitur wajib:** pencarian dua arah, opsional generate QR Code (fase 2, tertaut ke halaman publik).

### 7.9 Dashboard & KPI Monitoring Terpadu
Agregasi lintas modul (lihat Bab 6), tambahan:
- Filter tanggal, produk, lokasi
- Ekspor PDF/Excel untuk rapat manajemen & pelaporan ke Kemenperin
- Hak akses: manajemen (Viewer) hanya lihat, tidak bisa ubah data

---

## 8. Struktur Basis Data (Entity Overview)

| Entitas | Relasi Utama |
|---|---|
| users, roles, permissions | Many-to-many |
| farmers (petani) | 1 petani → banyak raw_material_receipts |
| raw_material_receipts | 1 receipt → 1 sortation_result |
| sortation_results | 1 sortation → banyak production_batch_inputs |
| production_batches, production_stages | 1 batch → banyak stage |
| quality_checks | 1 batch → 1/banyak quality_check |
| inventory_items, inventory_transactions | Setiap transaksi modul lain → 1 baris inventory_transaction |
| products, product_variants | Master produk & varian |
| customers, sales_orders, sales_order_items | 1 order → banyak item |
| demand_forecasts, production_plans | Terhubung ke products & periode |
| audit_logs | Mencatat seluruh aksi kritikal (login, ubah/hapus data) |

**ORM yang direkomendasikan:** Prisma atau Drizzle — mendukung migrasi skema terversi dan type-safety langsung ke Server Actions.

---

## 9. Struktur API (Server Actions / Route Handlers)

Seluruh komunikasi internal menggunakan pola REST/JSON melalui Next.js Route Handlers, dengan autentikasi Bearer Token (JWT) atau session cookie.

| Kelompok | Contoh Endpoint | Deskripsi |
|---|---|---|
| Auth | `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/forgot-password` | Autentikasi & sesi |
| Master Data | `GET/POST /api/farmers`, `/api/products`, `/api/customers` | CRUD master data |
| Penerimaan & Sortasi | `/api/raw-material-receipts`, `/api/sortation` | Transaksi bahan baku |
| Produksi & QC | `/api/production-batches`, `/api/quality-checks` | Transaksi produksi |
| Persediaan | `/api/inventory`, `/api/inventory/stock-opname` | Manajemen stok |
| PPIC & Forecasting | `/api/forecast/demand`, `/api/production-plan` | Perencanaan (TS-based) |
| Order & Penjualan | `/api/sales-orders` | Transaksi penjualan |
| Traceability | `/api/traceability/batch/{code}` | Penelusuran |
| Dashboard/KPI | `/api/dashboard/summary` | Agregasi laporan |

---

## 10. Kebutuhan Non-Fungsional & Kepatuhan

### 10.1 Keamanan Data
- Enkripsi in-transit (HTTPS/TLS 1.2+), enkripsi at-rest untuk data sensitif (native di Supabase)
- Kepatuhan UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi
- Backup otomatis terjadwal (native di Supabase, dengan retensi terkonfigurasi)
- Audit log seluruh aktivitas kritikal
- Praktik keamanan mengacu OWASP Top 10 (mencegah SQL Injection, XSS, CSRF)

### 10.2 Performa & Ketersediaan
- Waktu muat halaman <3 detik pada koneksi standar (didukung CDN Vercel)
- Multi-user real-time tanpa konflik data (database transaction untuk mutasi stok)
- Uptime target ≥99% selama periode operasional (didukung SLA Vercel & Supabase)

### 10.3 Kepatuhan & Standar Prosedur
- Standar mutu (toleransi timbang, %daun, rendemen, kategori defect) dapat dikonfigurasi Admin — tidak hard-coded
- Struktur pelaporan KPI format "Before–After" untuk pelaporan ke Direktorat IKM Kemenperin
- Dokumentasi teknis (README, API documentation) wajib sebagai bagian serah terima
- Prinsip least privilege pada seluruh role

---

## 11. Rencana Deployment

| Komponen | Platform | Catatan |
|---|---|---|
| Aplikasi (Frontend + Backend) | **Vercel** | Auto-deploy dari Git, 1 project |
| Database | **Supabase (PostgreSQL)** | Managed, backup otomatis |
| File/Object Storage | **Supabase Storage** | Foto bukti timbang, dokumen QC |
| Forecasting | Native dalam Next.js (Vercel Cron untuk scheduled job) | Tidak ada service terpisah |
| Domain & SSL | Vercel (otomatis) | HTTPS default |

**Environment:** minimal 2 environment (staging & production) untuk UAT sebelum go-live.

---

## 12. Pemetaan ke Jadwal Implementasi (80 Hari Kalender)

| Periode | Fokus Pengembangan |
|---|---|
| Bulan I, Minggu 1–2 | Analisis kebutuhan, finalisasi standar mutu, setup arsitektur (Next.js + Supabase), skema database |
| Bulan I, Minggu 3 – Bulan II, Minggu 1 | Modul Penerimaan Bahan Baku & Sortasi; mulai Modul Produksi (WIP) & rendemen |
| Bulan II, Minggu 1–2 | Modul Produksi (lanjutan), Modul Quality Control/Defect |
| Bulan II, Minggu 2–3 | Modul Persediaan Terintegrasi |
| Bulan II, Minggu 3–4 | Modul PPIC & Forecasting (TypeScript) |
| Bulan III, Minggu 1 | Modul Order & Penjualan |
| Bulan III, Minggu 2 | Dashboard KPI & Traceability, mulai UAT |
| Bulan III, Minggu 2–3 | UAT (lanjutan) & Pelatihan Pengguna |
| Bulan III, Minggu 4 | Go-live, pendampingan, evaluasi KPI, laporan akhir |
| Pasca Go-live (12 bulan) | Pendampingan, maintenance, support, update sistem |

---

## 13. Kriteria Penerimaan (UAT / Acceptance Criteria)

| No. | Indikator KPI | Target Acceptance |
|---|---|---|
| 1 | Pencatatan penerimaan bahan baku | 100% tercatat digital |
| 2 | Klasifikasi kualitas pasokan petani | 100% terklasifikasi otomatis vs standar ≥75% daun |
| 3 | Rendemen produksi | 100% batch memiliki data rendemen otomatis vs standar 80% |
| 4 | Pencatatan defect/reject | 100% batch memiliki data defect/reject |
| 5 | Akurasi stok | ≥98% (selisih ≤2%) |
| 6 | Waktu konfirmasi stok order | Maksimal 1x24 jam |
| 7 | Waktu traceability | Di bawah 10 menit per batch |
| 8 | Dashboard KPI manajemen | Tersedia & dapat diakses real-time |
| 9 | Akurasi forecasting | MAPE terukur & dilaporkan tiap periode evaluasi |

---

## 14. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Data historis penjualan belum cukup saat go-live untuk forecasting akurat | Prediksi awal kurang akurat | Mulai dengan moving average sederhana, upgrade model seiring bertambahnya data |
| Timeout Vercel serverless function untuk proses berat (laporan besar, forecasting batch) | Request gagal | Gunakan Vercel Cron Job untuk proses terjadwal, bukan real-time request |
| Konflik data saat input paralel (gudang & sales bersamaan) | Stok tidak akurat | Database transaction & row-level locking di Supabase |
| Migrasi data dari logsheet manual ke sistem baru | Data awal tidak lengkap | Rencana migrasi data manual terjadwal sebelum go-live, verifikasi oleh Admin Operasional |
| Ketergantungan pada 1 platform (Vercel + Supabase) | Vendor lock-in | Gunakan ORM (Prisma/Drizzle) agar migrasi database tetap memungkinkan di masa depan |

---

## 15. Lampiran — Glosarium Istilah

| Istilah | Penjelasan |
|---|---|
| Rendemen | Persentase hasil akhir (output) dibanding bahan yang digunakan (input) |
| WIP (Work in Process) | Barang dalam proses, sudah masuk produksi namun belum jadi produk jadi |
| PPIC | Production Planning & Inventory Control |
| Traceability | Ketertelusuran produk dari bahan baku/asal hingga produk jadi, atau sebaliknya |
| RBAC | Role-Based Access Control |
| UAT | User Acceptance Test |
| MAPE | Mean Absolute Percentage Error — metrik evaluasi akurasi forecasting |
| Exponential Smoothing | Metode forecasting time-series berbasis pembobotan data historis terbaru |

---

*Dokumen ini disusun sebagai acuan pengembangan (PRD) berdasarkan Dokumen Spesifikasi Teknis awal, dengan penyesuaian arsitektur menjadi Next.js full-stack (Vercel) + Supabase + forecasting berbasis TypeScript, sesuai hasil diskusi teknis tim.*
