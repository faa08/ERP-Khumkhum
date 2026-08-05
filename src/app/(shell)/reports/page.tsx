'use client';

import React, { useState, useMemo } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { DataTable } from '@/components/data-table/DataTable';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/form/FormField';
import { Select } from '@/components/ui/Select';
import { Download, Printer, Filter } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';

// Mock report data
const MOCK_REPORT_DATA = [
  { id: '1', date: '2026-08-01', reference: 'PRD-045', details: 'Dried Mushrooms Premium', metric: '67.5 kg' },
  { id: '2', date: '2026-08-02', reference: 'PRD-046', details: 'Mushroom Powder', metric: '200 kg' },
];

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
        title="Unified Reports"
        description="Generate, view, and export operational reports."
        breadcrumbs={[{ label: 'Management' }, { label: 'Reports' }]}
        actions={
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Button variant="secondary" onClick={handleExportCSV} leftIcon={<Download size={16} />}>CSV</Button>
            <Button variant="secondary" onClick={handleExportExcel} leftIcon={<Download size={16} />}>Excel</Button>
            <Button variant="primary" onClick={handlePrint} leftIcon={<Printer size={16} />}>Print</Button>
          </div>
        }
      />

      <div style={{ marginBottom: 'var(--space-6)' }}><Card>
          <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 200px' }}>
              <FormField label="Report Type">
                <Select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  options={[
                    { value: 'receiving', label: 'Receiving Report' },
                    { value: 'sorting', label: 'Sorting Report' },
                    { value: 'production', label: 'Production Report' },
                    { value: 'qc', label: 'QC Report' },
                    { value: 'inventory', label: 'Inventory Movements' },
                    { value: 'sales', label: 'Sales Summary' },
                  ]}
                  fullWidth
                />
              </FormField>
            </div>
            
            <div style={{ flex: '1 1 200px' }}>
              <FormField label="Start Date">
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} fullWidth />
              </FormField>
            </div>
            
            <div style={{ flex: '1 1 200px' }}>
              <FormField label="End Date">
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} fullWidth />
              </FormField>
            </div>

            <Button variant="primary" leftIcon={<Filter size={16} />}>Generate</Button>
          </div>
        </Card></div>

      {/* The Report Table */}
      <DataTable
        columns={columns}
        data={MOCK_REPORT_DATA}
      />
    </div>
  );
}
