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
  ShieldCheck,
  Scale,
  Flame,
  PackageCheck,
  ClipboardCheck,
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
  Pencil,
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
  submitBatchToQc,
  type CreateProductionOrderInput,
  type MaterialConsumptionItem,
  type SpkSuggestion,
  type CreateFryingBatchInput,
  type CompleteFryingBatchInput,
  type CreatePackingEntryInput,
} from '@/actions/production';
import { getPpicData } from '@/actions/ppic';
import type { DbProductionOrder, DbProduct, DbRawMaterial, DbFryingBatch, DbPackingEntry } from '@/types/database';
import { FLAVOR_VARIANTS, PACKAGING_TYPES, PACKAGING_WEIGHTS } from '@/types/database';

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

// Calculate difference in minutes between HH:mm and HH:mm (supports overnight shift)
function calculateTimeDifferenceMinutes(startTime: string, endTime: string): number {
  if (!startTime || !endTime) return 0;
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return 0;
  let startMinutes = startH * 60 + startM;
  let endMinutes = endH * 60 + endM;
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60; // shift lewat tengah malam
  }
  return endMinutes - startMinutes;
}

// Get current local time as HH:mm string
function getCurrentTimeString(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

// Convert HH:mm to ISO string for today or base date
function timeStringToIso(timeStr: string, baseDate?: Date | string | null): string {
  if (!timeStr) return '';
  const date = baseDate ? new Date(baseDate) : new Date();
  const [h, m] = timeStr.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return '';
  date.setHours(h, m, 0, 0);
  return date.toISOString();
}

// Extract HH:mm from an ISO string
function isoToTimeString(isoStr?: string | null): string {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return '';
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

// Add minutes to HH:mm string
function addMinutesToTimeString(timeStr: string, minutesToAdd: number): string {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return '';
  const total = (h * 60 + m + minutesToAdd + 24 * 60) % (24 * 60);
  const newH = Math.floor(total / 60);
  const newM = total % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
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
  // ── Frying modal & form states (Dipisahkan: Regular vs HACCP) ──
  const [createRegularFryingOpen, setCreateRegularFryingOpen] = useState(false);
  const [createHaccpFryingOpen, setCreateHaccpFryingOpen] = useState(false);
  const [completeFryingOpen, setCompleteFryingOpen] = useState(false);
  const [selectedFryingBatch, setSelectedFryingBatch] = useState<DbFryingBatch | null>(null);

  // 1. Regular Frying Form (Standar Persiapan Wajan & Real-time Stopwatch)
  const [regularFryingForm, setRegularFryingForm] = useState({
    production_order_id: '',
    wajan_number: '1',
    batch_weight_gram: '800',
    oil_temp_celsius: '170',
    notes: '',
  });

  // 2. HACCP Time Study Form (Catatan Jam Dinding & Wajib Hasil Goreng)
  const [haccpFryingForm, setHaccpFryingForm] = useState({
    production_order_id: '',
    wajan_number: '1',
    batch_weight_gram: '800',
    oil_temp_celsius: '170',
    start_time: '',
    end_time: '',
    output_weight_gram: '',
    longsong_count: '',
    kremesan_weight_gram: '',
    notes: '',
  });

  // 3. Complete / Edit Frying Form (Untuk Input/Edit Hasil di Tabel)
  const [completeFryingForm, setCompleteFryingForm] = useState({
    output_weight_gram: '',
    longsong_count: '',
    kremesan_weight_gram: '',
    notes: '',
  });

  const isRegularFryingValid = useMemo(() => {
    return (
      !!regularFryingForm.production_order_id &&
      !!regularFryingForm.oil_temp_celsius &&
      !!regularFryingForm.batch_weight_gram &&
      Number(regularFryingForm.batch_weight_gram) > 0
    );
  }, [regularFryingForm]);

  const isHaccpFryingValid = useMemo(() => {
    return (
      !!haccpFryingForm.production_order_id &&
      !!haccpFryingForm.oil_temp_celsius &&
      !!haccpFryingForm.start_time &&
      !!haccpFryingForm.end_time &&
      !!haccpFryingForm.output_weight_gram &&
      Number(haccpFryingForm.output_weight_gram) > 0 &&
      !!haccpFryingForm.longsong_count &&
      Number(haccpFryingForm.longsong_count) > 0 &&
      haccpFryingForm.kremesan_weight_gram !== '' &&
      !isNaN(Number(haccpFryingForm.kremesan_weight_gram)) &&
      Number(haccpFryingForm.kremesan_weight_gram) >= 0
    );
  }, [haccpFryingForm]);

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
    packaging_type: 'Standing Pouch',
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

  // ── QC Submission state ──
  const [submitQcOpen, setSubmitQcOpen] = useState(false);
  const [selectedSpkForQc, setSelectedSpkForQc] = useState<any>(null);
  const [submitQcNotes, setSubmitQcNotes] = useState('');

  const handleOpenSubmitQc = (spkData: any) => {
    setSelectedSpkForQc(spkData);
    setSubmitQcNotes('');
    setSubmitQcOpen(true);
  };

  const handleConfirmSubmitQc = async () => {
    if (!selectedSpkForQc) return;
    const orderId = selectedSpkForQc.order?.id || selectedSpkForQc.id;
    const res = await submitBatchToQc(orderId, submitQcNotes);
    if (res.success) {
      toast.success(`SPK ${selectedSpkForQc.order?.batch_number || 'Produksi'} berhasil diajukan ke antrean QC!`);
      setSubmitQcOpen(false);
      setSelectedSpkForQc(null);
      setSubmitQcNotes('');
      loadData();
    } else {
      toast.error(res.error || 'Gagal mengajukan SPK ke QC');
    }
  };

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

  // ── SPK yang Sudah Melewati Tahap Produksi Goreng Jamur (Terintegrasi ke Packing) ──
  const friedOrdersData = useMemo(() => {
    const fryingByOrder: Record<string, {
      batches: DbFryingBatch[];
      totalLongsongProduced: number;
      totalOutputGram: number;
    }> = {};

    fryingBatches.forEach(b => {
      const isFried = (b.finished_at != null || (b.output_weight_gram != null && b.output_weight_gram > 0)) && Number(b.longsong_count) > 0;
      if (isFried) {
        if (!fryingByOrder[b.production_order_id]) {
          fryingByOrder[b.production_order_id] = {
            batches: [],
            totalLongsongProduced: 0,
            totalOutputGram: 0,
          };
        }
        fryingByOrder[b.production_order_id].batches.push(b);
        fryingByOrder[b.production_order_id].totalLongsongProduced += (Number(b.longsong_count) || 0);
        fryingByOrder[b.production_order_id].totalOutputGram += (Number(b.output_weight_gram) || 0);
      }
    });

    const packingByOrder: Record<string, number> = {};
    packingEntries.forEach(p => {
      if (p.is_packed) {
        packingByOrder[p.production_order_id] = (packingByOrder[p.production_order_id] || 0) + 1;
      }
    });

    const result: {
      order: DbProductionOrder;
      batches: DbFryingBatch[];
      totalLongsongProduced: number;
      totalOutputGram: number;
      packedCount: number;
      unpackedCount: number;
      totalPackagedPcs: number;
    }[] = [];

    orders.forEach(o => {
      if (fryingByOrder[o.id]) {
        const frying = fryingByOrder[o.id];
        const packedCount = packingByOrder[o.id] || 0;
        const unpackedCount = Math.max(0, frying.totalLongsongProduced - packedCount);
        const packagedPcs = packingEntries
          .filter(p => p.production_order_id === o.id && p.is_packed)
          .reduce((sum, p) => sum + (Number(p.packaged_toples_count) || 0), 0);
        result.push({
          order: o,
          batches: frying.batches.sort((a, b) => a.wajan_number - b.wajan_number),
          totalLongsongProduced: frying.totalLongsongProduced,
          totalOutputGram: frying.totalOutputGram,
          packedCount,
          unpackedCount,
          totalPackagedPcs: packagedPcs,
        });
      }
    });

    // Fallback: Jika ada batch goreng dengan production_order_id yang belum ada di list orders
    Object.keys(fryingByOrder).forEach(orderId => {
      if (!orders.some(o => o.id === orderId)) {
        const frying = fryingByOrder[orderId];
        const packedCount = packingByOrder[orderId] || 0;
        const unpackedCount = Math.max(0, frying.totalLongsongProduced - packedCount);
        const packagedPcs = packingEntries
          .filter(p => p.production_order_id === orderId && p.is_packed)
          .reduce((sum, p) => sum + (Number(p.packaged_toples_count) || 0), 0);
        result.push({
          order: {
            id: orderId,
            batch_number: 'SPK-' + orderId.slice(0, 8),
            product_variant: 'Jamur Crispy',
            status: 'IN_PROGRESS',
            planned_quantity: 1,
            actual_quantity: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as unknown as DbProductionOrder,
          batches: frying.batches.sort((a, b) => a.wajan_number - b.wajan_number),
          totalLongsongProduced: frying.totalLongsongProduced,
          totalOutputGram: frying.totalOutputGram,
          packedCount,
          unpackedCount,
          totalPackagedPcs: packagedPcs,
        });
      }
    });

    return result.sort((a, b) => b.unpackedCount - a.unpackedCount);
  }, [orders, fryingBatches, packingEntries]);

  const selectedFriedOrder = useMemo(() => {
    return friedOrdersData.find(d => d.order.id === packingForm.production_order_id) || null;
  }, [friedOrdersData, packingForm.production_order_id]);

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

  // Kalkulasi otomatis waktu mulai, waktu selesai, dan durasi memasak
  const getAutoBatchTiming = useCallback((batch: DbFryingBatch | null) => {
    if (!batch) {
      const now = new Date();
      return {
        durationMinutes: 15,
        startTime: getCurrentTimeString(),
        endTime: getCurrentTimeString(),
        startedAtIso: now.toISOString(),
        finishedAtIso: now.toISOString(),
      };
    }

    // Mode Edit: Batch sudah selesai sebelumnya
    if (batch.finished_at) {
      const duration = batch.frying_duration_minutes || 15;
      const endIso = batch.finished_at;
      const startIso = batch.started_at || batch.timer_started_at || new Date(new Date(endIso).getTime() - duration * 60000).toISOString();
      const startTime = isoToTimeString(startIso) || addMinutesToTimeString(isoToTimeString(endIso), -duration);
      const endTime = isoToTimeString(endIso);
      return {
        durationMinutes: duration,
        startTime,
        endTime,
        startedAtIso: startIso,
        finishedAtIso: endIso,
      };
    }

    // Mode Selesai Sekarang: Batch baru selesai digoreng
    const now = new Date();
    const endIso = now.toISOString();
    const endTime = getCurrentTimeString();
    const elapsedSeconds = getBatchElapsedSeconds(batch);

    if (batch.started_at) {
      const startIso = batch.started_at;
      const startTime = isoToTimeString(startIso);
      const diffMinutes = Math.max(1, Math.round((now.getTime() - new Date(startIso).getTime()) / 60000));
      return {
        durationMinutes: diffMinutes,
        startTime,
        endTime,
        startedAtIso: startIso,
        finishedAtIso: endIso,
      };
    }

    if (batch.timer_started_at) {
      const startIso = batch.timer_started_at;
      const startTime = isoToTimeString(startIso);
      const diffMinutes = Math.max(1, Math.round((now.getTime() - new Date(startIso).getTime()) / 60000));
      return {
        durationMinutes: diffMinutes,
        startTime,
        endTime,
        startedAtIso: startIso,
        finishedAtIso: endIso,
      };
    }

    if (elapsedSeconds > 0) {
      const durationMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
      const startMs = now.getTime() - elapsedSeconds * 1000;
      const startIso = new Date(startMs).toISOString();
      const startTime = isoToTimeString(startIso);
      return {
        durationMinutes,
        startTime,
        endTime,
        startedAtIso: startIso,
        finishedAtIso: endIso,
      };
    }

    // Jika operator tidak menekan Mulai (IDLE 0s):
    const diffFromCreation = Math.round((now.getTime() - new Date(batch.created_at).getTime()) / 60000);
    if (diffFromCreation >= 1 && diffFromCreation <= 120) {
      const startIso = batch.created_at;
      const startTime = isoToTimeString(startIso);
      return {
        durationMinutes: diffFromCreation,
        startTime,
        endTime,
        startedAtIso: startIso,
        finishedAtIso: endIso,
      };
    }

    // Default estimasi waktu penggorengan standar wajan (15 menit)
    const durationMinutes = 15;
    const startMs = now.getTime() - 15 * 60000;
    const startIso = new Date(startMs).toISOString();
    const startTime = isoToTimeString(startIso);
    return {
      durationMinutes,
      startTime,
      endTime,
      startedAtIso: startIso,
      finishedAtIso: endIso,
    };
  }, [getBatchElapsedSeconds]);

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

  // Handler: Buka & Buat Batch Goreng Baru (Biasa / Real-time Wajan)
  const handleOpenCreateRegularFrying = () => {
    setRegularFryingForm({
      production_order_id: orders[0]?.id || '',
      wajan_number: String((fryingBatches.length > 0 ? Math.max(...fryingBatches.map(b => b.wajan_number)) : 0) + 1),
      batch_weight_gram: '800',
      oil_temp_celsius: '170',
      notes: '',
    });
    setCreateRegularFryingOpen(true);
  };

  const handleCreateRegularFrying = async () => {
    if (!regularFryingForm.production_order_id) {
      toast.error('Pilih SPK Produksi terlebih dahulu');
      return;
    }
    if (!regularFryingForm.oil_temp_celsius) {
      toast.error('Suhu minyak wajib diisi');
      return;
    }
    if (!regularFryingForm.batch_weight_gram || Number(regularFryingForm.batch_weight_gram) <= 0) {
      toast.error('Berat input (gram) wajib diisi');
      return;
    }

    const res = await createFryingBatch({
      production_order_id: regularFryingForm.production_order_id,
      wajan_number: Number(regularFryingForm.wajan_number),
      batch_weight_gram: Number(regularFryingForm.batch_weight_gram) || 800,
      oil_temp_celsius: Number(regularFryingForm.oil_temp_celsius) || 170,
      notes: regularFryingForm.notes,
      started_at: null,
      finished_at: null,
      frying_duration_minutes: null,
      output_weight_gram: null,
      longsong_count: 0,
      kremesan_weight_gram: 0,
    });

    if (res.success) {
      toast.success(`Batch wajan #${regularFryingForm.wajan_number} berhasil disiapkan (Siap Goreng)`);
      setCreateRegularFryingOpen(false);
      loadData();
    } else {
      toast.error(res.error || 'Gagal membuat batch goreng');
    }
  };

  // Handler: Buka & Buat Batch HACCP Time Study (Catatan Jam Dinding + Wajib Hasil)
  const handleOpenCreateHaccpFrying = () => {
    const defaultStart = getCurrentTimeString();
    const defaultEnd = addMinutesToTimeString(defaultStart, 15);
    setHaccpFryingForm({
      production_order_id: orders[0]?.id || '',
      wajan_number: String((fryingBatches.length > 0 ? Math.max(...fryingBatches.map(b => b.wajan_number)) : 0) + 1),
      batch_weight_gram: '800',
      oil_temp_celsius: '170',
      start_time: defaultStart,
      end_time: defaultEnd,
      output_weight_gram: '',
      longsong_count: '',
      kremesan_weight_gram: '',
      notes: '',
    });
    setCreateHaccpFryingOpen(true);
  };

  const handleCreateHaccpFrying = async () => {
    if (!haccpFryingForm.production_order_id) {
      toast.error('Pilih SPK Produksi terlebih dahulu');
      return;
    }
    if (!haccpFryingForm.oil_temp_celsius) {
      toast.error('Suhu minyak wajib diisi');
      return;
    }
    if (!haccpFryingForm.start_time) {
      toast.error('Waktu mulai masak wajib diisi sesuai catatan jam HACCP');
      return;
    }
    if (!haccpFryingForm.end_time) {
      toast.error('Waktu selesai masak wajib diisi sesuai catatan jam HACCP');
      return;
    }
    if (!haccpFryingForm.output_weight_gram || Number(haccpFryingForm.output_weight_gram) <= 0) {
      toast.error('Berat output jamur (gram) wajib diisi');
      return;
    }
    if (!haccpFryingForm.longsong_count || Number(haccpFryingForm.longsong_count) <= 0) {
      toast.error('Jumlah longsong wajib diisi (minimal 1 longsong)');
      return;
    }
    if (haccpFryingForm.kremesan_weight_gram === '' || isNaN(Number(haccpFryingForm.kremesan_weight_gram)) || Number(haccpFryingForm.kremesan_weight_gram) < 0) {
      toast.error('Berat kremesan (gram) wajib diisi (isi 0 jika tidak ada)');
      return;
    }

    const startedAtIso = timeStringToIso(haccpFryingForm.start_time);
    const finishedAtIso = timeStringToIso(haccpFryingForm.end_time);
    const durationMinutes = calculateTimeDifferenceMinutes(haccpFryingForm.start_time, haccpFryingForm.end_time);

    const res = await createFryingBatch({
      production_order_id: haccpFryingForm.production_order_id,
      wajan_number: Number(haccpFryingForm.wajan_number),
      batch_weight_gram: Number(haccpFryingForm.batch_weight_gram) || 800,
      oil_temp_celsius: Number(haccpFryingForm.oil_temp_celsius) || 170,
      notes: haccpFryingForm.notes,
      started_at: startedAtIso,
      finished_at: finishedAtIso,
      frying_duration_minutes: durationMinutes > 0 ? durationMinutes : 15,
      output_weight_gram: Number(haccpFryingForm.output_weight_gram),
      longsong_count: Number(haccpFryingForm.longsong_count),
      kremesan_weight_gram: Number(haccpFryingForm.kremesan_weight_gram) || 0,
    });

    if (res.success) {
      toast.success(
        `Batch HACCP wajan #${haccpFryingForm.wajan_number} berhasil dicatat (${haccpFryingForm.output_weight_gram}g, ${haccpFryingForm.longsong_count} longsong, ${durationMinutes} mnt)`
      );
      setCreateHaccpFryingOpen(false);
      loadData();
    } else {
      toast.error(res.error || 'Gagal membuat batch HACCP');
    }
  };

  const handleOpenEditFrying = (batch: DbFryingBatch) => {
    setSelectedFryingBatch(batch);
    setCompleteFryingForm({
      output_weight_gram: batch.output_weight_gram ? String(batch.output_weight_gram) : '',
      longsong_count: batch.longsong_count ? String(batch.longsong_count) : '',
      kremesan_weight_gram: batch.kremesan_weight_gram != null ? String(batch.kremesan_weight_gram) : '0',
      notes: batch.notes || '',
    });
    setCompleteFryingOpen(true);
  };

  const handleCompleteFrying = async () => {
    if (!selectedFryingBatch) return;
    if (!completeFryingForm.output_weight_gram || Number(completeFryingForm.output_weight_gram) <= 0) {
      toast.error('Berat output jamur matang (gram) wajib diisi');
      return;
    }
    if (!completeFryingForm.longsong_count || Number(completeFryingForm.longsong_count) <= 0) {
      toast.error('Jumlah longsong yang dihasilkan wajib diisi (minimal 1)');
      return;
    }

    // Kalkulasi otomatis waktu mulai, selesai, dan durasi dari sistem
    const timing = getAutoBatchTiming(selectedFryingBatch);

    const res = await completeFryingBatch({
      frying_batch_id: selectedFryingBatch.id,
      output_weight_gram: Number(completeFryingForm.output_weight_gram),
      longsong_count: Number(completeFryingForm.longsong_count),
      kremesan_weight_gram: Number(completeFryingForm.kremesan_weight_gram) || 0,
      frying_duration_minutes: timing.durationMinutes,
      started_at: timing.startedAtIso,
      finished_at: timing.finishedAtIso,
      notes: completeFryingForm.notes,
    });

    if (res.success) {
      const isEditing = !!selectedFryingBatch.finished_at;
      toast.success(
        isEditing
          ? `Hasil wajan #${selectedFryingBatch.wajan_number} berhasil diperbarui (${completeFryingForm.output_weight_gram}g, ${completeFryingForm.longsong_count} longsong)`
          : `Hasil goreng wajan #${selectedFryingBatch.wajan_number} berhasil dicatat (${timing.durationMinutes} mnt: ${timing.startTime} - ${timing.endTime})`
      );
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

  const handleOpenCreatePacking = () => {
    if (friedOrdersData.length === 0) {
      toast.warning('Belum ada SPK yang menyelesaikan tahap produksi goreng jamur. Selesaikan penggorengan wajan di Tab 1 terlebih dahulu.');
      return;
    }

    // Prioritaskan SPK yang masih memiliki sisa longsong belum dipacking
    const defaultTarget = friedOrdersData.find(d => d.unpackedCount > 0) || friedOrdersData[0];
    const spkId = defaultTarget.order.id;
    const nextLongsong = defaultTarget.packedCount + 1;
    const avgWeight = defaultTarget.totalLongsongProduced > 0
      ? Math.round(defaultTarget.totalOutputGram / defaultTarget.totalLongsongProduced)
      : '';

    setPackingForm({
      production_order_id: spkId,
      frying_batch_id: '',
      flavor_variant: 'Original',
      longsong_number: String(nextLongsong),
      longsong_weight_gram: avgWeight ? String(avgWeight) : '',
      packaged_toples_count: '',
      packaging_type: 'Standing Pouch',
      packaging_weight_gram: '100g',
      seasoning_used_gram: '25',
      notes: '',
    });
    setCreatePackingOpen(true);
  };

  const handleCreatePacking = async () => {
    if (!packingForm.production_order_id) {
      toast.error('Pilih SPK Produksi yang sudah melewati tahap goreng jamur');
      return;
    }
    if (!packingForm.packaged_toples_count || Number(packingForm.packaged_toples_count) <= 0) {
      toast.error('Jumlah kemasan yang dihasilkan wajib diisi (minimal 1)');
      return;
    }

    const res = await createPackingEntry({
      production_order_id: packingForm.production_order_id,
      frying_batch_id: packingForm.frying_batch_id || undefined,
      flavor_variant: packingForm.flavor_variant,
      longsong_number: Number(packingForm.longsong_number),
      longsong_weight_gram: Number(packingForm.longsong_weight_gram) || undefined,
      packaged_toples_count: Number(packingForm.packaged_toples_count),
      packaging_type: packingForm.packaging_type,
      packaging_weight_gram: packingForm.packaging_weight_gram,
      seasoning_used_gram: Number(packingForm.seasoning_used_gram) || 0,
      notes: packingForm.notes,
      is_packed: true,
    });

    if (res.success) {
      toast.success(`Packing #${packingForm.longsong_number} (${packingForm.flavor_variant}) berhasil dicatat & masuk ke stok siap jual Sales & Order!`);
      setCreatePackingOpen(false);
      loadData();
    } else {
      toast.error(res.error || 'Gagal membuat entri packing');
    }
  };

  const handleMarkPacked = async (entryId: string) => {
    const res = await markLongsongPacked(entryId);
    if (res.success) {
      toast.success('Longsong ditandai sudah dipacking & stok produk jadi tersinkron ke Sales & Order!');
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
          const startTimeStr = isoToTimeString(batch.started_at);
          const endTimeStr = isoToTimeString(batch.finished_at);
          const durationMnt = batch.frying_duration_minutes != null ? `${batch.frying_duration_minutes} mnt` : formatDuration(elapsed);

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Timer className="w-4 h-4 text-[var(--color-success-600)]" aria-hidden="true" />
                <strong style={{ fontFamily: 'monospace', fontSize: 'var(--text-sm)', color: 'var(--color-success-800)' }}>
                  {durationMnt}
                </strong>
              </div>
              {startTimeStr && endTimeStr && (
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock className="w-3 h-3 text-[var(--text-tertiary)]" aria-hidden="true" />
                  <span>{startTimeStr} - {endTimeStr}</span>
                </div>
              )}
            </div>
          );
        }

        if (status === 'IDLE') {
          const startTimeStr = isoToTimeString(batch.started_at);
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
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
              {startTimeStr && (
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock className="w-3 h-3 text-[var(--text-tertiary)]" aria-hidden="true" />
                  <span>Mulai: {startTimeStr}</span>
                </div>
              )}
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
      header: 'Aksi',
      cell: ({ row }) => {
        const batch = row.original;
        const isDone = !!batch.finished_at;
        const hasOutput = !!batch.output_weight_gram;
        if (isDone || hasOutput) {
          return (
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Pencil className="w-3.5 h-3.5" aria-hidden="true" />}
              onClick={() => handleOpenEditFrying(batch)}
            >
              Edit Hasil
            </Button>
          );
        }
        return (
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Scale className="w-3.5 h-3.5" aria-hidden="true" />}
            onClick={() => handleOpenEditFrying(batch)}
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
      id: 'spk_wajan',
      header: 'SPK & Wajan Asal',
      cell: ({ row }) => {
        const order = orders.find(o => o.id === row.original.production_order_id) || row.original.production_order;
        const wajanNum = row.original.frying_batch?.wajan_number;
        return (
          <div>
            <strong style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary-800)' }}>
              {order?.batch_number || 'SPK Terintegrasi'}
            </strong>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              {wajanNum ? `Wajan #${wajanNum}` : 'Campuran SPK'}
            </div>
          </div>
        );
      },
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
      header: 'Hasil Kemasan',
      cell: ({ row }) => (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <strong style={{ fontSize: 'var(--text-sm)', color: 'var(--color-primary-800)' }}>
              {row.original.packaged_toples_count} pcs
            </strong>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
              @{row.original.packaging_weight_gram || '100g'}
            </span>
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary-600)', fontWeight: 600, marginTop: '2px' }}>
            {row.original.packaging_type || 'Standing Pouch'}
          </div>
          {row.original.is_packed && (
            <div style={{ fontSize: '10px', color: '#15803D', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px', marginTop: '3px' }}>
              <CheckCircle2 className="w-3 h-3 text-currentColor" aria-hidden="true" />
              Masuk Stok Sales & Order
            </div>
          )}
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
            <Button
              variant="primary"
              leftIcon={<Plus className="w-4 h-4" aria-hidden="true" />}
              onClick={handleOpenCreateRegularFrying}
            >
              Buat Batch Goreng Baru
            </Button>
            <Button
              variant="secondary"
              leftIcon={<ClipboardCheck className="w-4 h-4" aria-hidden="true" />}
              onClick={handleOpenCreateHaccpFrying}
            >
              Batch HACCP Time Study
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
              background: 'var(--color-danger-50)',
              border: '1px solid var(--color-danger-200)',
              marginBottom: 'var(--space-4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 'var(--space-3)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <AlertTriangle className="w-5 h-5 text-[var(--color-danger-600)] shrink-0" aria-hidden="true" />
                <div>
                  <strong style={{ color: 'var(--color-danger-900)' }}>
                    Ada {unpackedLongsongCount} Longsong Hasil Goreng Belum Dipacking Rasa!
                  </strong>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-danger-700)', marginTop: '2px' }}>
                    Segera lakukan pembumbuan dan packing toples agar jamur tetap renyah dan kualitas terjaga.
                  </div>
                </div>
              </div>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="w-3.5 h-3.5" aria-hidden="true" />}
                onClick={handleOpenCreatePacking}
              >
                Packing Sekarang
              </Button>
            </div>
          )}

          {/* Metric Cards Packing */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 'var(--space-4)',
            marginBottom: 'var(--space-6)',
          }}>
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                <Package className="w-5 h-5 text-[var(--color-primary-600)]" aria-hidden="true" />
                <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Total Kemasan Jadi</span>
              </div>
              <div style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--color-primary-700)' }}>
                {fryingMetrics.packedToplesToday.toLocaleString('id-ID')} <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-secondary)' }}>pcs</span>
              </div>
            </Card>

            <Card>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                <Box className="w-5 h-5 text-[var(--color-primary-600)]" aria-hidden="true" />
                <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Total Longsong Dipacking</span>
              </div>
              <div style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--color-primary-700)' }}>
                {packingEntries.filter(p => p.is_packed).length} <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-secondary)' }}>longsong</span>
              </div>
            </Card>

            <Card>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                <CookingPot className="w-5 h-5 text-[var(--color-warning-600)]" aria-hidden="true" />
                <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Bumbu Tabur Terpakai</span>
              </div>
              <div style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--color-warning-700)' }}>
                {(fryingMetrics.totalSeasoningGramToday / 1000).toFixed(2)} <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-secondary)' }}>kilogram</span>
              </div>
            </Card>

            <Card>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                <AlertTriangle className={`w-5 h-5 ${unpackedLongsongCount > 0 ? 'text-[var(--color-danger-600)]' : 'text-[var(--color-success-600)]'}`} aria-hidden="true" />
                <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Sisa Longsong Belum Packing</span>
              </div>
              <div style={{ fontSize: '1.875rem', fontWeight: 700, color: unpackedLongsongCount > 0 ? 'var(--color-danger-700)' : 'var(--color-success-700)' }}>
                {unpackedLongsongCount}
              </div>
            </Card>
          </div>

          {/* REWORK ALERT BANNER */}
          {friedOrdersData.some(d => d.order.status === 'REWORK') && (
            <div style={{
              padding: 'var(--space-3) var(--space-4)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-warning-50)',
              border: '1px solid var(--color-warning-300)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-2)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: 'var(--color-warning-900)', fontSize: 'var(--text-sm)' }}>
                <AlertTriangle className="w-5 h-5 text-[var(--color-warning-600)] shrink-0" aria-hidden="true" />
                Peringatan QC: Terdapat Batch Kemasan yang Memerlukan Perbaikan (REWORK)
              </div>
              {friedOrdersData.filter(d => d.order.status === 'REWORK').map(d => (
                <div key={d.order.id} style={{ fontSize: 'var(--text-xs)', color: 'var(--color-warning-900)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: '28px' }}>
                  <div>
                    <strong>SPK {d.order.batch_number}:</strong> {d.order.anomaly_reason || d.order.notes || 'Periksa kerapatan seal kemasan dan kerataan bumbu tabur'}
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />}
                    onClick={() => handleOpenSubmitQc(d)}
                  >
                    Ajukan Ulang ke QC
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Card: Status Alur Mutu & Pengajuan QC per SPK */}
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 'var(--text-base)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck className="w-5 h-5 text-[var(--color-primary-600)]" aria-hidden="true" />
                  Status Alur Mutu &amp; Pengajuan QC per SPK
                </h3>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  SPK kemasan yang telah selesai dipacking wajib diajukan ke Quality Control untuk sampling mutu sebelum rilis ke penjualan.
                </div>
              </div>

              <Button variant="primary" leftIcon={<Plus className="w-4 h-4" aria-hidden="true" />} onClick={handleOpenCreatePacking}>
                Input Packing Rasa
              </Button>
            </div>

            {friedOrdersData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-4)', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
                Belum ada SPK yang melewati tahap goreng jamur. Selesaikan penggorengan di Tab 1 terlebih dahulu.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border-default)', textAlign: 'left' }}>
                      <th style={{ padding: '8px 12px', fontWeight: 600 }}>No. SPK Batch</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600 }}>Varian Produk</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600 }}>Longsong Selesai</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600 }}>Hasil Kemasan (pcs)</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600 }}>Status Alur QC</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600, textAlign: 'right' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {friedOrdersData.map((item) => {
                      const s = item.order.status;
                      const hasPackaged = item.totalPackagedPcs > 0 || item.packedCount > 0;
                      return (
                        <tr key={item.order.id} style={{ borderBottom: '1px solid var(--border-default)' }}>
                          <td style={{ padding: '10px 12px' }}>
                            <strong style={{ fontFamily: 'monospace', color: 'var(--color-primary-800)' }}>
                              {item.order.batch_number}
                            </strong>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                              {item.order.created_at ? format(new Date(item.order.created_at), 'dd MMM yyyy') : '-'}
                            </div>
                          </td>
                          <td style={{ padding: '10px 12px', fontWeight: 500 }}>
                            {item.order.product_variant || 'Jamur Crispy'}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{ fontWeight: 600 }}>
                              {item.packedCount} / {item.totalLongsongProduced} longsong
                            </span>
                            {item.unpackedCount > 0 && (
                              <div style={{ fontSize: '11px', color: 'var(--color-danger-600)', fontWeight: 500 }}>
                                {item.unpackedCount} longsong belum packing
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <strong style={{ fontSize: 'var(--text-sm)', color: 'var(--color-primary-800)' }}>
                              {item.totalPackagedPcs} pcs
                            </strong>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            {s === 'RELEASED' ? (
                              <StatusBadge status="completed" label="RELEASED (Lolos QC)" />
                            ) : s === 'REWORK' ? (
                              <StatusBadge status="pending" label="REWORK (Perbaikan)" />
                            ) : s === 'REJECTED' ? (
                              <StatusBadge status="cancelled" label="REJECTED (Afkir)" />
                            ) : s === 'QC_PENDING' ? (
                              <StatusBadge status="info" label="Menunggu Uji QC" />
                            ) : (
                              <StatusBadge status="active" label="Sedang Dipacking" />
                            )}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                            {s === 'RELEASED' ? (
                              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-success-700)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <CheckCircle2 className="w-4 h-4 text-currentColor" aria-hidden="true" /> Siap Jual
                              </span>
                            ) : s === 'REJECTED' ? (
                              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-danger-700)', fontWeight: 600 }}>
                                Dialihkan ke Karantina
                              </span>
                            ) : s === 'QC_PENDING' ? (
                              <Button variant="secondary" size="sm" disabled>
                                Dalam Antrean QC
                              </Button>
                            ) : s === 'REWORK' ? (
                              <Button
                                variant="secondary"
                                size="sm"
                                leftIcon={<RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />}
                                onClick={() => handleOpenSubmitQc(item)}
                              >
                                Ajukan Ulang ke QC
                              </Button>
                            ) : (
                              <Button
                                variant="primary"
                                size="sm"
                                leftIcon={<ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />}
                                onClick={() => handleOpenSubmitQc(item)}
                                disabled={!hasPackaged}
                                title={!hasPackaged ? 'Input packing terlebih dahulu' : 'Ajukan batch kemasan ini ke QC'}
                              >
                                Ajukan ke QC
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Section: Daftar Rincian Entri Packing per Longsong */}
          <div style={{ marginTop: 'var(--space-2)' }}>
            <h4 style={{ margin: '0 0 var(--space-2) 0', fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-secondary)' }}>
              Riwayat Rincian Packing per Longsong ({packingEntries.length} entri)
            </h4>
            <DataTable columns={packingColumns} data={packingEntries} />
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* MODAL: BUAT BATCH GORENG BARU (REGULAR / BIASA) */}
      {/* ═══════════════════════════════════════════════ */}
      <Modal
        isOpen={createRegularFryingOpen}
        onClose={() => setCreateRegularFryingOpen(false)}
        title="Buat Batch Goreng Baru (Standar Wajan)"
        size="md"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
            <Button variant="secondary" onClick={() => setCreateRegularFryingOpen(false)}>Batal</Button>
            <Button
              variant="primary"
              onClick={handleCreateRegularFrying}
              leftIcon={<Flame className="w-4 h-4" aria-hidden="true" />}
              disabled={!isRegularFryingValid}
            >
              Simpan &amp; Siapkan Wajan
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{
            padding: 'var(--space-3)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-primary-50)',
            border: '1px solid var(--color-primary-200)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <Flame className="w-5 h-5 text-[var(--color-primary-600)] shrink-0" aria-hidden="true" />
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary-900)' }}>
              Batch ini akan disiapkan dengan status <strong>Siap Goreng</strong>. Operator dapat memulai stopwatch wajan saat proses penggorengan dimulai, lalu mencatat hasil goreng saat wajan selesai dimasak.
            </div>
          </div>

          <FormField label="Pilih SPK Produksi" required>
            <Select
              options={orders.filter(o => o.status === 'DRAFT' || o.status === 'IN_PROGRESS').map(o => ({
                value: o.id, label: `${o.batch_number} — ${o.product_variant || 'Jamur Crispy'}`,
              }))}
              value={regularFryingForm.production_order_id}
              onChange={(e) => setRegularFryingForm({ ...regularFryingForm, production_order_id: e.target.value })}
            />
          </FormField>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <FormField label="Nomor Wajan" required>
              <Input
                type="number" min="1"
                value={regularFryingForm.wajan_number}
                onChange={(e) => setRegularFryingForm({ ...regularFryingForm, wajan_number: e.target.value })}
              />
            </FormField>

            <FormField label="Berat Input (gram)" required>
              <Input
                type="number" min="1"
                value={regularFryingForm.batch_weight_gram}
                onChange={(e) => setRegularFryingForm({ ...regularFryingForm, batch_weight_gram: e.target.value })}
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
              value={regularFryingForm.oil_temp_celsius}
              onChange={(e) => setRegularFryingForm({ ...regularFryingForm, oil_temp_celsius: e.target.value })}
              placeholder="170"
            />
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: '2px', display: 'block' }}>
              Rekomendasi suhu: 160°C - 180°C.
            </span>
          </FormField>

          <FormField label="Catatan Operator">
            <Textarea
              rows={2}
              value={regularFryingForm.notes}
              onChange={(e) => setRegularFryingForm({ ...regularFryingForm, notes: e.target.value })}
              placeholder="Catatan tambahan wajan (misal: kondisi minyak, api wajan)..."
            />
          </FormField>
        </div>
      </Modal>

      {/* ═══════════════════════════════════════════════ */}
      {/* MODAL: BATCH HACCP TIME STUDY                   */}
      {/* ═══════════════════════════════════════════════ */}
      <Modal
        isOpen={createHaccpFryingOpen}
        onClose={() => setCreateHaccpFryingOpen(false)}
        title="Batch HACCP Time Study (Catatan Jam Dinding)"
        size="md"
        footer={
          <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 'var(--space-2)' }}>
            {!isHaccpFryingValid && (
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-danger-600)', textAlign: 'right', fontWeight: 500 }}>
                * Wajib mengisi waktu mulai, waktu selesai, output jamur (&gt; 0g), longsong (&gt; 0), dan kremesan (≥ 0g)
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
              <Button variant="secondary" onClick={() => setCreateHaccpFryingOpen(false)}>Batal</Button>
              <Button
                variant="primary"
                onClick={handleCreateHaccpFrying}
                leftIcon={<ClipboardCheck className="w-4 h-4" aria-hidden="true" />}
                disabled={!isHaccpFryingValid}
              >
                Simpan Batch HACCP
              </Button>
            </div>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <FormField label="Pilih SPK Produksi" required>
            <Select
              options={orders.filter(o => o.status === 'DRAFT' || o.status === 'IN_PROGRESS').map(o => ({
                value: o.id, label: `${o.batch_number} — ${o.product_variant || 'Jamur Crispy'}`,
              }))}
              value={haccpFryingForm.production_order_id}
              onChange={(e) => setHaccpFryingForm({ ...haccpFryingForm, production_order_id: e.target.value })}
            />
          </FormField>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <FormField label="Nomor Wajan" required>
              <Input
                type="number" min="1"
                value={haccpFryingForm.wajan_number}
                onChange={(e) => setHaccpFryingForm({ ...haccpFryingForm, wajan_number: e.target.value })}
              />
            </FormField>

            <FormField label="Berat Input (gram)" required>
              <Input
                type="number" min="1"
                value={haccpFryingForm.batch_weight_gram}
                onChange={(e) => setHaccpFryingForm({ ...haccpFryingForm, batch_weight_gram: e.target.value })}
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
              value={haccpFryingForm.oil_temp_celsius}
              onChange={(e) => setHaccpFryingForm({ ...haccpFryingForm, oil_temp_celsius: e.target.value })}
              placeholder="170"
            />
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: '2px', display: 'block' }}>
              Rekomendasi suhu: 160°C - 180°C.
            </span>
          </FormField>

          {/* HACCP Time Study Section */}
          <div style={{
            padding: 'var(--space-3)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border-default)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3)',
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                <Clock className="w-4 h-4 text-[var(--color-primary-600)]" aria-hidden="true" />
                Catatan Waktu Memasak (HACCP Time Study)
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Wajib diisi sesuai catatan jam dinding area penggorengan (area steril audit HACCP bebas HP).
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>
                    Waktu Mulai Masak <span style={{ color: 'var(--color-danger-500)' }}>*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setHaccpFryingForm(prev => ({ ...prev, start_time: getCurrentTimeString() }))}
                    style={{
                      fontSize: '10px',
                      padding: '1px 6px',
                      borderRadius: 'var(--radius-xs)',
                      border: '1px solid var(--border-default)',
                      background: 'white',
                      cursor: 'pointer',
                      color: 'var(--color-primary-700)',
                      fontWeight: 600,
                    }}
                  >
                    Jam Sekarang
                  </button>
                </div>
                <Input
                  type="time"
                  required
                  value={haccpFryingForm.start_time}
                  onChange={(e) => setHaccpFryingForm({ ...haccpFryingForm, start_time: e.target.value })}
                />
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>
                    Waktu Selesai Masak <span style={{ color: 'var(--color-danger-500)' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {haccpFryingForm.start_time && (
                      <button
                        type="button"
                        onClick={() => setHaccpFryingForm(prev => ({ ...prev, end_time: addMinutesToTimeString(prev.start_time, 15) }))}
                        style={{
                          fontSize: '10px',
                          padding: '1px 5px',
                          borderRadius: 'var(--radius-xs)',
                          border: '1px solid var(--color-primary-300)',
                          background: 'var(--color-primary-50)',
                          cursor: 'pointer',
                          color: 'var(--color-primary-800)',
                          fontWeight: 600,
                        }}
                        title="Tambah 15 menit dari jam mulai"
                      >
                        +15 Menit
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setHaccpFryingForm(prev => ({ ...prev, end_time: getCurrentTimeString() }))}
                      style={{
                        fontSize: '10px',
                        padding: '1px 5px',
                        borderRadius: 'var(--radius-xs)',
                        border: '1px solid var(--border-default)',
                        background: 'white',
                        cursor: 'pointer',
                        color: 'var(--color-primary-700)',
                        fontWeight: 600,
                      }}
                    >
                      Jam Sekarang
                    </button>
                  </div>
                </div>
                <Input
                  type="time"
                  required
                  value={haccpFryingForm.end_time}
                  onChange={(e) => setHaccpFryingForm({ ...haccpFryingForm, end_time: e.target.value })}
                />
              </div>
            </div>

            {/* Live Duration Calculation Box */}
            {haccpFryingForm.start_time && haccpFryingForm.end_time && (
              (() => {
                const dur = calculateTimeDifferenceMinutes(haccpFryingForm.start_time, haccpFryingForm.end_time);
                const isCompliant = dur >= 10 && dur <= 20;
                return (
                  <div style={{
                    padding: 'var(--space-2) var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    background: isCompliant ? 'var(--color-success-50)' : 'var(--color-warning-50)',
                    border: `1px solid ${isCompliant ? 'var(--color-success-300)' : 'var(--color-warning-300)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Clock className={`w-4 h-4 ${isCompliant ? 'text-[var(--color-success-600)]' : 'text-[var(--color-warning-600)]'}`} aria-hidden="true" />
                      <div>
                        <div style={{ fontSize: 'var(--text-xs)', color: isCompliant ? 'var(--color-success-800)' : 'var(--color-warning-800)', fontWeight: 600 }}>
                          Kalkulasi Durasi Goreng (HACCP)
                        </div>
                        <div style={{ fontSize: '1rem', fontWeight: 700, color: isCompliant ? 'var(--color-success-900)' : 'var(--color-warning-900)' }}>
                          {dur} Menit
                          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 400, marginLeft: '6px', opacity: 0.8 }}>
                            ({haccpFryingForm.start_time} s/d {haccpFryingForm.end_time})
                          </span>
                        </div>
                      </div>
                    </div>
                    <div style={{
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '11px',
                      fontWeight: 700,
                      background: isCompliant ? 'var(--color-success-200)' : 'var(--color-warning-200)',
                      color: isCompliant ? 'var(--color-success-900)' : 'var(--color-warning-900)',
                    }}>
                      {isCompliant ? 'Standar (15±5 mnt)' : 'Di Luar Standar'}
                    </div>
                  </div>
                );
              })()
            )}

            {/* WAJIB ISI: Berat Output Jamur, Jumlah Longsong, & Berat Kremesan */}
            <div style={{
              paddingTop: 'var(--space-2)',
              borderTop: '1px dashed var(--border-default)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3)',
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <FormField label="Berat Output Jamur (gram)" required>
                  <Input
                    type="number" min="1" required
                    value={haccpFryingForm.output_weight_gram}
                    onChange={(e) => setHaccpFryingForm({ ...haccpFryingForm, output_weight_gram: e.target.value })}
                    placeholder="650"
                  />
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: '2px', display: 'block' }}>
                    Wajib diisi hasil timbang
                  </span>
                </FormField>
                <FormField label="Jumlah Longsong yang Dihasilkan" required>
                  <Input
                    type="number" min="1" required
                    value={haccpFryingForm.longsong_count}
                    onChange={(e) => setHaccpFryingForm({ ...haccpFryingForm, longsong_count: e.target.value })}
                    placeholder="3"
                  />
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: '2px', display: 'block' }}>
                    Wajib diisi (min. 1 longsong)
                  </span>
                </FormField>
              </div>

              <FormField label="Berat Kremesan/Remukan (gram)" required>
                <Input
                  type="number" min="0" required
                  value={haccpFryingForm.kremesan_weight_gram}
                  onChange={(e) => setHaccpFryingForm({ ...haccpFryingForm, kremesan_weight_gram: e.target.value })}
                  placeholder="0"
                />
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: '2px', display: 'block' }}>
                  Wajib diisi hasil timbang kremesan (isi 0 jika tidak ada)
                </span>
              </FormField>

              {/* Live Rendemen Calculation */}
              {haccpFryingForm.output_weight_gram && Number(haccpFryingForm.output_weight_gram) > 0 && (
                (() => {
                  const inputW = Number(haccpFryingForm.batch_weight_gram) || 800;
                  const outputW = Number(haccpFryingForm.output_weight_gram);
                  const yld = (outputW / inputW) * 100;
                  const isGood = yld >= 80;
                  return (
                    <div style={{
                      padding: 'var(--space-2) var(--space-3)',
                      borderRadius: 'var(--radius-md)',
                      background: isGood ? 'var(--color-success-50)' : 'var(--color-danger-50)',
                      border: `1px solid ${isGood ? 'var(--color-success-300)' : 'var(--color-danger-300)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}>
                      {isGood ? <CheckCircle2 className="w-4 h-4 text-[var(--color-success-600)]" aria-hidden="true" /> : <AlertTriangle className="w-4 h-4 text-[var(--color-danger-600)]" aria-hidden="true" />}
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: isGood ? 'var(--color-success-800)' : 'var(--color-danger-800)' }}>
                          Estimasi Rendemen: {yld.toFixed(1)}%
                        </div>
                        <div style={{ fontSize: 'var(--text-xs)', color: isGood ? 'var(--color-success-700)' : 'var(--color-danger-700)' }}>
                          {isGood ? 'Memenuhi target efisiensi (≥ 80%)' : 'Di bawah standar efisiensi 80%!'}
                        </div>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          </div>

          <FormField label="Catatan Operator">
            <Textarea
              rows={2}
              value={haccpFryingForm.notes}
              onChange={(e) => setHaccpFryingForm({ ...haccpFryingForm, notes: e.target.value })}
              placeholder="Catatan tambahan audit HACCP (misal: kondisi minyak, api wajan)..."
            />
          </FormField>
        </div>
      </Modal>

      {/* ═══════════════════════════════════════════════ */}
      {/* MODAL: INPUT / EDIT HASIL GORENG                */}
      {/* ═══════════════════════════════════════════════ */}
      <Modal
        isOpen={completeFryingOpen}
        onClose={() => setCompleteFryingOpen(false)}
        title={`${selectedFryingBatch?.finished_at ? 'Edit Hasil Goreng' : 'Input Hasil Goreng'} — Wajan #${selectedFryingBatch?.wajan_number}`}
        size="md"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
            <Button variant="secondary" onClick={() => setCompleteFryingOpen(false)}>Batal</Button>
            <Button
              variant="primary"
              onClick={handleCompleteFrying}
              leftIcon={selectedFryingBatch?.finished_at ? <Pencil className="w-4 h-4" aria-hidden="true" /> : <Scale className="w-4 h-4" aria-hidden="true" />}
              disabled={
                !completeFryingForm.output_weight_gram ||
                Number(completeFryingForm.output_weight_gram) <= 0 ||
                !completeFryingForm.longsong_count ||
                Number(completeFryingForm.longsong_count) <= 0 ||
                completeFryingForm.kremesan_weight_gram === '' ||
                isNaN(Number(completeFryingForm.kremesan_weight_gram)) ||
                Number(completeFryingForm.kremesan_weight_gram) < 0
              }
            >
              {selectedFryingBatch?.finished_at ? 'Simpan Perubahan' : 'Simpan Hasil'}
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {selectedFryingBatch && (() => {
            const timing = getAutoBatchTiming(selectedFryingBatch);
            return (
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
                    <Clock className="w-3.5 h-3.5 text-[var(--color-primary-600)]" aria-hidden="true" /> Kalkulasi Waktu & Durasi
                  </span>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--color-primary-900)' }}>
                    {timing.durationMinutes} menit
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-primary-700)', marginTop: '2px', fontWeight: 500 }}>
                    Mulai {timing.startTime} • Selesai {timing.endTime} (Otomatis)
                  </div>
                </div>
              </div>
            );
          })()}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <FormField label="Berat Output Jamur Matang (gram)" required>
              <Input
                type="number" min="1" required
                value={completeFryingForm.output_weight_gram}
                onChange={(e) => setCompleteFryingForm({ ...completeFryingForm, output_weight_gram: e.target.value })}
                placeholder="650"
              />
            </FormField>

            <FormField label="Jumlah Longsong yang Dihasilkan" required>
              <Input
                type="number" min="1" required
                value={completeFryingForm.longsong_count}
                onChange={(e) => setCompleteFryingForm({ ...completeFryingForm, longsong_count: e.target.value })}
                placeholder="3"
              />
            </FormField>
          </div>

          <FormField label="Berat Kremesan/Remukan (gram)" required>
            <Input
              type="number" min="0" required
              value={completeFryingForm.kremesan_weight_gram}
              onChange={(e) => setCompleteFryingForm({ ...completeFryingForm, kremesan_weight_gram: e.target.value })}
              placeholder="0"
            />
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: '2px', display: 'block' }}>
              Wajib diisi hasil timbang kremesan (isi 0 jika tidak ada)
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

          <FormField label="Catatan Operator">
            <Textarea
              rows={2}
              value={completeFryingForm.notes}
              onChange={(e) => setCompleteFryingForm({ ...completeFryingForm, notes: e.target.value })}
              placeholder="Catatan tambahan (kondisi minyak, wajan, koreksi hasil)..."
            />
          </FormField>
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
            <Button
              variant="primary"
              onClick={handleCreatePacking}
              leftIcon={<Package className="w-4 h-4" aria-hidden="true" />}
              disabled={
                !packingForm.production_order_id ||
                friedOrdersData.length === 0 ||
                !packingForm.packaged_toples_count ||
                Number(packingForm.packaged_toples_count) <= 0
              }
            >
              Simpan Packing
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {friedOrdersData.length === 0 ? (
            <div style={{
              padding: 'var(--space-3)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-warning-50)',
              border: '1px solid var(--color-warning-300)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              color: 'var(--color-warning-800)',
              fontSize: 'var(--text-sm)',
            }}>
              <AlertTriangle className="w-5 h-5 text-[var(--color-warning-600)] shrink-0" aria-hidden="true" />
              <div>
                <strong>Belum Ada SPK yang Menyelesaikan Goreng Jamur</strong>
                <div style={{ fontSize: 'var(--text-xs)', marginTop: '2px' }}>
                  Data SPK packing rasa harus melewati tahap produksi goreng jamur. Silakan input hasil wajan di Tab 1 (Penggorengan Wajan) terlebih dahulu.
                </div>
              </div>
            </div>
          ) : (
            <FormField label="Pilih SPK Produksi (Tahap Goreng Selesai)" required>
              <Select
                options={friedOrdersData.map(item => ({
                  value: item.order.id,
                  label: `${item.order.batch_number} — ${item.order.product_variant || 'Jamur Crispy'} (${item.unpackedCount} Siap Packing / ${item.totalLongsongProduced} Longsong Masak)`,
                }))}
                value={packingForm.production_order_id}
                onChange={(e) => {
                  const spkId = e.target.value;
                  const targetSpk = friedOrdersData.find(d => d.order.id === spkId);
                  const nextLongsongNum = targetSpk ? targetSpk.packedCount + 1 : 1;
                  const avgWeight = targetSpk && targetSpk.totalLongsongProduced > 0
                    ? Math.round(targetSpk.totalOutputGram / targetSpk.totalLongsongProduced)
                    : '';
                  setPackingForm(prev => ({
                    ...prev,
                    production_order_id: spkId,
                    frying_batch_id: '',
                    longsong_number: String(nextLongsongNum),
                    longsong_weight_gram: avgWeight ? String(avgWeight) : prev.longsong_weight_gram,
                  }));
                }}
              />
            </FormField>
          )}

          {/* Integrated Status Card */}
          {selectedFriedOrder && (
            <div style={{
              padding: 'var(--space-3)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-primary-50)',
              border: '1px solid var(--color-primary-200)',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 'var(--space-2)',
              textAlign: 'center',
            }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--color-primary-800)', fontWeight: 600 }}>Total Longsong Masak</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-primary-900)' }}>
                  {selectedFriedOrder.totalLongsongProduced} <span style={{ fontSize: 'var(--text-xs)', fontWeight: 500 }}>longsong</span>
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--color-primary-800)', fontWeight: 600 }}>Sudah Dipacking</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-success-700)' }}>
                  {selectedFriedOrder.packedCount} <span style={{ fontSize: 'var(--text-xs)', fontWeight: 500 }}>longsong</span>
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--color-primary-800)', fontWeight: 600 }}>Sisa Siap Packing</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: selectedFriedOrder.unpackedCount > 0 ? 'var(--color-danger-700)' : 'var(--text-tertiary)' }}>
                  {selectedFriedOrder.unpackedCount} <span style={{ fontSize: 'var(--text-xs)', fontWeight: 500 }}>longsong</span>
                </div>
              </div>
            </div>
          )}

          {/* Wajan Asal Selector */}
          {selectedFriedOrder && selectedFriedOrder.batches.length > 0 && (
            <FormField label="Pilih Wajan Asal (Frying Batch)">
              <Select
                options={[
                  { value: '', label: 'Semua Wajan / Campuran SPK' },
                  ...selectedFriedOrder.batches.map(b => ({
                    value: b.id,
                    label: `Wajan #${b.wajan_number} — ${b.longsong_count} Longsong (${b.output_weight_gram?.toLocaleString('id-ID')}g matang)`,
                  })),
                ]}
                value={packingForm.frying_batch_id}
                onChange={(e) => {
                  const batchId = e.target.value;
                  const targetBatch = selectedFriedOrder.batches.find(b => b.id === batchId);
                  const estWeight = targetBatch && targetBatch.output_weight_gram && targetBatch.longsong_count
                    ? Math.round(targetBatch.output_weight_gram / targetBatch.longsong_count)
                    : (selectedFriedOrder.totalLongsongProduced > 0
                        ? Math.round(selectedFriedOrder.totalOutputGram / selectedFriedOrder.totalLongsongProduced)
                        : '');
                  setPackingForm(prev => ({
                    ...prev,
                    frying_batch_id: batchId,
                    longsong_weight_gram: estWeight ? String(estWeight) : prev.longsong_weight_gram,
                  }));
                }}
              />
            </FormField>
          )}

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
            <FormField label="Tipe Packaging" required>
              <Select
                options={PACKAGING_TYPES.map(t => ({ value: t, label: t }))}
                value={packingForm.packaging_type}
                onChange={(e) => setPackingForm({ ...packingForm, packaging_type: e.target.value })}
              />
            </FormField>

            <FormField label="Berat per Kemasan" required>
              <Select
                options={PACKAGING_WEIGHTS.map(w => ({ value: w.value, label: w.label }))}
                value={packingForm.packaging_weight_gram}
                onChange={(e) => setPackingForm({ ...packingForm, packaging_weight_gram: e.target.value })}
              />
            </FormField>
          </div>

          <FormField label="Jumlah Packaging yang Dihasilkan (pcs)" required>
            <Input
              type="number" min="1"
              value={packingForm.packaged_toples_count}
              onChange={(e) => setPackingForm({ ...packingForm, packaged_toples_count: e.target.value })}
              placeholder="Contoh: 10"
            />
          </FormField>

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
      {/* MODAL: AJUKAN BATCH KEMASAN KE QUALITY CONTROL */}
      {/* ═══════════════════════════════════════════════ */}
      <Modal
        isOpen={submitQcOpen}
        onClose={() => setSubmitQcOpen(false)}
        title="Ajukan Batch Kemasan ke Quality Control (QC)"
        size="md"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
            <Button variant="secondary" onClick={() => setSubmitQcOpen(false)}>Batal</Button>
            <Button
              variant="primary"
              onClick={handleConfirmSubmitQc}
              leftIcon={<ShieldCheck className="w-4 h-4" aria-hidden="true" />}
            >
              Kirim ke Antrean QC
            </Button>
          </div>
        }
      >
        {selectedSpkForQc && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{
              padding: 'var(--space-3)',
              borderRadius: 'var(--radius-md)',
              background: selectedSpkForQc.order?.status === 'REWORK' ? 'var(--color-warning-50)' : 'var(--color-primary-50)',
              border: `1px solid ${selectedSpkForQc.order?.status === 'REWORK' ? 'var(--color-warning-300)' : 'var(--color-primary-200)'}`,
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: 'var(--text-sm)' }}>
                  SPK: {selectedSpkForQc.order?.batch_number}
                </strong>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: selectedSpkForQc.order?.status === 'REWORK' ? 'var(--color-warning-200)' : 'var(--color-primary-200)',
                  color: selectedSpkForQc.order?.status === 'REWORK' ? 'var(--color-warning-900)' : 'var(--color-primary-900)',
                }}>
                  {selectedSpkForQc.order?.status === 'REWORK' ? 'PENGAJUAN ULANG REWORK' : 'PENGAJUAN PERTAMA'}
                </span>
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                <strong>Varian:</strong> {selectedSpkForQc.order?.product_variant || 'Jamur Crispy'}
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary-800)', fontWeight: 600 }}>
                Total Kemasan: {selectedSpkForQc.totalPackagedPcs || selectedSpkForQc.order?.target_quantity || 0} pcs kemasan siap sampling
              </div>
              {selectedSpkForQc.order?.anomaly_reason && (
                <div style={{
                  marginTop: '4px',
                  padding: '6px 8px',
                  borderRadius: 'var(--radius-xs)',
                  background: '#fff',
                  border: '1px solid var(--color-warning-400)',
                  color: 'var(--color-warning-900)',
                  fontSize: '11px',
                }}>
                  <strong>Catatan QC Sebelumnya:</strong> {selectedSpkForQc.order.anomaly_reason}
                </div>
              )}
            </div>

            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
              Setelah diajukan, status SPK akan berubah menjadi <strong>Menunggu QC (QC_PENDING)</strong> dan batch kemasan akan muncul di antrean inspeksi petugas Quality Control untuk uji sampling organoleptik &amp; kerapatan kemasan.
            </div>

            <FormField label="Catatan Tambahan untuk Petugas QC (Opsional)">
              <Textarea
                rows={2}
                value={submitQcNotes}
                onChange={(e) => setSubmitQcNotes(e.target.value)}
                placeholder="Misal: Sudah diperbaiki seal kemasan nomor 1-10, rasa balado ekstra bumbu..."
              />
            </FormField>
          </div>
        )}
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
