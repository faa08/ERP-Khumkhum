# DOKUMEN REVISI SISTEM — DEVELOPER 3
**Manufaktur Produksi, Standar HACCP (Wajan & Spinner), Time Study, Packing & Quality Control**  
**Sistem ERP KhumKhum Jamur Crispy (CV Khaira Buana Mas)**

---

## 📌 Ringkasan Arahan & Latar Belakang Revisi
Developer 3 memegang jantung operasional lantai produksi KhumKhum. Berdasarkan evaluasi lapangan terbaru:
1. **Kapasitas Riil Wajan (Ukuran Batch):** 1 batch wajan penggorengan berkapasitas **default 800 gram (0,8 kg)** daun jamur (bisa diedit manual jika wajan terisi lebih/kurang).
2. **Kepatuhan Standar HACCP (CCP Wajan & Spinner):** Setiap batch wajib mencatat parameter kritis keamanan pangan: **Menit Goreng** (~15 mnt) dan **Menit Spinner** (~5 mnt). Ini menjadi bukti audit legalitas mutu pangan (BPOM/Halal/HACCP).
3. **Penyederhanaan BOM (1 Resep Dasar Goreng Saja):** Resep di wajan **TIDAK DIBAGI PER VARIAN RASA**. Semua jamur digoreng dengan adonan dasar yang sama (Jamur Segar + Tepung Premix + Minyak).
4. **Pemisahan 2 Lini Produksi:**
   * **Lini 1: Produksi Goreng Jamur** $\to$ Menghasilkan jamur matang curah polos yang ditampung dalam wadah plastik besar (**Longsong / Ball**).
   * **Lini 2: Produksi Packing & Bumbu** $\to$ Jamur dari longsong diambil, dicampur bumbu tabur (5 rasa), dan dikemas.
5. **Reminder Longsong Belum Dikemas:** Kepatuhan HACCP menuntut jamur matang tidak boleh kelamaan dibiarkan di wadah terbuka agar tidak melempem (*soggy*). Sistem harus memberi **peringatan stok longsong yang menunggu dikemas**.
6. **Pencatatan Hasil Utuh vs Remukan (Kremesan):** 1 longsong jamur tidak 100% utuh masuk toples/kemasan reguler. Bagian yang patah/remuk ditimbang sebagai **Produk Kremesan** (tetap bernilai jual).
7. **Tenaga Kerja Freelance (Bukan Shift Kaku):** KhumKhum menggunakan tenaga kerja freelance (borongan). Shift kaku dihapus dan digantikan oleh **Terminal Sesi Kerja** & **Master Waktu Baku (*Time Study*)**.

---

## 📂 Ruang Lingkup File Milik Developer 3
* `src/app/(shell)/production/page.tsx` (Lini Produksi, Batch Wajan & SPK)
* `src/app/(shell)/master/production-standards/page.tsx` (1 Resep BOM Dasar & Standar Kritis)
* `src/app/(shell)/master/terminal-pekerja/` & `waktu-baku/` (Terminal Kerja & Time Study)
* `src/app/(shell)/quality-control/page.tsx` (Inspeksi QC & Mutu Organoleptik)
* `src/actions/production.ts`, `standards.ts`, `timeStudy.ts`, `qc.ts`
* `src/types/production.ts`, `qc.ts`

---

## 🛠️ Rincian Tugas & Revisi Spesifik Developer 3

### 1. Standar Batch Wajan: Default 800 Gram (`/production` & `src/actions/production.ts`)
* **Spesifikasi Input Batch:**
  * Saat operator menambah batch penggorengan baru di form SPK / Produksi, field `Input Daun Jamur (kg)` otomatis terisi nilai default: **`0.8` kg** (800 gram).
  * Nilai ini tetap bersifat *editable* (bisa diubah manual jika wajan diisi 0,7 kg atau 1,0 kg).
* **Satuan Wajib Kilogram:** Seluruh input berat jamur wajib dalam desimal kilogram (contoh: `0.8 kg`, bukan angka 800 tanpa satuan).

---

### 2. Pencatatan Parameter Kritis HACCP per Batch (CCP Wajan & Spinner)
* **Form Batch Produksi wajib mencatat 2 titik kritis (CCP):**
  1. **Durasi Penggorengan (Menit):** Standar target 15 menit (suhu wajan 160–180°C). Titik kendali eliminasi bahaya mikrobiologi dan gelatinisasi tepung.
  2. **Durasi Penirisan / Spinner (Menit):** Standar target 5 menit sentrifugasi minyak. Titik kendali mutu dan bahaya kimia (menjamin minyak tuntas agar tidak tengik dan tidak melempem).
* **Integrasi dengan Time Study & Ergonomi Operator:**
  * Nilai durasi otomatis terisi dari Master Standar (15 menit & 5 menit). Operator cukup menekan *Simpan* jika sesuai standar, atau ubah angka jika terjadi deviasi waktu.
  * Sekali simpan, data otomatis mengalir ke **Log Audit HACCP** sekaligus mencatat sampel waktu siklus ke modul **Time Study** (`time_study_batches`).

---

### 3. Sederhanakan BOM: 1 Resep Dasar Goreng Saja (`/master/production-standards`)
* **Kondisi Lama:** Sistem membuat resep BOM terpisah untuk Original, Balado, BBQ, Pedas Manis, Super Pedas di tahap penggorengan.
* **Instruksi Revisi Baru:**
  * **Hapus varian rasa dari wajan penggorengan.**
  * Hanya ada **1 Resep BOM Dasar Goreng** per 1,0 kg jamur daun segar:
    * Jamur Tiram Segar (Daun): `1.00 kg`
    * Tepung Premix: `0.25 kg` (atau sesuai master)
    * Minyak Goreng Sawit: `0.30 liter`
    * *(Bumbu tabur: DITIADAKAN di tahap ini)*
  * Tampilkan info banner di UI:
    > *"💡 Cukup 1 resep dasar karena semua wajan menggoreng jamur yang sama tanpa rasa. Penambahan bumbu dilakukan di tahap packing."*

---

### 4. Pemisahan 2 Lini Produksi: Goreng Jamur vs Packing Rasa
Sistem membedakan alur produksi menjadi 2 tahapan jelas:

#### A. Tahap 1: Produksi Goreng Jamur (Wajan & Spinner)
* Input: Jamur Daun Segar (kg) + Tepung + Minyak.
* Proses: Goreng (menit) $\to$ Spinner (menit).
* Output: **Jamur Crispy Matang Plain (Curah)** yang ditampung dalam satuan wadah **Longsong / Ball**.
* Catat: Jumlah longsong dan total berat jamur matang (kg) $\to$ Hitung Rendemen (%) riil.

#### B. Tahap 2: Produksi Pembumbuan & Packing
* Input: Jamur Matang Plain dari wadah Longsong/Ball.
* Konsumsi Bumbu: Pilih 1 dari **5 Varian Rasa**:
  1. *Original*
  2. *Balado*
  3. *BBQ*
  4. *Pedas Manis*
  5. *Super Pedas*
* Konsumsi Kemasan: Pouch (50g / 100g) atau Toples.
* Output: Produk Jadi Kemasan (Pcs siap jual).

---

### 5. Reminder (Pengingat) Longsong yang Belum Dikemas
* **Latar Belakang HACCP:** Jamur goreng yang terlalu lama disimpan di wadah longsong berisiko menyerap kelembapan udara sehingga kerenyahannya turun (*melempem*).
* **Fitur Reminder:**
  * Tampilkan kartu notifikasi di dashboard produksi / modul packing:
    > *"⚠️ Terdapat [X] Longsong ([Y] kg) jamur matang curah yang belum dibumbui/dikemas. Jadwalkan sesi packing segera."*
  * Tombol aksi cepat: `[Buka Sesi Packing Sekarang]`.

---

### 6. Pencatatan Hasil Utuh vs Remukan (Produk Kremesan)
* Di form penyelesaian sesi packing, operator memisahkan hasil sortir akhir:
  1. **Produk Jadi Utuh (Pcs / Kemasan Toples/Pouch):** Masuk ke stok barang jadi reguler.
  2. **Remukan Jamur / Kremesan (kg):** Ditimbang dan dimasukkan ke stok produk sekunder sebagai **"Jamur Kremesan"**.
* **Keuntungan:** Jamur remuk tidak tercatat sebagai limbah rugi (*waste*), melainkan produk turunan yang memiliki harga jual tersendiri.

---

### 7. Sesi Kerja Freelance & Waktu Baku (Pengganti Shift Kaku)
* Hapus kolom `planned_shift` dari form SPK produksi.
* Pekerja harian lepas menggunakan **Terminal Sesi Kerja** (`/master/terminal-pekerja`):
  * Pilih Operasi: *Penggorengan*, *Penirisan (Spinner)*, *Pembumbuan*, atau *Packing*.
  * Tombol sederhana: `Mulai Kerja (Clock In)` $\to$ `Jeda (Pause)` $\to$ `Selesai (Clock Out)`.
* Di halaman `/master/waktu-baku`, sistem otomatis menghitung **Waktu Baku Final ($W_b$) per kg** berdasarkan sampel durasi batch wajan yang terekam.

---

## 🎯 Checklist Keberhasilan Developer 3
- [ ] Input batch wajan otomatis default `0.8 kg` (800 gram) dan dapat diedit.
- [ ] Setiap batch mencatat parameter kritis HACCP: Menit Goreng & Menit Spinner.
- [ ] Resep BOM wajan disederhanakan menjadi 1 Resep Dasar Goreng (tanpa bumbu rasa).
- [ ] Alur produksi terbagi jelas: Lini Goreng (hasil Longsong curah) dan Lini Packing (5 varian rasa).
- [ ] Ada kartu pengingat (reminder) untuk stok Longsong jamur matang yang belum dikemas.
- [ ] Form packing mencatat hasil produk utuh (toples/pouch) dan hasil remukan (kremesan kg).
- [ ] SPK bebas dari konsep shift kaku pabrik besar; terhubung dengan Terminal Sesi Kerja freelance.
