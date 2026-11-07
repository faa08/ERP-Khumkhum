# BUKU PANDUAN PENGGUNAAN SISTEM (USER MANUAL)
## KHUMKHUM ERP — ENTERPRISE RESOURCE PLANNING MANUFAKTUR JAMUR CRISPY
**CV Khaira Buana Mandiri**  
*Versi Sistem: 1.1 (Produksi Mutakhir) | Pembaruan: November 2026*

---

## DAFTAR ISI
1. [PENDAHULUAN & PRINSIP SISTEM](#1-pendahuluan--prinsip-sistem)
2. [HAK AKSES PENGGUNA (ROLE-BASED ACCESS CONTROL)](#2-hak-akses-pengguna-role-based-access-control)
3. [ANTARMUKA PENGGUNA, NAVIGASI & SISTEM NOTIFIKASI](#3-antarmuka-pengguna-navigasi--sistem-notifikasi)
4. [MODUL MASTER DATA & STANDAR PABRIK](#4-modul-master-data--standar-pabrik)
   - 4.1 [Master Bahan Baku](#41-master-bahan-baku-masterraw-materials)
   - 4.2 [Master Produk & Generator Varian Produk Massal](#42-master-produk--generator-varian-produk-massal-masterproducts)
   - 4.3 [Standar Produksi & Resep BOM Penggorengan](#43-standar-produksi--resep-bom-penggorengan-masterproduction-standards)
   - 4.4 [Standar Kemasan BOM Level 3 (Komposisi Jamur Matang & Bumbu)](#44-standar-kemasan-bom-level-3-komposisi-jamur-matang--bumbu)
5. [MODUL PENERIMAAN BAHAN BAKU (RECEIVING)](#5-modul-penerimaan-bahan-baku-receiving)
6. [MODUL SORTASI & GRADING MUTU JAMUR](#6-modul-sortasi--grading-mutu-jamur)
7. [MODUL MANUFAKTUR & PRODUKSI (3 TAHAP TERPADU)](#7-modul-manufaktur--produksi-3-tahap-terpadu)
   - 7.1 [Stasiun Level 1: Peracikan Tepung Premix](#71-stasiun-level-1-peracikan-tepung-premix)
   - 7.2 [Stasiun Level 2: Penggorengan Jamur Crispy Curah (SPK Frying & Wadah Longsong Buffer)](#72-stasiun-level-2-penggorengan-jamur-crispy-curah-spk-frying--wadah-longsong-buffer)
   - 7.3 [Stasiun Level 3: Pembumbuan & Pengemasan Retail (SPK Packing, Auto-Deduct Bumbu & Kemasan)](#73-stasiun-level-3-pembumbuan--pengemasan-retail-spk-packing-auto-deduct-bumbu--kemasan)
8. [MODUL QUALITY CONTROL (QC) & PELEPASAN PRODUK JADI](#8-modul-quality-control-qc--pelepasan-produk-jadi)
9. [MODUL GUDANG & INVENTORI (WAREHOUSE)](#9-modul-gudang--inventori-warehouse)
10. [MODUL SALES ORDER & PENGIRIMAN](#10-modul-sales-order--pengiriman)
11. [MODUL PPIC & PERENCANAAN KAPASITAS PRODUKSI](#11-modul-ppic--perencanaan-kapasitas-produksi)
12. [MODUL AI FORECASTING (PERAMALAN PERMINTAAN HOLT-WINTERS)](#12-modul-ai-forecasting-peramalan-permintaan-holt-winters)
13. [MODUL DASHBOARD EKSEKUTIF, OPERASIONAL & LAPORAN RESMI](#13-modul-dashboard-eksekutif-operasional--laporan-resmi)
    - 13.1 [Dashboard Eksekutif & Indikator Kualitas Mutu](#131-dashboard-eksekutif--indikator-kualitas-mutu)
    - 13.2 [Dashboard Harian (Daily Operations) Real-Time](#132-dashboard-harian-daily-operations-real-time)
    - 13.3 [Laporan Komprehensif & Ekspor Dokumen (Excel & PDF)](#133-laporan-komprehensif--ekspor-dokumen-excel--pdf)
    - 13.4 [Keterlacakan Produk (Traceability) & Jejak Audit (Audit Log)](#134-keterlacakan-produk-traceability--jejak-audit-audit-log)
14. [PANDUAN TROUBLESHOOTING & TANYA JAWAB (FAQ)](#14-panduan-troubleshooting--tanya-jawab-faq)

---

## 1. PENDAHULUAN & PRINSIP SISTEM

KhumKhum ERP dirancang khusus untuk memfasilitasi digitalisasi proses industri pangan olahan jamur crispy secara menyeluruh (*seed-to-shelf*), mulai dari penerimaan bahan mentah dari petani mitra, pengolahan tepung, proses penggorengan higienis, pencatatan waktu baku kerja (*time study*), pengemasan retail dengan formula bumbu presisi, kendali mutu QC, hingga manajemen inventori dan penjualan grosir/retail.

### Prinsip Utama Operasional Sistem:
1. **Zero Data Redundancy (Satu Sumber Kebenaran):** Setiap pemakaian bahan baku otomatis memotong saldo inventori riil tanpa perlu input ganda di buku terpisah.
2. **Keterlacakan Penuh (Traceability):** Setiap bungkus jamur crispy yang terjual dapat dilacak kembali hingga ke nomor wadah longsong, batch penggorengan, tanggal sortasi, dan petani mitra penyetor.
3. **Pemberitahuan Dini (Early Warning Alerts):** Sistem secara otomatis memberi peringatan visual jika ada stok bahan baku/kemasan yang habis (*Out of Stock*) atau mendekati batas aman pemesanan ulang (*Reorder Point / ROP*).
4. **BOM Kemasan Tingkat 3 (BOM Level 3 Standard):** Komposisi kemasan dihitung presisi memisahkan bobot jamur matang dan bobot bumbu tabur, sehingga gramasi netto produk selalu konsisten sesuai izin edar BPOM/P-IRT.

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
  - *Bahan Baku Utama:* Jamur Tiram Segar, Terigu Kunci Biru, Cakra Kembar, Tapioka, Beras, Maizena, Minyak Goreng.
  - *Bumbu Tabur:* Bumbu Balado, BBQ, Pedas Manis, Super Pedas, Honeysia, Garam, Bawang Putih Bubuk, Lada.
  - *Bahan Kemasan:* Standing Pouch Balado 60g, 75g, Toples Tabung, Seal Aluminium, Plastik Bantal Curah, Dus Karton.
  - *Lainnya:* Gas LPG, Lakban, Sarung Tangan Sanitasi.
- **Batas Reorder Point (ROP):** Masukkan batas minimal stok (misal: ROP Bumbu Balado = 1.000 gram). Saat stok gudang mencapai atau kurang dari nilai ini, lonceng notifikasi otomatis berbunyi.

---

### 4.2. Master Produk & Generator Varian Produk Massal (`/master/products`)
Mengelola data produk retail yang diproduksi dan dijual oleh KhumKhum.

#### Fitur Tab Filter Varian Rasa:
Tabel produk dilengkapi tab filter instan di bagian atas:
- `Semua Produk`
- `Original`
- `Balado`
- `Barbeque`
- `Pedas Manis`
- `Super Pedas`

#### Fitur Baru: Generator Varian Produk Massal (Batch Generator):
Untuk menghindari input manual satu per satu yang rawan salah ketik, sistem menyediakan tombol **"Generator Varian Otomatis"** (`BatchProductGeneratorModal`):
1. Klik tombol **"Generator Varian Otomatis"** di kanan atas tabel produk.
2. Pilih kombinasi yang ingin di-generate:
   - **Tipe Kemasan:** Standing Pouch, Toples Tabung, atau Plastik Bantal.
   - **Pilihan Rasa:** Original, Balado, Barbeque, Pedas Manis, Super Pedas.
   - **Ukuran Gramasi:** 60g, 75g, 100g, 200g, dll.
   - **Harga Jual Default:** Masukkan harga standar eceran/grosir.
3. Klik **"Pratinjau Kombinasi"**: Sistem akan menampilkan daftar SKU otomatis (misal: `KK-PCH-BLD-075G`) beserta nama baku dan komposisi tag BOM `[BOM: Jamur 71g, Bumbu 4g]`.
4. Klik **"Generate Semua Varian"**: Seluruh produk otomatis tersimpan ke database dan langsung siap digunakan pada modul packing dan penjualan.

---

### 4.3. Standar Produksi & Resep BOM Penggorengan (`/master/production-standards`)
Mendefinisikan formula baku peracikan dan rasio pemakaian bahan di dapur penggorengan:
- **Resep Penggorengan Curah (Frying BOM):**
  - Jamur Segar Input: 1.0 (100%)
  - Rasio Tepung Premix: 0.25 (25% dari bobot jamur segar)
  - Rasio Minyak Goreng: 0.30 (30% dari bobot jamur segar)
  - Standar Suhu Minyak: 160°C - 180°C
  - Durasi Penggorengan: 15 menit per batch wajan
  - Durasi Spinner Penirisan: 5 menit
- **Standar Rendemen (Yield Target):** Target rasio jamur matang terhadap jamur segar (Standar: 80% pada produk akhir, atau rendemen dapur 35% - 42%).

---

### 4.4. Standar Kemasan BOM Level 3 (Komposisi Jamur Matang & Bumbu)
Menu: **Standar Produksi -> Tab: Standar Kemasan (BOM Level 3)**

Modul ini adalah inovasi penting pada KhumKhum ERP Versi 1.1 untuk memisahkan secara akurat antara porsi jamur matang dan porsi bumbu tabur:

$$\mathbf{Netto\ Kemasan} = \mathbf{Jamur\ Crispy\ Matang\ (g)} + \mathbf{Bumbu\ Tabur\ (g)}$$

#### Tabel Standar Komposisi Resmi Pabrik:
| Ukuran Kemasan | Bumbu Tabur Berperisa | Jamur Matang Bersih | Keterangan Standar |
| :---: | :---: | :---: | :--- |
| **30 gram** | 2,0 gram | 28,0 gram | Kemasan Sachet Mini |
| **50 gram** | 3,0 gram | 47,0 gram | Pouch Standar Kecil |
| **60 gram** | 3,5 gram | 56,5 gram | Toples Tabung Mini |
| **75 gram** | **4,0 gram** | **71,0 gram** | **Standar Utama KhumKhum Pouch** |
| **100 gram** | 5,0 gram | 95,0 gram | Pouch Medium |
| **150 gram** | 8,0 gram | 142,0 gram | Toples Tabung Besar |
| **200 gram** | 10,5 gram | 189,5 gram | Pouch Jumbo |
| **250 gram** | 13,0 gram | 237,0 gram | Kemasan Family Pack |
| **500 gram** | 25,0 gram | 475,0 gram | Kemasan Curah Reseller |

> **Aturan Varian Original / Polos:**
> Untuk varian rasa *Original*, sistem secara otomatis mengatur porsi bumbu tabur menjadi **0 gram** (100% jamur matang murni seberat netto kemasan).

Staf supervisor dapat mengubah angka standar ini di tabel BOM Level 3 dan menekan tombol **"Simpan Standar Kemasan"**. Perubahan ini langsung menjadi rumus dasar saat staf packing menimbang bumbu di lapangan.

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
[STASIUN LEVEL 3] Pembumbuan & Packing Retail (Wadah Longsong + Bumbu Rasa + Kemasan -> Antrean QC)
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

### 7.2. Stasiun Level 2: Penggorengan Jamur Crispy Curah (SPK Frying & Wadah Longsong Buffer)
Menu: **Lini Manufaktur & Produksi -> Tab: Produksi Goreng Jamur** (`/production`)  
*Pelaksana: Petugas Lini Produksi (Goreng)*

Tahap ini mengubah jamur tiram segar menjadi jamur matang renyah polos (tanpa bumbu rasa) yang ditampung dalam wadah penampung bersertifikasi (*Wadah Longsong*).

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
6. *Catatan Khusus:* Jika produksi dilakukan secara serentak tanpa timer per wajan, sistem mendukung fitur **"Rekap Langsung"** untuk mencatat total jamur matang output secara akumulatif.

#### Langkah C: Penyimpanan ke Wadah Longsong Buffer
1. Setelah jamur matang selesai ditiriskan lewat mesin spinner, klik **"Simpan Hasil ke Wadah Longsong"**.
2. Masukkan nomor/label wadah (misal: `Longsong #01`, `Longsong #02`).
3. Masukkan **Berat Bersih Jamur Matang (Kg)** (misal: 8,5 kg).
4. Klik **"Simpan Wadah Longsong"**:
   - Wadah tersimpan dengan status `AVAILABLE` (Tersedia) di area buffer gudang antara, siap diproses oleh tim packing.

---

### 7.3. Stasiun Level 3: Pembumbuan & Pengemasan Retail (SPK Packing, Auto-Deduct Bumbu & Kemasan)
Menu: **Lini Manufaktur & Produksi -> Tab: Produksi Packing Rasa** (`/production`)  
*Pelaksana: Petugas Packing*

Tahap ini mengambil jamur matang dari wadah longsong, menimbang takaran bumbu rasa sesuai standar BOM Level 3, memasukkan ke kemasan retail (toples/standing pouch), dan menyegelnya.

#### Alur Langkah Kerja:
1. Klik tombol **"+ Buat Hasil Packing Baru"**.
2. **Pilih Wadah Longsong Sumber:** Pilih wadah longsong yang masih memiliki sisa jamur matang (misal: *Wadah Longsong #01 - Sisa 8.5 kg*).
3. **Pilih Varian Rasa:** Pilih varian rasa pesanan (Balado, Barbeque, Super Pedas, Pedas Manis, atau Original).
4. **Pilih Kemasan & Gramasi:**
   - Jenis Kemasan: *Standing Pouch Zipper*, *Toples Tabung Plastik*, atau *Plastik Bantal*.
   - Bobot Isi Bersih: *60g*, *75g*, *100g*, *200g*, dsb.
5. Masukkan **Jumlah Kemasan Selesai Dikemas (Pcs)** (contoh: 50 pcs).
6. Masukkan **Jumlah Kemasan Rusak/Defect (Pcs)** jika ada plastik/toples yang sobek atau segelnya gagal (misal: 2 pcs).
7. **Perhitungan Otomatis Resep BOM Level 3:**
   - Sistem secara otomatis menghitung:
     - **Pengambilan Jamur Matang:** $50\ \text{pcs} \times 71\text{g} = 3.550\ \text{gram}\ (3,55\ \text{kg})$ dipotong dari Wadah Longsong #01.
     - **Kebutuhan Bumbu Tabur:** $50\ \text{pcs} \times 4\text{g} = 200\ \text{gram}$ Bumbu Balado.
   - Sistem menampilkan stok bumbu dan kemasan yang tersedia di gudang utama secara real-time.
   - Jika stok gudang tidak mencukupi, sistem memberi peringatan merah dan mengunci tombol simpan agar stok tidak minus.
8. Klik **"Simpan Hasil Packing"**:
   - Sisa jamur di Wadah Longsong otomatis berkurang. Jika jamur di wadah tersebut habis, status berubah menjadi `EMPTY`.
   - Stok Bumbu Tabur di gudang utama otomatis berkurang 200g.
   - Stok Kemasan Fisik toples/pouch otomatis berkurang 52 pcs (50 pcs berhasil + 2 pcs defect).
   - Batch kemasan otomatis terdaftar di **Antrean Quality Control (QC)**.

---

## 8. MODUL QUALITY CONTROL (QC) & PELEPASAN PRODUK JADI

Menu: **Quality Control** (`/quality-control`)  
*Pelaksana: Petugas QC / Penjamin Mutu*

Setiap batch hasil kemasan wajib diperiksa sebelum dapat didistribusikan ke swalayan atau konsumen.

### Alur Langkah Kerja:
1. Pada antrean **"Menunggu Uji QC"**, pilih batch kemasan yang baru diserahkan oleh tim packing.
2. Ambil sampel produk secara acak (sampling organoleptik) dan isi formulir inspeksi:
   - **Uji Kerenyahan (Crispiness):** Tidak melempem, renyah merata.
   - **Keseragaman Rasa & Warna:** Bumbu merata, tidak gosong, tidak terlalu pucat.
   - **Kadar Minyak / Penirisan:** Jamur tidak berminyak berlebihan (*oiliness check*).
   - **Integritas Segel (Packaging Seal):** Sealer rapat, seal aluminium tidak bocor, stiker label rapi & tanggal kedaluwarsa tercetak jelas.
3. Tentukan **Keputusan QC**:
   - **Lolos (RELEASED / APPROVED):** Produk memenuhi syarat mutu. Klik rilis.
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
3. Pilih produk yang dipesan (misal: *Jamur Crispy Balado Pouch 75g*), sistem otomatis memvalidasi apakah stok barang jadi di gudang mencukupi.
4. Masukkan kuantitas pesanan (pcs) dan harga jual yang disepakati.
5. Pilih ketentuan pembayaran (Tunai, Tempo/Kredit, Transfer Bank).
6. Klik **"Simpan Pesanan"**.
7. Saat barang siap dikirim ke ekspedisi/kurir toko:
   - Ubah status pesanan menjadi **"Dikirim (SHIPPED)"**.
   - Sistem otomatis memotong stok barang jadi di gudang barang jadi.

---

## 11. MODUL PPIC & PERENCANAAN KAPASITAS PRODUKSI

Menu: **PPIC** (`/ppic`)  
*Pelaksana: PPIC & Kepala Pabrik*

Modul ini menyinkronkan antara target pesanan penjualan dengan kapasitas pabrik:
- Menghitung kalkulasi kebutuhan bahan baku (*Material Requirement Planning / MRP*) untuk 7 atau 30 hari ke depan.
- Menampilkan jadwal kapasitas wajan aktif per hari agar tidak terjadi kelebihan beban (*bottleneck*) di stasiun penggorengan.

---

## 12. MODUL AI FORECASTING (PERAMALAN PERMINTAAN HOLT-WINTERS)

Menu: **AI Forecast** (`/ai-forecast`)  
*Pelaksana: Manajemen & Tim Perencana Pengadaan*

Memanfaatkan kecerdasan buatan berbasis metode peramalan **Holt-Winters Exponential Smoothing**:
- **Analisis Tren Musiman:** Memperhitungkan fluktuasi penjualan mingguan dan musiman (kenaikan tajam saat akhir pekan, hari raya, atau musim liburan).
- **Proyeksi Kebutuhan Bahan Mentah:** Menampilkan perkiraan kebutuhan jamur tiram segar (kg), tepung premix (kg), dan minyak goreng (liter) untuk 4 minggu ke depan.
- **Rekomendasi Pembelian (Procurement Plan):** Memberikan sinyal rekomendasi kapan harus memesan pasokan jamur tambahan ke kelompok tani mitra agar tidak terjadi kekosongan stok (*stockout*).

---

## 13. MODUL DASHBOARD EKSEKUTIF, OPERASIONAL & LAPORAN RESMI

Menu: **Dashboard** (`/dashboard`), **Laporan** (`/reports`), **Traceability** (`/traceability`), **Audit Log** (`/settings/audit-log`)

---

### 13.1. Dashboard Eksekutif & Indikator Kualitas Mutu
Menampilkan indikator strategis performa bisnis perusahaan:
- **Rendemen Rata-Rata (Yield %):** Ditampilkan dengan progress bar interaktif dan garis target ≥80%. Jika rendemen di bawah target, bar berwarna merah peringatan.
- **Tingkat Produk Cacat (Overall Defect Rate %):** Ditampilkan dengan progress bar dan batas toleransi maksimal 5%. Jika defect > 5%, muncul status "Cacat Melebihi Batas".
- **Total Omzet Penjualan & Pasokan Bahan:** Ringkasan pendapatan kotor dan kilogram jamur segar yang diserap dari petani mitra.

---

### 13.2. Dashboard Harian (Daily Operations) Real-Time
Tab **Daily Operations** di Dashboard dirancang khusus untuk memantau detak kerja harian pabrik secara langsung:
1. **Batch Produksi Aktif:** Menampilkan SPK yang sedang berjalan di lantai produksi, jamur input, dan status progresnya.
2. **Antrean Tindakan Cepat (Action Queues):**
   - Jumlah nota penerimaan yang menunggu disortasi.
   - Jumlah batch hasil packing yang menunggu pengujian QC.
   - Jumlah pesanan penjualan yang menunggu jadwal kirim.
3. **Ringkasan Total Stok Gudang:** Menampilkan angka agregat total kilogram bahan baku dan total pcs produk jadi siap jual.
4. **Riwayat Pengiriman Hari Ini:** Daftar surat jalan dan pesanan toko yang keluar pada hari berjalan.

---

### 13.3. Laporan Komprehensif & Ekspor Dokumen (Excel & PDF)
Menu: **Laporan** (`/reports`)

Sistem menyediakan 5 jenis laporan resmi yang dapat difilter berdasarkan rentang tanggal:
1. *Laporan Penerimaan Bahan Baku*
2. *Laporan Sortasi & Grading Jamur*
3. *Laporan Hasil Manufaktur & Rendemen Produksi*
4. *Laporan Pengujian Mutu (QC)*
5. *Laporan Mutasi & Saldo Inventori Gudang*

#### Cara Ekspor Dokumen:
- **Unduh Excel (.xlsx):** Klik tombol bertanda hijau **"Unduh Excel"** di kanan atas tabel. File spreadsheet akan terunduh otomatis lengkap dengan kolom tanggal, nomor batch, dan perhitungan angka.
- **Cetak / Unduh PDF (.pdf):** Klik tombol bertanda merah **"Cetak PDF"**. Sistem akan membuat dokumen PDF resmi berformat tabel rapi (*autoTable*) yang siap dicetak atau diarsipkan.

---

### 13.4. Keterlacakan Produk (Traceability) & Jejak Audit (Audit Log)
- **Traceability (`/traceability`):** Cukup masukkan nomor batch produk jadi (misal dari barcode kemasan), sistem akan menampilkan pohon riwayat mundur: dari toko pembeli, tanggal packing, wadah longsong, wajan goreng, tanggal sortasi, hingga identitas petani penyetor jamurnya.
- **Audit Log (`/settings/audit-log`):** Merekam seluruh aktivitas pengguna (waktu, nama operator, aksi ubah/hapus, serta nilai sebelum dan sesudah diedit) untuk transparansi mutlak.

---

## 14. PANDUAN TROUBLESHOOTING & TANYA JAWAB (FAQ)

#### Q1: Mengapa tombol "Simpan Hasil Packing" tidak bisa diklik / muncul error stok kurang?
> **Jawaban:** Periksa indikator stok bumbu atau kemasan di formulir packing. Jika stok bumbu di gudang utama lebih kecil daripada kebutuhan gramasi yang dihitung sistem, tombol simpan otomatis terkunci demi mencegah saldo gudang minus. Lakukan input penerimaan stok bumbu terlebih dahulu di menu `/warehouse`.

#### Q2: Wadah Longsong tidak muncul di pilihan saat membuat hasil packing?
> **Jawaban:** Pastikan tim penggorengan telah mencatat hasil goreng ke wadah longsong dan status wadah adalah `AVAILABLE` atau `PARTIAL` (sisa berat > 0 kg). Jika wadah sudah habis terpakai (`EMPTY`), wadah otomatis diarsipkan dari daftar pilihan.

#### Q3: Bagaimana jika ada kemasan toples yang rusak saat proses pembumbuan?
> **Jawaban:** Masukkan jumlah toples yang rusak pada kolom **"Jumlah Kemasan Rusak/Defect (Pcs)"** di formulir packing. Sistem akan memotong stok fisik toples dari gudang bahan baku dan mencatatnya sebagai barang cacat tanpa menambah stok produk jadi.

#### Q4: Apakah data yang salah diinput di mutasi stok bisa diedit atau dihapus?
> **Jawaban:** Pengguna dengan role `WAREHOUSE` atau `SUPER_ADMIN` dapat mengklik tombol aksi di baris mutasi stok untuk melakukan edit kuantitas atau hapus mutasi. Sistem akan menawarkan opsi kalibrasi ulang saldo stok secara otomatis.

---
*Buku panduan ini disusun oleh Tim IT Pengembang ERP KhumKhum untuk CV Khaira Buana Mandiri. Dokumen versi 1.1 ini berlaku penuh sejak November 2026.*
