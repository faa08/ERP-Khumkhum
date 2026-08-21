# PRD Revisi - Pengembangan Modul Inventory & Stock

---

## 1. Latar Belakang & Tujuan Revisi
Dokumen ini berisi rincian penyesuaian dan penambahan fitur pada **Modul Inventory & Stock** berdasarkan *feedback* pengembangan. Revisi ini difokuskan pada peningkatan ketertelusuran (traceability) pemakaian bahan baku per batch produksi, pengelolaan master data bahan baku yang lebih fleksibel, manajemen kerugian stock opname, serta sistem peringatan dini (reminder & ROP).

## 2. Ringkasan Kebutuhan Revisi
1. **Traceability Mutasi:** Mutasi dibuat menjadi per-batch produksi untuk mengetahui detail penggunaan bahan baku secara spesifik.
2. **Penerimaan Bahan Baku Umum:** Penambahan input/penerimaan stok masuk untuk bahan baku selain jamur langsung di halaman Inventori real time stock.
3. **Identifikasi Barang:** Penambahan kode bahan baku.
4. **Rekap Kerugian:** Selisih stock opname (minus) harus dapat diubah menjadi rekap kerugian.
5. **Histori Stock Opname:** Menyimpan dan merekam data historis hasil stock opname secara persisten.
6. **Reminder Jadwal:** Pembuatan reminder/pengingat untuk PIC Gudang agar melakukan stock opname tepat waktu lewat whatsapp.
7. **Reorder Point (ROP):** Penetapan batas minimal stok (minimum stock) di dalam inventory untuk menentukan titik pemesanan kembali.

---

## 3. Pembagian Tugas Berdasarkan Area Kerja (Role)

### 3.1 📦 Tugas Developer 2 (Warehouse, Inventory & Master Data)
*Sebagian besar (*80%*) dari revisi ini berada di area kendali Dev 2.*

* **Fitur Master Data (`master/raw-materials`):**
  - Menambahkan field **Kode Bahan Baku** (misal: `RM-TPG-01`).
  - Menambahkan input field untuk parameter **Minimum Stock** dan **Reorder Point (ROP)**.
* **Fitur Inventory & Mutasi (`inventory`):**
  - Menyediakan fitur/form **Input Pemasukan Barang (Inbound) untuk Bahan Baku Selain Jamur** (tepung, minyak, bumbu, kemasan) yang bisa diakses langsung di halaman Inventori.
  - Merombak UI/tabel mutasi stok menjadi bentuk **Rekening Koran/Bank** (menampilkan Tanggal, Referensi, In, Out, Saldo).
  - Mengelola data `stock_movements` yang masuk dari produksi (dikirim oleh Dev 3) agar tampil dengan nomor Batch yang jelas.
  - Membangun visualisasi **Stok Kritis / Below ROP** (berubah warna merah atau muncul badge *"Need Reorder"*) pada tabel kartu stok.
* **Fitur Stock Opname & Kerugian (`inventory`):**
  - Membuat tabel dan halaman khusus untuk menyimpan riwayat input stok fisik (Stock Opname).
  - Membuat *logic* kalkulasi selisih (Stok Sistem vs Stok Fisik).
  - Membuat halaman **Laporan Rekap Kerugian** berdasarkan selisih minus hasil stock opname.
* **Fitur Dashboard & Notifikasi (`dashboard`):**
  - Membuat komponen **Banner/Alert Reminder** di halaman Dashboard untuk PIC Gudang ketika jadwal Stock Opname bulanan telah tiba.

### 3.2 ⚙️ Tugas Developer 3 (Manufaktur Produksi & QC)
*Dev 3 berfokus pada integrasi logika pemakaian bahan baku dari sisi produksi.*

* **Fitur Konsumsi Bahan Baku Per Batch (`production`):**
  - Mengubah/mempertegas logika *Bill of Materials* (BOM). Pada saat SPK Produksi (Batch) berjalan, sistem harus mendata secara riil **berapa banyak masing-masing bahan baku** (jamur, tepung, bumbu) yang dipakai untuk nomor batch tersebut.
  - Men- *trigger* proses pemotongan (Mutasi OUT) ke *function* milik Dev 2 (`stock_movements`) dengan menyertakan Nomor Batch (`PRD-XXX`) sebagai Referensi. Sehingga saat Dev 2 membuka Kartu Stok, akan terlihat jelas bahan baku tersebut berkurang karena dipakai oleh Batch Produksi yang mana.

### 3.3 🛡️ Tugas Developer 1 (Core Architect & WA Gateway)
*Karena reminder dikirim lewat WhatsApp otomatis, Dev 1 wajib terlibat untuk mengelola data kontak PIC dan pengiriman pesannya.*

* **Fitur Manajemen Pengguna (`settings/users`):**
  - Menambahkan field **WhatsApp PIC Gudang** pada form Master Data User / Pengguna (untuk mencatat nomor HP PIC Gudang).
* **Fitur Cron Job / Scheduler API:**
  - Membuat sistem penjadwalan (*cron job* / scheduler) yang mengecek jadwal Stock Opname secara berkala.
  - Memanggil fungsi *WhatsApp Gateway* (Fonnte) untuk mengirimkan pesan pengingat ke nomor WhatsApp PIC Gudang.

---

## 4. Rincian Teknis & Dampak Database (Schema)

Pembaruan yang perlu dilakukan pada skema SQL (`database/schema.sql` / Prisma/Supabase):

1. **Tabel `raw_materials` (Dev 2):**
   - `ADD COLUMN item_code VARCHAR(50) UNIQUE`
   - `ADD COLUMN material_category VARCHAR(50)` (ENUM: Jamur, Bumbu, Tepung, Minyak, Packaging)
   - `ADD COLUMN min_stock DECIMAL(10,2) DEFAULT 0`
   - `ADD COLUMN reorder_point DECIMAL(10,2) DEFAULT 0`

2. **Tabel `stock_opname` (Baru - Dev 2):**
   - Menyimpan Header (Tanggal, PIC, Keterangan).
   - Menyimpan Detail (Item ID, Stok Sistem, Stok Fisik, Selisih, Status Surplus/Loss, Alasan/Keterangan).

3. **Tabel `stock_movements` (Kolaborasi Dev 2 & 3):**
   - Pastikan field `reference_id` atau `reference_number` diisi dengan Nomor Batch Produksi (`PRD-YYYYMMDD-XXX`) saat Dev 3 melakukan trigger *OUT* pemakaian bahan baku.

4. **Tabel Konfigurasi / Pengaturan (Dev 1 / Dev 2):**
   - Tambahkan key-value untuk menyimpan jadwal tanggal batas Stock Opname (misalnya: setiap tanggal 25).

5. **Tabel `users` (Dev 1):**
   - `ADD COLUMN whatsapp_number VARCHAR(20)` (Untuk menyimpan nomor kontak staf/PIC Gudang).
