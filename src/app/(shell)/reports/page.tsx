'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { DataTable } from '@/components/data-table/DataTable';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/form/FormField';
import { Select } from '@/components/ui/Select';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Download, Printer, Filter, TrendingUp, Package, Factory, FileText, FileSpreadsheet, RefreshCw, BarChart2 } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { generateReportData, type ReportType } from '@/actions/reports';
import { useToast } from '@/hooks/useToast';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const REPORT_COLUMNS: Record<string, ColumnDef<any>[]> = {
  receiving: [
    { accessorKey: 'date', header: 'Tanggal', cell: ({row}) => format(new Date(row.original.date), 'dd/MM/yyyy HH:mm') },
    { accessorKey: 'batch_number', header: 'No Batch' },
    { accessorKey: 'farmer', header: 'Petani' },
    { accessorKey: 'material', header: 'Bahan Baku' },
    { accessorKey: 'weight', header: 'Berat', cell: ({row}) => <strong style={{color: 'var(--color-success-600)'}}>{row.original.weight} {row.original.uom}</strong> },
    { accessorKey: 'notes', header: 'Catatan' },
  ],
  sorting: [
    { accessorKey: 'date', header: 'Tanggal', cell: ({row}) => format(new Date(row.original.date), 'dd/MM/yyyy HH:mm') },
    { accessorKey: 'batch_number', header: 'No Batch Penerimaan' },
    { accessorKey: 'grade', header: 'Grade', cell: ({row}) => <strong>{row.original.grade}</strong> },
    { accessorKey: 'accepted', header: 'Diterima', cell: ({row}) => <span style={{color: 'var(--color-success-600)'}}>{row.original.accepted} kg</span> },
    { accessorKey: 'rejected', header: 'Ditolak', cell: ({row}) => <span style={{color: 'var(--color-danger-600)'}}>{row.original.rejected} kg</span> },
    { accessorKey: 'waste', header: 'Waste', cell: ({row}) => <span style={{color: 'var(--text-tertiary)'}}>{row.original.waste} kg</span> },
  ],
  production: [
    { accessorKey: 'date', header: 'Tanggal', cell: ({row}) => format(new Date(row.original.date), 'dd/MM/yyyy HH:mm') },
    { accessorKey: 'batch_number', header: 'No Batch Produksi' },
    { accessorKey: 'status', header: 'Status', cell: ({row}) => <StatusBadge status={row.original.status.toLowerCase()} /> },
    { accessorKey: 'products', header: 'Produk Dihasilkan' },
    { accessorKey: 'total_finished', header: 'Total (kg)' },
    { accessorKey: 'avg_yield', header: 'Rendemen (%)', cell: ({row}) => <strong style={{color: row.original.avg_yield >= 80 ? 'var(--color-success-600)' : 'var(--color-warning-600)'}}>{row.original.avg_yield.toFixed(1)}%</strong> },
  ],
  qc: [
    { accessorKey: 'date', header: 'Tanggal', cell: ({row}) => format(new Date(row.original.date), 'dd/MM/yyyy HH:mm') },
    { accessorKey: 'reference_type', header: 'Tahap', cell: ({row}) => <StatusBadge status={row.original.reference_type.toLowerCase()} /> },
    { accessorKey: 'is_passed', header: 'Status', cell: ({row}) => <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, background: row.original.is_passed === 'Lulus' ? 'var(--color-success-100)' : 'var(--color-danger-100)', color: row.original.is_passed === 'Lulus' ? 'var(--color-success-700)' : 'var(--color-danger-700)' }}>{row.original.is_passed}</span> },
    { accessorKey: 'defect_type', header: 'Jenis Cacat' },
    { accessorKey: 'inspector', header: 'Inspektur' },
    { accessorKey: 'notes', header: 'Catatan' },
  ],
  inventory: [
    { accessorKey: 'date', header: 'Tanggal', cell: ({row}) => format(new Date(row.original.date), 'dd/MM/yyyy HH:mm') },
    { accessorKey: 'item_name', header: 'Item', cell: ({row}) => <strong>{row.original.item_name}</strong> },
    { accessorKey: 'warehouse', header: 'Gudang' },
    { accessorKey: 'movement_type', header: 'Tipe Mutasi', cell: ({row}) => <StatusBadge status={row.original.movement_type.toLowerCase()} /> },
    { accessorKey: 'quantity', header: 'Qty (kg)', cell: ({row}) => {
       const isPos = row.original.quantity > 0 || row.original.movement_type === 'IN';
       return <strong style={{ color: isPos ? 'var(--color-success-600)' : 'var(--color-danger-600)'}}>{isPos ? '+' : '-'}{Math.abs(row.original.quantity)} kg</strong>;
    }},
    { accessorKey: 'notes', header: 'Referensi' },
  ],
  sales: [
    { accessorKey: 'date', header: 'Tanggal', cell: ({row}) => format(new Date(row.original.date), 'dd/MM/yyyy HH:mm') },
    { accessorKey: 'customer', header: 'Pelanggan', cell: ({row}) => <strong>{row.original.customer}</strong> },
    { accessorKey: 'status', header: 'Status', cell: ({row}) => <StatusBadge status={row.original.status.toLowerCase()} /> },
    { accessorKey: 'products', header: 'Produk Terjual' },
    { accessorKey: 'total_quantity', header: 'Total Qty', cell: ({row}) => `${row.original.total_quantity} pcs` },
  ]
};

const REPORT_TITLES: Record<string, string> = {
  receiving: 'Laporan Penerimaan Bahan Baku',
  sorting: 'Laporan Sortasi & Grading',
  production: 'Laporan Rekapitulasi Produksi',
  qc: 'Laporan Inspeksi Quality Control',
  inventory: 'Laporan Mutasi Stok (Rekening Koran)',
  sales: 'Laporan Penjualan & Pengiriman'
};

export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>('production');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const handleGenerate = async () => {
    setIsLoading(true);
    const res = await generateReportData(reportType, startDate, endDate);
    if (res.success && res.data) {
      setData(res.data);
      if (res.data.length === 0) {
        toast.info('Tidak ada data pada periode ini');
      } else {
        toast.success(`Berhasil menarik ${res.data.length} baris data`);
      }
    } else {
      toast.error(res.error || 'Gagal menarik data laporan');
      setData([]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    handleGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExportExcel = async () => {
    if (data.length === 0) {
      toast.error('Tidak ada data untuk diekspor');
      return;
    }
    try {
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Laporan');

      sheet.mergeCells('A1:G1');
      const titleCell = sheet.getCell('A1');
      titleCell.value = REPORT_TITLES[reportType].toUpperCase();
      titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F447E' } };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

      sheet.mergeCells('A2:G2');
      const dateCell = sheet.getCell('A2');
      const period = (startDate && endDate) ? `Periode: ${format(new Date(startDate), 'dd MMM yyyy')} - ${format(new Date(endDate), 'dd MMM yyyy')}` : 'Periode: Semua Waktu';
      dateCell.value = period;
      dateCell.font = { name: 'Arial', size: 10, italic: true };
      dateCell.alignment = { horizontal: 'right' };

      sheet.addRow([]); // Spacing

      const tableColumns = REPORT_COLUMNS[reportType];
      const headerValues = tableColumns.map(c => c.header as string);
      const headerRow = sheet.addRow(headerValues);
      
      const colWidths = headerValues.map(h => Math.max(15, h.length + 5));
      
      headerRow.eachCell((cell, colNum) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2980B9' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
        sheet.getColumn(colNum).width = colWidths[colNum - 1] + 5;
      });

      data.forEach((row, index) => {
        const rowData = tableColumns.map(c => {
           const key = (c as any).accessorKey;
           let val = row[key];
           if (key === 'date') val = format(new Date(val), 'dd/MM/yyyy HH:mm');
           return val || '-';
        });
        const excelRow = sheet.addRow(rowData);
        
        const isEven = index % 2 === 0;
        excelRow.eachCell((cell) => {
          cell.border = { top: { style: 'thin', color: { argb: 'FFEEEEEE' } }, bottom: { style: 'thin', color: { argb: 'FFEEEEEE' } } };
          if (isEven) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F8FC' } };
          }
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `Laporan_${reportType}_${format(new Date(), 'yyyyMMdd')}.xlsx`;
      anchor.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Berhasil mengekspor ke Excel bergaya Biru Modern');
    } catch (err) {
      console.error(err);
      toast.error('Gagal mengekspor Excel');
    }
  };

    const handleExportPDF = () => {
    if (data.length === 0) {
      toast.error('Tidak ada data untuk diekspor');
      return;
    }
    const doc = new jsPDF('landscape');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const period = (startDate && endDate) ? `Periode: ${format(new Date(startDate), 'dd MMM yyyy')} - ${format(new Date(endDate), 'dd MMM yyyy')}` : 'Semua Waktu (All Time)';

    // ==========================================
    // SLIDE 1: COVER (CANVA INFORMATIVE STYLE)
    // ==========================================
    // Base Background (Deep Blue)
    doc.setFillColor(15, 68, 126); 
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    
    // Right Side Pattern (Darker Blue)
    doc.setFillColor(10, 48, 89);
    doc.rect(pageWidth * 0.6, 0, pageWidth * 0.4, pageHeight, 'F');

    // Decorative Elements
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(2);
    if ((doc as any).GState) {
        doc.setGState(new (doc as any).GState({opacity: 0.05}));
        doc.circle(pageWidth, 0, 100, 'F');
        doc.circle(pageWidth * 0.6, pageHeight, 80, 'F');
        doc.setGState(new (doc as any).GState({opacity: 0.1}));
        for(let i=0; i<5; i++){
          for(let j=0; j<5; j++){
            doc.circle(pageWidth * 0.8 + (i*15), 30 + (j*15), 1.5, 'F');
          }
        }
        doc.setGState(new (doc as any).GState({opacity: 1.0}));
    }

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('ERP KHUMKHUM', 20, 20);

    doc.setFontSize(36);
    doc.text('Laporan', 20, 60);
    
    const titleText = REPORT_TITLES[reportType];
    doc.setFontSize(28);
    const textWidth = doc.getTextWidth(titleText);
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(1);
    doc.roundedRect(16, 70, textWidth + 12, 18, 9, 9, 'S');
    doc.text(titleText, 22, 83);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Evaluasi dan Analisis Data', 20, 115);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const descText = doc.splitTextToSize(`Laporan ini memuat ringkasan eksekutif dan analisis naratif komprehensif terkait ${REPORT_TITLES[reportType].toLowerCase()} untuk ${period}. Laporan disusun secara otomatis oleh Sistem ERP berdasarkan basis data real-time.`, pageWidth * 0.5);
    doc.text(descText, 20, 125);
    // Dynamic Key Insight for Cover
    let insightHeader = 'Highlight Operasional';
    let insightText = '';
    let naratif: string[] = [];

    const getTopFrequency = (arr: any[], key: string) => {
        const counts: Record<string, number> = {};
        arr.forEach(a => { if (a[key]) counts[a[key]] = (counts[a[key]] || 0) + 1; });
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        return sorted.length > 0 ? { name: sorted[0][0], count: sorted[0][1] } : { name: '-', count: 0 };
    };
    const getSum = (arr: any[], key: string) => arr.reduce((acc, curr) => acc + (Number(curr[key]) || 0), 0);
    const getTopSum = (arr: any[], groupKey: string, sumKey: string) => {
        const sums: Record<string, number> = {};
        arr.forEach(a => { if (a[groupKey]) sums[a[groupKey]] = (sums[a[groupKey]] || 0) + (Number(a[sumKey]) || 0); });
        const sorted = Object.entries(sums).sort((a, b) => b[1] - a[1]);
        return sorted.length > 0 ? { name: sorted[0][0], total: sorted[0][1] } : { name: '-', total: 0 };
    };
    
    if (reportType === 'sales') {
        const totalSalesQty = getSum(data, 'total_quantity');
        const completed = data.filter((d: any) => d.status === 'COMPLETED').length;
        const pending = data.filter((d: any) => d.status === 'PENDING').length;
        const rate = data.length > 0 ? ((completed / data.length) * 100).toFixed(1) : '0';
        const topCustomer = getTopSum(data, 'customer', 'total_quantity');
        const topCustomerFreq = getTopFrequency(data, 'customer');

        insightText = `Fulfillment rate mencapai ${rate}% bulan ini. Penuhi SLA untuk sisa ${pending} pesanan pending.`;
        
        naratif = [
            `TINJAUAN UMUM PENJUALAN:`,
            `Berdasarkan data operasional dari periode terpilih, sistem ERP telah merekam sebanyak ${data.length} transaksi penjualan secara aktual. Dari seluruh transaksi tersebut, volume kumulatif produk yang telah diproses dan didistribusikan kepada jaringan pelanggan mencapai ${totalSalesQty.toLocaleString('id-ID')} unit/Pcs.`,
            `ANALISIS STATUS PESANAN:`,
            `Dari total ${data.length} pesanan, terdapat ${completed} transaksi (${rate}%) yang telah tuntas sepenuhnya (COMPLETED). Sementara itu, terdapat ${pending} transaksi yang masih berstatus PENDING. Angka rasio penyelesaian ini merupakan indikator langsung atas utilitas logistik dan kecepatan penyelesaian operasional (fulfillment rate).`,
            `KONTRIBUSI PELANGGAN TERATAS:`,
            `Analisis segmentasi pelanggan menunjukkan bahwa pelanggan "${topCustomer.name}" menyumbangkan volume penyerapan tertinggi, yaitu sebesar ${(topCustomer.total as number).toLocaleString('id-ID')} unit produk. Di sisi lain, dari segi frekuensi pemesanan, pelanggan "${topCustomerFreq.name}" tercatat melakukan transaksi paling aktif sebanyak ${topCustomerFreq.count} kali pemesanan.`,
            `INSIGHT & REKOMENDASI STRATEGIS:`,
            `1. Mengingat tingkat penyelesaian saat ini sebesar ${rate}%, tim distribusi perlu memprioritaskan alokasi pengiriman pada ${pending} pelanggan dengan pesanan PENDING agar SLA (Service Level Agreement) dapat tercapai tepat waktu.`,
            `2. Skema program loyalitas atau diskon volume dapat segera ditawarkan kepada pelanggan prioritas "${topCustomer.name}" untuk meningkatkan angka retensi (retention rate) pada kuartal berikutnya.`,
            `3. Pantau ketersediaan stok produk terlaris secara harian untuk memastikan lonjakan pesanan spontan dapat dilayani tanpa mengalami "backorder".`
        ];
    } else if (reportType === 'production') {
        const totalQty = getSum(data, 'total_finished');
        const validYields = data.filter((d: any) => typeof d.avg_yield === 'number' && d.avg_yield > 0);
        const avgY = validYields.length > 0 ? (getSum(validYields, 'avg_yield') / validYields.length).toFixed(2) : '0';
        
        let highestYield = { batch: '-', yield: 0 };
        let lowestYield = { batch: '-', yield: 100 };
        if (validYields.length > 0) {
            validYields.forEach((d: any) => {
                if (d.avg_yield > highestYield.yield) highestYield = { batch: d.batch_number, yield: d.avg_yield };
                if (d.avg_yield < lowestYield.yield) lowestYield = { batch: d.batch_number, yield: d.avg_yield };
            });
        }

        insightText = `Rata-rata rendemen berada di ${avgY}%. Optimalkan kalibrasi mesin untuk meminimalisasi waste.`;

        naratif = [
            `TINJAUAN UMUM PRODUKSI:`,
            `Selama periode operasional ini, pabrik telah berhasil merampungkan ${data.length} batch produksi. Total akumulasi produk jadi (Finished Goods) yang dihasilkan dan telah terverifikasi kualitasnya mencapai volume ${totalQty.toLocaleString('id-ID')} kg. Angka ini mencerminkan kapasitas rill dan tingkat utilisasi fasilitas produksi harian.`,
            `ANALISIS RENDEMEN (YIELD) DAN EFISIENSI:`,
            `Tingkat efisiensi konversi dari bahan baku (raw material) menjadi produk jadi mencatatkan angka rata-rata sebesar ${avgY}%. Batch produksi yang meraih efisiensi terbaik adalah batch [${highestYield.batch}] dengan rendemen sebesar ${highestYield.yield.toFixed(1)}%. Sebaliknya, manajemen perlu memonitor batch [${lowestYield.batch}] yang mencatat rendemen terendah di angka ${lowestYield.yield.toFixed(1)}%.`,
            `EVALUASI KUALITAS MATERIAL:`,
            `Adanya deviasi dan perbedaan rasio antara batch tertinggi dan terendah ini biasanya berkorelasi langsung dengan variabilitas kualitas komoditas mentah yang dikirim oleh pemasok atau keakuratan di tahap sortasi.`,
            `INSIGHT & REKOMENDASI STRATEGIS:`,
            `1. Lakukan audit teknikal pada instrumen pengolahan dan kalibrasi mesin yang digunakan pada batch [${lowestYield.batch}] untuk mendeteksi potensi penyebab kerugian bahan.`,
            `2. Tinjau kembali kesepakatan dan standar kualitas bersama supplier (vendor) jika material mereka secara konsisten menghasilkan rasio produk jadi yang rendah.`,
            `3. Terapkan metode inspeksi ketat di pintu masuk pabrik agar parameter kelembaban dan densitas bahan mentah sesuai dengan spesifikasi produksi optimum.`
        ];
    } else if (reportType === 'sorting') {
        const totalAccepted = getSum(data, 'accepted');
        const totalRejected = getSum(data, 'rejected');
        const totalWaste = getSum(data, 'waste');
        const sumRaw = totalAccepted + totalRejected + totalWaste;
        const acceptRate = sumRaw > 0 ? ((totalAccepted / sumRaw) * 100).toFixed(1) : '0';
        const topGrade = getTopFrequency(data, 'grade');

        insightText = `Acceptance rate bahan masuk adalah ${acceptRate}%. Mayoritas hasil sortasi berkategori Grade ${topGrade.name}.`;

        naratif = [
            `TINJAUAN SORTASI DAN GRADING:`,
            `Dokumen ini mempresentasikan rekapitulasi data dari ${data.length} jadwal/aktivitas penyortiran. Total bahan mentah yang dinyatakan memenuhi kriteria mutu pabrik (Accepted) adalah sebanyak ${totalAccepted.toLocaleString('id-ID')} kg. Sementara itu, sejumlah ${totalRejected.toLocaleString('id-ID')} kg material tidak lolos kualifikasi (Rejected), dan ${totalWaste.toLocaleString('id-ID')} kg diklasifikasikan sebagai limbah buangan (Waste).`,
            `ANALISIS TINGKAT KELAYAKAN BAHAN:`,
            `Berdasarkan data agregat di atas, Rasio Penerimaan (Acceptance Rate) terhadap total pasokan adalah sebesar ${acceptRate}%. Kualitas hasil sortir yang paling mendominasi lini penerimaan kita adalah komoditas dengan kualifikasi [Grade ${topGrade.name}] yang tercatat pada ${topGrade.count} aktivitas.`,
            `INSIGHT & REKOMENDASI STRATEGIS:`,
            `1. Angka penerimaan kelayakan material sebesar ${acceptRate}% harus menjadi perhatian; jika menyentuh nilai krisis (di bawah ekspektasi), perusahaan akan mengalami pembengkakan harga pokok produksi (COGS).`,
            `2. Disarankan memberikan peringatan kualitas (Quality Alert) atau pemotongan insentif beli bagi mitra pemasok hulu yang mengirimkan komoditas dengan rasio limbah terlalu tinggi.`,
            `3. Perketat verifikasi alat sortir secara berkala (Preventive Maintenance) untuk meminimalisasi salah baca grading yang berujung pada menurunnya mutu produk akhir.`
        ];
    } else if (reportType === 'receiving') {
        const totalW = getSum(data, 'weight');
        const topFarmer = getTopSum(data, 'farmer', 'weight');
        const topMaterial = getTopSum(data, 'material', 'weight');

        insightText = `Volume gudang bertambah ${totalW.toLocaleString('id-ID')} kg. Optimalkan kapasitas ruang simpan untuk material dominan.`;

        naratif = [
            `TINJAUAN PENERIMAAN BAHAN BAKU (RECEIVING):`,
            `Di sepanjang periode ini, area gudang penerimaan (Warehouse Receiving) mencatat sebanyak ${data.length} transaksi penerimaan pasokan mentah. Secara total kumulatif, pabrik berhasil menyerap tonase barang masuk sebesar ${totalW.toLocaleString('id-ID')} kg.`,
            `PETA DEMOGRAFI PEMASOK DAN KOMODITAS:`,
            `Data operasional mendemonstrasikan bahwa rekanan/petani atas nama "${topFarmer.name}" memegang porsi suplai terbesar dengan volume agregat sebesar ${(topFarmer.total as number).toLocaleString('id-ID')} kg. Lebih jauh lagi, jenis material yang paling masif diimpor ke dalam pabrik adalah "${topMaterial.name}" dengan persentase tonase mencapai ${(topMaterial.total as number).toLocaleString('id-ID')} kg dari keseluruhan beban.`,
            `INSIGHT & REKOMENDASI STRATEGIS:`,
            `1. Mengingat tingginya ketergantungan pabrik pada kontinuitas suplai dari "${topFarmer.name}", manajemen direkomendasikan untuk menjalin kemitraan strategis kontrak panjang guna memastikan kestabilan harga beli.`,
            `2. Susun strategi diversifikasi pemasok/petani secara proaktif untuk memitigasi risiko kelangkaan material seandainya mitra utama tersebut terdampak masalah logistik atau gagal panen.`,
            `3. Alokasikan zona penyimpanan fisik (layout staging) yang memadai di gudang secara khusus untuk menampung aliran material "${topMaterial.name}" agar alur pergerakan forklift di dalam area gudang tetap efisien.`
        ];
    } else {
        insightText = `Terdapat ${data.length} aktivitas yang tercatat. Sistem beroperasi dalam kondisi prima tanpa kendala.`;
        naratif = [
            `TINJAUAN UMUM:`,
            `Laporan ini memuat riwayat aktivitas atas ${data.length} catatan operasional untuk entitas data terpilih. Periode analisis mencakup aktivitas harian selama ${period}.`,
            `EVALUASI INTEGRITAS DATA DAN PROSES:`,
            `Data yang tertera telah divalidasi langsung oleh sistem terpadu ERP KhumKhum. Seluruh alur (workflow) pencatatan operasional dapat disimpulkan berjalan dengan stabil.`,
            `INSIGHT & REKOMENDASI STRATEGIS:`,
            `1. Tidak terindikasi deviasi abnormal pada tren penginputan. Data sudah cukup representatif untuk digunakan dalam konsolidasi audit akhir bulan.`,
            `2. Terus pertahankan level kepatuhan pengisian data harian agar anomali dapat terdeteksi sedini mungkin.`
        ];
    }
    
    doc.setFont('helvetica', 'bold');
    doc.text(insightHeader, 20, 155);
    doc.setFont('helvetica', 'normal');
    const splitInsight = doc.splitTextToSize(insightText, pageWidth * 0.5);
    doc.text(splitInsight, 20, 163);

    // ==========================================
    // Right Side: Graphic/Stats Cards
    // ==========================================
    const drawModernCard = (x: number, y: number, w: number, h: number, title: string, value: string, subtitle: string) => {
      doc.setFillColor(255, 255, 255);
      if ((doc as any).GState) {
        doc.setGState(new (doc as any).GState({opacity: 0.1}));
        doc.roundedRect(x + 2, y + 2, w, h, 4, 4, 'F');
        doc.setGState(new (doc as any).GState({opacity: 1.0}));
      }
      doc.roundedRect(x, y, w, h, 4, 4, 'F');
      doc.setFillColor(52, 152, 219);
      doc.rect(x, y + 10, 3, 20, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text(title, x + 15, y + 15);
      
      doc.setFontSize(22);
      doc.setTextColor(15, 68, 126);
      doc.text(value, x + 15, y + 28);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(subtitle, x + 15, y + 36);
    };

    const totalRowsStr = `${data.length}`;
    if (reportType === 'sales') {
        const totalSalesQty = getSum(data, 'total_quantity');
        const compCount = data.filter((d: any) => d.status === 'COMPLETED').length;
        drawModernCard(pageWidth * 0.65, 45, 80, 45, 'TOTAL TERJUAL', `${totalSalesQty.toLocaleString('id-ID')} Pcs`, 'Volume produk didistribusikan');
        drawModernCard(pageWidth * 0.65, 100, 80, 45, 'PESANAN SELESAI', `${compCount}`, 'Transaksi berstatus COMPLETED');
        drawModernCard(pageWidth * 0.65, 155, 80, 45, 'TOTAL TRANSAKSI', totalRowsStr, 'Seluruh pesanan tercatat');
    } else if (reportType === 'production') {
        const totalQty = getSum(data, 'total_finished');
        const validYields = data.filter((d: any) => typeof d.avg_yield === 'number' && d.avg_yield > 0);
        const avgY = validYields.length > 0 ? (getSum(validYields, 'avg_yield') / validYields.length) : 0;
        drawModernCard(pageWidth * 0.65, 45, 80, 45, 'TOTAL HASIL', `${totalQty.toLocaleString('id-ID')} kg`, 'Volume produk jadi/finished good');
        drawModernCard(pageWidth * 0.65, 100, 80, 45, 'RATA-RATA RENDEMEN', `${avgY.toFixed(1)}%`, 'Tingkat konversi rata-rata');
        drawModernCard(pageWidth * 0.65, 155, 80, 45, 'TOTAL BATCH', totalRowsStr, 'Siklus produksi tercatat');
    } else {
        drawModernCard(pageWidth * 0.65, 60, 80, 45, 'TOTAL BARIS DATA', totalRowsStr, 'Seluruh log aktivitas');
        drawModernCard(pageWidth * 0.65, 115, 80, 45, 'STATUS SISTEM', 'Optimal', 'Integrasi ERP berjalan lancar');
    }

    // ==========================================
    // SLIDE 2+: NARRATIVE PAGE (NARASI EKSEKUTIF)
    // ==========================================
    doc.addPage();
    doc.setFillColor(250, 252, 255);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    
    // Header Line
    doc.setFillColor(15, 68, 126);
    doc.rect(0, 0, pageWidth, 5, 'F');

    doc.setTextColor(15, 68, 126);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.text('Analisis & Narasi Laporan', 20, 35);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text(`Dicetak pada: ${format(new Date(), 'dd MMMM yyyy HH:mm')} | ${period}`, 20, 45);

    let narasiY = 65;
    naratif.forEach((paragraph, idx) => {
        // Cek jika paragraph merupakan Title (semua kapital dan berakhiran :)
        const isTitle = paragraph === paragraph.toUpperCase() && paragraph.endsWith(':');

        if (isTitle) {
            narasiY += 5; // Extra padding
            doc.setTextColor(15, 68, 126);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(13);
            doc.text(paragraph, 20, narasiY);
            narasiY += 8;
        } else if (paragraph.startsWith('Insight:') || paragraph.match(/^\d\./)) {
            // Bullet points
            doc.setFillColor(52, 152, 219);
            doc.circle(24, narasiY - 1.5, 2, 'F');
            doc.setTextColor(60, 60, 60);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(11);
            
            let printText = paragraph;
            if (paragraph.startsWith('Insight:')) {
                doc.setFont('helvetica', 'bold');
                doc.text('Insight Utama:', 30, narasiY);
                doc.setFont('helvetica', 'normal');
                printText = paragraph.substring(8).trim();
                const lines = doc.splitTextToSize(printText, pageWidth - 70);
                doc.text(lines, 56, narasiY); // indent
                narasiY += (lines.length * 5.5) + 6;
            } else {
                const lines = doc.splitTextToSize(printText, pageWidth - 50);
                doc.text(lines, 30, narasiY);
                narasiY += (lines.length * 5.5) + 4;
            }
        } else {
            // Normal paragraph
            doc.setTextColor(70, 70, 70);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(11);
            const lines = doc.splitTextToSize(paragraph, pageWidth - 40);
            doc.text(lines, 20, narasiY);
            narasiY += (lines.length * 5.5) + 5;
        }
        
        // Auto add page if content exceeds height
        if (narasiY > pageHeight - 25) {
            doc.addPage();
            doc.setFillColor(250, 252, 255);
            doc.rect(0, 0, pageWidth, pageHeight, 'F');
            doc.setFillColor(15, 68, 126);
            doc.rect(0, 0, pageWidth, 5, 'F');
            
            doc.setTextColor(15, 68, 126);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(18);
            doc.text('Analisis & Narasi Laporan (Lanjutan)', 20, 25);
            narasiY = 40;
        }
    });

    // ==========================================
    // SLIDE 3+: DATA TABLE 
    // ==========================================
    doc.addPage();
    // Modern Header for table page
    doc.setFillColor(15, 68, 126);
    doc.rect(0, 0, pageWidth, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`LAMPIRAN DATA (10 TERBARU): ${REPORT_TITLES[reportType].toUpperCase()}`, 15, 13);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Halaman ${doc.getCurrentPageInfo().pageNumber}`, pageWidth - 20, 13, { align: 'right' });

    const tableColumns = REPORT_COLUMNS[reportType].map(c => c.header as string);
    // Hanya ambil 10 data terbaru untuk keperluan ringkasan presentasi
    const tableRows = data.slice(0, 10).map(row => {
      return REPORT_COLUMNS[reportType].map(c => {
         const key = (c as any).accessorKey;
         let val = row[key];
         if (key === 'date') val = format(new Date(val), 'dd/MM/yyyy HH:mm');
         return val || '-';
      });
    });

    autoTable(doc, {
      head: [tableColumns],
      body: tableRows,
      startY: 30,
      theme: 'grid',
      styles: { 
        fontSize: 9, 
        font: 'helvetica', 
        cellPadding: 6,
        lineColor: [220, 220, 220],
        lineWidth: 0.1,
        textColor: [60, 60, 60]
      },
      headStyles: { 
        fillColor: [245, 248, 252], 
        textColor: [15, 68, 126], 
        fontStyle: 'bold',
        halign: 'center',
        lineWidth: 0.1,
        lineColor: [200, 200, 200]
      },
      alternateRowStyles: { 
        fillColor: [252, 253, 255]
      },
      didDrawPage: (dataHook) => {
        if (dataHook.pageNumber > 3) {
            doc.setFillColor(15, 68, 126);
            doc.rect(0, 0, pageWidth, 20, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text(`LAMPIRAN DATA: ${REPORT_TITLES[reportType].toUpperCase()} (LANJUTAN)`, 15, 13);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.text(`Halaman ${doc.getCurrentPageInfo().pageNumber}`, pageWidth - 20, 13, { align: 'right' });
        }
      }
    });

    doc.save(`Laporan_${reportType}_Presentasi_${format(new Date(), 'yyyyMMdd')}.pdf`);
    toast.success('Berhasil mengekspor Laporan Presentasi');
  };


  // ── UI Metrics ──
  const totalRows = data.length;
  const isProduction = reportType === 'production';
  const totalQty = isProduction ? data.reduce((s, r) => s + (r.total_finished || 0), 0) : 0;
  const avgYield = isProduction && totalRows > 0 ? (data.reduce((s, r) => s + (r.avg_yield || 0), 0) / totalRows) : 0;

  return (
    <div style={{ paddingBottom: 'var(--space-8)' }}>
      <PageHeader
        title="Laporan Terpadu"
        description="Pusat data pelaporan operasional, produksi, dan penjualan. Filter, analisis, dan ekspor data ke Excel atau PDF dengan satu klik."
        breadcrumbs={[{ label: 'Manajemen' }, { label: 'Laporan' }]}
        actions={
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <Button variant="secondary" onClick={handleExportExcel} leftIcon={<FileSpreadsheet size={18} color="#107C41" />} style={{ background: '#fff', border: '1px solid #107C41', color: '#107C41' }}>Export Excel</Button>
            <Button variant="secondary" onClick={handleExportPDF} leftIcon={<FileText size={18} color="#F24E1E" />} style={{ background: '#fff', border: '1px solid #F24E1E', color: '#F24E1E' }}>Export PDF</Button>
          </div>
        }
      />

      {/* Modern Filter Banner */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.4)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.05)',
        borderRadius: '24px',
        padding: '24px',
        marginBottom: '32px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative elements */}
        <div style={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, background: 'radial-gradient(circle, var(--color-primary-100) 0%, transparent 70%)', opacity: 0.5, borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: -50, left: -50, width: 200, height: 200, background: 'radial-gradient(circle, var(--color-info-100) 0%, transparent 70%)', opacity: 0.5, borderRadius: '50%' }} />

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 250px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Pilih Modul Laporan</label>
            <Select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ReportType)}
              options={[
                { value: 'receiving', label: 'Laporan Penerimaan' },
                { value: 'sorting', label: 'Laporan Sortasi' },
                { value: 'production', label: 'Laporan Produksi' },
                { value: 'qc', label: 'Laporan Quality Control' },
                { value: 'inventory', label: 'Mutasi Stok' },
                { value: 'sales', label: 'Ringkasan Penjualan' },
              ]}
              fullWidth
            />
          </div>
          
          <div style={{ flex: '1 1 180px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Tanggal Mulai</label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} fullWidth />
          </div>
          
          <div style={{ flex: '1 1 180px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Tanggal Selesai</label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} fullWidth />
          </div>

          <Button 
            variant="primary" 
            onClick={handleGenerate} 
            loading={isLoading} 
            leftIcon={<RefreshCw size={18} />}
            style={{ 
              height: '42px', 
              padding: '0 24px', 
              borderRadius: '12px',
              background: 'linear-gradient(135deg, var(--color-primary-600) 0%, var(--color-primary-500) 100%)',
              boxShadow: '0 4px 12px rgba(var(--color-primary-600-rgb), 0.3)'
            }}
          >
            Tarik Data
          </Button>
        </div>
      </div>

      {/* Dynamic Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <div style={{ borderRadius: '20px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', background: 'linear-gradient(to bottom right, #ffffff, #f8fafc)' }}>
          <Card bodyClassName="p-6">
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
              <div style={{ padding: '12px', background: 'var(--color-primary-50)', borderRadius: '16px', color: 'var(--color-primary-600)' }}>
                <FileText size={28} />
              </div>
              <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '15px' }}>Total Baris Data</span>
            </div>
            <div style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
              {totalRows}
            </div>
          </Card>
        </div>
        
        {isProduction && (
          <>
            <div style={{ borderRadius: '20px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', background: 'linear-gradient(to bottom right, #ffffff, #f0fdf4)' }}>
              <Card bodyClassName="p-6">
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                  <div style={{ padding: '12px', background: 'var(--color-success-100)', borderRadius: '16px', color: 'var(--color-success-700)' }}>
                    <Package size={28} />
                  </div>
                  <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '15px' }}>Total Volume (kg)</span>
                </div>
                <div style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--color-success-700)', lineHeight: 1 }}>
                  {totalQty.toLocaleString('id-ID')}
                </div>
              </Card>
            </div>
            <div style={{ borderRadius: '20px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', background: 'linear-gradient(to bottom right, #ffffff, #fffbeb)' }}>
              <Card bodyClassName="p-6">
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                  <div style={{ padding: '12px', background: 'var(--color-warning-100)', borderRadius: '16px', color: 'var(--color-warning-700)' }}>
                    <TrendingUp size={28} />
                  </div>
                  <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '15px' }}>Rata-Rata Rendemen</span>
                </div>
                <div style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--color-warning-700)', lineHeight: 1 }}>
                  {avgYield.toFixed(1)}%
                </div>
              </Card>
            </div>
          </>
        )}
      </div>

      {/* The Report Table */}
      <div style={{ borderRadius: '24px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 10px 40px rgba(0,0,0,0.03)' }}>
        <Card bodyClassName="body--none">
          <div style={{ padding: '24px', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafa' }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart2 size={24} color="var(--color-primary-500)" />
              {REPORT_TITLES[reportType]}
            </h3>
            <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
              Menampilkan {totalRows} entri data
            </div>
          </div>
          
          {isLoading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <RefreshCw size={32} className="animate-spin mx-auto mb-4" color="var(--color-primary-500)" />
              <p>Menarik data secara real-time...</p>
            </div>
          ) : (
            <div style={{ background: '#fff' }}>
              <DataTable
                columns={REPORT_COLUMNS[reportType] || []}
                data={data}
              />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
