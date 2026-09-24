const xlsx = require('xlsx');
const path = require('path');

// Buat Workbook baru
const wb = xlsx.utils.book_new();

// ==========================================
// 1. Sheet: Data Penerimaan & Petani
// ==========================================
const receivingData = [
  {
    'Tanggal Penerimaan': '2023-11-01',
    'Nama Petani': 'Budi',
    'Nama Bahan Baku': 'Jamur Tiram Mentah',
    'Berat Aktual/Terima (Kg)': 150.5
  },
  {
    'Tanggal Penerimaan': '2023-11-02',
    'Nama Petani': 'Siti',
    'Nama Bahan Baku': 'Jamur Tiram Mentah',
    'Berat Aktual/Terima (Kg)': 120.0
  }
];
const wsReceiving = xlsx.utils.json_to_sheet(receivingData);
xlsx.utils.book_append_sheet(wb, wsReceiving, '1. Penerimaan Jamur');

// ==========================================
// 2. Sheet: Data Hasil Sortasi
// ==========================================
const sortingData = [
  {
    'Tanggal Sortasi': '2023-11-01',
    'Nama Bahan Baku': 'Jamur Tiram Mentah',
    'Berat Daun (Kg)': 115,
    'Berat Batang (Kg)': 30,
    'Jumlah Lolos/Diterima (Kg)': 145,
    'Jumlah Afkir/Dibuang (Kg)': 5.5
  }
];
const wsSorting = xlsx.utils.json_to_sheet(sortingData);
xlsx.utils.book_append_sheet(wb, wsSorting, '2. Hasil Sortasi');

// ==========================================
// 3. Sheet: Data Produksi
// ==========================================
const productionData = [
  {
    'Tanggal Produksi': '2023-11-02',
    'Varian Rasa': 'Original',
    'Berat Jamur Masuk (Kg)': 50,
    'Berat Barang Jadi (Kg)': 12,
    'Keterangan/Batch': 'PRD-20231102-01'
  },
  {
    'Tanggal Produksi': '2023-11-02',
    'Varian Rasa': 'Balado',
    'Berat Jamur Masuk (Kg)': 45,
    'Berat Barang Jadi (Kg)': 10.5,
    'Keterangan/Batch': 'PRD-20231102-02'
  }
];
const wsProduction = xlsx.utils.json_to_sheet(productionData);
xlsx.utils.book_append_sheet(wb, wsProduction, '3. Data Produksi');

// ==========================================
// 4. Sheet: Data Penjualan
// ==========================================
const salesData = [
  {
    'Tanggal Penjualan': '2023-11-03',
    'Nama Produk': 'Kripik Jamur Original 150g',
    'Jumlah Terjual (Pcs)': 100,
    'Harga Satuan (Rp)': 15000,
    'Cabang/Lokasi': 'Pusat'
  }
];
const wsSales = xlsx.utils.json_to_sheet(salesData);
xlsx.utils.book_append_sheet(wb, wsSales, '4. Penjualan Keluar');

// Simpan file
const outputPath = path.join(__dirname, 'Template_Historis_Khumkhum_V2.xlsx');
xlsx.writeFile(wb, outputPath);

console.log('File Excel berhasil dibuat di:', outputPath);
