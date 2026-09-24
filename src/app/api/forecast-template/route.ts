import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { format } from 'date-fns';

export async function GET() {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ERP KhumKhum';
    workbook.created = new Date();

    const today = new Date();

    // ==========================================
    // SHEET 1: PANDUAN PENGISIAN
    // ==========================================
    const sheetPanduan = workbook.addWorksheet('1. Panduan Pengisian');
    sheetPanduan.getColumn('A').width = 80;
    
    sheetPanduan.getCell('A1').value = 'PANDUAN IMPOR DATA HISTORIS';
    sheetPanduan.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
    sheetPanduan.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    
    const instructions = [
      '',
      'Selamat datang di Template Data Historis ERP KhumKhum.',
      'Template ini digunakan untuk "menyuapi" AI Forecasting dengan data operasional Anda di masa lalu.',
      '',
      'CARA PENGISIAN:',
      '1. Jangan mengubah nama Sheet atau format Judul Kolom (Header).',
      '2. Isi data Produksi (pengolahan jamur mentah) pada Sheet "2. Data Produksi".',
      '3. Isi data Penjualan (pesanan masuk) pada Sheet "3. Data Penjualan".',
      '4. Gunakan format tanggal YYYY-MM-DD (Contoh: 2023-12-31).',
      '5. Anda boleh meng-copy paste dari file Excel lama Anda, asalkan kolomnya sesuai urutan.',
      '',
      'CATATAN:',
      'Data yang diisi di sini hanya ditujukan untuk keperluan masa lalu (tahun 2023 - sekarang).',
      'Untuk transaksi hari ini, gunakan fitur input langsung di dalam aplikasi ERP.'
    ];

    instructions.forEach((text, i) => {
      sheetPanduan.getCell(`A${i + 2}`).value = text;
      if (text.startsWith('CARA PENGISIAN') || text.startsWith('CATATAN')) {
        sheetPanduan.getCell(`A${i + 2}`).font = { bold: true };
      }
    });

    // ==========================================
    // SHEET 2: DATA PRODUKSI
    // ==========================================
    const sheetProduksi = workbook.addWorksheet('2. Data Produksi', {
      views: [{ state: 'frozen', ySplit: 1 }]
    });

    sheetProduksi.addTable({
      name: 'TabelProduksi',
      ref: 'A1',
      headerRow: true,
      totalsRow: false,
      style: {
        theme: 'TableStyleMedium4', // Green theme for production
        showRowStripes: true,
      },
      columns: [
        { name: 'Tanggal Produksi', filterButton: true },
        { name: 'Shift', filterButton: true },
        { name: 'Input Jamur (Kg)', filterButton: true },
        { name: 'Catatan / Kendala', filterButton: false }
      ],
      rows: [
        [format(today, 'yyyy-MM-dd'), 'PAGI', 150, 'Berjalan lancar'],
        ['', '', null, ''],
        ['', '', null, ''],
        ['', '', null, ''],
        ['', '', null, '']
      ]
    });

    sheetProduksi.getColumn('A').width = 20;
    sheetProduksi.getColumn('B').width = 15;
    sheetProduksi.getColumn('C').width = 20;
    sheetProduksi.getColumn('D').width = 40;

    for (let i = 2; i <= 1000; i++) {
      // Validation for Shift
      sheetProduksi.getCell(`B${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"PAGI,SIANG,MALAM"'],
        showErrorMessage: true,
        errorTitle: 'Shift Tidak Valid',
        error: 'Pilih antara PAGI, SIANG, atau MALAM'
      };
      sheetProduksi.getCell(`C${i}`).numFmt = '#,##0.00 "kg"';
      sheetProduksi.getCell(`A${i}`).numFmt = 'yyyy-mm-dd';
    }

    // ==========================================
    // SHEET 3: DATA PENJUALAN
    // ==========================================
    const sheetPenjualan = workbook.addWorksheet('3. Data Penjualan', {
      views: [{ state: 'frozen', ySplit: 1 }]
    });

    sheetPenjualan.addTable({
      name: 'TabelPenjualan',
      ref: 'A1',
      headerRow: true,
      totalsRow: false,
      style: {
        theme: 'TableStyleMedium2', // Blue theme for sales
        showRowStripes: true,
      },
      columns: [
        { name: 'Tanggal Transaksi', filterButton: true },
        { name: 'Nama Pelanggan', filterButton: true },
        { name: 'Total Terjual (Kg)', filterButton: true },
        { name: 'Event / Catatan', filterButton: false }
      ],
      rows: [
        [format(today, 'yyyy-MM-dd'), 'Toko Oleh-oleh Bu Tini', 50, 'Pesanan rutin mingguan'],
        ['', '', null, ''],
        ['', '', null, ''],
        ['', '', null, ''],
        ['', '', null, '']
      ]
    });

    sheetPenjualan.getColumn('A').width = 20;
    sheetPenjualan.getColumn('B').width = 30;
    sheetPenjualan.getColumn('C').width = 20;
    sheetPenjualan.getColumn('D').width = 40;

    for (let i = 2; i <= 1000; i++) {
      sheetPenjualan.getCell(`C${i}`).numFmt = '#,##0.00 "kg"';
      sheetPenjualan.getCell(`A${i}`).numFmt = 'yyyy-mm-dd';
    }

    // Activate the first sheet
    workbook.views = [{ activeTab: 0 } as any];

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Template_Data_Historis_KhumKhum_Pro.xlsx"',
      },
    });
  } catch (error: any) {
    console.error('Error generating Excel template:', error);
    return NextResponse.json({ error: 'Gagal membuat template Excel' }, { status: 500 });
  }
}
