const xlsx = require('xlsx');
const path = require('path');

// ════════════════════════════════════════════════════════════════
// TEMPLATE EXCEL MASTER DATA LENGKAP — ERP KHUMKHUM
// Dihasilkan dari analisis menyeluruh 10 halaman Master Data
// Setiap field input yang ada di UI dicatat tanpa terkecuali
// ════════════════════════════════════════════════════════════════

const templates = {

  // ──────────────────────────────────────────────
  // 1. PETANI MITRA (farmers/page.tsx)
  //    Form fields: name*, phone_number, contact, address
  //    * = required
  // ──────────────────────────────────────────────
  '1. Petani Mitra': [
    {
      'No': 1,
      'Nama Petani / Kelompok Tani (*)': 'Contoh: Kelompok Tani Jamur Lembang',
      'Contact Person': 'Contoh: Bapak Budi',
      'No. HP / WhatsApp': 'Contoh: 081234567890',
      'Alamat Lengkap': 'Contoh: Jl. Maribaya KM 5, Lembang, Bandung Barat',
    },
    {
      'No': 2,
      'Nama Petani / Kelompok Tani (*)': '',
      'Contact Person': '',
      'No. HP / WhatsApp': '',
      'Alamat Lengkap': '',
    },
    {
      'No': 3,
      'Nama Petani / Kelompok Tani (*)': '',
      'Contact Person': '',
      'No. HP / WhatsApp': '',
      'Alamat Lengkap': '',
    },
  ],

  // ──────────────────────────────────────────────
  // 2. PRODUK JADI (products/page.tsx)
  //    Form fields: sku*, name*, description
  // ──────────────────────────────────────────────
  '2. Produk Jadi': [
    {
      'No': 1,
      'Kode SKU (*)': 'Contoh: SKU-ORIG-100G',
      'Nama Produk (*)': 'Contoh: Jamur Crispy Original 100g',
      'Deskripsi': 'Contoh: Keripik jamur tiram rasa original kemasan 100 gram',
    },
    {
      'No': 2,
      'Kode SKU (*)': '',
      'Nama Produk (*)': '',
      'Deskripsi': '',
    },
    {
      'No': 3,
      'Kode SKU (*)': '',
      'Nama Produk (*)': '',
      'Deskripsi': '',
    },
  ],

  // ──────────────────────────────────────────────
  // 3. BAHAN BAKU (raw-materials/page.tsx)
  //    Form fields: code*, name*, uom*, min_stock, rop
  // ──────────────────────────────────────────────
  '3. Bahan Baku': [
    {
      'No': 1,
      'Kode Bahan Baku (*)': 'Contoh: RM-JAMUR-BASAH',
      'Nama Bahan Baku (*)': 'Contoh: Jamur Tiram Basah',
      'Satuan / UOM (*)': 'Contoh: kg',
      'Stok Minimal': 50,
      'Reorder Point (ROP)': 100,
    },
    {
      'No': 2,
      'Kode Bahan Baku (*)': 'Contoh: RM-TEPUNG-PMX',
      'Nama Bahan Baku (*)': 'Contoh: Tepung Premix',
      'Satuan / UOM (*)': 'kg',
      'Stok Minimal': 20,
      'Reorder Point (ROP)': 50,
    },
    {
      'No': 3,
      'Kode Bahan Baku (*)': 'Contoh: RM-MINYAK',
      'Nama Bahan Baku (*)': 'Contoh: Minyak Goreng',
      'Satuan / UOM (*)': 'Liter',
      'Stok Minimal': 30,
      'Reorder Point (ROP)': 60,
    },
    {
      'No': 4,
      'Kode Bahan Baku (*)': 'Contoh: RM-BUMBU-ORI',
      'Nama Bahan Baku (*)': 'Contoh: Bumbu Tabur Original',
      'Satuan / UOM (*)': 'kg',
      'Stok Minimal': 5,
      'Reorder Point (ROP)': 10,
    },
    {
      'No': 5,
      'Kode Bahan Baku (*)': '',
      'Nama Bahan Baku (*)': '',
      'Satuan / UOM (*)': '',
      'Stok Minimal': '',
      'Reorder Point (ROP)': '',
    },
  ],

  // ──────────────────────────────────────────────
  // 4. PELANGGAN (customers/page.tsx)
  //    Form fields: name*, contact, address
  // ──────────────────────────────────────────────
  '4. Pelanggan': [
    {
      'No': 1,
      'Nama Pelanggan / Toko (*)': 'Contoh: Toko Oleh-Oleh Bandung Juara',
      'Contact Person / No. Kontak': 'Contoh: Ibu Ani - 081298765432',
      'Alamat Kirim': 'Contoh: Jl. Braga No. 10, Bandung',
    },
    {
      'No': 2,
      'Nama Pelanggan / Toko (*)': '',
      'Contact Person / No. Kontak': '',
      'Alamat Kirim': '',
    },
    {
      'No': 3,
      'Nama Pelanggan / Toko (*)': '',
      'Contact Person / No. Kontak': '',
      'Alamat Kirim': '',
    },
  ],

  // ──────────────────────────────────────────────
  // 5. GUDANG (warehouses/page.tsx)
  //    Form fields: name*, location*, pic_id (dropdown ref PIC)
  // ──────────────────────────────────────────────
  '5. Gudang': [
    {
      'No': 1,
      'Nama Gudang (*)': 'Contoh: Gudang Bahan Baku A',
      'Lokasi (*)': 'Contoh: Zona Utara - Lembang',
      'Nama PIC Gudang (Referensi ke sheet 6)': 'Contoh: Cecep',
    },
    {
      'No': 2,
      'Nama Gudang (*)': 'Contoh: Gudang Barang Jadi',
      'Lokasi (*)': 'Contoh: Zona Selatan - Lembang',
      'Nama PIC Gudang (Referensi ke sheet 6)': '',
    },
    {
      'No': 3,
      'Nama Gudang (*)': '',
      'Lokasi (*)': '',
      'Nama PIC Gudang (Referensi ke sheet 6)': '',
    },
  ],

  // ──────────────────────────────────────────────
  // 6. PIC GUDANG (warehouse-pics/page.tsx)
  //    Form fields: name*, phone_number*, next_reminder_datetime*
  // ──────────────────────────────────────────────
  '6. PIC Gudang': [
    {
      'No': 1,
      'Nama PIC (*)': 'Contoh: Cecep Supriatna',
      'Nomor WhatsApp (*)': 'Contoh: 081234567890',
      'Tanggal Jadwal Pengingat (*)': 'Contoh: 2026-09-01',
      'Jam Pengingat (HH:MM)': 'Contoh: 08:00',
    },
    {
      'No': 2,
      'Nama PIC (*)': '',
      'Nomor WhatsApp (*)': '',
      'Tanggal Jadwal Pengingat (*)': '',
      'Jam Pengingat (HH:MM)': '',
    },
  ],

  // ──────────────────────────────────────────────
  // 7. STANDAR PRODUKSI (production-standards/page.tsx)
  //    Section A: Ambang Batas Rendemen
  //    Section B: Parameter Penggorengan & Penirisan
  // ──────────────────────────────────────────────
  '7. Standar Produksi': [
    {
      'Bagian': 'A. Ambang Batas Rendemen',
      'Parameter': 'Target Efisiensi Rendemen Minimum (%)',
      'Nilai': 80,
      'Keterangan': 'Rendemen di atas nilai ini ditandai Hijau (Optimal)',
    },
    {
      'Bagian': 'A. Ambang Batas Rendemen',
      'Parameter': 'Batas Peringatan Rendemen Rendah / Warning (%)',
      'Nilai': 75,
      'Keterangan': 'Rendemen di bawah nilai ini wajib mengisi alasan anomali',
    },
    {
      'Bagian': 'B. Parameter Penggorengan',
      'Parameter': 'Suhu Minyak Minimum (°C)',
      'Nilai': 160,
      'Keterangan': 'Suhu minimal wajan penggorengan',
    },
    {
      'Bagian': 'B. Parameter Penggorengan',
      'Parameter': 'Suhu Minyak Maksimum (°C)',
      'Nilai': 180,
      'Keterangan': 'Suhu maksimal wajan penggorengan',
    },
    {
      'Bagian': 'B. Parameter Penggorengan',
      'Parameter': 'Durasi Goreng (Menit)',
      'Nilai': 15,
      'Keterangan': 'Waktu standar penggorengan per batch',
    },
    {
      'Bagian': 'B. Parameter Penggorengan',
      'Parameter': 'Durasi Spinner Minyak (Menit)',
      'Nilai': 5,
      'Keterangan': 'Waktu standar penirisan minyak setelah goreng',
    },
  ],

  // ──────────────────────────────────────────────
  // 8. RESEP BOM (production-standards/page.tsx — BOM Section)
  //    Per varian produk: product_name, raw_mushroom_ratio,
  //    premix_flour_ratio, cooking_oil_ratio, seasoning_ratio
  // ──────────────────────────────────────────────
  '8. Resep BOM per 1kg Jamur': [
    {
      'No': 1,
      'Nama Produk / Varian': 'Jamur Crispy Original 100g',
      'Rasio Jamur Mentah (kg)': 1.0,
      'Rasio Tepung Premix (kg)': 0.25,
      'Rasio Minyak Goreng (L)': 0.30,
      'Rasio Bumbu Tabur (kg)': 0.05,
    },
    {
      'No': 2,
      'Nama Produk / Varian': 'Jamur Crispy Balado Pedas 100g',
      'Rasio Jamur Mentah (kg)': 1.0,
      'Rasio Tepung Premix (kg)': 0.25,
      'Rasio Minyak Goreng (L)': 0.30,
      'Rasio Bumbu Tabur (kg)': 0.08,
    },
    {
      'No': 3,
      'Nama Produk / Varian': 'Jamur Crispy BBQ Smoked 100g',
      'Rasio Jamur Mentah (kg)': 1.0,
      'Rasio Tepung Premix (kg)': 0.25,
      'Rasio Minyak Goreng (L)': 0.30,
      'Rasio Bumbu Tabur (kg)': 0.07,
    },
    {
      'No': 4,
      'Nama Produk / Varian': '',
      'Rasio Jamur Mentah (kg)': '',
      'Rasio Tepung Premix (kg)': '',
      'Rasio Minyak Goreng (L)': '',
      'Rasio Bumbu Tabur (kg)': '',
    },
  ],

  // ──────────────────────────────────────────────
  // 9. STANDAR SORTASI (sorting-standards/page.tsx)
  //    Form fields: name*, criteria*
  // ──────────────────────────────────────────────
  '9. Standar Sortasi': [
    {
      'No': 1,
      'Nama Standar (*)': 'Contoh: Grade A - Premium',
      'Kriteria (*)': 'Contoh: Persentase daun jamur >= 75%, warna putih bersih',
    },
    {
      'No': 2,
      'Nama Standar (*)': 'Contoh: Grade B - Reguler',
      'Kriteria (*)': 'Contoh: Persentase daun jamur 50-74%, warna putih kekuningan',
    },
    {
      'No': 3,
      'Nama Standar (*)': 'Contoh: Grade C - Reject',
      'Kriteria (*)': 'Contoh: Persentase daun jamur < 50%, jamur layu/rusak',
    },
    {
      'No': 4,
      'Nama Standar (*)': '',
      'Kriteria (*)': '',
    },
  ],

  // ──────────────────────────────────────────────
  // 10A. STANDAR QC — PARAMETER MUTU (qc-standards/page.tsx)
  //    Fields: max_defect_rate, max_moisture_percentage, min_sample_size
  // ──────────────────────────────────────────────
  '10A. Standar QC - Parameter': [
    {
      'Parameter': 'Maksimal Batas Cacat Toleransi / Defect Rate (%)',
      'Nilai': 5.0,
      'Keterangan': 'Jika defect rate > batas ini, batch direkomendasikan REWORK/REJECT',
    },
    {
      'Parameter': 'Maksimal Kadar Air Jamur Crispy Matang (%)',
      'Nilai': 12.0,
      'Keterangan': 'Standar mutu kerenyahan pangan: maksimal 12.0%',
    },
    {
      'Parameter': 'Ukuran Sampel Minimum per Batch (pcs kemasan)',
      'Nilai': 20,
      'Keterangan': 'Jumlah kemasan yang diambil sebagai sampel per batch inspeksi',
    },
  ],

  // ──────────────────────────────────────────────
  // 10B. STANDAR QC — KATEGORI DEFECT (qc-standards/page.tsx)
  //    Per kategori: name, severity (CRITICAL/HIGH/MEDIUM/LOW), weight
  // ──────────────────────────────────────────────
  '10B. Standar QC - Defect': [
    {
      'No': 1,
      'Deskripsi Cacat': 'Gosong / Overcooked',
      'Tingkat Keparahan (CRITICAL/HIGH/MEDIUM/LOW)': 'HIGH',
      'Bobot Penalti': 1.0,
    },
    {
      'No': 2,
      'Deskripsi Cacat': 'Keasinan / Bumbu Tidak Rata',
      'Tingkat Keparahan (CRITICAL/HIGH/MEDIUM/LOW)': 'MEDIUM',
      'Bobot Penalti': 0.8,
    },
    {
      'No': 3,
      'Deskripsi Cacat': 'Kemasan Bocor / Seal Rusak',
      'Tingkat Keparahan (CRITICAL/HIGH/MEDIUM/LOW)': 'CRITICAL',
      'Bobot Penalti': 1.0,
    },
    {
      'No': 4,
      'Deskripsi Cacat': 'Remuk / Patah Berlebih',
      'Tingkat Keparahan (CRITICAL/HIGH/MEDIUM/LOW)': 'LOW',
      'Bobot Penalti': 0.6,
    },
    {
      'No': 5,
      'Deskripsi Cacat': 'Melempem / Kurang Renyah',
      'Tingkat Keparahan (CRITICAL/HIGH/MEDIUM/LOW)': 'HIGH',
      'Bobot Penalti': 0.9,
    },
    {
      'No': 6,
      'Deskripsi Cacat': '',
      'Tingkat Keparahan (CRITICAL/HIGH/MEDIUM/LOW)': '',
      'Bobot Penalti': '',
    },
  ],

  // ──────────────────────────────────────────────
  // 11. JAM OPERASIONAL (operating-hours/page.tsx)
  //    Section A: Hari Kerja
  //    Section B: Shift (shift_name, start_time, end_time, break_minutes, is_active)
  //    Section C: Parameter Batch (frying, spinning, seasoning, capacity)
  // ──────────────────────────────────────────────
  '11A. Jam Operasional-Hari': [
    { 'Hari': 'Senin', 'Aktif (Ya/Tidak)': 'Ya' },
    { 'Hari': 'Selasa', 'Aktif (Ya/Tidak)': 'Ya' },
    { 'Hari': 'Rabu', 'Aktif (Ya/Tidak)': 'Ya' },
    { 'Hari': 'Kamis', 'Aktif (Ya/Tidak)': 'Ya' },
    { 'Hari': 'Jumat', 'Aktif (Ya/Tidak)': 'Ya' },
    { 'Hari': 'Sabtu', 'Aktif (Ya/Tidak)': 'Ya' },
    { 'Hari': 'Minggu', 'Aktif (Ya/Tidak)': 'Tidak' },
  ],

  '11B. Jam Operasional-Shift': [
    {
      'Nama Shift': 'Shift 1 (Pagi - Reguler)',
      'Jam Mulai': '08:00',
      'Jam Selesai': '16:00',
      'Istirahat (Menit)': 60,
      'Status Aktif (Ya/Tidak)': 'Ya',
    },
    {
      'Nama Shift': 'Shift 2 (Sore - Lembur)',
      'Jam Mulai': '16:00',
      'Jam Selesai': '21:00',
      'Istirahat (Menit)': 30,
      'Status Aktif (Ya/Tidak)': 'Tidak',
    },
  ],

  '11C. Jam Operasional-Batch': [
    {
      'Parameter': 'Lama Penggorengan (menit)',
      'Nilai': 15,
      'Keterangan': 'Waktu standar proses goreng per batch',
    },
    {
      'Parameter': 'Lama Penirisan / Spinner (menit)',
      'Nilai': 5,
      'Keterangan': 'Waktu standar penirisan minyak per batch',
    },
    {
      'Parameter': 'Lama Pembumbuan (menit)',
      'Nilai': 10,
      'Keterangan': 'Waktu standar proses pembumbuan per batch',
    },
    {
      'Parameter': 'Kapasitas per Batch (kg)',
      'Nilai': 5,
      'Keterangan': 'Berat jamur yang diproses dalam 1 batch goreng',
    },
  ],
};

// ═══════════════════════════════════════════════
// BUILD WORKBOOK
// ═══════════════════════════════════════════════

const wb = xlsx.utils.book_new();

for (const sheetName in templates) {
  const ws = xlsx.utils.json_to_sheet(templates[sheetName]);

  // Auto-fit column widths
  const keys = Object.keys(templates[sheetName][0]);
  ws['!cols'] = keys.map(key => {
    // Check max length of content vs header
    let maxLen = key.length;
    templates[sheetName].forEach(row => {
      const val = String(row[key] || '');
      if (val.length > maxLen) maxLen = val.length;
    });
    return { wch: Math.min(maxLen + 4, 50) };
  });

  xlsx.utils.book_append_sheet(wb, ws, sheetName);
}

// Add a PANDUAN (guide) sheet at the beginning
const guideData = [
  { 'Panduan Pengisian': '═══════════════════════════════════════════════════════════' },
  { 'Panduan Pengisian': 'TEMPLATE MASTER DATA LENGKAP — ERP KHUMKHUM' },
  { 'Panduan Pengisian': '═══════════════════════════════════════════════════════════' },
  { 'Panduan Pengisian': '' },
  { 'Panduan Pengisian': 'File ini berisi seluruh data yang perlu diisi pada modul Master Data ERP Khumkhum.' },
  { 'Panduan Pengisian': 'Tanda (*) pada nama kolom berarti field tersebut WAJIB DIISI.' },
  { 'Panduan Pengisian': '' },
  { 'Panduan Pengisian': '── DAFTAR SHEET ──────────────────────────────────────────' },
  { 'Panduan Pengisian': '' },
  { 'Panduan Pengisian': 'Sheet 1.  Petani Mitra        → Data supplier/petani jamur' },
  { 'Panduan Pengisian': 'Sheet 2.  Produk Jadi          → Daftar produk keripik jamur (SKU)' },
  { 'Panduan Pengisian': 'Sheet 3.  Bahan Baku           → Daftar bahan baku & stok minimal' },
  { 'Panduan Pengisian': 'Sheet 4.  Pelanggan            → Data customer/toko' },
  { 'Panduan Pengisian': 'Sheet 5.  Gudang               → Lokasi gudang penyimpanan' },
  { 'Panduan Pengisian': 'Sheet 6.  PIC Gudang           → Penanggung jawab gudang + jadwal reminder WA' },
  { 'Panduan Pengisian': 'Sheet 7.  Standar Produksi     → Target rendemen, suhu & durasi goreng' },
  { 'Panduan Pengisian': 'Sheet 8.  Resep BOM            → Komposisi bahan per 1 kg jamur mentah per varian' },
  { 'Panduan Pengisian': 'Sheet 9.  Standar Sortasi      → Kriteria grading kualitas jamur masuk' },
  { 'Panduan Pengisian': 'Sheet 10A. Standar QC - Param  → Batas defect rate, kadar air, sample size' },
  { 'Panduan Pengisian': 'Sheet 10B. Standar QC - Defect → Daftar jenis cacat & tingkat keparahan' },
  { 'Panduan Pengisian': 'Sheet 11A. Jam Operasional     → Hari kerja pabrik (Senin-Minggu)' },
  { 'Panduan Pengisian': 'Sheet 11B. Jam Operasional     → Konfigurasi shift kerja' },
  { 'Panduan Pengisian': 'Sheet 11C. Jam Operasional     → Parameter siklus produksi per batch' },
  { 'Panduan Pengisian': '' },
  { 'Panduan Pengisian': '── URUTAN PENGISIAN YANG DISARANKAN ─────────────────────' },
  { 'Panduan Pengisian': '' },
  { 'Panduan Pengisian': '1. Isi Sheet 6 (PIC Gudang) TERLEBIH DAHULU' },
  { 'Panduan Pengisian': '2. Lalu isi Sheet 5 (Gudang) — karena gudang membutuhkan referensi PIC' },
  { 'Panduan Pengisian': '3. Sheet lainnya bisa diisi dalam urutan bebas' },
  { 'Panduan Pengisian': '' },
  { 'Panduan Pengisian': '── CATATAN PENTING ──────────────────────────────────────' },
  { 'Panduan Pengisian': '' },
  { 'Panduan Pengisian': '• Baris contoh (baris pertama isi) bisa dihapus/ditimpa' },
  { 'Panduan Pengisian': '• Tambahkan baris baru di bawah untuk data tambahan' },
  { 'Panduan Pengisian': '• Data sheet 7-11 adalah konfigurasi sistem (isi sekali, update jika berubah)' },
  { 'Panduan Pengisian': '• Data sheet 1-6 adalah data transaksional (bisa terus bertambah)' },
];

const guideWs = xlsx.utils.json_to_sheet(guideData);
guideWs['!cols'] = [{ wch: 70 }];

// Insert guide sheet at position 0
xlsx.utils.book_append_sheet(wb, guideWs, 'PANDUAN');

// Move PANDUAN to first position
const sheetNames = wb.SheetNames;
const panduanIdx = sheetNames.indexOf('PANDUAN');
sheetNames.splice(panduanIdx, 1);
sheetNames.unshift('PANDUAN');
wb.SheetNames = sheetNames;

// Save
const outputPath = path.join(__dirname, 'public', 'Template_Master_Data_Khumkhum.xlsx');
xlsx.writeFile(wb, outputPath);

console.log('✅ File Excel LENGKAP berhasil dibuat di: ' + outputPath);
console.log('   Total sheet: ' + wb.SheetNames.length);
console.log('   Sheet names: ' + wb.SheetNames.join(', '));
