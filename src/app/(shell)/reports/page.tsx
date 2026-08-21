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

  const handleExportExcel = () => {
    if (data.length === 0) {
      toast.error('Tidak ada data untuk diekspor');
      return;
    }
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan');
    XLSX.writeFile(wb, `Laporan_${reportType}_${format(new Date(), 'yyyyMMdd')}.xlsx`);
    toast.success('Berhasil mengekspor ke Excel');
  };

  const handleExportPDF = () => {
    if (data.length === 0) {
      toast.error('Tidak ada data untuk diekspor');
      return;
    }
    const doc = new jsPDF('landscape');
    
    // Title
    doc.setFontSize(18);
    doc.setTextColor(33, 43, 54);
    doc.text(REPORT_TITLES[reportType], 14, 22);
    
    // Subtitle
    doc.setFontSize(11);
    doc.setTextColor(99, 115, 129);
    const period = (startDate && endDate) ? `Periode: ${format(new Date(startDate), 'dd MMM yyyy')} - ${format(new Date(endDate), 'dd MMM yyyy')}` : 'Periode: Semua Waktu';
    doc.text(period, 14, 30);
    
    // Table
    const tableColumns = REPORT_COLUMNS[reportType].map(c => c.header as string);
    const tableRows = data.map(row => {
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
      startY: 38,
      theme: 'grid',
      styles: { fontSize: 9, font: 'helvetica', cellPadding: 3 },
      headStyles: { fillColor: [33, 43, 54], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [249, 250, 251] },
    });

    doc.save(`Laporan_${reportType}_${format(new Date(), 'yyyyMMdd')}.pdf`);
    toast.success('Berhasil mengekspor ke PDF');
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
