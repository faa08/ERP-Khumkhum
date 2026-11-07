'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Tabs } from '@/components/ui/Tabs';
import { Factory, Package, ShieldCheck, ShoppingCart, TrendingUp, AlertTriangle, RefreshCw, BarChart3, Settings, AlertCircle, CheckCircle2, Sprout, ArrowRight, Boxes } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { getKpiMetrics, getKpiTrend, getOperationalOverview, type KpiFilter, type KpiTrendData } from '@/actions/management';
import { getAppNotifications } from '@/actions/notifications';
import type { AppNotification } from '@/types/notification';
import type { DbKpiMetrics } from '@/types/database';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

type DateRangeOption = 'today' | '7days' | 'month' | 'custom';

const DATE_OPTIONS: { value: DateRangeOption; label: string }[] = [
  { value: 'today', label: 'Hari Ini' },
  { value: '7days', label: '7 Hari' },
  { value: 'month', label: 'Bulan Ini' },
  { value: 'custom', label: 'Custom' },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user?.role === 'SORTING') {
      router.replace('/sorting');
    }
  }, [user, router]);

  if (user?.role === 'SORTING') return null;

  // Role operasional (PRODUCTION, WAREHOUSE, PREMIX) default ke Daily Operations
  // Role manajemen / lainnya default ke Executive Overview
  const isOpsRole = user?.role === 'PRODUCTION' || user?.role === 'WAREHOUSE' || user?.role === 'PREMIX';
  const defaultTab = isOpsRole ? 'operational' : 'executive';

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview operasional & KPI eksekutif KhumKhum Jamur Crispy."
        breadcrumbs={[{ label: 'Dashboard' }]}
      />

      <Tabs
        key={user?.role || 'default'}
        defaultTab={defaultTab}
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
    if (!metrics || !trendData) return { bg: 'var(--bg-subtle)', border: 'var(--border-default)', label: '—', color: 'var(--text-tertiary)', icon: null };
    const yieldOk = metrics.avg_yield_percentage >= (trendData.targets.yield || 80);
    const defectOk = metrics.overall_defect_rate <= (trendData.targets.defectRate || 5);
    if (yieldOk && defectOk) return { bg: 'var(--color-success-50)', border: 'var(--color-success-500)', label: 'Baik', color: 'var(--color-success-700)', icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" aria-hidden="true" /> };
    if (!yieldOk && !defectOk) return { bg: 'var(--color-warning-50)', border: 'var(--color-warning-500)', label: 'Perlu Perhatian', color: 'var(--color-danger-700)', icon: <AlertTriangle className="w-4 h-4 text-rose-600" aria-hidden="true" /> };
    return { bg: 'var(--color-warning-50)', border: 'var(--color-warning-500)', label: 'Sebagian Tercapai', color: 'var(--color-warning-700)', icon: <AlertCircle className="w-4 h-4 text-amber-600" aria-hidden="true" /> };
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
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                {status.icon}
                <span>{status.label}</span>
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
              <div style={{ height: 320, marginTop: 'var(--space-2)', display: 'flex', flexDirection: 'column', justifyContent: 'space-around', gap: 'var(--space-4)' }}>
                {/* Yield Bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Rata-rata Rendemen</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginLeft: '8px' }}>Target: ≥{trendData.targets.yield || 80}%</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <strong style={{ fontSize: '1.1rem', color: metrics.avg_yield_percentage >= (trendData.targets.yield || 80) ? 'var(--color-success-600)' : 'var(--color-danger-600)' }}>
                        {metrics.avg_yield_percentage.toFixed(1)}%
                      </strong>
                      <span style={{
                        padding: '1px 8px',
                        borderRadius: '999px',
                        fontSize: '11px',
                        fontWeight: 600,
                        background: metrics.avg_yield_percentage >= (trendData.targets.yield || 80) ? 'var(--color-success-50)' : 'var(--color-danger-50)',
                        color: metrics.avg_yield_percentage >= (trendData.targets.yield || 80) ? 'var(--color-success-700)' : 'var(--color-danger-700)',
                        border: `1px solid ${metrics.avg_yield_percentage >= (trendData.targets.yield || 80) ? 'var(--color-success-200)' : 'var(--color-danger-200)'}`,
                      }}>
                        {metrics.avg_yield_percentage >= (trendData.targets.yield || 80) ? 'Memenuhi Standar' : 'Di Bawah Standar'}
                      </span>
                    </div>
                  </div>
                  {/* Progress Track */}
                  <div style={{ position: 'relative', width: '100%', height: '20px', background: 'var(--bg-subtle)', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(100, Math.max(0, metrics.avg_yield_percentage))}%`,
                        background: metrics.avg_yield_percentage >= (trendData.targets.yield || 80) ? 'var(--color-success-500)' : 'var(--color-danger-500)',
                        borderRadius: '4px',
                        transition: 'width 0.6s ease',
                      }}
                    />
                    {/* Target line at 80% */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        left: `${trendData.targets.yield || 80}%`,
                        width: '2px',
                        background: '#1e293b',
                        opacity: 0.6,
                        zIndex: 2,
                      }}
                      title={`Garis Target: ${trendData.targets.yield || 80}%`}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                    <span>0%</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Target: {trendData.targets.yield || 80}%</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Defect Bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Defect Rate</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginLeft: '8px' }}>Batas: ≤{trendData.targets.defectRate || 5}%</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <strong style={{ fontSize: '1.1rem', color: metrics.overall_defect_rate <= (trendData.targets.defectRate || 5) ? 'var(--color-success-600)' : 'var(--color-danger-600)' }}>
                        {metrics.overall_defect_rate.toFixed(2)}%
                      </strong>
                      <span style={{
                        padding: '1px 8px',
                        borderRadius: '999px',
                        fontSize: '11px',
                        fontWeight: 600,
                        background: metrics.overall_defect_rate <= (trendData.targets.defectRate || 5) ? 'var(--color-success-50)' : 'var(--color-danger-50)',
                        color: metrics.overall_defect_rate <= (trendData.targets.defectRate || 5) ? 'var(--color-success-700)' : 'var(--color-danger-700)',
                        border: `1px solid ${metrics.overall_defect_rate <= (trendData.targets.defectRate || 5) ? 'var(--color-success-200)' : 'var(--color-danger-200)'}`,
                      }}>
                        {metrics.overall_defect_rate === 0
                          ? 'Sempurna (Nihil Cacat)'
                          : metrics.overall_defect_rate <= (trendData.targets.defectRate || 5)
                          ? 'Bagus (Toleransi Aman)'
                          : 'Cacat Melebihi Batas'}
                      </span>
                    </div>
                  </div>
                  {/* Progress Track */}
                  <div style={{ position: 'relative', width: '100%', height: '20px', background: 'var(--bg-subtle)', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(100, Math.max(metrics.overall_defect_rate === 0 ? 0 : 2, (metrics.overall_defect_rate / ((trendData.targets.defectRate || 5) * 2)) * 100))}%`,
                        background: metrics.overall_defect_rate <= (trendData.targets.defectRate || 5) ? 'var(--color-success-500)' : 'var(--color-danger-500)',
                        borderRadius: '4px',
                        transition: 'width 0.6s ease',
                      }}
                    />
                    {/* Limit line at 50% (which represents the 5% threshold out of 10% max) */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        left: '50%',
                        width: '2px',
                        background: '#dc2626',
                        opacity: 0.6,
                        zIndex: 2,
                      }}
                      title={`Batas Toleransi: ${trendData.targets.defectRate || 5}%`}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                    <span>0% (Ideal)</span>
                    <span style={{ fontWeight: 600, color: '#dc2626' }}>Batas: {trendData.targets.defectRate || 5}%</span>
                    <span>10% (Kritis)</span>
                  </div>
                </div>

                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                  Indikator visual mutu operasional: Rendemen semakin tinggi semakin baik (≥80%), Defect rate semakin rendah semakin baik (≤5%).
                </p>
              </div>
            </Card>
          </div>
        </>
          );
        })()
      ) : (
        <div style={{
          padding: 'var(--space-8)',
          textAlign: 'center',
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          marginTop: 'var(--space-4)',
        }}>
          <AlertCircle size={32} style={{ color: 'var(--text-tertiary)', margin: '0 auto var(--space-2)' }} />
          <h4 style={{ margin: '0 0 var(--space-1)', color: 'var(--text-primary)' }}>Data Metrik Tidak Ditemukan</h4>
          <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
            Belum ada catatan transaksi operasional untuk rentang periode ini.
          </p>
          <Button variant="secondary" size="sm" onClick={loadMetrics} style={{ marginTop: 'var(--space-3)' }} leftIcon={<RefreshCw size={14} />}>
            Muat Ulang
          </Button>
        </div>
      )}


    </div>
  );
}

// ─────────────────────────────────────────────
// OPERATIONAL DASHBOARD (Daily Ops)
// ─────────────────────────────────────────────
function OperationalDashboard() {
  const router = useRouter();
  const [stockAlerts, setStockAlerts] = useState<AppNotification[]>([]);
  const [opsData, setOpsData] = useState<{
    activeBatches: {
      id: string;
      batch_number: string;
      status: string;
      product_name: string;
      target_quantity: number;
      created_at: string;
    }[];
    actionQueues: {
      pendingReceivingCount: number;
      pendingQcCount: number;
      pendingDeliveryCount: number;
    };
    stockSummary: {
      rawMaterialKg: number;
      finishedGoodsPcs: number;
    };
    recentDeliveries: {
      id: string;
      order_number: string;
      total_amount: number;
      customer_name: string;
      status: string;
      created_at: string;
    }[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(() => {
    setIsLoading(true);
    let mounted = true;
    Promise.all([
      getAppNotifications(),
      getOperationalOverview(),
    ])
      .then(([notifRes, opsRes]) => {
        if (!mounted) return;
        if (notifRes.success && notifRes.data) {
          setStockAlerts(notifRes.data.filter((n) => n.category === 'INVENTORY'));
        }
        if (opsRes.success && opsRes.data) {
          setOpsData(opsRes.data);
        }
      })
      .catch((err) => console.warn('Failed to load operational data:', err))
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const mapBatchStatus = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'wip') return 'in_progress';
    if (s === 'completed') return 'completed';
    if (s === 'cancelled') return 'cancelled';
    return 'planned';
  };

  const mapOrderStatus = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'delivered') return 'delivered';
    if (s === 'shipped') return 'shipped';
    if (s === 'processing') return 'in_progress';
    if (s === 'pending') return 'pending';
    return 'neutral';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
      {/* ── Ringkasan Cepat Stok Fisik ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-4)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
        }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-primary-50)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-primary-600)',
          }}>
            <Sprout className="w-5 h-5 text-currentColor" aria-hidden="true" />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Stok Jamur Segar (Bahan Baku)
            </p>
            <p style={{ margin: '2px 0 0', fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {isLoading ? '...' : `${(opsData?.stockSummary.rawMaterialKg ?? 0).toLocaleString('id-ID')} kg`}
            </p>
          </div>
        </div>

        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-4)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
        }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(37, 99, 235, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#2563EB',
          }}>
            <Boxes className="w-5 h-5 text-currentColor" aria-hidden="true" />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Stok Produk Jadi Siap Jual
            </p>
            <p style={{ margin: '2px 0 0', fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {isLoading ? '...' : `${(opsData?.stockSummary.finishedGoodsPcs ?? 0).toLocaleString('id-ID')} pcs`}
            </p>
          </div>
        </div>

        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-4)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
        }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-warning-50)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-warning-600)',
          }}>
            <AlertTriangle className="w-5 h-5 text-currentColor" aria-hidden="true" />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Total Antrean Operasional
            </p>
            <p style={{ margin: '2px 0 0', fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {isLoading
                ? '...'
                : `${(opsData?.actionQueues.pendingReceivingCount ?? 0) + (opsData?.actionQueues.pendingQcCount ?? 0) + (opsData?.actionQueues.pendingDeliveryCount ?? 0)} antrean`}
            </p>
          </div>
        </div>
      </div>

      {/* ── 4 Kartu Operasional Utama ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
        
        {/* Batch Produksi Aktif */}
        <Card
          header={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Factory className="w-4 h-4 text-currentColor" aria-hidden="true" />
                <strong>Batch Produksi Terkini</strong>
              </div>
              <Button variant="ghost" size="sm" onClick={() => router.push('/production')}>
                Buka SPK
              </Button>
            </div>
          }
        >
          {isLoading ? (
            <div style={{ padding: 'var(--space-4) 0', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', textAlign: 'center' }}>
              Memuat data batch...
            </div>
          ) : !opsData?.activeBatches.length ? (
            <div style={{ padding: 'var(--space-3) 0', color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>
              Belum ada batch produksi aktif.
            </div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {opsData.activeBatches.slice(0, 4).map((b) => (
                <li
                  key={b.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-subtle)',
                    cursor: 'pointer',
                  }}
                  onClick={() => router.push('/production')}
                  title="Buka detail produksi"
                >
                  <div style={{ minWidth: 0, paddingRight: '8px' }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 'var(--text-xs)', color: 'var(--text-primary)' }}>
                      {b.batch_number} — {b.product_name}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      Target: {b.target_quantity} pcs &bull; {format(new Date(b.created_at), 'd MMM yyyy', { locale: idLocale })}
                    </p>
                  </div>
                  <StatusBadge status={mapBatchStatus(b.status)} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Antrean Tindakan & Pengingat */}
        <Card
          header={
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <AlertTriangle className="w-4 h-4 text-currentColor" aria-hidden="true" />
              <strong>Antrean Tindakan &amp; Pengingat</strong>
            </div>
          }
        >
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <li style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-warning-50)', padding: '8px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-warning-200)' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <AlertCircle className="w-4 h-4 text-currentColor" color="var(--color-warning-600)" aria-hidden="true" />
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-warning-700)' }}>Jadwal Stock Opname Berkala</span>
              </div>
              <Button variant="secondary" size="sm" onClick={() => router.push('/inventory')}>
                Mulai
              </Button>
            </li>
            
            <li
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 4px', cursor: 'pointer' }}
              onClick={() => router.push('/sorting')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                  {opsData?.actionQueues.pendingReceivingCount ?? 0} Penerimaan menunggu sortasi
                </span>
              </div>
              <StatusBadge status={(opsData?.actionQueues.pendingReceivingCount ?? 0) > 0 ? 'pending' : 'completed'} />
            </li>

            <li
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 4px', cursor: 'pointer' }}
              onClick={() => router.push('/quality-control')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                  {opsData?.actionQueues.pendingQcCount ?? 0} Batch SPK siap inspeksi QC
                </span>
              </div>
              <StatusBadge status={(opsData?.actionQueues.pendingQcCount ?? 0) > 0 ? 'pending' : 'completed'} />
            </li>

            <li
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 4px', cursor: 'pointer' }}
              onClick={() => router.push('/sales')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                  {opsData?.actionQueues.pendingDeliveryCount ?? 0} Pesanan dalam proses
                </span>
              </div>
              <StatusBadge status={(opsData?.actionQueues.pendingDeliveryCount ?? 0) > 0 ? 'pending' : 'completed'} />
            </li>
          </ul>
        </Card>

        {/* Alert Stok Gudang */}
        <Card
          header={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Package className="w-4 h-4 text-currentColor" aria-hidden="true" />
                <strong>Alert Stok Gudang ({stockAlerts.length})</strong>
              </div>
              {stockAlerts.some((s) => s.severity === 'danger') && (
                <span style={{ fontSize: '11px', color: 'var(--color-danger-700)', fontWeight: 700, background: 'var(--color-danger-50)', border: '1px solid var(--color-danger-200)', borderRadius: '4px', padding: '1px 6px' }}>
                  {stockAlerts.filter((s) => s.severity === 'danger').length} Habis
                </span>
              )}
            </div>
          }
        >
          {isLoading ? (
            <div style={{ padding: 'var(--space-3) 0', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', textAlign: 'center' }}>
              Memeriksa inventori gudang...
            </div>
          ) : stockAlerts.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: 'var(--space-3) 0', color: 'var(--color-success-700)', fontSize: 'var(--text-sm)' }}>
              <CheckCircle2 className="w-4 h-4 text-currentColor" aria-hidden="true" />
              <span>Seluruh stok bahan baku &amp; produk dalam batas aman.</span>
            </div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {stockAlerts.slice(0, 4).map((alert) => (
                <li
                  key={alert.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    background: alert.severity === 'danger' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                    border: alert.severity === 'danger' ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid rgba(245, 158, 11, 0.25)',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease',
                  }}
                  onClick={() => router.push(alert.link)}
                  title="Klik untuk membuka inventori gudang"
                >
                  <div style={{ minWidth: 0, paddingRight: '8px' }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 'var(--text-xs)', color: 'var(--text-primary)' }}>
                      {alert.title}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.3 }}>
                      {alert.message}
                    </p>
                  </div>
                  <StatusBadge status={alert.severity === 'danger' ? 'out_of_stock' : 'low_stock'} />
                </li>
              ))}
              {stockAlerts.length > 4 && (
                <div style={{ textAlign: 'center', marginTop: '4px' }}>
                  <Button variant="ghost" size="sm" onClick={() => router.push('/inventory')}>
                    Lihat {stockAlerts.length - 4} item stok lainnya &rarr;
                  </Button>
                </div>
              )}
            </ul>
          )}
        </Card>

        {/* Pengiriman & Penjualan Terbaru */}
        <Card
          header={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <ShoppingCart className="w-4 h-4 text-currentColor" aria-hidden="true" />
                <strong>Pesanan Penjualan Terbaru</strong>
              </div>
              <Button variant="ghost" size="sm" onClick={() => router.push('/sales')}>
                Buka Sales
              </Button>
            </div>
          }
        >
          {isLoading ? (
            <div style={{ padding: 'var(--space-4) 0', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', textAlign: 'center' }}>
              Memuat data penjualan...
            </div>
          ) : !opsData?.recentDeliveries.length ? (
            <div style={{ padding: 'var(--space-3) 0', color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>
              Belum ada data pesanan penjualan.
            </div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {opsData.recentDeliveries.map((order) => (
                <li
                  key={order.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-subtle)',
                    cursor: 'pointer',
                  }}
                  onClick={() => router.push('/sales')}
                  title="Buka manajemen penjualan"
                >
                  <div style={{ minWidth: 0, paddingRight: '8px' }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 'var(--text-xs)', color: 'var(--text-primary)' }}>
                      {order.order_number} &bull; {order.customer_name}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      Rp {order.total_amount.toLocaleString('id-ID')} &bull; {format(new Date(order.created_at), 'd MMM yyyy', { locale: idLocale })}
                    </p>
                  </div>
                  <StatusBadge status={mapOrderStatus(order.status)} />
                </li>
              ))}
            </ul>
          )}
        </Card>

      </div>
    </div>
  );
}
