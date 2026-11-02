# BUKU PANDUAN PENGGUNAAN SISTEM (USER MANUAL)
## KHUMKHUM ERP — ENTERPRISE RESOURCE PLANNING MANUFAKTUR JAMUR CRISPY
**CV Khaira Buana Mandiri**  
*Versi Sistem: 1.0 (Produksi) | Tanggal Rilis: November 2026*

---

## DAFTAR ISI
1. [PENDAHULUAN & PRINSIP SISTEM](#1-pendahuluan--prinsip-sistem)
2. [HAK AKSES PENGGUNA (ROLE-BASED ACCESS CONTROL)](#2-hak-akses-pengguna-role-based-access-control)
3. [ANTARMUKA PENGGUNA, NAVIGASI & SISTEM NOTIFIKASI](#3-antarmuka-pengguna-navigasi--sistem-notifikasi)
4. [MODUL MASTER DATA & STANDAR PABRIK](#4-modul-master-data--standar-pabrik)
5. [MODUL PENERIMAAN BAHAN BAKU (RECEIVING)](#5-modul-penerimaan-bahan-baku-receiving)
6. [MODUL SORTASI & GRADING MUTU JAMUR](#6-modul-sortasi--grading-mutu-jamur)
7. [MODUL MANUFAKTUR & PRODUKSI (3 TAHAP TERPADU)](#7-modul-manufaktur--produksi-3-tahap-terpadu)
   - 7.1 [Stasiun Level 1: Peracikan Tepung Premix](#71-stasiun-level-1-peracikan-tepung-premix)
   - 7.2 [Stasiun Level 2: Penggorengan Jamur Crispy Curah (SPK Frying & Wadah Longsong)](#72-stasiun-level-2-penggorengan-jamur-crispy-curah-spk-frying--wadah-longsong)
   - 7.3 [Stasiun Level 3: Pembumbuan & Pengemasan Retail (SPK Packing & Auto-Deduct Bumbu/Kemasan)](#73-stasiun-level-3-pembumbuan--pengemasan-retail-spk-packing--auto-deduct-bumbukemasan)
8. [MODUL QUALITY CONTROL (QC) & PELEPASAN PRODUK JADI](#8-modul-quality-control-qc--pelepasan-produk-jadi)
9. [MODUL GUDANG & INVENTORI (WAREHOUSE)](#9-modul-gudang--inventori-warehouse)
10. [MODUL SALES ORDER & PENGIRIMAN](#10-modul-sales-order--pengiriman)
11. [MODUL PPIC & PERENCANAAN KAPASITAS](#11-modul-ppic--perencanaan-kapasitas)
12. [MODUL AI FORECASTING (PERAMALAN PERMINTAAN)](#12-modul-ai-forecasting-peramalan-permintaan)
13. [MODUL DASHBOARD EKSEKUTIF, LAPORAN & AUDIT LOG](#13-modul-dashboard-eksekutif-laporan--audit-log)
14. [PANDUAN TROUBLESHOOTING & TANYA JAWAB (FAQ)](#14-panduan-troubleshooting--tanya-jawab-faq)

---

## 1. PENDAHULUAN & PRINSIP SISTEM

KhumKhum ERP dirancang khusus untuk memfasilitasi digitalisasi proses industri pangan olahan jamur crispy secara menyeluruh (*seed-to-shelf*), mulai dari penerimaan bahan mentah dari petani mitra, pengolahan tepung, proses penggorengan higienis, pencatatan waktu baku kerja (*time study*), pengemasan retail dengan formula bumbu presisi, kendali mutu QC, hingga manajemen inventori dan penjualan grosir/retail.

### Prinsip Utama Operasional Sistem:
1. **Zero Data Redundancy (Satu Sumber Kebenaran):** Setiap pemakaian bahan baku otomatis memotong saldo inventori riil tanpa perlu input ganda di buku terpisah.
2. **Keterlacakan Penuh (Traceability):** Setiap bungkus jamur crispy yang terjual dapat dilacak kembali hingga ke nomor wadah longsong, batch penggorengan, tanggal sortasi, dan petani mitra penyetor.
3. **Pemberitahuan Dini (Early Warning Alerts):** Sistem secara otomatis memberi peringatan visual jika ada stok bahan baku/kemasan yang habis (*Out of Stock*) atau mendekati batas aman pemesanan ulang (*Reorder Point / ROP*).

---

## 2. HAK AKSES PENGGUNA (ROLE-BASED ACCESS CONTROL)

Sistem membatasi akses setiap fitur sesuai kewenangan tugas jabatan:

| Role Pengguna | Ruang Lingkup Wewenang Utama | Menu yang Dapat Diakses |
| :--- | :--- | :--- |
| **SUPER_ADMIN** | Pengelolaan penuh seluruh modul, manajemen user, konfigurasi sistem, database, dan pembatalan transaksi khusus. | Seluruh Menu Sistem |
| **MANAGEMENT** | Pemantauan performa bisnis (Read-Only), dashboard eksekutif, analisis KPI (Rendemen Yield, Defect Rate, Omzet), laporan keuangan & traceability. | Dashboard, Laporan, Traceability, AI Forecast, Audit Log |
| **WAREHOUSE** | Pengelolaan stok bahan baku, bumbu, kemasan, dan produk jadi, penerimaan barang non-jamur, mutasi antar-gudang, stock opname bulanan, dan notifikasi ROP. | Warehouse, Inventory, Receiving, PPIC, Traceability |
| **PRODUCTION** | Pelaksanaan SPK Goreng, input timbangan jamur matang ke Wadah Longsong, SPK Packing rasa, dan monitoring status produksi. | Produksi, Peracikan Premix, PPIC, Standar Produksi |
| **PREMIX** | Khusus operator peracikan tepung pelapis krispi di stasiun mixing. | Peracikan Premix, Master Bahan Baku |
| **QC (Quality Control)** | Pengujian organoleptik, uji kadar air, seal kemasan, penerbitan status Lolos (Release), Rework, atau Reject. | Quality Control, Standar QC, Traceability |
| **SORTING** | Penerimaan jamur segar di pos sortasi, pemisahan Grade A, Grade B, dan bobot afkir/susut. | Stasiun Sortasi |
| **SALES** | Pembuatan pesanan penjualan (*Sales Order*), faktur tagihan, status pembayaran, dan pengiriman barang ke toko/distributor. | Penjualan (Sales), Pelanggan (Customers), Laporan Penjualan |

---

## 3. ANTARMUKA PENGGUNA, NAVIGASI & SISTEM NOTIFIKASI

### 3.1. Struktur Layar Utama
- **Sidebar (Menu Kiri):** Berisi navigasi utama yang disesuaikan dengan role yang sedang aktif. Dapat disembunyikan/dibuka kembali dengan tombol toggle di sudut kiri atas.
- **Topbar (Bilah Atas):**
  - **Lonceng Notifikasi Operasional:** Menampilkan pemberitahuan langsung pabrik (Stok Habis, Stok Menipis/ROP, SPK Menunggu Uji QC, dan Hasil Goreng Belum Packing).
  - **Filter Notifikasi:** Tombol tab *Semua* dan *Mendesak* untuk memfilter alert level *danger* dan *warning*.
  - **Profil Pengguna:** Menampilkan nama, jabatan, tombol profil, pengaturan, dan tombol **Keluar (Logout)**.

### 3.2. Membaca & Menggunakan Notifikasi Stok
1. Klik icon **Lonceng** di Topbar.
2. Jika ada bahan baku atau kemasan yang habis, sistem akan menampilkan kartu berwarna merah (*Danger: Stok Habis*).
3. Jika ada stok yang menyentuh batas aman, sistem menampilkan kartu kuning (*Warning: Stok Menipis*).
4. Klik langsung pada kartu notifikasi tersebut untuk dialihkan secara otomatis ke halaman stok gudang terkait untuk membuat PO/restock.
5. Klik **"Tandai dibaca"** jika telah menindaklanjuti peringatan tersebut.

---

## 4. MODUL MASTER DATA & STANDAR PABRIK

Menu: **Master Data** (Akses: Super Admin & Staf Terkait)

### 4.1. Master Bahan Baku (`/master/raw-materials`)
Mencatat seluruh kebutuhan material mentah:
- **Kategori Bahan:**
  - *Bahan Baku Utama:* Jamur Tiram Segar, Terigu, Tepung Tapioka, Beras, Maizena, Minyak Goreng.
  - *Bumbu Tabur:* Bumbu Balado, BBQ, Pedas Manis, Super Pedas, Honeysia, Garam, Bawang Putih Bubuk, Lada.
  - *Bahan Kemasan:* Standing Pouch Balado 60g, 75g, Toples Tabung, Seal Aluminium, Plastik Bantal Curah, Dus Karton.
  - *Lainnya:* Gas LPG, Lakban, Sarung Tangan Sanitasi.
- **Batas Reorder Point (ROP):** Masukkan batas minimal stok (misal: ROP Bumbu Balado = 1.000 gram). Saat stok gudang mencapai atau kurang dari nilai ini, lonceng notifikasi otomatis berbunyi.

### 4.2. Standar Produksi & Resep BOM (`/master/production-standards`)
Mendefinisikan formula baku peracikan dan rasio pemakaian bumbu:
- **Rasio Bumbu Tabur Per Gramasi:**
  - Varian Balado: 8% dari berat kemasan (contoh: toples 60g membutuhkan 4,8g bumbu).
  - Varian Barbeque (BBQ): 8%.
  - Varian Super Pedas: 10%.
  - Varian Pedas Manis: 8%.
  - Varian Original: 0% bumbu tabur (hanya tepung berbumbu saat penggorengan).
- **Rasio Tepung Premix:** 25% dari bobot jamur segar input.
- **Rasio Minyak Goreng:** 30% dari bobot jamur segar input.
- **Standar Rendemen (Yield Target):** Target rasio jamur matang terhadap jamur segar (standar: 35% - 42%).

---

## 5. MODUL PENERIMAAN BAHAN BAKU (RECEIVING)

Menu: **Penerimaan Bahan Baku** (`/receiving`)  
*Pelaksana: Petugas Penerimaan / Gudang*

### Alur Langkah Kerja:
1. Klik tombol **"+ Catat Penerimaan Jamur"**.
2. Pilih **Petani Mitra** penyetor dari daftar dropdown.
3. Masukkan **Berat Kotor Timbang (Gross Weight)** dalam kilogram (Kg).
4. Masukkan **Potongan Keranjang/Tara** (berat wadah kosong) untuk menghasilkan **Berat Bersih (Net Weight)**.
5. Periksa **Kondisi Fisik Awal** (Kadar Air, Kesegaran, Bebas Jamur Busuk).
6. Masukkan **Harga Kesepakatan per Kg** (jika ada ketentuan khusus).
7. Klik **"Simpan Penerimaan"**:
   - Sistem otomatis mencetak/menampilkan nomor Batch Penerimaan (contoh: `RCV-20261102-001`).
   - Sistem menyediakan tombol **"Kirim Nota WhatsApp"** yang otomatis memformat pesan ke nomor HP petani berisi konfirmasi berat bersih timbang.
   - Jamur otomatis masuk ke status *Antrean Pos Sortasi*.

---

## 6. MODUL SORTASI & GRADING MUTU JAMUR

Menu: **Sortasi Jamur** (`/sorting`)  
*Pelaksana: Petugas Sortasi*

Petugas memilah jamur segar hasil penerimaan untuk memisahkan bagian yang layak goreng dan bagian afkir.

### Alur Langkah Kerja:
1. Pilih batch penerimaan yang berstatus *Menunggu Sortasi*.
2. Lakukan penimbangan hasil pemilahan dan masukkan ke formulir:
   - **Grade A (Jamur Tiram Bersih / Utuh):** Bahan baku utama penggorengan jamur crispy kualitas super.
   - **Grade B (Sobek Kecil / Ukuran Sedang):** Dialokasikan untuk produk olahan sekunder/tepung bumbu.
   - **Afkir / Waste (Batang Keras & Kotor):** Bagian yang tidak diproses.
3. Sistem secara otomatis menghitung **Persentase Efisiensi Sortasi (Rasio Kelayakan)**:
   $$\text{Efisiensi Sortasi} = \frac{\text{Grade A} + \text{Grade B}}{\text{Total Bersih}} \times 100\%$$
4. Klik **"Simpan & Rilis ke Gudang Bahan Baku"**:
   - Stok Jamur Tiram Segar (Grade A) otomatis masuk dan bertambah di tabel inventori gudang utama.

---

## 7. MODUL MANUFAKTUR & PRODUKSI (3 TAHAP TERPADU)

KhumKhum ERP membagi proses manufaktur menjadi 3 stasiun independen yang saling terhubung:

```
[STASIUN LEVEL 1] Peracikan Tepung Premix (Bahan Mentah -> Premix Siap Pakai)
       │
[STASIUN LEVEL 2] Penggorengan Jamur Curah (Jamur Segar + Premix + Minyak -> Wadah Longsong Buffer)
       │
[STASIUN LEVEL 3] Pembumbuan & Packing Retail (Longsong + Bumbu Rasa + Kemasan -> Antrean QC)
```

---

### 7.1. Stasiun Level 1: Peracikan Tepung Premix
Menu: **Peracikan Tepung Premix** (`/production/premix`)  
*Pelaksana: Petugas Premix & Bumbu*

Digunakan untuk mencampur bahan baku mentah (Terigu Kunci Biru/Cakra, Tapioka, Maizena, Garam, Bawang Putih Bubuk, dsb) menjadi **Tepung Premix Siap Pakai**.

1. Buka formulir **"Formulir Pembuatan Premix"**.
2. Pilih jenis premix target (contoh: *Tepung Premix Jamur Crispy Standard*).
3. Masukkan **Target Berat Output Premix yang dibuat (Kg)** (misal: 25 kg).
4. Sistem otomatis menampilkan komposisi takaran bahan baku mentah berdasarkan resep standar SOP. Petugas dapat menyesuaikan angka riil di lapangan.
5. Periksa indikator stok gudang di sisi kanan formulir:
   - Jika stok salah satu bahan mentah kurang, sistem akan menampilkan peringatan dan mencegah kesalahan input.
6. Klik **"Simpan Produksi Premix"**:
   - Stok bahan baku mentah (terigu, maizena, bumbu) di gudang otomatis berkurang (*Movement OUT*).
   - Stok Tepung Premix di gudang otomatis bertambah (*Movement IN*) dan siap digunakan di stasiun penggorengan.

---

### 7.2. Stasiun Level 2: Penggorengan Jamur Crispy Curah (SPK Frying & Wadah Longsong)
Menu: **Lini Manufaktur & Produksi -> Tab: Produksi Goreng Jamur** (`/production`)  
*Pelaksana: Petugas Lini Produksi (Goreng)*

Tahap ini mengubah jamur tiram segar menjadi jamur matang renyah polos (tanpa bumbu rasa) yang ditampung dalam wadah penampung (*Longsong*).

#### Langkah A: Pembuatan SPK Penggorengan
1. Klik tombol **"+ Buat SPK Goreng Jamur"**.
2. Masukkan **Target Jamur Segar yang akan digoreng (Kg)** (contoh: 50 kg).
3. Masukkan Tanggal Mulai dan Catatan Shift kerja.
4. Sistem otomatis menampilkan estimasi kebutuhan bahan pendukung (Tepung Premix 25% = 12,5 kg; Minyak Goreng 30% = 15 liter; Estimasi Wajan = ~62 batch @800g).
5. Klik **"Terbitkan SPK"**.

#### Langkah B: Pelaksanaan Batch Wajan & Timer
1. Buka SPK yang aktif, klik **"Catat Batch Penggorengan / Jalankan Timer"**.
2. Pilih nomor wajan (Wajan 1 / Wajan 2 / Wajan 3).
3. Tekan **"Mulai Wajan"** untuk mengaktifkan timer stopwatch penggorengan.
4. Saat jamur matang diangkat dari wajan, tekan **"Selesai"** (durasi maksimal dibatasi hingga 30 menit per batch untuk menjamin mutu).
5. Masukkan timbangan jamur matang hasil penggorengan batch tersebut.

#### Langkah C: Penyimpanan ke Wadah Longsong Buffer
1. Setelah batch goreng selesai dan ditiriskan, klik **"Simpan Hasil ke Wadah Longsong"**.
2. Masukkan nomor/label wadah (misal: `Longsong #01`, `Longsong #02`).
3. Masukkan **Berat Bersih Jamur Matang (Kg)** (misal: 8,5 kg).
4. Klik **"Simpan Wadah Longsong"**:
   - Wadah tersimpan dengan status `AVAILABLE` (Tersedia) di Gudang Antara (Buffer), siap diambil oleh tim packing.

---

### 7.3. Stasiun Level 3: Pembumbuan & Pengemasan Retail (SPK Packing & Auto-Deduct Bumbu/Kemasan)
Menu: **Lini Manufaktur & Produksi -> Tab: Produksi Packing Rasa** (`/production`)  
*Pelaksana: Petugas Packing*

Tahap ini mengambil jamur matang dari wadah longsong, menimbang takaran bumbu rasa, memasukkan ke kemasan retail (toples/standing pouch), dan menyegelnya.

#### Alur Langkah Kerja:
1. Klik tombol **"+ Buat Hasil Packing Baru"**.
2. **Pilih Wadah Longsong Sumber:** Pilih wadah longsong yang masih memiliki sisa jamur matang (misal: *Wadah #01 - Sisa 8.5 kg*).
3. **Pilih Varian Rasa:** Pilih varian rasa pesanan (Balado, Barbeque, Super Pedas, Pedas Manis, atau Original).
4. **Pilih Kemasan & Gramasi:**
   - Jenis Kemasan: *Toples Tabung Plastik*, *Standing Pouch Zipper*, atau *Plastik Bantal*.
   - Bobot Isi Bersih: *60 gram*, *75 gram*, *100 gram*, *200 gram*, dsb.
5. Masukkan **Jumlah Kemasan Selesai Dikemas (Pcs)** (contoh: 50 pcs).
6. Masukkan **Jumlah Kemasan Rusak/Defect (Pcs)** jika ada plastik/toples yang sobek atau segelnya gagal (misal: 2 pcs).
7. **Perhitungan Otomatis Resep Bumbu:**
   - Sistem secara otomatis menghitung takaran standar bumbu tabur:
     $$\text{Kebutuhan Bumbu (g)} = \text{Jumlah Pcs} \times \text{Gramasi Kemasan} \times \text{Rasio Rasa}$$
     *(Contoh: 50 pcs × 60g × 8% = 240 gram Bumbu Balado).*
   - Sistem menampilkan stok bumbu yang tersedia di gudang utama saat ini.
   - Petugas memasukkan timbangan riil bumbu yang dipakai di lapangan.
8. Klik **"Simpan Hasil Packing"**:
   - **Sisa jamur di Wadah Longsong otomatis berkurang** sesuai total gramasi kemasan yang dihasilkan. Jika habis, status wadah berubah menjadi `EMPTY`.
   - **Stok Bumbu Tabur di Gudang Utama otomatis terpotong** sebesar takaran gramasi riil.
   - **Stok Kemasan Fisik otomatis terpotong** sebesar (Pcs Berhasil + Pcs Defect).
   - Batch kemasan otomatis dikirimkan ke **Antrean Quality Control (QC)** untuk uji mutu segel dan rasa.

---

## 8. MODUL QUALITY CONTROL (QC) & PELEPASAN PRODUK JADI

Menu: **Quality Control** (`/quality-control`)  
*Pelaksana: Petugas QC / Penjamin Mutu*

Setiap batch hasil kemasan wajib diperiksa sebelum dapat dijual ke pasar untuk memastikan jamur crispy renyah, bumbu merata, dan kemasan kedap udara.

### Alur Langkah Kerja:
1. Pada antrean **"Menunggu Uji QC"**, pilih batch kemasan yang baru diserahkan oleh tim packing.
2. Ambil sampel produk secara acak (sampling organoleptik) dan isi lembar uji inspeksi:
   - **Uji Kerenyahan (Crispiness):** Tidak melempem, renyah merata.
   - **Keseragaman Rasa & Warna:** Bumbu merata, tidak gosong, tidak terlalu pucat.
   - **Kadar Minyak / Penirisan:** Jamur tidak berminyak berlebihan (*oiliness check*).
   - **Integritas Segel (Packaging Seal):** Sealer rapat, seal aluminium tidak bocor, stiker label rapi & tanggal kedaluwarsa tercetak jelas.
3. Tentukan **Keputusan QC**:
   - **Lolos (RELEASED / APPROVED):** Produk memenuhi syarat SNI/SOP mutu pabrik. Klik rilis.
     - *Efek Sistem:* Status batch menjadi `COMPLETED`, dan stok produk retail siap jual **otomatis bertambah di Gudang Barang Jadi**.
   - **Perbaikan (REWORK):** Batch memerlukan penanganan ulang (misal: seal ulang tutup toples, penggantian stiker). Masukkan instruksi cacat di kolom catatan.
   - **Tolak (REJECTED):** Produk rusak/cacat parah dan tidak dapat dijual. Masuk ke laporan kerugian (*Loss Report*).

---

## 9. MODUL GUDANG & INVENTORI (WAREHOUSE)

Menu: **Gudang Bahan Baku** (`/warehouse`) & **Inventori Produk Jadi** (`/inventory`)  
*Pelaksana: Staf Gudang & Logistik*

### 9.1. Tampilan Kategori Inventori Terpadu
Gudang diklasifikasikan ke dalam 4 tab kategori utama:
1. **Bahan Baku Utama:** Jamur segar, tepung terigu, tapioka, minyak goreng.
2. **Bumbu Tabur:** Bumbu bubuk per varian rasa (dalam satuan gram/kg).
3. **Bahan Kemasan (Packaging):** Standing pouch per varian, toples, tutup, seal foil, kardus (satuan pcs).
4. **Lainnya:** Gas LPG, lakban, plastik wrapping.

### 9.2. Penerimaan Barang Non-Jamur (Inbound Material)
Untuk mencatat pembelian minyak, tepung karungan, bumbu dari suplier, atau karton kemasan:
1. Buka menu `/warehouse`, klik tombol **"+ Terima Barang Masuk"**.
2. Pilih nama item bahan/kemasan dari master data.
3. Masukkan jumlah kuantitas yang masuk dan pilih gudang tujuan.
4. Masukkan nomor faktur suplier / surat jalan dan tanggal kadaluwarsa (jika ada).
5. Klik **"Simpan Inbound"** -> Stok langsung bertambah tercatat di kartu stok.

### 9.3. Kartu Stok & Riwayat Mutasi Lengkap
Setiap pergerakan barang (Masuk, Keluar Produksi, Penyesuaian, Transfer) tercatat secara transparan dengan rincian:
- Tanggal & Waktu transaksi.
- Tipe mutasi: `IN` (Penerimaan), `OUT` (Konsumsi Produksi/Packing/Penjualan), `ADJUSTMENT` (Koreksi Opname).
- Jumlah pergerakan dan **Saldo Stok Akhir** terkini.

### 9.4. Stock Opname & Penyesuaian Selisih Fisik
Di akhir pekan atau akhir bulan, staf gudang melakukan verifikasi fisik (*opname*):
1. Buka tab **"Stock Opname"**.
2. Masukkan angka riil hasil hitung fisik di gudang pada kolom **"Fisik Aktual"**.
3. Sistem secara otomatis menghitung nilai **Selisih (Varian)** dan persentase akurasi inventori.
4. Masukkan keterangan jika terjadi selisih (misal: kemasan bocor saat penyimpanan).
5. Klik **"Simpan Stock Opname"** -> Saldo sistem otomatis terkalibrasi menjadi sama persis dengan fisik riil.

---

## 10. MODUL SALES ORDER & PENGIRIMAN

Menu: **Penjualan (Sales)** (`/sales`)  
*Pelaksana: Staf Sales & Logistik*

### Alur Langkah Kerja:
1. Klik tombol **"+ Buat Pesanan Penjualan (SO)"**.
2. Pilih nama pelanggan/toko rekanan (misal: *Swalayan Maju Jaya*, *Toko Oleh-Oleh Barokah*) atau masukkan pelanggan baru.
3. Pilih produk yang dipesan (misal: *Jamur Crispy Balado Toples 60g*), sistem otomatis memvalidasi apakah stok barang jadi di gudang mencukupi.
4. Masukkan kuantitas pesanan (pcs) dan harga jual yang disepakati.
5. Pilih ketentuan pembayaran (Tunai, Tempo/Kredit, Transfer Bank).
6. Klik **"Simpan Pesanan"**.
7. Saat barang siap dikirim ke ekspedisi/kurir toko:
   - Ubah status pesanan menjadi **"Dikirim (SHIPPED)"**.
   - Sistem otomatis memotong stok barang jadi di gudang barang jadi.

---

## 11. MODUL PPIC & PERENCANAAN KAPASITAS

Menu: **PPIC** (`/ppic`)  
*Pelaksana: PPIC & Kepala Pabrik*

Modul ini menyinkronkan antara target pesanan penjualan dengan kapasitas pabrik:
- Menghitung kalkulasi kebutuhan bahan baku (*Material Requirement Planning / MRP*) untuk 7 atau 30 hari ke depan.
- Menampilkan jadwal kapasitas wajan aktif per hari agar tidak terjadi kelebihan beban (*bottleneck*) di stasiun penggorengan.

---

## 12. MODUL AI FORECASTING (PERAMALAN PERMINTAAN)

Menu: **AI Forecast** (`/ai-forecast`)  
*Pelaksana: Manajemen & Tim Perencana*

Memanfaatkan kecerdasan buatan untuk menganalisis tren data historis penjualan:
- Menampilkan grafik tren aktual versus proyeksi permintaan pasar 3 bulan ke depan.
- Menyarankan estimasi kebutuhan pengadaan jamur tiram segar dari petani mitra agar pabrik tidak mengalami kelangkaan bahan (*stockout*) saat lonjakan pesanan libur panjang/lebaran.

---

## 13. MODUL DASHBOARD EKSEKUTIF, LAPORAN & AUDIT LOG

Menu: **Dashboard** (`/dashboard`), **Laporan** (`/reports`), **Audit Log** (`/settings/audit-log`)  
*Pelaksana: Pemilik Bisnis & Manajemen Eksekutif*

### 13.1. Dashboard Manajemen
Menyajikan ringkasan visual kesehatan operasional pabrik:
- **Rendemen Rata-Rata (Yield %):** Persentase bahan baku yang berhasil menjadi produk matang (indikator efisiensi dapur penggorengan).
- **Tingkat Produk Cacat (Defect Rate %):** Persentase kemasan/jamur rusak selama proses produksi.
- **Total Omzet Penjualan & Pasokan Masuk:** Ringkasan pendapatan kotor dan kilogram jamur masuk.
- **Alert Stok Kritis:** Menampilkan item-item bahan baku yang harus segera dibeli oleh bagian procurement.

### 13.2. Jejak Audit (Audit Log)
Mencatat seluruh aksi kritikal pengguna (waktu, user, aksi, data lama vs data baru) untuk menjamin akuntabilitas dan mencegah manipulasi data.

---

## 14. PANDUAN TROUBLESHOOTING & TANYA JAWAB (FAQ)

#### Q1: Mengapa tombol "Simpan Hasil Packing" tidak bisa diklik / muncul error stok kurang?
> **Jawaban:** Periksa indikator stok bumbu atau kemasan di formulir packing. Jika stok bumbu di gudang utama lebih kecil daripada kebutuhan gramasi yang diinput, sistem akan mengunci penyimpanan demi menjaga keakuratan saldo gudang. Masukkan stok bumbu masuk terlebih dahulu di menu `/warehouse`.

#### Q2: Wadah Longsong tidak muncul di pilihan saat membuat hasil packing?
> **Jawaban:** Pastikan tim penggorengan telah mencatat hasil goreng ke wadah longsong dan status wadah adalah `AVAILABLE` atau `PARTIAL` (sisa berat > 0 kg). Jika wadah sudah habis (`EMPTY`), wadah tidak akan muncul lagi di daftar pilihan.

#### Q3: Bagaimana jika ada kemasan toples yang rusak saat proses pembumbuan?
> **Jawaban:** Masukkan jumlah toples yang rusak pada kolom **"Jumlah Kemasan Rusak/Defect (Pcs)"** di formulir packing. Sistem akan tetap memotong stok fisik toples dari gudang bahan baku dan mencatatnya sebagai barang rusak tanpa menambah stok barang jadi.

#### Q4: Apakah data yang salah diinput di mutasi stok bisa diedit atau dihapus?
> **Jawaban:** Pengguna dengan role `WAREHOUSE` atau `SUPER_ADMIN` dapat mengklik tombol aksi di baris mutasi stok untuk melakukan edit kuantitas atau hapus mutasi. Sistem akan menawarkan opsi kalibrasi ulang saldo stok secara otomatis.

---
*Dokumen panduan ini disusun oleh Tim IT Pengembang ERP KhumKhum. Untuk dukungan teknis lebih lanjut, silakan hubungi Administrator Sistem.*
