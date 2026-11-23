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

const safeFormatDate = (dateVal: any, pattern = 'dd/MM/yyyy HH:mm') => {
  if (!dateVal) return '-';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return format(d, pattern);
  } catch (_) {
    return String(dateVal || '-');
  }
};

const REPORT_COLUMNS: Record<string, ColumnDef<any>[]> = {
  receiving: [
    { accessorKey: 'date', header: 'Tanggal', cell: ({row}) => safeFormatDate(row.original?.date) },
    { accessorKey: 'batch_number', header: 'No Batch', cell: ({row}) => row.original?.batch_number || '-' },
    { accessorKey: 'farmer', header: 'Petani', cell: ({row}) => row.original?.farmer || '-' },
    { accessorKey: 'material', header: 'Bahan Baku', cell: ({row}) => row.original?.material || '-' },
    { accessorKey: 'weight', header: 'Berat', cell: ({row}) => <strong style={{color: 'var(--color-success-600)'}}>{row.original?.weight ?? 0} {row.original?.uom || 'kg'}</strong> },
    { accessorKey: 'notes', header: 'Catatan', cell: ({row}) => row.original?.notes || '-' },
  ],
  sorting: [
    { accessorKey: 'date', header: 'Tanggal', cell: ({row}) => safeFormatDate(row.original?.date) },
    { accessorKey: 'batch_number', header: 'No Batch Penerimaan', cell: ({row}) => row.original?.batch_number || '-' },
    { accessorKey: 'farmer', header: 'Petani', cell: ({row}) => row.original?.farmer || '-' },
    { accessorKey: 'grade', header: 'Grade', cell: ({row}) => <strong>{row.original?.grade || '-'}</strong> },
    { accessorKey: 'accepted', header: 'Diterima', cell: ({row}) => <span style={{color: 'var(--color-success-600)'}}>{row.original?.accepted ?? 0} kg</span> },
    { accessorKey: 'rejected', header: 'Ditolak', cell: ({row}) => <span style={{color: 'var(--color-danger-600)'}}>{row.original?.rejected ?? 0} kg</span> },
    { accessorKey: 'waste', header: 'Waste', cell: ({row}) => <span style={{color: 'var(--text-tertiary)'}}>{row.original?.waste ?? 0} kg</span> },
  ],
  production: [
    { accessorKey: 'date', header: 'Tanggal', cell: ({row}) => safeFormatDate(row.original?.date) },
    { accessorKey: 'batch_number', header: 'No Batch Produksi', cell: ({row}) => row.original?.batch_number || '-' },
    { accessorKey: 'status', header: 'Status', cell: ({row}) => <StatusBadge status={String(row.original?.status || 'unknown').toLowerCase()} /> },
    { accessorKey: 'products', header: 'Produk Dihasilkan', cell: ({row}) => row.original?.products || '-' },
    { accessorKey: 'total_finished', header: 'Total (kg)', cell: ({row}) => `${row.original?.total_finished ?? 0} kg` },
    { accessorKey: 'avg_yield', header: 'Rendemen (%)', cell: ({row}) => {
      const val = typeof row.original?.avg_yield === 'number'
        ? row.original.avg_yield
        : (parseFloat(row.original?.avg_yield) || 0);
      return <strong style={{color: val >= 80 ? 'var(--color-success-600)' : 'var(--color-warning-600)'}}>{val.toFixed(1)}%</strong>;
    }},
  ],
  qc: [
    { accessorKey: 'date', header: 'Tanggal', cell: ({row}) => safeFormatDate(row.original?.date) },
    { accessorKey: 'reference_type', header: 'Tahap', cell: ({row}) => <StatusBadge status={String(row.original?.reference_type || 'QC').toLowerCase()} /> },
    { accessorKey: 'is_passed', header: 'Status', cell: ({row}) => {
      const passed = row.original?.is_passed === 'Lulus' || row.original?.is_passed === true;
      return (
        <span style={{
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 600,
          background: passed ? 'var(--color-success-100)' : 'var(--color-danger-100)',
          color: passed ? 'var(--color-success-700)' : 'var(--color-danger-700)'
        }}>
          {passed ? 'Lulus' : 'Gagal'}
        </span>
      );
    }},
    { accessorKey: 'defect_type', header: 'Jenis Cacat', cell: ({row}) => row.original?.defect_type || '-' },
    { accessorKey: 'inspector', header: 'Inspektur', cell: ({row}) => row.original?.inspector || '-' },
    { accessorKey: 'notes', header: 'Catatan', cell: ({row}) => row.original?.notes || '-' },
  ],
  inventory: [
    { accessorKey: 'date', header: 'Tanggal', cell: ({row}) => safeFormatDate(row.original?.date) },
    { accessorKey: 'item_name', header: 'Item', cell: ({row}) => <strong>{row.original?.item_name || '-'}</strong> },
    { accessorKey: 'warehouse', header: 'Gudang', cell: ({row}) => row.original?.warehouse || '-' },
    { accessorKey: 'movement_type', header: 'Tipe Mutasi', cell: ({row}) => <StatusBadge status={String(row.original?.movement_type || 'movement').toLowerCase()} /> },
    { accessorKey: 'quantity', header: 'Kuantitas', cell: ({row}) => {
       const qty = Number(row.original?.quantity) || 0;
       const isPos = qty > 0 || row.original?.movement_type === 'IN';
       const unit = row.original?.uom || 'kg';
       return <strong style={{ color: isPos ? 'var(--color-success-600)' : 'var(--color-danger-600)'}}>{isPos ? '+' : '-'}{Math.abs(qty)} {unit}</strong>;
    }},
    { accessorKey: 'notes', header: 'Referensi', cell: ({row}) => row.original?.notes || '-' },
  ],
  sales: [
    { accessorKey: 'date', header: 'Tanggal', cell: ({row}) => safeFormatDate(row.original?.date) },
    { accessorKey: 'customer', header: 'Pelanggan', cell: ({row}) => <strong>{row.original?.customer || '-'}</strong> },
    { accessorKey: 'status', header: 'Status', cell: ({row}) => <StatusBadge status={String(row.original?.status || 'unknown').toLowerCase()} /> },
    { accessorKey: 'products', header: 'Produk Terjual', cell: ({row}) => row.original?.products || '-' },
    { accessorKey: 'total_quantity', header: 'Total Qty', cell: ({row}) => `${row.original?.total_quantity ?? 0} pcs` },
  ],
  frying: [
    { accessorKey: 'date', header: 'Tgl', cell: ({row}) => safeFormatDate(row.original?.date, 'dd/MM/yyyy') },
    { accessorKey: 'officer', header: 'Petugas', cell: ({row}) => row.original?.officer || '-' },
    { accessorKey: 'mushroom_code', header: 'Kode Jamur (Supplier-Tanggal)', cell: ({row}) => (
      <span style={{ fontWeight: 700, color: '#0F447E', background: '#F0F4F8', padding: '3px 8px', borderRadius: '4px' }}>
        {row.original?.mushroom_code || '-'}
      </span>
    )},
    { accessorKey: 'batch_number', header: 'No. Batch', cell: ({row}) => row.original?.batch_number || '-' },
    { accessorKey: 'shredded_mushroom_gram', header: 'Jamur Suwir (gr)', cell: ({row}) => `${row.original?.shredded_mushroom_gram ?? 0} gr` },
    { accessorKey: 'seasoned_flour_gram', header: 'Terigu Bumbu (gr)', cell: ({row}) => `${row.original?.seasoned_flour_gram ?? 0} gr` },
    { accessorKey: 'mushroom_broth', header: 'Kaldu Jamur', cell: ({row}) => row.original?.mushroom_broth || '-' },
    { accessorKey: 'frying_minutes', header: 'Menit Goreng', cell: ({row}) => `${row.original?.frying_minutes ?? 0} m` },
    { accessorKey: 'spinner_minutes', header: 'Menit Spinner', cell: ({row}) => `${row.original?.spinner_minutes ?? 0} m` },
    { accessorKey: 'output_chips', header: 'Gr/Kg Keripik', cell: ({row}) => (
      <strong style={{ color: 'var(--color-success-700)', fontWeight: 700 }}>
        {row.original?.output_chips || '-'}
      </strong>
    )},
  ]
};

const PENERIMAAN_COLUMNS: ColumnDef<any>[] = [
  { accessorKey: 'date', header: 'Tanggal', cell: ({row}) => safeFormatDate(row.original?.date, 'dd/MM/yyyy') },
  { accessorKey: 'supplier_name', header: 'Nama Supplier', cell: ({row}) => <strong>{row.original?.supplier_name || '-'}</strong> },
  { accessorKey: 'total_weight_kg', header: 'Berat Jamur (kg)', cell: ({row}) => <span style={{color: 'var(--color-primary-600)', fontWeight: 600}}>{row.original?.total_weight_kg ?? 0} kg</span> },
  { accessorKey: 'leaf_weight_kg', header: 'Berat Daun (kg)', cell: ({row}) => `${row.original?.leaf_weight_kg ?? 0} kg` },
  { accessorKey: 'stem_weight_kg', header: 'Berat Batang (kg)', cell: ({row}) => `${row.original?.stem_weight_kg ?? 0} kg` },
  { accessorKey: 'mushroom_code', header: 'Kode Jamur (Supplier-Tanggal)', cell: ({row}) => (
    <span style={{ fontWeight: 700, color: '#0F447E', background: '#F0F4F8', padding: '3px 8px', borderRadius: '4px' }}>
      {row.original?.mushroom_code || '-'}
    </span>
  )},
  { accessorKey: 'officer', header: 'Petugas', cell: ({row}) => row.original?.officer || '-' },
];

const REPORT_TITLES: Record<string, string> = {
  receiving: 'Laporan Penerimaan Bahan Baku',
  sorting: 'Laporan Sortasi & Grading',
  frying: 'Form Pengendalian Proses Produksi (Penggorengan)',
  production: 'Laporan Rekapitulasi Produksi',
  qc: 'Laporan Inspeksi Quality Control',
  inventory: 'Laporan Mutasi Stok (Rekening Koran)',
  sales: 'Laporan Penjualan & Pengiriman'
};

export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('khumkhum_report_type');
      if (saved && ['receiving', 'sorting', 'frying', 'production', 'qc', 'inventory', 'sales'].includes(saved)) {
        return saved as ReportType;
      }
    }
    return 'receiving';
  });
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [data, setData] = useState<any[]>([]);
  const [penerimaanData, setPenerimaanData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const handleGenerate = useCallback(async (typeToFetch?: ReportType, sDate?: string, eDate?: string, isManualClick = false) => {
    const targetType = typeToFetch || reportType;
    const fromDate = sDate !== undefined ? sDate : startDate;
    const toDate = eDate !== undefined ? eDate : endDate;

    setIsLoading(true);
    setData([]); // Bersihkan data sebelumnya agar tidak ada mismatch kolom dan baris
    setPenerimaanData([]);
    try {
      const res = await generateReportData(targetType, fromDate, toDate);
      if (res.success && res.data) {
        setData(res.data);
        if (res.metadata?.penerimaan) {
          setPenerimaanData(res.metadata.penerimaan);
        } else {
          setPenerimaanData([]);
        }
        if (isManualClick) {
          if (res.data.length === 0) {
            toast.info('Tidak ada data pada periode ini');
          } else {
            toast.success(`Berhasil menarik ${res.data.length} baris data`);
          }
        }
      } else {
        if (isManualClick) toast.error(res.error || 'Gagal menarik data laporan');
        setData([]);
        setPenerimaanData([]);
      }
    } catch (err: any) {
      if (isManualClick) toast.error('Terjadi kesalahan saat memuat data laporan');
      setData([]);
      setPenerimaanData([]);
    } finally {
      setIsLoading(false);
    }
  }, [reportType, startDate, endDate, toast]);

  // Otomatis tarik data saat halaman dibuka atau saat tipe modul laporan berubah
  useEffect(() => {
    handleGenerate(reportType, startDate, endDate, false);
  }, [reportType]);

  const handleExportExcel = async () => {
    if (data.length === 0 && penerimaanData.length === 0) {
      toast.error('Tidak ada data untuk diekspor');
      return;
    }
    try {
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'ERP Khumkhum';
      workbook.created = new Date();

      const period = (startDate && endDate) 
        ? `Periode: ${format(new Date(startDate), 'dd MMM yyyy')} - ${format(new Date(endDate), 'dd MMM yyyy')}` 
        : 'Periode: Semua Waktu';

      const thinBorder = {
        top: { style: 'thin' as const, color: { argb: 'FFD0D7DE' } },
        bottom: { style: 'thin' as const, color: { argb: 'FFD0D7DE' } },
        left: { style: 'thin' as const, color: { argb: 'FFD0D7DE' } },
        right: { style: 'thin' as const, color: { argb: 'FFD0D7DE' } },
      };

      const headerBorder = {
        top: { style: 'thin' as const, color: { argb: 'FF8C9BAE' } },
        bottom: { style: 'medium' as const, color: { argb: 'FF0F447E' } },
        left: { style: 'thin' as const, color: { argb: 'FF8C9BAE' } },
        right: { style: 'thin' as const, color: { argb: 'FF8C9BAE' } },
      };

      const summaryBorder = {
        top: { style: 'thin' as const, color: { argb: 'FF0F447E' } },
        bottom: { style: 'double' as const, color: { argb: 'FF0F447E' } },
        left: { style: 'thin' as const, color: { argb: 'FFD0D7DE' } },
        right: { style: 'thin' as const, color: { argb: 'FFD0D7DE' } },
      };

      if (reportType === 'frying') {
        // ==========================================
        // SHEET 1: DATA PENERIMAAN BAHAN BAKU
        // ==========================================
        const sheetRcv = workbook.addWorksheet('1. Penerimaan Bahan Baku', { views: [{ showGridLines: true }] });

        sheetRcv.mergeCells('A1:G1');
        const rcvT = sheetRcv.getCell('A1');
        rcvT.value = 'FORM PENGENDALIAN PROSES PRODUKSI - PENERIMAAN';
        rcvT.font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
        rcvT.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F447E' } };
        rcvT.alignment = { vertical: 'middle', horizontal: 'center' };
        sheetRcv.getRow(1).height = 30;

        sheetRcv.mergeCells('A2:G2');
        const rcvD = sheetRcv.getCell('A2');
        rcvD.value = `CV KHAIRA BUANA MANDIRI | ${period} | Dicetak: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`;
        rcvD.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF333333' } };
        rcvD.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4F8' } };
        rcvD.alignment = { vertical: 'middle', horizontal: 'center' };
        sheetRcv.getRow(2).height = 20;

        sheetRcv.addRow([]); // Spacing
        sheetRcv.getRow(3).height = 10;

        const rcvColsPure = ['Tanggal', 'Nama Supplier / Petani', 'Berat Jamur (kg)', 'Berat Daun (kg)', 'Berat Batang (kg)', 'Kode Jamur (Supplier-Tanggal)', 'Petugas Inbound'];
        const rcvColWidths = [14, 30, 18, 18, 18, 28, 22];
        rcvColWidths.forEach((w, idx) => sheetRcv.getColumn(idx + 1).width = w);

        const rcvHRowPure = sheetRcv.addRow(rcvColsPure);
        rcvHRowPure.height = 26;
        rcvHRowPure.eachCell(c => {
          c.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2B579A' } };
          c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
          c.border = headerBorder;
        });

        const pData = penerimaanData.length > 0 ? penerimaanData : [];
        let sumTotalRcv = 0;
        let sumLeafRcv = 0;
        let sumStemRcv = 0;

        pData.forEach((row, idx) => {
          let tgl = '-';
          try { tgl = format(new Date(row.date), 'dd/MM/yyyy'); } catch (_) { tgl = row.date || '-'; }
          const wTotal = Number(row.total_weight_kg || 0);
          const wLeaf = Number(row.leaf_weight_kg || 0);
          const wStem = Number(row.stem_weight_kg || 0);

          sumTotalRcv += wTotal;
          sumLeafRcv += wLeaf;
          sumStemRcv += wStem;

          const r = sheetRcv.addRow([
            tgl,
            row.supplier_name || '-',
            wTotal,
            wLeaf,
            wStem,
            row.mushroom_code || '-',
            row.officer || '-'
          ]);
          r.height = 21;

          r.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
          r.getCell(2).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
          r.getCell(3).alignment = { vertical: 'middle', horizontal: 'right' };
          r.getCell(3).numFmt = '#,##0.00';
          r.getCell(3).font = { name: 'Arial', size: 10, bold: true };
          r.getCell(4).alignment = { vertical: 'middle', horizontal: 'right' };
          r.getCell(4).numFmt = '#,##0.00';
          r.getCell(4).font = { name: 'Arial', size: 10, color: { argb: 'FF107C41' } };
          r.getCell(5).alignment = { vertical: 'middle', horizontal: 'right' };
          r.getCell(5).numFmt = '#,##0.00';
          r.getCell(6).alignment = { vertical: 'middle', horizontal: 'center' };
          r.getCell(6).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF0F447E' } };
          r.getCell(7).alignment = { vertical: 'middle', horizontal: 'center' };

          const isEven = idx % 2 === 0;
          for (let col = 1; col <= 7; col++) {
            const cell = r.getCell(col);
            cell.border = thinBorder;
            if (isEven) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
          }
        });

        // Summary row Penerimaan
        const sumRcvRow = sheetRcv.addRow([
          `TOTAL PENERIMAAN (${pData.length} Transaksi)`,
          '',
          sumTotalRcv,
          sumLeafRcv,
          sumStemRcv,
          `Rendemen Daun: ${sumTotalRcv > 0 ? ((sumLeafRcv / sumTotalRcv) * 100).toFixed(1) : 0}%`,
          ''
        ]);
        sumRcvRow.height = 24;
        sheetRcv.mergeCells(`A${sumRcvRow.number}:B${sumRcvRow.number}`);
        sheetRcv.mergeCells(`F${sumRcvRow.number}:G${sumRcvRow.number}`);

        sumRcvRow.getCell(1).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F447E' } };
        sumRcvRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };
        sumRcvRow.getCell(3).numFmt = '#,##0.00';
        sumRcvRow.getCell(3).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F447E' } };
        sumRcvRow.getCell(3).alignment = { vertical: 'middle', horizontal: 'right' };
        sumRcvRow.getCell(4).numFmt = '#,##0.00';
        sumRcvRow.getCell(4).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF107C41' } };
        sumRcvRow.getCell(4).alignment = { vertical: 'middle', horizontal: 'right' };
        sumRcvRow.getCell(5).numFmt = '#,##0.00';
        sumRcvRow.getCell(5).font = { name: 'Arial', size: 10, bold: true };
        sumRcvRow.getCell(5).alignment = { vertical: 'middle', horizontal: 'right' };
        sumRcvRow.getCell(6).font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF555555' } };
        sumRcvRow.getCell(6).alignment = { vertical: 'middle', horizontal: 'center' };

        for (let col = 1; col <= 7; col++) {
          const cell = sumRcvRow.getCell(col);
          cell.border = summaryBorder;
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEDF2F7' } };
        }

        // ==========================================
        // SHEET 2: DATA PENGGORENGAN & MUTU
        // ==========================================
        const sheetFry = workbook.addWorksheet('2. Penggorengan & Mutu', { views: [{ showGridLines: true }] });

        sheetFry.mergeCells('A1:J1');
        const fryT = sheetFry.getCell('A1');
        fryT.value = 'FORM PENGENDALIAN PROSES PRODUKSI - PENGGORENGAN';
        fryT.font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
        fryT.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F447E' } };
        fryT.alignment = { vertical: 'middle', horizontal: 'center' };
        sheetFry.getRow(1).height = 30;

        sheetFry.mergeCells('A2:J2');
        const fryD = sheetFry.getCell('A2');
        fryD.value = `CV KHAIRA BUANA MANDIRI | ${period} | Dicetak: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`;
        fryD.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF333333' } };
        fryD.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4F8' } };
        fryD.alignment = { vertical: 'middle', horizontal: 'center' };
        sheetFry.getRow(2).height = 20;

        sheetFry.addRow([]); // Spacing
        sheetFry.getRow(3).height = 10;

        const fryCols = ['Tgl', 'Petugas', 'Kode Jamur (Supplier-Tanggal)', 'No. Batch', 'Jamur Suwir (gr)', 'Terigu Bumbu (gr)', 'Kaldu Jamur', 'Menit Goreng', 'Menit Spinner', 'Keripik Jadi (kg)'];
        const fryColWidthsPure = [14, 20, 26, 20, 16, 16, 16, 14, 14, 16];
        fryColWidthsPure.forEach((w, idx) => sheetFry.getColumn(idx + 1).width = w);

        const fryHRowPure = sheetFry.addRow(fryCols);
        fryHRowPure.height = 26;
        fryHRowPure.eachCell(c => {
          c.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2B579A' } };
          c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
          c.border = headerBorder;
        });

        let sumShredded = 0;
        let sumFlour = 0;
        let sumChips = 0;
        let sumFryMin = 0;
        let sumSpinMin = 0;

        data.forEach((row, idx) => {
          let tgl = '-';
          try { tgl = format(new Date(row.date), 'dd/MM/yyyy'); } catch (_) { tgl = row.date || '-'; }
          const shredded = Number(row.shredded_mushroom_gram || 0);
          const flour = Number(row.seasoned_flour_gram || 0);
          const fryM = Number(row.frying_minutes || 0);
          const spinM = Number(row.spinner_minutes || 0);
          const rawChip = typeof row.output_chips === 'string' ? parseFloat(row.output_chips) : Number(row.output_chips || 0);
          const chipKg = rawChip > 50 ? rawChip / 1000 : rawChip;

          sumShredded += shredded;
          sumFlour += flour;
          sumFryMin += fryM;
          sumSpinMin += spinM;
          sumChips += chipKg;

          const r = sheetFry.addRow([
            tgl,
            row.officer || '-',
            row.mushroom_code || '-',
            row.batch_number || '-',
            shredded,
            flour,
            row.mushroom_broth || '-',
            fryM ? `${fryM} mnt` : '-',
            spinM ? `${spinM} mnt` : '-',
            chipKg ? `${chipKg.toFixed(2)} kg` : (row.output_chips || '-')
          ]);
          r.height = 21;

          r.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
          r.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
          r.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };
          r.getCell(3).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF0F447E' } };
          r.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };
          r.getCell(5).alignment = { vertical: 'middle', horizontal: 'right' };
          r.getCell(5).numFmt = '#,##0';
          r.getCell(6).alignment = { vertical: 'middle', horizontal: 'right' };
          r.getCell(6).numFmt = '#,##0';
          r.getCell(7).alignment = { vertical: 'middle', horizontal: 'center' };
          r.getCell(8).alignment = { vertical: 'middle', horizontal: 'center' };
          r.getCell(9).alignment = { vertical: 'middle', horizontal: 'center' };
          r.getCell(10).alignment = { vertical: 'middle', horizontal: 'right' };
          r.getCell(10).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF107C41' } };

          const isEven = idx % 2 === 0;
          for (let col = 1; col <= 10; col++) {
            const cell = r.getCell(col);
            cell.border = thinBorder;
            if (isEven) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
          }
        });

        // Summary row Penggorengan
        const sumFryRow = sheetFry.addRow([
          `TOTAL PENGGORENGAN (${data.length} Batch)`,
          '',
          '',
          '',
          sumShredded,
          sumFlour,
          '-',
          data.length > 0 ? `${(sumFryMin / data.length).toFixed(0)} mnt (avg)` : '-',
          data.length > 0 ? `${(sumSpinMin / data.length).toFixed(0)} mnt (avg)` : '-',
          `${sumChips.toFixed(2)} kg`
        ]);
        sumFryRow.height = 24;
        sheetFry.mergeCells(`A${sumFryRow.number}:D${sumFryRow.number}`);

        sumFryRow.getCell(1).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F447E' } };
        sumFryRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };
        sumFryRow.getCell(5).numFmt = '#,##0';
        sumFryRow.getCell(5).font = { name: 'Arial', size: 10, bold: true };
        sumFryRow.getCell(5).alignment = { vertical: 'middle', horizontal: 'right' };
        sumFryRow.getCell(6).numFmt = '#,##0';
        sumFryRow.getCell(6).font = { name: 'Arial', size: 10, bold: true };
        sumFryRow.getCell(6).alignment = { vertical: 'middle', horizontal: 'right' };
        sumFryRow.getCell(7).alignment = { vertical: 'middle', horizontal: 'center' };
        sumFryRow.getCell(8).font = { name: 'Arial', size: 9, italic: true };
        sumFryRow.getCell(8).alignment = { vertical: 'middle', horizontal: 'center' };
        sumFryRow.getCell(9).font = { name: 'Arial', size: 9, italic: true };
        sumFryRow.getCell(9).alignment = { vertical: 'middle', horizontal: 'center' };
        sumFryRow.getCell(10).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF107C41' } };
        sumFryRow.getCell(10).alignment = { vertical: 'middle', horizontal: 'right' };

        for (let col = 1; col <= 10; col++) {
          const cell = sumFryRow.getCell(col);
          cell.border = summaryBorder;
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEDF2F7' } };
        }

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `Form_Pengendalian_Proses_Produksi_${format(new Date(), 'yyyyMMdd')}.xlsx`;
        anchor.click();
        window.URL.revokeObjectURL(url);
        toast.success('Berhasil mengekspor Form Pengendalian Proses Produksi ke Excel (2 Tab Rapi)');
        return;
      }

      // ==========================================
      // LAPORAN LAINNYA (RECEIVING, SORTING, PRODUCTION, DLL)
      // ==========================================
      const sheetName = REPORT_TITLES[reportType]?.substring(0, 31) || 'Laporan';
      const sheet = workbook.addWorksheet(sheetName, { views: [{ showGridLines: true }] });

      const tableColumns = REPORT_COLUMNS[reportType];
      const numCols = tableColumns.length;

      sheet.mergeCells(1, 1, 1, numCols);
      const titleCell = sheet.getCell('A1');
      titleCell.value = REPORT_TITLES[reportType].toUpperCase();
      titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F447E' } };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
      sheet.getRow(1).height = 32;

      sheet.mergeCells(2, 1, 2, numCols);
      const dateCell = sheet.getCell('A2');
      dateCell.value = `CV KHAIRA BUANA MANDIRI | ${period} | Dicetak: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`;
      dateCell.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF333333' } };
      dateCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4F8' } };
      dateCell.alignment = { vertical: 'middle', horizontal: 'center' };
      sheet.getRow(2).height = 20;

      sheet.addRow([]); // Spacing
      sheet.getRow(3).height = 10;

      const headerValues = tableColumns.map(c => c.header as string);
      const headerRow = sheet.addRow(headerValues);
      headerRow.height = 26;
      
      const colWidths = headerValues.map(h => Math.max(16, (h?.length || 10) + 6));
      
      headerRow.eachCell((cell, colNum) => {
        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2980B9' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = { top: { style: 'thin' }, bottom: { style: 'medium', color: { argb: 'FF0F447E' } }, left: { style: 'thin' }, right: { style: 'thin' } };
        sheet.getColumn(colNum).width = colWidths[colNum - 1];
      });

      data.forEach((row, index) => {
        const rowData = tableColumns.map(c => {
           const key = (c as any).accessorKey;
           let val = row[key];
           if (key === 'date') {
             try {
               val = val ? format(new Date(val), 'dd/MM/yyyy HH:mm') : '-';
             } catch (_) {
               val = '-';
             }
           }
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
    if (data.length === 0 && penerimaanData.length === 0) {
      toast.error('Tidak ada data untuk diekspor');
      return;
    }
    const doc = new jsPDF('landscape');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const period = (startDate && endDate) ? `Periode: ${format(new Date(startDate), 'dd MMM yyyy')} - ${format(new Date(endDate), 'dd MMM yyyy')}` : 'Semua Waktu (All Time)';

    if (reportType === 'frying') {
      // PDF resmi Form Pengendalian Proses Produksi (sesuai formulir fisik pabrik)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(0, 0, 0);
      doc.text('FORM PENGENDALIAN PROSES PRODUKSI', pageWidth / 2, 13, { align: 'center' });
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(70, 70, 70);
      doc.text(`CV KHAIRA BUANA MANDIRI | ${period} | Dicetak: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageWidth / 2, 18, { align: 'center' });

      // ── 1. PENERIMAAN ──
      autoTable(doc, {
        startY: 23,
        theme: 'grid',
        head: [
          [{ content: 'PENERIMAAN', colSpan: 7, styles: { halign: 'center', fillColor: [217, 225, 242], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 9 } }],
          ['Tanggal', 'Nama Supplier', 'Berat Jamur (kg)', 'Berat Daun (kg)', 'Berat Batang (kg)', 'Kode Jamur (Supplier-Tanggal)', 'Petugas']
        ],
        body: (penerimaanData.length > 0 ? penerimaanData : []).map(r => {
          let tgl = '-';
          try { tgl = format(new Date(r.date), 'dd/MM/yyyy'); } catch (_) { tgl = r.date || '-'; }
          return [
            tgl,
            r.supplier_name || '-',
            `${r.total_weight_kg || 0} kg`,
            `${r.leaf_weight_kg || 0} kg`,
            `${r.stem_weight_kg || 0} kg`,
            r.mushroom_code || '-',
            r.officer || '-'
          ];
        }),
        headStyles: { fillColor: [217, 225, 242], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.2, lineColor: [150, 150, 150], fontSize: 8 },
        bodyStyles: { fontSize: 7.5, cellPadding: 2, lineWidth: 0.2, lineColor: [190, 190, 190], textColor: [0, 0, 0] },
        margin: { left: 10, right: 10 }
      });

      const finalY = (doc as any).lastAutoTable.finalY + 6;

      // ── 2. PENGGORENGAN ──
      autoTable(doc, {
        startY: finalY,
        theme: 'grid',
        head: [
          [{ content: 'PENGGORENGAN', colSpan: 10, styles: { halign: 'center', fillColor: [217, 225, 242], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 9 } }],
          ['Tgl', 'Petugas', 'Kode Jamur (Supplier-Tanggal)', 'No. Batch', 'Jamur Suwir (gr)', 'Terigu Bumbu (gr)', 'Kaldu Jamur', 'Menit Goreng', 'Menit Spinner', 'Gr/Kg Keripik']
        ],
        body: data.map(r => {
          let tgl = '-';
          try { tgl = format(new Date(r.date), 'dd/MM/yyyy'); } catch (_) { tgl = r.date || '-'; }
          return [
            tgl,
            r.officer || '-',
            r.mushroom_code || '-',
            r.batch_number || '-',
            `${r.shredded_mushroom_gram || 0} gr`,
            `${r.seasoned_flour_gram || 0} gr`,
            r.mushroom_broth || '-',
            `${r.frying_minutes || 0} m`,
            `${r.spinner_minutes || 0} m`,
            r.output_chips || '-'
          ];
        }),
        headStyles: { fillColor: [217, 225, 242], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.2, lineColor: [150, 150, 150], fontSize: 8 },
        bodyStyles: { fontSize: 7.5, cellPadding: 2, lineWidth: 0.2, lineColor: [190, 190, 190], textColor: [0, 0, 0] },
        margin: { left: 10, right: 10 }
      });

      doc.save(`Form_Pengendalian_Proses_Produksi_${format(new Date(), 'yyyyMMdd')}.pdf`);
      toast.success('Berhasil mencetak PDF Form Pengendalian Proses Produksi');
      return;
    }

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
         if (key === 'date') {
           try {
             val = val ? format(new Date(val), 'dd/MM/yyyy HH:mm') : '-';
           } catch (_) {
             val = '-';
           }
         }
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
      didDrawPage: (dataHook: any) => {
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
  const isFrying = reportType === 'frying';
  const totalQty = isProduction ? data.reduce((s, r) => s + (Number(r?.total_finished) || 0), 0) : 0;
  const avgYield = isProduction && totalRows > 0 ? (data.reduce((s, r) => s + (Number(r?.avg_yield) || 0), 0) / totalRows) : 0;

  // Frying specific metrics
  const totalPenerimaanWeight = isFrying ? penerimaanData.reduce((s, r) => s + (Number(r?.total_weight_kg) || 0), 0) : 0;
  const totalFryingMushroomKg = isFrying ? (data.reduce((s, r) => s + (Number(r?.shredded_mushroom_gram) || 0), 0) / 1000) : 0;
  const totalFryingChipsKg = isFrying ? data.reduce((s, r) => {
    const val = typeof r?.output_chips === 'string' ? parseFloat(r.output_chips) : Number(r?.output_chips) || 0;
    return s + (val > 50 ? val / 1000 : val);
  }, 0) : 0;

  return (
    <div style={{ paddingBottom: 'var(--space-8)' }}>
      <PageHeader
        title="Laporan Terpadu"
        description="Pusat data pelaporan operasional, produksi, dan penjualan. Filter, analisis, dan ekspor data ke Excel atau PDF dengan satu klik."
        breadcrumbs={[{ label: 'Manajemen' }, { label: 'Laporan' }]}
        actions={
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <Button variant="secondary" onClick={handleExportExcel} leftIcon={<FileSpreadsheet size={18} color="#107C41" aria-hidden="true" />} style={{ background: '#fff', border: '1px solid #107C41', color: '#107C41' }}>Export Excel</Button>
            <Button variant="secondary" onClick={handleExportPDF} leftIcon={<FileText size={18} color="#F24E1E" aria-hidden="true" />} style={{ background: '#fff', border: '1px solid #F24E1E', color: '#F24E1E' }}>Export PDF</Button>
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
              onChange={(e) => {
                const val = e.target.value as ReportType;
                setData([]);
                setPenerimaanData([]);
                setIsLoading(true);
                setReportType(val);
                if (typeof window !== 'undefined') {
                  sessionStorage.setItem('khumkhum_report_type', val);
                }
              }}
              options={[
                { value: 'receiving', label: 'Laporan Penerimaan' },
                { value: 'sorting', label: 'Laporan Sortasi' },
                { value: 'production', label: 'Laporan Produksi' },
                { value: 'frying', label: 'Form Pengendalian Produksi (Penggorengan)' },
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
            onClick={() => handleGenerate(reportType, startDate, endDate, true)} 
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
                <FileText size={28} aria-hidden="true" />
              </div>
              <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '15px' }}>
                {isFrying ? 'Total Batch Goreng' : 'Total Baris Data'}
              </span>
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
                    <Package size={28} aria-hidden="true" />
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
                    <TrendingUp size={28} aria-hidden="true" />
                  </div>
                  <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '15px' }}>Rata-Rata Rendemen</span>
                </div>
                <div style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--color-warning-700)', lineHeight: 1 }}>
                  {(avgYield || 0).toFixed(1)}%
                </div>
              </Card>
            </div>
          </>
        )}

        {isFrying && (
          <>
            <div style={{ borderRadius: '20px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', background: 'linear-gradient(to bottom right, #ffffff, #eff6ff)' }}>
              <Card bodyClassName="p-6">
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                  <div style={{ padding: '12px', background: 'var(--color-primary-100)', borderRadius: '16px', color: 'var(--color-primary-700)' }}>
                    <Factory size={28} aria-hidden="true" />
                  </div>
                  <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '15px' }}>Penerimaan Bahan Baku</span>
                </div>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--color-primary-700)', lineHeight: 1 }}>
                  {totalPenerimaanWeight.toFixed(1)} <span style={{ fontSize: '1.25rem', fontWeight: 600 }}>kg</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '8px' }}>
                  {penerimaanData.length} transaksi penerimaan mitra
                </div>
              </Card>
            </div>
            <div style={{ borderRadius: '20px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', background: 'linear-gradient(to bottom right, #ffffff, #f0fdf4)' }}>
              <Card bodyClassName="p-6">
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                  <div style={{ padding: '12px', background: 'var(--color-success-100)', borderRadius: '16px', color: 'var(--color-success-700)' }}>
                    <Package size={28} aria-hidden="true" />
                  </div>
                  <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '15px' }}>Est. Total Keripik Jadi</span>
                </div>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--color-success-700)', lineHeight: 1 }}>
                  {totalFryingChipsKg.toFixed(1)} <span style={{ fontSize: '1.25rem', fontWeight: 600 }}>kg</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '8px' }}>
                  dari {totalFryingMushroomKg.toFixed(1)} kg jamur suwir
                </div>
              </Card>
            </div>
          </>
        )}
      </div>

      {/* The Report Table(s) */}
      {isFrying ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Section 1: PENERIMAAN */}
          <div style={{ borderRadius: '24px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 10px 40px rgba(0,0,0,0.03)' }}>
            <Card bodyClassName="body--none">
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F0F4F8' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: '#0F447E' }}>
                    <Factory size={22} color="#0F447E" aria-hidden="true" />
                    1. PENERIMAAN BAHAN BAKU
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Data penimbangan jamur dari supplier/mitra petani &amp; pembentukan Kode Jamur (Supplier-Tanggal)
                  </p>
                </div>
                <div style={{ fontSize: '12px', fontWeight: 600, background: '#D9E1F2', color: '#0F447E', padding: '4px 12px', borderRadius: '12px' }}>
                  {penerimaanData.length} entri penerimaan
                </div>
              </div>
              
              {isLoading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <RefreshCw size={28} className="animate-spin mx-auto mb-3" color="var(--color-primary-500)" aria-hidden="true" />
                  <p>Memuat data penerimaan...</p>
                </div>
              ) : (
                <div style={{ background: '#fff' }}>
                  <DataTable
                    columns={PENERIMAAN_COLUMNS}
                    data={penerimaanData}
                  />
                </div>
              )}
            </Card>
          </div>

          {/* Section 2: PENGGORENGAN */}
          <div style={{ borderRadius: '24px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 10px 40px rgba(0,0,0,0.03)' }}>
            <Card bodyClassName="body--none">
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F0F4F8' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: '#0F447E' }}>
                    <BarChart2 size={22} color="#0F447E" aria-hidden="true" />
                    2. PENGGORENGAN (FORM PENGENDALIAN PROSES PRODUKSI)
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Monitoring wajan goreng: takaran jamur suwir, bumbu, waktu penggorengan &amp; spinner, serta hasil keripik
                  </p>
                </div>
                <div style={{ fontSize: '12px', fontWeight: 600, background: '#D9E1F2', color: '#0F447E', padding: '4px 12px', borderRadius: '12px' }}>
                  {totalRows} batch penggorengan
                </div>
              </div>
              
              {isLoading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <RefreshCw size={28} className="animate-spin mx-auto mb-3" color="var(--color-primary-500)" aria-hidden="true" />
                  <p>Memuat data penggorengan...</p>
                </div>
              ) : (
                <div style={{ background: '#fff' }}>
                  <DataTable
                    columns={REPORT_COLUMNS.frying || []}
                    data={data}
                  />
                </div>
              )}
            </Card>
          </div>
        </div>
      ) : (
        /* The Single Report Table */
        <div style={{ borderRadius: '24px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 10px 40px rgba(0,0,0,0.03)' }}>
          <Card bodyClassName="body--none">
            <div style={{ padding: '24px', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafa' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BarChart2 size={24} color="var(--color-primary-500)" aria-hidden="true" />
                {REPORT_TITLES[reportType]}
              </h3>
              <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
                Menampilkan {totalRows} entri data
              </div>
            </div>
            
            {isLoading ? (
              <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <RefreshCw size={32} className="animate-spin mx-auto mb-4" color="var(--color-primary-500)" aria-hidden="true" />
                <p>Menarik data secara real-time...</p>
              </div>
            ) : (
              <div style={{ background: '#fff' }}>
                <DataTable
                  key={reportType}
                  columns={REPORT_COLUMNS[reportType] || []}
                  data={data}
                />
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
