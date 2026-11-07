# BUKU PANDUAN PENGGUNAAN SISTEM (USER MANUAL)
# KHUMKHUM ERP — ENTERPRISE RESOURCE PLANNING MANUFAKTUR JAMUR CRISPY

**Pedoman Operasional Standar (Seed-to-Shelf) Sistem Informasi Manufaktur, Inventori & Kendali Mutu Pabrik**  
**Versi Sistem:** 1.1 (Produksi Mutakhir) | **Pembaruan:** November 2026  

---

> 📷 **[ TEMPATKAN SCREENSHOT SAMPUL: LOGO RESMI CV KHAIRA BUANA MANDIRI / MOCKUP LAYAR UTAMA KHUMKHUM ERP DI SINI ]**

---

### **Identitas Dokumen & Tim Pengembang**

| Parameter | Keterangan |
|---|---|
| **Sistem Aplikasi** | KhumKhum ERP (Enterprise Resource Planning Manufaktur Jamur Crispy) |
| **Mitra Pengguna** | CV Khaira Buana Mandiri |
| **Tim Pengembang** | Tim IT Pengembang ERP KhumKhum |
| **Versi Rilis Dokumen** | Versi 1.1 (Produksi Mutakhir) |
| **Tanggal Pembaruan** | November 2026 |
| **Cakupan Hak Akses** | Super Admin, Manajemen, Warehouse, Produksi, Premix, QC, Sortasi, Sales, IT Maintenance |

---

## **KATA PENGANTAR**

Puji syukur ke hadirat Tuhan Yang Maha Esa atas rahmat dan karunia-Nya sehingga **Buku Panduan Penggunaan Sistem (User Manual) KhumKhum ERP — Enterprise Resource Planning Manufaktur Jamur Crispy untuk CV Khaira Buana Mandiri (Versi Sistem 1.1 Produksi Mutakhir)** ini dapat diselesaikan dan disajikan secara lengkap. Buku pedoman ini disusun sebagai acuan operasional resmi bagi seluruh jajaran pimpinan dan staf dalam menjalankan sistem informasi pabrik secara terpadu, presisi, transparan, dan akuntabel.

KhumKhum ERP dirancang khusus untuk memfasilitasi digitalisasi proses industri pangan olahan jamur crispy secara menyeluruh (*seed-to-shelf*). Ruang lingkup sistem mencakup:
1. **Tata Kelola Hak Akses Pengguna (Role-Based Access Control):** Pemisahan 10 peran kerja fungsional pabrik.
2. **Master Data & Standar Mutu:** Dilengkapi *Batch Product Generator Modal* dan Standar Resep Kemasan (*Packaging BOM Level 3*).
3. **Penerimaan Bahan Mentah (Receiving):** Pencatatan bobot kotor, tara, bobot bersih jamur segar petani mitra, dan integrasi pengiriman nota WhatsApp.
4. **Sortasi & Grading:** Pemisahan Grade A, Grade B, dan bobot afkir/susut secara akurat.
5. **Manufaktur Tiga Tahap Terpadu:**
   - *Stasiun Level 1:* Peracikan Tepung Premix Siap Pakai (`/production/premix`).
   - *Stasiun Level 2:* Penggorengan Jamur Curah berstandar waktu baku kerja (*time study*) atau rekap langsung, serta penyimpanan ke Wadah Longsong Buffer (`/production` Tab Frying).
   - *Stasiun Level 3:* Pembumbuan dan Pengemasan Retail dengan pemotongan otomatis (*auto-deduct*) bahan kemasan dan bumbu tabur berdasar standar BOM Level 3 (`/production` Tab Packing).
6. **Kendali Mutu (Quality Control):** Pengujian 4 parameter organoleptik dan pelepasan produk otomatis ke gudang barang jadi.
7. **Gudang & Inventori Terpadu:** Manajemen bahan baku, bumbu, kemasan, mutasi kartu stok (*rekening koran*), dan *stock opname* fisik.
8. **Sales Order & Pengiriman:** Manajemen pesanan pelanggan, validasi ketersediaan barang jadi, dan pengurangan stok otomatis saat status dikirim (*SHIPPED*).
9. **Perencanaan Kapasitas PPIC & AI Forecasting:** Perhitungan kebutuhan bahan baku (*MRP*) dan peramalan tren musiman berbasis *Holt-Winters Exponential Smoothing*.
10. **Pemantauan Dashboard & Pelaporan:** Dashboard Eksekutif, Dashboard Operasional Harian (*Daily Operations*), serta ekspor 6 jenis laporan resmi ke format Excel (`.xlsx`) dan PDF (`.pdf`).

Seluruh operasional berlandaskan empat prinsip utama: **Zero Data Redundancy**, **Keterlacakan Penuh (Traceability)**, **Pemberitahuan Dini Stok (Early Warning Alerts)**, dan **Ketepatan Komposisi BOM Kemasan Tingkat 3**.

Tim IT Pengembang menyampaikan apresiasi dan terima kasih yang mendalam kepada pimpinan dan seluruh tim operasional CV Khaira Buana Mandiri atas dedikasi dan kolaborasi aktif dalam penyusunan sistem ini. Semoga buku panduan ini menjadi sarana akselerasi efisiensi manufaktur, kepatuhan mutu pangan, dan pertumbuhan bisnis CV Khaira Buana Mandiri.

**Sumedang / Bandung, November 2026**  
**Tim IT Pengembang KhumKhum ERP & Manajemen CV Khaira Buana Mandiri**

---

## **DAFTAR ISI & PETUNJUK PENEMPATAN GAMBAR**

| Bab / Sub-Bab | Judul Modul & Pembahasan | Rute Menu Sistem | Kode Slot Gambar |
|---|---|---|---|
| **BAB I** | Pendahuluan & Prinsip Sistem (4 Prinsip Utama) | - | Gambar 1.1 |
| **BAB II** | Hak Akses Pengguna (Role-Based Access Control - 10 Peran) | `/login` & `/settings/users` | Gambar 2.1, 2.2 |
| **BAB III** | Antarmuka Pengguna, Navigasi & Sistem Notifikasi Stok | Sidebar & Topbar | Gambar 3.1, 3.2 |
| **BAB IV** | Modul Master Data & Standar Pabrik | Menu Data Induk | - |
| **4.1** | Master Bahan Baku & Pengaturan Reorder Point (ROP) | `/master/raw-materials` | Gambar 4.1 |
| **4.2** | Master Produk Jadi, Tab Filter & Batch Product Generator | `/master/products` | Gambar 4.2, 4.3 |
| **4.3** | Standar Produksi & Resep Penggorengan Curah | `/master/production-standards` | Gambar 4.4 |
| **4.4** | Standar Kemasan BOM Level 3 (Jamur Matang & Bumbu) | Tab BOM Level 3 | Gambar 4.5 |
| **BAB V** | Modul Penerimaan Bahan Baku (Receiving) & Nota WA | `/receiving` | Gambar 5.1, 5.2 |
| **BAB VI** | Modul Sortasi & Grading Mutu Jamur Segar | `/sorting` | Gambar 6.1 |
| **BAB VII** | Modul Manufaktur & Produksi (3 Tahap Terpadu) | Lini Produksi | Diagram 7.0 |
| **7.1** | Stasiun Level 1: Peracikan Tepung Premix | `/production/premix` | Gambar 7.1 |
| **7.2** | Stasiun Level 2: Penggorengan Jamur Curah & Wadah Longsong Buffer | `/production` (Tab Frying) | Gambar 7.2, 7.3, 7.4 |
| **7.3** | Stasiun Level 3: Pembumbuan & Pengemasan Retail (BOM Level 3) | `/production` (Tab Packing) | Gambar 7.5 |
| **BAB VIII** | Modul Quality Control (QC) & Pelepasan Produk Jadi | `/quality-control` | Gambar 8.1, 8.2 |
| **BAB IX** | Modul Gudang & Inventori Terpadu (Warehouse & Inventory) | `/warehouse` & `/inventory` | Gambar 9.1 s/d 9.4 |
| **BAB X** | Modul Sales Order & Pengiriman | `/sales` | Gambar 10.1, 10.2 |
| **BAB XI** | Modul PPIC & Perencanaan Kapasitas Pabrik | `/ppic` | Gambar 11.1 |
| **BAB XII** | Modul AI Forecasting (Metode Holt-Winters) | `/ai-forecast` | Gambar 12.1 |
| **BAB XIII** | Modul Dashboard Eksekutif, Operasional & Laporan Resmi | Dashboard & Laporan | - |
| **13.1** | Dashboard Eksekutif & Indikator Mutu (Yield & Defect) | `/dashboard` | Gambar 13.1 |
| **13.2** | Dashboard Operasional Harian (Daily Operations) Real-Time | `/dashboard` (Daily Ops) | Gambar 13.2 |
| **13.3** | 6 Jenis Laporan Komprehensif & Ekspor Dokumen (Excel & PDF) | `/reports` | Gambar 13.3 |
| **13.4** | Ketertelusuran Produk (Traceability) & Jejak Audit (Audit Log) | `/traceability` & `/settings/audit-log` | Gambar 13.4 |
| **BAB XIV** | Panduan Troubleshooting & Tanya Jawab (FAQ) | Seluruh Modul | Gambar 14.1 |

---

## **BAB I**
## **1. PENDAHULUAN & PRINSIP SISTEM**

KhumKhum ERP dirancang khusus untuk memfasilitasi digitalisasi proses industri pangan olahan jamur crispy secara menyeluruh (*seed-to-shelf*), mulai dari penerimaan bahan mentah dari petani mitra, pengolahan tepung premix, proses penggorengan higienis, pencatatan waktu baku kerja (*time study*), pengemasan retail dengan formula bumbu presisi, kendali mutu QC, hingga manajemen inventori dan penjualan grosir/retail.

### **Empat Prinsip Utama Operasional Sistem**

1. **Zero Data Redundancy (Satu Sumber Kebenaran):**  
   Setiap pemakaian bahan baku otomatis memotong saldo inventori riil tanpa perlu input ganda di buku terpisah. Seluruh data produksi, stok, QC, dan penjualan saling terhubung dalam satu basis data terintegrasi.
2. **Keterlacakan Penuh (Full Traceability):**  
   Setiap bungkus jamur crispy yang terjual dapat dilacak kembali hingga ke nomor wadah longsong, batch penggorengan, tanggal sortasi, dan petani mitra penyetor jamur segarnya.
3. **Pemberitahuan Dini (Early Warning Alerts):**  
   Sistem secara otomatis memberi peringatan visual jika ada stok bahan baku, bumbu, atau kemasan yang habis (*Danger: Stok Habis*) atau mendekati batas aman pemesanan ulang (*Warning: Reorder Point / ROP*).
4. **BOM Kemasan Tingkat 3 (BOM Level 3 Standard):**  
   Komposisi kemasan retail dihitung secara presisi memisahkan bobot jamur matang dan bobot bumbu tabur (*Netto Kemasan = Bobot Jamur Crispy Matang + Bobot Bumbu Tabur*), sehingga gramasi netto produk selalu konsisten sesuai izin edar BPOM/P-IRT.

---

> 📷 **[ TEMPATKAN SCREENSHOT Gambar 1.1: ILUSTRASI ALUR OPERASIONAL TERPADU SEED-TO-SHELF KHUMKHUM ERP DI SINI ]**
> - **Rute Menu:** Tampilan Umum Sistem / Ringkasan Alur Pabrik
> - **Petunjuk Gambar:** Masukkan screenshot tampilan ringkasan alur kerja KhumKhum ERP dari penerimaan jamur segar petani mitra hingga pengemasan retail berstandar BOM Level 3.
> - **Bagian yang Disorot:** Keterhubungan antar-modul dari hulu (*Receiving & Sorting*) ke proses (*Manufacturing & QC*) hingga hilir (*Warehouse & Sales*).

*Gambar 1.1 — Ilustrasi Alur Operasional Terpadu Seed-to-Shelf KhumKhum ERP*

---

## **BAB II**
## **2. HAK AKSES PENGGUNA (ROLE-BASED ACCESS CONTROL)**

Sistem membatasi akses setiap fitur sesuai kewenangan tugas jabatan dengan menerapkan prinsip *Least Privilege*. Dalam arsitektur sistem KhumKhum ERP, terdapat **10 peran pengguna (User Roles)**:

| Role Pengguna | Nama Jabatan Sistem | Ruang Lingkup Wewenang Utama | Hak Akses Modul / Menu |
|---|---|---|---|
| **SUPER_ADMIN** | Super Admin | Kontrol penuh terhadap seluruh modul aplikasi, manajemen pengguna, konfigurasi sistem, database, dan pembatalan transaksi khusus. | Akses Penuh Seluruh Menu (`*`) |
| **MANAGEMENT** | Manajemen (Investor / Viewer) | Pemantauan performa bisnis (*Read-Only*), Dashboard Eksekutif, analisis KPI (Rendemen Yield, Defect Rate, Omzet), laporan keuangan, traceability, dan audit log. | Dashboard, Laporan, Traceability, Master Data, Produksi, Inventori, Gudang, QC, Sales, Audit Log, AI Forecast |
| **WAREHOUSE** | Warehouse, Logistik & PPIC | Pengelolaan stok bahan baku, bumbu, kemasan, produk jadi, penerimaan barang non-jamur, mutasi antar-gudang, kartu stok (*rekening koran*), *stock opname*, dan notifikasi ROP. | Dashboard, Master Data, Inbound/Receiving, Inventori, Warehouse, Premix, PPIC, Traceability, Laporan, Forecast |
| **PRODUCTION** | Petugas Produksi | Pelaksanaan SPK Goreng Jamur, pencatatan waktu baku kerja (*time study* wajan), input timbangan jamur matang ke Wadah Longsong Buffer, SPK Packing rasa, dan monitoring status produksi. | Dashboard, Master Standar Produksi, Gudang, Premix, PPIC, Produksi & Rendemen, Inventori, Traceability |
| **PREMIX** | Petugas Premix & Bumbu | Khusus operator peracikan tepung pelapis krispi di stasiun mixing premix, pemotongan stok bahan mentah tepung/bumbu, dan penambahan stok premix siap pakai. | Dashboard, Peracikan Premix, Produksi, Gudang, Inventori, Master Bahan Baku |
| **QC** | Quality Control & Ops | Pengujian organoleptik (kerenyahan, warna/rasa, minyak, segel kemasan), penerbitan status Lolos (*RELEASED*), Perbaikan (*REWORK*), atau Tolak (*REJECTED*), serta verifikasi standar mutu. | Dashboard, Quality Control, Standar Produksi, Produksi, Inventori, Traceability, Laporan, Forecast |
| **SORTING** | Petugas Sortasi | Penerimaan jamur segar di pos sortasi, pemisahan Grade A, Grade B, dan bobot afkir/susut, serta rilis stok jamur segar ke gudang bahan baku. | Stasiun Sortasi Jamur (`/sorting`) |
| **SALES** | Sales & Pengiriman | Pembuatan pesanan penjualan (*Sales Order*), pencatatan faktur, validasi stok produk jadi, dan pemotongan inventori otomatis saat barang berstatus dikirim (*SHIPPED*). | Dashboard, Master Produk Jadi, Sales Order & Pengiriman, Inventaris Produk Jadi, Traceability |
| **IT_MAINTENANCE**| IT Maintenance | Pemeliharaan infrastruktur teknis, diagnosis sistem, pengujian integrasi server, dan dukungan teknis darurat. | Akses Penuh Sistem (`*`) |
| **FARMER** | Petani Mitra | Pemasok jamur tiram segar mitra CV Khaira Buana Mandiri. Tidak login ke web app; berinteraksi melalui pengiriman otomatis Nota Timbang Penerimaan via WhatsApp. | Non-Login Web (Integrasi WhatsApp API) |

---

> 📷 **[ TEMPATKAN SCREENSHOT Gambar 2.1: HALAMAN LOGIN & OTENTIKASI PENGGUNA KHUMKHUM ERP DI SINI ]**
> - **Rute Menu:** `/login`
> - **Petunjuk Gambar:** Ambil screenshot formulir login KhumKhum ERP yang memperlihatkan kolom username/email, password, opsi Remember Me, dan tombol 'Masuk ke Sistem'.
> - **Bagian yang Disorot:** Form input kredensial login dan logo KhumKhum ERP.

*Gambar 2.1 — Halaman Login & Otentikasi Pengguna KhumKhum ERP*

---

> 📷 **[ TEMPATKAN SCREENSHOT Gambar 2.2: TABEL MANAJEMEN PENGGUNA & PENGATURAN ROLE JABATAN (RBAC) DI SINI ]**
> - **Rute Menu:** `/settings/users`
> - **Petunjuk Gambar:** Ambil screenshot halaman Manajemen Pengguna yang menampilkan daftar staf, kolom email, dropdown role jabatan (Super Admin, Production, Warehouse, QC, dll.), badge status aktif, dan tombol '+ Tambah Pengguna'.
> - **Bagian yang Disorot:** Kolom Role Jabatan dan tombol manajemen pengguna.

*Gambar 2.2 — Tabel Manajemen Pengguna & Pengaturan Role Jabatan (RBAC)*

---

## **BAB III**
## **3. ANTARMUKA PENGGUNA, NAVIGASI & SISTEM NOTIFIKASI**

### **3.1. Struktur Layar Utama**

1. **Sidebar Navigasi (Bilah Sisi Kiri):**  
   Menyediakan akses modul terstruktur yang otomatis beradaptasi dengan peran (*role*) pengguna yang sedang aktif:
   - **Grup Utama:** Dashboard Utama (`/dashboard`).
   - **Grup Operasional:** Inbound/Penerimaan (`/receiving`), Sortasi & Grading (`/sorting`), Peracikan Tepung Premix (`/production/premix`), Warehouse/Bahan Baku (`/warehouse`), PPIC & Jadwal (`/ppic`), Produksi & Rendemen (`/production`), Quality Control (`/quality-control`), Inventaris Produk Jadi (`/inventory`), Sales Order & Pengiriman (`/sales`), dan Ketertelusuran (`/traceability`).
   - **Grup Data Induk (Master Data):** Setup Wizard (`/master/setup-wizard`), Pusat Master Data (`/master`), Impor Data Historis (`/master/historical-import`), Bahan Baku (`/master/raw-materials`), Bahan Jadi/Produk (`/master/products`), Lokasi Gudang (`/master/warehouses`), Resep & Standar BOM (`/master/production-standards`), dan Waktu Baku (`/master/waktu-baku`).
   - **Grup Manajemen:** Laporan (`/reports`) dan AI Forecasting (`/ai-forecast`).
   - **Grup Sistem:** Konfigurasi Standar (`/settings`), Manajemen Pengguna (`/settings/users`), dan Audit Log & Sistem (`/settings/audit-log`).
   - Sidebar dapat diciutkan (*collapse*) menggunakan tombol toggle di sudut kiri atas untuk memperluas area kerja.

2. **Topbar (Bilah Atas):**  
   - **Lonceng Notifikasi Operasional:** Indikator *real-time* status operasional pabrik.
   - **Filter Notifikasi:** Tab filter *Semua* dan *Mendesak* untuk membedakan notifikasi biasa dengan status bahaya (*Danger: Stok Habis*).
   - **Profil Pengguna:** Menampilkan nama user aktif, badge peran jabatan, tautan pengaturan, dan tombol Keluar (*Logout*).

---

> 📷 **[ TEMPATKAN SCREENSHOT Gambar 3.1: STRUKTUR LAYAR UTAMA (SIDEBAR NAVIGASI KIRI & TOPBAR BILAH ATAS) DI SINI ]**
> - **Rute Menu:** Tampilan Umum Layar Kerja
> - **Petunjuk Gambar:** Ambil screenshot layar penuh KhumKhum ERP yang memperlihatkan hierarki menu sidebar kiri yang terbuka dan bilah topbar di bagian atas.
> - **Bagian yang Disorot:** Sidebar navigasi per kategori dan komponen topbar (lonceng notifikasi & profil).

*Gambar 3.1 — Struktur Layar Utama (Sidebar Navigasi Kiri & Topbar Bilah Atas)*

---

### **3.2. Membaca & Menggunakan Notifikasi Stok**

Sistem KhumKhum ERP dilengkapi pemantau stok otomatis yang menghitung saldo setiap material dan membandingkannya dengan nilai *Reorder Point (ROP)*:
1. Klik icon **Lonceng** pada Topbar.
2. Jika suatu bahan baku atau kemasan memiliki saldo 0, sistem menampilkan kartu berwarna merah (**Danger: Stok Habis!**).
3. Jika saldo bahan baku atau kemasan berada di bawah atau sama dengan batas ROP, sistem menampilkan kartu berwarna kuning (**Warning: Stok Menipis!**).
4. Klik langsung pada kartu notifikasi tersebut untuk dialihkan otomatis ke halaman detail stok gudang terkait guna melakukan *restock* atau membuat penerimaan barang.
5. Klik **Tandai Semua Dibaca** apabila peringatan telah dikoordinasikan dengan tim terkait.

---

> 📷 **[ TEMPATKAN SCREENSHOT Gambar 3.2: PANEL DROPDOWN LONCENG NOTIFIKASI STOK (DANGER & WARNING) DI SINI ]**
> - **Rute Menu:** Klik Lonceng Notifikasi di Topbar
> - **Petunjuk Gambar:** Ambil screenshot panel dropdown lonceng notifikasi yang terbuka, memperlihatkan kartu merah (Danger: Stok Habis) dan kartu kuning (Warning: Stok Menipis/ROP) serta tombol 'Tandai Semua Dibaca'.
> - **Bagian yang Disorot:** Kartu alert stok habis, kartu stok menipis, dan filter notifikasi.

*Gambar 3.2 — Panel Dropdown Lonceng Notifikasi Stok (Danger & Warning)*

---

## **BAB IV**
## **4. MODUL MASTER DATA & STANDAR PABRIK**

Menu: **Data Induk (Master Data)** | Hak Akses: Super Admin, Manajemen, Warehouse, Produksi, QC

### **4.1. Master Bahan Baku (`/master/raw-materials`)**

Mencatat seluruh kebutuhan material pabrik, baik bahan pangan mentah, bumbu, maupun kemasan:
- **Kategori Bahan Baku:**
  - **Bahan Baku Utama (`UTAMA`):** Jamur Tiram Segar, Tepung Terigu (Kunci Biru / Cakra Kembar), Tepung Tapioka, Tepung Beras, Tepung Maizena, Minyak Goreng Curah/Kemasan.
  - **Bumbu Tabur (`BUMBU`):** Bumbu Balado, Bumbu Barbeque (BBQ), Bumbu Pedas Manis, Bumbu Super Pedas, Bumbu Jagung Bakar, Bumbu Keju, Bumbu Rumput Laut, Garam Halus, Bawang Putih Bubuk, Lada Putih.
  - **Bahan Kemasan (`PACKAGING`):** Standing Pouch (zipper) 30g, 50g, 60g, 75g, 100g, 250g; Toples Plastik Tabung 60g, 150g; Tutup Toples; Seal Aluminium Foil; Plastik Bantal Curah; Dus Karton Master Box.
  - **Lainnya (`LAINNYA`):** Gas LPG 12kg/50kg, Lakban Pabrik, Plastik Wrapping, Sarung Tangan Sanitasi.
- **Pengaturan Reorder Point (ROP):**  
  Setiap item wajib ditentukan batas minimal ROP (misal: ROP Bumbu Balado = 1.000 gram; ROP Pouch 75g = 500 pcs). Begitu saldo fisik gudang menyentuh batas ini, sistem langsung menerbitkan notifikasi peringatan dini.

---

> 📷 **[ TEMPATKAN SCREENSHOT Gambar 4.1: HALAMAN MASTER BAHAN BAKU & PENGATURAN BATAS REORDER POINT (ROP) DI SINI ]**
> - **Rute Menu:** `/master/raw-materials`
> - **Petunjuk Gambar:** Ambil screenshot tabel Master Bahan Baku yang menampilkan kolom Kode Bahan, Nama Bahan, Kategori, Satuan (UOM), Batas Minimal ROP, dan tombol '+ Tambah Bahan Baku'.
> - **Bagian yang Disorot:** Kolom Kategori, Batas ROP, dan tombol penambahan bahan.

*Gambar 4.1 — Halaman Master Bahan Baku & Pengaturan Batas Reorder Point (ROP)*

---

### **4.2. Master Produk Jadi & Generator Varian Massal (`/master/products`)**

Mengelola katalog produk pangan retail jamur crispy yang diproduksi oleh CV Khaira Buana Mandiri.

#### **Fitur Tab Filter Varian Rasa Instan**
Tabel produk dilengkapi barisan tab filter instan di bagian atas:
`Semua Produk` | `Original` | `Balado` | `Barbeque` | `Pedas Manis` | `Super Pedas`  
Pengguna dapat memfilter ratusan SKU produk hanya dalam satu klik tanpa perlu mengetik ulang kata kunci pencarian.

---

> 📷 **[ TEMPATKAN SCREENSHOT Gambar 4.2: HALAMAN MASTER PRODUK DENGAN TAB FILTER VARIAN RASA INSTAN DI SINI ]**
> - **Rute Menu:** `/master/products`
> - **Petunjuk Gambar:** Ambil screenshot halaman Master Produk yang memperlihatkan barisan tab filter varian rasa di atas tabel dan tombol 'Generator Varian Otomatis' di sudut kanan atas.
> - **Bagian yang Disorot:** Barisan tab filter varian rasa dan tombol 'Generator Varian Otomatis'.

*Gambar 4.2 — Halaman Master Produk dengan Tab Filter Varian Rasa Instan*

---

#### **Fitur: Generator Varian Produk Massal (Batch Product Generator)**
Untuk mencegah kesalahan pengetikan manual satu per satu, sistem menyediakan modal otomatis (`BatchProductGeneratorModal`):
1. Klik tombol **Generator Varian Otomatis** di sudut kanan atas tabel master produk.
2. Pilih kombinasi varian yang akan digenerate secara bersamaan:
   - **Tipe Kemasan:** Standing Pouch (`PCH`), Toples (`TPL`), atau Pouch Bantal (`BTL`).
   - **Pilihan Rasa:** Original (`ORI`), Balado (`BLD`), Barbeque (`BBQ`), Pedas Manis (`PDM`), Super Pedas (`SPD`).
   - **Ukuran Gramasi:** 30g, 50g, 60g, 75g, 100g, 150g, 250g, 500g.
   - **Prefix SKU:** Default `FG` (*Finished Goods*) atau kode khusus seperti `KK`.
   - **Harga Jual Default:** Masukkan harga standar satuan eceran/grosir.
3. **Pratinjau Kombinasi Otomatis:** Sistem membentuk kode SKU baku (contoh: `FG-PCH-BLD-75G`) dan secara otomatis menyematkan tag komposisi resep standar `[BOM: Jamur 71g, Bumbu 4g]`.
4. Klik **Generate Semua Varian**: Seluruh kombinasi produk tersimpan secara instan ke dalam database master.

---

> 📷 **[ TEMPATKAN SCREENSHOT Gambar 4.3: JENDELA MODAL GENERATOR VARIAN PRODUK MASSAL DI SINI ]**
> - **Rute Menu:** `/master/products` -> Tombol 'Generator Varian Otomatis'
> - **Petunjuk Gambar:** Ambil screenshot modal BatchProductGeneratorModal saat menampilkan pilihan Tipe Kemasan, Pilihan Rasa, Ukuran Gramasi, tabel Pratinjau Kombinasi (SKU `FG-PCH-BLD-75G` dan tag `[BOM: Jamur 71g, Bumbu 4g]`), serta tombol 'Generate Semua Varian'.
> - **Bagian yang Disorot:** Tabel pratinjau kombinasi SKU otomatis, tag BOM, dan tombol aksi simpan massal.

*Gambar 4.3 — Jendela Modal Generator Varian Produk Massal (BatchProductGeneratorModal)*

---

### **4.3. Standar Produksi & Resep Penggorengan Curah (`/master/production-standards`)**

Menetapkan acuan teknis pabrik pada dua tab pertama:
1. **Tab 1: Standar Penggorengan & Resep Curah (FRYING):**
   - **Target Rendemen (Yield Target):** Target efisiensi jamur matang berbalut tepung terhadap jamur tiram segar:
     - Target Rendemen Minimum (*Min Yield*): **80.0%**
     - Ambang Peringatan Rendemen (*Warning Yield*): **75.0%**
     - Target Rendemen Maksimum (*Max Yield*): **85.0%**
   - **Resep Dasar Penggorengan Jamur Polos (Frying BOM Ratio):**
     - Rasio Jamur Tiram Segar Input: **1.0 (100%)**
     - Rasio Tepung Premix: **0.25 (25% dari bobot jamur segar)**
     - Rasio Minyak Goreng Terpakai/Terserap: **0.30 (30% dari bobot jamur segar)**
   - **Parameter Penggorengan:**
     - Suhu Minyak Operasional: **160°C – 180°C**
     - Standar Durasi Penggorengan: **15 menit** per wajan
     - Standar Durasi Penirisan Mesin Spinner: **5 menit**
     - Bobot Jamur Segar per Batch Wajan: **800 gram (0,8 kg)**
     - Rating Factor Operator: **1.0**
     - Faktor Kelonggaran (*Allowance*): **15% (0.15)**
2. **Tab 2: Standar Mesin & Kapasitas (MACHINERY):**
   - Kapasitas wajan aktif, kapasitas mesin spinner, dan parameter utilisasi mesin.

---

> 📷 **[ TEMPATKAN SCREENSHOT Gambar 4.4: HALAMAN STANDAR PRODUKSI & RESEP PENGGORENGAN CURAH DI SINI ]**
> - **Rute Menu:** `/master/production-standards` (Tab FRYING)
> - **Petunjuk Gambar:** Ambil screenshot halaman Standar Produksi yang menampilkan parameter Resep Penggorengan Curah (Rasio Premix 25%, Rasio Minyak 30%, Suhu Minyak 160-180°C, Durasi Goreng 15m, Durasi Spinner 5m) dan target rendemen (80%).
> - **Bagian yang Disorot:** Kotak input rasio resep dasar, parameter suhu/durasi, dan tombol 'Simpan Standar Produksi'.

*Gambar 4.4 — Halaman Standar Produksi & Resep Penggorengan Curah*

---

### **4.4. Standar Kemasan BOM Level 3: Jamur Matang vs Bumbu Tabur**

Rute: `/master/production-standards` -> **Tab Standar Kemasan (BOM Level 3)**

Modul ini adalah mesin utama penjamin akurasi gramasi kemasan KhumKhum ERP:
$$\text{Netto Kemasan} = \text{Bobot Jamur Crispy Matang (g)} + \text{Bobot Bumbu Tabur (g)}$$

#### **Tabel Standar Komposisi BOM Level 3 Resmi Pabrik**

| Ukuran Kemasan (Netto) | Bumbu Tabur Berperisa | Jamur Matang Bersih | Varian Original (Polos) | Keterangan Standar |
|---|---|---|---|---|
| **30 gram** | 2,0 gram | 28,0 gram | 0g Bumbu + 30g Jamur | Kemasan Sachet / Tester |
| **50 gram** | 3,0 gram | 47,0 gram | 0g Bumbu + 50g Jamur | Standing Pouch Kecil |
| **60 gram** | 3,5 gram | 56,5 gram | 0g Bumbu + 60g Jamur | Toples Tabung Mini |
| **75 gram** | **4,0 gram** | **71,0 gram** | 0g Bumbu + 75g Jamur | **Standar Utama Pouch KhumKhum** |
| **100 gram** | 5,0 gram | 95,0 gram | 0g Bumbu + 100g Jamur | Standing Pouch Medium |
| **150 gram** | 8,0 gram | 142,0 gram | 0g Bumbu + 150g Jamur | Toples Tabung Besar |
| **250 gram** | 13,0 gram | 237,0 gram | 0g Bumbu + 250g Jamur | Pouch Jumbo / Family Pack |
| **500 gram** | 25,0 gram | 475,0 gram | 0g Bumbu + 500g Jamur | Kemasan Curah Reseller |

> **Aturan Khusus Varian Original:**  
> Untuk varian rasa *Original / Polos*, sistem secara otomatis menetapkan gramasi bumbu tabur = **0 gram**. Bobot jamur matang terisi penuh 100% sebesar netto kemasan (misal 75g Original = 75g jamur matang polos).

---

> 📷 **[ TEMPATKAN SCREENSHOT Gambar 4.5: TAB STANDAR KEMASAN (BOM LEVEL 3) DI SINI ]**
> - **Rute Menu:** `/master/production-standards` -> Tab 'Standar Kemasan (BOM Level 3)'
> - **Petunjuk Gambar:** Ambil screenshot tabel Standar Kemasan yang menampilkan ukuran 30g s/d 500g, kolom gramasi Bumbu Tabur, kolom Jamur Matang, dan tombol 'Simpan Standar Kemasan'.
> - **Bagian yang Disorot:** Baris ukuran 75 gram (Bumbu 4.0g, Jamur 71.0g) dan tombol simpan.

*Gambar 4.5 — Tab Standar Kemasan (BOM Level 3) & Tabel Komposisi Jamur Matang vs Bumbu*

---

## **BAB V**
## **5. MODUL PENERIMAAN BAHAN BAKU (RECEIVING)**

Menu: **Inbound (Penerimaan)** (`/receiving`) | Pelaksana: Petugas Gudang & Penerimaan

Mencatat penerimaan kiriman jamur tiram segar dari petani mitra ke pabrik dengan akurasi timbangan bersih dan konfirmasi otomatis ke nomor WhatsApp petani.

### **Alur Langkah Kerja Operasional**

1. Klik tombol **+ Catat Penerimaan Jamur**.
2. **Pilih Petani Mitra:** Pilih kelompok tani atau nama petani penyetor dari daftar dropdown.
3. **Timbang Berat Kotor (Gross Weight):** Masukkan angka timbangan total jamur beserta keranjang penyetor dalam satuan kilogram (Kg).
4. **Masukkan Potongan Keranjang / Tara (Tare Weight):** Masukkan total berat keranjang/wadah kosong yang dipakai. Sistem secara otomatis menghitung **Berat Bersih (Net Weight)**:
   $$\text{Berat Bersih (Kg)} = \text{Berat Kotor (Kg)} - \text{Potongan Tara (Kg)}$$
5. **Pemeriksaan Kondisi Fisik Awal:** Catat kondisi kesegaran, kadar kebasahan awal, dan kebersihan fisik jamur.
6. **Harga Kesepakatan (Opsional):** Masukkan harga beli per kg sesuai kontrak harian.
7. **Klik Simpan Penerimaan:**
   - Sistem menerbitkan Nomor Batch Penerimaan unik (contoh: `RCV-20261102-001`).
   - Data batch otomatis masuk ke antrean **Menunggu Sortasi**.
   - Sistem menyediakan tombol hijau **Kirim Nota WhatsApp**: Mengirimkan pesan format resmi ke nomor WA petani berisi nomor batch, tanggal, nama petani, berat kotor, tara, dan berat bersih timbang yang sah.

---

> 📷 **[ TEMPATKAN SCREENSHOT Gambar 5.1: FORMULIR CATAT PENERIMAAN JAMUR SEGAR DARI PETANI MITRA DI SINI ]**
> - **Rute Menu:** `/receiving` -> Tombol '+ Catat Penerimaan Jamur'
> - **Petunjuk Gambar:** Ambil screenshot formulir input penerimaan yang menampilkan dropdown Petani Mitra, input Berat Kotor, Potongan Tara, kalkulasi Berat Bersih, kondisi fisik, dan harga per kg.
> - **Bagian yang Disorot:** Kolom kalkulasi Berat Bersih otomatis dan tombol 'Simpan Penerimaan'.

*Gambar 5.1 — Formulir Catat Penerimaan Jamur Segar dari Petani Mitra*

---

> 📷 **[ TEMPATKAN SCREENSHOT Gambar 5.2: BUKTI BATCH PENERIMAAN & TOMBOL KIRIM NOTA WHATSAPP DI SINI ]**
> - **Rute Menu:** `/receiving` -> Detail Batch Penerimaan
> - **Petunjuk Gambar:** Ambil screenshot kartu detail penerimaan tersimpan yang memperlihatkan kode `RCV-20261102-001`, rincian berat timbang, status 'Menunggu Sortasi', dan tombol hijau 'Kirim Nota WhatsApp'.
> - **Bagian yang Disorot:** Nomor Batch RCV dan tombol integrasi 'Kirim Nota WhatsApp'.

*Gambar 5.2 — Bukti Batch Penerimaan (RCV) & Tombol Kirim Nota WhatsApp*

---

## **BAB VI**
## **6. MODUL SORTASI & GRADING MUTU JAMUR**

Menu: **Sortasi & Grading** (`/sorting`) | Pelaksana: Petugas Sortasi

Petugas memilah jamur segar hasil penerimaan untuk memisahkan jamur kualitas prima dari bagian yang rusak atau kotor.

### **Alur Langkah Kerja Operasional**

1. Buka halaman `/sorting`, pilih batch penerimaan yang berstatus **Menunggu Sortasi**.
2. **Lakukan penimbangan hasil pemilahan jamur:**
   - **Grade A (Jamur Tiram Bersih / Utuh):** Jamur segar mekar sempurna, batang bersih, tidak sobek besar, layak untuk produk jamur crispy premium.
   - **Grade B (Sobek Kecil / Ukuran Sedang):** Jamur segar berukuran kecil atau sedikit sobek, dialokasikan untuk produk olahan turunan/tepung.
   - **Afkir / Waste (Batang Keras & Kotor):** Batang kayu, kotoran media baglog, dan jamur layu/busuk yang harus dibuang.
3. **Kalkulasi Otomatis Efisiensi Sortasi (Rasio Kelayakan):**
   $$\text{Efisiensi Sortasi (\%)} = \frac{\text{Grade A (kg)} + \text{Grade B (kg)}}{\text{Total Berat Bersih Jamur Segar (kg)}} \times 100\%$$
4. **Klik Simpan & Rilis ke Gudang Bahan Baku:**
   - Stok Jamur Tiram Segar (Grade A) otomatis bertambah pada saldo inventori gudang utama (`/warehouse`).
   - Status batch penerimaan diperbarui menjadi **Selesai Sortasi (SORTED)** dan siap digunakan untuk membuat SPK Penggorengan.

---

> 📷 **[ TEMPATKAN SCREENSHOT Gambar 6.1: FORMULIR SORTASI & GRADING MUTU JAMUR DI SINI ]**
> - **Rute Menu:** `/sorting`
> - **Petunjuk Gambar:** Ambil screenshot form sortasi saat memproses batch jamur, memperlihatkan kolom input timbangan Grade A, Grade B, Afkir/Waste, indikator persentase Efisiensi Sortasi, dan tombol 'Simpan & Rilis ke Gudang Bahan Baku'.
> - **Bagian yang Disorot:** Kolom timbangan Grade A, Grade B, persentase efisiensi sortasi, dan tombol simpan rilis.

*Gambar 6.1 — Formulir Sortasi & Grading Mutu Jamur (Grade A, Grade B, Afkir)*

---

## **BAB VII**
## **7. MODUL MANUFAKTUR & PRODUKSI (3 TAHAP TERPADU)**

KhumKhum ERP memisahkan proses manufaktur menjadi tiga stasiun independen yang saling terhubung secara terstruktur (*decoupled two-stage production with buffer*):

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              ALUR INTEGRASI 3 STASIUN MANUFAKTUR KHUMKHUM ERP               │
├─────────────────────────────────────────────────────────────────────────────┤
│ STASIUN LEVEL 1: Peracikan Tepung Premix (/production/premix)               │
│ Bahan Mentah (Terigu, Tapioka, Maizena, Bumbu) ──► Tepung Premix (Gudang)   │
├─────────────────────────────────────────────────────────────────────────────┤
│ STASIUN LEVEL 2: Penggorengan Jamur Curah (/production - Tab FRYING)        │
│ Jamur Segar + Premix (25%) + Minyak (30%) ──► Wadah Longsong (AVAILABLE)    │
├─────────────────────────────────────────────────────────────────────────────┤
│ STASIUN LEVEL 3: Pembumbuan & Packing Retail (/production - Tab PACKING)    │
│ Wadah Longsong + Bumbu Tabur (BOM Level 3) + Pouch/Toples ──► Antrean QC   │
└─────────────────────────────────────────────────────────────────────────────┘
```
*Diagram 7.0 — Alur Integrasi 3 Stasiun Manufaktur KhumKhum ERP Versi 1.1*

---

### **7.1. Stasiun Level 1: Peracikan Tepung Premix (`/production/premix`)**

Menu: **Peracikan Tepung Premix** | Pelaksana: Operator Premix & Bumbu  
Stasiun khusus untuk mencampur bahan mentah (terigu, maizena, tapioka, garam, bumbu dasar) menjadi **Tepung Premix Jamur Crispy Siap Pakai**.

1. Buka menu `/production/premix` dan klik **Formulir Pembuatan Premix**.
2. Pilih jenis resep premix (contoh: *Tepung Premix Jamur Crispy Standard*).
3. Masukkan **Target Berat Output Premix** yang ingin diracik (misal: 25 kg).
4. Sistem secara otomatis menghitung takaran kebutuhan bahan mentah per karung/kg sesuai standar resep. Operator dapat menyesuaikan timbangan riil jika ada kalibrasi lapangan.
5. **Indikator Ketersediaan Stok Mentah:** Di sisi kanan form, sistem menampilkan saldo stok bahan mentah gudang secara *real-time*. Jika ada bahan yang kurang, sistem memberi peringatan merah.
6. **Klik Simpan Produksi Premix:**
   - Bahan mentah (terigu, tapioka, bumbu) otomatis berkurang dari gudang (*Movement OUT*).
   - Saldo Tepung Premix Siap Pakai otomatis bertambah di gudang (*Movement IN*) dan langsung siap diambil oleh stasiun penggorengan.

---

> 📷 **[ TEMPATKAN SCREENSHOT Gambar 7.1: FORMULIR PEMBUATAN TEPUNG PREMIX DI SINI ]**
> - **Rute Menu:** `/production/premix`
> - **Petunjuk Gambar:** Ambil screenshot formulir pembuatan premix yang menampilkan input Target Berat Output (25 kg), komposisi takaran bahan mentah otomatis, panel indikator stok gudang di sisi kanan, dan tombol 'Simpan Produksi Premix'.
> - **Bagian yang Disorot:** Kolom target output, rincian bahan mentah, panel indikator stok, dan tombol simpan.

*Gambar 7.1 — Formulir Pembuatan Tepung Premix & Indikator Stok Bahan Mentah*

---

### **7.2. Stasiun Level 2: Penggorengan Jamur Curah & Wadah Longsong Buffer (`/production` Tab FRYING)**

Menu: **Produksi & Rendemen** -> **Tab Produksi Goreng Jamur** | Pelaksana: Petugas Penggorengan  
Tahap ini mengubah jamur tiram segar menjadi jamur crispy matang polos (curah) yang ditampung dalam **Wadah Longsong Buffer**.

#### **Langkah A: Pembuatan SPK Penggorengan**
1. Klik tombol **Buat SPK Goreng Jamur**.
2. Masukkan **Target Jamur Segar** yang akan digoreng (contoh: 50 kg).
3. Tentukan Tanggal Mulai dan Catatan Shift kerja.
4. **Kalkulasi Estimasi Bahan Pendukung Otomatis:**
   - Kebutuhan Tepung Premix (25%): $50 \times 0.25 = 12.5\text{ kg}$
   - Kebutuhan Minyak Goreng (30%): $50 \times 0.30 = 15.0\text{ liter}$
   - Estimasi Total Siklus Wajan (@800g per batch wajan): $\approx 62\text{ kali goreng}$
5. Klik **Terbitkan SPK**: Status SPK menjadi aktif (*IN_PROGRESS*).

---

> 📷 **[ TEMPATKAN SCREENSHOT Gambar 7.2: MODAL PEMBUATAN SPK GORENG JAMUR DI SINI ]**
> - **Rute Menu:** `/production` (Tab FRYING) -> Tombol 'Buat SPK Goreng Jamur'
> - **Petunjuk Gambar:** Ambil screenshot modal input SPK Goreng yang menampilkan kolom Target Jamur Segar (50 kg) beserta panel kalkulasi estimasi kebutuhan Premix (12,5 kg), Minyak (15 liter), dan estimasi siklus wajan.
> - **Bagian yang Disorot:** Input target jamur segar dan panel kalkulasi kebutuhan bahan pendukung.

*Gambar 7.2 — Modal Pembuatan SPK Goreng Jamur & Kalkulasi Estimasi Bahan Pendukung*

---

#### **Langkah B: Pelaksanaan Batch Wajan, Timer & Fitur Rekap Langsung**
1. Buka SPK Goreng yang aktif. Sistem menyediakan dua metode pencatatan:
   - **Metode A — Studi Waktu Kerja (Time Study Stopwatch):**  
     Pilih nomor wajan (Wajan 1 / 2 / 3), klik **Mulai Wajan** saat jamur masuk ke minyak panas (160°C – 180°C). Timer berjalan secara *live*. Saat jamur diangkat (maksimal 30 menit), tekan **Selesai Wajan** dan input timbangan jamur matang batch tersebut.
   - **Metode B — Fitur Rekap Langsung (Akumulatif Cepat):**  
     Jika penggorengan berjalan paralel tanpa timer per wajan, operator dapat memilih mode **Rekap Langsung** untuk menginput total jamur matang output secara akumulatif sekaligus.

---

> 📷 **[ TEMPATKAN SCREENSHOT Gambar 7.3: LAYAR TIMER BATCH WAJAN & OPSI REKAP LANGSUNG DI SINI ]**
> - **Rute Menu:** `/production` -> Detail SPK Goreng Aktif
> - **Petunjuk Gambar:** Ambil screenshot tampilan eksekusi penggorengan yang memperlihatkan tombol stopwatch 'Mulai Wajan' / 'Selesai', pilihan Wajan 1/2/3, input berat matang per batch, serta tombol opsi mode 'Rekap Langsung'.
> - **Bagian yang Disorot:** Stopwatch timer wajan dan tombol opsi Rekap Langsung.

*Gambar 7.3 — Layar Timer Batch Wajan (Time Study) & Opsi Fitur 'Rekap Langsung'*

---

#### **Langkah C: Penyimpanan ke Wadah Longsong Buffer**
1. Setelah jamur matang ditiriskan melalui mesin spinner (5 menit), jamur dipindahkan ke wadah penampung bersih (*Wadah Longsong*).
2. Klik tombol **Simpan Hasil ke Wadah Longsong**.
3. Masukkan Nomor Wadah / Label (contoh: `Longsong #01`, `Longsong #02`).
4. Masukkan **Berat Bersih Jamur Matang (Kg)** (misal: 8,5 kg).
5. Klik **Simpan Wadah Longsong**:
   - Wadah longsong tersimpan dengan status **AVAILABLE** di area buffer gudang antara.
   - Sisa bobot jamur matang siap dikonsumsi secara fleksibel oleh tim packing kapan saja.

---

> 📷 **[ TEMPATKAN SCREENSHOT Gambar 7.4: FORMULIR SIMPAN HASIL KE WADAH LONGSONG BUFFER DI SINI ]**
> - **Rute Menu:** `/production` -> Panel Wadah Longsong Buffer
> - **Petunjuk Gambar:** Ambil screenshot modal penyimpanan wadah longsong (Label Longsong #01, 8.5 kg) beserta tabel daftar wadah buffer dengan status AVAILABLE.
> - **Bagian yang Disorot:** Nomor label wadah, berat bersih jamur matang, dan badge status AVAILABLE.

*Gambar 7.4 — Formulir Simpan Hasil ke Wadah Longsong Buffer & Daftar Status AVAILABLE*

---

### **7.3. Stasiun Level 3: Pembumbuan & Pengemasan Retail (`/production` Tab PACKING)**

Menu: **Produksi & Rendemen** -> **Tab Produksi Packing Rasa** | Pelaksana: Petugas Packing & Kemasan  
Tahap ini mengambil jamur matang dari wadah longsong buffer, menimbang takaran bumbu rasa sesuai standar BOM Level 3, memasukkan ke kemasan retail (standing pouch / toples), dan menyegelnya.

#### **Alur Langkah Kerja Operasional**

1. Klik tombol **Buat SPK Packing Rasa** atau **+ Buat Hasil Packing Baru**.
2. **Pilih Wadah Longsong Sumber:** Pilih wadah longsong yang berstatus `AVAILABLE` atau `PARTIAL` (misal: *Wadah Longsong #01 — Sisa 8,5 kg*).
3. **Pilih Varian Rasa:** Pilih varian pesanan (*Balado*, *Barbeque*, *Pedas Manis*, *Super Pedas*, atau *Original*).
4. **Pilih Kemasan & Gramasi:**  
   Pilih jenis kemasan (*Standing Pouch* / *Toples*) dan ukuran gramasi (misal: *75g*).
5. Masukkan **Jumlah Kemasan Selesai (Pcs)** (contoh: 50 pcs).
6. Masukkan **Jumlah Kemasan Rusak / Defect (Pcs)** jika ada plastik/toples yang rusak/bocor segelnya saat proses packing (misal: 2 pcs).
7. **Perhitungan Otomatis Resep BOM Level 3 & Auto-Deduct:**  
   Sistem secara otomatis menghitung:
   - **Pemotongan Jamur Matang Longsong:**  
     $$50\text{ pcs} \times 71\text{ gram} = 3.550\text{ gram (3,55 kg)}$$  
     dipotong dari saldo Wadah Longsong #01.
   - **Pemotongan Bumbu Tabur Gudang:**  
     $$50\text{ pcs} \times 4\text{ gram} = 200\text{ gram Bumbu Balado}$$  
     dipotong langsung dari saldo gudang bahan baku.
   - **Pemotongan Fisik Kemasan Gudang:**  
     $$50\text{ pcs (berhasil)} + 2\text{ pcs (rusak)} = 52\text{ pcs Standing Pouch 75g}$$  
     dipotong dari saldo gudang bahan baku.
8. **Validasi Stok Real-Time:**  
   Jika stok bumbu atau stok kemasan di gudang utama tidak mencukupi, sistem menampilkan peringatan merah dan **mengunci tombol simpan** agar saldo gudang tidak menjadi minus.
9. **Klik Simpan Hasil Packing:**  
   - Saldo jamur pada wadah longsong berkurang. Jika sisa = 0 kg, status otomatis berubah menjadi **EMPTY**.
   - Stok bumbu dan kemasan otomatis terpotong di kartu stok gudang.
   - Batch hasil kemasan otomatis terdaftar di **Antrean Quality Control (QC)** untuk pengujian mutu.

---

> 📷 **[ TEMPATKAN SCREENSHOT Gambar 7.5: FORMULIR BUAT HASIL PACKING BARU & KALKULASI BOM LEVEL 3 DI SINI ]**
> - **Rute Menu:** `/production` (Tab PACKING) -> Tombol '+ Buat Hasil Packing Baru'
> - **Petunjuk Gambar:** Ambil screenshot form input packing yang menampilkan pilihan Wadah Longsong Sumber, Varian Rasa, Kemasan & Gramasi (75g), Pcs Berhasil (50), Pcs Defect (2), serta panel rincian otomatis Pengambilan Jamur Matang (3.550g) dan Kebutuhan Bumbu Tabur (200g).
> - **Bagian yang Disorot:** Panel rincian kalkulasi otomatis BOM Level 3 (Jamur vs Bumbu) dan tombol 'Simpan Hasil Packing'.

*Gambar 7.5 — Formulir Buat Hasil Packing Baru & Perhitungan Otomatis Resep BOM Level 3*

---

## **BAB VIII**
## **8. MODUL QUALITY CONTROL (QC) & PELEPASAN PRODUK JADI**

Menu: **Quality Control (QC)** (`/quality-control`) | Pelaksana: Petugas QC / Penjamin Mutu Pangan  
Setiap batch hasil pengemasan wajib diinspeksi secara organoleptik sebelum produk diizinkan beredar ke pasaran.

### **Alur Langkah Kerja Operasional**

1. Buka menu `/quality-control`, buka daftar antrean **Menunggu QC**.
2. Pilih batch kemasan yang diserahkan oleh tim packing, ambil sampel acak (*random sampling*).
3. **Lakukan Inspeksi 4 Parameter Uji Mutu Organoleptik:**
   - **Kerenyahan (Crispiness):** Jamur renyah merata, tidak keras, tidak melempem (*passed/failed*).
   - **Keseragaman Rasa & Warna (Flavor & Color):** Bumbu tercampur rata, warna keemasan, tidak gosong atau terlalu pucat.
   - **Kadar Minyak / Penirisan (Oiliness):** Jamur kering tuntas dari spinner, tidak berminyak berlebih di dasar kemasan.
   - **Integritas Segel Kemasan (Packaging Seal):** Sealer rapat, seal aluminium tidak bocor, zipper berfungsi, stiker label lurus, dan masa kedaluwarsa tercetak jelas.
4. **Tentukan Keputusan Mutu QC:**
   - **RELEASED (Lolos):** Produk memenuhi seluruh standar mutu.  
     *Efek Sistem:* Status batch menjadi **COMPLETED**, dan stok produk jadi retail otomatis bertambah di **Gudang Barang Jadi (`/inventory`)** sehingga langsung siap dijual oleh tim Sales.
   - **REWORK (Perbaikan / Uji Ulang):** Produk memiliki cacat minor (misal stiker miring atau segel kurang rapat). Operator QC **wajib mengisi catatan evaluasi/instruksi perbaikan** pada kolom catatan. Batch dikembalikan ke tim packing untuk diperbaiki lalu diuji ulang.
   - **REJECTED (Afkir / Tolak):** Produk mengalami cacat fatal (melempem, bau tengik, gosong). Operator QC **wajib mengisi catatan evaluasi penolakan**. Produk masuk ke laporan kerugian (*Loss Report*) dan dilarang dijual.

---

> 📷 **[ TEMPATKAN SCREENSHOT Gambar 8.1: ANTREAN MENUNGGU QC & FORMULIR INSPEKSI 4 PARAMETER DI SINI ]**
> - **Rute Menu:** `/quality-control`
> - **Petunjuk Gambar:** Ambil screenshot antrean batch yang menunggu uji QC beserta lembar inspeksi 4 parameter (Kerenyahan, Rasa & Warna, Kadar Minyak, Integritas Segel) dan tombol keputusan Lolos (RELEASED), Perbaikan (REWORK), atau Tolak (REJECTED).
> - **Bagian yang Disorot:** 4 parameter uji mutu organoleptik dan ketiga tombol keputusan QC.

*Gambar 8.1 — Daftar Antrean 'Menunggu Uji QC' & Formulir Inspeksi Mutu 4 Parameter*

---

> 📷 **[ TEMPATKAN SCREENSHOT Gambar 8.2: TABEL RIWAYAT HASIL UJI QC BERSTATUS RELEASED DI SINI ]**
> - **Rute Menu:** `/quality-control` -> Tab Riwayat Inspeksi
> - **Petunjuk Gambar:** Ambil screenshot daftar batch yang telah dirilis oleh QC dengan status RELEASED/COMPLETED yang otomatis menambah stok produk siap jual di Gudang Barang Jadi.
> - **Bagian yang Disorot:** Kolom Status Alur Mutu 'RELEASED' dan penambahan stok barang jadi.

*Gambar 8.2 — Tabel Riwayat Hasil Uji QC Berstatus COMPLETED / RELEASED*

---

## **BAB IX**
## **9. MODUL GUDANG & INVENTORI TERPADU (WAREHOUSE & INVENTORY)**

Menu: **Warehouse (Bahan Baku)** (`/warehouse`) & **Inventaris (Produk Jadi)** (`/inventory`) | Pelaksana: Staf Gudang & Logistik

KhumKhum ERP menerapkan arsitektur inventori terpadu (*Unified Inventory Engine*):
- Mengakses `/warehouse` membuka mode **Gudang Bahan Baku** (fokus pada bahan baku, bumbu, kemasan, dan bahan pendukung).
- Mengakses `/inventory` membuka mode **Inventaris Produk Jadi** (fokus pada produk retail jamur crispy yang telah lolos uji QC).

### **9.1. Tampilan Kategori Inventori Terpadu**
Di mode Gudang Bahan Baku, tabel diklasifikasikan ke dalam 4 tab kategori utama:
1. **Bahan Baku Utama (`UTAMA`):** Jamur segar, tepung terigu, tapioka, maizena, minyak goreng.
2. **Bumbu Tabur (`BUMBU`):** Bumbu bubuk per varian rasa (dalam satuan gram/kg).
3. **Bahan Kemasan (`PACKAGING`):** Standing pouch per varian, toples, tutup toples, seal aluminium, kardus (satuan pcs).
4. **Lainnya (`LAINNYA`):** Gas LPG, lakban, plastik wrapping, sarung tangan.

---

> 📷 **[ TEMPATKAN SCREENSHOT Gambar 9.1: TAMPILAN GUDANG BAHAN BAKU DENGAN 4 TAB KATEGORI DI SINI ]**
> - **Rute Menu:** `/warehouse`
> - **Petunjuk Gambar:** Ambil screenshot halaman /warehouse yang menampilkan tab kategori (Bahan Baku Utama, Bumbu Tabur, Bahan Kemasan, Lainnya) beserta indikator badge status stok.
> - **Bagian yang Disorot:** Ke-4 tab kategori dan tombol '+ Penerimaan Bahan Baku'.

*Gambar 9.1 — Tampilan Menu Gudang Bahan Baku dengan 4 Tab Kategori Utama*

---

### **9.2. Penerimaan Material Non-Jamur (Inbound Material)**
Untuk mencatat pembelian tepung karungan, minyak jeriken/drum, bumbu dari suplier, atau plastik kemasan:
1. Buka menu `/warehouse`, klik tombol **+ Penerimaan Bahan Baku**.
2. Pilih nama item bahan/kemasan dari master data.
3. Masukkan jumlah kuantitas yang masuk dan pilih lokasi gudang tujuan.
4. Masukkan nomor surat jalan / faktur suplier dan tanggal kedaluwarsa bahan (*expiry date*).
5. Klik **Simpan Penerimaan**: Saldo stok langsung bertambah dan tercatat di kartu stok dengan tipe mutasi `IN`.

---

> 📷 **[ TEMPATKAN SCREENSHOT Gambar 9.2: MODAL PENERIMAAN MATERIAL NON-JAMUR (INBOUND) DI SINI ]**
> - **Rute Menu:** `/warehouse` -> Tombol '+ Penerimaan Bahan Baku'
> - **Petunjuk Gambar:** Ambil screenshot modal formulir Inbound Material yang memperlihatkan pilihan item bahan/kemasan, kuantitas masuk, gudang tujuan, nomor surat jalan, tanggal kedaluwarsa, dan tombol simpan.
> - **Bagian yang Disorot:** Input item, kuantitas, nomor referensi suplier, dan tombol 'Simpan Penerimaan'.

*Gambar 9.2 — Modal Formulir Penerimaan Material Non-Jamur (Inbound Material)*

---

### **9.3. Kartu Stok (Rekening Koran) & Riwayat Mutasi Lengkap**
Tab **Kartu Stok (Rekening Koran)** mencatat setiap pergerakan fisik barang secara transparan:
- **Tanggal & Waktu Transaksi.**
- **Tipe Mutasi:**
  - `IN`: Penerimaan suplier atau transfer masuk.
  - `OUT`: Konsumsi peracikan premix, penggorengan, packing retail, atau penjualan sales.
  - `ADJUSTMENT`: Koreksi selisih fisik *stock opname*.
  - `TRANSFER`: Mutasi perpindahan antar-lokasi gudang.
- **Kuantitas Pergerakan & Saldo Stok Akhir:**  
  Setiap baris menampilkan perubahan (+/-) dan saldo sisa secara kronologis. Petugas berwenang (Super Admin / Warehouse) dapat melakukan koreksi atau penghapusan mutasi jika terjadi kesalahan pencatatan.

---

> 📷 **[ TEMPATKAN SCREENSHOT Gambar 9.3: TABEL KARTU STOK (REKENING KORAN) & RIWAYAT MUTASI DI SINI ]**
> - **Rute Menu:** `/warehouse` -> Tab 'Kartu Stok (Rekening Koran)'
> - **Petunjuk Gambar:** Ambil screenshot tabel riwayat mutasi yang menampilkan Tanggal/Waktu, Tipe Mutasi (IN/OUT/ADJUSTMENT), Jumlah Pergerakan (+/-), dan Saldo Stok Akhir.
> - **Bagian yang Disorot:** Badge tipe mutasi dan kolom Saldo Stok Akhir.

*Gambar 9.3 — Tabel Kartu Stok & Riwayat Mutasi Barang (IN, OUT, ADJUSTMENT)*

---

### **9.4. Stock Opname & Penyesuaian Selisih Fisik**
Di akhir pekan atau akhir bulan, tim gudang melakukan verifikasi hitung fisik (*Stock Opname*):
1. Buka tab **Stock Opname**.
2. Masukkan angka riil hasil hitung fisik di gudang pada kolom **Fisik Aktual**.
3. Sistem secara otomatis menghitung nilai **Selisih (Varian)**:
   $$\text{Selisih (Varian)} = \text{Fisik Aktual} - \text{Saldo Sistem}$$
4. Masukkan keterangan jika terjadi selisih (misal: kemasan sobek di rak, susut penguapan).
5. Klik **Simpan Stock Opname**: Saldo sistem otomatis terkalibrasi sama persis dengan fisik riil, dan selisih tercatat sebagai transaksi mutasi tipe `ADJUSTMENT`.

---

> 📷 **[ TEMPATKAN SCREENSHOT Gambar 9.4: HALAMAN STOCK OPNAME & PENYESUAIAN SELISIH FISIK DI SINI ]**
> - **Rute Menu:** `/warehouse` -> Tab 'Stock Opname'
> - **Petunjuk Gambar:** Ambil screenshot tab Stock Opname yang memperlihatkan kolom input 'Fisik Aktual', nilai 'Selisih (Varian)' otomatis, kolom Catatan, dan tombol 'Simpan Stock Opname'.
> - **Bagian yang Disorot:** Kolom Fisik Aktual, nilai varian selisih, dan tombol simpan.

*Gambar 9.4 — Halaman Stock Opname & Penyesuaian Selisih Fisik Gudang*

---

## **BAB X**
## **10. MODUL SALES ORDER & PENGIRIMAN**

Menu: **Sales Order & Pengiriman** (`/sales`) | Pelaksana: Staf Penjualan (Sales) & Logistik

### **Alur Langkah Kerja Operasional**

1. Klik tombol **+ Buat Pesanan Penjualan (SO)**.
2. **Pilih Pelanggan / Toko Rekanan:** Pilih nama toko dari daftar rekanan (contoh: *Swalayan Maju Jaya*, *Toko Oleh-Oleh Barokah*) atau masukkan identitas pelanggan baru.
3. **Pilih Produk Retail:** Pilih SKU produk (misal: `FG-PCH-BLD-75G` — *Jamur Crispy Balado Pouch 75g*). Sistem otomatis menampilkan ketersediaan stok fisik di Gudang Barang Jadi.
4. Masukkan **Kuantitas Pesanan (Pcs)** dan Harga Jual satuan yang disepakati.
5. Tentukan Ketentuan Pembayaran (*Tunai*, *Transfer Bank*, atau *Tempo/Kredit*).
6. Klik **Simpan Pesanan**: Pesanan tercatat dengan status awal **PENDING**.
7. **Siklus Alur Status Pesanan (Status Flow):**
   $$\text{PENDING} \longrightarrow \text{PROCESSING} \longrightarrow \text{SHIPPED} \longrightarrow \text{COMPLETED}$$
   - **PROCESSING:** Barang sedang disiapkan/dikemas dalam kardus di gudang.
   - **SHIPPED (Dikirim):** Saat barang diserahkan ke kurir/ekspedisi toko, klik ubah status ke **SHIPPED**.  
     *Efek Sistem:* Saldo produk jadi di Gudang Barang Jadi (`/inventory`) **otomatis terpotong riil** sebesar jumlah pcs yang dikirim.
   - **COMPLETED (Selesai):** Saat pesanan telah diterima oleh pelanggan dan pembayaran lunas.

---

> 📷 **[ TEMPATKAN SCREENSHOT Gambar 10.1: FORMULIR BUAT PESANAN PENJUALAN (SO) DI SINI ]**
> - **Rute Menu:** `/sales` -> Tombol '+ Buat Pesanan Penjualan (SO)'
> - **Petunjuk Gambar:** Ambil screenshot form pembuatan SO yang menampilkan pilihan pelanggan, pemilihan produk retail, indikator ketersediaan stok barang jadi, input kuantitas, harga jual, dan opsi pembayaran.
> - **Bagian yang Disorot:** Pemilihan produk, validasi stok barang jadi, dan tombol 'Simpan Pesanan'.

*Gambar 10.1 — Formulir Buat Pesanan Penjualan (SO) & Validasi Stok Produk Jadi*

---

> 📷 **[ TEMPATKAN SCREENSHOT Gambar 10.2: DAFTAR SALES ORDER & PERUBAHAN STATUS PENGIRIMAN DI SINI ]**
> - **Rute Menu:** `/sales`
> - **Petunjuk Gambar:** Ambil screenshot tabel daftar Sales Order yang memperlihatkan nomor SO, nama pelanggan, badge status PENDING/PROCESSING/SHIPPED/COMPLETED, dan tombol aksi pembaruan status ke 'SHIPPED'.
> - **Bagian yang Disorot:** Badge status pesanan dan tombol pembaruan status ke 'SHIPPED'.

*Gambar 10.2 — Daftar Sales Order & Perubahan Status Pengiriman 'SHIPPED'*

---

## **BAB XI**
## **11. MODUL PPIC & PERENCANAAN KAPASITAS PABRIK**

Menu: **PPIC & Jadwal** (`/ppic`) | Pelaksana: Supervisor PPIC & Kepala Pabrik

Modul PPIC menyelaraskan antara target pesanan penjualan pelanggan dengan kapasitas mesin dan pasokan bahan baku di pabrik:
1. **Kalkulasi Kebutuhan Bahan Baku (MRP — Material Requirement Planning):**  
   Menghitung proyeksi kebutuhan bahan baku (jamur tiram segar, tepung premix, minyak goreng, bumbu tabur, dan kantong pouch) untuk siklus 7 hari hingga 30 hari ke depan berdasarkan antrean Sales Order.
2. **Peringatan Ketahanan Stok:**  
   Jika ketahanan stok produk di bawah batas aman, sistem menampilkan peringatan:  
   *“STOK PRODUK KRITIS! Segera jadwalkan produksi sebesar X kg hari ini agar tidak kehilangan potensi penjualan.”*
3. **Jadwal Beban Kapasitas Wajan Harian:**  
   Menampilkan jadwal kapasitas wajan aktif per hari untuk mencegah *bottleneck* (kelebihan beban) di stasiun penggorengan.
4. **Kalibrasi Data Historis:**  
   Menyediakan formulir pencatatan hasil penggorengan jamur manual untuk menyempurnakan kalkulasi kapasitas riil pabrik.

---

> 📷 **[ TEMPATKAN SCREENSHOT Gambar 11.1: HALAMAN PPIC DENGAN TABEL KALKULASI MRP DI SINI ]**
> - **Rute Menu:** `/ppic`
> - **Petunjuk Gambar:** Ambil screenshot halaman PPIC yang memperlihatkan tabel Kebutuhan Bahan Baku (MRP) estimasi minggu depan, indikator peringatan stok produk kritis, dan panel jadwal beban kapasitas wajan.
> - **Bagian yang Disorot:** Panel tabel MRP dan kartu rekomendasi jadwal restock produksi.

*Gambar 11.1 — Halaman PPIC: Tabel Kalkulasi MRP & Jadwal Kapasitas Wajan*

---

## **BAB XII**
## **12. MODUL AI FORECASTING (PERAMALAN PERMINTAAN HOLT-WINTERS)**

Menu: **AI Forecasting** (`/ai-forecast`) | Pelaksana: Manajemen & Tim Perencana Pengadaan

Memanfaatkan kecerdasan buatan berbasis algoritma **Holt-Winters Exponential Smoothing** (Level, Trend, Seasonal) untuk meramalkan permintaan pasar:
1. **Analisis Tren Musiman (Seasonality):**  
   Mendeteksi lonjakan permintaan berulang pada akhir pekan, awal bulan, musim liburan, atau menjelang hari raya Idulfitri.
2. **Proyeksi Kebutuhan Bahan Mentah 4 Minggu ke Depan:**  
   Menghitung estimasi kebutuhan jamur tiram segar (kg), tepung premix (kg), dan minyak goreng (liter) untuk periode 4 minggu mendatang secara otomatis.
3. **Rekomendasi Rencana Pengadaan (Procurement Plan):**  
   Memberikan rekomendasi jadwal dan tonase pemesanan jamur segar ke kelompok tani mitra sehingga pabrik terhindar dari kondisi kehabisan bahan (*stockout*) maupun penumpukan jamur berlebih (*overstock*) yang rentan busuk.

---

> 📷 **[ TEMPATKAN SCREENSHOT Gambar 12.1: HALAMAN AI FORECASTING & PROYEKSI 4 MINGGU DI SINI ]**
> - **Rute Menu:** `/ai-forecast`
> - **Petunjuk Gambar:** Ambil screenshot halaman AI Forecast yang menampilkan grafik tren musiman Holt-Winters, tabel proyeksi kebutuhan bahan mentah 4 minggu ke depan, dan panel rekomendasi pembelian (Procurement Plan).
> - **Bagian yang Disorot:** Grafik kurva prediksi Holt-Winters dan angka estimasi bahan mentah 4 minggu.

*Gambar 12.1 — Halaman AI Forecasting (Holt-Winters Exponential Smoothing) & Proyeksi 4 Minggu*

---

## **BAB XIII**
## **13. MODUL DASHBOARD EKSEKUTIF, OPERASIONAL & LAPORAN RESMI**

### **13.1. Dashboard Eksekutif & Indikator Kualitas Mutu (`/dashboard`)**

Menyajikan metrik performa strategis pabrik secara visual bagi jajaran pimpinan dan manajemen:
- **Rendemen Rata-Rata (Average Yield %):**  
  Ditampilkan dengan progress bar interaktif dan garis batas acuan target:
  - Target Rendemen Operasional: **$\ge$ 80.0%**
  - Jika rendemen berada di bawah 75%, bar berwarna merah peringatan yang menandakan adanya pemborosan bahan atau proses penggorengan yang belum optimal.
- **Tingkat Produk Cacat (Overall Defect Rate %):**  
  Ditampilkan dengan batas toleransi maksimal **5.0%**. Jika angka cacat melebihi 5%, sistem menandai status *Cacat Melebihi Batas Toleransi*.
- **Total Omzet Penjualan & Serapan Pasokan Bahan Baku:**  
  Menampilkan ringkasan pendapatan kotor penjualan produk retail dan total kilogram jamur segar yang berhasil diserap dari petani mitra.

---

> 📷 **[ TEMPATKAN SCREENSHOT Gambar 13.1: DASHBOARD EKSEKUTIF & PROGRESS BAR INDIKATOR MUTU DI SINI ]**
> - **Rute Menu:** `/dashboard` (Tab Eksekutif)
> - **Petunjuk Gambar:** Ambil screenshot Dashboard Eksekutif yang memperlihatkan progress bar Rendemen Rata-Rata (Yield) dengan garis target 80%, progress bar Defect Rate (toleransi 5%), serta kartu ringkasan Total Omzet Penjualan dan Serapan Jamur Petani.
> - **Bagian yang Disorot:** Progress bar Yield %, progress bar Defect Rate %, dan kartu ringkasan omzet.

*Gambar 13.1 — Dashboard Eksekutif & Progress Bar Indikator Mutu (Yield & Defect)*

---

### **13.2. Dashboard Operasional Harian (Daily Operations) Real-Time**

Tab **Daily Operations** pada menu `/dashboard` dirancang khusus untuk memantau detak kerja fisik harian pabrik secara langsung:
1. **Batch Produksi Aktif:** Memantau SPK yang sedang dikerjakan di stasiun penggorengan, jumlah wajan yang sedang aktif, dan bobot jamur yang diproses.
2. **Antrean Tindakan Cepat (Action Queues):**  
   - Jumlah nota penerimaan yang menunggu disortasi.
   - Jumlah batch hasil packing yang menunggu inspeksi QC.
   - Jumlah Sales Order yang menunggu jadwal pengiriman ke pelanggan.
3. **Ringkasan Total Stok Gudang:** Total akumulatif kilogram bahan baku yang tersedia dan total pcs produk jadi yang siap didistribusikan.
4. **Riwayat Pengiriman Hari Ini:** Daftar pengiriman pesanan yang keluar dari gudang pada hari berjalan.

---

> 📷 **[ TEMPATKAN SCREENSHOT Gambar 13.2: TAB DASHBOARD HARIAN (DAILY OPERATIONS) REAL-TIME DI SINI ]**
> - **Rute Menu:** `/dashboard` -> Tab 'Daily Operations'
> - **Petunjuk Gambar:** Ambil screenshot tab Daily Operations yang memperlihatkan panel Batch Produksi Aktif, Antrean Tindakan Cepat (Action Queues: Sortasi, QC, Kirim), Ringkasan Total Stok Gudang, dan Pengiriman Hari Ini.
> - **Bagian yang Disorot:** Tab Daily Operations, panel Action Queues, dan panel Batch Produksi Aktif.

*Gambar 13.2 — Tab Dashboard Harian (Daily Operations) Real-Time*

---

### **13.3. Enam Jenis Laporan Komprehensif & Ekspor Dokumen (`/reports`)**

Sistem menyediakan **6 jenis laporan resmi pabrik** yang dapat difilter berdasarkan rentang tanggal:
1. **Laporan Penerimaan Bahan Baku (`receiving`):** Riwayat kiriman jamur segar, nama petani, berat kotor, tara, dan berat bersih timbang.
2. **Laporan Sortasi & Grading Jamur (`sorting`):** Rincian hasil pemilahan jamur Grade A, Grade B, persentase waste/afkir, dan efisiensi sortasi.
3. **Laporan Manufaktur & Rendemen Produksi (`production`):** Nomor batch produksi, produk yang dihasilkan, total kg output, dan persentase rendemen (target 80%).
4. **Laporan Pengujian Mutu / QC (`qc`):** Hasil inspeksi 4 parameter mutu, status Lolos/Rework/Reject, nama inspektur, dan catatan evaluasi.
5. **Laporan Mutasi & Saldo Inventori Gudang (`inventory`):** Catatan pergerakan mutasi masuk, keluar, penyesuaian opname, dan saldo akhir gudang.
6. **Laporan Penjualan / Sales Order (`sales`):** Rekapitulasi pesanan penjualan, nama pelanggan/toko, produk terjual, kuantitas pcs, dan status pembayaran/pengiriman.

#### **Tata Cara Ekspor Dokumen Resmi**
- **Unduh Excel (`.xlsx`):** Klik tombol bertanda hijau **Unduh Excel** di kanan atas tabel laporan. File spreadsheet lengkap dengan kalkulasi angka otomatis terunduh ke komputer pengguna.
- **Cetak / Unduh PDF (`.pdf`):** Klik tombol bertanda merah **Cetak PDF**. Dokumen PDF resmi berformat tabel rapi (*autoTable*) lengkap dengan kop dokumen CV Khaira Buana Mandiri langsung siap dicetak atau diarsipkan.

---

> 📷 **[ TEMPATKAN SCREENSHOT Gambar 13.3: HALAMAN LAPORAN KOMPREHENSIF & TOMBOL EKSPOR EXCEL/PDF DI SINI ]**
> - **Rute Menu:** `/reports`
> - **Petunjuk Gambar:** Ambil screenshot halaman Laporan yang menampilkan dropdown 6 kategori laporan resmi, pemilih rentang tanggal, tombol hijau 'Unduh Excel', dan tombol merah 'Cetak PDF' di atas tabel data.
> - **Bagian yang Disorot:** Pilihan kategori laporan, filter tanggal, tombol hijau 'Unduh Excel', dan tombol merah 'Cetak PDF'.

*Gambar 13.3 — Halaman Laporan Komprehensif & Tombol Ekspor 'Unduh Excel' / 'Cetak PDF'*

---

### **13.4. Ketertelusuran Produk (Traceability) & Jejak Audit (Audit Log)**

1. **Pohon Ketertelusuran Penuh (`/traceability`):**  
   Cukup masukkan nomor batch produk jadi (misal dari stiker barcode kemasan), sistem menampilkan diagram pohon riwayat mundur secara menyeluruh:
   $$\text{Toko Pembeli} \leftarrow \text{Tanggal Packing} \leftarrow \text{Wadah Longsong} \leftarrow \text{Wajan Goreng} \leftarrow \text{Batch Sortasi} \leftarrow \text{Petani Mitra Penyetor}$$
2. **Jejak Audit Sistem (`/settings/audit-log`):**  
   Merekam seluruh aktivitas pengguna di dalam sistem (waktu transaksi, ID pengguna, aksi penambahan/pengubahan/penghapusan, serta nilai data lama sebelum diedit vs nilai data baru setelah diedit) untuk menjamin integritas data tanpa celah manipulasi.

---

> 📷 **[ TEMPATKAN SCREENSHOT Gambar 13.4: POHON KETERTELUSURAN & TABEL JEJAK AUDIT DI SINI ]**
> - **Rute Menu:** `/traceability` & `/settings/audit-log`
> - **Petunjuk Gambar:** Ambil screenshot tampilan diagram pohon riwayat mundur batch produk pada menu /traceability serta tabel rekaman perubahan data pada menu /settings/audit-log.
> - **Bagian yang Disorot:** Diagram pohon keterlacakan mundur dan kolom perbandingan nilai data sebelum vs sesudah diedit pada Audit Log.

*Gambar 13.4 — Halaman Pohon Keterlacakan Produk (Traceability) & Tabel Jejak Audit (Audit Log)*

---

## **BAB XIV**
## **14. PANDUAN TROUBLESHOOTING & TANYA JAWAB (FAQ)**

Berikut panduan penanganan kendala teknis dan operasional yang paling sering dihadapi oleh staf:

#### **Q1: Mengapa tombol "Simpan Hasil Packing" terkunci atau muncul peringatan stok bumbu/kemasan kurang?**
**Jawaban:**  
Sistem KhumKhum ERP menerapkan proteksi saldo negatif. Sebelum packing disimpan, sistem menghitung kebutuhan gramasi bumbu tabur dan pcs kemasan berdasar standar BOM Level 3. Jika saldo fisik di gudang bahan baku lebih kecil daripada kebutuhan packing tersebut, tombol simpan otomatis terkunci.  
*Solusi:* Lakukan pencatatan penerimaan barang masuk terlebih dahulu di menu `/warehouse` untuk menambah stok bumbu/kemasan yang habis.

#### **Q2: Mengapa Wadah Longsong tidak muncul pada pilihan saat membuat SPK Packing?**
**Jawaban:**  
Daftar pilihan hanya menampilkan wadah longsong yang berstatus **AVAILABLE** (tersedia penuh) atau **PARTIAL** (masih memiliki sisa jamur matang > 0 kg). Jika wadah longsong sudah habis terpakai (status **EMPTY**), wadah tersebut secara otomatis diarsipkan oleh sistem.  
*Solusi:* Pastikan tim penggorengan telah mencatat hasil penggorengan dan menyimpannya ke wadah longsong baru di tab Produksi Goreng Jamur.

#### **Q3: Bagaimana jika ada toples atau kantong pouch yang sobek/rusak saat proses pembumbuan?**
**Jawaban:**  
Masukkan jumlah kemasan yang rusak pada kolom **Jumlah Kemasan Rusak/Defect (Pcs)** di formulir packing. Sistem akan memotong stok fisik kemasan dari gudang bahan baku dan mencatatnya sebagai barang cacat manufaktur tanpa menambah saldo stok produk jadi.

#### **Q4: Apakah data mutasi stok yang salah diinput dapat dikoreksi atau dihapus?**
**Jawaban:**  
Pengguna dengan hak akses **SUPER_ADMIN** atau **WAREHOUSE** dapat mengklik tombol aksi di baris mutasi kartu stok untuk mengedit kuantitas atau menghapus mutasi yang salah. Sistem akan mengkalibrasi ulang saldo stok akhir secara otomatis.

#### **Q5: Bagaimana cara menangani hasil uji QC yang berstatus REWORK?**
**Jawaban:**  
Batch berstatus REWORK akan kembali ke antrean perbaikan tim packing. Staf packing wajib membaca catatan instruksi perbaikan dari petugas QC (misal: penataan ulang stiker, penutupan ulang segel foil). Setelah diperbaiki, batch diajukan kembali ke petugas QC untuk inspeksi ulang hingga berstatus RELEASED.

---

> 📷 **[ TEMPATKAN SCREENSHOT Gambar 14.1: CONTOH PERINGATAN VALIDASI STOK KURANG SAAT SIMPAN PACKING DI SINI ]**
> - **Rute Menu:** `/production` (Tab PACKING)
> - **Petunjuk Gambar:** Ambil screenshot form packing saat kebutuhan gramasi bumbu atau kemasan melebihi stok gudang sehingga muncul kotak peringatan merah dan tombol 'Simpan Hasil Packing' terkunci.
> - **Bagian yang Disorot:** Kotak peringatan merah validasi stok dan tombol simpan yang dalam keadaan nonaktif (*disabled*).

*Gambar 14.1 — Contoh Peringatan Validasi Stok Bumbu/Kemasan Kurang Saat Simpan Hasil Packing*

---

*Buku Panduan Penggunaan Sistem (User Manual) ini disusun secara resmi oleh Tim IT Pengembang ERP KhumKhum untuk CV Khaira Buana Mandiri.*  
*Dokumen Versi 1.1 ini berlaku penuh sejak November 2026 sebagai Pedoman Operasional Standar Manufaktur Jamur Crispy.*
