# Dokumen Spesifikasi Kebutuhan Produk (PRD) — Revisi Ke-2
## Rencana Pembaruan Sistem: Peramalan Dua Arah, Pemisahan Gudang Bahan Baku & Produk Jadi, Acuan Kapasitas Draf SPK, Penegasan Tugas Gudang vs PPIC, Master Jam Kerja, & Perhitungan Utama Jamur Masak
### Sistem ERP & Ketertelusuran Berbasis Data — KhumKhum Jamur Crispy (CV Khaira Buana Mas)

**Nomor Dokumen:** PRD-KK-2026-REV02  
**Versi:** 2.2 (Bahasa Indonesia Baku & Ramah Pengguna)  
**Tanggal Dokumen:** Agustus 2026  
**Status:** Dokumen Resmi Spesifikasi Rekayasa Perangkat Lunak  
**Program:** Startup for Industry 2026 – Kementerian Perindustrian Republik Indonesia  
**Instansi:** CV Khaira Buana Mas (KhumKhum Jamur Crispy) — Kulon Progo, D.I. Yogyakarta  

---

## 1. Pendahuluan & Alasan Pembaruan

Dokumen ini adalah **Panduan Resmi Revisi Ke-2** untuk pengembangan sistem ERP KhumKhum. Pembaruan ini disusun agar sistem lebih mudah dipahami oleh staf pabrik, petugas gudang, bagian perencanaan, dan pimpinan usaha dalam menjalankan aktivitas harian.

Tujuan utama dari pembaruan ini meliputi:
1. **Menghubungkan Pasokan Petani dengan Pesanan Pembeli:** Membandingkan perkiraan pasokan panen jamur dari petani dengan total pesanan pembeli (*Sales Order*) yang masuk secara otomatis.
2. **Memisahkan Pengelolaan Gudang:** Memisahkan penyimpanan bahan baku olahan (dikelola oleh bagian perencanaan/PPIC) dengan penyimpanan produk jadi kemasan siap kirim (dikelola oleh bagian gudang pengiriman).
3. **Mencegah Beban Kerja Berlebih pada Pabrik:** Menampilkan angka rata-rata kemampuan produksi harian saat membuat Draf Surat Perintah Kerja (Draf SPK) agar target produksi tetap masuk akal dan mesin tidak dipaksa melebihi batas.
4. **Memperjelas Tugas Bagian Gudang dan Bagian Perencanaan (PPIC):** Menegaskan bahwa petugas gudang bertugas mencatat dan menjaga fisik barang, sedangkan petugas PPIC bertugas merencanakan jadwal dan menghitung kebutuhan bahan.
5. **Menata Jam Kerja & Shift Pabrik:** Menambahkan menu data master jam operasional untuk menghitung waktu kerja efektif dan perkiraan jam selesai masak per kelompok wajan.
6. **Menjadikan Jamur Goreng Matang sebagai Hitungan Utama:** Menggunakan data **jamur yang sudah digoreng matang (tanpa bumbu)** sebagai dasar hitungan utama rencana kerja harian, sedangkan data daun jamur segar tetap dipakai sebagai pelengkap untuk memantau susut dan kebutuhan panen mentah.

---

## 2. Tabel Ringkasan Fitur yang Diperbarui

| No | Nama Fitur Baru | Menu Terkait | Penjelasan Sederhana untuk Pengguna |
|---|---|---|---|
| **1** | **Peramalan Dua Arah & Riwayat Prediksi** | Perencanaan (PPIC) & Prakiraan AI (`/ppic`, `/ai-forecast`) | Membandingkan perkiraan pasokan panen jamur vs pesanan pembeli yang harus dipenuhi, serta mencatat ketepatan tebakan ramalan minggu lalu. |
| **2** | **Pemisahan Gudang Bahan Baku & Produk Jadi** | Inventaris & PPIC (`/inventory`, `/ppic`) | Gudang Bahan Baku (jamur bersih, tepung, minyak, bumbu, plastik) dipisahkan dari Gudang Produk Jadi (keripik jamur aneka rasa siap kirim). |
| **3** | **Acuan Kapasitas Pabrik di Draf SPK** | Produksi & SPK (`/production`) | Saat membuat draf perintah kerja, sistem menampilkan meteran beban kerja (Aman, Penuh, atau Melebihi Batas) berdasarkan rata-rata harian pabrik. |
| **4** | **Pemisahan Tugas Gudang vs Perencanaan** | Hak Akses & Menu (`/receiving`, `/sorting`, `/inventory`) | Petugas Gudang fokus menerima dan menimbang fisik barang; Petugas PPIC fokus mengatur jadwal produksi dan jatah bahan. |
| **5** | **Data Induk Jam Operasional & Shift** | Data Induk (`/master/operating-hours`) | Pengaturan jam buka-tutup pabrik, jam istirahat, shift kerja, dan batas wajan penggorengan per hari. |
| **6** | **Hitungan Rencana: Jamur Masak (Utama) + Daun Jamur (Pelengkap)** | Perencanaan (PPIC) (`/ppic`) | Perencanaan rasa dan kemasan dihitung dari berat **jamur matang hasil goreng**, lalu otomatis menghitung mundur berapa **daun jamur basah** yang perlu disiapkan. |

---

## 3. Penjelasan Lengkap Fitur Baru

---

### 3.1. Fitur 1: Peramalan Dua Arah (Pasokan Panen vs Pesanan Pembeli) & Riwayat Prediksi

#### A. Mengapa Fitur Ini Dibuat?
Sebelumnya, sistem hanya menebak ketersediaan jamur dari data sortasi tanpa mencocokkan apakah stok tersebut cukup untuk memenuhi daftar pesanan pembeli yang sedang antre. Selain itu, pengguna belum bisa melihat apakah ramalan minggu lalu terbukti akurat atau meleset.

#### B. Cara Kerja Fitur
1. **Pencatatan Riwayat Prediksi:** Sistem mencatat ramalan setiap pekan dan membandingkannya dengan hasil panen nyata: `Angka Prediksi (Kg)` vs `Hasil Nyata (Kg)` vs `Tingkat Ketepatan (%)`.
2. **Grafik Komparasi Dua Garis:**
   * **Garis Hijau (Perkiraan Pasokan):** Jumlah daun jamur tiram bersih yang diprediksi akan disetor oleh petani mitra.
   * **Garis Biru (Kebutuhan Pesanan):** Jumlah jamur yang dibutuhkan untuk menyelesaikan seluruh pesanan pembeli yang masuk.
3. **Pemberitahuan Status:**
   * 🟢 **Stok Berlebih (Surplus):** Jamur melimpah, sistem menyarankan untuk menambah target produksi.
   * 🔴 **Stok Kurang (Defisit):** Pasokan jamur kurang dari pesanan pembeli, sistem memberi peringatan agar segera menghubungi petani untuk pasokan tambahan.

```
┌──────────────────────────────────────┐     ┌──────────────────────────────────────┐
│        SISI PASOKAN PANEN            │     │         SISI PESANAN PEMBELI         │
│ • Riwayat Setoran Petani             │     │ • Daftar Pesanan Pembeli Masuk       │
│ • Daun Jamur Segar Hasil Sortasi     │     │ • Target Pengiriman Toko/Distributor │
└──────────────────┬───────────────────┘     └──────────────────┬───────────────────┘
                   │                                            │
                   ▼                                            ▼
        [Perkiraan Pasokan Jamur]                    [Target Kebutuhan Pesanan]
                   │                                            │
                   └─────────────────────┬──────────────────────┘
                                         ▼
                            [ANALISIS PERBANDINGAN STOK]
                                         │
                   ┌─────────────────────┴─────────────────────┐
                   ▼                                           ▼
         🟢 PASOKAN JAMUR AMAN                       🔴 PASOKAN JAMUR KURANG
   (Bisa Tambah Rencana Masak Baru)            (Beri Tahu Petani Tambah Panen)
```

---

### 3.2. Fitur 2: Pemisahan Gudang Bahan Baku dan Gudang Produk Jadi

#### A. Mengapa Fitur Ini Dibuat?
Sebelumnya, seluruh barang dari bumbu mentah hingga keripik matang dicampur dalam satu tabel persediaan. Hal ini membuat staf gudang kesulitan membedakan bahan mentah yang akan dimasak dengan keripik yang siap dikirim ke pembeli.

#### B. Pembagian Dua Gudang Baru
1. **Gudang Bahan Baku (Dikelola Bagian PPIC / Perencanaan):**
   * Berisi: Daun jamur segar bersih, tepung bumbu, minyak goreng, aneka bumbu tabur, dan kemasan plastik aluminium kosong.
   * Fungsi: Memastikan bahan selalu siap saat koki mulai menggoreng, dan mengunci stok yang sudah dijadwalkan untuk surat perintah kerja.
2. **Gudang Produk Jadi (Dikelola Bagian Gudang & Penjualan):**
   * Berisi: Jamur Crispy kemasan siap jual (Rasa Asli/Original, Balado, Barbeque, Pedas).
   * Fungsi: Menerima keripik yang lolos uji mutu (QC Lolos) dan otomatis mengurangi stok saat barang dikirim bersama Surat Jalan.

```
                           ┌─────────────────────────────────┐
                           │      SISTEM PERSEDIAAN          │
                           └────────────────┬────────────────┘
                                            │
             ┌──────────────────────────────┴──────────────────────────────┐
             ▼                                                             ▼
┌─────────────────────────────────────────┐   ┌─────────────────────────────────────────┐
│       GUDANG BAHAN BAKU (PPIC)          │   │      GUDANG PRODUK JADI (GUDANG/SALES)  │
├─────────────────────────────────────────┤   ├─────────────────────────────────────────┤
│ • Daun Jamur Segar Bersih (Sortasi)     │   │ • Jamur Crispy Rasa Asli (Original)     │
│ • Tepung Bumbu Racikan KhumKhum         │   │ • Jamur Crispy Rasa Balado              │
│ • Minyak Goreng Sawit                   │   │ • Jamur Crispy Rasa Barbeque (BBQ)      │
│ • Aneka Bumbu Tabur Perasa              │   │ • Jamur Crispy Rasa Pedas Ekstra        │
│ • Plastik Pouch Aluminium Foil Kosong   │   │ • Jamur Crispy Kemasan Pouch 50g & 100g │
├─────────────────────────────────────────┤   ├─────────────────────────────────────────┤
│ 🎯 Kegunaan:                            │   │ 🎯 Kegunaan:                            │
│ - Menyiapkan jatah bahan untuk masak    │   │ - Menerima barang yang lolos cek mutu   │
│ - Menghitung batas belanja bahan baru   │   │ - Menyiapkan stok pesanan pembeli       │
│ - Cek fisik bahan baku berkala          │   │ - Mengurangi stok saat surat jalan jadi │
└─────────────────────────────────────────┘   └─────────────────────────────────────────┘
```

---

### 3.3. Fitur 3: Acuan Kemampuan Produksi pada Draf Surat Perintah Kerja (SPK)

#### A. Mengapa Fitur Ini Dibuat?
Agar pembuat jadwal produksi tidak memasukkan target yang terlalu muluk-muluk (misal: memesan 500 kg dalam sehari pada wajan yang biasanya hanya mampu memasak 100 kg).

#### B. Cara Hitung Sederhana
$$\text{Kemampuan Normal Harian (Kg)} = \frac{\text{Total Hasil Jamur Matang 30 Hari Terakhir}}{\text{Jumlah Hari Kerja Nyata}}$$

$$\text{Tingkat Beban Kerja (\%)} = \left( \frac{\text{Target Pesanan SPK Baru (Kg)}}{\text{Kemampuan Normal Harian (Kg)}} \right) \times 100\%$$

#### C. Tampilan Meteran Beban Kerja pada Form SPK
* 🟢 **Beban Aman (Di bawah 85%):** Target produksi pas dengan kapasitas wajan normal.
* 🟡 **Beban Penuh (85% – 100%):** Wajan bekerja maksimal untuk 1 shift reguler.
* 🔴 **Melebihi Batas (Di atas 100%):** Target terlalu berat. Sistem memberi saran: *“Bagi target menjadi 2 hari kerja atau buat shift lembur sore.”*

---

### 3.4. Fitur 4: Pembagian Tugas Antara Petugas Gudang dan Petugas Perencanaan (PPIC)

Agar alur kerja tidak tumpang tindih, peran kerja dibagi dengan tegas:

| Jenis Pekerjaan | Petugas Gudang | Petugas PPIC (Perencana) | Petugas Masak (Produksi) | Petugas Mutu (QC) |
|---|:---:|:---:|:---:|:---:|
| **Menerima & Timbang Jamur Petani** | **Pelaksana Utama** | Memantau Data | - | Memeriksa Kesegaran |
| **Sortir Daun vs Batang Jamur** | **Pelaksana Utama** | Memantau Data | - | Cek Standar Daun |
| **Menerima Fisik Minyak & Tepung** | **Pelaksana Utama** | Mencatat di Rencana | - | - |
| **Membuat Jadwal & Draf SPK Masak** | - | **Pelaksana Utama** | Memberi Masukan | - |
| **Menghitung Kebutuhan Resep Bumbu** | - | **Pelaksana Utama** | - | - |
| **Serah Terima Bahan ke Ruang Masak**| Menyerahkan Fisik | Menyetujui SPK | Menerima Bahan | - |
| **Menggoreng & Menimbang Hasil** | - | - | **Pelaksana Utama** | - |
| **Pemeriksaan Lolos / Tolak Keripik**| - | - | - | **Pelaksana Utama** |
| **Menata Produk Jadi Siap Kirim** | **Pelaksana Utama** | - | - | Mengabari Status Lolos|

---

### 3.5. Fitur 5: Master Data Jam Operasional & Shift Pabrik

Pengguna dapat mengatur jadwal kerja pabrik pada menu baru: **Data Induk > Jam Operasional Pabrik** (`/master/operating-hours`).

Pengaturan meliputi:
1. **Hari Kerja:** Pilihan hari operasional (misal: Senin sampai Sabtu).
2. **Daftar Shift:**
   * **Shift 1 (Pagi - Utama):** Jam 08.00 s/d 16.00 (Istirahat 60 menit $\to$ Waktu kerja bersih 7 jam).
   * **Shift 2 (Sore - Lembur/Opsional):** Jam 16.00 s/d 21.00 (Istirahat 30 menit $\to$ Waktu kerja bersih 4,5 jam).
3. **Standar Waktu Masak:**
   * Lama menggoreng per wajan: 15 menit.
   * Lama penirisan minyak (*spinner*): 5 menit.
   * Lama pencampuran bumbu & kemas: 10 menit.
   * Total 1 putaran masak: 30 menit per kelompok wajan.

---

### 3.6. Fitur 6: Hitungan Rencana PPIC: Jamur Masak (Utama) + Daun Jamur (Pelengkap)

#### A. Mengapa Jamur Masak Menjadi Hitungan Utama?
Dalam pembuatan jamur crispy KhumKhum:
1. Jamur basah setelah digoreng dan ditiriskan menghasilkan **Jamur Matang Plain (belum diberi bumbu)**.
2. Jamur matang ini adalah bahan setengah jadi yang seragam dan siap dibagi ke berbagai rasa (Original, Balado, BBQ, Pedas) sesuai pesanan pembeli.
3. Karena kadar air jamur segar sering berubah-ubah, perhitungan pesanan keripik jauh lebih pas dan tidak meleset jika dihitung dari berat **Jamur Matang Masak**.

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                    ALUR PERHITUNGAN BERSIFAT DUA TINGKAT                                │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  [TINGKAT 1: HITUNGAN UTAMA]                                                            │
│  ⭐ Data Jamur Matang Hasil Penggorengan (Jamur Masak Tanpa Bumbu)                      │
│  • Fungsi: Dasar utama pembagian rasa keripik, perhitungan target kemasan pouch,        │
│    dan pengukuran kemampuan nyata wajan penggorengan.                                   │
│                                                                                         │
│                                           ▲                                             │
│                                           │ Dihubungkan oleh Angka Rendemen (Hasil Jadi)│
│                                           │ Rendemen Normal = 80%                       │
│                                           ▼                                             │
│                                                                                         │
│  [TINGKAT 2: DATA PELENGKAP & VALIDASI PANEN]                                           │
│  🌿 Data Daun Jamur Segar Hasil Sortasi                                                 │
│  • Fungsi: Menghitung berapa kg jamur mentah basah yang harus dibeli ke petani mitra    │
│    dan memantau apakah proses goreng mengalami susut berlebih atau tidak.               │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

#### B. Rumus Hitungan Alur Balik (Dari Pesanan ke Belanja Jamur Mentah)
1. **Langkah 1 (Target Kemasan ke Jamur Matang):**  
   Target 1.000 bungkus (@ 100 gram) membutuhkan **100 kg Jamur Matang Masak**.
2. **Langkah 2 (Jamur Matang ke Daun Jamur Segar):**  
   Dengan standar rendemen masak 80%, kebutuhan daun jamur basah adalah:
   $$\text{Daun Jamur Segar yang Dibutuhkan} = \frac{100 \text{ kg}}{80\%} = 125 \text{ kg}$$
3. **Langkah 3 (Kebutuhan Bumbu Tabur):**  
   Dengan rasio bumbu 6%, kebutuhan bumbu tabur adalah:
   $$\text{Kebutuhan Bumbu} = 100 \text{ kg Jamur Matang} \times 6\% = 6 \text{ kg}$$

#### C. Tampilan 3 Tab di Menu Perencanaan (PPIC)
Halaman PPIC (`/ppic`) dirapikan menjadi 3 tab yang jelas:
1. **Tab 1: `Ringkasan Rencana & Pembagian Rasa`**
   * Menampilkan grafik perbandingan pasokan vs pesanan pembeli.
   * Tabel pembagian jamur matang ke varian rasa (Original, Balado, BBQ, Pedas).
   * Rencana belanja bahan (minyak, tepung, bumbu, plastik pouch).
2. **Tab 2: `Data Jamur Matang Penggorengan (Hitungan Utama)`** ⭐
   * Rekapitulasi jamur matang yang sudah selesai digoreng (kg).
   * Rata-rata hasil goreng per hari dan per minggu.
   * Tombol: *“Tambah Data Catatan Jamur Matang”*.
3. **Tab 3: `Data Daun Jamur Sortasi (Pelengkap Bahan Mentah)`** 🌿
   * Data timbangan daun jamur segar dari petani mitra.
   * Catatan susut batang vs daun jamur.

---

## 4. Rencana Pembaruan Database

Penambahan tabel dan kolom pada basis data untuk mendukung fitur di atas:

```sql
-- 1. Tabel Catatan Riwayat Prediksi dan Perbandingan Stok
CREATE TABLE IF NOT EXISTS forecast_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  forecast_week DATE NOT NULL,                 -- Tanggal awal pekan
  projected_cooked_mushroom_kg DECIMAL(10,2),  -- Perkiraan jamur matang masak (Utama)
  projected_leaf_raw_kg DECIMAL(10,2),         -- Perkiraan daun jamur basah (Pelengkap)
  projected_demand_kg DECIMAL(10,2) NOT NULL,    -- Total kebutuhan pesanan pembeli
  gap_kg DECIMAL(10,2) NOT NULL,                -- Selisih jamur tersedia vs pesanan
  gap_status VARCHAR(20) NOT NULL,              -- 'SURPLUS', 'DEFICIT', 'BALANCED'
  actual_cooked_kg DECIMAL(10,2),               -- Realisasi jamur matang nyata
  actual_leaf_kg DECIMAL(10,2),                 -- Realisasi daun jamur nyata
  accuracy_percentage DECIMAL(5,2),             -- Nilai ketepatan tebakan ramalan (%)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Penambahan Kolom Status Alokasi pada Gudang Bahan Baku
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS allocated_quantity DECIMAL(10,2) DEFAULT 0;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS available_quantity DECIMAL(10,2) DEFAULT 0;

-- 3. Penambahan Kolom Beban Kapasitas pada Surat Perintah Kerja (SPK)
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS capacity_utilization_pct DECIMAL(5,2);
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS planned_shift VARCHAR(50) DEFAULT 'SHIFT_1';

-- 4. Pengaturan Master Jam Kerja Pabrik
INSERT INTO settings (key, value) VALUES
(
  'operating_hours_standards',
  '{
    "work_days": ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"],
    "shifts": [
      {
        "shift_id": "SHIFT_1",
        "shift_name": "Shift 1 (Pagi - Reguler)",
        "start_time": "08:00",
        "end_time": "16:00",
        "break_minutes": 60,
        "effective_hours": 7.0,
        "is_active": true
      },
      {
        "shift_id": "SHIFT_2",
        "shift_name": "Shift 2 (Sore - Lembur)",
        "start_time": "16:00",
        "end_time": "21:00",
        "break_minutes": 30,
        "effective_hours": 4.5,
        "is_active": false
      }
    ],
    "standard_cycle_minutes_per_batch": 30
  }'::jsonb
)
ON CONFLICT (key) DO NOTHING;
```

---

## 5. Tahapan Pengerjaan

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ TAHAP 1: DATA MASTER JAM OPERASIONAL & RIWAYAT RAMALAN                      │
│  • Buat halaman menu `/master/operating-hours` untuk atur jam kerja & shift.│
│  • Pasang tabel `forecast_snapshots` untuk simpan tebakan vs hasil nyata.   │
├─────────────────────────────────────────────────────────────────────────────┤
│ TAHAP 2: PEMISAHAN GUDANG & PERAPIHAN 3 TAB MENU PPIC                       │
│  • Rapikan menu `/ppic` menjadi 3 Tab (Rencana Rasa, Jamur Masak, Daun).    │
│  • Pisahkan tampilan Gudang Bahan Baku dengan Gudang Keripik Siap Jual.     │
├─────────────────────────────────────────────────────────────────────────────┤
│ TAHAP 3: METERAN BEBAN KAPASITAS PADA FORM DRAF SPK                         │
│  • Tampilkan kapasitas normal wajan harian saat admin membuat Draf SPK.     │
│  • Tampilkan sinyal warna jika target melebihi kapasitas (Overcapacity).    │
├─────────────────────────────────────────────────────────────────────────────┤
│ TAHAP 4: GRAFIK PERBANDINGAN PASOKAN VS PESANAN                             │
│  • Tampilkan grafik perbandingan pasokan jamur masak vs pesanan pembeli.    │
│  • Tampilkan evaluasi ketepatan ramalan minggu-minggu sebelumnya.           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Standar Selesai & Pengujian (*Acceptance Criteria*)

Fitur revisi ini dinyatakan selesai jika:
1. **Bahasa Mudah Dipahami:** Seluruh menu, judul tab, tombol, dan petunjuk di layar menggunakan Bahasa Indonesia yang praktis tanpa istilah teknis asing yang membingungkan.
2. **Jamur Masak Jadi Basis Utama:** Rencana produksi PPIC membagi porsi rasa dan kemasan berdasarkan data jamur matang hasil goreng, dan otomatis menghitung kebutuhan daun jamur basah ke petani.
3. **3 Tab PPIC Berfungsi:** Pengguna dapat berpindah dengan lancar antara tab *Ringkasan Rencana*, *Data Jamur Matang Penggorengan*, dan *Data Daun Jamur Sortasi*.
4. **Grafik Dua Arah Berjalan:** Terlihat jelas apakah pasokan jamur minggu ini berlebih (*Surplus*) atau kurang (*Defisit*) dibandingkan pesanan pembeli.
5. **Gudang Terpisah Rapi:** Bahan mentah (jamur, tepung, bumbu, plastik) berada di area PPIC, sedangkan keripik siap kirim berada di area Gudang Produk Jadi.
6. **Meteran Beban SPK Aktif:** Saat membuat draf SPK baru, terlihat persentase beban kerja mesin (Hijau, Kuning, atau Merah).
7. **Pengaturan Jam Kerja Berfungsi:** Jam kerja shift dapat diubah melalui menu data induk dan otomatis memengaruhi perhitungan jam selesai masak.
