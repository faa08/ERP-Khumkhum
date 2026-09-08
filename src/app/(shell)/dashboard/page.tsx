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
import { getKpiMetrics, getKpiTrend, type KpiFilter, type KpiTrendData } from '@/actions/management';
import type { DbKpiMetrics } from '@/types/database';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

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

function DeltaCard({ title, value, delta, higherIsBetter }: { title: string, value: string, delta: number | null | undefined, higherIsBetter: boolean }) {
  const isPositive = higherIsBetter ? (delta && delta > 0) : (delta && delta < 0);
  const isNegative = higherIsBetter ? (delta && delta < 0) : (delta && delta > 0);
  const color = isPositive ? 'var(--color-success-600)' : isNegative ? 'var(--color-danger-600)' : 'var(--text-tertiary)';
  
  return (
    <Card>
      <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{title}</p>
      <p style={{ margin: 'var(--space-1) 0', fontSize: '1.4rem', fontWeight: 700 }}>{value}</p>
      {delta != null && (
        <p style={{ margin: 0, fontSize: 'var(--text-xs)', color, display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
          {delta > 0 ? <TrendingUp size={12} /> : <AlertTriangle size={12} />}
          {delta > 0 ? '+' : ''}{delta.toFixed(1)}% vs prev
        </p>
      )}
    </Card>
  );
}

// ─────────────────────────────────────────────
// EXECUTIVE DASHBOARD (ROLE_MANAGEMENT)
// ─────────────────────────────────────────────
function ExecutiveDashboard() {
  const [metrics, setMetrics] = useState<DbKpiMetrics | null>(null);
  const [trendData, setTrendData] = useState<KpiTrendData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState<DateRangeOption>('month');
  const [customFrom, setCustomFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [customTo, setCustomTo] = useState(format(new Date(), 'yyyy-MM-dd'));

  const loadMetrics = useCallback(async () => {
    setIsLoading(true);
    const filter: KpiFilter = selectedRange === 'custom'
      ? { range: 'custom', from: customFrom, to: customTo }
      : { range: selectedRange };
    
    const [metricsRes, trendRes] = await Promise.all([
      getKpiMetrics(filter),
      getKpiTrend(filter)
    ]);

    if (metricsRes.success && metricsRes.data) setMetrics(metricsRes.data);
    if (trendRes.success && trendRes.data) setTrendData(trendRes.data);
    
    setIsLoading(false);
  }, [selectedRange, customFrom, customTo]);

  useEffect(() => { loadMetrics(); }, [loadMetrics]);

  // Buat ringkasan narasi dengan bahasa sederhana
  const generateStory = () => {
    if (!metrics || !trendData) return "Belum ada data untuk periode ini.";
    
    const yieldTarget = trendData.targets.yield || 80;
    const defectTarget = trendData.targets.defectRate || 5;
    const yieldOk = metrics.avg_yield_percentage >= yieldTarget;
    const defectOk = metrics.overall_defect_rate <= defectTarget;
    const omsetJuta = (metrics.total_sales_revenue / 1_000_000).toFixed(1);
    const supplyKg = metrics.total_supply_kg.toLocaleString('id-ID');

    let parts: string[] = [];

    // Kalimat pembuka — status keseluruhan
    if (yieldOk && defectOk) {
      parts.push(`Secara keseluruhan, kinerja periode ini berjalan baik.`);
    } else if (!yieldOk && !defectOk) {
      parts.push(`Periode ini perlu perhatian lebih karena ada beberapa hal yang belum sesuai harapan.`);
    } else {
      parts.push(`Kinerja periode ini cukup, tapi masih ada yang perlu diperbaiki.`);
    }

    // Rendemen
    if (yieldOk) {
      parts.push(`Hasil olahan (rendemen) sudah bagus dan memenuhi standar.`);
    } else {
      parts.push(`Hasil olahan (rendemen) masih kurang dari harapan — artinya bahan baku yang jadi produk masih terlalu sedikit.`);
    }

    // Defect Rate
    if (defectOk) {
      parts.push(`Kualitas produk terjaga dengan baik, produk cacat masih dalam batas wajar.`);
    } else {
      parts.push(`Produk cacat cukup banyak dan sudah melewati batas wajar, perlu dicek proses produksinya.`);
    }

    // Omset & Pasokan
    parts.push(`Total penjualan tercatat Rp ${omsetJuta} Juta dengan pasokan bahan masuk sebanyak ${supplyKg} kg.`);

    return parts.join(' ');
  };

  // Tentukan warna status keseluruhan
  const getStatusColor = () => {
    if (!metrics || !trendData) return { bg: 'var(--bg-subtle)', border: 'var(--border-default)', label: '—', color: 'var(--text-tertiary)' };
    const yieldOk = metrics.avg_yield_percentage >= (trendData.targets.yield || 80);
    const defectOk = metrics.overall_defect_rate <= (trendData.targets.defectRate || 5);
    if (yieldOk && defectOk) return { bg: 'var(--color-success-50)', border: 'var(--color-success-500)', label: '✅ Baik', color: 'var(--color-success-700)' };
    if (!yieldOk && !defectOk) return { bg: 'var(--color-warning-50)', border: 'var(--color-warning-500)', label: '⚠️ Perlu Perhatian', color: 'var(--color-danger-700)' };
    return { bg: 'var(--color-warning-50)', border: 'var(--color-warning-500)', label: '🔶 Sebagian Tercapai', color: 'var(--color-warning-700)' };
  };

  // Transform trendData for Recharts
  const chartData = trendData?.series.revenue.map((r, i) => ({
    label: r.label,
    revenue: r.value || 0,
    supply: trendData.series.supply[i]?.value || 0,
  })) || [];

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

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-8)' }}>
          <RefreshCw className="animate-spin" size={24} color="var(--text-tertiary)" />
        </div>
      ) : metrics && trendData ? (
        (() => {
          const status = getStatusColor();
          return (
        <>
          {/* ── Executive Summary ── */}
          <div style={{
            background: status.bg,
            borderLeft: `4px solid ${status.border}`,
            padding: 'var(--space-4) var(--space-5)',
            borderRadius: 'var(--radius-md)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              <h3 style={{ margin: 0, fontSize: 'var(--text-lg)', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                <BarChart3 size={20} /> Ringkasan Kinerja
              </h3>
              <span style={{
                padding: '4px 14px',
                borderRadius: 'var(--radius-full)',
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                color: status.color,
                background: 'rgba(255,255,255,0.7)',
                border: `1px solid ${status.border}`,
              }}>
                {status.label}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 'var(--text-md)', lineHeight: 1.7, color: 'var(--text-secondary)' }}>
              {generateStory()}
            </p>
          </div>

          {/* ── Delta KPI Cards ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
            <DeltaCard title="Omset Penjualan" value={`Rp ${(metrics.total_sales_revenue / 1_000_000).toFixed(1)}Jt`} delta={trendData.delta.revenue?.deltaPct} higherIsBetter={true} />
            <DeltaCard title="Total Pasokan" value={`${metrics.total_supply_kg.toLocaleString('id-ID')} kg`} delta={trendData.delta.supply?.deltaPct} higherIsBetter={true} />
            <DeltaCard title="Rata-rata Rendemen" value={`${metrics.avg_yield_percentage.toFixed(1)}%`} delta={trendData.delta.yield?.deltaPct} higherIsBetter={true} />
            <DeltaCard title="Defect Rate" value={`${metrics.overall_defect_rate.toFixed(2)}%`} delta={trendData.delta.defectRate?.deltaPct} higherIsBetter={false} />
          </div>

          {/* ── Recharts Visualizations ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 'var(--space-4)' }}>
            <Card header={<strong>Tren Finansial & Volume (vs Waktu)</strong>}>
              <div style={{ height: 320, marginTop: 'var(--space-4)' }}>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-tertiary)' }} />
                      <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-tertiary)' }} tickFormatter={(val: number) => `Rp${val/1000000}Jt`} />
<YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-tertiary)' }} tickFormatter={(val: number) => `${val}kg`} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--border-subtle)', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                      <Line yAxisId="left" type="monotone" dataKey="revenue" name="Omset" stroke="var(--color-primary-600)" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                      <Line yAxisId="right" type="monotone" dataKey="supply" name="Pasokan Masuk" stroke="var(--color-info-500)" strokeWidth={3} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: '14px' }}>
                    Belum ada data memadai untuk membentuk tren grafik.
                  </div>
                )}
              </div>
            </Card>

            <Card header={<strong>Indikator Kualitas (Pencapaian Target)</strong>}>
              <div style={{ height: 320, marginTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
                {/* Yield Bar */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Rata-rata Rendemen</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Target: ≥{trendData.targets.yield || 80}%</span>
                  </div>
                  <div style={{ height: 60 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[{ name: 'Rendemen', actual: metrics.avg_yield_percentage, target: trendData.targets.yield || 80 }]} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                        <XAxis type="number" domain={[0, 100]} hide />
                        <YAxis type="category" dataKey="name" hide />
                        <Tooltip cursor={false} contentStyle={{ borderRadius: '8px' }} />
                        <Bar dataKey="actual" barSize={24} radius={[0, 4, 4, 0]}>
                          <Cell fill={metrics.avg_yield_percentage >= (trendData.targets.yield || 80) ? 'var(--color-success-500)' : 'var(--color-danger-500)'} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                {/* Defect Bar */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Defect Rate</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Batas: ≤{trendData.targets.defectRate || 5}%</span>
                  </div>
                  <div style={{ height: 60 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[{ name: 'Defect', actual: metrics.overall_defect_rate, target: trendData.targets.defectRate || 5 }]} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                        <XAxis type="number" domain={[0, (trendData.targets.defectRate || 5) * 2]} hide />
                        <YAxis type="category" dataKey="name" hide />
                        <Tooltip cursor={false} contentStyle={{ borderRadius: '8px' }} />
                        <Bar dataKey="actual" barSize={24} radius={[0, 4, 4, 0]}>
                          <Cell fill={metrics.overall_defect_rate <= (trendData.targets.defectRate || 5) ? 'var(--color-success-500)' : 'var(--color-danger-500)'} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                  Warna merepresentasikan sentimen (Merah = Gagal mencapai standar operasional perusahaan).
                </p>
              </div>
            </Card>
          </div>
        </>
          );
        })()
      ) : null}


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

      <Card header={<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}><AlertTriangle size={18} /><strong>Antrean Tindakan & Pengingat</strong></div>}>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <li style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-warning-50)', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-warning-200)' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
               <AlertCircle size={16} color="var(--color-warning-600)" />
               <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-warning-700)' }}>Jadwal Stock Opname Akhir Bulan</span>
            </div>
            <Button variant="secondary" size="sm" onClick={() => window.location.href='/inventory'}>Mulai Opname</Button>
          </li>
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
