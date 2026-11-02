# DOKUMEN USER ACCEPTANCE TESTING (UAT)
## SISTEM ENTERPRISE RESOURCE PLANNING (ERP) KHUMKHUM
**Pabrik Manufaktur Jamur Crispy — CV Khaira Buana Mandiri**

---

### INFORMASI DOKUMEN & PENGUJIAN
- **Nama Sistem:** KhumKhum ERP System
- **Versi Rilis UAT:** Versi 1.0 (Production Release)
- **Lingkungan Pengujian (Environment):** Staging / Production (`https://khumkhum-erp.vercel.app` & Localhost)
- **Database:** Supabase PostgreSQL Cloud
- **Pihak Pertama (Pengembang / Tim IT):** Developer / Project Lead
- **Pihak Kedua (Klien / Pengguna Akhir):** Pemilik Usaha, Kepala Pabrik, Supervisor QC, Staf Gudang CV Khaira Buana Mandiri
- **Periode Pengujian:** November 2026

---

## 1. TUJUAN & RUANG LINGKUP UAT

### 1.1. Tujuan
Dokumen *User Acceptance Testing* (UAT) ini bertujuan untuk memverifikasi dan memastikan bahwa seluruh modul dan alur kerja (*business workflow*) pada KhumKhum ERP telah berfungsi sesuai dengan spesifikasi kebutuhan yang disepakati (*Software Requirements Specification & PRD*), mudah digunakan, akurat dalam pemotongan stok otomatis, dan siap digunakan secara resmi (*Go-Live*).

### 1.2. Kriteria Kelulusan (Acceptance Criteria)
Sistem dinyatakan **Lolos UAT** dan siap dioperasikan apabila:
1. Seluruh fungsi kritikal (*Critical / High Severity*) berstatus **PASS** (Lolos 100%).
2. Tidak terdapat *blocking issue* (sistem tidak crash atau mengalami kegagalan kalkulasi inventori).
3. Catatan perbaikan minor (*Low / Medium*) telah dicatat dan disepakati jadwal penyelesaiannya.
4. Lembar pengesahan (*Sign-Off Sheet*) telah ditandatangani oleh pihak pengembang dan perwakilan klien.

### 1.3. Kategori Status Pengujian
- **PASS:** Fitur berfungsi sempurna sesuai hasil yang diharapkan.
- **PASS WITH NOTES:** Fitur berfungsi, namun ada catatan perbaikan tampilan/kenyamanan minor.
- **FAIL:** Fitur tidak berjalan atau hasil perhitungan tidak sesuai standar pabrik.
- **BLOCKED:** Pengujian tidak dapat dilanjutkan karena kendala teknis atau ketergantungan modul lain.

---

## 2. MATRIKS SKENARIO PENGUJIAN UAT (TEST CASES)

---

### MODUL 1: AUTENTIKASI & KONTROL HAK AKSES (UAT-AUTH)

| Kode Tes | Fitur / Skenario | Langkah Pengujian | Hasil yang Diharapkan (*Expected Result*) | Status (P/F) | Catatan Penguji |
| :---: | :--- | :--- | :--- | :---: | :--- |
| `UAT-AUTH-01` | Login Valid Pengguna | Masukkan username/email dan password yang terdaftar, klik Masuk. | Berhasil login, sesi tersimpan, dan dialihkan ke dashboard sesuai role masing-masing. | [ ] PASS<br>[ ] FAIL | |
| `UAT-AUTH-02` | Validasi Password Salah | Masukkan username benar dengan password yang sengaja disalahkan. | Sistem menolak login dan memunculkan pesan error "Username atau password salah". | [ ] PASS<br>[ ] FAIL | |
| `UAT-AUTH-03` | Pembatasan Hak Akses Role (RBAC) | Login sebagai akun `PRODUCTION`, lalu coba akses halaman `/settings` atau `/sales`. | Akses dibatasi (menu disembunyikan dari sidebar / dialihkan kembali dengan proteksi AuthGuard). | [ ] PASS<br>[ ] FAIL | |
| `UAT-AUTH-04` | Logout Pengguna | Klik menu profil pengguna di Topbar, pilih tombol "Keluar". | Sesi pengguna dihapus dari browser dan halaman langsung kembali ke layar login (`/login`). | [ ] PASS<br>[ ] FAIL | |

---

### MODUL 2: MASTER DATA & STANDAR PABRIK (UAT-MST)

| Kode Tes | Fitur / Skenario | Langkah Pengujian | Hasil yang Diharapkan (*Expected Result*) | Status (P/F) | Catatan Penguji |
| :---: | :--- | :--- | :--- | :---: | :--- |
| `UAT-MST-01` | Tambah / Edit Bahan Baku | Buka Master Bahan Baku, tambahkan item baru dengan nama, kategori, UOM, dan batas ROP. | Data tersimpan di master, muncul di tabel, dan otomatis memiliki slot stok di gudang. | [ ] PASS<br>[ ] FAIL | |
| `UAT-MST-02` | Standar Resep & Rasio Bumbu | Buka Standar Produksi, ubah persentase bumbu rasa (misal Balado 8%, Super Pedas 10%). | Nilai tersimpan dan otomatis menjadi dasar perhitungan kalkulasi packing di modul produksi. | [ ] PASS<br>[ ] FAIL | |
| `UAT-MST-03` | Master Petani Mitra | Tambah data petani baru lengkap dengan nomor WhatsApp dan jenis kemitraan. | Data tersimpan, nomor telepon terformat standar internasional (+62), siap menerima notifikasi. | [ ] PASS<br>[ ] FAIL | |

---

### MODUL 3: PENERIMAAN BAHAN BAKU / RECEIVING (UAT-REC)

| Kode Tes | Fitur / Skenario | Langkah Pengujian | Hasil yang Diharapkan (*Expected Result*) | Status (P/F) | Catatan Penguji |
| :---: | :--- | :--- | :--- | :---: | :--- |
| `UAT-REC-01` | Pencatatan Jamur Masuk | Klik "+ Catat Penerimaan", pilih Petani, input berat kotor (bruto) & tara keranjang. | Berat bersih (netto) terhitung otomatis, nomor batch `RCV-...` terbit, status masuk ke "Menunggu Sortasi". | [ ] PASS<br>[ ] FAIL | |
| `UAT-REC-02` | Generator Nota WhatsApp | Klik tombol "Kirim Nota WhatsApp" pada baris penerimaan yang baru disimpan. | Membuka link konfirmasi pesan WhatsApp siap kirim berisi nama petani, tanggal, dan berat aktual jamur. | [ ] PASS<br>[ ] FAIL | |

---

### MODUL 4: STASIUN SORTASI & GRADING (UAT-SRT)

| Kode Tes | Fitur / Skenario | Langkah Pengujian | Hasil yang Diharapkan (*Expected Result*) | Status (P/F) | Catatan Penguji |
| :---: | :--- | :--- | :--- | :---: | :--- |
| `UAT-SRT-01` | Input Pemilahan Grade A & B | Pilih batch jamur masuk, timbang dan masukkan Grade A (kg), Grade B (kg), dan Afkir/Kotor (kg). | Persentase efisiensi kelayakan mutu terhitung otomatis secara matematis. | [ ] PASS<br>[ ] FAIL | |
| `UAT-SRT-02` | Rilis Jamur Bersih ke Gudang | Klik tombol "Simpan & Rilis ke Gudang Bahan Baku". | Stok Jamur Tiram Segar di gudang bahan baku otomatis bertambah sesuai bobot Grade A yang lolos. | [ ] PASS<br>[ ] FAIL | |

---

### MODUL 5: MANUFAKTUR LEVEL 1 — PERACIKAN TEPUNG PREMIX (UAT-PRD-01)

| Kode Tes | Fitur / Skenario | Langkah Pengujian | Hasil yang Diharapkan (*Expected Result*) | Status (P/F) | Catatan Penguji |
| :---: | :--- | :--- | :--- | :---: | :--- |
| `UAT-PRD-01A`| Kalkulasi Resep Premix | Buka menu `/production/premix`, pilih target premix, isi target output 25 kg. | Komposisi terigu, maizena, tapioka, dan garam otomatis terhitung proporsional sesuai standar. | [ ] PASS<br>[ ] FAIL | |
| `UAT-PRD-01B`| Eksekusi Mixing & Pemotongan Bahan Mentah | Klik tombol "Simpan Produksi Premix". | Stok bahan baku mentah (terigu, maizena) otomatis berkurang di gudang, dan stok Tepung Premix bertambah 25 kg. | [ ] PASS<br>[ ] FAIL | |

---

### MODUL 6: MANUFAKTUR LEVEL 2 — PENGGORENGAN & LONGSONG (UAT-PRD-02)

| Kode Tes | Fitur / Skenario | Langkah Pengujian | Hasil yang Diharapkan (*Expected Result*) | Status (P/F) | Catatan Penguji |
| :---: | :--- | :--- | :--- | :---: | :--- |
| `UAT-PRD-02A`| Pembuatan SPK Goreng | Buat SPK baru di tab "Produksi Goreng Jamur", target 50 kg jamur tiram segar. | Sistem menerbitkan SPK, menampilkan estimasi kebutuhan premix (12.5 kg) & minyak (15 L). | [ ] PASS<br>[ ] FAIL | |
| `UAT-PRD-02B`| Timer Penggorengan Wajan | Klik "Catat Batch Wajan", aktifkan stopwatch penggorengan wajan 1, lalu klik Selesai. | Durasi penggorengan tercatat presisi, data time study tersimpan, peringatan jika > 30 menit. | [ ] PASS<br>[ ] FAIL | |
| `UAT-PRD-02C`| Output Jamur Matang ke Wadah Longsong | Klik "Simpan Wadah Longsong", masukkan Label Wadah #01 dan berat jamur matang 8.5 kg. | Wadah Longsong berstatus `AVAILABLE` dengan bobot 8.5 kg terdaftar di buffer packing. | [ ] PASS<br>[ ] FAIL | |

---

### MODUL 7: MANUFAKTUR LEVEL 3 — PACKING & AUTO-DEDUCT GUDANG (UAT-PRD-03)

| Kode Tes | Fitur / Skenario | Langkah Pengujian | Hasil yang Diharapkan (*Expected Result*) | Status (P/F) | Catatan Penguji |
| :---: | :--- | :--- | :--- | :---: | :--- |
| `UAT-PRD-03A`| Pemilihan Wadah Longsong Sumber | Buka tab "Produksi Packing Rasa", klik "+ Buat Hasil Packing", pilih Wadah Longsong #01. | Sistem menampilkan sisa kapasitas jamur matang riil yang tersedia di wadah tersebut. | [ ] PASS<br>[ ] FAIL | |
| `UAT-PRD-03B`| Auto-Kalkulasi Resep Bumbu Dinamis | Pilih Varian Rasa "Balado", Kemasan "Toples 60g", Jumlah "50 pcs". | Sistem otomatis menghitung kebutuhan bumbu: 50 × 60g × 8% = 240g Bumbu Balado. | [ ] PASS<br>[ ] FAIL | |
| `UAT-PRD-03C`| Validasi Stok Gudang Pencegah Minus | Coba lakukan packing dengan kebutuhan bumbu melebihi saldo stok bumbu di gudang. | Sistem menampilkan alert merah "Stok bumbu di warehouse kurang" dan mengunci tombol simpan. | [ ] PASS<br>[ ] FAIL | |
| `UAT-PRD-03D`| Eksekusi Packing & Pemotongan Multi-Gudang | Masukkan input packing yang valid, klik "Simpan Hasil Packing". | 1. Sisa jamur di wadah longsong berkurang sesuai gramasi.<br>2. Stok Bumbu Balado di gudang utama berkurang 240g.<br>3. Stok kemasan fisik toples berkurang 50 pcs.<br>4. Batch diteruskan ke antrean QC. | [ ] PASS<br>[ ] FAIL | |

---

### MODUL 8: QUALITY CONTROL & PELEPASAN PRODUK JADI (UAT-QC)

| Kode Tes | Fitur / Skenario | Langkah Pengujian | Hasil yang Diharapkan (*Expected Result*) | Status (P/F) | Catatan Penguji |
| :---: | :--- | :--- | :--- | :---: | :--- |
| `UAT-QC-01` | Tampilan Antrean Pengujian | Buka menu `/quality-control` setelah tim packing menyimpan hasil produksi. | Batch hasil packing langsung muncul di daftar antrean "Menunggu Uji QC" secara real-time. | [ ] PASS<br>[ ] FAIL | |
| `UAT-QC-02` | Keputusan QC: Rilis (Approved) | Input hasil uji organoleptik & seal, pilih keputusan "Lolos (RELEASED)", klik Simpan. | Status SPK berubah menjadi `COMPLETED`, dan stok produk retail di Gudang Barang Jadi otomatis bertambah 50 pcs. | [ ] PASS<br>[ ] FAIL | |
| `UAT-QC-03` | Keputusan QC: Rework / Reject | Pilih keputusan "REWORK" dengan alasan seal toples kendor. | Status berubah menjadi REWORK, notifikasi mendesak terkirim ke tim produksi untuk diperbaiki. | [ ] PASS<br>[ ] FAIL | |

---

### MODUL 9: GUDANG & INVENTORI (UAT-WH)

| Kode Tes | Fitur / Skenario | Langkah Pengujian | Hasil yang Diharapkan (*Expected Result*) | Status (P/F) | Catatan Penguji |
| :---: | :--- | :--- | :--- | :---: | :--- |
| `UAT-WH-01` | Penerimaan Barang Non-Jamur | Buka `/warehouse`, klik "+ Terima Barang", pilih Bumbu BBQ 5.000 gram dari suplier. | Stok Bumbu BBQ langsung bertambah 5.000g dan tercatat riwayat mutasi tipe IN. | [ ] PASS<br>[ ] FAIL | |
| `UAT-WH-02` | Transparansi Kartu Mutasi Stok | Buka riwayat mutasi stok pada salah satu bahan yang baru dipakai produksi. | Menampilkan tanggal, jam, kuantitas berkurang (-), referensi SPK, dan saldo akhir riil. | [ ] PASS<br>[ ] FAIL | |
| `UAT-WH-03` | Pelaksanaan Stock Opname | Buka tab Stock Opname, masukkan angka fisik riil, simpan penyesuaian opname. | Saldo sistem otomatis terkalibrasi menjadi sama dengan fisik dan selisih tercatat di laporan selisih. | [ ] PASS<br>[ ] FAIL | |

---

### MODUL 10: SISTEM NOTIFIKASI OPERASIONAL REAL-TIME (UAT-NOTIF)

| Kode Tes | Fitur / Skenario | Langkah Pengujian | Hasil yang Diharapkan (*Expected Result*) | Status (P/F) | Catatan Penguji |
| :---: | :--- | :--- | :--- | :---: | :--- |
| `UAT-NOTIF-01`| Deteksi Stok Habis (Out of Stock) | Buka topbar saat ada stok barang bernilai 0 di gudang. | Muncul badge lonceng, kartu notifikasi merah (*Danger: Stok Habis*), dan link 1-klik menuju gudang. | [ ] PASS<br>[ ] FAIL | |
| `UAT-NOTIF-02`| Deteksi Stok Menipis (Batas ROP) | Periksa item yang jumlah stoknya berada di bawah batas Reorder Point. | Muncul notifikasi kuning (*Warning: Stok Menipis*) dengan rekomendasi jumlah restock. | [ ] PASS<br>[ ] FAIL | |
| `UAT-NOTIF-03`| Tandai Notifikasi Dibaca | Klik tombol "Tandai dibaca" di jendela popover lonceng. | Indikator titik unread hilang dan angka counter unread di lonceng otomatis berkurang. | [ ] PASS<br>[ ] FAIL | |

---

### MODUL 11: SALES ORDER & PENGIRIMAN (UAT-SLS)

| Kode Tes | Fitur / Skenario | Langkah Pengujian | Hasil yang Diharapkan (*Expected Result*) | Status (P/F) | Catatan Penguji |
| :---: | :--- | :--- | :--- | :---: | :--- |
| `UAT-SLS-01` | Input Sales Order (SO) Baru | Buat pesanan penjualan untuk Swalayan, pilih produk Balado 60g sebanyak 30 pcs. | Pesanan tersimpan, total nilai rupiah terhitung otomatis, status pesanan menjadi "PENDING / PLANNED". | [ ] PASS<br>[ ] FAIL | |
| `UAT-SLS-02` | Pengiriman & Potong Barang Jadi | Ubah status pesanan menjadi "DIKIRIM (SHIPPED)". | Stok barang jadi di gudang barang jadi otomatis terpotong 30 pcs (*Movement OUT*). | [ ] PASS<br>[ ] FAIL | |

---

### MODUL 12: DASHBOARD MANAJEMEN & AUDIT TRAIL (UAT-MGT)

| Kode Tes | Fitur / Skenario | Langkah Pengujian | Hasil yang Diharapkan (*Expected Result*) | Status (P/F) | Catatan Penguji |
| :---: | :--- | :--- | :--- | :---: | :--- |
| `UAT-MGT-01` | Akurasi KPI Rendemen (Yield) | Cek angka Rendemen Dapur pada Dashboard Eksekutif setelah proses produksi. | Menghitung persentase riil (Jamur Matang / Jamur Segar) secara dinamis tanpa data statis palsu. | [ ] PASS<br>[ ] FAIL | |
| `UAT-MGT-02` | Widget Alert Stok Dashboard | Buka tab Daily Operations di Dashboard utama. | Kartu Alert Stok Gudang menampilkan item yang habis/menipis secara sinkron dengan gudang. | [ ] PASS<br>[ ] FAIL | |
| `UAT-MGT-03` | Verifikasi Audit Trail | Buka menu Audit Log setelah melakukan transaksi edit atau hapus. | Tercatat detail waktu, nama user pelaksana, aksi yang dilakukan, dan nilai data sebelum/sesudah. | [ ] PASS<br>[ ] FAIL | |

---

## 3. LOG TEMUAN & PERBAIKAN (DEFECT / ISSUE TRACKING LOG)

Gunakan tabel ini untuk mencatat temuan bug atau masukan selama proses pengujian UAT berlangsung:

| No | Kode Kasus UAT | Deskripsi Temuan / Kendala | Tingkat Urgensi (High/Med/Low) | Rencana Tindak Lanjut | Status (Open / In Progress / Closed) |
| :-: | :--- | :--- | :---: | :--- | :---: |
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |
| 4 | | | | | |
| 5 | | | | | |

---

## 4. LEMBAR PENGESAHAN HASIL UAT (ACCEPTANCE SIGN-OFF SHEET)

Berdasarkan hasil pengujian yang telah dilaksanakan bersama antara pihak pengembang dan perwakilan pengguna/klien:

### Pernyataan Persetujuan:
> *"Dengan ini menyatakan bahwa Sistem KhumKhum ERP Versi 1.0 telah diuji secara langsung melalui skenario UAT di atas, seluruh fungsi utama dan integrasi resep otomatis berjalan dengan baik dan memenuhi kebutuhan operasional CV Khaira Buana Mandiri. Sistem dinyatakan **DITERIMA** untuk memasuki fase persiapan rilis operasional penuh (Go-Live)."*

Ditandatangani pada tanggal: `........................................... 2026`

<br><br>

| **Pihak Pertama (Pengembang Sistem)** | **Pihak Kedua (Klien / Pemilik Usaha)** |
| :---: | :---: |
| <br><br><br><br>_________________________________________<br>**Tim IT & Pengembang ERP** | <br><br><br><br>_________________________________________<br>**CV Khaira Buana Mandiri (KhumKhum)** |
| Jabatan: *Lead Developer / Project Manager* | Jabatan: *Direktur / Pemilik Usaha* |

<br>

| **Perwakilan Tim Produksi Pabrik** | **Perwakilan Tim Gudang & Logistik** |
| :---: | :---: |
| <br><br><br><br>_________________________________________<br>Nama: | <br><br><br><br>_________________________________________<br>Nama: |
| Jabatan: *Kepala Lini Produksi / QC* | Jabatan: *Supervisor Gudang & Inventori* |

---
*Dokumen ini merupakan arsip resmi serah terima pengujian sistem (UAT) KhumKhum ERP.*
