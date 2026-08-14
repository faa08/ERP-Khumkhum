# PRD DEVELOPER 2 — Warehouse, Inbound, Inventory, Sales & Traceability
**Sistem ERP KhumKhum Jamur Crispy (CV Khaira Buana Mas)**

---

## 1. Profil & Tanggung Jawab Developer 2
* **Peran:** Supply Chain, Logistics, Sales & Traceability Engineer
* **Role Sistem yang Dipegang:** 
  * `STAFF_GUDANG_PPIC` (Penerimaan Jamur, Sortasi, Multi-Gudang, Kartu Stok)
  * `STAFF_SALES` (Sales Orders, Surat Jalan, Pemenuhan Pesanan Pelanggan)
  * `MANAGEMENT` (Executive KPI Dashboard, Visualizer Ketertelusuran 2-Arah)
* **Tanggung Jawab Utama:** 
  Mengelola aliran fisik barang masuk dari petani, sortasi grade, mutasi stok antar gudang, pengiriman produk jadi ke pelanggan, serta membangun silsilah data (*traceability tree*).

---

## 2. Area Kerja & Isolasi File (Zero-Conflict)

### File & Folder Milik Developer 2 (Bebas Edit):
```text
src/
├── app/(shell)/
│   ├── master/
│   │   ├── farmers/page.tsx             <-- CRUD Petani Mitra
│   │   ├── products/page.tsx            <-- CRUD Produk Jadi (SKU Jamur)
│   │   ├── raw-materials/page.tsx       <-- CRUD Bahan Baku (Jamur, Tepung, Minyak)
│   │   ├── customers/page.tsx           <-- CRUD Pelanggan / Toko Retail
│   │   └── warehouses/page.tsx          <-- CRUD Gudang (Bahan Baku, Jadi, Afkir)
│   ├── receiving/page.tsx               <-- Inbound Timbang Jamur Basah
│   ├── sorting/page.tsx                 <-- Grading & Sortasi Kualitas
│   ├── inventory/page.tsx               <-- Kartu Stok, Mutasi & Stock Opname
│   ├── sales/page.tsx                   <-- Sales Order & Pengiriman
│   ├── traceability/page.tsx            <-- Silsilah Batch 2-Arah
│   └── dashboard/page.tsx               <-- Executive & Operational Dashboard
├── actions/
│   ├── master.ts                        <-- Server Actions: CRUD 5 Master Data
│   ├── receiving.ts                     <-- Server Actions: Inbound Timbang & Batch
│   ├── sorting.ts                       <-- Server Actions: Grading Jamur
│   ├── inventory.ts                     <-- Server Actions: Mutasi & Cek Stok
│   ├── sales.ts                         <-- Server Actions: Sales Order & Fulfillment
│   └── traceability.ts                  <-- Server Actions: Query Silsilah Batch
└── types/
    ├── master.ts                        <-- Tipe Master Data
    ├── inventory.ts                     <-- Tipe Stok & Mutasi
    ├── sales.ts                         <-- Tipe Order & Item
    └── traceability.ts                  <-- Tipe Graph Silsilah
```

> [!WARNING]
> **Larangan:** Developer 2 **DILARANG** mengedit file `src/app/(shell)/production/`, `src/app/(shell)/quality-control/`, `src/lib/auth-guard.ts`, atau `src/app/(auth)/login/` untuk menghindari *git merge conflict*.

---

## 3. Tabel Database yang Dikelola (Schema SQL)
Sesuai `database/schema.sql`:
1. `farmers`, `products`, `raw_materials`, `customers`, `warehouses`
2. `receivings` (`id`, `batch_number`, `farmer_id`, `raw_material_id`, `weight`, `notes`, `received_by`, `received_date`)
3. `sortings` (`id`, `receiving_id`, `grade`, `accepted_quantity`, `rejected_quantity`, `waste`, `sorted_by`, `sorting_date`)
4. `inventory` (`id`, `warehouse_id`, `item_type`, `item_id`, `batch_number`, `quantity`, `last_updated_at`)
5. `stock_movements` (`id`, `inventory_id`, `movement_type`, `quantity`, `reference_id`, `movement_date`, `created_by`)
6. `sales_orders` & `sales_order_items` (`id`, `customer_id`, `order_date`, `status`, `product_id`, `quantity`)

---

## 4. Rincian Tugas & Spesifikasi Fitur

### 4.1 Modul Master Data (5 Entitas Inti)
* Buat Server Action `src/actions/master.ts` untuk CRUD:
  * **Farmers:** Nama, No HP/WA, Alamat.
  * **Products:** SKU unik (`SKU-ORIG-100G`), Nama Varian, Deskripsi.
  * **Raw Materials:** Kode (`RM-JAMUR-BASAH`, `RM-TEPUNG`), Nama, Satuan (`kg`, `gram`).
  * **Customers:** Nama Toko/Distributor, No Kontak, Alamat Kirim.
  * **Warehouses:** Nama Gudang (`Gudang Bahan Baku`, `Gudang Produk Jadi`, `Karantina Afkir`), Lokasi.

### 4.2 Modul Penerimaan Bahan Baku (`receivings`)
* **Alur Penimbangan Inbound:**
  1. Pilih Petani dari dropdown `farmers` dan pilih Bahan Baku (`RM-JAMUR-BASAH`).
  2. Input berat kotor (*gross weight*) & tara karung $\to$ didapat berat bersih (*net weight*).
  3. Generate otomatis **Nomor Batch**: `RCV-YYYYMMDD-XXXX` (contoh: `RCV-20260814-0001`).
  4. Simpan ke tabel `receivings`.
  5. Otomatis kirim pesan WA nota penerimaan ke HP petani (panggil helper `sendWhatsAppMessage` dari Dev 1).
  6. Catat stok masuk awal ke gudang karantina penerimaan (`stock_movements: 'IN'`).

### 4.3 Modul Sortasi & Grading Jamur (`sortings`)
* **Alur Pemisahan Kualitas:**
  1. Pilih Nomor Batch Penerimaan (`receiving_id`).
  2. Input:
     * **Grade A / Jamur Bersih Siap Masak (kg)** $\to$ Masuk stok `Gudang Bahan Baku Siap Produksi`.
     * **Grade B / Jamur Cacat Ringan (kg)**.
     * **Afkir / Sampah Batang Jamur (kg)**.
  3. Validasi: `(Grade A + Grade B + Afkir)` harus sama persis dengan total kg di receiving ($\pm 2\%$ toleransi susut wajar).
  4. Update status batch penerimaan menjadi `SORTED`.

### 4.4 Modul Multi-Gudang & Kartu Stok (`inventory`)
* **Otomasi Mutasi Stok Atomik:**
  * Setiap penambahan/pengurangan barang wajib membuat rekaman di `stock_movements` (`IN`, `OUT`, `ADJUSTMENT`, `TRANSFER`).
  * Tampilkan tabel inventaris real-time dengan status stok (Aman = Hijau, Menipis/Di Bawah Reorder Point = Kuning, Habis = Merah).

### 4.5 Modul Sales Order & Pengiriman (`sales`)
* **Alur Order Penjualan:**
  1. Input pesanan: Pilih Customer, Tanggal Pengiriman, dan Daftar SKU Jamur beserta Quantity.
  2. Cek ketersediaan stok produk jadi di tabel `inventory`.
  3. Status transisi: `PENDING` $\to$ `PROCESSING` (Stok di-reservasi) $\to$ `SHIPPED` (Stok dipotong riil via `stock_movements: 'OUT'`) $\to$ `COMPLETED`.

### 4.6 Modul Silsilah Ketertelusuran (*Traceability*) & Dashboard
* **Traceability 2-Arah (`src/actions/traceability.ts`):**
  * Input: Masukkan `batch_number` (bisa nomor batch penerimaan `RCV-...` atau batch produksi `PRD-...`).
  * Query relasional rekursif:
    $$\text{Petani} \longleftrightarrow \text{Receiving} \longleftrightarrow \text{Sortasi} \longleftrightarrow \text{Produksi} \longleftrightarrow \text{QC} \longleftrightarrow \text{Inventory} \longleftrightarrow \text{Sales Order} \longleftrightarrow \text{Customer}$$
  * Render silsilah visual (*node/tree layout*) di `src/app/(shell)/traceability/page.tsx`.
* **Dashboard Eksekutif:**
  * Query agregat real-time: Total Penerimaan Jamur Hari Ini (kg), Total Stok Jamur Bersih, Total Nilai Penjualan Bulan Ini, dan Persentase Pass QC.

---

## 5. Checklist Pengerjaan Developer 2
- [ ] Buat Server Actions `src/actions/master.ts` (CRUD 5 Master Data)
- [ ] Hubungkan UI `src/app/(shell)/master/*` ke database nyata
- [ ] Buat Server Action `src/actions/receiving.ts` (Auto-generate Batch No `RCV-...`)
- [ ] Hubungkan UI `src/app/(shell)/receiving/page.tsx`
- [ ] Buat Server Action `src/actions/sorting.ts` dan hubungkan `src/app/(shell)/sorting/page.tsx`
- [ ] Buat Server Action `src/actions/inventory.ts` (Kartu Stok & Mutasi Atomik)
- [ ] Hubungkan UI `src/app/(shell)/inventory/page.tsx`
- [ ] Buat Server Action `src/actions/sales.ts` dan hubungkan `src/app/(shell)/sales/page.tsx`
- [ ] Bangun logika query relasi silsilah di `src/actions/traceability.ts`
- [ ] Hubungkan UI visualizer `src/app/(shell)/traceability/page.tsx`
- [ ] Hubungkan metrik KPI agregat di `src/app/(shell)/dashboard/page.tsx`
