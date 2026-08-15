'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/data-table/DataTable';
import { Card } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/form/FormField';
import { useToast } from '@/hooks/useToast';
import { CalendarDays, TrendingUp, AlertCircle, Plus, MessageSquare, PenTool, Sprout, LineChart } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { format, addDays } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { getPpicData } from '@/actions/warehouse';
import type { DbFarmerHarvestEstimate } from '@/types/database';

// Simple Exponential Smoothing (alpha = 0.3)
function exponentialSmoothing(data: number[], alpha = 0.3, periods = 4): number[] {
  if (data.length === 0) return Array(periods).fill(0);
  let smoothed = data[0];
  for (let i = 1; i < data.length; i++) {
    smoothed = alpha * data[i] + (1 - alpha) * smoothed;
  }
  return Array(periods).fill(parseFloat(smoothed.toFixed(2)));
}

export default function PpicPage() {
  const [estimates, setEstimates] = useState<DbFarmerHarvestEstimate[]>([]);
  const [weeklyTotal, setWeeklyTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [manualKg, setManualKg] = useState('');
  const [manualFarmer, setManualFarmer] = useState('');
  const [manualDate, setManualDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const toast = useToast();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const res = await getPpicData();
    if (res.success) {
      setEstimates(res.estimates || []);
      setWeeklyTotal(res.weeklyTotal || 0);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Forecast data
  const historicalData = [45, 52, 38, 60, 48, 55, 42]; // mock historical weekly supply
  const forecast = exponentialSmoothing(historicalData, 0.3, 4);
  const forecastWeeks = forecast.map((kg, i) => ({
    week: `Minggu ${i + 1} (${format(addDays(new Date(), i * 7), 'd MMM', { locale: idLocale })})`,
    forecast_kg: kg,
    confidence: i === 0 ? 'Tinggi' : i === 1 ? 'Sedang' : 'Rendah',
    color: i === 0 ? 'var(--color-success-600)' : i === 1 ? 'var(--color-warning-600)' : 'var(--color-danger-600)',
  }));

  // ── Estimate columns ───────────────────────────────────────────
  const estColumns: ColumnDef<DbFarmerHarvestEstimate>[] = [
    {
      id: 'farmer',
      header: 'Petani',
      cell: ({ row }) => row.original.farmer?.name || row.original.farmer_id,
    },
    {
      id: 'phone',
      header: 'No. HP',
      cell: ({ row }) => row.original.farmer?.phone_number || '-',
    },
    {
      id: 'date',
      header: 'Tanggal Panen',
      cell: ({ row }) => format(new Date(row.original.expected_date), 'EEEE, dd MMM yyyy', { locale: idLocale }),
    },
    {
      accessorKey: 'estimated_kg',
      header: 'Estimasi (kg)',
      cell: ({ row }) => (
        <strong style={{ color: 'var(--color-primary-600)' }}>
          {row.original.estimated_kg.toLocaleString('id-ID')} kg
        </strong>
      ),
    },
    {
      accessorKey: 'source',
      header: 'Sumber',
      cell: ({ row }) => (
        <span style={{
          padding: '2px 8px', borderRadius: '999px', fontSize: 'var(--text-xs)', fontWeight: 600,
          background: row.original.source === 'WA_BOT' ? 'var(--color-success-100)' : 'var(--color-primary-100)',
          color: row.original.source === 'WA_BOT' ? 'var(--color-success-700)' : 'var(--color-primary-700)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {row.original.source === 'WA_BOT' ? <MessageSquare size={12} /> : <PenTool size={12} />}
            {row.original.source === 'WA_BOT' ? 'WA Bot' : 'Manual'}
          </div>
        </span>
      ),
    },
  ];

  const EstimatesTab = (
    <div style={{ marginTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
            <CalendarDays size={20} color="var(--color-primary-600)" />
            <span style={{ fontWeight: 600 }}>Total Estimasi Minggu Ini</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-primary-600)' }}>
            {weeklyTotal.toLocaleString('id-ID')} <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>kg</span>
          </div>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>dari {estimates.length} petani</div>
        </Card>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
            <TrendingUp size={20} color="var(--color-success-600)" />
            <span style={{ fontWeight: 600 }}>Kebutuhan Bumbu (est.)</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-success-600)' }}>
            {(weeklyTotal * 0.05).toFixed(1)} <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>kg</span>
          </div>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>estimasi 5% dari jamur masuk</div>
        </Card>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
            <AlertCircle size={20} color="var(--color-warning-600)" />
            <span style={{ fontWeight: 600 }}>Kebutuhan Kemasan (est.)</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-warning-600)' }}>
            {Math.ceil(weeklyTotal * 0.75 / 0.05)} <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>pcs</span>
          </div>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>@50g/pack (est. rendemen 75%)</div>
        </Card>
      </div>

      <DataTable columns={estColumns} data={estimates} />
    </div>
  );

  const ForecastTab = (
    <div style={{ marginTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <Card header={<strong>Proyeksi Permintaan 4 Minggu (Exponential Smoothing α=0.3)</strong>}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
          {forecastWeeks.map((fw, i) => (
            <div key={i} style={{
              padding: 'var(--space-4)', borderRadius: 'var(--radius-md)',
              background: 'var(--bg-subtle)', textAlign: 'center',
              borderLeft: `4px solid ${fw.color}`,
            }}>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-1)' }}>{fw.week}</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: fw.color }}>
                {fw.forecast_kg.toLocaleString('id-ID')} kg
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                Kepercayaan: {fw.confidence}
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: 'var(--space-3)', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
          <strong>Formula:</strong> F(t) = α × D(t-1) + (1-α) × F(t-1) di mana α = 0.3
          <br />
          Data historis mingguan: {historicalData.join(', ')} kg
        </div>
      </Card>

      {/* MRP Summary */}
      <Card header={<strong>Material Requirement Planning (MRP) — Minggu Depan</strong>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {[
            { material: 'Jamur Tiram Segar', needed: `${(forecastWeeks[0]?.forecast_kg || 0) * 1.3} kg`, note: 'estimasi rendemen 75%' },
            { material: 'Minyak Goreng', needed: `${((forecastWeeks[0]?.forecast_kg || 0) * 0.3).toFixed(1)} kg`, note: '30% dari berat input' },
            { material: 'Tepung Bumbu', needed: `${((forecastWeeks[0]?.forecast_kg || 0) * 0.08).toFixed(1)} kg`, note: '8% dari berat input' },
            { material: 'Kemasan Pouch 50g', needed: `${Math.ceil((forecastWeeks[0]?.forecast_kg || 0) * 0.75 / 0.05)} pcs`, note: 'rendemen 75%, pack 50g' },
          ].map(row => (
            <div key={row.material} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr', alignItems: 'center', padding: 'var(--space-3)', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontWeight: 500 }}>{row.material}</div>
              <div style={{ fontWeight: 700, color: 'var(--color-primary-600)' }}>{row.needed}</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>{row.note}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Perencanaan Produksi (PPIC)"
        description="Monitor estimasi panen petani via WA bot, proyeksi permintaan, dan Material Requirement Planning."
        breadcrumbs={[{ label: 'Operasional' }, { label: 'PPIC & Forecasting' }]}
      />

      <Tabs
        tabs={[
          { id: 'estimates', label: <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Sprout size={16} /> Estimasi Panen Petani</span>, content: EstimatesTab },
          { id: 'forecast', label: <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><LineChart size={16} /> Forecasting & MRP</span>, content: ForecastTab },
        ]}
      />
    </div>
  );
}
