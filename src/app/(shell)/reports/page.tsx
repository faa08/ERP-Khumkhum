'use client';

import React, { useState, useMemo } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { DataTable } from '@/components/data-table/DataTable';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/form/FormField';
import { Select } from '@/components/ui/Select';
import { Download, Printer, Filter, TrendingUp, Package, Factory, FileText } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';

// Mock report data removed, defaulting to empty state
const MOCK_REPORT_DATA: any[] = [];

export default function ReportsPage() {
  const [reportType, setReportType] = useState('production');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const columns = useMemo<ColumnDef<any>[]>(() => [
    { accessorKey: 'date', header: 'Date' },
    { accessorKey: 'reference', header: 'Reference / ID' },
    { accessorKey: 'details', header: 'Details' },
    { accessorKey: 'metric', header: 'Metric (Qty/Amount)' },
  ], []);

  const handleExportCSV = () => {
    alert('Exporting to CSV...');
  };

  const handleExportExcel = () => {
    alert('Exporting to Excel...');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      <PageHeader
        title="Laporan Terpadu"
        description="Pusat pelaporan operasional, produksi, dan penjualan. Ekspor data ke berbagai format."
        breadcrumbs={[{ label: 'Manajemen' }, { label: 'Laporan' }]}
        actions={
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Button variant="secondary" onClick={handleExportCSV} leftIcon={<Download size={16} />}>CSV</Button>
            <Button variant="secondary" onClick={handleExportExcel} leftIcon={<Download size={16} />}>Excel</Button>
            <Button variant="primary" onClick={handlePrint} leftIcon={<Printer size={16} />}>Print</Button>
          </div>
        }
      />

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
            <FileText size={20} color="var(--color-primary-600)" />
            <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Total Laporan Bulan Ini</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-primary-600)' }}>
            24
          </div>
        </Card>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
            <Package size={20} color="var(--color-success-600)" />
            <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Volume Produksi (Bulan Ini)</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-success-600)' }}>
            1.450 <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>kg</span>
          </div>
        </Card>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
            <Factory size={20} color="var(--color-warning-600)" />
            <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Rendemen Rata-rata</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-warning-600)' }}>
            82.5%
          </div>
        </Card>
      </div>

      <div style={{ marginBottom: 'var(--space-6)' }}><Card>
          <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 200px' }}>
              <FormField label="Jenis Laporan">
                <Select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
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
              </FormField>
            </div>
            
            <div style={{ flex: '1 1 200px' }}>
              <FormField label="Tanggal Mulai">
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} fullWidth />
              </FormField>
            </div>
            
            <div style={{ flex: '1 1 200px' }}>
              <FormField label="Tanggal Selesai">
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} fullWidth />
              </FormField>
            </div>

            <Button variant="primary" leftIcon={<Filter size={16} />}>Generate</Button>
          </div>
        </Card></div>

      {/* The Report Table */}
      <Card bodyClassName="body--none">
        <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 'var(--text-base)', fontWeight: 600 }}>Pratinjau Data Laporan</h3>
        </div>
        <DataTable
          columns={columns}
          data={MOCK_REPORT_DATA}
        />
      </Card>
    </div>
  );
}
