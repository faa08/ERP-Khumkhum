# DOKUMEN REVISI SISTEM — DEVELOPER 2
**Warehouse, Receiving, Sorting, Master Data (Petani & Supplier), Inventory, Sales & Traceability**  
**Sistem ERP KhumKhum Jamur Crispy (CV Khaira Buana Mas)**

---

## 📌 Ringkasan Arahan & Latar Belakang Revisi
Developer 2 memegang pintu gerbang aliran fisik bahan baku masuk dan keluar. Berdasarkan evaluasi lapangan:
1. **Petani Terbagi Menjadi 2 Skala Berbeda:**
   * **Petani Sekitar / Mikro:** Warga sekitar pabrik yang menyetor dalam jumlah kecil (mulai dari **2 ons = 0,2 kg**, 1 kg, hingga 2 kg).
   * **Petani Besar / Mitra Utama:** Sentra budidaya yang menyetor dalam jumlah puluhan kg (**20 kg – 30+ kg** per kirim).
   * **2 Supplier Cadangan (MOU Khusus):** Selain petani sendiri, jika terjadi kelangkaan jamur, KhumKhum membeli dari 2 supplier cadangan dengan kesepakatan MOU harga & termin pembayaran terpisah.
2. **Sistem Pembayaran:** Pembayaran petani mitra diakumulasi dan **dibayarkan sebulan sekali**, sedangkan supplier dibayar sesuai MOU. Dibutuhkan fitur **Rekap Fee Bulanan**.
3. **Pencatatan Masuk Harus Praktis & Nyata:** Hapus tab estimasi forecast petani. Begitu jamur fisik sampai, langsung timbang di form *Receiving*. Wajib mendukung desimal kilogram (`0.2 kg`).
4. **Sortasi & Bahan Baku:** Sortasi fokus memisahkan daun vs batang dengan rekap total harian. Bahan baku non-jamur dicatat di sistem Accurate, namun stok gudang di ERP harus memiliki indikator Reorder Point (ROP), Lead Time, serta gudang produk jadi di luar (Mall / Market).

---

## 📂 Ruang Lingkup File Milik Developer 2
* `src/app/(shell)/master/farmers/page.tsx` (Master Petani & Supplier)
* `src/app/(shell)/receiving/page.tsx` (Inbound Timbang Nyata)
* `src/app/(shell)/sorting/page.tsx` (Pemisahan Daun vs Batang & Rekap Harian)
* `src/app/(shell)/inventory/page.tsx` & `warehouses/page.tsx` (Stok, ROP, Lead Time, Multi-Gudang)
* `src/app/(shell)/sales/page.tsx` (Order Penjualan & Konsinyasi Toko/Mall)
* `src/actions/master.ts`, `receiving.ts`, `sorting.ts`, `inventory.ts`, `sales.ts`
* `src/types/master.ts`, `inventory.ts`, `sales.ts`

---

## 🛠️ Rincian Tugas & Revisi Spesifik Developer 2

### 1. Master Petani & Supplier (`/master/farmers` & `src/actions/master.ts`)
* **Penambahan Kategori Pemasok:**
  Tambahkan field `supplier_type` / `category` pada entitas pemasok:
  1. `FARMER_MICRO` (Petani Sekitar / Mikro: setoran 0,2 kg – 5 kg).
  2. `FARMER_MAIN` (Petani Besar / Sentra Budidaya: setoran 20 – 30+ kg).
  3. `EXTERNAL_SUPPLIER` (Supplier Eksternal Cadangan: ada 2 vendor MOU).
* **Data Finansial untuk Pembayaran:**
  * Nomor Rekening / Bank / E-Wallet (untuk transfer fee bulanan).
  * No. Kontak WhatsApp aktif.
  * Tarif harga beli acuan per kg (bisa dioverride per transaksi).

---

### 2. Modul Penerimaan / Inbound (`/receiving` & `src/actions/receiving.ts`)
* **Hapus Tab "Menunggu Estimasi Panen":**
  * Tidak ada lagi antrean forecast petani. Alur penerimaan dibuat **1 Tab Tunggal Riwayat & Tombol Tambah Penerimaan Cepat**.
* **Dukungan Input Desimal Kilogram Presisi (Wajib Kilogram):**
  * Kolom input berat wajib menggunakan satuan **kg** dengan `step="0.01"` atau `step="0.1"`.
  * **Wajib bisa menerima input angka kecil seperti `0.2` (untuk 2 ons), `0.5`, `1.2`, dst.**
  * Tampilkan helper teks di bawah input: jika admin mengetik `0.2`, tampilkan *"Kira-kira 2 ons"*.
  * Jangan gunakan pembulatan integer (angka bulat) agar tidak merugikan petani mikro maupun pabrik.
* **Sumber Pemasok:**
  * Dropdown dinamis memilih: Petani Mitra (Sekitar / Besar) atau Supplier MOU (1 atau 2).
* **Nomor Lot Otomatis:**
  * Begitu disimpan, terbit Nomor Lot Inbound: `RCV-YYYYMMDD-XXXX` sebagai acuan HACCP awal.

---

### 3. Fitur Baru: Rekap Fee & Tagihan Setoran Bulanan
* **Kebutuhan Bisnis:** Pembayaran petani dilakukan sebulan sekali, sedangkan supplier sesuai MOU.
* **Implementasi:**
  * Tambahkan tombol / tab **"Rekap Pembayaran Petani"** di halaman Receiving atau Reports.
  * Filter: *Bulan & Tahun (misal: September 2026)* + *Pilihan Petani / Supplier*.
  * Menampilkan tabel agregasi:
    * Total Frekuensi Setor (berapa kali kirim)
    * Total Berat Bersih Jamur (kg)
    * Tarif Beli (Rp/kg)
    * **Total Hak Pembayaran (Rp)**
  * Tombol **Export Excel / Cetak PDF** agar admin/bendahara bisa langsung mengeksekusi transfer bank/pembayaran tunai tanpa menghitung nota foto kertas satu per satu.

---

### 4. Modul Sortasi Jamur (`/sorting` & `src/actions/sorting.ts`)
* **Penyederhanaan UI/UX (Modal Pop-Up):**
  * Form input sortasi menggunakan modal pop-up ringkas.
  * Hilangkan teks atau tombol pengiriman notifikasi WhatsApp ke petani.
* **Pemisahan Daun vs Batang:**
  * Input utama: **Berat Daun (kg)** *(siap masuk wajan)* dan **Berat Batang/Afkir (kg)**.
  * Persentase daun dihitung otomatis:
    $$\% \text{ Daun} = \left( \frac{\text{Berat Daun}}{\text{Berat Daun} + \text{Berat Batang}} \right) \times 100\%$$
  * Indikator kepatuhan standar ($\ge 75\%$ daun) tetap ditampilkan sebagai panduan kualitas bahan baku.
* **Kartu Summary Harian (*Daily Total*):**
  * Tampilkan 4 kartu ringkasan di atas tabel:
    1. *Sortasi Hari Ini* (total entri batch sortasi).
    2. *Total Daun Hari Ini (kg)*.
    3. *Total Batang Hari Ini (kg)*.
    4. *Rata-rata % Daun Hari Ini*.

---

### 5. Modul Gudang, Stok & Penjualan (`/inventory`, `/warehouses`, `/sales`)
* **Reorder Point (ROP) & Lead Time:**
  * Pada tabel inventaris bahan baku (jamur, minyak, tepung bumbu, kemasan), tambahkan kolom **ROP (kg/pcs)** dan **Lead Time Pengadaan (hari)**.
  * Jika stok riil $\le$ ROP, beri penanda warna Kuning/Merah (*Peringatan Stok Menipis*).
* **Pencatatan Gudang Luar (Mall / Market):**
  * Daftarkan lokasi gudang konsinyasi baru di Master Gudang: misal `Gudang Display Mall / Modern Market`.
  * Modul Sales / Delivery dapat mencatat perpindahan stok produk jadi dari Gudang Utama Pabrik ke titik penjualan luar (*Consignment Stock Movement*).
* **Bahan Baku Non-Petani:**
  * Bahan non-jamur (tepung premix, minyak, bumbu tabur) tetap mengacu pada master data yang terdaftar di sistem Accurate, dan disinkronkan kode serta satuannya di ERP KhumKhum.

---

## 🎯 Checklist Keberhasilan Developer 2
- [ ] Master Petani memisahkan Petani Sekitar (Mikro), Petani Besar, dan 2 Supplier MOU.
- [ ] Form Receiving mendukung input desimal kilogram presisi (misal `0.2 kg` untuk 2 ons) tanpa pembulatan integer.
- [ ] Tab antrean forecast kebun di receiving dihapus; alur berganti menjadi penimbangan fisik langsung.
- [ ] Fitur Rekap Fee Setoran Bulanan per Petani tersedia dan dapat diexport ke Excel/PDF.
- [ ] Form sortasi simpel pop-up, bebas dari notifikasi WA, dilengkapi 4 kartu ringkasan harian.
- [ ] Kolom ROP & Lead Time aktif di tabel inventory, serta mendukung pencatatan stok di gudang Mall/Market.
