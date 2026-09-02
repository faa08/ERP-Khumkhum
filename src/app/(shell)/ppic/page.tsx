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
import {
  CalendarDays, TrendingUp, AlertCircle, Sprout, LineChart as LineChartIcon,
  AlertTriangle, Flame, ArrowUpDown, Package, BarChart3,
  CheckCircle2, Scale, ClipboardList, Target, Plus,
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { format, addDays } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import {
  getPpicData, addManualHistoricalSorting,
  getCookedMushroomHistory, addManualCookedMushroomEntry,
  getSupplyDemandComparison,
} from '@/actions/ppic';
import { getInventorySummary, getInventoryForecasting } from '@/actions/inventory';
import { getFarmers } from '@/actions/master';
import type { DbInventory, DbFarmer } from '@/types/database';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

// Double Exponential Smoothing (Holt's Linear Trend)
function doubleExponentialSmoothing(data: number[], alpha = 0.3, beta = 0.2, periods = 4): number[] {
  if (data.length === 0) return Array(periods).fill(0);
  if (data.length === 1) return Array(periods).fill(data[0]);

  let level = data[0];
  let trend = data[1] - data[0];

  for (let i = 1; i < data.length; i++) {
    const prevLevel = level;
    level = alpha * data[i] + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
  }

  const forecasts = [];
  for (let i = 1; i <= periods; i++) {
    const f = level + i * trend;
    forecasts.push(parseFloat(Math.max(0, f).toFixed(2)));
  }
  return forecasts;
}

export default function PpicPage() {
  // ── State ──────────────────────────────────────────────────────
  const [sortings, setSortings] = useState<any[]>([]);
  const [weeklyTotal, setWeeklyTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  // Manual Sorting Input
  const [manualDate, setManualDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [manualWeight, setManualWeight] = useState('');
  const [manualFarmerId, setManualFarmerId] = useState('');
  const [manualGrade, setManualGrade] = useState('A');
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);
  const [farmersList, setFarmersList] = useState<DbFarmer[]>([]);

  // Forecast states (per-product)
  const [products, setProducts] = useState<DbInventory[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [selectedEstimateWeek, setSelectedEstimateWeek] = useState('');
  const [forecastData, setForecastData] = useState<any[]>([]);
  const [forecastMetrics, setForecastMetrics] = useState<any>(null);
  const [isForecasting, setIsForecasting] = useState(false);

  // Global Forecast (Daun)
  const [historicalData, setHistoricalData] = useState<number[]>(Array(7).fill(0));
  const forecast = doubleExponentialSmoothing(historicalData, 0.3, 0.2, 4);
  const forecastWeeks = forecast.map((kg, i) => ({
    week: `Minggu ${i + 1} (${format(addDays(new Date(), i * 7), 'd MMM', { locale: idLocale })})`,
    forecast_kg: kg,
    confidence: i === 0 ? 'Tinggi' : i === 1 ? 'Sedang' : 'Rendah',
    color: i === 0 ? 'var(--color-success-600)' : i === 1 ? 'var(--color-warning-600)' : 'var(--color-danger-600)',
  }));

  // ⭐ Cooked Mushroom (Jamur Matang) States
  const [cookedData, setCookedData] = useState<any>(null);
  const [manualCookDate, setManualCookDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [manualCookOutput, setManualCookOutput] = useState('');
  const [manualCookInput, setManualCookInput] = useState('');
  const [manualCookNotes, setManualCookNotes] = useState('');
  const [isSubmittingCook, setIsSubmittingCook] = useState(false);

  // Supply vs Demand
  const [supplyDemand, setSupplyDemand] = useState<any>(null);

  const toast = useToast();

  // ── Data Loading ───────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setIsLoading(true);
    const [ppicRes, invRes, farmersRes, cookedRes, sdRes] = await Promise.all([
      getPpicData(selectedEstimateWeek),
      getInventorySummary(),
      getFarmers(),
      getCookedMushroomHistory(),
      getSupplyDemandComparison(),
    ]);

    if (ppicRes.success) {
      setSortings(ppicRes.estimates || []);
      setWeeklyTotal(ppicRes.weeklyTotal || 0);
      if (ppicRes.historicalData) setHistoricalData(ppicRes.historicalData);
    }

    if (invRes.success && invRes.data) {
      setProducts(invRes.data.filter(i => i.item_type === 'PRODUCT'));
    }

    if (farmersRes.success && farmersRes.data) {
      setFarmersList(farmersRes.data);
    }

    if (cookedRes.success && cookedRes.data) {
      setCookedData(cookedRes.data);
    }

    if (sdRes.success && sdRes.data) {
      setSupplyDemand(sdRes.data);
    }

    setIsLoading(false);
  }, [selectedEstimateWeek]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!selectedProduct) {
      setForecastData([]);
      setForecastMetrics(null);
      return;
    }
    const loadForecast = async () => {
      setIsForecasting(true);
      setForecastMetrics(null);
      const res = await getInventoryForecasting(selectedProduct);
      if (res.success && res.data) {
        setForecastData(res.data);
        if (res.metrics) setForecastMetrics(res.metrics);
      } else {
        toast.error(res.error || 'Gagal memuat data ramalan');
      }
      setIsForecasting(false);
    };
    loadForecast();
  }, [selectedProduct, toast]);

  // ── Handlers ───────────────────────────────────────────────────
  const handleAddManualSorting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualWeight || isNaN(Number(manualWeight)) || !manualFarmerId) return;
    setIsSubmittingManual(true);
    const res = await addManualHistoricalSorting(manualDate, Number(manualWeight), manualFarmerId, manualGrade);
    setIsSubmittingManual(false);
    if (res.success) {
      toast.success('Data historis sortasi berhasil ditambahkan');
      setManualWeight('');
      loadData();
    } else {
      toast.error(res.error || 'Gagal menambahkan data');
    }
  };

  const handleAddManualCook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCookOutput || !manualCookInput) return;
    setIsSubmittingCook(true);
    const res = await addManualCookedMushroomEntry({
      date: manualCookDate,
      output_weight: Number(manualCookOutput),
      input_weight: Number(manualCookInput),
      notes: manualCookNotes,
    });
    setIsSubmittingCook(false);
    if (res.success) {
      toast.success('Data jamur matang berhasil ditambahkan');
      setManualCookOutput('');
      setManualCookInput('');
      setManualCookNotes('');
      loadData();
    } else {
      toast.error(res.error || 'Gagal menambahkan data');
    }
  };

  // ── Columns ────────────────────────────────────────────────────
  const sortColumns: ColumnDef<any>[] = [
    {
      id: 'farmer',
      header: 'Petani',
      cell: ({ row }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--color-primary-100)', color: 'var(--color-primary-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
            {row.original.receiving?.farmer?.name?.[0] || '?'}
          </div>
          <span style={{ fontWeight: 500 }}>{row.original.receiving?.farmer?.name || 'Unknown'}</span>
        </div>
      ),
    },
    {
      accessorKey: 'receiving.farmer.phone_number',
      header: 'No. HP',
      cell: ({ row }) => <span style={{ color: 'var(--text-secondary)' }}>{row.original.receiving?.farmer?.phone_number || '-'}</span>,
    },
    {
      accessorKey: 'sorting_date',
      header: 'Tanggal Sortir',
      cell: ({ row }) => format(new Date(row.original.sorting_date), 'EEEE, dd MMM yyyy', { locale: idLocale }),
    },
    {
      accessorKey: 'leaf_weight',
      header: 'Daun (Kg)',
      cell: ({ row }) => (
        <span style={{ fontWeight: 700, color: 'var(--color-primary-600)' }}>
          {row.original.leaf_weight} kg
        </span>
      ),
    },
    {
      accessorKey: 'quality_grade',
      header: 'Grade',
      cell: ({ row }) => (
        <span style={{
          padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
          backgroundColor: row.original.quality_grade === 'A' ? 'var(--color-success-100)' : row.original.quality_grade === 'B' ? 'var(--color-warning-100)' : 'var(--color-danger-100)',
          color: row.original.quality_grade === 'A' ? 'var(--color-success-700)' : row.original.quality_grade === 'B' ? 'var(--color-warning-700)' : 'var(--color-danger-700)',
        }}>
          Grade {row.original.quality_grade || '-'}
        </span>
      ),
    },
  ];

  const cookedColumns: ColumnDef<any>[] = [
    {
      accessorKey: 'date',
      header: 'Tanggal Produksi',
      cell: ({ row }) => format(new Date(row.original.date), 'dd MMM yyyy', { locale: idLocale }),
    },
    { accessorKey: 'batch_number', header: 'No. Batch' },
    {
      accessorKey: 'input_weight',
      header: 'Jamur Mentah (kg)',
      cell: ({ row }) => <span style={{ fontWeight: 500 }}>{row.original.input_weight} kg</span>,
    },
    {
      accessorKey: 'output_weight',
      header: 'Jamur Matang (kg)',
      cell: ({ row }) => (
        <span style={{ fontWeight: 700, color: 'var(--color-primary-600)' }}>
          {row.original.output_weight} kg
        </span>
      ),
    },
    {
      accessorKey: 'yield_percentage',
      header: 'Rendemen',
      cell: ({ row }) => {
        const y = row.original.yield_percentage;
        const color = y >= 80 ? 'var(--color-success-600)' : y >= 70 ? 'var(--color-warning-600)' : 'var(--color-danger-600)';
        return <span style={{ fontWeight: 600, color }}>{y}%</span>;
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const s = row.original.status;
        return (
          <span style={{
            padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
            backgroundColor: s === 'RELEASED' ? 'var(--color-success-100)' : 'var(--color-primary-100)',
            color: s === 'RELEASED' ? 'var(--color-success-700)' : 'var(--color-primary-700)',
          }}>
            {s === 'COMPLETED_WIP' ? 'Selesai Goreng' : s === 'COMPLETED' ? 'Selesai' : s === 'RELEASED' ? 'Dirilis' : s}
          </span>
        );
      },
    },
  ];

  const forecastColumns: ColumnDef<any>[] = [
    { accessorKey: 'date', header: 'Tanggal' },
    { accessorKey: 'actualOut', header: 'Aktual (kg)' },
    { accessorKey: 'forecastOut', header: 'Prediksi (kg)' },
    { accessorKey: 'projectedStock', header: 'Stok Sisa' },
  ];

  // ═══════════════════════════════════════════════════════════════
  // TAB 1: RINGKASAN RENCANA & PEMBAGIAN RASA
  // ═══════════════════════════════════════════════════════════════
  const Tab1_RencanaRasa = (
    <div style={{ marginTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* Supply vs Demand Summary */}
      {supplyDemand && (
        <Card header={<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><BarChart3 className="w-4 h-4 text-currentColor" aria-hidden="true" /><strong>Perbandingan Pasokan vs Pesanan Pembeli</strong></div>}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
            <div style={{
              padding: 'var(--space-4)', borderRadius: 'var(--radius-md)',
              background: 'var(--color-primary-50)', borderLeft: '4px solid var(--color-primary-600)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-primary-700)', marginBottom: 4 }}>Pasokan Mingguan (Rata-rata)</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-primary-600)' }}>
                {supplyDemand.totalSupplyKg.toLocaleString('id-ID')} <span style={{ fontSize: 'var(--text-sm)' }}>kg</span>
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>dari hasil produksi 30 hari</div>
            </div>
            <div style={{
              padding: 'var(--space-4)', borderRadius: 'var(--radius-md)',
              background: 'var(--color-warning-50)', borderLeft: '4px solid var(--color-warning-600)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-warning-700)', marginBottom: 4 }}>Pesanan Tertunda</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-warning-600)' }}>
                {supplyDemand.totalDemandKg.toLocaleString('id-ID')} <span style={{ fontSize: 'var(--text-sm)' }}>kg</span>
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>dari sales order aktif</div>
            </div>
            <div style={{
              padding: 'var(--space-4)', borderRadius: 'var(--radius-md)',
              background: supplyDemand.gapStatus === 'SURPLUS' ? 'var(--color-success-50)' : supplyDemand.gapStatus === 'DEFICIT' ? 'var(--color-danger-50)' : 'var(--bg-subtle)',
              borderLeft: `4px solid ${supplyDemand.gapStatus === 'SURPLUS' ? 'var(--color-success-600)' : supplyDemand.gapStatus === 'DEFICIT' ? 'var(--color-danger-600)' : 'var(--text-tertiary)'}`,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 'var(--text-sm)', color: supplyDemand.gapStatus === 'SURPLUS' ? 'var(--color-success-700)' : supplyDemand.gapStatus === 'DEFICIT' ? 'var(--color-danger-700)' : 'var(--text-secondary)', marginBottom: 4 }}>
                Selisih (Gap)
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: supplyDemand.gapStatus === 'SURPLUS' ? 'var(--color-success-600)' : supplyDemand.gapStatus === 'DEFICIT' ? 'var(--color-danger-600)' : 'var(--text-primary)' }}>
                {supplyDemand.gapKg > 0 ? '+' : ''}{supplyDemand.gapKg.toLocaleString('id-ID')} <span style={{ fontSize: 'var(--text-sm)' }}>kg</span>
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                {supplyDemand.gapStatus === 'SURPLUS' ? (
                  <span style={{ color: 'var(--color-success-600)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 className="w-3.5 h-3.5 text-currentColor" aria-hidden="true" />
                    <span>Pasokan cukup</span>
                  </span>
                ) : supplyDemand.gapStatus === 'DEFICIT' ? (
                  <span style={{ color: 'var(--color-danger-600)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <AlertCircle className="w-3.5 h-3.5 text-currentColor" aria-hidden="true" />
                    <span>Pasokan kurang</span>
                  </span>
                ) : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Scale className="w-3.5 h-3.5 text-currentColor" aria-hidden="true" />
                    <span>Seimbang</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Demand by Product (Alokasi Rasa) */}
          {supplyDemand.demandByProduct.length > 0 && (
            <div>
              <h4 style={{ fontSize: 'var(--text-md)', fontWeight: 600, marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Package className="w-4 h-4 text-currentColor" aria-hidden="true" />
                <span>Rincian Pesanan Per Varian Rasa</span>
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {supplyDemand.demandByProduct.map((item: any) => (
                  <div key={item.product_name} style={{
                    display: 'grid', gridTemplateColumns: '2fr 1fr',
                    padding: 'var(--space-3)', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)',
                  }}>
                    <div style={{ fontWeight: 500 }}>{item.product_name}</div>
                    <div style={{ fontWeight: 700, color: 'var(--color-primary-600)', textAlign: 'right' }}>{item.total_qty} kg</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ORIGINAL PPIC FORECAST (Daun) */}
      <Card header={<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><TrendingUp className="w-4 h-4 text-currentColor" aria-hidden="true" /><strong>Proyeksi Ketersediaan Daun Jamur (4 Minggu - Holt&apos;s Linear Trend)</strong></div>}>
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
          <strong>Metode:</strong> Holt&apos;s Linear Trend (Double Exponential Smoothing) (α = 0.3, β = 0.2)
          <br />
          Data historis (aktual) daun jamur per minggu: {historicalData.join(', ')} kg
        </div>
      </Card>

      {/* MRP Global */}
      <Card header={<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><ClipboardList className="w-4 h-4 text-currentColor" aria-hidden="true" /><strong>Kebutuhan Bahan Baku (MRP) — Estimasi Minggu Depan</strong></div>}>
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

      {/* Per-product forecast */}
      <Card header={<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Target className="w-4 h-4 text-currentColor" aria-hidden="true" /><strong>Analisis Permintaan & Kebutuhan Spesifik (Per Produk)</strong></div>}>
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <FormField label="Pilih Varian Produk Jadi">
            <select
              value={selectedProduct}
              onChange={e => setSelectedProduct(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}
            >
              <option value="">-- Pilih Produk untuk Dianalisis --</option>
              {products.map(inv => (
                <option key={inv.id} value={inv.id}>{inv.item_name} ({inv.warehouse?.name}) - Stok Aktual: {inv.quantity}</option>
              ))}
            </select>
          </FormField>
        </div>

        {isForecasting ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-secondary)' }}>Memproses Data Historis Sales...</div>
        ) : forecastMetrics && forecastData.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

            {/* Smart Insight Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
              <div style={{ padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-subtle)' }}>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: '8px' }}>Rata-rata Permintaan (Sales) Harian</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-primary-600)' }}>
                  {forecastMetrics.averageDailyUsage} <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>kg/hari</span>
                </div>
              </div>

              <div style={{
                padding: 'var(--space-4)', borderRadius: 'var(--radius-md)',
                border: `1px solid ${forecastMetrics.status === 'SAFE' ? 'var(--color-success-200)' : forecastMetrics.status === 'WARNING' ? 'var(--color-warning-200)' : 'var(--color-danger-200)'}`,
                backgroundColor: forecastMetrics.status === 'SAFE' ? 'var(--color-success-50)' : forecastMetrics.status === 'WARNING' ? 'var(--color-warning-50)' : 'var(--color-danger-50)'
              }}>
                <div style={{ fontSize: 'var(--text-sm)', color: forecastMetrics.status === 'SAFE' ? 'var(--color-success-700)' : forecastMetrics.status === 'WARNING' ? 'var(--color-warning-700)' : 'var(--color-danger-700)', marginBottom: '8px' }}>
                  Estimasi Ketahanan Stok Produk
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: forecastMetrics.status === 'SAFE' ? 'var(--color-success-700)' : forecastMetrics.status === 'WARNING' ? 'var(--color-warning-700)' : 'var(--color-danger-700)' }}>
                  {forecastMetrics.daysOfSupply === 999 ? '>30' : forecastMetrics.daysOfSupply} <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>hari</span>
                </div>
              </div>

              {forecastMetrics.recommendedRestock > 0 && (
                <div style={{ padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-primary-200)', backgroundColor: 'var(--color-primary-50)' }}>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-primary-700)', marginBottom: '8px' }}>Target Produksi 14 Hari Kedepan</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-primary-700)' }}>
                    {forecastMetrics.recommendedRestock} <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>kg</span>
                  </div>
                </div>
              )}
            </div>

            {/* Alerts */}
            {forecastMetrics.status === 'CRITICAL' && (
              <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-danger-600)', color: 'white', display: 'flex', gap: '12px', alignItems: 'center' }}>
                <AlertTriangle size={20} />
                <div>
                  <strong>STOK PRODUK KRITIS!</strong> Ketahanan stok di bawah standar. Segera jadwalkan produksi sebesar <strong>{forecastMetrics.recommendedRestock} kg</strong> hari ini agar tidak kehilangan potensi penjualan.
                </div>
              </div>
            )}

            {forecastMetrics.status === 'WARNING' && (
              <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-warning-100)', color: 'var(--color-warning-800)', border: '1px solid var(--color-warning-300)', display: 'flex', gap: '12px', alignItems: 'center' }}>
                <AlertTriangle size={20} />
                <div>
                  <strong>PERINGATAN STOK RENDAH!</strong> Siapkan Surat Perintah Kerja (SPK) produksi dalam 1-2 hari ke depan sebesar <strong>{forecastMetrics.recommendedRestock} kg</strong>.
                </div>
              </div>
            )}

            {/* Chart */}
            <div style={{ marginTop: 'var(--space-4)' }}>
              <h4 style={{ marginBottom: '16px', fontSize: 'var(--text-md)', fontWeight: 600 }}>Visualisasi Pergerakan & Prediksi Permintaan</h4>
              <div style={{ height: 350, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={forecastData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis dataKey="date" stroke="var(--text-secondary)" fontSize={12} />
                    <YAxis stroke="var(--text-secondary)" fontSize={12} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', borderRadius: 'var(--radius-md)' }}
                      itemStyle={{ color: 'var(--text-primary)' }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="actualOut" name="Penjualan Aktual" stroke="var(--color-primary-600)" strokeWidth={2} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="forecastOut" name="Prediksi Permintaan" stroke="var(--color-warning-500)" strokeWidth={2} strokeDasharray="5 5" />
                    <Line type="monotone" dataKey="projectedStock" name="Proyeksi Sisa Stok" stroke="var(--color-success-600)" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={{ marginTop: 'var(--space-4)' }}>
              <h4 style={{ marginBottom: '16px', fontSize: 'var(--text-md)', fontWeight: 600 }}>Tabel Histori & Prediksi Data</h4>
              <DataTable columns={forecastColumns} data={forecastData} />
            </div>
          </div>
        ) : selectedProduct ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-tertiary)' }}>
            Belum ada cukup data historis penjualan (OUT) dalam 30 hari terakhir untuk memproyeksikan target produksi produk ini.
          </div>
        ) : null}
      </Card>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════
  // TAB 2: RIWAYAT JAMUR MATANG PENGGORENGAN ⭐
  // ═══════════════════════════════════════════════════════════════
  const Tab2_JamurMatang = (
    <div style={{ marginTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* Summary Cards */}
      {cookedData && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
              <Flame size={20} color="var(--color-primary-600)" />
              <span style={{ fontWeight: 600 }}>Total Jamur Matang (30 Hari)</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-primary-600)' }}>
              {cookedData.totalLast30Days.toLocaleString('id-ID')} <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>kg</span>
            </div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>dari {cookedData.entries.length} catatan produksi</div>
          </Card>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
              <TrendingUp size={20} color="var(--color-success-600)" />
              <span style={{ fontWeight: 600 }}>Rata-rata Harian</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-success-600)' }}>
              {cookedData.dailyAverage.toLocaleString('id-ID')} <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>kg/hari</span>
            </div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>acuan utama kapasitas</div>
          </Card>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
              <BarChart3 size={20} color="var(--color-warning-600)" />
              <span style={{ fontWeight: 600 }}>Rata-rata Mingguan</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-warning-600)' }}>
              {cookedData.weeklyAverage.toLocaleString('id-ID')} <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>kg/minggu</span>
            </div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>basis perencanaan PPIC</div>
          </Card>
        </div>
      )}

      {/* Trend Chart */}
      {cookedData && cookedData.weeklyData.some((v: number) => v > 0) && (
        <Card header={<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><TrendingUp className="w-4 h-4 text-currentColor" aria-hidden="true" /><strong>Tren Output Jamur Matang per Minggu (8 Minggu Terakhir)</strong></div>}>
          <div style={{ height: 300, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cookedData.weeklyData.map((val: number, idx: number) => ({
                name: `Mgg ${idx + 1}`,
                output: Number(val.toFixed(2)),
              }))} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} />
                <YAxis stroke="var(--text-secondary)" fontSize={12} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', borderRadius: 'var(--radius-md)' }}
                />
                <Bar dataKey="output" name="Jamur Matang (kg)" radius={[6, 6, 0, 0]}>
                  {cookedData.weeklyData.map((_: number, idx: number) => (
                    <Cell key={idx} fill={idx === 7 ? 'var(--color-primary-600)' : 'var(--color-primary-200)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Manual Input */}
      <Card>
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <h4 style={{ fontSize: 'var(--text-md)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus className="w-4 h-4 text-currentColor" aria-hidden="true" />
            <span>Input Manual Data Jamur Matang (Bypass)</span>
          </h4>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
            Gunakan form ini untuk menambahkan data historis hasil penggorengan jamur secara manual. Data ini akan dijadikan acuan perhitungan kapasitas PPIC.
          </p>
        </div>
        <form onSubmit={handleAddManualCook} style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <FormField label="Tanggal Produksi">
            <Input type="date" value={manualCookDate} onChange={e => setManualCookDate(e.target.value)} required />
          </FormField>
          <FormField label="Berat Jamur Mentah (kg)">
            <Input type="number" step="0.1" value={manualCookInput} onChange={e => setManualCookInput(e.target.value)} placeholder="Misal: 100" style={{ width: '140px' }} required />
          </FormField>
          <FormField label="Berat Jamur Matang (kg)">
            <Input type="number" step="0.1" value={manualCookOutput} onChange={e => setManualCookOutput(e.target.value)} placeholder="Misal: 75" style={{ width: '140px' }} required />
          </FormField>
          <FormField label="Catatan (opsional)">
            <Input type="text" value={manualCookNotes} onChange={e => setManualCookNotes(e.target.value)} placeholder="Catatan tambahan" style={{ width: '200px' }} />
          </FormField>
          <Button type="submit" disabled={isSubmittingCook || !manualCookOutput || !manualCookInput}>
            {isSubmittingCook ? 'Menyimpan...' : 'Simpan Data'}
          </Button>
        </form>
      </Card>

      {/* Data Table */}
      {cookedData && cookedData.entries.length > 0 && (
        <Card header={<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><ClipboardList className="w-4 h-4 text-currentColor" aria-hidden="true" /><strong>Riwayat Data Jamur Matang Penggorengan</strong></div>}>
          <DataTable columns={cookedColumns} data={cookedData.entries} />
        </Card>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════
  // TAB 3: DATA DAUN JAMUR SORTASI
  // ═══════════════════════════════════════════════════════════════
  const Tab3_DaunSortasi = (
    <div style={{ marginTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>Data Daun Jamur (Hasil Sortasi)</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Pilih Minggu:</span>
          <Input type="week" value={selectedEstimateWeek} onChange={e => setSelectedEstimateWeek(e.target.value)} style={{ width: '200px' }} />
        </div>
      </div>

      <Card>
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <h4 style={{ fontSize: 'var(--text-md)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus className="w-4 h-4 text-currentColor" aria-hidden="true" />
            <span>Input Manual Data Historis Sortasi (Bypass)</span>
          </h4>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Gunakan form ini untuk menambahkan data historis berat daun jamur (hasil sortasi) secara manual untuk keperluan forecasting.</p>
        </div>
        <form onSubmit={handleAddManualSorting} style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <FormField label="Petani">
            <select
              value={manualFarmerId}
              onChange={e => setManualFarmerId(e.target.value)}
              style={{ padding: '8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface)' }}
              required
            >
              <option value="">-- Pilih Petani --</option>
              {farmersList.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Tanggal Sortasi">
            <Input type="date" value={manualDate} onChange={e => setManualDate(e.target.value)} required />
          </FormField>
          <FormField label="Berat Daun (kg)">
            <Input type="number" step="0.1" value={manualWeight} onChange={e => setManualWeight(e.target.value)} placeholder="Misal: 45.5" style={{ width: '120px' }} required />
          </FormField>
          <FormField label="Grade">
            <select
              value={manualGrade}
              onChange={e => setManualGrade(e.target.value)}
              style={{ padding: '8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface)' }}
            >
              <option value="A">Grade A</option>
              <option value="B">Grade B</option>
              <option value="C">Grade C</option>
            </select>
          </FormField>
          <Button type="submit" disabled={isSubmittingManual || !manualWeight || !manualFarmerId}>
            {isSubmittingManual ? 'Menyimpan...' : 'Simpan Data'}
          </Button>
        </form>
      </Card>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
            <CalendarDays size={20} color="var(--color-primary-600)" />
            <span style={{ fontWeight: 600 }}>Total Daun Jamur Minggu Ini</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-primary-600)' }}>
            {weeklyTotal.toLocaleString('id-ID')} <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>kg</span>
          </div>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>dari {sortings.length} pencatatan</div>
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

      <DataTable columns={sortColumns} data={sortings} />
    </div>
  );

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <div>
      <PageHeader
        title="PPIC & Peramalan (Forecasting)"
        description="Perencanaan produksi, alokasi varian rasa, dan analisis ketersediaan bahan baku."
        breadcrumbs={[{ label: 'Operasional' }, { label: 'PPIC' }]}
        actions={
          <Button variant="secondary" onClick={loadData}>
            Refresh Data
          </Button>
        }
      />

      {isLoading ? (
        <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-secondary)' }}>Memuat data PPIC...</div>
      ) : (
        <Tabs
          tabs={[
            {
              id: 'rencana',
              label: <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><LineChartIcon className="w-4 h-4 text-currentColor" aria-hidden="true" /> Ringkasan & Rencana Rasa</span>,
              content: Tab1_RencanaRasa,
            },
            {
              id: 'jamur-matang',
              label: <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Flame className="w-4 h-4 text-currentColor" aria-hidden="true" /> Riwayat Jamur Matang</span>,
              content: Tab2_JamurMatang,
            },
            {
              id: 'daun-sortasi',
              label: <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Sprout className="w-4 h-4 text-currentColor" aria-hidden="true" /> Daun Sortasi</span>,
              content: Tab3_DaunSortasi,
            },
          ]}
        />
      )}
    </div>
  );
}
