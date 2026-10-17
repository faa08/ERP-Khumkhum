# Rencana Implementasi: Menu Resep Produksi Dinamis & Pemotongan Otomatis Bahan Baku Gudang
**Sistem ERP KhumKhum Jamur Crispy (CV Khaira Buana Mas)**

---

## 💡 Latar Belakang & Masalah Riil Lapangan
Di lantai produksi KhumKhum:
1. **Bahan baku dan formula tidak selalu 100% kaku/sama:**
   - Terkadang proporsi tepung atau jenis minyak disesuaikan dengan kondisi kelembapan jamur tiram hari itu.
   - Terkadang tepung premiks diracik sendiri dari terigu + tapioka + bumbu halus, atau memakai premiks siap pakai.
   - Rasa bumbu (Balado, BBQ, Super Pedas) punya takaran gram per kg yang berbeda.
2. **Kebutuhan Operator Produksi:**
   - Butuh **Menu Resep langsung di Modul Produksi** (tanpa harus bolak-balik ke Master Admin).
   - Resep ini menjadi acuan otomatis yang menentukan **bahan baku apa saja dan berapa banyak yang otomatis dipotong dari gudang (warehouse)** saat produksi selesai.

---

## 🏗️ 1. Arsitektur 3-Level BOM (Multi-Level Production Alur Gudang)

```mermaid
flowchart TD
    subgraph Level 1: Pembuatan Premiks (Mixing Sub-Assembly)
        A1[Tepung Terigu kg] & A2[Tepung Tapioka kg] & A3[Bawang Putih Bubuk kg] -->|Auto-Deduct OUT Gudang| M[Proses Mixing Premix]
        M -->|Auto-Add IN Gudang| B1[Item Gudang: Tepung Premix KhumKhum kg]
    end

    subgraph Level 2: Penggorengan Jamur Curah (SPK Masak)
        B1 & C1[Jamur Tiram Segar kg] & C2[Minyak Goreng Sawit L] -->|Auto-Deduct OUT Gudang| F[Wajan Goreng & Spinner]
        F -->|Auto-Add IN WIP| D1[Stok WIP: Longsong Jamur Polos Curah]
    end

    subgraph Level 3: Finishing & Pembumbuan (Sesi Packing)
        D1 & E1[Bumbu Tabur: Balado/BBQ/dll kg] & E2[Kemasan: Pouch 100g/Toples pcs] -->|Auto-Deduct OUT Gudang & WIP| P[Mixing Bumbu & Packing]
        P -->|Auto-Add IN Gudang Siap Jual| FG[Barang Jadi Siap Jual pcs]
        P -->|Auto-Add IN Gudang Produk Sekunder| KR[Jamur Kremesan/Remukan kg]
    end
```

---

## 📋 2. Desain Menu / Tab Resep di Modul Produksi (`/production`)

Di halaman utama produksi (`/production`), kita tambahkan Tab navigasi khusus:

```
[ Wajan & Goreng ]   [ Packing & Bumbu ]   [ Mixing Premix ]   [ 🥣 Resep & BOM Produksi ]
```

### Isi Tab "Resep & BOM Produksi":
1. **Resep Penggorengan Dasar (Wajan):**
   - Rasio Jamur Segar (Basis 1.0 kg).
   - Pilihan Bahan Tepung (Default: Tepung Premix KhumKhum @0.25 kg) — *bisa diganti ke bahan lain*.
   - Pilihan Minyak Goreng (Default: Minyak Sawit @0.30 Liter).
   - Tombol: `[Sesuaikan Rasio]` & `[Simpan Resep Wajan]`.

2. **Resep Racikan Tepung Premiks (Mixing):**
   - Output: `Tepung Premix KhumKhum` (Target misal: 10 kg).
   - Komposisi dinamis:
     - Tepung Terigu: 8.0 kg (80%)
     - Tepung Tapioka: 1.0 kg (10%)
     - Bawang Putih Bubuk: 1.0 kg (10%)
   - Operator bisa menambah baris bahan (cth: Garam Halus, Penyedap rasa) atau mengubah proporsi kg.

3. **Resep Bumbu Tabur per Varian (Packing):**
   - Tabel takaran gram bumbu per 1 kg jamur matang:
     - Original: 50 gram (5%)
     - Balado: 80 gram (8%)
     - BBQ: 70 gram (7%)
     - Pedas Manis: 70 gram (7%)
     - Super Pedas: 100 gram (10%)

---

## ⚡ 3. Mekanisme Pemotongan Otomatis Gudang (Auto-Deduct per Operasi)

### Operasi A: Saat "Simpan Laporan Mixing Premiks"
* **Input Operator:** Target Premix dihasilkan (misal `50 kg`).
* **Sistem Menghitung Berdasarkan Resep Premiks:**
  - Terigu: $50 \times 80\% = 40\text{ kg}$
  - Tapioka: $50 \times 10\% = 5\text{ kg}$
  - Bawang Putih: $50 \times 10\% = 5\text{ kg}$
* **Mutasi Gudang:**
  - Potong `inventory` Terigu, Tapioka, Bawang Putih (`stock_movements.movement_type = 'OUT'`).
  - Tambah `inventory` Tepung Premix KhumKhum $+50\text{ kg}$ (`stock_movements.movement_type = 'IN'`).

### Operasi B: Saat "Selesaikan SPK Masak (Goreng)"
* **Input Operator:** Total jamur segar yang digoreng hari itu (misal `60 kg`).
* **Sistem Mengambil Resep Goreng Aktif:**
  - Jamur Segar: $60\text{ kg}$
  - Tepung Premix (dari hasil Operasi A): $60 \times 0.25 = 15\text{ kg}$
  - Minyak Goreng: $60 \times 0.30 = 18\text{ Liter}$
* **Fitur Fleksibilitas di Modal:**
  - Operator bisa merevisi angka riil jika hari itu minyak terpakai 17 L alih-alih 18 L sebelum klik konfirmasi!
* **Mutasi Gudang:**
  - Potong `inventory` Jamur Segar, Tepung Premix, Minyak Goreng (`movement_type = 'OUT'`).
  - Catat penambahan hasil `Longsong` jamur polos ke status WIP.

### Operasi C: Saat "Selesaikan Sesi Packing"
* **Input Operator:** Ambil Longsong #1, rasa Balado, kemasan Pouch 100g, hasil 80 pcs.
* **Sistem Mengambil Resep Bumbu Balado:**
  - Bumbu Tabur Balado: $8\text{ kg} \times 8\% = 0.64\text{ kg}$
  - Standing Pouch 100g: $80\text{ pcs}$
* **Mutasi Gudang:**
  - Potong `inventory` Bumbu Balado & Pouch (`movement_type = 'OUT'`).
  - Potong stok wadah Longsong (WIP).
  - Tambah `inventory` Barang Jadi Siap Jual $+80\text{ pcs}$ (`movement_type = 'IN'`).

---

## 🛠️ 4. Roadmap Implementasi Teknis

| No | Komponen | Tindakan | File Terkait |
|---|---|---|---|
| 1 | **Tab Resep Produksi** | Tambahkan tab `RESEP & BOM` di halaman `/production` agar operator/SPV produksi bisa mengatur resep goreng, racikan premiks, dan takaran bumbu langsung di modul produksi. | `src/app/(shell)/production/page.tsx` |
| 2 | **Server Action Pemotongan Bahan Baku** | Buat fungsi `deductRawMaterialsByRecipe(orderId, mushroomKg, customOverrides)` untuk memotong otomatis Jamur + Premix + Minyak saat SPK masak selesai. | `src/actions/production.ts` |
| 3 | **Modal Konfirmasi Selesai SPK** | Tampilkan dialog konfirmasi interaktif dengan kalkulasi bahan baku sesuai resep aktif yang bisa di-override/disesuaikan sebelum dipotong. | `src/app/(shell)/production/page.tsx` |
| 4 | **Sinkronisasi Tab Mixing Premiks** | Hubungkan form `PremixMixingForm.tsx` dengan resep premiks yang sudah tersimpan agar saat input target kg, bahan terigu/tapioka/bumbu otomatis terisi sesuai takaran resep. | `src/components/production/PremixMixingForm.tsx` |
