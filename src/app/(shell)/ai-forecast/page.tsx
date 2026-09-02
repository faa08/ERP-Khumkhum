'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Tooltip } from '@/components/ui/Tooltip';
import { useToast } from '@/hooks/useToast';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Package,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Calendar,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  BarChart3,
  Info,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Layers,
  Activity,
  Zap,
} from 'lucide-react';
import { getMaterialForecast, getOperationalInsights } from '@/actions/forecast';
import type {
  ForecastWeekProjection,
  MaterialForecastItem,
  OperationalInsight,
  ForecastMetadata,
} from '@/types/database';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';

// ─────────────────────────────────────────────
// HELPER COMPONENTS
// ─────────────────────────────────────────────

/** Confidence badge with color-coded visual bar */
function ConfidenceBadge({ level }: { level: string }) {
  const config = {
    'Tinggi': { color: 'var(--color-success-600)', bg: 'var(--color-success-50)', border: 'var(--color-success-200)', width: '100%', label: 'Akurasi Tinggi' },
    'Sedang': { color: 'var(--color-warning-600)', bg: 'var(--color-warning-50)', border: 'var(--color-warning-200)', width: '66%', label: 'Akurasi Sedang' },
    'Rendah': { color: 'var(--color-danger-600)', bg: 'var(--color-danger-50)', border: 'var(--color-danger-200)', width: '33%', label: 'Akurasi Rendah' },
  }[level] || { color: 'var(--text-secondary)', bg: 'var(--bg-subtle)', border: 'var(--border-color)', width: '50%', label: level };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{
          fontSize: '11px',
          fontWeight: 600,
          color: config.color,
          padding: '2px 8px',
          borderRadius: '999px',
          background: config.bg,
          border: `1px solid ${config.border}`,
        }}>
          {config.label}
        </span>
      </div>
      <div style={{ height: '4px', borderRadius: '999px', background: 'var(--bg-subtle)', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: config.width,
          borderRadius: '999px',
          background: config.color,
          transition: 'width 0.6s ease',
        }} />
      </div>
    </div>
  );
}

/** Percentage change indicator */
function ChangeIndicator({ value, suffix = 'dari rata-rata' }: { value: number; suffix?: string }) {
  const isPositive = value >= 0;
  const Icon = isPositive ? ArrowUpRight : ArrowDownRight;
  const color = isPositive ? 'var(--color-success-600)' : 'var(--color-danger-600)';
  const bg = isPositive ? 'var(--color-success-50)' : 'var(--color-danger-50)';

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '2px',
      fontSize: '11px',
      fontWeight: 600,
      color,
      background: bg,
      padding: '2px 6px',
      borderRadius: '999px',
    }}>
      <Icon size={12} />
      {isPositive ? '+' : ''}{value.toFixed(1)}% {suffix}
    </span>
  );
}

/** Progress bar comparing two values */
function ComparisonBar({ historical, projected, uom }: { historical: number; projected: number; uom: string }) {
  const max = Math.max(historical, projected) * 1.2;
  const histPercent = max > 0 ? (historical / max) * 100 : 0;
  const projPercent = max > 0 ? (projected / max) * 100 : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', width: '50px', flexShrink: 0 }}>Historis</span>
        <div style={{ flex: 1, height: '6px', borderRadius: '999px', background: 'var(--bg-subtle)', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${histPercent}%`,
            borderRadius: '999px',
            background: 'var(--color-primary-300)',
            transition: 'width 0.5s ease',
          }} />
        </div>
        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600, minWidth: '60px', textAlign: 'right' }}>
          {historical.toLocaleString('id-ID')} {uom}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', width: '50px', flexShrink: 0 }}>Proyeksi</span>
        <div style={{ flex: 1, height: '6px', borderRadius: '999px', background: 'var(--bg-subtle)', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${projPercent}%`,
            borderRadius: '999px',
            background: 'var(--color-primary-600)',
            transition: 'width 0.5s ease',
          }} />
        </div>
        <span style={{ fontSize: '10px', color: 'var(--color-primary-700)', fontWeight: 700, minWidth: '60px', textAlign: 'right' }}>
          {projected.toLocaleString('id-ID')} {uom}
        </span>
      </div>
    </div>
  );
}

/** Section explainer/info banner */
function SectionExplainer({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 'var(--space-2)',
      padding: 'var(--space-3) var(--space-4)',
      background: 'var(--color-primary-50)',
      border: '1px solid var(--color-primary-100)',
      borderRadius: 'var(--radius-md)',
      marginBottom: 'var(--space-4)',
      fontSize: 'var(--text-sm)',
      color: 'var(--color-primary-800)',
      lineHeight: 1.5,
    }}>
      <span style={{ flexShrink: 0, marginTop: '2px' }}>{icon}</span>
      <span>{text}</span>
    </div>
  );
}


// ─────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────

export default function AiForecastPage() {
  const [projections, setProjections] = useState<ForecastWeekProjection[]>([]);
  const [materials, setMaterials] = useState<MaterialForecastItem[]>([]);
  const [insights, setInsights] = useState<OperationalInsight[]>([]);
  const [historicalData, setHistoricalData] = useState<number[]>([]);
  const [historicalLabels, setHistoricalLabels] = useState<string[]>([]);
  const [avgDemandKg, setAvgDemandKg] = useState<number>(0);
  const [metadata, setMetadata] = useState<ForecastMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const toast = useToast();

  const loadForecastData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [forecastRes, insightsRes] = await Promise.all([
        getMaterialForecast(),
        getOperationalInsights(),
      ]);

      if (forecastRes.success && forecastRes.data) {
        setProjections(forecastRes.data.weeklyProjections || []);
        setMaterials(forecastRes.data.materialRequirements || []);
        setHistoricalData(forecastRes.data.historicalWeeklyVolumes || []);
        setHistoricalLabels(forecastRes.data.historicalWeekLabels || []);
        setAvgDemandKg(forecastRes.data.avgDemandKg || 0);
        setMetadata(forecastRes.data.metadata || null);
      }

      if (insightsRes.success && insightsRes.data) {
        setInsights(insightsRes.data);
      }
    } catch (err: any) {
      console.error('Gagal memuat proyeksi AI:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadForecastData();
  }, [loadForecastData]);

  // ── Computed Data ──────────────────────────────────────────────
  const nextWeekKg = projections[0]?.projected_kg || avgDemandKg;
  const trendPercent = avgDemandKg > 0 ? ((nextWeekKg - avgDemandKg) / avgDemandKg) * 100 : 0;
  const warningCount = insights.filter(i => i.type === 'WARNING').length;
  const successCount = insights.filter(i => i.type === 'SUCCESS').length;
  const isInsufficientData = metadata?.dataQuality === 'INSUFFICIENT';

  // Build chart data: historical + projected
  const chartData = useMemo(() => {
    const data: { name: string; historis: number | null; proyeksi: number | null }[] = [];

    // Historical data points — use actual week labels from backend
    historicalData.forEach((kg, i) => {
      data.push({
        name: historicalLabels[i] || `H-${historicalData.length - i}`,
        historis: kg > 0 ? kg : null,
        proyeksi: null,
      });
    });

    // Bridge point: last historical = first projection connection
    if (historicalData.length > 0 && projections.length > 0) {
      const lastHistorical = historicalData[historicalData.length - 1];
      if (lastHistorical > 0) {
        data[data.length - 1] = {
          ...data[data.length - 1],
          proyeksi: lastHistorical, // bridge connection
        };
      }
    }

    // Projection data points
    projections.forEach((p) => {
      data.push({
        name: p.week.replace('Minggu ke-', 'P-'),
        historis: null,
        proyeksi: p.projected_kg,
      });
    });

    return data;
  }, [historicalData, historicalLabels, projections]);

  // Build material breakdown chart data
  const materialChartData = useMemo(() => {
    return materials.map(m => ({
      name: m.material_name.length > 15 ? m.material_name.substring(0, 15) + '…' : m.material_name,
      fullName: m.material_name,
      kebutuhan: m.projected_demand,
      pengadaan: m.total_procurement_needed,
      safetyStock: m.safety_stock,
    }));
  }, [materials]);

  const barColors = [
    'var(--color-primary-500)',
    'var(--color-success-500)',
    'var(--color-warning-500)',
    'var(--color-danger-500)',
    '#8b5cf6',
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <PageHeader
        title="Wawasan Operasional & AI Forecasting (MRP)"
        description="Peramalan kebutuhan bahan baku, estimasi permintaan pasar, dan rekomendasi mitigasi anomali produksi berbasis data historis."
        breadcrumbs={[{ label: 'Manajemen' }, { label: 'Prakiraan AI' }]}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--text-secondary)' }}>
              <Brain size={18} color="var(--color-primary-600)" />
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                Model: <strong>KhumKhum-Predictive v2.1</strong>
              </span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={loadForecastData}
              disabled={isLoading}
              leftIcon={<RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />}
            >
              Perbarui Proyeksi
            </Button>
          </div>
        }
      />

      {/* ════════════════════════════════════════════════════════════ */}
      {/* DATA QUALITY BANNER                                        */}
      {/* ════════════════════════════════════════════════════════════ */}
      {metadata && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
          padding: 'var(--space-3) var(--space-4)',
          background: isInsufficientData ? 'var(--color-danger-50)' : metadata.dataQuality === 'LIMITED' ? 'var(--color-warning-50)' : 'var(--color-success-50)',
          border: `1px solid ${isInsufficientData ? 'var(--color-danger-200)' : metadata.dataQuality === 'LIMITED' ? 'var(--color-warning-200)' : 'var(--color-success-200)'}`,
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--text-sm)',
          color: isInsufficientData ? 'var(--color-danger-800)' : metadata.dataQuality === 'LIMITED' ? 'var(--color-warning-800)' : 'var(--color-success-800)',
        }}>
          {isInsufficientData ? <AlertCircle size={18} /> : metadata.dataQuality === 'LIMITED' ? <Info size={18} /> : <ShieldCheck size={18} />}
          <div style={{ flex: 1 }}>
            <strong>
              {isInsufficientData
                ? '⚠️ Data Tidak Cukup untuk Forecasting'
                : metadata.dataQuality === 'LIMITED'
                  ? '📊 Data Terbatas — Akurasi Prediksi Mungkin Rendah'
                  : '✅ Data Memadai — Prediksi Akurat'}
            </strong>
            <div style={{ fontSize: 'var(--text-xs)', marginTop: '2px', opacity: 0.85 }}>
              Sumber: {metadata.dataSourceLabel} • {metadata.totalHistoricalWeeks} minggu data historis • Variabilitas (CV): {metadata.coefficientOfVariation}%
            </div>
          </div>
          <span style={{
            fontSize: '10px',
            fontWeight: 600,
            padding: '3px 8px',
            borderRadius: '999px',
            background: 'rgba(255,255,255,0.7)',
          }}>
            {metadata.dataSource === 'PRODUCTION' ? '📦 Produksi'
              : metadata.dataSource === 'RECEIVING' ? '📥 Penerimaan'
                : metadata.dataSource === 'SORTING' ? '🔍 Sortasi'
                  : '❌ Tidak Ada Data'}
          </span>
        </div>
      )}

      {/* Show warning if insufficient data */}
      {isInsufficientData && (
        <div style={{
          padding: 'var(--space-6)',
          textAlign: 'center',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--text-secondary)',
        }}>
          <AlertCircle size={48} color="var(--color-danger-400)" style={{ margin: '0 auto var(--space-3)' }} />
          <h3 style={{ margin: '0 0 var(--space-2)', color: 'var(--text-primary)' }}>Data Historis Belum Mencukupi</h3>
          <p style={{ margin: 0, maxWidth: 500, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
            Sistem membutuhkan minimal <strong>3 minggu data</strong> dari produksi, penerimaan, atau sortasi untuk menjalankan model prediksi.
            Pastikan data sudah diinput melalui modul Produksi, Gudang, atau PPIC.
          </p>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════ */}
      {/* 0. EXECUTIVE SUMMARY CARDS                                 */}
      {/* ════════════════════════════════════════════════════════════ */}
      {!isInsufficientData && (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-3)' }}>
        {/* Card 1: Rata-rata Permintaan */}
        <div style={{
          padding: 'var(--space-4)',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-2)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 'var(--radius-md)',
              background: 'var(--color-primary-50)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <BarChart3 size={18} color="var(--color-primary-600)" />
            </div>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Rata-rata Mingguan
            </span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {avgDemandKg.toLocaleString('id-ID')} <span style={{ fontSize: 'var(--text-sm)', fontWeight: 400, color: 'var(--text-secondary)' }}>kg</span>
          </div>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
            Berdasarkan {historicalData.length} minggu data produksi terakhir
          </span>
        </div>

        {/* Card 2: Prediksi Minggu Depan */}
        <div style={{
          padding: 'var(--space-4)',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-2)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 'var(--radius-md)',
              background: trendPercent >= 0 ? 'var(--color-success-50)' : 'var(--color-danger-50)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {trendPercent >= 0
                ? <TrendingUp size={18} color="var(--color-success-600)" />
                : <TrendingDown size={18} color="var(--color-danger-600)" />}
            </div>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Prediksi Minggu Depan
            </span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {nextWeekKg.toLocaleString('id-ID')} <span style={{ fontSize: 'var(--text-sm)', fontWeight: 400, color: 'var(--text-secondary)' }}>kg</span>
          </div>
          <ChangeIndicator value={trendPercent} />
        </div>

        {/* Card 3: Total Jenis Material */}
        <div style={{
          padding: 'var(--space-4)',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-2)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 'var(--radius-md)',
              background: 'var(--color-warning-50)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Layers size={18} color="var(--color-warning-600)" />
            </div>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Material Perlu Diadakan
            </span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {materials.length} <span style={{ fontSize: 'var(--text-sm)', fontWeight: 400, color: 'var(--text-secondary)' }}>jenis</span>
          </div>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
            Bahan baku, bumbu, dan kemasan untuk produksi
          </span>
        </div>

        {/* Card 4: Status Operasional */}
        <div style={{
          padding: 'var(--space-4)',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-2)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 'var(--radius-md)',
              background: warningCount > 0 ? 'var(--color-danger-50)' : 'var(--color-success-50)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {warningCount > 0
                ? <AlertCircle size={18} color="var(--color-danger-600)" />
                : <ShieldCheck size={18} color="var(--color-success-600)" />}
            </div>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Status Operasional
            </span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: warningCount > 0 ? 'var(--color-danger-600)' : 'var(--color-success-600)' }}>
            {warningCount > 0 ? `${warningCount} Peringatan` : 'Semua Normal'}
          </div>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
            {successCount} indikator optimal • {warningCount} perlu perhatian
          </span>
        </div>
      </div>
      )}

      {/* ════════════════════════════════════════════════════════════ */}
      {/* 1. TREND CHART: HISTORIS → PROYEKSI                        */}
      {/* ════════════════════════════════════════════════════════════ */}
      {!isInsufficientData && (
      <Card header={
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Activity size={18} color="var(--color-primary-600)" />
          <strong style={{ color: 'var(--color-primary-700)' }}>Grafik Tren: Data Historis → Proyeksi AI</strong>
        </div>
      }>
        <SectionExplainer
          icon={<Info size={16} color="var(--color-primary-600)" />}
          text={`Grafik di bawah menunjukkan perbandingan data produksi aktual (${historicalData.length} minggu terakhir) dengan proyeksi AI untuk 4 minggu ke depan. Garis biru solid adalah data historis, garis hijau putus-putus adalah prediksi menggunakan metode Exponential Smoothing (α = 0.35) dengan safety factor 10%.`}
        />

        <div style={{ height: 320, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="gradHistoris" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-primary-500)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-primary-500)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradProyeksi" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-success-500)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-success-500)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} />
              <YAxis stroke="var(--text-secondary)" fontSize={12} unit=" kg" />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '13px',
                }}
                itemStyle={{ color: 'var(--text-primary)' }}
                formatter={(value: any, name: string) => {
                  const label = name === 'historis' ? 'Data Aktual' : 'Prediksi AI';
                  return [value ? `${Number(value).toLocaleString('id-ID')} kg` : '-', label];
                }}
              />
              <Legend
                formatter={(value: string) => value === 'historis' ? '📊 Data Historis (Aktual)' : '🔮 Proyeksi AI'}
              />
              <Area
                type="monotone"
                dataKey="historis"
                stroke="var(--color-primary-600)"
                strokeWidth={2.5}
                fill="url(#gradHistoris)"
                dot={{ r: 4, fill: 'var(--color-primary-600)' }}
                activeDot={{ r: 6 }}
                connectNulls={false}
              />
              <Area
                type="monotone"
                dataKey="proyeksi"
                stroke="var(--color-success-600)"
                strokeWidth={2.5}
                strokeDasharray="8 4"
                fill="url(#gradProyeksi)"
                dot={{ r: 4, fill: 'var(--color-success-600)', strokeDasharray: '0' }}
                activeDot={{ r: 6 }}
                connectNulls={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Legend penjelasan */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'var(--space-4)',
          marginTop: 'var(--space-3)',
          padding: 'var(--space-3)',
          background: 'var(--bg-subtle)',
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--text-xs)',
          color: 'var(--text-secondary)',
        }}>
          <span>📈 <strong>H-n</strong> = Data produksi minggu ke-n lalu</span>
          <span>🔮 <strong>P-n</strong> = Proyeksi minggu ke-n depan</span>
          <span>⚙️ <strong>Metode:</strong> Exponential Smoothing (α = 0.35)</span>
          <span>🛡️ <strong>Safety Factor:</strong> +10% antisipasi lonjakan</span>
        </div>
      </Card>
      )}

      {/* ════════════════════════════════════════════════════════════ */}
      {/* 2. DEMAND PROJECTIONS (4 Weeks) — IMPROVED                 */}
      {/* ════════════════════════════════════════════════════════════ */}
      {!isInsufficientData && (
      <Card header={
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <TrendingUp size={18} color="var(--color-primary-600)" />
          <strong style={{ color: 'var(--color-primary-700)' }}>Proyeksi Kebutuhan Jamur Segar — 4 Minggu Ke Depan</strong>
        </div>
      }>
        <SectionExplainer
          icon={<Calendar size={16} color="var(--color-primary-600)" />}
          text={`Setiap kartu menampilkan estimasi kebutuhan jamur segar untuk masing-masing minggu. Warna menunjukkan tingkat urgensi, dan bar akurasi menggambarkan seberapa yakin model AI dengan prediksi tersebut. Semakin jauh minggunya, semakin rendah akurasinya.`}
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 'var(--space-3)' }}>
          {projections.map((p, index) => {
            const pctChange = avgDemandKg > 0 ? ((p.projected_kg - avgDemandKg) / avgDemandKg) * 100 : 0;
            const isUp = pctChange >= 0;

            return (
              <div
                key={index}
                style={{
                  padding: 'var(--space-4)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderLeft: `4px solid ${p.status_color}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-2)',
                }}
              >
                {/* Header: week + date */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {p.week}
                  </span>
                  <span style={{
                    fontSize: '10px',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    background: 'var(--bg-subtle)',
                    color: 'var(--text-tertiary)',
                    fontWeight: 500,
                  }}>
                    {p.date_label}
                  </span>
                </div>

                {/* Main value */}
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: p.status_color }}>
                  {p.projected_kg.toLocaleString('id-ID')} <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-secondary)' }}>kg</span>
                </div>

                {/* Trend vs average */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <ChangeIndicator value={pctChange} />
                </div>

                {/* Narrative */}
                <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {isUp
                    ? `Permintaan diprediksi naik ${Math.abs(pctChange).toFixed(1)}% dari rata-rata historis (${avgDemandKg.toLocaleString('id-ID')} kg).`
                    : pctChange === 0
                      ? `Permintaan diprediksi stabil sesuai rata-rata historis.`
                      : `Permintaan diprediksi turun ${Math.abs(pctChange).toFixed(1)}% dari rata-rata historis (${avgDemandKg.toLocaleString('id-ID')} kg).`
                  }
                </p>

                {/* Confidence bar */}
                <ConfidenceBadge level={p.confidence} />
              </div>
            );
          })}
        </div>
      </Card>
      )}

      {/* ════════════════════════════════════════════════════════════ */}
      {/* 3. MRP TABLE — IMPROVED WITH VISUAL BARS                   */}
      {/* ════════════════════════════════════════════════════════════ */}
      {!isInsufficientData && (
      <Card header={
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Package size={18} color="var(--color-success-600)" />
          <strong style={{ color: 'var(--color-success-700)' }}>Rencana Kebutuhan Material & Pengadaan (MRP) — Pekan Depan</strong>
        </div>
      }>
        <SectionExplainer
          icon={<Info size={16} color="var(--color-primary-600)" />}
          text="Tabel MRP menghitung jumlah pengadaan berdasarkan proyeksi permintaan dikurangi stok gudang aktual. Kebutuhan bersih = Proyeksi − Stok Gudang. Total pengadaan sudah termasuk safety stock 10%."
        />

        {/* Bar Chart Overview */}
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>
            📊 Perbandingan Kebutuhan Bersih vs Total Pengadaan (per Material)
          </h4>
          <div style={{ height: 220, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={materialChartData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={11} />
                <YAxis stroke="var(--text-secondary)" fontSize={11} />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '12px',
                  }}
                  formatter={(value: any, name: string) => {
                    const labels: Record<string, string> = {
                      kebutuhan: 'Kebutuhan Bersih',
                      pengadaan: 'Total Pengadaan (+10%)',
                      safetyStock: 'Safety Stock',
                    };
                    return [`${Number(value).toLocaleString('id-ID')}`, labels[name] || name];
                  }}
                />
                <Legend
                  formatter={(value: string) => {
                    const labels: Record<string, string> = {
                      kebutuhan: 'Kebutuhan Bersih',
                      pengadaan: 'Total Pengadaan (+10%)',
                    };
                    return labels[value] || value;
                  }}
                />
                <Bar dataKey="kebutuhan" fill="var(--color-primary-300)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pengadaan" radius={[4, 4, 0, 0]}>
                  {materialChartData.map((_, index) => (
                    <Cell key={index} fill={barColors[index % barColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Detailed Material Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {materials.map((m, idx) => {
            const demandChange = m.historical_avg_weekly > 0
              ? ((m.projected_demand - m.historical_avg_weekly) / m.historical_avg_weekly) * 100
              : 0;

            return (
              <div
                key={idx}
                style={{
                  padding: 'var(--space-4)',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-3)',
                }}
              >
                {/* Row 1: Material name + confidence */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                  <div>
                    <strong style={{ color: 'var(--text-primary)', fontSize: 'var(--text-md)' }}>{m.material_name}</strong>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                      {m.notes}
                    </div>
                  </div>
                  <ConfidenceBadge level={m.confidence} />
                </div>

                {/* Row 2: Numbers grid — now includes stock and net requirement */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 'var(--space-3)' }}>
                  <div>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', display: 'block', marginBottom: '2px' }}>
                      Rata-rata Historis
                    </span>
                    <strong style={{ fontSize: 'var(--text-md)', color: 'var(--text-secondary)' }}>
                      {m.historical_avg_weekly.toLocaleString('id-ID')} {m.uom}
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', display: 'block', marginBottom: '2px' }}>
                      Proyeksi Kebutuhan
                    </span>
                    <strong style={{ fontSize: 'var(--text-md)', color: 'var(--text-primary)' }}>
                      {m.projected_demand.toLocaleString('id-ID')} {m.uom}
                    </strong>
                    <div style={{ marginTop: '2px' }}>
                      <ChangeIndicator value={demandChange} suffix="vs historis" />
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', display: 'block', marginBottom: '2px' }}>
                      📦 Stok Gudang
                    </span>
                    <strong style={{ fontSize: 'var(--text-md)', color: m.current_stock > 0 ? 'var(--color-success-600)' : 'var(--color-danger-600)' }}>
                      {m.current_stock.toLocaleString('id-ID')} {m.uom}
                    </strong>
                    {m.current_stock === 0 && (
                      <div style={{ fontSize: '10px', color: 'var(--color-danger-600)', marginTop: '2px' }}>Stok kosong</div>
                    )}
                  </div>
                  <div>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', display: 'block', marginBottom: '2px' }}>
                      Kebutuhan Bersih
                    </span>
                    <strong style={{ fontSize: 'var(--text-md)', color: 'var(--color-warning-700)' }}>
                      {m.net_requirement.toLocaleString('id-ID')} {m.uom}
                    </strong>
                    <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '2px' }}>= Proyeksi − Stok</div>
                  </div>
                  <div>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', display: 'block', marginBottom: '2px' }}>
                      Safety Stock (10%)
                    </span>
                    <strong style={{ fontSize: 'var(--text-md)', color: 'var(--color-warning-600)' }}>
                      +{m.safety_stock.toLocaleString('id-ID')} {m.uom}
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', display: 'block', marginBottom: '2px' }}>
                      🛒 Total Pengadaan
                    </span>
                    <strong style={{ fontSize: 'var(--text-lg)', color: 'var(--color-primary-600)' }}>
                      {m.total_procurement_needed.toLocaleString('id-ID')} {m.uom}
                    </strong>
                  </div>
                </div>

                {/* Row 3: Visual comparison bar */}
                <ComparisonBar
                  historical={m.historical_avg_weekly}
                  projected={m.total_procurement_needed}
                  uom={m.uom}
                />
              </div>
            );
          })}
        </div>
      </Card>
      )}

      {/* ════════════════════════════════════════════════════════════ */}
      {/* 4. OPERATIONAL INSIGHTS — ENHANCED                         */}
      {/* ════════════════════════════════════════════════════════════ */}
      <Card header={
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Sparkles size={18} color="var(--color-warning-600)" />
          <strong style={{ color: 'var(--color-warning-700)' }}>Wawasan Cerdas & Rekomendasi Manufaktur</strong>
        </div>
      }>
        <SectionExplainer
          icon={<Zap size={16} color="var(--color-warning-600)" />}
          text="AI menganalisis data produksi dan QC terbaru untuk mendeteksi anomali dan memberikan rekomendasi tindakan. Kartu hijau berarti indikator normal, kuning/oranye berarti perlu perhatian segera."
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {insights.map((insight) => {
            const isWarning = insight.type === 'WARNING';
            const isSuccess = insight.type === 'SUCCESS';

            const bg = isWarning ? 'var(--color-warning-50)' : isSuccess ? 'var(--color-success-50)' : 'var(--color-primary-50)';
            const border = isWarning ? 'var(--color-warning-200)' : isSuccess ? 'var(--color-success-200)' : 'var(--color-primary-200)';
            const textColor = isWarning ? 'var(--color-warning-900)' : isSuccess ? 'var(--color-success-900)' : 'var(--color-primary-900)';
            const accentColor = isWarning ? 'var(--color-warning-600)' : isSuccess ? 'var(--color-success-600)' : 'var(--color-primary-600)';
            const Icon = isWarning ? AlertCircle : isSuccess ? CheckCircle2 : Sparkles;
            const statusLabel = isWarning ? 'Perlu Perhatian' : isSuccess ? 'Status Optimal' : 'Informasi';

            return (
              <div
                key={insight.id}
                style={{
                  display: 'flex',
                  gap: 'var(--space-3)',
                  padding: 'var(--space-4)',
                  backgroundColor: bg,
                  border: `1px solid ${border}`,
                  borderRadius: 'var(--radius-md)',
                  color: textColor,
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 'var(--radius-md)',
                  background: 'rgba(255,255,255,0.7)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Icon size={22} color={accentColor} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                  {/* Header row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                    <strong style={{ fontSize: 'var(--text-md)' }}>{insight.title}</strong>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      {insight.metric && (
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: '4px',
                          background: 'rgba(255,255,255,0.8)',
                          color: accentColor,
                        }}>
                          {insight.metric}
                        </span>
                      )}
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '999px',
                        background: accentColor,
                        color: 'white',
                      }}>
                        {statusLabel}
                      </span>
                    </div>
                  </div>
                  {/* Description */}
                  <p style={{ margin: 0, fontSize: 'var(--text-sm)', opacity: 0.9, lineHeight: 1.5 }}>
                    {insight.description}
                  </p>

                  {/* Recommendation box */}
                  <div style={{
                    marginTop: '6px',
                    padding: 'var(--space-2) var(--space-3)',
                    background: 'rgba(255,255,255,0.7)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 'var(--text-sm)',
                    lineHeight: 1.5,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '6px',
                  }}>
                    <ArrowRight className="w-4 h-4 text-currentColor shrink-0 mt-0.5" aria-hidden="true" />
                    <div>
                      <strong>Tindakan Rekomendasi:</strong>{' '}
                      <span style={{ fontWeight: 400 }}>{insight.recommendation}</span>
                    </div>
                  </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
