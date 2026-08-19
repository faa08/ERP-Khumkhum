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
import { CalendarDays, TrendingUp, AlertCircle, Plus, MessageSquare, PenTool, Sprout, LineChart as LineChartIcon, AlertTriangle } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { format, addDays } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { getPpicData } from '@/actions/ppic';
import { getInventorySummary, getInventoryForecasting } from '@/actions/inventory';
import type { DbInventory, DbFarmerHarvestEstimate } from '@/types/database';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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
    forecasts.push(parseFloat(Math.max(0, f).toFixed(2))); // Prevent negative forecasts
  }
  return forecasts;
}

export default function PpicPage() {
  const [sortings, setSortings] = useState<any[]>([]);
  const [weeklyTotal, setWeeklyTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  
  // Forecast states
  const [products, setProducts] = useState<DbInventory[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [selectedEstimateWeek, setSelectedEstimateWeek] = useState('');
  const [forecastData, setForecastData] = useState<any[]>([]);
  const [forecastMetrics, setForecastMetrics] = useState<any>(null);
  const [isForecasting, setIsForecasting] = useState(false);

  // Global Forecast State
  const [historicalData, setHistoricalData] = useState<number[]>(Array(7).fill(0));
  const forecast = doubleExponentialSmoothing(historicalData, 0.3, 0.2, 4);
  const forecastWeeks = forecast.map((kg, i) => ({
    week: `Minggu ${i + 1} (${format(addDays(new Date(), i * 7), 'd MMM', { locale: idLocale })})`,
    forecast_kg: kg,
    confidence: i === 0 ? 'Tinggi' : i === 1 ? 'Sedang' : 'Rendah',
    color: i === 0 ? 'var(--color-success-600)' : i === 1 ? 'var(--color-warning-600)' : 'var(--color-danger-600)',
  }));

  const toast = useToast();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const [ppicRes, invRes] = await Promise.all([
      getPpicData(selectedEstimateWeek),
      getInventorySummary()
    ]);
    
    if (ppicRes.success) {
      setSortings(ppicRes.estimates || []);
      setWeeklyTotal(ppicRes.weeklyTotal || 0);
      if (ppicRes.historicalData) {
        setHistoricalData(ppicRes.historicalData);
      }
    }
    
    if (invRes.success && invRes.data) {
      // Only get products for MRP per-product forecast
      setProducts(invRes.data.filter(i => i.item_type === 'PRODUCT'));
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
        toast.error(res.error || 'Failed to load forecasting');
      }
      setIsForecasting(false);
    };
    loadForecast();
  }, [selectedProduct, toast]);

  // ── Sortings columns ───────────────────────────────────────────
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

  const forecastColumns: ColumnDef<any>[] = [
    { accessorKey: 'date', header: 'Tanggal' },
    { accessorKey: 'actualOut', header: 'Aktual (kg)' },
    { accessorKey: 'forecastOut', header: 'Prediksi (kg)' },
    { accessorKey: 'projectedStock', header: 'Stok Sisa' },
  ];

  const SortingsTab = (
    <div style={{ marginTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>Data Daun Jamur (Hasil Sortasi)</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Pilih Minggu:</span>
          <Input type="week" value={selectedEstimateWeek} onChange={e => setSelectedEstimateWeek(e.target.value)} style={{ width: '200px' }} />
        </div>
      </div>
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

  // ── Forecast JSX ───────────────────────────────────────────────
  const ForecastTab = (
    <div style={{ marginTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* 1. ORIGINAL PPIC FORECAST (GLOBAL) */}
      <Card header={<strong>Proyeksi Ketersediaan Daun Jamur Siap Masak (4 Minggu - Holt's Linear Trend)</strong>}>
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
          <strong>Metode:</strong> Holt's Linear Trend (Double Exponential Smoothing) (α = 0.3, β = 0.2)
          <br />
          Data historis (aktual) daun jamur per minggu: {historicalData.join(', ')} kg
        </div>
      </Card>

      {/* 2. ORIGINAL GLOBAL MRP */}
      <Card header={<strong>Material Requirement Planning (MRP) — Kebutuhan Global Minggu Depan</strong>}>
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

      {/* 3. NEW PER-PRODUCT DYNAMIC FORECAST (From Inventory) */}
      <Card header={<strong>Analisis Demand & Kebutuhan Spesifik (Per Produk)</strong>}>
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

            {/* Actionable Advice */}
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

            {/* MRP Dynamic Table */}
            {forecastMetrics.recommendedRestock > 0 && (
              <div style={{ marginTop: 'var(--space-4)' }}>
                <h4 style={{ marginBottom: '16px', fontSize: 'var(--text-md)', fontWeight: 600 }}>Material Requirement Planning (BOM) — Untuk Produksi {forecastMetrics.recommendedRestock} kg</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {[
                    { material: 'Jamur Tiram Segar', needed: `${(forecastMetrics.recommendedRestock * 1.3).toFixed(1)} kg`, note: 'estimasi rendemen 75% (butuh 1.3kg jamur basah / kg produk)' },
                    { material: 'Minyak Goreng', needed: `${(forecastMetrics.recommendedRestock * 0.3).toFixed(1)} kg`, note: '30% serapan & sirkulasi wajan' },
                    { material: 'Tepung Bumbu', needed: `${(forecastMetrics.recommendedRestock * 0.08).toFixed(1)} kg`, note: '8% rasio adonan tepung' },
                    { material: 'Kemasan Pouch 50g', needed: `${Math.ceil((forecastMetrics.recommendedRestock) / 0.05)} pcs`, note: 'Untuk packing per 50 gram' },
                  ].map(row => (
                    <div key={row.material} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr', alignItems: 'center', padding: 'var(--space-3)', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ fontWeight: 500 }}>{row.material}</div>
                      <div style={{ fontWeight: 700, color: 'var(--color-primary-600)' }}>{row.needed}</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>{row.note}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Chart */}
            <div style={{ marginTop: 'var(--space-4)' }}>
              <h4 style={{ marginBottom: '16px', fontSize: 'var(--text-md)', fontWeight: 600 }}>Visualisasi Pergerakan & Prediksi Demand</h4>
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
                    <Line type="monotone" dataKey="actualOut" name="Demand/Sales Aktual" stroke="var(--color-primary-600)" strokeWidth={2} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="forecastOut" name="Prediksi Demand" stroke="var(--color-warning-500)" strokeWidth={2} strokeDasharray="5 5" />
                    <Line type="monotone" dataKey="projectedStock" name="Proyeksi Sisa Stok Gudang" stroke="var(--color-success-600)" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Historical Data Table */}
            <div style={{ marginTop: 'var(--space-4)' }}>
              <h4 style={{ marginBottom: '16px', fontSize: 'var(--text-md)', fontWeight: 600 }}>Tabel Histori & Prediksi Data</h4>
              <DataTable columns={forecastColumns} data={forecastData} />
            </div>
            
          </div>
        ) : selectedProduct ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-tertiary)' }}>Belum ada cukup data historis penjualan (OUT) dalam 30 hari terakhir untuk memproyeksikan target produksi produk ini.</div>
        ) : null}
      </Card>
    </div>
  );

  return (
    <div>
      <PageHeader
        title="PPIC & Peramalan (Forecasting)"
        description="Analisis tren, manajemen proyeksi ketersediaan bahan baku, dan MRP."
        breadcrumbs={[{ label: 'Operasional' }, { label: 'PPIC' }]}
        actions={
          <Button variant="outline" onClick={loadData}>
            Refresh Data
          </Button>
        }
      />

      {isLoading ? (
        <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-secondary)' }}>Memuat data PPIC...</div>
      ) : (
        <Tabs
          tabs={[
            { id: 'forecast', label: <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><LineChartIcon size={16} /> Dashboard Forecasting & MRP</span>, content: ForecastTab },
            { id: 'sortings', label: <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Sprout size={16} /> Data Daun Jamur (Sortasi)</span>, content: SortingsTab },
          ]}
        />
      )}
    </div>
  );
}
