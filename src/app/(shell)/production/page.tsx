'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/data-table/DataTable';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Dropdown } from '@/components/ui/Dropdown';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { FormField } from '@/components/form/FormField';
import { useToast } from '@/hooks/useToast';
import {
  Plus,
  MoreVertical,
  Eye,
  Factory,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Scale,
  Flame,
  PackageCheck,
  Ban,
  Clock,
  Send,
  Sparkles,
  Calendar,
  Filter,
  RotateCcw,
  Trash2,
  Wand2,
  Thermometer,
  Timer,
  Package,
  Play,
  Pause,
  Square,
  BarChart3,
  CookingPot,
  Box,
  Info,
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { format, isToday, isThisMonth, isThisYear, startOfDay, endOfDay } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import {
  getProductionOrders,
  createProductionOrder,
  recordMaterialConsumption,
  recordProductionResult,
  updateProductionOrderStatus,
  getProductionOverviewMetrics,
  getProductionFormOptions,
  getSpkSuggestions,
  getProductionCapacityMetrics,
  createFryingBatch,
  completeFryingBatch,
  getAllFryingBatches,
  createPackingEntry,
  markLongsongPacked,
  getAllPackingEntries,
  getUnpackedLongsongReminder,
  recordTimeStudySample,
  getTimeStudySamples,
  deleteTimeStudySample,
  calculateAndSaveStandardTime,
  getFryingPackingMetrics,
  type CreateProductionOrderInput,
  type MaterialConsumptionItem,
  type SpkSuggestion,
  type CreateFryingBatchInput,
  type CompleteFryingBatchInput,
  type CreatePackingEntryInput,
} from '@/actions/production';
import { getPpicData } from '@/actions/ppic';
import type { DbProductionOrder, DbProduct, DbRawMaterial, DbFryingBatch, DbPackingEntry, DbTimeStudySample } from '@/types/database';
import { FLAVOR_VARIANTS } from '@/types/database';

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

// ─────────────────────────────────────────────
// MAIN PAGE COMPONENT
// ─────────────────────────────────────────────

export default function ProductionPage() {
  const [activeTab, setActiveTab] = useState<'FRYING' | 'PACKING'>('FRYING');
  const toast = useToast();

  // ── Shared state ──
  const [orders, setOrders] = useState<DbProductionOrder[]>([]);
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [rawMaterials, setRawMaterials] = useState<(DbRawMaterial & { available_stock?: number })[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ── Frying state ──
  const [fryingBatches, setFryingBatches] = useState<DbFryingBatch[]>([]);
  const [fryingMetrics, setFryingMetrics] = useState({
    activeFryingBatchesToday: 0,
    avgYieldToday: 0,
    totalKremesanGramToday: 0,
    unpackedLongsongCount: 0,
    packedToplesToday: 0,
    totalSeasoningGramToday: 0,
  });
  const [createFryingOpen, setCreateFryingOpen] = useState(false);
  const [completeFryingOpen, setCompleteFryingOpen] = useState(false);
  const [selectedFryingBatch, setSelectedFryingBatch] = useState<DbFryingBatch | null>(null);
  const [fryingForm, setFryingForm] = useState({
    production_order_id: '',
    wajan_number: '1',
    batch_weight_gram: '800',
    oil_temp_celsius: '170',
    frying_duration_minutes: '15',
    notes: '',
  });
  const [completeFryingForm, setCompleteFryingForm] = useState({
    output_weight_gram: '',
    longsong_count: '',
    kremesan_weight_gram: '0',
  });

  // ── Packing state ──
  const [packingEntries, setPackingEntries] = useState<DbPackingEntry[]>([]);
  const [createPackingOpen, setCreatePackingOpen] = useState(false);
  const [packingForm, setPackingForm] = useState({
    production_order_id: '',
    frying_batch_id: '',
    flavor_variant: 'Original',
    longsong_number: '1',
    longsong_weight_gram: '',
    packaged_toples_count: '',
    packaging_weight_gram: '100g',
    seasoning_used_gram: '0',
    notes: '',
  });

  // ── Time Study state (Enhanced for Senior Operators: Start, Pause, Resume, Reset) ──
  const [timeStudyOpen, setTimeStudyOpen] = useState(false);
  const [timeStudyOrderId, setTimeStudyOrderId] = useState('');
  const [timeStudySamples, setTimeStudySamples] = useState<DbTimeStudySample[]>([]);
  const [stopwatchState, setStopwatchState] = useState<'IDLE' | 'RUNNING' | 'PAUSED'>('IDLE');
  const [stopwatchElapsed, setStopwatchElapsed] = useState(0);
  const stopwatchStartRef = useRef<number | null>(null);
  const accumulatedElapsedRef = useRef<number>(0);
  const stopwatchTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [ratingFactor, setRatingFactor] = useState(1.0);
  const [allowanceFactor, setAllowanceFactor] = useState(0.15);

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    variant: 'danger' | 'primary';
  }>({ isOpen: false, title: '', description: '', onConfirm: () => {}, variant: 'primary' });

  // ─────────────────────────────────────────────
  // DATA LOADING
  // ─────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [ordersRes, optionsRes, fryingRes, packingRes, metricsRes] = await Promise.all([
        getProductionOrders(),
        getProductionFormOptions(),
        getAllFryingBatches(),
        getAllPackingEntries(),
        getFryingPackingMetrics(),
      ]);

      if (ordersRes.success && ordersRes.data) setOrders(ordersRes.data);
      if (optionsRes.success) {
        if (optionsRes.products) setProducts(optionsRes.products);
        if (optionsRes.rawMaterials) setRawMaterials(optionsRes.rawMaterials);
      }
      if (fryingRes.success && fryingRes.data) setFryingBatches(fryingRes.data);
      if (packingRes.success && packingRes.data) setPackingEntries(packingRes.data);
      if (metricsRes.success && metricsRes.data) setFryingMetrics(metricsRes.data);
    } catch (err: any) {
      console.error('Gagal memuat data produksi:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Stopwatch interval effect ──
  useEffect(() => {
    if (stopwatchState === 'RUNNING') {
      stopwatchTimerRef.current = setInterval(() => {
        if (stopwatchStartRef.current) {
          const currentRun = (Date.now() - stopwatchStartRef.current) / 1000;
          setStopwatchElapsed(accumulatedElapsedRef.current + currentRun);
        }
      }, 100);
    } else {
      if (stopwatchTimerRef.current) clearInterval(stopwatchTimerRef.current);
    }
    return () => {
      if (stopwatchTimerRef.current) clearInterval(stopwatchTimerRef.current);
    };
  }, [stopwatchState]);

  // ─────────────────────────────────────────────
  // HANDLERS — FRYING
  // ─────────────────────────────────────────────

  const handleCreateFrying = async () => {
    if (!fryingForm.production_order_id || !fryingForm.oil_temp_celsius) {
      toast.error('SPK dan suhu minyak wajib diisi');
      return;
    }

    const res = await createFryingBatch({
      production_order_id: fryingForm.production_order_id,
      wajan_number: Number(fryingForm.wajan_number),
      batch_weight_gram: Number(fryingForm.batch_weight_gram) || 800,
      oil_temp_celsius: Number(fryingForm.oil_temp_celsius),
      frying_duration_minutes: Number(fryingForm.frying_duration_minutes),
      notes: fryingForm.notes,
    });

    if (res.success) {
      toast.success(`Batch goreng wajan #${fryingForm.wajan_number} berhasil dibuat`);
      setCreateFryingOpen(false);
      loadData();
    } else {
      toast.error(res.error || 'Gagal membuat batch goreng');
    }
  };

  const handleCompleteFrying = async () => {
    if (!selectedFryingBatch) return;
    if (!completeFryingForm.output_weight_gram || !completeFryingForm.longsong_count) {
      toast.error('Berat output dan jumlah longsong wajib diisi');
      return;
    }

    const res = await completeFryingBatch({
      frying_batch_id: selectedFryingBatch.id,
      output_weight_gram: Number(completeFryingForm.output_weight_gram),
      longsong_count: Number(completeFryingForm.longsong_count),
      kremesan_weight_gram: Number(completeFryingForm.kremesan_weight_gram) || 0,
    });

    if (res.success) {
      toast.success('Hasil goreng berhasil dicatat');
      setCompleteFryingOpen(false);
      loadData();
    } else {
      toast.error(res.error || 'Gagal menyimpan hasil goreng');
    }
  };

  // ─────────────────────────────────────────────
  // HANDLERS — PACKING
  // ─────────────────────────────────────────────

  const handleCreatePacking = async () => {
    if (!packingForm.production_order_id || !packingForm.packaged_toples_count) {
      toast.error('SPK dan jumlah toples wajib diisi');
      return;
    }

    const res = await createPackingEntry({
      production_order_id: packingForm.production_order_id,
      frying_batch_id: packingForm.frying_batch_id || undefined,
      flavor_variant: packingForm.flavor_variant,
      longsong_number: Number(packingForm.longsong_number),
      longsong_weight_gram: Number(packingForm.longsong_weight_gram) || undefined,
      packaged_toples_count: Number(packingForm.packaged_toples_count),
      packaging_weight_gram: packingForm.packaging_weight_gram,
      seasoning_used_gram: Number(packingForm.seasoning_used_gram) || 0,
      notes: packingForm.notes,
    });

    if (res.success) {
      toast.success(`Packing longsong #${packingForm.longsong_number} (${packingForm.flavor_variant}) berhasil dicatat`);
      setCreatePackingOpen(false);
      loadData();
    } else {
      toast.error(res.error || 'Gagal membuat entri packing');
    }
  };

  const handleMarkPacked = async (entryId: string) => {
    const res = await markLongsongPacked(entryId);
    if (res.success) {
      toast.success('Longsong ditandai sudah dipacking');
      loadData();
    } else {
      toast.error(res.error || 'Gagal menandai longsong');
    }
  };

  // ─────────────────────────────────────────────
  // HANDLERS — TIME STUDY STOPWATCH (Mulai, Jeda, Lanjut, Ulang, Selesai)
  // ─────────────────────────────────────────────

  const handleStartStopwatch = () => {
    accumulatedElapsedRef.current = 0;
    stopwatchStartRef.current = Date.now();
    setStopwatchElapsed(0);
    setStopwatchState('RUNNING');
  };

  const handlePauseStopwatch = () => {
    if (stopwatchState !== 'RUNNING') return;
    if (stopwatchStartRef.current) {
      accumulatedElapsedRef.current += (Date.now() - stopwatchStartRef.current) / 1000;
    }
    stopwatchStartRef.current = null;
    if (stopwatchTimerRef.current) clearInterval(stopwatchTimerRef.current);
    setStopwatchElapsed(accumulatedElapsedRef.current);
    setStopwatchState('PAUSED');
  };

  const handleResumeStopwatch = () => {
    if (stopwatchState !== 'PAUSED') return;
    stopwatchStartRef.current = Date.now();
    setStopwatchState('RUNNING');
  };

  const handleResetStopwatch = () => {
    if (stopwatchTimerRef.current) clearInterval(stopwatchTimerRef.current);
    stopwatchStartRef.current = null;
    accumulatedElapsedRef.current = 0;
    setStopwatchElapsed(0);
    setStopwatchState('IDLE');
    toast.info('Stopwatch diulang kembali ke 0 detik');
  };

  const handleStopStopwatch = async () => {
    if (!timeStudyOrderId) {
      toast.error('Pilih SPK Produksi terlebih dahulu');
      return;
    }

    let finalDuration = accumulatedElapsedRef.current;
    if (stopwatchState === 'RUNNING' && stopwatchStartRef.current) {
      finalDuration += (Date.now() - stopwatchStartRef.current) / 1000;
    }

    if (finalDuration < 0.5) {
      toast.error('Durasi terlalu singkat. Jika salah pencet, gunakan tombol Ulang.');
      return;
    }

    if (stopwatchTimerRef.current) clearInterval(stopwatchTimerRef.current);
    setStopwatchState('IDLE');
    stopwatchStartRef.current = null;
    accumulatedElapsedRef.current = 0;
    setStopwatchElapsed(0);

    const sampleNumber = timeStudySamples.length + 1;
    const res = await recordTimeStudySample({
      production_order_id: timeStudyOrderId,
      stage: activeTab,
      sample_number: sampleNumber,
      started_at: new Date(Date.now() - finalDuration * 1000).toISOString(),
      finished_at: new Date().toISOString(),
      duration_seconds: Number(finalDuration.toFixed(2)),
    });

    if (res.success) {
      toast.success(`Sample #${sampleNumber} tersimpan: ${formatDuration(finalDuration)}`);
      // Reload samples
      const samplesRes = await getTimeStudySamples(timeStudyOrderId, activeTab);
      if (samplesRes.success && samplesRes.data) setTimeStudySamples(samplesRes.data);
    } else {
      toast.error(res.error || 'Gagal mencatat sample');
    }
  };

  const handleCalculateStandardTime = async () => {
    if (!timeStudyOrderId) return;
    const res = await calculateAndSaveStandardTime({
      production_order_id: timeStudyOrderId,
      rating_factor: ratingFactor,
      allowance_factor: allowanceFactor,
    });

    if (res.success) {
      toast.success(`Waktu Baku dihitung: ${formatDuration(res.standard_time || 0)}`);
      loadData();
    } else {
      toast.error(res.error || 'Gagal menghitung waktu baku');
    }
  };

  const handleOpenTimeStudy = async (orderId: string) => {
    setTimeStudyOrderId(orderId);
    const samplesRes = await getTimeStudySamples(orderId, activeTab);
    if (samplesRes.success && samplesRes.data) setTimeStudySamples(samplesRes.data);
    setTimeStudyOpen(true);
  };

  const handleDeleteSample = async (sampleId: string) => {
    const res = await deleteTimeStudySample(sampleId);
    if (res.success) {
      toast.success('Sample dihapus');
      const samplesRes = await getTimeStudySamples(timeStudyOrderId, activeTab);
      if (samplesRes.success && samplesRes.data) setTimeStudySamples(samplesRes.data);
    }
  };

  // ─────────────────────────────────────────────
  // COMPUTED VALUES
  // ─────────────────────────────────────────────

  const cycleTimeAvg = useMemo(() => {
    const validSamples = timeStudySamples.filter(s => s.duration_seconds != null);
    if (validSamples.length === 0) return 0;
    return validSamples.reduce((sum, s) => sum + Number(s.duration_seconds || 0), 0) / validSamples.length;
  }, [timeStudySamples]);

  const normalTime = cycleTimeAvg * ratingFactor;
  const standardTime = normalTime * (1 + allowanceFactor);

  // ─────────────────────────────────────────────
  // TABLE COLUMNS — FRYING
  // ─────────────────────────────────────────────

  const fryingColumns = useMemo<ColumnDef<DbFryingBatch>[]>(() => [
    {
      accessorKey: 'wajan_number',
      header: 'Wajan #',
      cell: ({ row }) => (
        <strong style={{ color: 'var(--color-primary-700)', fontFamily: 'monospace', fontSize: 'var(--text-lg)' }}>
          #{row.original.wajan_number}
        </strong>
      ),
    },
    {
      accessorKey: 'batch_weight_gram',
      header: 'Input (gram)',
      cell: ({ row }) => (
        <div>
          <strong>{row.original.batch_weight_gram.toLocaleString('id-ID')}g</strong>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
            {(row.original.batch_weight_gram / 1000).toFixed(2)} kilogram
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'oil_temp_celsius',
      header: 'Suhu (°C)',
      cell: ({ row }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Thermometer className="w-3.5 h-3.5 text-[var(--color-danger-500)]" aria-hidden="true" />
          <strong>{row.original.oil_temp_celsius || '-'}°C</strong>
        </div>
      ),
    },
    {
      accessorKey: 'frying_duration_minutes',
      header: 'Durasi (menit)',
      cell: ({ row }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Timer className="w-3.5 h-3.5 text-[var(--color-primary-500)]" aria-hidden="true" />
          <span>{row.original.frying_duration_minutes || '-'} mnt</span>
        </div>
      ),
    },
    {
      accessorKey: 'output_weight_gram',
      header: 'Output (gram)',
      cell: ({ row }) => row.original.output_weight_gram ? (
        <strong style={{ color: 'var(--color-success-700)' }}>
          {row.original.output_weight_gram.toLocaleString('id-ID')}g
        </strong>
      ) : (
        <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>Belum selesai</span>
      ),
    },
    {
      accessorKey: 'longsong_count',
      header: 'Longsong',
      cell: ({ row }) => (
        <span>
          {row.original.longsong_count > 0 ? (
            <strong>{row.original.longsong_count}</strong>
          ) : (
            <span style={{ color: 'var(--text-tertiary)' }}>-</span>
          )}
        </span>
      ),
    },
    {
      accessorKey: 'kremesan_weight_gram',
      header: 'Kremesan (gram)',
      cell: ({ row }) => (
        <span style={{ color: row.original.kremesan_weight_gram > 0 ? 'var(--color-warning-700)' : 'var(--text-tertiary)' }}>
          {row.original.kremesan_weight_gram > 0 ? `${row.original.kremesan_weight_gram.toLocaleString('id-ID')}g` : '-'}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const isDone = !!row.original.finished_at;
        return <StatusBadge status={isDone ? 'completed' : 'in_progress'} label={isDone ? 'Selesai' : 'Sedang Goreng'} />;
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const batch = row.original;
        if (batch.finished_at) return null;
        return (
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Scale className="w-3.5 h-3.5" aria-hidden="true" />}
            onClick={() => {
              setSelectedFryingBatch(batch);
              setCompleteFryingForm({ output_weight_gram: '', longsong_count: '', kremesan_weight_gram: '0' });
              setCompleteFryingOpen(true);
            }}
          >
            Input Hasil
          </Button>
        );
      },
    },
  ], []);

  // ─────────────────────────────────────────────
  // TABLE COLUMNS — PACKING
  // ─────────────────────────────────────────────

  const packingColumns = useMemo<ColumnDef<DbPackingEntry>[]>(() => [
    {
      accessorKey: 'longsong_number',
      header: 'Longsong #',
      cell: ({ row }) => (
        <strong style={{ fontFamily: 'monospace', color: 'var(--color-primary-700)' }}>
          #{row.original.longsong_number}
        </strong>
      ),
    },
    {
      accessorKey: 'flavor_variant',
      header: 'Varian Rasa',
      cell: ({ row }) => {
        const v = row.original.flavor_variant;
        const colorMap: Record<string, string> = {
          'Original': 'var(--color-warning-100)',
          'Balado': 'var(--color-danger-100)',
          'BBQ': 'var(--color-primary-100)',
          'Pedas Manis': 'var(--color-success-100)',
          'Super Pedas': 'var(--color-danger-200)',
        };
        return (
          <span style={{
            padding: '3px 10px', borderRadius: 'var(--radius-md)',
            fontWeight: 700, fontSize: 'var(--text-xs)',
            background: colorMap[v] || 'var(--bg-subtle)',
          }}>
            {v}
          </span>
        );
      },
    },
    {
      accessorKey: 'longsong_weight_gram',
      header: 'Berat Longsong',
      cell: ({ row }) => row.original.longsong_weight_gram
        ? <strong>{row.original.longsong_weight_gram.toLocaleString('id-ID')}g</strong>
        : <span style={{ color: 'var(--text-tertiary)' }}>-</span>,
    },
    {
      accessorKey: 'seasoning_used_gram',
      header: 'Bumbu (gram)',
      cell: ({ row }) => <span>{Number(row.original.seasoning_used_gram).toFixed(1)}g</span>,
    },
    {
      accessorKey: 'packaged_toples_count',
      header: 'Toples',
      cell: ({ row }) => (
        <div>
          <strong>{row.original.packaged_toples_count}</strong>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginLeft: '4px' }}>
            @{row.original.packaging_weight_gram}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'is_packed',
      header: 'Status',
      cell: ({ row }) => (
        <StatusBadge
          status={row.original.is_packed ? 'completed' : 'pending'}
          label={row.original.is_packed ? 'Dipacking' : 'Menunggu'}
        />
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        if (row.original.is_packed) return null;
        return (
          <Button
            variant="primary"
            size="sm"
            leftIcon={<PackageCheck className="w-3.5 h-3.5" aria-hidden="true" />}
            onClick={() => handleMarkPacked(row.original.id)}
          >
            Tandai Selesai
          </Button>
        );
      },
    },
  ], []);

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────

  const tabs = [
    { key: 'FRYING' as const, label: 'Produksi Goreng Jamur', icon: <Flame className="w-4 h-4 text-currentColor" aria-hidden="true" /> },
    { key: 'PACKING' as const, label: 'Produksi Packing Rasa', icon: <Package className="w-4 h-4 text-currentColor" aria-hidden="true" /> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <PageHeader
        title="Lini Manufaktur & Produksi"
        description="Pencatatan produksi goreng jamur per wajan, packing rasa per longsong, time study, dan monitoring output."
        breadcrumbs={[{ label: 'Manufaktur' }, { label: 'Produksi' }]}
      />

      {/* ── TAB SWITCHER ── */}
      <div style={{
        display: 'flex', gap: '0', borderBottom: '2px solid var(--border-default)',
      }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: 'var(--space-3) var(--space-5)',
              fontWeight: activeTab === tab.key ? 700 : 500,
              fontSize: 'var(--text-sm)',
              color: activeTab === tab.key ? 'var(--color-primary-700)' : 'var(--text-secondary)',
              background: activeTab === tab.key ? 'var(--color-primary-50)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.key ? '3px solid var(--color-primary-600)' : '3px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════ */}
      {/* TAB 1: PRODUKSI GORENG JAMUR                */}
      {/* ════════════════════════════════════════════ */}
      {activeTab === 'FRYING' && (
        <>
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                <Flame className="w-5 h-5 text-[var(--color-danger-600)]" aria-hidden="true" />
                <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Batch Wajan Hari Ini</span>
              </div>
              <div style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--color-primary-700)' }}>
                {fryingMetrics.activeFryingBatchesToday} <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-secondary)' }}>Batch</span>
              </div>
            </Card>

            <Card>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                <TrendingUp className="w-5 h-5 text-[var(--color-success-600)]" aria-hidden="true" />
                <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Rata-rata Rendemen</span>
              </div>
              <div style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--color-success-700)' }}>
                {fryingMetrics.avgYieldToday || '-'}%
              </div>
            </Card>

            <Card>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                <Sparkles className="w-5 h-5 text-[var(--color-warning-600)]" aria-hidden="true" />
                <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Total Kremesan</span>
              </div>
              <div style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--color-warning-700)' }}>
                {(fryingMetrics.totalKremesanGramToday / 1000).toFixed(2)} <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-secondary)' }}>kilogram</span>
              </div>
            </Card>

            <Card>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                <AlertTriangle className={`w-5 h-5 ${fryingMetrics.unpackedLongsongCount > 0 ? 'text-[var(--color-danger-600)]' : 'text-[var(--color-success-600)]'}`} aria-hidden="true" />
                <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Longsong Belum Packing</span>
              </div>
              <div style={{ fontSize: '1.875rem', fontWeight: 700, color: fryingMetrics.unpackedLongsongCount > 0 ? 'var(--color-danger-700)' : 'var(--color-success-700)' }}>
                {fryingMetrics.unpackedLongsongCount}
              </div>
              {fryingMetrics.unpackedLongsongCount > 0 && (
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-danger-600)', marginTop: 'var(--space-1)' }}>
                  Perlu segera dipacking!
                </div>
              )}
            </Card>
          </div>

          {/* Action Bar */}
          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <Button variant="primary" leftIcon={<Plus className="w-4 h-4" aria-hidden="true" />} onClick={() => {
              setFryingForm({
                production_order_id: orders[0]?.id || '',
                wajan_number: String((fryingBatches.length > 0 ? Math.max(...fryingBatches.map(b => b.wajan_number)) : 0) + 1),
                batch_weight_gram: '800',
                oil_temp_celsius: '170',
                frying_duration_minutes: '15',
                notes: '',
              });
              setCreateFryingOpen(true);
            }}>
              Buat Batch Goreng Baru
            </Button>

            {orders.length > 0 && (
              <Button variant="secondary" leftIcon={<Timer className="w-4 h-4" aria-hidden="true" />} onClick={() => handleOpenTimeStudy(orders[0]?.id || '')}>
                Time Study (Stopwatch)
              </Button>
            )}
          </div>

          {/* Frying Data Table */}
          <DataTable columns={fryingColumns} data={fryingBatches} />
        </>
      )}

      {/* ════════════════════════════════════════════ */}
      {/* TAB 2: PRODUKSI PACKING RASA                */}
      {/* ════════════════════════════════════════════ */}
      {activeTab === 'PACKING' && (
        <>
          {/* Reminder Banner */}
          {fryingMetrics.unpackedLongsongCount > 0 && (
            <div style={{
              padding: 'var(--space-4)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-warning-50)',
              border: '2px solid var(--color-warning-300)',
              display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
            }}>
              <AlertTriangle className="w-6 h-6 text-[var(--color-warning-600)] shrink-0" aria-hidden="true" />
              <div>
                <div style={{ fontWeight: 700, color: 'var(--color-warning-800)', fontSize: 'var(--text-base)' }}>
                  {fryingMetrics.unpackedLongsongCount} longsong belum dipacking!
                </div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-warning-700)' }}>
                  Segera lakukan packing rasa untuk longsong yang sudah selesai digoreng.
                </div>
              </div>
            </div>
          )}

          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                <Box className="w-5 h-5 text-[var(--color-warning-600)]" aria-hidden="true" />
                <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Longsong Menunggu</span>
              </div>
              <div style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--color-warning-700)' }}>
                {fryingMetrics.unpackedLongsongCount}
              </div>
            </Card>

            <Card>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                <PackageCheck className="w-5 h-5 text-[var(--color-success-600)]" aria-hidden="true" />
                <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Toples Dipacking Hari Ini</span>
              </div>
              <div style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--color-success-700)' }}>
                {fryingMetrics.packedToplesToday}
              </div>
            </Card>

            <Card>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                <CookingPot className="w-5 h-5 text-[var(--color-info-600)]" aria-hidden="true" />
                <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Bumbu Terpakai Hari Ini</span>
              </div>
              <div style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--color-info-700)' }}>
                {fryingMetrics.totalSeasoningGramToday}g
              </div>
            </Card>
          </div>

          {/* Action Bar */}
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <Button variant="primary" leftIcon={<Plus className="w-4 h-4" aria-hidden="true" />} onClick={() => {
              setPackingForm({
                production_order_id: orders[0]?.id || '',
                frying_batch_id: '',
                flavor_variant: 'Original',
                longsong_number: String(packingEntries.length + 1),
                longsong_weight_gram: '',
                packaged_toples_count: '',
                packaging_weight_gram: '100g',
                seasoning_used_gram: '0',
                notes: '',
              });
              setCreatePackingOpen(true);
            }}>
              Input Packing Rasa
            </Button>
          </div>

          {/* Packing Data Table */}
          <DataTable columns={packingColumns} data={packingEntries} />
        </>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* MODAL: BUAT BATCH GORENG                       */}
      {/* ═══════════════════════════════════════════════ */}
      <Modal
        isOpen={createFryingOpen}
        onClose={() => setCreateFryingOpen(false)}
        title="Buat Batch Goreng Baru (Per Wajan)"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateFryingOpen(false)}>Batal</Button>
            <Button variant="primary" onClick={handleCreateFrying} leftIcon={<Flame className="w-4 h-4" aria-hidden="true" />}>
              Mulai Goreng
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <FormField label="Pilih SPK Produksi" required>
            <Select
              options={orders.filter(o => o.status === 'DRAFT' || o.status === 'IN_PROGRESS').map(o => ({
                value: o.id, label: `${o.batch_number} — ${o.product_variant || 'Jamur Crispy'}`,
              }))}
              value={fryingForm.production_order_id}
              onChange={(e) => setFryingForm({ ...fryingForm, production_order_id: e.target.value })}
            />
          </FormField>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <FormField label="Nomor Wajan" required>
              <Input
                type="number" min="1"
                value={fryingForm.wajan_number}
                onChange={(e) => setFryingForm({ ...fryingForm, wajan_number: e.target.value })}
              />
            </FormField>

            <FormField label="Berat Input (gram)" required>
              <Input
                type="number" min="1"
                value={fryingForm.batch_weight_gram}
                onChange={(e) => setFryingForm({ ...fryingForm, batch_weight_gram: e.target.value })}
                placeholder="800"
              />
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: '2px', display: 'block' }}>
                Default: 800 gram per wajan
              </span>
            </FormField>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <FormField label="Suhu Minyak (°C)" required>
              <Input
                type="number" min="100" max="250" step="5"
                value={fryingForm.oil_temp_celsius}
                onChange={(e) => setFryingForm({ ...fryingForm, oil_temp_celsius: e.target.value })}
                placeholder="170"
              />
            </FormField>

            <FormField label="Durasi Goreng (menit)" required>
              <Input
                type="number" min="1" step="0.5"
                value={fryingForm.frying_duration_minutes}
                onChange={(e) => setFryingForm({ ...fryingForm, frying_duration_minutes: e.target.value })}
                placeholder="15"
              />
            </FormField>
          </div>

          <FormField label="Catatan Operator">
            <Textarea
              rows={2}
              value={fryingForm.notes}
              onChange={(e) => setFryingForm({ ...fryingForm, notes: e.target.value })}
              placeholder="Catatan tambahan..."
            />
          </FormField>
        </div>
      </Modal>

      {/* ═══════════════════════════════════════════════ */}
      {/* MODAL: INPUT HASIL GORENG                      */}
      {/* ═══════════════════════════════════════════════ */}
      <Modal
        isOpen={completeFryingOpen}
        onClose={() => setCompleteFryingOpen(false)}
        title={`Hasil Goreng — Wajan #${selectedFryingBatch?.wajan_number}`}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCompleteFryingOpen(false)}>Batal</Button>
            <Button variant="primary" onClick={handleCompleteFrying} leftIcon={<Scale className="w-4 h-4" aria-hidden="true" />}>
              Simpan Hasil
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {selectedFryingBatch && (
            <div style={{ padding: 'var(--space-3)', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Berat Input Wajan</span>
              <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                {selectedFryingBatch.batch_weight_gram.toLocaleString('id-ID')} gram ({(selectedFryingBatch.batch_weight_gram / 1000).toFixed(2)} kilogram)
              </div>
            </div>
          )}

          <FormField label="Berat Output Jamur Matang (gram)" required>
            <Input
              type="number" min="0"
              value={completeFryingForm.output_weight_gram}
              onChange={(e) => setCompleteFryingForm({ ...completeFryingForm, output_weight_gram: e.target.value })}
              placeholder="650"
            />
          </FormField>

          <FormField label="Jumlah Longsong yang Dihasilkan" required>
            <Input
              type="number" min="0"
              value={completeFryingForm.longsong_count}
              onChange={(e) => setCompleteFryingForm({ ...completeFryingForm, longsong_count: e.target.value })}
              placeholder="3"
            />
          </FormField>

          <FormField label="Berat Kremesan/Remukan (gram)">
            <Input
              type="number" min="0"
              value={completeFryingForm.kremesan_weight_gram}
              onChange={(e) => setCompleteFryingForm({ ...completeFryingForm, kremesan_weight_gram: e.target.value })}
              placeholder="0"
            />
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: '2px', display: 'block' }}>
              Remukan yang tidak masuk toples, dijual sebagai kremesan
            </span>
          </FormField>

          {/* Live rendemen */}
          {completeFryingForm.output_weight_gram && selectedFryingBatch && (
            (() => {
              const yld = (Number(completeFryingForm.output_weight_gram) / selectedFryingBatch.batch_weight_gram) * 100;
              const isGood = yld >= 80;
              return (
                <div style={{
                  padding: 'var(--space-3)', borderRadius: 'var(--radius-md)',
                  background: isGood ? 'var(--color-success-50)' : 'var(--color-danger-50)',
                  border: `1px solid ${isGood ? 'var(--color-success-300)' : 'var(--color-danger-300)'}`,
                  display: 'flex', alignItems: 'center', gap: '8px',
                }}>
                  {isGood ? <CheckCircle2 className="w-5 h-5 text-[var(--color-success-600)]" aria-hidden="true" /> : <AlertTriangle className="w-5 h-5 text-[var(--color-danger-600)]" aria-hidden="true" />}
                  <div>
                    <div style={{ fontWeight: 700, color: isGood ? 'var(--color-success-800)' : 'var(--color-danger-800)' }}>
                      Rendemen: {yld.toFixed(1)}%
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: isGood ? 'var(--color-success-700)' : 'var(--color-danger-700)' }}>
                      {isGood ? 'Memenuhi standar efisiensi (≥ 80%)' : 'Di bawah standar! Periksa proses goreng.'}
                    </div>
                  </div>
                </div>
              );
            })()
          )}
        </div>
      </Modal>

      {/* ═══════════════════════════════════════════════ */}
      {/* MODAL: INPUT PACKING RASA                      */}
      {/* ═══════════════════════════════════════════════ */}
      <Modal
        isOpen={createPackingOpen}
        onClose={() => setCreatePackingOpen(false)}
        title="Input Packing Rasa (Per Longsong)"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreatePackingOpen(false)}>Batal</Button>
            <Button variant="primary" onClick={handleCreatePacking} leftIcon={<Package className="w-4 h-4" aria-hidden="true" />}>
              Simpan Packing
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <FormField label="Pilih SPK Produksi" required>
            <Select
              options={orders.filter(o => o.status !== 'CANCELLED' && o.status !== 'COMPLETED').map(o => ({
                value: o.id, label: `${o.batch_number} — ${o.product_variant || 'Jamur Crispy'}`,
              }))}
              value={packingForm.production_order_id}
              onChange={(e) => setPackingForm({ ...packingForm, production_order_id: e.target.value })}
            />
          </FormField>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <FormField label="Varian Rasa" required>
              <Select
                options={FLAVOR_VARIANTS.map(v => ({ value: v, label: v }))}
                value={packingForm.flavor_variant}
                onChange={(e) => setPackingForm({ ...packingForm, flavor_variant: e.target.value })}
              />
            </FormField>

            <FormField label="No. Longsong">
              <Input
                type="number" min="1"
                value={packingForm.longsong_number}
                onChange={(e) => setPackingForm({ ...packingForm, longsong_number: e.target.value })}
              />
            </FormField>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <FormField label="Berat Longsong (gram)">
              <Input
                type="number" min="0"
                value={packingForm.longsong_weight_gram}
                onChange={(e) => setPackingForm({ ...packingForm, longsong_weight_gram: e.target.value })}
                placeholder="500"
              />
            </FormField>

            <FormField label="Bumbu Tabur (gram)" required>
              <Input
                type="number" min="0" step="0.1"
                value={packingForm.seasoning_used_gram}
                onChange={(e) => setPackingForm({ ...packingForm, seasoning_used_gram: e.target.value })}
                placeholder="25"
              />
            </FormField>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <FormField label="Jumlah Toples" required>
              <Input
                type="number" min="0"
                value={packingForm.packaged_toples_count}
                onChange={(e) => setPackingForm({ ...packingForm, packaged_toples_count: e.target.value })}
                placeholder="10"
              />
            </FormField>

            <FormField label="Berat per Kemasan">
              <Select
                options={[
                  { value: '50g', label: '50 gram' },
                  { value: '100g', label: '100 gram' },
                  { value: '150g', label: '150 gram' },
                  { value: '250g', label: '250 gram' },
                ]}
                value={packingForm.packaging_weight_gram}
                onChange={(e) => setPackingForm({ ...packingForm, packaging_weight_gram: e.target.value })}
              />
            </FormField>
          </div>

          <FormField label="Catatan">
            <Textarea
              rows={2}
              value={packingForm.notes}
              onChange={(e) => setPackingForm({ ...packingForm, notes: e.target.value })}
              placeholder="Catatan packing..."
            />
          </FormField>
        </div>
      </Modal>

      {/* ═══════════════════════════════════════════════ */}
      {/* MODAL: TIME STUDY (STOPWATCH)                  */}
      {/* ═══════════════════════════════════════════════ */}
      <Modal
        isOpen={timeStudyOpen}
        onClose={() => {
          setTimeStudyOpen(false);
          if (stopwatchTimerRef.current) clearInterval(stopwatchTimerRef.current);
          setStopwatchState('IDLE');
          stopwatchStartRef.current = null;
          accumulatedElapsedRef.current = 0;
          setStopwatchElapsed(0);
        }}
        title="Time Study — Stopwatch & Perhitungan Waktu Baku"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setTimeStudyOpen(false)}>Tutup</Button>
            {timeStudySamples.length >= 10 && (
              <Button variant="primary" onClick={handleCalculateStandardTime} leftIcon={<BarChart3 className="w-4 h-4" aria-hidden="true" />}>
                Hitung Waktu Baku ({timeStudySamples.length} Sample)
              </Button>
            )}
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* SPK Selector in Modal if multiple orders */}
          {orders.length > 1 && (
            <FormField label="Pilih SPK Batch yang Diukur">
              <Select
                options={orders.map(o => ({
                  value: o.id, label: `${o.batch_number} — ${o.product_variant || 'Jamur Crispy'}`,
                }))}
                value={timeStudyOrderId}
                onChange={async (e) => {
                  const id = e.target.value;
                  setTimeStudyOrderId(id);
                  const samplesRes = await getTimeStudySamples(id, activeTab);
                  if (samplesRes.success && samplesRes.data) setTimeStudySamples(samplesRes.data);
                }}
              />
            </FormField>
          )}

          {/* Stopwatch Display Panel (High contrast & large for senior operators) */}
          <div style={{
            textAlign: 'center',
            padding: 'var(--space-6)',
            background: stopwatchState === 'RUNNING'
              ? 'var(--color-danger-50)'
              : stopwatchState === 'PAUSED'
                ? 'var(--color-warning-50)'
                : 'var(--bg-subtle)',
            borderRadius: 'var(--radius-lg)',
            border: `2px solid ${stopwatchState === 'RUNNING' ? 'var(--color-danger-400)' : stopwatchState === 'PAUSED' ? 'var(--color-warning-400)' : 'var(--border-default)'}`,
            transition: 'all 0.2s ease',
          }}>
            {/* Status pill badge */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 14px',
              borderRadius: '20px',
              fontSize: 'var(--text-xs)',
              fontWeight: 700,
              marginBottom: 'var(--space-2)',
              background: stopwatchState === 'RUNNING' ? 'var(--color-danger-100)' : stopwatchState === 'PAUSED' ? 'var(--color-warning-100)' : 'var(--bg-default)',
              color: stopwatchState === 'RUNNING' ? 'var(--color-danger-800)' : stopwatchState === 'PAUSED' ? 'var(--color-warning-800)' : 'var(--text-secondary)'
            }}>
              {stopwatchState === 'RUNNING' && <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-danger-600)', animation: 'pulse 1s infinite' }} />}
              {stopwatchState === 'PAUSED' && <Pause className="w-3.5 h-3.5 text-[var(--color-warning-700)]" aria-hidden="true" />}
              {stopwatchState === 'IDLE' && <Timer className="w-3.5 h-3.5 text-[var(--text-secondary)]" aria-hidden="true" />}
              {stopwatchState === 'RUNNING' ? 'SEDANG BERJALAN' : stopwatchState === 'PAUSED' ? 'DIJEDA (ISTIRAHAT / TERTUNDA)' : 'SIAP DIUKUR'}
            </div>

            {/* Giant digital timer */}
            <div style={{
              fontSize: '3.5rem',
              fontWeight: 800,
              fontFamily: 'monospace',
              color: stopwatchState === 'RUNNING' ? 'var(--color-danger-700)' : stopwatchState === 'PAUSED' ? 'var(--color-warning-800)' : 'var(--text-primary)',
              letterSpacing: '2px',
              lineHeight: 1.1,
            }}>
              {formatDuration(stopwatchElapsed)}
            </div>

            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>
              Sample #{timeStudySamples.length + 1} • Tahap: <strong>{activeTab === 'FRYING' ? 'Goreng Jamur' : 'Packing Rasa'}</strong>
            </div>

            {/* Action Buttons: Mulai, Jeda, Lanjut, Ulang, Selesai (Strictly NO Emojis in text) */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 'var(--space-3)', marginTop: 'var(--space-5)', flexWrap: 'wrap' }}>
              {stopwatchState === 'IDLE' && (
                <Button
                  variant="primary"
                  size="lg"
                  leftIcon={<Play className="w-5 h-5" aria-hidden="true" />}
                  onClick={handleStartStopwatch}
                  style={{ minWidth: '160px', padding: '12px 28px', fontSize: 'var(--text-base)', fontWeight: 700 }}
                >
                  Mulai
                </Button>
              )}

              {stopwatchState === 'RUNNING' && (
                <>
                  {/* Tombol Jeda */}
                  <Button
                    variant="secondary"
                    size="lg"
                    leftIcon={<Pause className="w-5 h-5" aria-hidden="true" />}
                    onClick={handlePauseStopwatch}
                    style={{ minWidth: '120px', borderColor: 'var(--color-warning-500)', color: 'var(--color-warning-800)', background: 'var(--color-warning-100)' }}
                  >
                    Jeda
                  </Button>

                  {/* Tombol Ulang / Reset (Jika salah pencet) */}
                  <Button
                    variant="secondary"
                    size="lg"
                    leftIcon={<RotateCcw className="w-4 h-4" aria-hidden="true" />}
                    onClick={handleResetStopwatch}
                    style={{ color: 'var(--text-secondary)' }}
                    title="Ulangi dari 0 jika tidak sengaja terpencet"
                  >
                    Ulang
                  </Button>

                  {/* Tombol Selesai */}
                  <Button
                    variant="primary"
                    size="lg"
                    leftIcon={<CheckCircle2 className="w-5 h-5" aria-hidden="true" />}
                    onClick={handleStopStopwatch}
                    style={{ background: 'var(--color-success-600)', minWidth: '140px' }}
                  >
                    Selesai & Simpan
                  </Button>
                </>
              )}

              {stopwatchState === 'PAUSED' && (
                <>
                  {/* Tombol Lanjut */}
                  <Button
                    variant="primary"
                    size="lg"
                    leftIcon={<Play className="w-5 h-5" aria-hidden="true" />}
                    onClick={handleResumeStopwatch}
                    style={{ minWidth: '130px', background: 'var(--color-primary-600)' }}
                  >
                    Lanjut
                  </Button>

                  {/* Tombol Ulang / Reset */}
                  <Button
                    variant="secondary"
                    size="lg"
                    leftIcon={<RotateCcw className="w-4 h-4" aria-hidden="true" />}
                    onClick={handleResetStopwatch}
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Ulang
                  </Button>

                  {/* Tombol Selesai dari jeda */}
                  <Button
                    variant="primary"
                    size="lg"
                    leftIcon={<CheckCircle2 className="w-5 h-5" aria-hidden="true" />}
                    onClick={handleStopStopwatch}
                    style={{ background: 'var(--color-success-600)' }}
                  >
                    Selesai & Simpan
                  </Button>
                </>
              )}
            </div>

            {/* Senior Friendly Safety Tip with Lucide Info Icon */}
            <div style={{ marginTop: 'var(--space-3)', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <Info className="w-3.5 h-3.5 text-[var(--color-primary-600)] shrink-0" aria-hidden="true" />
              <span>Jika salah pencet atau ingin mengulang dari awal, klik tombol <strong>Ulang</strong> agar waktu kembali ke 0 detik tanpa tersimpan.</span>
            </div>
          </div>

          {/* Progress indicator */}
          <div style={{
            padding: 'var(--space-3)', borderRadius: 'var(--radius-md)',
            background: timeStudySamples.length >= 10 ? 'var(--color-success-50)' : 'var(--color-primary-50)',
            border: `1px solid ${timeStudySamples.length >= 10 ? 'var(--color-success-300)' : 'var(--color-primary-300)'}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 'var(--text-sm)' }}>
              <span>Sample tercatat: {timeStudySamples.length} / 10 minimum</span>
              <span>{timeStudySamples.length >= 10 ? 'Siap hitung!' : `Perlu ${10 - timeStudySamples.length} sample lagi`}</span>
            </div>
            <div style={{ marginTop: '6px', height: '6px', borderRadius: '3px', background: 'var(--bg-subtle)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: '3px', transition: 'width 0.3s ease',
                width: `${Math.min(100, (timeStudySamples.length / 10) * 100)}%`,
                background: timeStudySamples.length >= 10 ? 'var(--color-success-500)' : 'var(--color-primary-500)',
              }} />
            </div>
          </div>

          {/* Samples Table */}
          {timeStudySamples.length > 0 && (
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              <table style={{ width: '100%', fontSize: 'var(--text-xs)', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-default)' }}>
                    <th style={{ padding: '6px 8px', textAlign: 'left' }}>#</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left' }}>Durasi</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left' }}>Waktu</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {timeStudySamples.map((s) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '6px 8px', fontWeight: 700 }}>#{s.sample_number}</td>
                      <td style={{ padding: '6px 8px', fontFamily: 'monospace', fontWeight: 600 }}>
                        {formatDuration(Number(s.duration_seconds || 0))}
                      </td>
                      <td style={{ padding: '6px 8px', color: 'var(--text-tertiary)' }}>
                        {s.started_at ? format(new Date(s.started_at), 'HH:mm:ss') : '-'}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteSample(s.id)} aria-label={`Hapus sample #${s.sample_number}`}>
                          <Trash2 className="w-3.5 h-3.5 text-[var(--color-danger-500)]" aria-hidden="true" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Rating & Allowance Sliders */}
          {timeStudySamples.length >= 10 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', padding: 'var(--space-4)', background: 'var(--color-primary-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-primary-200)' }}>
              <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--color-primary-800)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <BarChart3 className="w-4 h-4 text-currentColor" aria-hidden="true" /> Perhitungan Waktu Baku
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                <div>
                  <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Rating Faktor: <strong style={{ color: 'var(--color-primary-700)' }}>{ratingFactor.toFixed(2)}</strong>
                  </label>
                  <input
                    type="range" min="0.50" max="1.50" step="0.05"
                    value={ratingFactor}
                    onChange={(e) => setRatingFactor(Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: 'var(--text-tertiary)' }}>
                    <span>Lambat (0.50)</span><span>Normal (1.00)</span><span>Cepat (1.50)</span>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Kelonggaran: <strong style={{ color: 'var(--color-primary-700)' }}>{(allowanceFactor * 100).toFixed(0)}%</strong>
                  </label>
                  <input
                    type="range" min="0" max="0.30" step="0.01"
                    value={allowanceFactor}
                    onChange={(e) => setAllowanceFactor(Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: 'var(--text-tertiary)' }}>
                    <span>0%</span><span>15%</span><span>30%</span>
                  </div>
                </div>
              </div>

              {/* Results Preview */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
                <div style={{ textAlign: 'center', padding: 'var(--space-3)', background: 'white', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBottom: '2px' }}>Waktu Siklus (Rata-rata)</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'monospace' }}>{formatDuration(cycleTimeAvg)}</div>
                </div>
                <div style={{ textAlign: 'center', padding: 'var(--space-3)', background: 'white', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBottom: '2px' }}>Waktu Normal</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--color-primary-700)' }}>{formatDuration(normalTime)}</div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)' }}>Siklus x {ratingFactor.toFixed(2)}</div>
                </div>
                <div style={{ textAlign: 'center', padding: 'var(--space-3)', background: 'white', borderRadius: 'var(--radius-md)', border: '2px solid var(--color-success-300)' }}>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBottom: '2px' }}>Waktu Baku</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--color-success-700)' }}>{formatDuration(standardTime)}</div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)' }}>Normal x (1 + {(allowanceFactor * 100).toFixed(0)}%)</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        description={confirmDialog.description}
        variant={confirmDialog.variant}
      />
    </div>
  );
}
