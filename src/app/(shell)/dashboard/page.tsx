'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Tabs } from '@/components/ui/Tabs';
import { Factory, Package, ShieldCheck, ShoppingCart, TrendingUp, AlertTriangle, RefreshCw, BarChart3, Settings, AlertCircle } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { getKpiMetrics, type KpiFilter } from '@/actions/management';
import type { DbKpiMetrics } from '@/types/database';

type DateRangeOption = 'today' | '7days' | 'month' | 'custom';

const DATE_OPTIONS: { value: DateRangeOption; label: string }[] = [
  { value: 'today', label: 'Hari Ini' },
  { value: '7days', label: '7 Hari' },
  { value: 'month', label: 'Bulan Ini' },
  { value: 'custom', label: 'Custom' },
];

export default function DashboardPage() {
  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview operasional & KPI eksekutif KhumKhum Jamur Crispy."
        breadcrumbs={[{ label: 'Dashboard' }]}
      />

      <Tabs
        tabs={[
          { id: 'executive', label: <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><BarChart3 size={16} /> Executive Overview</span>, content: <ExecutiveDashboard /> },
          { id: 'operational', label: <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Settings size={16} /> Daily Operations</span>, content: <OperationalDashboard /> },
        ]}
      />
    </div>
  );
}

// ─────────────────────────────────────────────
// EXECUTIVE DASHBOARD (ROLE_MANAGEMENT)
// ─────────────────────────────────────────────
function ExecutiveDashboard() {
  const [metrics, setMetrics] = useState<DbKpiMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState<DateRangeOption>('month');
  const [customFrom, setCustomFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [customTo, setCustomTo] = useState(format(new Date(), 'yyyy-MM-dd'));

  const loadMetrics = useCallback(async () => {
    setIsLoading(true);
    const filter: KpiFilter = selectedRange === 'custom'
      ? { range: 'custom', from: customFrom, to: customTo }
      : { range: selectedRange };
    const res = await getKpiMetrics(filter);
    if (res.success && res.data) setMetrics(res.data);
    setIsLoading(false);
  }, [selectedRange, customFrom, customTo]);

  useEffect(() => { loadMetrics(); }, [loadMetrics]);

  const kpiCards = metrics ? [
    {
      title: 'Total Pasokan Masuk',
      value: `${metrics.total_supply_kg.toLocaleString('id-ID')} kg`,
      icon: <Package size={24} />,
      trend: '+12%',
      trendPositive: true,
      color: 'var(--color-success-600)',
      bg: 'var(--color-success-50)',
    },
    {
      title: 'Rata-rata Rendemen',
      value: `${metrics.avg_yield_percentage.toFixed(1)}%`,
      icon: <Factory size={24} />,
      trend: metrics.avg_yield_percentage >= 80 ? 'Di Atas Target' : 'Di Bawah Target (80%)',
      trendPositive: metrics.avg_yield_percentage >= 80,
      color: 'var(--color-primary-600)',
      bg: 'var(--color-primary-50)',
    },
    {
      title: 'Defect Rate',
      value: `${metrics.overall_defect_rate.toFixed(2)}%`,
      icon: <ShieldCheck size={24} />,
      trend: metrics.overall_defect_rate <= 5 ? 'Baik (≤5%)' : 'Perlu Perhatian',
      trendPositive: metrics.overall_defect_rate <= 5,
      color: metrics.overall_defect_rate <= 5 ? 'var(--color-success-600)' : 'var(--color-danger-600)',
      bg: metrics.overall_defect_rate <= 5 ? 'var(--color-success-50)' : 'var(--color-danger-50)',
    },
    {
      title: 'Akurasi Stok',
      value: `${metrics.stock_accuracy_percentage.toFixed(1)}%`,
      icon: <ShieldCheck size={24} />,
      trend: metrics.stock_accuracy_percentage >= 98 ? 'Target Tercapai' : 'Di Bawah Target (98%)',
      trendPositive: metrics.stock_accuracy_percentage >= 98,
      color: 'var(--color-warning-600)',
      bg: 'var(--color-warning-50)',
    },
    {
      title: 'Omset Penjualan',
      value: `Rp ${(metrics.total_sales_revenue / 1_000_000).toFixed(1)}Jt`,
      icon: <TrendingUp size={24} />,
      trend: '+8.4% vs bulan lalu',
      trendPositive: true,
      color: 'var(--color-primary-600)',
      bg: 'var(--color-primary-50)',
    },
    {
      title: 'Total Batch Produksi',
      value: `${metrics.total_production_batches} batch`,
      icon: <BarChart3 size={24} />,
      trend: 'periode ini',
      trendPositive: true,
      color: 'var(--color-info-600)',
      bg: 'var(--color-info-50)',
    },
  ] : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', marginTop: 'var(--space-4)' }}>
      {/* ── Filter Bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 500, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Periode:</span>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {DATE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setSelectedRange(opt.value)}
              style={{
                padding: 'var(--space-1) var(--space-3)',
                borderRadius: 'var(--radius-full)',
                border: `1px solid ${selectedRange === opt.value ? 'var(--color-primary-500)' : 'var(--border-default)'}`,
                background: selectedRange === opt.value ? 'var(--color-primary-600)' : 'transparent',
                color: selectedRange === opt.value ? '#fff' : 'var(--text-primary)',
                fontWeight: selectedRange === opt.value ? 600 : 400,
                fontSize: 'var(--text-sm)',
                cursor: 'pointer',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {selectedRange === 'custom' && (
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
              style={{ padding: 'var(--space-1) var(--space-2)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', background: 'var(--bg-default)', color: 'var(--text-primary)' }} />
            <span>—</span>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
              style={{ padding: 'var(--space-1) var(--space-2)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', background: 'var(--bg-default)', color: 'var(--text-primary)' }} />
          </div>
        )}
        <Button variant="secondary" size="sm" onClick={loadMetrics} leftIcon={<RefreshCw size={14} />} loading={isLoading}>
          Refresh
        </Button>
        {metrics && (
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
            {format(new Date(metrics.period_from), 'd MMM', { locale: idLocale })} — {format(new Date(metrics.period_to), 'd MMM yyyy', { locale: idLocale })}
          </span>
        )}
      </div>

      {/* ── KPI Cards ── */}
      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-4)' }}>
          {Array(6).fill(0).map((_, i) => (
            <Card key={i}>
              <div style={{ height: 80, background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', animation: 'pulse 1.5s infinite' }} />
            </Card>
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-4)' }}>
          {kpiCards.map(kpi => (
            <Card key={kpi.title}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{kpi.title}</p>
                  <p style={{ margin: 'var(--space-1) 0', fontSize: '1.6rem', fontWeight: 700 }}>{kpi.value}</p>
                </div>
                <div style={{ color: kpi.color, backgroundColor: kpi.bg, padding: 'var(--space-2)', borderRadius: 'var(--radius-md)' }}>
                  {kpi.icon}
                </div>
              </div>
              <div style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>
                <span style={{ color: kpi.trendPositive ? 'var(--color-success-600)' : 'var(--color-danger-600)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {kpi.trendPositive ? <TrendingUp size={14} /> : <AlertTriangle size={14} />} {kpi.trend}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── Warehouse Overview ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
        <Card header={<strong style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Package size={18} /> Ringkasan Kapasitas Gudang</strong>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {[
              { name: 'Jamur Bersih', pct: 0, color: 'var(--color-success-600)' },
              { name: 'Minyak & Tepung', pct: 0, color: 'var(--color-warning-600)' },
              { name: 'Bumbu', pct: 0, color: 'var(--color-primary-600)' },
              { name: 'Kemasan', pct: 0, color: 'var(--color-danger-600)' },
              { name: 'Produk Jadi', pct: 0, color: 'var(--color-info-600)' },
            ].map(wh => (
              <div key={wh.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 'var(--text-sm)' }}>{wh.name}</span>
                  <strong style={{ fontSize: 'var(--text-sm)', color: wh.pct >= 80 ? 'var(--color-danger-600)' : 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {wh.pct}%
                    {wh.pct >= 80 && <AlertCircle size={14} />}
                  </strong>
                </div>
                <div style={{ height: 6, background: 'var(--bg-subtle)', borderRadius: '999px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${wh.pct}%`, background: wh.color, borderRadius: '999px', transition: 'width 0.5s ease' }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card header={<strong style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><TrendingUp size={18} /> Performa Produksi Minggu Ini</strong>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {[
              { label: 'Batch Selesai', value: `${metrics?.total_production_batches || 0} batch`, color: 'var(--color-success-600)' },
              { label: 'Rata-rata Rendemen', value: `${metrics?.avg_yield_percentage?.toFixed(1) || '-'}%`, color: (metrics?.avg_yield_percentage || 0) >= 80 ? 'var(--color-success-600)' : 'var(--color-danger-600)' },
              { label: 'Defect Rate Keseluruhan', value: `${metrics?.overall_defect_rate?.toFixed(2) || '-'}%`, color: (metrics?.overall_defect_rate || 0) <= 5 ? 'var(--color-success-600)' : 'var(--color-danger-600)' },
              { label: 'Akurasi Stok Gudang', value: `${metrics?.stock_accuracy_percentage?.toFixed(1) || '-'}%`, color: (metrics?.stock_accuracy_percentage || 0) >= 98 ? 'var(--color-success-600)' : 'var(--color-warning-600)' },
              { label: 'Total Pasokan Masuk', value: `${(metrics?.total_supply_kg || 0).toLocaleString('id-ID')} kg`, color: 'var(--color-primary-600)' },
              { label: 'Omset Periode Ini', value: `Rp ${((metrics?.total_sales_revenue || 0) / 1_000_000).toFixed(1)}Jt`, color: 'var(--color-success-600)' },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 'var(--space-2)', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{row.label}</span>
                <strong style={{ color: row.color }}>{row.value}</strong>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// OPERATIONAL DASHBOARD (Daily Ops)
// ─────────────────────────────────────────────
function OperationalDashboard() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>

      <Card header={<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}><Factory size={18} /><strong>Batch Produksi Aktif</strong></div>}>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <li style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ margin: 0, fontWeight: 500 }}>PRD-{format(new Date(), 'yyyyMMdd')}-001 — Balado</p>
              <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Input: 25 kg</p>
            </div>
            <StatusBadge status="in_progress" />
          </li>
          <li style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ margin: 0, fontWeight: 500 }}>PRD-{format(new Date(), 'yyyyMMdd')}-002 — Original</p>
              <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Input: 30 kg</p>
            </div>
            <StatusBadge status="planned" />
          </li>
        </ul>
      </Card>

      <Card header={<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}><AlertTriangle size={18} /><strong>Antrean Tindakan</strong></div>}>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <li style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--text-sm)' }}>2 Penerimaan menunggu sortasi</span>
            <StatusBadge status="pending" />
          </li>
          <li style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--text-sm)' }}>3 Batch WIP menunggu QC</span>
            <StatusBadge status="pending" />
          </li>
          <li style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--text-sm)' }}>1 SO menunggu konfirmasi pengiriman</span>
            <StatusBadge status="pending" />
          </li>
        </ul>
      </Card>

      <Card header={<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}><Package size={18} /><strong>Alert Stok Rendah</strong></div>}>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <li style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--text-sm)' }}>Kemasan Pouch 50g</span>
            <StatusBadge status="low_stock" />
          </li>
          <li style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--text-sm)' }}>Bumbu Balado Premix</span>
            <StatusBadge status="low_stock" />
          </li>
        </ul>
      </Card>

      <Card header={<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}><ShoppingCart size={18} /><strong>Pengiriman Hari Ini</strong></div>}>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <li style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ margin: 0, fontWeight: 500 }}>SO-{format(new Date(), 'yyyyMMdd')}-001 — Swalayan Maju</p>
              <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>50 pcs Balado</p>
            </div>
            <StatusBadge status="shipped" />
          </li>
        </ul>
      </Card>
    </div>
  );
}
