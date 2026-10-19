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
import { useAuth } from '@/hooks/useAuth';
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
  Sliders,
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { format, isToday, isThisMonth, isThisYear, startOfDay, endOfDay } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import {
  getProductionOrders,
  createProductionOrder,
  completeProductionOrder,
  deleteFryingBatch,
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
  recordFryingRunCompletion,
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
  type CreatePackingEntryInput,
  type RecordFryingRunCompletionInput,
} from '@/actions/production';
import { getProductionStandards } from '@/actions/standards';
import { supabase } from '@/lib/supabase';
import { getPpicData } from '@/actions/ppic';
import type { DbProductionOrder, DbProduct, DbRawMaterial, DbFryingBatch, DbPackingEntry, ProductionStandardConfig } from '@/types/database';
import { FLAVOR_VARIANTS, PACKAGING_TYPES, PACKAGING_WEIGHTS, isFryingSpk } from '@/types/database';

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
  const { user } = useAuth();
  const isManagement = user?.role === 'MANAGEMENT';
  const [activeTab, setActiveTab] = useState<'FRYING' | 'PACKING'>('FRYING');
  const toast = useToast();

  // ── Shared state ──
  const [orders, setOrders] = useState<DbProductionOrder[]>([]);
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [rawMaterials, setRawMaterials] = useState<(DbRawMaterial & { available_stock?: number })[]>([]);
  const [productionStandards, setProductionStandards] = useState<ProductionStandardConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // ── SPK Creation state ──
  const [createSpkOpen, setCreateSpkOpen] = useState(false);
  const [isCreatingSpk, setIsCreatingSpk] = useState(false);
  const [spkType, setSpkType] = useState<'FRYING' | 'PACKING'>('FRYING');
  const [spkForm, setSpkForm] = useState({
    spk_type: 'FRYING' as 'FRYING' | 'PACKING',
    product_id: '',
    target_quantity: '50',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  });

  const handleOpenCreateSpk = useCallback((type?: 'FRYING' | 'PACKING') => {
    const selected = type || (activeTab === 'PACKING' ? 'PACKING' : 'FRYING');
    setSpkType(selected);
    setSpkForm({
      spk_type: selected,
      product_id: '',
      target_quantity: selected === 'FRYING' ? '50' : '200',
      start_date: format(new Date(), 'yyyy-MM-dd'),
      notes: '',
    });
    setCreateSpkOpen(true);
  }, [activeTab]);

  // ── Frying state ──
  const [fryingBatches, setFryingBatches] = useState<DbFryingBatch[]>([]);
  const [fryingMetrics, setFryingMetrics] = useState({
    activeFryingBatchesToday: 0,
    avgYieldToday: 0,
    totalOutputGramToday: 0,
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
    kremesan_weight_gram: '0',
    notes: '',
  });

  // 3. Complete / Edit Frying Form (Untuk Input/Edit Hasil di Tabel)
  const [completeFryingForm, setCompleteFryingForm] = useState({
    output_weight_gram: '',
    longsong_count: '',
    kremesan_weight_gram: '0',
    notes: '',
  });

  // 4. Rekap Selesai Masak SPK Goreng (Run Selesai - Bahan Aktual vs Standar BOM)
  const [recordFryingRunOpen, setRecordFryingRunOpen] = useState(false);
  const [selectedFryingOrder, setSelectedFryingOrder] = useState<DbProductionOrder | null>(null);
  const [fryingRunForm, setFryingRunForm] = useState({
    actual_mushroom_kg: '',
    actual_premix_kg: '',
    actual_cooking_oil_liter: '',
    output_finished_kg: '',
    output_longsong_count: '',
    notes: '',
  });
  const [isSubmittingFryingRun, setIsSubmittingFryingRun] = useState(false);

  const isRegularFryingValid = useMemo(() => {
    return (
      !!regularFryingForm.oil_temp_celsius &&
      !!regularFryingForm.batch_weight_gram &&
      Number(regularFryingForm.batch_weight_gram) > 0
    );
  }, [regularFryingForm]);

  const isHaccpFryingValid = useMemo(() => {
    return (
      !!haccpFryingForm.oil_temp_celsius &&
      !!haccpFryingForm.start_time &&
      !!haccpFryingForm.end_time &&
      !!haccpFryingForm.output_weight_gram &&
      Number(haccpFryingForm.output_weight_gram) > 0 &&
      !!haccpFryingForm.longsong_count &&
      Number(haccpFryingForm.longsong_count) > 0
    );
  }, [haccpFryingForm]);

  // ── Packing state ──
  const [packingEntries, setPackingEntries] = useState<DbPackingEntry[]>([]);
  const [createPackingOpen, setCreatePackingOpen] = useState(false);
  const [isSavingPacking, setIsSavingPacking] = useState(false);
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
    longsongs_used_count: '1',
    defect_packaging_count: '0',
    notes: '',
  });

  // ── Standar Resep Bumbu Tabur & Kemasan Packing ──
  const getSeasoningRatioForVariant = useCallback((variantName: string): { ratio: number; name: string } => {
    const standardList = productionStandards?.seasoning_per_variant;
    const matched = standardList?.find(s => s.variant.toLowerCase() === variantName.toLowerCase());
    if (matched) {
      return {
        ratio: Number(matched.seasoning_ratio_per_kg) || 0.08,
        name: matched.seasoning_name || `Bumbu Tabur ${variantName}`,
      };
    }
    const vLower = variantName.toLowerCase();
    if (vLower.includes('original')) return { ratio: 0.05, name: 'Bumbu Gurih Original' };
    if (vLower.includes('super pedas')) return { ratio: 0.10, name: 'Bumbu Tabur Super Pedas' };
    return { ratio: 0.08, name: `Bumbu Tabur ${variantName}` };
  }, [productionStandards]);

  const calculateRecipeSeasoningGram = useCallback((
    flavor: string,
    packCountStr: string,
    packWeightStr: string,
    longsongWeightStr?: string
  ): number => {
    const { ratio } = getSeasoningRatioForVariant(flavor);
    const pcs = Number(packCountStr) || 0;
    const cleanWeight = parseInt((packWeightStr || '60g').replace(/\D/g, ''), 10) || 60;

    // Jika ada jumlah pcs kemasan yang ditentukan (misal 10 pcs @ 60g = 600g jamur)
    if (pcs > 0) {
      const totalWeightGrams = pcs * cleanWeight;
      return Math.round(totalWeightGrams * ratio);
    }

    // Jika pcs belum ada tapi berat longsong ada
    const lsWeight = Number(longsongWeightStr) || 0;
    if (lsWeight > 0) {
      return Math.round(lsWeight * ratio);
    }

    return 0;
  }, [getSeasoningRatioForVariant]);

  const matchedSeasoningInfo = useMemo(() => {
    const flavor = (packingForm.flavor_variant || 'Original').trim();
    const { ratio, name: recipeName } = getSeasoningRatioForVariant(flavor);
    const sLower = flavor.toLowerCase();

    const matchedRm = rawMaterials.find(rm => {
      const rmName = rm.name.toLowerCase();
      if (sLower.includes('balado')) return rmName.includes('balado');
      if (sLower.includes('bbq')) return rmName.includes('bbq') || rmName.includes('barbeque');
      if (sLower.includes('super pedas')) return rmName.includes('super pedas');
      if (sLower.includes('pedas manis')) return rmName.includes('pedas manis') || rmName.includes('manis pedas');
      if (sLower.includes('original')) return rmName.includes('gurih') || rmName.includes('original') || rmName.includes('asin');
      if (sLower.includes('keju')) return rmName.includes('keju') || rmName.includes('cheese');
      if (sLower.includes('jagung')) return rmName.includes('jagung');
      return rmName.includes(sLower);
    });

    const neededGrams = Number(packingForm.seasoning_used_gram) || 0;
    const isGramUom = matchedRm?.uom?.toLowerCase() === 'gram' || matchedRm?.uom?.toLowerCase() === 'gr';
    const availableStockInGram = matchedRm
      ? (isGramUom ? Number(matchedRm.available_stock || 0) : Number(matchedRm.available_stock || 0) * 1000)
      : null;

    const isStockSufficient = availableStockInGram !== null ? availableStockInGram >= neededGrams : true;
    const stdRecommended = calculateRecipeSeasoningGram(
      flavor,
      packingForm.packaged_toples_count,
      packingForm.packaging_weight_gram,
      packingForm.longsong_weight_gram
    );

    return {
      ratio,
      recipeName,
      matchedRm,
      availableStockInGram,
      isStockSufficient,
      neededGrams,
      stdRecommended,
    };
  }, [packingForm.flavor_variant, packingForm.seasoning_used_gram, packingForm.packaged_toples_count, packingForm.packaging_weight_gram, packingForm.longsong_weight_gram, getSeasoningRatioForVariant, calculateRecipeSeasoningGram, rawMaterials]);

  const matchedPackagingInfo = useMemo(() => {
    const pkgType = packingForm.packaging_type || 'Standing Pouch';
    const pkgWeight = packingForm.packaging_weight_gram || '60g';
    const neededPcs = (Number(packingForm.packaged_toples_count) || 0) + (Number(packingForm.defect_packaging_count) || 0);

    const matchedRm = rawMaterials.find(rm => {
      if (rm.material_category !== 'Packaging') return false;
      const nameLower = rm.name.toLowerCase();
      const pkgTypeLower = (rm.packaging_type || '').toLowerCase();
      const typeMatch = pkgTypeLower.includes(pkgType.toLowerCase()) || nameLower.includes(pkgType.toLowerCase());
      const weightMatch = (rm.package_weight || '').toLowerCase().includes(pkgWeight.toLowerCase()) || nameLower.includes(pkgWeight.toLowerCase());
      return typeMatch && weightMatch;
    }) || rawMaterials.find(rm => {
      if (rm.material_category !== 'Packaging') return false;
      const nameLower = rm.name.toLowerCase();
      return nameLower.includes(pkgWeight.toLowerCase());
    });

    const availableStock = matchedRm ? Number(matchedRm.available_stock || 0) : null;
    const isStockSufficient = availableStock !== null ? availableStock >= neededPcs : true;

    return {
      matchedRm,
      neededPcs,
      availableStock,
      isStockSufficient,
    };
  }, [packingForm.packaging_type, packingForm.packaging_weight_gram, packingForm.packaged_toples_count, packingForm.defect_packaging_count, rawMaterials]);

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

  const handleCreateSpk = async () => {
    if (spkType === 'PACKING') {
      if (!spkForm.product_id || !spkForm.target_quantity || !spkForm.start_date) {
        toast.error('Lengkapi varian produk retail, target kuantitas (pcs), dan tanggal');
        return;
      }
    } else {
      if (!spkForm.target_quantity || !spkForm.start_date) {
        toast.error('Lengkapi target input jamur segar (kg) dan tanggal mulai');
        return;
      }
    }

    setIsCreatingSpk(true);
    const { createProductionOrder } = await import('@/actions/production');
    
    let variantName = 'Jamur Crispy Polos (Curah)';
    let productId: string | undefined = undefined;

    if (spkType === 'PACKING') {
      const selectedProduct = products.find(p => p.id === spkForm.product_id);
      variantName = selectedProduct ? selectedProduct.name : 'Produk Jadi';
      productId = spkForm.product_id;
    }

    const res = await createProductionOrder({
      product_id: productId,
      product_variant: variantName,
      target_quantity: parseFloat(spkForm.target_quantity),
      start_date: spkForm.start_date,
      notes: spkForm.notes,
      spk_type: spkType,
    });

    setIsCreatingSpk(false);
    if (res.success) {
      toast.success(
        spkType === 'FRYING'
          ? 'SPK Penggorengan Jamur Curah berhasil dibuat!'
          : 'SPK Packing Rasa berhasil dibuat!'
      );
      setCreateSpkOpen(false);
      setSpkForm({ product_id: '', target_quantity: '50', start_date: format(new Date(), 'yyyy-MM-dd'), notes: '', spk_type: 'FRYING' });
      loadData(); // refresh data
    } else {
      toast.error(res.error || 'Gagal membuat SPK');
    }
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
      const [ordersRes, optionsRes, fryingRes, packingRes, metricsRes, standardsRes] = await Promise.all([
        getProductionOrders(),
        getProductionFormOptions(),
        getAllFryingBatches(),
        getAllPackingEntries(),
        getFryingPackingMetrics(),
        getProductionStandards(),
      ]);

      if (ordersRes.success && ordersRes.data) setOrders(ordersRes.data);
      if (optionsRes.success) {
        if (optionsRes.products) setProducts(optionsRes.products);
        if (optionsRes.rawMaterials) setRawMaterials(optionsRes.rawMaterials);
      }
      if (fryingRes.success && fryingRes.data) setFryingBatches(fryingRes.data);
      if (packingRes.success && packingRes.data) setPackingEntries(packingRes.data);
      if (metricsRes.success && metricsRes.data) setFryingMetrics(metricsRes.data);
      if (standardsRes?.success && standardsRes.data) setProductionStandards(standardsRes.data);
    } catch (err: any) {
      console.error('Gagal memuat data produksi:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Supabase Realtime Subscription
    const channel = supabase
      .channel('production_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'production_orders' }, () => {
        loadData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'frying_batches' }, () => {
        loadData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'packing_entries' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

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

  // Semua SPK Penggorengan Curah (untuk antrean & progres di Tab 1)
  const allFryingOrders = useMemo(() => {
    return orders.filter(o => isFryingSpk(o));
  }, [orders]);

  // SPK Goreng yang masih aktif (DRAFT / IN_PROGRESS) untuk pilihan wajan baru
  const fryingOrders = useMemo(() => {
    return allFryingOrders.filter(o => o.status === 'DRAFT' || o.status === 'IN_PROGRESS');
  }, [allFryingOrders]);

  // ── SPK yang Sudah Melewati Tahap Produksi Goreng Jamur (Terintegrasi ke Packing) ──
  // Total pool longsong jamur matang curah di seluruh wajan pabrik
  const totalAllLongsongProduced = useMemo(() => {
    const batchTotal = fryingBatches.reduce((sum, b) => {
      const isFried = (b.finished_at != null || (b.output_weight_gram != null && b.output_weight_gram > 0)) && Number(b.longsong_count) > 0;
      return sum + (isFried ? (Number(b.longsong_count) || 0) : 0);
    }, 0);

    // Hitung juga dari SPK Goreng yang sudah berstatus COMPLETED
    const orderTotal = allFryingOrders.reduce((sum, o) => {
      const hasBatches = fryingBatches.some(b => b.production_order_id === o.id);
      if (!hasBatches && o.status === 'COMPLETED' && Number(o.total_longsong_count) > 0) {
        return sum + (Number(o.total_longsong_count) || 0);
      }
      return sum;
    }, 0);

    return batchTotal + orderTotal;
  }, [fryingBatches, allFryingOrders]);

  const totalAllLongsongPacked = useMemo(() => {
    return packingEntries.filter(p => p.is_packed).length;
  }, [packingEntries]);

  const availablePoolLongsong = useMemo(() => {
    return Math.max(0, totalAllLongsongProduced - totalAllLongsongPacked);
  }, [totalAllLongsongProduced, totalAllLongsongPacked]);

  // Agregasi Progres SPK Goreng Jamur Curah (Target kg, Realisasi kg, Sisa kg, Persen)
  const fryingOrdersWithProgress = useMemo(() => {
    return allFryingOrders.map(order => {
      const targetKg = Number(order.target_quantity) || 50;
      const batches = fryingBatches.filter(b => b.production_order_id === order.id);
      const batchCount = batches.length;
      let realizedKg = batches.reduce((sum, b) => sum + (Number(b.batch_weight_gram) || 800), 0) / 1000;
      let outputKg = batches.reduce((sum, b) => sum + (Number(b.output_weight_gram) || 0), 0) / 1000;
      let longsongTotal = batches.reduce((sum, b) => sum + (Number(b.longsong_count) || 0), 0);

      // Jika SPK sudah COMPLETED via rekap langsung
      if (order.status === 'COMPLETED') {
        if (order.input_weight && order.input_weight > realizedKg) {
          realizedKg = order.input_weight;
        }
        if (order.output_weight && order.output_weight > outputKg) {
          outputKg = order.output_weight;
        }
        if (order.total_longsong_count && order.total_longsong_count > longsongTotal) {
          longsongTotal = order.total_longsong_count;
        }
      }

      const remainingKg = Math.max(0, targetKg - realizedKg);
      const progressPct = order.status === 'COMPLETED' ? 100 : Math.min(100, Math.round((realizedKg / targetKg) * 100));
      const isFulfilled = realizedKg >= targetKg || order.status === 'COMPLETED';

      return {
        order,
        targetKg,
        batches,
        batchCount,
        realizedBatchesCount: batchCount || (order.status === 'COMPLETED' ? Math.round(realizedKg / 0.8) : 0),
        realizedKg,
        outputKg,
        longsongTotal,
        remainingKg,
        progressPct,
        progressPercent: progressPct,
        isFulfilled,
      };
    });
  }, [allFryingOrders, fryingBatches]);



  const selectedHaccpSpkProgress = useMemo(() => {
    if (!haccpFryingForm.production_order_id) return null;
    return fryingOrdersWithProgress.find(p => p.order.id === haccpFryingForm.production_order_id) || null;
  }, [haccpFryingForm.production_order_id, fryingOrdersWithProgress]);

  // SPK Packing Retail untuk Tab 2 (Eksklusif SPK Retail Kemasan)
  const friedOrdersData = useMemo(() => {
    const fryingByOrder: Record<string, {
      batches: DbFryingBatch[];
      totalLongsongProduced: number;
      totalOutputGram: number;
    }> = {};

    fryingBatches.forEach(b => {
      const isFried = (b.finished_at != null || (b.output_weight_gram != null && b.output_weight_gram > 0)) && Number(b.longsong_count) > 0;
      if (isFried) {
        const orderKey = b.production_order_id || 'pool';
        if (!fryingByOrder[orderKey]) {
          fryingByOrder[orderKey] = {
            batches: [],
            totalLongsongProduced: 0,
            totalOutputGram: 0,
          };
        }
        fryingByOrder[orderKey].batches.push(b);
        fryingByOrder[orderKey].totalLongsongProduced += (Number(b.longsong_count) || 0);
        fryingByOrder[orderKey].totalOutputGram += (Number(b.output_weight_gram) || 0);
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

    // Sertakan HANYA SPK PACKING RETAIL (Bukan SPK Goreng Curah)
    const retailOrders = orders.filter(o => !isFryingSpk(o));
    retailOrders.forEach(o => {
      const frying = fryingByOrder[o.id];
      const packedCount = packingByOrder[o.id] || 0;
      const packagedPcs = packingEntries
        .filter(p => p.production_order_id === o.id && p.is_packed)
        .reduce((sum, p) => sum + (Number(p.packaged_toples_count) || 0), 0);

      const totalLongsongProduced = frying ? frying.totalLongsongProduced : (availablePoolLongsong + packedCount);
      const totalOutputGram = frying ? frying.totalOutputGram : 0;
      const unpackedCount = frying
        ? Math.max(0, frying.totalLongsongProduced - packedCount)
        : availablePoolLongsong;

      result.push({
        order: o,
        batches: frying ? frying.batches.sort((a, b) => a.wajan_number - b.wajan_number) : [],
        totalLongsongProduced,
        totalOutputGram,
        packedCount,
        unpackedCount,
        totalPackagedPcs: packagedPcs,
      });
    });

    return result.sort((a, b) => {
      if (b.unpackedCount !== a.unpackedCount) return b.unpackedCount - a.unpackedCount;
      return new Date(b.order.created_at || '').getTime() - new Date(a.order.created_at || '').getTime();
    });
  }, [orders, fryingBatches, packingEntries, availablePoolLongsong]);

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

  // Handler: Buka & Buat Batch Goreng Curah (Khusus Tanpa SPK)
  const handleOpenCreateRegularFrying = () => {
    setRegularFryingForm({
      production_order_id: '',
      wajan_number: String((fryingBatches.length > 0 ? Math.max(...fryingBatches.map(b => b.wajan_number)) : 0) + 1),
      batch_weight_gram: '800',
      oil_temp_celsius: '170',
      notes: '',
    });
    setCreateRegularFryingOpen(true);
  };

  const handleCreateRegularFrying = async () => {
    if (!regularFryingForm.oil_temp_celsius) {
      toast.error('Suhu minyak wajib diisi');
      return;
    }
    if (!regularFryingForm.batch_weight_gram || Number(regularFryingForm.batch_weight_gram) <= 0) {
      toast.error('Berat input (gram) wajib diisi');
      return;
    }

    const res = await createFryingBatch({
      production_order_id: undefined,
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

  // Handler: Buka Modal Rekap Selesai Masak SPK (Bahan Aktual & Output Longsong)
  const handleOpenRecordFryingRun = (order: DbProductionOrder) => {
    const targetKg = Number(order.target_quantity) || 50;
    setSelectedFryingOrder(order);
    setFryingRunForm({
      actual_mushroom_kg: String(targetKg),
      actual_premix_kg: String(Number((targetKg * 0.25).toFixed(2))),
      actual_cooking_oil_liter: String(Number((targetKg * 0.30).toFixed(2))),
      output_finished_kg: '',
      output_longsong_count: '',
      notes: '',
    });
    setRecordFryingRunOpen(true);
  };

  const handleFryingRunMushroomChange = (valStr: string) => {
    if (valStr === '') {
      setFryingRunForm(f => ({
        ...f,
        actual_mushroom_kg: '',
        actual_premix_kg: '',
        actual_cooking_oil_liter: '',
        output_finished_kg: '',
        output_longsong_count: '',
      }));
      return;
    }
    const val = parseFloat(valStr);
    if (isNaN(val)) {
      setFryingRunForm(f => ({ ...f, actual_mushroom_kg: valStr }));
      return;
    }
    const autoPremix = Number((val * 0.25).toFixed(2));
    const autoOil = Number((val * 0.30).toFixed(2));
    setFryingRunForm(f => ({
      ...f,
      actual_mushroom_kg: valStr,
      actual_premix_kg: autoPremix.toString(),
      actual_cooking_oil_liter: autoOil.toString(),
    }));
  };

  const handleFryingRunOutputKgChange = (valStr: string) => {
    if (valStr === '') {
      setFryingRunForm(f => ({ ...f, output_finished_kg: '', output_longsong_count: '' }));
      return;
    }
    const val = parseFloat(valStr);
    if (isNaN(val)) {
      setFryingRunForm(f => ({ ...f, output_finished_kg: valStr }));
      return;
    }
    const currentMushroom = parseFloat(fryingRunForm.actual_mushroom_kg) || (Number(selectedFryingOrder?.target_quantity) || 50);
    const maxAllowed = Math.round(currentMushroom * 1.25 * 10) / 10;
    
    let clampedVal = val;
    if (maxAllowed > 0 && val > maxAllowed) {
      clampedVal = maxAllowed;
    }
    const autoLongsong = Math.max(1, Math.round(clampedVal / 2.5));
    setFryingRunForm(f => ({
      ...f,
      output_finished_kg: clampedVal.toString(),
      output_longsong_count: autoLongsong.toString(),
    }));
  };

  const handleFryingRunLongsongChange = (valStr: string) => {
    if (valStr === '') {
      setFryingRunForm(f => ({ ...f, output_longsong_count: '', output_finished_kg: '' }));
      return;
    }
    const count = parseInt(valStr, 10);
    if (isNaN(count)) {
      setFryingRunForm(f => ({ ...f, output_longsong_count: valStr }));
      return;
    }
    const currentMushroom = parseFloat(fryingRunForm.actual_mushroom_kg) || (Number(selectedFryingOrder?.target_quantity) || 50);
    const maxAllowed = Math.round(currentMushroom * 1.25 * 10) / 10;

    const estimatedWeight = Math.min(maxAllowed, Number((count * 2.5).toFixed(1)));
    setFryingRunForm(f => ({
      ...f,
      output_longsong_count: valStr,
      output_finished_kg: estimatedWeight.toString(),
    }));
  };

  // Handler: Submit Rekap Selesai Masak SPK & Potong Stok Gudang Aktual
  const handleSubmitFryingRun = async () => {
    if (!selectedFryingOrder) return;
    const mushroomKg = parseFloat(fryingRunForm.actual_mushroom_kg);
    const premixKg = parseFloat(fryingRunForm.actual_premix_kg);
    const oilLiter = parseFloat(fryingRunForm.actual_cooking_oil_liter);
    const outputKg = parseFloat(fryingRunForm.output_finished_kg);
    const longsongCount = parseInt(fryingRunForm.output_longsong_count, 10);

    if (!mushroomKg || mushroomKg <= 0 || !outputKg || outputKg <= 0 || !longsongCount || longsongCount <= 0) {
      toast.error('Mohon isi jamur aktual, berat output matang, dan jumlah longsong dengan benar');
      return;
    }

    if (outputKg > mushroomKg * 1.5) {
      toast.error(`Berat output jamur matang (${outputKg} kg) tidak wajar karena melebihi batas 150% bahan jamur segar (${mushroomKg} kg). Mohon periksa kembali input Anda.`);
      return;
    }

    setIsSubmittingFryingRun(true);
    try {
      const res = await recordFryingRunCompletion({
        production_order_id: selectedFryingOrder.id,
        actual_mushroom_kg: mushroomKg,
        actual_premix_kg: premixKg || 0,
        actual_cooking_oil_liter: oilLiter || 0,
        output_finished_kg: outputKg,
        output_longsong_count: longsongCount,
        notes: fryingRunForm.notes || undefined,
      });

      if (res.success) {
        toast.success(`SPK ${selectedFryingOrder.batch_number} selesai! Hasil: ${outputKg}kg (${longsongCount} longsong, Rendemen: ${res.data?.yieldPercentage}%)`);
        setRecordFryingRunOpen(false);
        await loadData();
      } else {
        toast.error(res.error || 'Gagal mencatat penyelesaian SPK');
      }
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setIsSubmittingFryingRun(false);
    }
  };

  // Handler: Selesaikan SPK Penggorengan secara manual
  const handleCompleteSpk = (orderId: string, batchNumber: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Tandai SPK Selesai',
      description: `Apakah Anda yakin ingin menyelesaikan SPK ${batchNumber}? Seluruh target penggorengan wajan untuk SPK ini akan ditandai COMPLETED.`,
      variant: 'primary',
      onConfirm: async () => {
        const res = await completeProductionOrder(orderId);
        if (res.success) {
          toast.success(`SPK ${batchNumber} berhasil diselesaikan!`);
          loadData();
        } else {
          toast.error(res.error || 'Gagal menyelesaikan SPK');
        }
      },
    });
  };

  // Handler: Batalkan / Hapus Wajan & Kembalikan Stok Bahan Baku
  const handleDeleteBatch = (batch: DbFryingBatch) => {
    setConfirmDialog({
      isOpen: true,
      title: `Hapus / Batalkan Wajan #${batch.wajan_number}`,
      description: `Apakah Anda yakin ingin membatalkan wajan #${batch.wajan_number}? Stok bahan baku (Jamur, Tepung, Minyak) yang sebelumnya dialokasikan/dipotong akan dikembalikan otomatis ke gudang.`,
      variant: 'danger',
      onConfirm: async () => {
        const res = await deleteFryingBatch(batch.id);
        if (res.success) {
          toast.success(`Wajan #${batch.wajan_number} berhasil dibatalkan dan stok dikembalikan`);
          setBatchTimers(prev => {
            const next = { ...prev };
            delete next[batch.id];
            return next;
          });
          loadData();
        } else {
          toast.error(res.error || 'Gagal menghapus batch wajan');
        }
      },
    });
  };

  // Handler: Buka & Buat Batch HACCP Time Study (Catatan Jam Dinding + Wajib Hasil)
  const handleOpenCreateHaccpFrying = (targetOrderId?: string) => {
    const defaultStart = getCurrentTimeString();
    const defaultEnd = addMinutesToTimeString(defaultStart, 15);
    setHaccpFryingForm({
      production_order_id: targetOrderId || '',
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

    const startedAtIso = timeStringToIso(haccpFryingForm.start_time);
    const finishedAtIso = timeStringToIso(haccpFryingForm.end_time);
    const durationMinutes = calculateTimeDifferenceMinutes(haccpFryingForm.start_time, haccpFryingForm.end_time);

    const res = await createFryingBatch({
      production_order_id: haccpFryingForm.production_order_id || undefined,
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
        `Batch HACCP wajan #${haccpFryingForm.wajan_number} berhasil dicatat (${haccpFryingForm.output_weight_gram}g di longsong, ${haccpFryingForm.longsong_count} longsong, ${durationMinutes} mnt)`
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

  const handleOpenCreatePacking = (targetOrderId?: string) => {
    // Cari target SPK yang diminta secara langsung atau SPK yang masih butuh packing
    let target = targetOrderId
      ? friedOrdersData.find(d => d.order.id === targetOrderId)
      : (friedOrdersData.find(d => d.unpackedCount > 0) || friedOrdersData[0]);

    if (!target && orders.length > 0) {
      const order = orders.find(o => o.id === targetOrderId) || orders[0];
      target = {
        order,
        batches: [],
        totalLongsongProduced: availablePoolLongsong,
        totalOutputGram: 0,
        packedCount: 0,
        unpackedCount: availablePoolLongsong,
        totalPackagedPcs: 0,
      };
    }

    if (!target) {
      toast.warning('Buat SPK Produksi baru terlebih dahulu sebelum mencatat packing.');
      return;
    }

    const spkId = target.order.id;
    const nextLongsong = target.packedCount + 1;
    const avgWeightNum = target.totalLongsongProduced > 0 && target.totalOutputGram > 0
      ? Math.round(target.totalOutputGram / target.totalLongsongProduced)
      : 500;
    const avgWeightStr = String(avgWeightNum);

    // Auto-detect rasa, gramatur & tipe packaging dari varian target SPK
    const spkVariant = target.order.product_variant || '';
    const matchedFlavor = FLAVOR_VARIANTS.find(f => spkVariant.toLowerCase().includes(f.toLowerCase())) || 'Original';
    const matchedWeight = PACKAGING_WEIGHTS.find(w => spkVariant.toLowerCase().includes(w.value.toLowerCase()))?.value || '100g';
    const matchedType = PACKAGING_TYPES.find(t => spkVariant.toLowerCase().includes(t.toLowerCase())) || 'Standing Pouch';

    // Estimasi cerdas jumlah kemasan (pcs) & bumbu tabur (gram) sesuai standar resep
    const cleanPackGram = parseInt(matchedWeight.replace(/\D/g, ''), 10) || 100;
    const autoPcs = Math.max(1, Math.floor(avgWeightNum / cleanPackGram));
    const autoSeasoning = calculateRecipeSeasoningGram(matchedFlavor, String(autoPcs), matchedWeight, avgWeightStr) || Math.round(avgWeightNum * 0.08);

    setPackingForm({
      production_order_id: spkId,
      frying_batch_id: '',
      flavor_variant: matchedFlavor,
      longsong_number: String(nextLongsong),
      longsong_weight_gram: avgWeightStr,
      packaged_toples_count: String(autoPcs),
      packaging_type: matchedType,
      packaging_weight_gram: matchedWeight,
      seasoning_used_gram: String(autoSeasoning),
      longsongs_used_count: '1',
      defect_packaging_count: '0',
      notes: '',
    });
    setCreatePackingOpen(true);
  };

  const handleCreatePacking = async () => {
    if (!packingForm.production_order_id) {
      toast.error('Pilih SPK Produksi tujuan packing terlebih dahulu');
      return;
    }
    const pcs = Number(packingForm.packaged_toples_count);
    if (!packingForm.packaged_toples_count || isNaN(pcs) || pcs <= 0) {
      toast.error('Jumlah kemasan yang dihasilkan wajib diisi minimal 1 pcs');
      return;
    }

    setIsSavingPacking(true);
    try {
      const res = await createPackingEntry({
        production_order_id: packingForm.production_order_id,
        frying_batch_id: packingForm.frying_batch_id || undefined,
        flavor_variant: packingForm.flavor_variant,
        longsong_number: Number(packingForm.longsong_number) || 1,
        longsong_weight_gram: Number(packingForm.longsong_weight_gram) || undefined,
        packaged_toples_count: pcs,
        packaging_type: packingForm.packaging_type,
        packaging_weight_gram: packingForm.packaging_weight_gram,
        seasoning_used_gram: Number(packingForm.seasoning_used_gram) || 0,
        longsongs_used_count: Number(packingForm.longsongs_used_count) || 1,
        defect_packaging_count: Number(packingForm.defect_packaging_count) || 0,
        notes: packingForm.notes,
        is_packed: true,
      });

      if (res.success) {
        toast.success(`Packing #${packingForm.longsong_number} (${packingForm.flavor_variant}) ${pcs} pcs berhasil dicatat & masuk antrean inspeksi QC!`);
        setCreatePackingOpen(false);
        await loadData();
      } else {
        toast.error(res.error || 'Gagal membuat entri packing');
      }
    } catch (err: any) {
      console.error('handleCreatePacking error:', err);
      toast.error(err.message || 'Terjadi kesalahan sistem saat menyimpan packing');
    } finally {
      setIsSavingPacking(false);
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
      id: 'allocation',
      header: 'Alokasi SPK',
      cell: ({ row }) => {
        const orderId = row.original.production_order_id;
        const matchedOrder = orders.find(o => o.id === orderId);
        if (matchedOrder) {
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 6px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '11px',
                fontWeight: 600,
                background: 'var(--color-primary-50)',
                color: 'var(--color-primary-800)',
                border: '1px solid var(--color-primary-200)',
                width: 'fit-content',
              }}>
                {matchedOrder.batch_number}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                Target: {matchedOrder.target_quantity} kg
              </span>
            </div>
          );
        }
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 6px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '11px',
            fontWeight: 500,
            background: 'var(--bg-subtle)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-default)',
            width: 'fit-content',
          }}>
            Pool Curah Pabrik
          </span>
        );
      },
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
      cell: ({ row }) => {
        const temp = row.original.oil_temp_celsius;
        const isWarning = temp && (temp < 160 || temp > 180);
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Thermometer className={`w-3.5 h-3.5 ${isWarning ? 'text-[var(--color-danger-600)]' : 'text-[var(--color-danger-500)]'}`} aria-hidden="true" />
            <strong style={isWarning ? { color: 'var(--color-danger-700)' } : undefined}>{temp || '-'}°C</strong>
            {isWarning && (
              <span style={{ fontSize: '10px', background: 'var(--color-danger-100)', color: 'var(--color-danger-800)', padding: '1px 4px', borderRadius: '4px', fontWeight: 600 }}>
                {temp < 160 ? 'Rendah' : 'Tinggi'}
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: 'timer',
      accessorFn: (row) => getBatchElapsedSeconds(row) || 0,
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
                {!isManagement && (
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
                )}
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
            {!isManagement && (
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
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'output_weight_gram',
      header: 'Output Longsong (gram)',
      cell: ({ row }) => row.original.output_weight_gram ? (
        <div>
          <strong style={{ color: 'var(--color-success-700)' }}>
            {row.original.output_weight_gram.toLocaleString('id-ID')}g
          </strong>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
            Jamur + Kremesan
          </div>
        </div>
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
      id: 'status',
      accessorFn: (row) => row.finished_at ? 2 : row.started_at ? 1 : 0,
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
    ...(!isManagement ? [{
      id: 'actions',
      header: 'Aksi',
      cell: ({ row }: any) => {
        const batch = row.original;
        const isDone = !!batch.finished_at;
        const hasOutput = !!batch.output_weight_gram;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {isDone || hasOutput ? (
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Pencil className="w-3.5 h-3.5" aria-hidden="true" />}
                onClick={() => handleOpenEditFrying(batch)}
              >
                Edit Hasil
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Scale className="w-3.5 h-3.5" aria-hidden="true" />}
                onClick={() => handleOpenEditFrying(batch)}
              >
                Input Hasil
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteBatch(batch)}
              title="Batalkan wajan ini & kembalikan stok bahan baku"
              style={{ color: 'var(--color-danger-600)', padding: '6px' }}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        );
      },
    } as ColumnDef<DbFryingBatch>] : []),
  ], [getBatchElapsedSeconds, getBatchTimerStatus, nowTick, isManagement, orders, handleDeleteBatch, handlePauseBatchTimer, handleResetBatchTimer, handleResumeBatchTimer, handleStartBatchTimer]);

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
      accessorFn: (row) => {
        const order = orders.find(o => o.id === row.production_order_id) || row.production_order;
        return order?.batch_number || '';
      },
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
    ...(!isManagement ? [{
      id: 'actions',
      header: '',
      cell: ({ row }: any) => {
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
    } as ColumnDef<DbPackingEntry>] : []),
  ], [isManagement, handleMarkPacked, orders]);

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
        actions={isManagement ? (
          <span style={{ 
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '4px 12px', borderRadius: 'var(--radius-full)', 
            background: 'var(--color-primary-50)', color: 'var(--color-primary-700)', 
            fontSize: 'var(--text-xs)', fontWeight: 600, border: '1px solid var(--color-primary-200)' 
          }}>
            Investor / Read-Only Mode
          </span>
        ) : (
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button 
              variant="secondary" 
              onClick={() => { window.location.href = '/master/production-standards'; }}
              leftIcon={<Sliders size={16} aria-hidden="true" />}
            >
              Standar Resep (BOM)
            </Button>
            <Button 
              variant="primary" 
              onClick={() => handleOpenCreateSpk(activeTab === 'PACKING' ? 'PACKING' : 'FRYING')}
              leftIcon={<Plus size={16} aria-hidden="true" />}
            >
              {activeTab === 'PACKING' ? 'Buat SPK Packing Rasa' : 'Buat SPK Goreng Jamur'}
            </Button>
          </div>
        )}
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
                <Box className="w-5 h-5 text-[var(--color-primary-600)]" aria-hidden="true" />
                <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Total Output Jamur Curah</span>
              </div>
              <div style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--color-primary-700)' }}>
                {((fryingMetrics.totalOutputGramToday || 0) / 1000).toFixed(2)} <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-secondary)' }}>kilogram</span>
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 'var(--space-1)' }}>
                Jamur matang + kremesan di longsong
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

          {/* Antrean & Progres SPK Goreng Jamur */}
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 'var(--text-base)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Flame className="w-5 h-5 text-[var(--color-primary-600)]" aria-hidden="true" />
                  Antrean &amp; Progres SPK Penggorengan Jamur
                </h3>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Target kiloan bahan baku, realisasi wajan yang sudah digoreng, dan sisa kiloan yang harus diselesaikan.
                </div>
              </div>

              {!isManagement && (
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<Plus className="w-3.5 h-3.5" aria-hidden="true" />}
                  onClick={() => handleOpenCreateSpk('FRYING')}
                >
                  Buat SPK Goreng
                </Button>
              )}
            </div>

            {fryingOrdersWithProgress.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-4)', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
                Belum ada SPK Goreng aktif. Klik &quot;+ Buat SPK Goreng&quot; untuk menerbitkan perintah kerja baru.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border-default)', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase' }}>
                      <th style={{ padding: '8px 12px', fontWeight: 600 }}>No. SPK / Batch</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600 }}>Target Bahan</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600 }}>Realisasi Penggorengan</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600 }}>Sisa Kiloan</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600, minWidth: '160px' }}>Progres</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600 }}>Status</th>
                      {!isManagement && <th style={{ padding: '8px 12px', fontWeight: 600, textAlign: 'right' }}>Aksi</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {fryingOrdersWithProgress.map(({ order, targetKg, realizedKg, realizedBatchesCount, remainingKg, progressPercent, outputKg, longsongTotal }) => (
                      <tr key={order.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '10px 12px' }}>
                          <strong style={{ fontFamily: 'monospace', color: 'var(--color-primary-800)' }}>
                            {order.batch_number}
                          </strong>
                          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                            {order.start_date ? format(new Date(order.start_date), 'dd MMM yyyy', { locale: idLocale }) : '-'}
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <strong>{targetKg.toLocaleString('id-ID')} kg</strong>
                          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                            ~{Math.round(targetKg / 0.8)} wajan (@800g)
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ fontWeight: 600, color: 'var(--color-success-700)' }}>
                            {realizedKg.toFixed(1)} kg
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '4px' }}>
                            ({realizedBatchesCount} wajan)
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ fontWeight: 600, color: remainingKg > 0 ? 'var(--color-warning-800)' : 'var(--color-success-700)' }}>
                            {remainingKg.toFixed(1)} kg
                          </span>
                          {remainingKg > 0 && (
                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                              ~{Math.ceil(remainingKg / 0.8)} wajan lagi
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ flex: 1, background: 'var(--bg-subtle)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                              <div
                                style={{
                                  width: `${progressPercent}%`,
                                  height: '100%',
                                  background: progressPercent >= 100 ? 'var(--color-success-600)' : 'var(--color-primary-600)',
                                  borderRadius: '4px',
                                  transition: 'width 0.3s ease',
                                }}
                              />
                            </div>
                            <span style={{ fontSize: '11px', fontWeight: 700, minWidth: '36px', textAlign: 'right' }}>
                              {progressPercent}%
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <StatusBadge
                            status={order.status === 'COMPLETED' ? 'completed' : order.status === 'IN_PROGRESS' ? 'in_progress' : 'pending'}
                            label={order.status === 'COMPLETED' ? 'Selesai' : order.status === 'IN_PROGRESS' ? 'Sedang Jalan' : 'Menunggu'}
                          />
                        </td>
                        {!isManagement && (
                          <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                              {order.status !== 'COMPLETED' ? (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  leftIcon={<CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />}
                                  onClick={() => handleOpenRecordFryingRun(order)}
                                  title="Catat hasil goreng dan konsumsi bahan aktual setelah selesai masak"
                                >
                                  Catat Selesai Masak
                                </Button>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                                  <span style={{ fontSize: '11px', color: 'var(--color-success-700)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 inline" aria-hidden="true" />
                                    <span>Selesai ({longsongTotal} Longsong)</span>
                                  </span>
                                  <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                                    Output: {outputKg.toFixed(1)} kg • Rendemen {order.yield_percentage ? `${order.yield_percentage}%` : `${((outputKg / (realizedKg || 1)) * 100).toFixed(0)}%`}
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Action Bar */}
          {!isManagement && (
            <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center' }}>
              <Button
                variant="secondary"
                leftIcon={<Plus className="w-4 h-4" aria-hidden="true" />}
                onClick={() => handleOpenCreateRegularFrying()}
              >
                Goreng Curah (Tanpa SPK)
              </Button>
              <Button
                variant="secondary"
                leftIcon={<ClipboardCheck className="w-4 h-4" aria-hidden="true" />}
                onClick={() => handleOpenCreateHaccpFrying()}
              >
                Batch HACCP Time Study
              </Button>
            </div>
          )}

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
              {!isManagement && (
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus className="w-3.5 h-3.5" aria-hidden="true" />}
                  onClick={() => handleOpenCreatePacking()}
                >
                  Packing Sekarang
                </Button>
              )}
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
                  {!isManagement && (
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />}
                      onClick={() => handleOpenSubmitQc(d)}
                    >
                      Ajukan Ulang ke QC
                    </Button>
                  )}
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

              {!isManagement && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <Button variant="primary" leftIcon={<Plus className="w-4 h-4" aria-hidden="true" />} onClick={() => handleOpenCreatePacking()}>
                    Input Packing Rasa
                  </Button>
                </div>
              )}
            </div>

            {friedOrdersData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-4)', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
                Belum ada SPK Packing Retail aktif. Klik tombol &quot;Buat SPK Packing Rasa&quot; di bagian atas untuk menerbitkan SPK retail kemasan.
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
                      {!isManagement && <th style={{ padding: '8px 12px', fontWeight: 600, textAlign: 'right' }}>Aksi</th>}
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
                          {!isManagement && (
                            <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                                {s !== 'RELEASED' && s !== 'REJECTED' && (
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    leftIcon={<Box className="w-3.5 h-3.5" aria-hidden="true" />}
                                    onClick={() => handleOpenCreatePacking(item.order.id)}
                                    title="Buka form input packing rasa untuk SPK ini"
                                  >
                                    Packing SPK Ini
                                  </Button>
                                )}
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
                                    variant="secondary"
                                    size="sm"
                                    leftIcon={<ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />}
                                    onClick={() => handleOpenSubmitQc(item)}
                                    disabled={!hasPackaged}
                                    title={!hasPackaged ? 'Input packing terlebih dahulu' : 'Ajukan batch kemasan ini ke QC'}
                                  >
                                    Ajukan ke QC
                                  </Button>
                                )}
                              </div>
                            </td>
                          )}
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
      {/* MODAL: GORENG CURAH (TANPA SPK)                 */}
      {/* ═══════════════════════════════════════════════ */}
      <Modal
        isOpen={createRegularFryingOpen}
        onClose={() => setCreateRegularFryingOpen(false)}
        title={`Goreng Curah (Tanpa SPK) — Wajan #${regularFryingForm.wajan_number}`}
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
              Wajan ini dialokasikan untuk <strong>Penggorengan Curah Bebas (Tanpa SPK)</strong>, seperti sisa jamur segar atau uji coba adonan. Hasil matang akan otomatis masuk ke pool longsong jamur curah pabrik.
            </div>
          </div>

          <div style={{
            padding: '12px 14px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border-default)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '2px' }}>Alokasi Target Wajan</div>
              <strong style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                Pool Curah Pabrik (Khusus Tanpa SPK)
              </strong>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                Hasil penggorengan langsung masuk ke stok longsong curah untuk disiapkan ke tahap packing rasa.
              </div>
            </div>
            <span style={{
              padding: '3px 10px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--color-primary-50)',
              color: 'var(--color-primary-700)',
              fontSize: '11px',
              fontWeight: 600,
              border: '1px solid var(--color-primary-200)',
              whiteSpace: 'nowrap',
              marginLeft: '12px',
            }}>
              Tanpa SPK
            </span>
          </div>

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
            {regularFryingForm.oil_temp_celsius && (Number(regularFryingForm.oil_temp_celsius) < 160 || Number(regularFryingForm.oil_temp_celsius) > 180) && (
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-danger-600)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                <AlertTriangle size={12} /> Peringatan: Suhu di luar rekomendasi standar (160°C - 180°C)!
              </span>
            )}
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
                * Wajib mengisi waktu mulai, waktu selesai, output matang (&gt; 0g), dan jumlah longsong (&gt; 0)
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
          <FormField label="Alokasi Target Wajan (Opsional)">
            <Select
              options={[
                { value: '', label: 'Pool Curah Pabrik (Tanpa SPK Khusus)' },
                ...fryingOrdersWithProgress.map(({ order: o, targetKg, realizedKg, remainingKg, progressPercent }) => ({
                  value: o.id,
                  label: `SPK ${o.batch_number} (Target: ${targetKg}kg | Realisasi: ${realizedKg.toFixed(1)}kg | Sisa: ${remainingKg.toFixed(1)}kg | ${progressPercent}%)`,
                })),
              ]}
              value={haccpFryingForm.production_order_id}
              onChange={(e) => setHaccpFryingForm({ ...haccpFryingForm, production_order_id: e.target.value })}
            />
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: '4px', display: 'block' }}>
              Penggorengan wajan menghasilkan <strong>Jamur Crispy Polos (Curah)</strong>. Pemilihan varian rasa (Balado, BBQ, dll) dan kemasan dilakukan pada tahap <strong>Packing Rasa</strong>.
            </span>
          </FormField>

          {selectedHaccpSpkProgress && (
            <div style={{
              padding: '10px 12px',
              background: 'var(--color-primary-50)',
              border: '1px solid var(--color-primary-200)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              fontSize: 'var(--text-xs)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ color: 'var(--color-primary-900)' }}>
                  Target &amp; Realisasi SPK {selectedHaccpSpkProgress.order.batch_number}
                </strong>
                <span style={{ fontWeight: 700, color: 'var(--color-primary-700)' }}>
                  {selectedHaccpSpkProgress.progressPercent}% Tercapai
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', textAlign: 'center' }}>
                <div style={{ background: 'white', padding: '6px 4px', borderRadius: '4px', border: '1px solid var(--color-primary-100)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Target Bahan</span>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{selectedHaccpSpkProgress.targetKg} kg</div>
                </div>
                <div style={{ background: 'white', padding: '6px 4px', borderRadius: '4px', border: '1px solid var(--color-primary-100)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Realisasi</span>
                  <div style={{ fontWeight: 700, color: 'var(--color-success-700)' }}>
                    {selectedHaccpSpkProgress.realizedKg.toFixed(1)} kg ({selectedHaccpSpkProgress.realizedBatchesCount} wajan)
                  </div>
                </div>
                <div style={{ background: 'white', padding: '6px 4px', borderRadius: '4px', border: '1px solid var(--color-primary-100)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Sisa Target</span>
                  <div style={{ fontWeight: 700, color: selectedHaccpSpkProgress.remainingKg > 0 ? 'var(--color-warning-800)' : 'var(--color-success-700)' }}>
                    {selectedHaccpSpkProgress.remainingKg.toFixed(1)} kg
                  </div>
                </div>
              </div>
            </div>
          )}

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
            {haccpFryingForm.oil_temp_celsius && (Number(haccpFryingForm.oil_temp_celsius) < 160 || Number(haccpFryingForm.oil_temp_celsius) > 180) && (
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-danger-600)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                <AlertTriangle size={12} /> Peringatan: Suhu di luar rekomendasi standar (160°C - 180°C)!
              </span>
            )}
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
                <FormField label="Berat Output Matang (Jamur + Kremesan) (gram)" required>
                  <Input
                    type="number" min="1" required
                    value={haccpFryingForm.output_weight_gram}
                    onChange={(e) => setHaccpFryingForm({ ...haccpFryingForm, output_weight_gram: e.target.value })}
                    placeholder="650"
                  />
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: '2px', display: 'block' }}>
                    Total isi longsong (jamur matang &amp; kremesan tidak dipisah)
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
                Number(completeFryingForm.longsong_count) <= 0
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
            <FormField label="Berat Output Matang (Jamur + Kremesan) (gram)" required>
              <Input
                type="number" min="1" required
                value={completeFryingForm.output_weight_gram}
                onChange={(e) => setCompleteFryingForm({ ...completeFryingForm, output_weight_gram: e.target.value })}
                placeholder="650"
              />
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: '2px', display: 'block' }}>
                Total isi longsong (jamur matang &amp; kremesan tidak dipisah)
              </span>
            </FormField>

            <FormField label="Jumlah Longsong yang Dihasilkan" required>
              <Input
                type="number" min="1" required
                value={completeFryingForm.longsong_count}
                onChange={(e) => setCompleteFryingForm({ ...completeFryingForm, longsong_count: e.target.value })}
                placeholder="3"
              />
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: '2px', display: 'block' }}>
                Wajib diisi (min. 1 longsong)
              </span>
            </FormField>
          </div>

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
      {/* MODAL: REKAP SELESAI MASAK SPK (BAHAN AKTUAL)   */}
      {/* ═══════════════════════════════════════════════ */}
      <Modal
        isOpen={recordFryingRunOpen}
        onClose={() => setRecordFryingRunOpen(false)}
        title={`Rekap Selesai Masak — SPK ${selectedFryingOrder?.batch_number}`}
        size="lg"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
            <Button variant="secondary" onClick={() => setRecordFryingRunOpen(false)} disabled={isSubmittingFryingRun}>
              Batal
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmitFryingRun}
              leftIcon={<CheckCircle2 className="w-4 h-4" aria-hidden="true" />}
              disabled={
                isSubmittingFryingRun ||
                !fryingRunForm.actual_mushroom_kg ||
                Number(fryingRunForm.actual_mushroom_kg) <= 0 ||
                !fryingRunForm.output_finished_kg ||
                Number(fryingRunForm.output_finished_kg) <= 0 ||
                !fryingRunForm.output_longsong_count ||
                Number(fryingRunForm.output_longsong_count) <= 0
              }
            >
              {isSubmittingFryingRun ? 'Sedang Menyimpan...' : 'Simpan & Potong Stok Gudang'}
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {selectedFryingOrder && (() => {
            const targetMushroom = Number(selectedFryingOrder.target_quantity) || 50;
            const actualMushroom = parseFloat(fryingRunForm.actual_mushroom_kg) || 0;
            const actualPremix = parseFloat(fryingRunForm.actual_premix_kg) || 0;
            const actualOil = parseFloat(fryingRunForm.actual_cooking_oil_liter) || 0;
            const outputFinished = parseFloat(fryingRunForm.output_finished_kg) || 0;
            const longsongCount = parseInt(fryingRunForm.output_longsong_count, 10) || 0;

            // Standar BOM
            const bomPremix = targetMushroom * 0.25;
            const bomOil = targetMushroom * 0.30;
            const diffPremix = actualPremix - bomPremix;
            const diffOil = actualOil - bomOil;

            // Rendemen
            const yld = actualMushroom > 0 && outputFinished > 0 ? (outputFinished / actualMushroom) * 100 : 0;
            const isGoodYield = yld >= 65;

            return (
              <>
                {/* Header Information Banner */}
                <div style={{
                  padding: '12px 14px',
                  background: 'var(--color-primary-50)',
                  border: '1px solid var(--color-primary-200)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--color-primary-800)', textTransform: 'uppercase', fontWeight: 600 }}>
                      SPK Penggorengan Curah
                    </div>
                    <div style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--color-primary-900)' }}>
                      {selectedFryingOrder.batch_number}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', textAlign: 'right' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--color-primary-800)' }}>Target Jamur Segar</div>
                      <div style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--color-primary-900)' }}>
                        {targetMushroom} kg
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--color-primary-800)' }}>Estimasi Total Wajan</div>
                      <div style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--color-primary-900)' }}>
                        ~{Math.round(targetMushroom / 0.8)} wajan
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--text-secondary)',
                  background: 'var(--bg-subtle)',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  borderLeft: '3px solid var(--color-primary-600)',
                }}>
                  Catat pemakaian bahan baku riil yang dipakai di dapur (dari papan catatan dapur) serta hasil jamur matang curah yang masuk ke wadah longsong.
                </div>

                {/* Bagian 1: Bahan Baku Aktual (Dapur) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    1. Konsumsi Bahan Baku Riil di Dapur (Timbangan Aktual)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)' }}>
                    <FormField label="Jamur Tiram Segar (kg)" required>
                      <Input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={fryingRunForm.actual_mushroom_kg}
                        onChange={(e) => handleFryingRunMushroomChange(e.target.value)}
                        placeholder={`Misal: ${targetMushroom}`}
                      />
                      <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px', display: 'block' }}>
                        Standar SPK: {targetMushroom} kg
                      </span>
                    </FormField>

                    <FormField label="Tepung Premix (kg)" required>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        value={fryingRunForm.actual_premix_kg}
                        onChange={(e) => setFryingRunForm({ ...fryingRunForm, actual_premix_kg: e.target.value })}
                        placeholder={`Misal: ${bomPremix.toFixed(1)}`}
                      />
                      <div style={{ fontSize: '11px', marginTop: '2px', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-tertiary)' }}>BOM: {bomPremix.toFixed(1)} kg</span>
                        {actualPremix > 0 && (
                          <span style={{ fontWeight: 600, color: diffPremix > 0 ? 'var(--color-danger-700)' : 'var(--color-success-700)' }}>
                            {diffPremix > 0 ? `+${diffPremix.toFixed(1)}kg` : `${diffPremix.toFixed(1)}kg`}
                          </span>
                        )}
                      </div>
                    </FormField>

                    <FormField label="Minyak Goreng (Liter)" required>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        value={fryingRunForm.actual_cooking_oil_liter}
                        onChange={(e) => setFryingRunForm({ ...fryingRunForm, actual_cooking_oil_liter: e.target.value })}
                        placeholder={`Misal: ${bomOil.toFixed(1)}`}
                      />
                      <div style={{ fontSize: '11px', marginTop: '2px', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-tertiary)' }}>BOM: {bomOil.toFixed(1)} L</span>
                        {actualOil > 0 && (
                          <span style={{ fontWeight: 600, color: diffOil > 0 ? 'var(--color-danger-700)' : 'var(--color-success-700)' }}>
                            {diffOil > 0 ? `+${diffOil.toFixed(1)}L` : `${diffOil.toFixed(1)}L`}
                          </span>
                        )}
                      </div>
                    </FormField>
                  </div>
                </div>

                {/* Bagian 2: Hasil Jamur Matang Curah */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '8px', borderTop: '1px dashed var(--border-default)' }}>
                  <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    2. Hasil Output Jamur Matang Curah (WIP Longsong)
                  </div>

                  <div style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-primary-50)',
                    border: '1px solid var(--color-primary-200)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '11px',
                  }}>
                    <div>
                      <span style={{ color: 'var(--color-primary-800)' }}>
                        Patokan Target SPK: <strong>{targetMushroom} kg</strong> Jamur Segar
                      </span>
                      <div style={{ color: 'var(--color-primary-700)', marginTop: '2px' }}>
                        Estimasi output: ~{(actualMushroom * 0.67).toFixed(1)} kg (~{Math.max(1, Math.round((actualMushroom * 0.67) / 2.5))} wadah longsong @2.5 kg). Auto-Balance aktif.
                      </div>
                    </div>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                      background: 'white',
                      color: 'var(--color-primary-700)',
                      fontWeight: 600,
                      border: '1px solid var(--color-primary-300)',
                    }}>
                      Maks: {(actualMushroom * 1.25).toFixed(1)} kg
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                    <FormField label="Total Berat Jamur Matang + Kremesan (kg)" required>
                      <Input
                        type="number"
                        step="0.1"
                        min="0.1"
                        max={Number((actualMushroom * 1.25).toFixed(1)) || undefined}
                        value={fryingRunForm.output_finished_kg}
                        onChange={(e) => handleFryingRunOutputKgChange(e.target.value)}
                        placeholder={`Misal: ${(actualMushroom * 0.67).toFixed(1)}`}
                      />
                      <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px', display: 'block' }}>
                        Maksimal: {(actualMushroom * 1.25).toFixed(1)} kg (Auto-fill jumlah wadah)
                      </span>
                    </FormField>

                    <FormField label="Jumlah Wadah Longsong yang Terisi" required>
                      <Input
                        type="number"
                        min="1"
                        value={fryingRunForm.output_longsong_count}
                        onChange={(e) => handleFryingRunLongsongChange(e.target.value)}
                        placeholder={`Misal: ${Math.max(1, Math.round((actualMushroom * 0.67) / 2.5))}`}
                      />
                      <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px', display: 'block' }}>
                        Wadah tertutup (@2.5 kg/wadah, auto-balance)
                      </span>
                    </FormField>
                  </div>
                </div>

                {/* Bagian 3: Kalkulasi Efisiensi & Rendemen */}
                {outputFinished > 0 && actualMushroom > 0 && (
                  <div style={{
                    padding: 'var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    background: isGoodYield ? 'var(--color-success-50)' : 'var(--color-warning-50)',
                    border: `1px solid ${isGoodYield ? 'var(--color-success-300)' : 'var(--color-warning-300)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: isGoodYield ? 'var(--color-success-900)' : 'var(--color-warning-900)' }}>
                        Rendemen Produksi: {yld.toFixed(1)}%
                      </div>
                      <div style={{ fontSize: 'var(--text-xs)', color: isGoodYield ? 'var(--color-success-700)' : 'var(--color-warning-800)' }}>
                        {isGoodYield ? 'Memenuhi standar efisiensi dapur (≥ 65%)' : 'Di bawah standar efisiensi (target 65-70%)'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '11px' }}>
                      <div style={{ background: 'var(--bg-surface)', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-default)' }}>
                        Rasio Premix: <strong>{((actualPremix / actualMushroom) * 100).toFixed(1)}%</strong>
                      </div>
                      <div style={{ background: 'var(--bg-surface)', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-default)' }}>
                        Rata-rata/Longsong: <strong>{(outputFinished / (longsongCount || 1)).toFixed(2)} kg</strong>
                      </div>
                    </div>
                  </div>
                )}

                <FormField label="Catatan Tambahan (Opsional)">
                  <Textarea
                    rows={2}
                    value={fryingRunForm.notes}
                    onChange={(e) => setFryingRunForm({ ...fryingRunForm, notes: e.target.value })}
                    placeholder="Catatan kondisi minyak, api wajan, sisa adonan, dll..."
                  />
                </FormField>
              </>
            );
          })()}
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
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
            <Button variant="secondary" onClick={() => setCreatePackingOpen(false)} disabled={isSavingPacking}>
              Batal
            </Button>
            <Button
              variant="primary"
              onClick={handleCreatePacking}
              leftIcon={<Package className="w-4 h-4" aria-hidden="true" />}
              disabled={isSavingPacking}
            >
              {isSavingPacking ? 'Sedang Menyimpan...' : 'Simpan Packing'}
            </Button>
          </div>
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
                <strong>Belum Ada SPK Produksi Aktif</strong>
                <div style={{ fontSize: 'var(--text-xs)', marginTop: '2px' }}>
                  Silakan buat SPK baru terlebih dahulu untuk menentukan target varian rasa dan jumlah kemasan yang akan dipacking.
                </div>
              </div>
            </div>
          ) : (
            <>
              {availablePoolLongsong > 0 ? (
                <div style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-success-50)',
                  border: '1px solid var(--color-success-200)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-success-800)',
                }}>
                  <Sparkles className="w-4 h-4 text-[var(--color-success-600)] shrink-0" aria-hidden="true" />
                  <span>
                    Tersedia <strong>{availablePoolLongsong} longsong</strong> jamur matang curah dari wajan siap dibumbui &amp; dipacking.
                  </span>
                </div>
              ) : (
                <div style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-warning-50)',
                  border: '1px solid var(--color-warning-200)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-warning-800)',
                }}>
                  <Info className="w-4 h-4 text-[var(--color-warning-600)] shrink-0" aria-hidden="true" />
                  <span>
                    Stok selongsong matang saat ini 0. Pastikan wajan di Tab 1 sudah menyelesaikan penggorengan jamur.
                  </span>
                </div>
              )}

              <FormField label="Pilih Target SPK Produksi (Tujuan Packing)" required>
                <Select
                  options={friedOrdersData.map(item => ({
                    value: item.order.id,
                    label: `${item.order.batch_number} — ${item.order.product_variant || 'Jamur Crispy'} (Target: ${item.order.target_quantity || 0} pcs | Selesai: ${item.totalPackagedPcs} pcs)`,
                  }))}
                  value={packingForm.production_order_id}
                  onChange={(e) => {
                    const spkId = e.target.value;
                    const targetSpk = friedOrdersData.find(d => d.order.id === spkId);
                    const nextLongsongNum = targetSpk ? targetSpk.packedCount + 1 : 1;
                    const avgWeightNum = targetSpk && targetSpk.totalLongsongProduced > 0 && targetSpk.totalOutputGram > 0
                      ? Math.round(targetSpk.totalOutputGram / targetSpk.totalLongsongProduced)
                      : 500;
                    const spkVar = targetSpk?.order.product_variant || '';
                    const autoFlavor = FLAVOR_VARIANTS.find(f => spkVar.toLowerCase().includes(f.toLowerCase()));
                    const autoWeight = PACKAGING_WEIGHTS.find(w => spkVar.toLowerCase().includes(w.value.toLowerCase()))?.value || '100g';
                    const autoType = PACKAGING_TYPES.find(t => spkVar.toLowerCase().includes(t.toLowerCase()));
                    const cleanPack = parseInt(autoWeight.replace(/\D/g, ''), 10) || 100;
                    const autoPcs = Math.max(1, Math.floor(avgWeightNum / cleanPack));
                    const autoSeasoning = Math.round(avgWeightNum * 0.054) || 25;

                    setPackingForm(prev => ({
                      ...prev,
                      production_order_id: spkId,
                      frying_batch_id: '',
                      flavor_variant: autoFlavor || prev.flavor_variant,
                      packaging_type: autoType || prev.packaging_type,
                      packaging_weight_gram: autoWeight,
                      longsong_number: String(nextLongsongNum),
                      longsong_weight_gram: String(avgWeightNum),
                      packaged_toples_count: String(autoPcs),
                      seasoning_used_gram: String(autoSeasoning),
                    }));
                  }}
                />
              </FormField>
            </>
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
                        : 500);
                  const cleanPack = parseInt((packingForm.packaging_weight_gram || '100g').replace(/\D/g, ''), 10) || 100;
                  const autoPcs = Math.max(1, Math.floor(estWeight / cleanPack));
                  setPackingForm(prev => ({
                    ...prev,
                    frying_batch_id: batchId,
                    longsong_weight_gram: String(estWeight),
                    packaged_toples_count: String(autoPcs),
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
                onChange={(e) => {
                  const newFlavor = e.target.value;
                  const calcSeasoning = calculateRecipeSeasoningGram(
                    newFlavor,
                    packingForm.packaged_toples_count,
                    packingForm.packaging_weight_gram,
                    packingForm.longsong_weight_gram
                  );
                  setPackingForm(prev => ({
                    ...prev,
                    flavor_variant: newFlavor,
                    seasoning_used_gram: String(calcSeasoning),
                  }));
                }}
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
                onChange={(e) => {
                  const val = e.target.value;
                  const lsNum = Number(val) || 0;
                  const cleanPack = parseInt((packingForm.packaging_weight_gram || '60g').replace(/\D/g, ''), 10) || 60;
                  const autoPcs = lsNum > 0 ? Math.max(1, Math.floor(lsNum / cleanPack)) : '';
                  const calcSeasoning = calculateRecipeSeasoningGram(
                    packingForm.flavor_variant,
                    String(autoPcs || '1'),
                    packingForm.packaging_weight_gram,
                    val
                  );
                  setPackingForm(prev => ({
                    ...prev,
                    longsong_weight_gram: val,
                    ...(autoPcs ? { packaged_toples_count: String(autoPcs), seasoning_used_gram: String(calcSeasoning) } : {}),
                  }));
                }}
                placeholder="500"
              />
            </FormField>

            <FormField label="Bumbu Tabur (gram)" required>
              <div style={{ display: 'flex', gap: '6px' }}>
                <Input
                  type="number" min="0" step="0.1"
                  value={packingForm.seasoning_used_gram}
                  onChange={(e) => setPackingForm({ ...packingForm, seasoning_used_gram: e.target.value })}
                  placeholder="25"
                />
                <button
                  type="button"
                  onClick={() => {
                    const autoSeasoning = calculateRecipeSeasoningGram(
                      packingForm.flavor_variant,
                      packingForm.packaged_toples_count,
                      packingForm.packaging_weight_gram,
                      packingForm.longsong_weight_gram
                    );
                    setPackingForm(prev => ({ ...prev, seasoning_used_gram: String(autoSeasoning) }));
                    toast.info(`Takaran bumbu disinkronkan ke resep standar (${autoSeasoning}g)`);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '0 10px',
                    fontSize: '11px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-default)',
                    background: 'var(--bg-default)',
                    color: 'var(--color-primary-700)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    fontWeight: 500,
                  }}
                  title="Reset ke takaran resep standar otomatis"
                >
                  <RotateCcw className="w-3 h-3" aria-hidden="true" />
                  <span>Reset Resep</span>
                </button>
              </div>
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
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '6px' }}>
                {PACKAGING_WEIGHTS.map(w => (
                  <button
                    key={w.value}
                    type="button"
                    onClick={() => {
                      const cleanPack = parseInt(w.value.replace(/\D/g, ''), 10) || 60;
                      const lsNum = Number(packingForm.longsong_weight_gram) || 500;
                      const autoPcs = Math.max(1, Math.floor(lsNum / cleanPack));
                      const calcSeasoning = calculateRecipeSeasoningGram(
                        packingForm.flavor_variant,
                        String(autoPcs),
                        w.value,
                        packingForm.longsong_weight_gram
                      );
                      setPackingForm(prev => ({
                        ...prev,
                        packaging_weight_gram: w.value,
                        packaged_toples_count: String(autoPcs),
                        seasoning_used_gram: String(calcSeasoning),
                      }));
                    }}
                    style={{
                      padding: '2px 8px',
                      fontSize: '11px',
                      borderRadius: 'var(--radius-full)',
                      border: packingForm.packaging_weight_gram === w.value ? '1px solid var(--color-primary-600)' : '1px solid var(--border-default)',
                      background: packingForm.packaging_weight_gram === w.value ? 'var(--color-primary-600)' : 'var(--bg-default)',
                      color: packingForm.packaging_weight_gram === w.value ? '#fff' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontWeight: packingForm.packaging_weight_gram === w.value ? 600 : 400,
                    }}
                  >
                    {w.value}
                  </button>
                ))}
              </div>
              <Select
                options={PACKAGING_WEIGHTS.map(w => ({ value: w.value, label: w.label }))}
                value={packingForm.packaging_weight_gram}
                onChange={(e) => {
                  const newWeight = e.target.value;
                  const cleanPack = parseInt(newWeight.replace(/\D/g, ''), 10) || 60;
                  const lsNum = Number(packingForm.longsong_weight_gram) || 500;
                  const autoPcs = Math.max(1, Math.floor(lsNum / cleanPack));
                  const calcSeasoning = calculateRecipeSeasoningGram(
                    packingForm.flavor_variant,
                    String(autoPcs),
                    newWeight,
                    packingForm.longsong_weight_gram
                  );
                  setPackingForm(prev => ({
                    ...prev,
                    packaging_weight_gram: newWeight,
                    packaged_toples_count: String(autoPcs),
                    seasoning_used_gram: String(calcSeasoning),
                  }));
                }}
              />
            </FormField>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <FormField label="Jumlah Kemasan Jadi (pcs)" required>
              <Input
                type="number" min="1"
                value={packingForm.packaged_toples_count}
                onChange={(e) => {
                  const newPcs = e.target.value;
                  const calcSeasoning = calculateRecipeSeasoningGram(
                    packingForm.flavor_variant,
                    newPcs,
                    packingForm.packaging_weight_gram,
                    packingForm.longsong_weight_gram
                  );
                  setPackingForm(prev => ({
                    ...prev,
                    packaged_toples_count: newPcs,
                    seasoning_used_gram: String(calcSeasoning),
                  }));
                }}
                placeholder="Contoh: 5"
              />
            </FormField>

            <FormField label="Longsong Fisik Digunakan" required>
              <Input
                type="number" min="1"
                value={packingForm.longsongs_used_count}
                onChange={(e) => setPackingForm({ ...packingForm, longsongs_used_count: e.target.value })}
                placeholder="1"
              />
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: '2px', display: 'block' }}>
                Baskom jamur matang yang dihabiskan
              </span>
            </FormField>
          </div>

          <FormField label="Kemasan Rusak / Scrap Saat Seal (pcs)">
            <Input
              type="number" min="0"
              value={packingForm.defect_packaging_count}
              onChange={(e) => setPackingForm({ ...packingForm, defect_packaging_count: e.target.value })}
              placeholder="0"
            />
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: '2px', display: 'block' }}>
              Jumlah standing pouch / toples yang rusak saat pengisian/sealing (opsional)
            </span>
          </FormField>

          {/* Live Kalkulasi & Integrasi Warehouse Box */}
          <div style={{
            padding: '12px 14px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-primary-50)',
            border: '1px solid var(--color-primary-200)',
            fontSize: 'var(--text-xs)',
            color: 'var(--color-primary-900)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}>
            <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles className="w-4 h-4 text-[var(--color-primary-600)]" aria-hidden="true" />
                <span>Integrasi Resep Bumbu &amp; Stok Bahan Baku Warehouse:</span>
              </div>
              <span style={{
                background: 'var(--color-primary-600)',
                color: '#fff',
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
                fontSize: '11px',
                fontWeight: 600,
              }}>
                Resep {packingForm.flavor_variant}: {(matchedSeasoningInfo.ratio * 100).toFixed(0)}% ({Math.round(matchedSeasoningInfo.ratio * 1000)}g/kg)
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '2px' }}>
              {/* Kolom 1: Bumbu Tabur */}
              <div style={{
                background: '#fff',
                padding: '8px 10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-primary-200)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, marginBottom: '2px' }}>
                  <Scale className="w-3.5 h-3.5 text-[var(--color-primary-600)]" aria-hidden="true" />
                  <span>Bumbu Tabur:</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {matchedSeasoningInfo.matchedRm?.name || matchedSeasoningInfo.recipeName}
                </div>
                <div style={{ marginTop: '4px', fontSize: '12px', fontWeight: 600 }}>
                  Dibutuhkan: <span style={{ color: 'var(--color-primary-700)' }}>{packingForm.seasoning_used_gram || '0'} gram</span>
                </div>
                <div style={{ fontSize: '10px', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {matchedSeasoningInfo.isStockSufficient ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" aria-hidden="true" />
                      <span className="text-emerald-700">
                        Stok Gudang: {matchedSeasoningInfo.availableStockInGram !== null ? `${matchedSeasoningInfo.availableStockInGram.toLocaleString('id-ID')}g` : 'Tersedia'}
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3 h-3 text-amber-600" aria-hidden="true" />
                      <span className="text-amber-700 font-medium">
                        Stok Gudang Kurang ({matchedSeasoningInfo.availableStockInGram?.toLocaleString('id-ID') || 0}g)
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Kolom 2: Kemasan Fisik */}
              <div style={{
                background: '#fff',
                padding: '8px 10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-primary-200)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, marginBottom: '2px' }}>
                  <Package className="w-3.5 h-3.5 text-[var(--color-primary-600)]" aria-hidden="true" />
                  <span>Kemasan Fisik:</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {matchedPackagingInfo.matchedRm?.name || `${packingForm.packaging_type} ${packingForm.packaging_weight_gram}`}
                </div>
                <div style={{ marginTop: '4px', fontSize: '12px', fontWeight: 600 }}>
                  Dibutuhkan: <span style={{ color: 'var(--color-primary-700)' }}>{matchedPackagingInfo.neededPcs} pcs</span>
                </div>
                <div style={{ fontSize: '10px', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {matchedPackagingInfo.isStockSufficient ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" aria-hidden="true" />
                      <span className="text-emerald-700">
                        Stok Gudang: {matchedPackagingInfo.availableStock !== null ? `${matchedPackagingInfo.availableStock.toLocaleString('id-ID')} pcs` : 'Tersedia'}
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3 h-3 text-amber-600" aria-hidden="true" />
                      <span className="text-amber-700 font-medium">
                        Stok Kemasan Kurang ({matchedPackagingInfo.availableStock || 0} pcs)
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div style={{ color: 'var(--color-primary-800)', fontSize: '11px', lineHeight: 1.4, borderTop: '1px dashed var(--color-primary-200)', paddingTop: '6px' }}>
              Saat disimpan, sistem secara otomatis memotong <strong>{packingForm.seasoning_used_gram || '0'}g bumbu {packingForm.flavor_variant}</strong> dan <strong>{matchedPackagingInfo.neededPcs} pcs kemasan</strong> dari warehouse bahan baku, serta meneruskan hasil packing ke antrean inspeksi Quality Control (QC).
            </div>
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



      {/* SPK Creation Modal */}
      {/* SPK Creation Modal */}
      <Modal
        isOpen={createSpkOpen}
        onClose={() => setCreateSpkOpen(false)}
        title={spkType === 'FRYING' ? 'Buat SPK Penggorengan Jamur Curah' : 'Buat SPK Packing Rasa'}
        size="md"
        footer={
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', width: '100%' }}>
            <Button variant="ghost" onClick={() => setCreateSpkOpen(false)} disabled={isCreatingSpk}>Batal</Button>
            <Button variant="primary" onClick={handleCreateSpk} loading={isCreatingSpk}>
              {spkType === 'FRYING' ? 'Buat SPK Goreng Jamur' : 'Buat SPK Packing'}
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Form Content by Type */}
          {spkType === 'FRYING' ? (
            <>
              <div style={{
                padding: '10px 14px',
                background: 'var(--color-primary-50)',
                border: '1px solid var(--color-primary-200)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-xs)',
                color: 'var(--color-primary-900)',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}>
                <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Flame size={14} className="text-[var(--color-primary-600)]" />
                  Penggorengan Jamur Crispy Polos (Curah)
                </div>
                <div style={{ color: 'var(--color-primary-800)', lineHeight: 1.4 }}>
                  Pada tahap penggorengan, jamur digoreng original curah menjadi stok Longsong. Pemilihan varian bumbu rasa (Balado, BBQ, Pedas Manis, dll) dan jenis kemasan dilakukan pada tahap SPK Packing.
                </div>
              </div>

              <div style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-default)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Hasil Output Produksi</div>
                  <strong style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                    Jamur Crispy Polos (Curah / Longsong)
                  </strong>
                </div>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--color-success-50)',
                  color: 'var(--color-success-700)',
                  fontSize: '11px',
                  fontWeight: 600,
                  border: '1px solid var(--color-success-200)',
                }}>
                  WIP / Polos Curah
                </span>
              </div>

              <FormField label="Target Input Jamur Tiram Segar (kg)" required>
                <Input
                  type="number"
                  min="1"
                  step="0.5"
                  value={spkForm.target_quantity}
                  onChange={(e) => setSpkForm({ ...spkForm, target_quantity: e.target.value })}
                  placeholder="Misal: 50"
                />
              </FormField>

              {/* Dynamic BOM Estimation */}
              {parseFloat(spkForm.target_quantity) > 0 && (
                <div style={{
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-default)',
                }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Estimasi Kebutuhan Bahan Baku (Standar BOM)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: 'var(--text-xs)' }}>
                    <div style={{ background: 'var(--bg-surface)', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-default)' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Jamur Segar:</span>
                      <div style={{ fontWeight: 700, color: 'var(--color-success-700)', fontSize: '13px' }}>
                        {parseFloat(spkForm.target_quantity).toLocaleString('id-ID')} kg
                      </div>
                    </div>
                    <div style={{ background: 'var(--bg-surface)', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-default)' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Tepung Premix (25%):</span>
                      <div style={{ fontWeight: 700, color: '#7e22ce', fontSize: '13px' }}>
                        {(parseFloat(spkForm.target_quantity) * 0.25).toFixed(2)} kg
                      </div>
                    </div>
                    <div style={{ background: 'var(--bg-surface)', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-default)' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Minyak Goreng (30%):</span>
                      <div style={{ fontWeight: 700, color: '#a16207', fontSize: '13px' }}>
                        {(parseFloat(spkForm.target_quantity) * 0.30).toFixed(2)} Liter
                      </div>
                    </div>
                    <div style={{ background: 'var(--bg-surface)', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-default)' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Estimasi Wajan:</span>
                      <div style={{ fontWeight: 700, color: 'var(--color-primary-700)', fontSize: '13px' }}>
                        ~{Math.round(parseFloat(spkForm.target_quantity) / 0.8)} Batch (@800g)
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div style={{
                padding: '10px 14px',
                background: 'var(--color-warning-50)',
                border: '1px solid var(--color-warning-200)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-xs)',
                color: 'var(--color-warning-900)',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}>
                <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Package size={14} className="text-[var(--color-warning-700)]" />
                  Pembumbuan Rasa &amp; Pengemasan Retail
                </div>
                <div style={{ color: 'var(--color-warning-800)', lineHeight: 1.4 }}>
                  Menggunakan stok Longsong Jamur Curah matang dari hasil penggorengan untuk dibumbui dan dikemas sesuai target pesanan/penjualan.
                </div>
              </div>

              <FormField label="Varian Produk & Kemasan (Hasil Akhir)" required>
                <Select
                  options={[
                    { value: '', label: '-- Pilih Varian Produk Retail (Master Data) --' },
                    ...products.map(p => ({ value: p.id, label: `${p.name}${p.sku ? ` (${p.sku})` : ''}` }))
                  ]}
                  value={spkForm.product_id}
                  onChange={(e) => setSpkForm({ ...spkForm, product_id: e.target.value })}
                />
              </FormField>

              <FormField label="Target Jumlah Produksi (Kemasan / Pcs)" required>
                <Input
                  type="number"
                  min="1"
                  value={spkForm.target_quantity}
                  onChange={(e) => setSpkForm({ ...spkForm, target_quantity: e.target.value })}
                  placeholder="Misal: 500"
                />
              </FormField>
            </>
          )}

          <FormField label="Tanggal Mulai Produksi" required>
            <Input
              type="date"
              value={spkForm.start_date}
              onChange={(e) => setSpkForm({ ...spkForm, start_date: e.target.value })}
            />
          </FormField>

          <FormField label="Catatan Tambahan (Opsional)">
            <Textarea
              rows={2}
              value={spkForm.notes}
              onChange={(e) => setSpkForm({ ...spkForm, notes: e.target.value })}
              placeholder={spkType === 'FRYING' ? 'Instruksi khusus untuk tim penggorengan...' : 'Instruksi khusus untuk tim packing...'}
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
