const xlsx = require('xlsx');
const path = require('path');

// ════════════════════════════════════════════════════════════════
// UPDATE Rincian_Implementasi_Revisi_KhumKhum_ERP.xlsx
// Menambahkan kolom "Sumber Arahan" — hanya diisi untuk entry Revisi
// ════════════════════════════════════════════════════════════════

const SUMBER_ARAHAN = 'Atas arahan Tim Ahli Management Business Link Productive';

const data = [
  {
    'Tahap / Referensi PRD': 'Inisialisasi & Setup',
    'Jenis': 'Implementasi',
    'Tanggal': '05 - 11 Agustus 2026',
    'Rincian Implementasi / Revisi': 'Setup Project, Dashboard, Reports, AI, Settings (Sprint 4) & Pembuatan Skema Database SQL.',
    'Sumber Arahan': '',
    'Status': 'Selesai',
  },
  {
    'Tahap / Referensi PRD': 'PRD DEV 1 (Core, Admin, Farmer)',
    'Jenis': 'Implementasi',
    'Tanggal': '14 Agustus 2026',
    'Rincian Implementasi / Revisi': 'Modul Autentikasi (Auth), Role Management, Integrasi WhatsApp Webhook untuk Petani, dan UI Localization.',
    'Sumber Arahan': '',
    'Status': 'Selesai',
  },
  {
    'Tahap / Referensi PRD': 'UI / UX',
    'Jenis': 'Revisi',
    'Tanggal': '14 - 19 Agustus 2026',
    'Rincian Implementasi / Revisi': 'Redesign halaman login secara bertahap, integrasi tema landing page KhumKhum (Agro-industry mushroom theme).',
    'Sumber Arahan': SUMBER_ARAHAN,
    'Status': 'Selesai',
  },
  {
    'Tahap / Referensi PRD': 'PRD DEV 3 (QC & Production)',
    'Jenis': 'Implementasi',
    'Tanggal': '15 Agustus 2026',
    'Rincian Implementasi / Revisi': 'Modul Produksi, Rendemen, Quality Control (QC), Standar Mutu, AI Forecast, Live DB Integration.',
    'Sumber Arahan': '',
    'Status': 'Selesai',
  },
  {
    'Tahap / Referensi PRD': 'Pembagian Fitur Per Role',
    'Jenis': 'Implementasi',
    'Tanggal': '18 Agustus 2026',
    'Rincian Implementasi / Revisi': 'Integrasi 6 Role Utama, cross-module data flow, dan recursive sidebar filtering.',
    'Sumber Arahan': '',
    'Status': 'Selesai',
  },
  {
    'Tahap / Referensi PRD': 'Spesifikasi 7 Role ERP',
    'Jenis': 'Revisi',
    'Tanggal': '18 Agustus 2026',
    'Rincian Implementasi / Revisi': 'Penambahan Role ke-7: Restorasi modul Sales Order dan pemisahannya menjadi role khusus (SALES Role).',
    'Sumber Arahan': SUMBER_ARAHAN,
    'Status': 'Selesai',
  },
  {
    'Tahap / Referensi PRD': 'PPIC & Produksi Lanjutan',
    'Jenis': 'Revisi',
    'Tanggal': '19 Agustus 2026',
    'Rincian Implementasi / Revisi': 'Migrasi AI Forecast ke PPIC (Holt\'s method), ubah form sorting & SPK menjadi modal pop-up interaktif, penambahan Custom SPK date.',
    'Sumber Arahan': SUMBER_ARAHAN,
    'Status': 'Selesai',
  },
  {
    'Tahap / Referensi PRD': 'PRD DEV 2 (Warehouse, Inventory)',
    'Jenis': 'Implementasi',
    'Tanggal': '21 Agustus 2026',
    'Rincian Implementasi / Revisi': 'Modul Gudang (Warehouse), Inventory Inbound/Outbound, PIC Gudang, dan fitur Reports modern (Eksport Excel & PDF).',
    'Sumber Arahan': '',
    'Status': 'Selesai',
  },
  {
    'Tahap / Referensi PRD': 'PRD Revisi Inventory Stock',
    'Jenis': 'Revisi',
    'Tanggal': '21 Agustus 2026',
    'Rincian Implementasi / Revisi': 'Perbaikan UI Inbound menjadi modal dengan input teks, penggunaan master data dropdown untuk mencegah typo, dan integrasi konsumsi material BOM per batch.',
    'Sumber Arahan': SUMBER_ARAHAN,
    'Status': 'Selesai',
  },
  {
    'Tahap / Referensi PRD': 'PRD Revisi Ke-2',
    'Jenis': 'Revisi',
    'Tanggal': '25 Agustus 2026',
    'Rincian Implementasi / Revisi': 'Penambahan fitur jam operasional, 3-tab PPIC dashboard, Capacity Meter, dan pemisahan menu antara Inventory & Warehouse.',
    'Sumber Arahan': SUMBER_ARAHAN,
    'Status': 'Selesai',
  },
  {
    'Tahap / Referensi PRD': 'Optimasi Kinerja (Performance)',
    'Jenis': 'Revisi / Bugfix',
    'Tanggal': '25 Agustus 2026',
    'Rincian Implementasi / Revisi': 'Optimasi N+1 Queries pada server actions untuk modul inventory, qc, dan reports.',
    'Sumber Arahan': SUMBER_ARAHAN,
    'Status': 'Selesai',
  },
];

// ═══════════════════════════════════════════════
// BUILD WORKBOOK
// ═══════════════════════════════════════════════

const wb = xlsx.utils.book_new();
const ws = xlsx.utils.json_to_sheet(data);

// Auto-fit column widths
const keys = Object.keys(data[0]);
ws['!cols'] = keys.map(key => {
  let maxLen = key.length;
  data.forEach(row => {
    const val = String(row[key] || '');
    if (val.length > maxLen) maxLen = val.length;
  });
  return { wch: Math.min(maxLen + 4, 60) };
});

xlsx.utils.book_append_sheet(wb, ws, 'Rekap Pengembangan & Revisi');

// Save (overwrite existing file)
const outputPath = path.join(__dirname, 'Rincian_Implementasi_Revisi_KhumKhum_ERP.xlsx');
xlsx.writeFile(wb, outputPath);

console.log('✅ File Excel berhasil diupdate!');
console.log('   Path: ' + outputPath);
console.log('   Total baris data: ' + data.length);
console.log('   Kolom: ' + keys.join(' | '));
console.log('');
console.log('── Mapping Sumber Arahan ──');
data.forEach((row, i) => {
  const label = row['Sumber Arahan'] || '— (Implementasi, tidak ada arahan revisi)';
  console.log(`   ${i + 1}. [${row['Jenis']}] ${row['Tahap / Referensi PRD']} → ${label}`);
});
