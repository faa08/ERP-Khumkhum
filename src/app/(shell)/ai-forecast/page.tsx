'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import {
  Brain,
  TrendingUp,
  Package,
  Factory,
  AlertCircle,
  Sparkles,
  RefreshCw,
  LineChart,
  Calendar,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import { getMaterialForecast, getOperationalInsights } from '@/actions/forecast';
import type {
  ForecastWeekProjection,
  MaterialForecastItem,
  OperationalInsight,
} from '@/types/database';

export default function AiForecastPage() {
  const [projections, setProjections] = useState<ForecastWeekProjection[]>([]);
  const [materials, setMaterials] = useState<MaterialForecastItem[]>([]);
  const [insights, setInsights] = useState<OperationalInsight[]>([]);
  const [historicalData, setHistoricalData] = useState<number[]>([]);
  const [avgDemandKg, setAvgDemandKg] = useState<number>(500);
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
        setAvgDemandKg(forecastRes.data.avgDemandKg || 500);
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

      {/* 1. Demand Projections (4 Weeks) */}
      <Card header={<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}><TrendingUp size={18} color="var(--color-primary-600)" /> <strong style={{ color: 'var(--color-primary-700)' }}>Proyeksi Kebutuhan Jamur Segar 4 Minggu (Exponential Smoothing &alpha; = 0.35)</strong></div>}>
        <p style={{ margin: 0, marginBottom: 'var(--space-4)', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
          Dihitung dari tren produksi historis ({historicalData.join(', ')} kg/minggu) dengan safety factor 10% untuk mengantisipasi lonjakan permintaan distributor.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)' }}>
          {projections.map((p, index) => (
            <div
              key={index}
              style={{
                padding: 'var(--space-4)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-subtle)',
                borderLeft: `4px solid ${p.status_color}`,
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-1)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {p.week}
                </span>
                <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '999px', background: 'var(--bg-card)', color: 'var(--text-tertiary)' }}>
                  {p.date_label}
                </span>
              </div>

              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: p.status_color }}>
                {p.projected_kg.toLocaleString('id-ID')} <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-secondary)' }}>kg</span>
              </div>

              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                Akurasi Prediksi: <strong>{p.confidence}</strong>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* 2. Material Requirements Planning (MRP) */}
      <Card header={<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}><Package size={18} color="var(--color-success-600)" /> <strong style={{ color: 'var(--color-success-700)' }}>Rencana Kebutuhan Material & Pengadaan (MRP) — Pekan Depan</strong></div>}>
        <p style={{ margin: 0, marginBottom: 'var(--space-3)', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
          Rekomendasi jumlah pengadaan bahan mentah, bumbu racikan, dan kemasan pouch untuk mendukung jadwal produksi:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {materials.map((m, idx) => (
            <div
              key={idx}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr 2fr',
                gap: 'var(--space-3)',
                alignItems: 'center',
                padding: 'var(--space-3)',
                background: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div>
                <strong style={{ color: 'var(--text-primary)', display: 'block' }}>{m.material_name}</strong>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                  Rata-rata: {m.historical_avg_weekly.toLocaleString('id-ID')} {m.uom}
                </span>
              </div>

              <div>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', display: 'block' }}>
                  Kebutuhan Bersih
                </span>
                <strong>{m.projected_demand.toLocaleString('id-ID')} {m.uom}</strong>
              </div>

              <div>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', display: 'block' }}>
                  Total Pengadaan (+10%)
                </span>
                <strong style={{ color: 'var(--color-primary-600)' }}>
                  {m.total_procurement_needed.toLocaleString('id-ID')} {m.uom}
                </strong>
              </div>

              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                {m.notes}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* 3. Operational Insights & Actionable AI Recommendations */}
      <Card header={<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}><Sparkles size={18} color="var(--color-warning-600)" /> <strong style={{ color: 'var(--color-warning-700)' }}>Wawasan Cerdas & Rekomendasi Manufaktur</strong></div>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {insights.map((insight) => {
            const isWarning = insight.type === 'WARNING';
            const isSuccess = insight.type === 'SUCCESS';

            const bg = isWarning ? 'var(--color-warning-50)' : isSuccess ? 'var(--color-success-50)' : 'var(--color-primary-50)';
            const border = isWarning ? 'var(--color-warning-200)' : isSuccess ? 'var(--color-success-200)' : 'var(--color-primary-200)';
            const textColor = isWarning ? 'var(--color-warning-900)' : isSuccess ? 'var(--color-success-900)' : 'var(--color-primary-900)';
            const Icon = isWarning ? AlertCircle : isSuccess ? CheckCircle2 : Sparkles;

            return (
              <div
                key={insight.id}
                style={{
                  display: 'flex',
                  gap: 'var(--space-3)',
                  padding: 'var(--space-3) var(--space-4)',
                  backgroundColor: bg,
                  border: `1px solid ${border}`,
                  borderRadius: 'var(--radius-md)',
                  color: textColor,
                }}
              >
                <Icon size={22} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: 'var(--text-sm)' }}>{insight.title}</strong>
                    {insight.metric && (
                      <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.7)' }}>
                        {insight.metric}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: 'var(--text-xs)', opacity: 0.9 }}>{insight.description}</span>
                  <div style={{ fontSize: 'var(--text-xs)', marginTop: '2px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <ArrowRight className="w-3.5 h-3.5 text-currentColor" aria-hidden="true" />
                    <span>Tindakan Rekomendasi:</span> <span style={{ fontWeight: 400 }}>{insight.recommendation}</span>
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
