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
  startFryingBatchTimer,
  getAllFryingBatches,
  createPackingEntry,
  markLongsongPacked,
  getAllPackingEntries,
  getUnpackedLongsongReminder,
  getFryingPackingMetrics,
  type CreateProductionOrderInput,
  type MaterialConsumptionItem,
  type SpkSuggestion,
  type CreateFryingBatchInput,
  type CompleteFryingBatchInput,
  type CreatePackingEntryInput,
} from '@/actions/production';
import { getPpicData } from '@/actions/ppic';
import type { DbProductionOrder, DbProduct, DbRawMaterial, DbFryingBatch, DbPackingEntry } from '@/types/database';
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

  // ── Batch Stopwatch state (Per-batch inline timer: Running, Pause, Resume, Reset) ──
  interface BatchTimerState {
    status: 'RUNNING' | 'PAUSED' | 'IDLE';
    accumulatedSeconds: number;
    lastStartTime: number | null;
  }
  const [batchTimers, setBatchTimers] = useState<Record<string, BatchTimerState>>({});
  const [nowTick, setNowTick] = useState(Date.now());

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

  // ── Longsong Belum Packing (Reactive: Produced - Packed) ──
  const unpackedLongsongCount = useMemo(() => {
    const totalProduced = fryingBatches
      .filter(b => b.finished_at && Number(b.longsong_count) > 0)
      .reduce((sum, b) => sum + (Number(b.longsong_count) || 0), 0);

    const totalPacked = packingEntries.filter(p => p.is_packed).length;
    const diff = totalProduced - totalPacked;

    if (fryingBatches.length > 0 || packingEntries.length > 0) {
      return Math.max(0, diff);
    }
    return fryingMetrics.unpackedLongsongCount || 0;
  }, [fryingBatches, packingEntries, fryingMetrics.unpackedLongsongCount]);

  // ── Multi-batch stopwatch tick effect ──
  useEffect(() => {
    const hasActive = fryingBatches.some(b => !b.finished_at);
    if (!hasActive) return;
    const interval = setInterval(() => {
      setNowTick(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [fryingBatches]);

  // ── Batch Timer Helpers ──
  const getBatchElapsedSeconds = useCallback((batch: DbFryingBatch): number => {
    if (batch.finished_at) {
      return (batch.frying_duration_minutes || 0) * 60;
    }
    const timerState = batchTimers[batch.id];
    if (timerState) {
      if (timerState.status === 'RUNNING' && timerState.lastStartTime) {
        return timerState.accumulatedSeconds + (nowTick - timerState.lastStartTime) / 1000;
      }
      if (timerState.status === 'PAUSED') {
        return timerState.accumulatedSeconds;
      }
      if (timerState.status === 'IDLE') {
        return 0;
      }
    }
    const startStr = batch.timer_started_at;
    if (startStr) {
      const startMs = new Date(startStr).getTime();
      return Math.max(0, (nowTick - startMs) / 1000);
    }
    return 0;
  }, [batchTimers, nowTick]);

  const getBatchTimerStatus = useCallback((batch: DbFryingBatch): 'DONE' | 'RUNNING' | 'PAUSED' | 'IDLE' => {
    if (batch.finished_at) return 'DONE';
    const timerState = batchTimers[batch.id];
    if (timerState) return timerState.status;
    if (batch.timer_started_at) return 'RUNNING';
    return 'IDLE';
  }, [batchTimers]);

  const handlePauseBatchTimer = (batch: DbFryingBatch) => {
    const currentElapsed = getBatchElapsedSeconds(batch);
    setBatchTimers(prev => ({
      ...prev,
      [batch.id]: {
        status: 'PAUSED',
        accumulatedSeconds: currentElapsed,
        lastStartTime: null,
      },
    }));
  };

  const handleResumeBatchTimer = (batch: DbFryingBatch) => {
    const currentElapsed = getBatchElapsedSeconds(batch);
    setBatchTimers(prev => ({
      ...prev,
      [batch.id]: {
        status: 'RUNNING',
        accumulatedSeconds: currentElapsed,
        lastStartTime: Date.now(),
      },
    }));
  };

  const handleResetBatchTimer = (batch: DbFryingBatch) => {
    setBatchTimers(prev => ({
      ...prev,
      [batch.id]: {
        status: 'IDLE',
        accumulatedSeconds: 0,
        lastStartTime: null,
      },
    }));
    toast.info(`Timer wajan #${batch.wajan_number} diulang ke 0 detik`);
  };

  const handleStartBatchTimer = async (batch: DbFryingBatch) => {
    setBatchTimers(prev => ({
      ...prev,
      [batch.id]: {
        status: 'RUNNING',
        accumulatedSeconds: 0,
        lastStartTime: Date.now(),
      },
    }));
    toast.info(`Timer wajan #${batch.wajan_number} dimulai`);
    await startFryingBatchTimer(batch.id);
  };

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
      notes: fryingForm.notes,
    });

    if (res.success) {
      toast.success(`Batch goreng wajan #${fryingForm.wajan_number} berhasil dibuat. Klik 'Mulai' pada tabel saat mulai menggoreng.`);
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

    const durationSeconds = getBatchElapsedSeconds(selectedFryingBatch);
    const durationMinutes = Math.round((durationSeconds / 60) * 100) / 100;

    const res = await completeFryingBatch({
      frying_batch_id: selectedFryingBatch.id,
      output_weight_gram: Number(completeFryingForm.output_weight_gram),
      longsong_count: Number(completeFryingForm.longsong_count),
      kremesan_weight_gram: Number(completeFryingForm.kremesan_weight_gram) || 0,
      frying_duration_minutes: durationMinutes > 0 ? durationMinutes : undefined,
    });

    if (res.success) {
      toast.success(`Hasil goreng wajan #${selectedFryingBatch.wajan_number} berhasil dicatat (${formatDuration(durationSeconds)})`);
      setBatchTimers(prev => {
        const next = { ...prev };
        delete next[selectedFryingBatch.id];
        return next;
      });
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
      is_packed: true,
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
      id: 'timer',
      header: 'Timer / Durasi',
      cell: ({ row }) => {
        const batch = row.original;
        const isDone = !!batch.finished_at;
        const elapsed = getBatchElapsedSeconds(batch);
        const status = getBatchTimerStatus(batch);

        if (isDone) {
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Timer className="w-4 h-4 text-[var(--color-success-600)]" aria-hidden="true" />
              <strong style={{ fontFamily: 'monospace', fontSize: 'var(--text-sm)', color: 'var(--color-success-800)' }}>
                {batch.frying_duration_minutes ? `${batch.frying_duration_minutes} mnt` : formatDuration(elapsed)}
              </strong>
            </div>
          );
        }

        if (status === 'IDLE') {
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 8px',
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                background: 'var(--bg-subtle)',
                color: 'var(--text-tertiary)',
              }}>
                <Timer className="w-3.5 h-3.5 text-[var(--text-tertiary)]" aria-hidden="true" />
                <span style={{ fontFamily: 'monospace' }}>0m 00s</span>
              </div>
              <button
                type="button"
                onClick={() => handleStartBatchTimer(batch)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 8px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-success-600)',
                  background: 'var(--color-success-600)',
                  color: 'white',
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                }}
                title="Mulai waktu goreng untuk wajan ini"
              >
                <Play className="w-3.5 h-3.5 text-currentColor" aria-hidden="true" />
                Mulai
              </button>
            </div>
          );
        }

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--text-xs)',
                fontWeight: 700,
                background: status === 'RUNNING' ? 'var(--color-danger-100)' : 'var(--color-warning-100)',
                color: status === 'RUNNING' ? 'var(--color-danger-700)' : 'var(--color-warning-800)',
              }}>
                {status === 'RUNNING' && <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-danger-600)' }} />}
                {status === 'PAUSED' && <Pause className="w-3 h-3 text-[var(--color-warning-700)]" aria-hidden="true" />}
                <span style={{ fontFamily: 'monospace', fontSize: 'var(--text-sm)' }}>
                  {formatDuration(Math.floor(elapsed))}
                </span>
              </div>
            </div>

            {/* Inline controls: Jeda, Lanjut, Ulang */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {status === 'RUNNING' && (
                <>
                  <button
                    type="button"
                    onClick={() => handlePauseBatchTimer(batch)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      padding: '2px 6px',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-warning-400)',
                      background: 'var(--color-warning-50)',
                      color: 'var(--color-warning-800)',
                      cursor: 'pointer',
                    }}
                    title="Jeda waktu goreng"
                  >
                    <Pause className="w-3 h-3 text-currentColor" aria-hidden="true" />
                    Jeda
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResetBatchTimer(batch)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      padding: '2px 6px',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-default)',
                      background: 'white',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                    }}
                    title="Ulang timer dari 0 detik"
                    aria-label={`Ulang timer wajan #${batch.wajan_number}`}
                  >
                    <RotateCcw className="w-3 h-3 text-currentColor" aria-hidden="true" />
                    Ulang
                  </button>
                </>
              )}

              {status === 'PAUSED' && (
                <>
                  <button
                    type="button"
                    onClick={() => handleResumeBatchTimer(batch)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      padding: '2px 6px',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-primary-500)',
                      background: 'var(--color-primary-50)',
                      color: 'var(--color-primary-700)',
                      cursor: 'pointer',
                    }}
                    title="Lanjutkan timer goreng"
                  >
                    <Play className="w-3 h-3 text-currentColor" aria-hidden="true" />
                    Lanjut
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResetBatchTimer(batch)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      padding: '2px 6px',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-default)',
                      background: 'white',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                    }}
                    title="Ulang timer dari 0 detik"
                    aria-label={`Ulang timer wajan #${batch.wajan_number}`}
                  >
                    <RotateCcw className="w-3 h-3 text-currentColor" aria-hidden="true" />
                    Ulang
                  </button>
                </>
              )}
            </div>
          </div>
        );
      },
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
        const batch = row.original;
        const isDone = !!batch.finished_at;
        const timerStatus = getBatchTimerStatus(batch);
        if (isDone) {
          return <StatusBadge status="completed" label="Selesai" />;
        }
        if (timerStatus === 'IDLE') {
          return <StatusBadge status="pending" label="Siap Goreng" />;
        }
        if (timerStatus === 'PAUSED') {
          return <StatusBadge status="warning" label="Dijeda" />;
        }
        return <StatusBadge status="in_progress" label="Sedang Goreng" />;
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
  ], [getBatchElapsedSeconds, getBatchTimerStatus, nowTick]);

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
                <AlertTriangle className={`w-5 h-5 ${unpackedLongsongCount > 0 ? 'text-[var(--color-danger-600)]' : 'text-[var(--color-success-600)]'}`} aria-hidden="true" />
                <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Longsong Belum Packing</span>
              </div>
              <div style={{ fontSize: '1.875rem', fontWeight: 700, color: unpackedLongsongCount > 0 ? 'var(--color-danger-700)' : 'var(--color-success-700)' }}>
                {unpackedLongsongCount}
              </div>
              {unpackedLongsongCount > 0 && (
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
                notes: '',
              });
              setCreateFryingOpen(true);
            }}>
              Buat Batch Goreng Baru
            </Button>
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
          {unpackedLongsongCount > 0 && (
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
                  {unpackedLongsongCount} longsong belum dipacking!
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
                {unpackedLongsongCount}
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

          <FormField label="Suhu Minyak (°C)" required>
            <Input
              type="number" min="100" max="250" step="5"
              value={fryingForm.oil_temp_celsius}
              onChange={(e) => setFryingForm({ ...fryingForm, oil_temp_celsius: e.target.value })}
              placeholder="170"
            />
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: '2px', display: 'block' }}>
              Rekomendasi suhu: 160°C - 180°C. Klik 'Mulai' pada baris tabel saat mulai menggoreng.
            </span>
          </FormField>

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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <div style={{ padding: 'var(--space-3)', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Berat Input Wajan</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                  {selectedFryingBatch.batch_weight_gram.toLocaleString('id-ID')}g
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginLeft: '4px' }}>
                    ({(selectedFryingBatch.batch_weight_gram / 1000).toFixed(2)} kg)
                  </span>
                </div>
              </div>

              <div style={{ padding: 'var(--space-3)', background: 'var(--color-primary-50)', border: '1px solid var(--color-primary-200)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary-800)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                  <Timer className="w-3.5 h-3.5 text-[var(--color-primary-600)]" aria-hidden="true" /> Durasi Goreng (Stopwatch)
                </span>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--color-primary-900)' }}>
                  {formatDuration(Math.floor(getBatchElapsedSeconds(selectedFryingBatch)))}
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginLeft: '4px', fontFamily: 'sans-serif', fontWeight: 500 }}>
                    ({(getBatchElapsedSeconds(selectedFryingBatch) / 60).toFixed(1)} menit)
                  </span>
                </div>
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
