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
  ArrowLeft,
  ArrowRight,
  Lock,
  Zap,
  Check,
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
  getLongsongContainers,
  createLongsongContainer,
  updateLongsongContainer,
  deleteLongsongContainer,
  updateProductionOrder,
  deleteProductionOrder,
  updateFryingBatch,
  createPackingEntry,
  updatePackingEntry,
  deletePackingEntry,
  consumeLongsongForPacking,
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
import type { DbProductionOrder, DbProduct, DbRawMaterial, DbFryingBatch, DbPackingEntry, DbLongsongContainer, ProductionStandardConfig, FlavorVariant, BomRecipe, BomIngredientItem } from '@/types/database';
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
// FORM DRAFT PERSISTENCE HELPERS
// ─────────────────────────────────────────────
function getFormDraft<T = any>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function saveFormDraft<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // ignore
  }
}

function clearFormDraft(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

function DraftNoticeBanner({
  onReset,
  onClear,
  label = 'Draft sebelumnya dipulihkan otomatis.',
}: {
  onReset?: () => void;
  onClear?: () => void;
  label?: string;
}): React.ReactElement {
  const handleReset = onReset || onClear || (() => {});
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '8px 12px',
      borderRadius: 'var(--radius-md)',
      background: 'var(--bg-subtle)',
      border: '1px solid var(--border-default)',
      fontSize: '11px',
      color: 'var(--text-secondary)',
      marginBottom: 'var(--space-3)',
    }}>
      <span>{label}</span>
      <button
        type="button"
        onClick={handleReset}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--color-danger-600)',
          fontSize: '11px',
          fontWeight: 600,
          cursor: 'pointer',
          padding: '2px 6px',
          borderRadius: 'var(--radius-sm)',
        }}
      >
        Bersihkan Form
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN PAGE COMPONENT
// ─────────────────────────────────────────────

export default function ProductionPage() {
  const { user } = useAuth();
  const isManagement = user?.role === 'MANAGEMENT';
  const [activeTab, setActiveTab] = useState<'FRYING' | 'PACKING'>('FRYING');
  const toast = useToast();

  // Sync activeTab with URL query parameter ?tab=packing
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab')?.toUpperCase();
      if (tabParam === 'PACKING' || tabParam === 'FRYING') {
        setActiveTab(tabParam as any);
      }
    }
  }, []);

  // ── Shared state ──
  const [orders, setOrders] = useState<DbProductionOrder[]>([]);
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [rawMaterials, setRawMaterials] = useState<(DbRawMaterial & { available_stock?: number })[]>([]);
  const [productionStandards, setProductionStandards] = useState<ProductionStandardConfig | null>(null);
  const [longsongContainers, setLongsongContainers] = useState<DbLongsongContainer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // ── SPK Creation state ──
  const [createSpkOpen, setCreateSpkOpen] = useState(false);
  const [isCreatingSpk, setIsCreatingSpk] = useState(false);
  const [spkType, setSpkType] = useState<'FRYING' | 'PACKING'>('FRYING');
  const [spkForm, setSpkForm] = useState(() => {
    return getFormDraft<{
      spk_type: 'FRYING' | 'PACKING';
      product_id: string;
      target_quantity: string;
      start_date: string;
      notes: string;
    }>('draft_prod_spk') || {
      spk_type: 'FRYING' as 'FRYING' | 'PACKING',
      product_id: '',
      target_quantity: '50',
      start_date: format(new Date(), 'yyyy-MM-dd'),
      notes: '',
    };
  });

  useEffect(() => {
    if (spkForm.product_id || spkForm.notes || (spkForm.target_quantity && spkForm.target_quantity !== '50' && spkForm.target_quantity !== '200')) {
      saveFormDraft('draft_prod_spk', spkForm);
    }
  }, [spkForm]);

  const handleOpenCreateSpk = useCallback((type?: 'FRYING' | 'PACKING') => {
    const selected = type || (activeTab === 'PACKING' ? 'PACKING' : 'FRYING');
    setSpkType(selected);
    const saved = getFormDraft<typeof spkForm>('draft_prod_spk');
    if (saved && (saved.product_id || saved.notes || (saved.target_quantity && saved.target_quantity !== '50' && saved.target_quantity !== '200'))) {
      setSpkForm(saved);
      toast.info('Draft SPK sebelumnya berhasil dipulihkan');
    } else {
      setSpkForm({
        spk_type: selected,
        product_id: '',
        target_quantity: selected === 'FRYING' ? '50' : '200',
        start_date: format(new Date(), 'yyyy-MM-dd'),
        notes: '',
      });
    }
    setCreateSpkOpen(true);
  }, [activeTab, toast]);

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
  const [spkBatchesModalOpen, setSpkBatchesModalOpen] = useState(false);
  const [selectedSpkForBatches, setSelectedSpkForBatches] = useState<DbProductionOrder | null>(null);

  const handleOpenSpkBatches = (order: DbProductionOrder) => {
    setSelectedSpkForBatches(order);
    setSpkBatchesModalOpen(true);
  };

  // 1. Regular Frying Form (Standar Persiapan Wajan & Real-time Stopwatch)
  const [regularFryingForm, setRegularFryingForm] = useState(() => {
    return getFormDraft<{
      production_order_id: string;
      wajan_number: string;
      batch_weight_gram: string;
      oil_temp_celsius: string;
      notes: string;
    }>('draft_prod_regular_frying') || {
      production_order_id: '',
      wajan_number: '1',
      batch_weight_gram: '800',
      oil_temp_celsius: '170',
      notes: '',
    };
  });

  useEffect(() => {
    if (regularFryingForm.notes || (regularFryingForm.batch_weight_gram && regularFryingForm.batch_weight_gram !== '800') || (regularFryingForm.oil_temp_celsius && regularFryingForm.oil_temp_celsius !== '170')) {
      saveFormDraft('draft_prod_regular_frying', regularFryingForm);
    }
  }, [regularFryingForm]);

  // 2. HACCP Time Study Form (Catatan Jam Dinding & Wajib Hasil Goreng)
  const [haccpFryingForm, setHaccpFryingForm] = useState(() => {
    return getFormDraft<{
      production_order_id: string;
      wajan_number: string;
      batch_weight_gram: string;
      oil_temp_celsius: string;
      start_time: string;
      end_time: string;
      output_weight_gram: string;
      longsong_count: string;
      kremesan_weight_gram: string;
      notes: string;
    }>('draft_prod_haccp_frying') || {
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
    };
  });

  useEffect(() => {
    if (haccpFryingForm.output_weight_gram || haccpFryingForm.longsong_count || haccpFryingForm.notes) {
      saveFormDraft('draft_prod_haccp_frying', haccpFryingForm);
    }
  }, [haccpFryingForm]);

  // 3. Complete / Edit Frying Form (Untuk Input/Edit Hasil di Tabel)
  const [completeFryingForm, setCompleteFryingForm] = useState({
    output_weight_gram: '',
    longsong_count: '',
    kremesan_weight_gram: '0',
    notes: '',
  });

  useEffect(() => {
    if (selectedFryingBatch?.id && (completeFryingForm.output_weight_gram || completeFryingForm.longsong_count || completeFryingForm.notes)) {
      saveFormDraft(`draft_prod_complete_${selectedFryingBatch.id}`, completeFryingForm);
    }
  }, [completeFryingForm, selectedFryingBatch]);

  // 4. Rekap Selesai Masak SPK Goreng (Run Selesai - Bahan Aktual vs Standar BOM)
  const [recordFryingRunOpen, setRecordFryingRunOpen] = useState(false);
  const [selectedFryingOrder, setSelectedFryingOrder] = useState<DbProductionOrder | null>(null);
  const [fryingRunTab, setFryingRunTab] = useState<'BAHAN' | 'LONGSONG' | 'BATCH'>('BAHAN');
  const [fryingRunForm, setFryingRunForm] = useState<{
    actual_mushroom_kg: string;
    actual_premix_kg: string;
    actual_cooking_oil_liter: string;
    output_finished_kg: string;
    output_longsong_count: string;
    batch_count: string;
    notes: string;
    containers: { container_number: number; weight_kg: string }[];
    batches: {
      wajan_number: number;
      batch_weight_gram: string;
      duration_minutes: string;
      oil_temp_celsius: string;
      notes?: string;
    }[];
  }>({
    actual_mushroom_kg: '',
    actual_premix_kg: '',
    actual_cooking_oil_liter: '',
    output_finished_kg: '',
    output_longsong_count: '',
    batch_count: '',
    notes: '',
    containers: [],
    batches: [],
  });
  const [isSubmittingFryingRun, setIsSubmittingFryingRun] = useState(false);
  const [underTargetConfirmOpen, setUnderTargetConfirmOpen] = useState(false);
  const [underTargetData, setUnderTargetData] = useState<{
    targetKg: number;
    prevInputKg: number;
    currentMushroomKg: number;
    totalInputKg: number;
    shortageKg: number;
    pct: number;
  } | null>(null);

  const isRegularFryingValid = useMemo(() => {
    return (
      !!regularFryingForm.oil_temp_celsius &&
      !!regularFryingForm.batch_weight_gram &&
      Number(regularFryingForm.batch_weight_gram) > 0
    );
  }, [regularFryingForm]);

  const isHaccpFryingValid = useMemo(() => {
    const duration = calculateTimeDifferenceMinutes(haccpFryingForm.start_time, haccpFryingForm.end_time);
    return (
      !!haccpFryingForm.oil_temp_celsius &&
      !!haccpFryingForm.start_time &&
      !!haccpFryingForm.end_time &&
      duration > 0 &&
      duration <= 30 &&
      !!haccpFryingForm.output_weight_gram &&
      Number(haccpFryingForm.output_weight_gram) > 0 &&
      !!haccpFryingForm.longsong_count &&
      Number(haccpFryingForm.longsong_count) > 0
    );
  }, [haccpFryingForm]);

  // ── SPK Edit state ──
  const [editSpkOpen, setEditSpkOpen] = useState(false);
  const [selectedSpkForEdit, setSelectedSpkForEdit] = useState<DbProductionOrder | null>(null);
  const [editSpkForm, setEditSpkForm] = useState({
    target_quantity: '',
    start_date: '',
    notes: '',
  });
  const [isUpdatingSpk, setIsUpdatingSpk] = useState(false);

  // ── Longsong CRUD states ──
  const [createLongsongOpen, setCreateLongsongOpen] = useState(false);
  const [createLongsongForm, setCreateLongsongForm] = useState({
    production_order_id: '',
    container_number: '1',
    initial_weight_kg: '2.5',
    notes: '',
  });
  const [isCreatingLongsong, setIsCreatingLongsong] = useState(false);

  const [editLongsongOpen, setEditLongsongOpen] = useState(false);
  const [selectedLongsongForEdit, setSelectedLongsongForEdit] = useState<DbLongsongContainer | null>(null);
  const [editLongsongForm, setEditLongsongForm] = useState({
    current_weight_kg: '',
    status: 'AVAILABLE' as 'AVAILABLE' | 'PARTIAL' | 'EMPTY',
    notes: '',
  });
  const [isUpdatingLongsong, setIsUpdatingLongsong] = useState(false);

  // ── Packing state ──
  const [packingEntries, setPackingEntries] = useState<DbPackingEntry[]>([]);
  const [createPackingOpen, setCreatePackingOpen] = useState(false);
  const [isSavingPacking, setIsSavingPacking] = useState(false);
  const [packingNavTab, setPackingNavTab] = useState<'PACKAGING' | 'BUMBU'>('PACKAGING');
  const [packingForm, setPackingForm] = useState({
    production_order_id: '',
    seasoning_material_id: '',
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

  useEffect(() => {
    if (selectedFryingOrder?.id && (fryingRunForm.actual_mushroom_kg || fryingRunForm.output_finished_kg || fryingRunForm.notes || fryingRunForm.batch_count)) {
      saveFormDraft(`draft_prod_frying_run_${selectedFryingOrder.id}`, fryingRunForm);
    }
  }, [fryingRunForm, selectedFryingOrder]);

  useEffect(() => {
    if (packingForm.packaged_toples_count || packingForm.notes || (packingForm.seasoning_used_gram && packingForm.seasoning_used_gram !== '0')) {
      saveFormDraft('draft_prod_packing', packingForm);
    }
  }, [packingForm]);

  // ── Packing Detail & Edit State ──
  const [detailPackingModal, setDetailPackingModal] = useState<{ isOpen: boolean; entry: DbPackingEntry | null }>({
    isOpen: false,
    entry: null,
  });
  const [editPackingModal, setEditPackingModal] = useState<{ isOpen: boolean; entry: DbPackingEntry | null }>({
    isOpen: false,
    entry: null,
  });
  const [editPackingForm, setEditPackingForm] = useState({
    flavor_variant: 'Original',
    packaging_type: 'Standing Pouch',
    packaging_weight_gram: '100g',
    packaged_toples_count: '',
    seasoning_used_gram: '0',
    longsong_weight_gram: '',
    defect_packaging_count: '0',
    notes: '',
  });
  const [isSavingEditPacking, setIsSavingEditPacking] = useState(false);

  // ── Standar Resep Bumbu Tabur & Kemasan Packing ──
  const getSeasoningRatioForVariant = useCallback((variantName: string): { ratio: number; name: string } => {
    const vLower = variantName.toLowerCase();
    if (vLower.includes('original') || vLower.includes('ori')) return { ratio: 0.0, name: 'Tanpa Bumbu (Original)' };
    const standardList = productionStandards?.seasoning_per_variant;
    const matched = standardList?.find(s => s.variant.toLowerCase() === variantName.toLowerCase());
    if (matched) {
      return {
        ratio: Number(matched.seasoning_ratio_per_kg) || 0.08,
        name: matched.seasoning_name || `Bumbu Tabur ${variantName}`,
      };
    }
    if (vLower.includes('super pedas')) return { ratio: 0.10, name: 'Bumbu Tabur Super Pedas' };
    return { ratio: 0.08, name: `Bumbu Tabur ${variantName}` };
  }, [productionStandards]);

  // ── Standar Resep BOM Penggorengan (Premix, Minyak, Jamur Dinamis dari Standar) ──
  const getFryingBomRatios = useCallback((order?: DbProductionOrder | null, variantName?: string) => {
    const standards = productionStandards;
    const recipes = standards?.bom_recipes || [];
    const baseRecipe = recipes[0];
    
    // Cari resep varian yang cocok atau fallback ke resep dasar pertama
    let recipe: BomRecipe | undefined;
    const targetVariant = (variantName || order?.product_variant || '').toLowerCase();
    const prodId = order?.product_id;

    if (recipes.length > 0) {
      if (prodId || targetVariant) {
        recipe = recipes.find(r => 
          (prodId && r.product_id === prodId) ||
          (targetVariant && r.product_name && r.product_name.toLowerCase().includes(targetVariant)) ||
          (targetVariant && r.product_name && targetVariant.includes(r.product_name.toLowerCase()))
        );
      }
      if (!recipe) {
        recipe = baseRecipe;
      }
    }

    let premixRatio = 0.25;
    let oilRatio = 0.30;
    let mushroomRatio = 1.0;

    const findInIngredients = (ingredients?: BomIngredientItem[]) => {
      if (!ingredients || ingredients.length === 0) return null;
      const premix = ingredients.find(i => {
        const n = (i.name || '').toLowerCase();
        return n.includes('premix') || n.includes('tepung');
      });
      const oil = ingredients.find(i => {
        const n = (i.name || '').toLowerCase();
        return n.includes('minyak');
      });
      const mushroom = ingredients.find(i => {
        const n = (i.name || '').toLowerCase();
        return n.includes('jamur');
      });
      return {
        premix: premix?.ratio_per_kg,
        oil: oil?.ratio_per_kg,
        mushroom: mushroom?.ratio_per_kg,
      };
    };

    const specificIngs = findInIngredients(recipe?.ingredients);
    const baseIngs = findInIngredients(baseRecipe?.ingredients);

    if (specificIngs?.premix !== undefined) {
      premixRatio = specificIngs.premix;
    } else if (baseIngs?.premix !== undefined) {
      premixRatio = baseIngs.premix;
    } else if (typeof recipe?.premix_flour_ratio === 'number') {
      premixRatio = recipe.premix_flour_ratio;
    } else if (typeof baseRecipe?.premix_flour_ratio === 'number') {
      premixRatio = baseRecipe.premix_flour_ratio;
    }

    if (specificIngs?.oil !== undefined) {
      oilRatio = specificIngs.oil;
    } else if (baseIngs?.oil !== undefined) {
      oilRatio = baseIngs.oil;
    } else if (typeof recipe?.cooking_oil_ratio === 'number') {
      oilRatio = recipe.cooking_oil_ratio;
    } else if (typeof baseRecipe?.cooking_oil_ratio === 'number') {
      oilRatio = baseRecipe.cooking_oil_ratio;
    }

    if (specificIngs?.mushroom !== undefined) {
      mushroomRatio = specificIngs.mushroom;
    } else if (baseIngs?.mushroom !== undefined) {
      mushroomRatio = baseIngs.mushroom;
    } else if (typeof recipe?.raw_mushroom_ratio === 'number') {
      mushroomRatio = recipe.raw_mushroom_ratio;
    } else if (typeof baseRecipe?.raw_mushroom_ratio === 'number') {
      mushroomRatio = baseRecipe.raw_mushroom_ratio;
    }

    const defaultBatchGram = Number(standards?.default_batch_weight_gram) || 800;
    const batchWeightKg = defaultBatchGram > 0 ? defaultBatchGram / 1000 : 0.8;

    return {
      premixRatio,
      oilRatio,
      mushroomRatio,
      batchWeightKg,
      defaultBatchGram,
      recipe: recipe || baseRecipe,
    };
  }, [productionStandards]);

  const calculateRecipeSeasoningGram = useCallback((
    flavor: string,
    packCountStr: string,
    packWeightStr: string,
    longsongWeightStr?: string
  ): number => {
    if (flavor.toLowerCase().includes('ori') || flavor.toLowerCase() === 'original') return 0;
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

  // Deteksi otomatis rasa & berat kemasan dari SPK tujuan packing (misal Balado 60g atau Original 75g)
  const detectSpkFlavorAndWeight = useCallback((order?: DbProductionOrder | null) => {
    if (!order) return { flavor: 'Original' as FlavorVariant, weight: '60g', packagingType: 'Standing Pouch' };

    const textToSearch = [
      order.product?.name || '',
      order.product?.sku || '',
      order.product_variant || '',
      order.notes || '',
    ].filter(Boolean).join(' ').toLowerCase();

    // 1. Deteksi Varian Rasa
    let matchedFlavor: FlavorVariant = 'Original';
    if (textToSearch.includes('balado') || textToSearch.includes('bld')) matchedFlavor = 'Balado';
    else if (textToSearch.includes('barbeque') || textToSearch.includes('bbq')) matchedFlavor = 'BBQ';
    else if (textToSearch.includes('super pedas') || textToSearch.includes('spd') || textToSearch.includes('extra pedas')) matchedFlavor = 'Super Pedas';
    else if (textToSearch.includes('pedas manis') || textToSearch.includes('pm')) matchedFlavor = 'Pedas Manis';
    else if (textToSearch.includes('keju') || textToSearch.includes('cheese')) matchedFlavor = 'Keju';
    else if (textToSearch.includes('jagung')) matchedFlavor = 'Jagung Bakar';
    else if (textToSearch.includes('original') || textToSearch.includes('ori') || textToSearch.includes('gurih') || textToSearch.includes('asin')) matchedFlavor = 'Original';

    // 2. Deteksi Berat Kemasan (Utamakan 60g dan 75g sesuai produk utama KhumKhum)
    let matchedWeight = '60g';
    if (textToSearch.includes('60g') || textToSearch.includes('60gram') || textToSearch.includes('60 gram') || textToSearch.includes('60gr') || textToSearch.includes('-60')) matchedWeight = '60g';
    else if (textToSearch.includes('75g') || textToSearch.includes('75gram') || textToSearch.includes('75 gram') || textToSearch.includes('75gr') || textToSearch.includes('-75')) matchedWeight = '75g';
    else if (textToSearch.includes('100g') || textToSearch.includes('100gram') || textToSearch.includes('100 gram') || textToSearch.includes('100gr') || textToSearch.includes('-100')) matchedWeight = '100g';
    else if (textToSearch.includes('150g') || textToSearch.includes('150gram') || textToSearch.includes('150 gram') || textToSearch.includes('150gr') || textToSearch.includes('-150')) matchedWeight = '150g';
    else if (textToSearch.includes('250g') || textToSearch.includes('250gram') || textToSearch.includes('250 gram') || textToSearch.includes('250gr') || textToSearch.includes('-250')) matchedWeight = '250g';
    else if (textToSearch.includes('500g') || textToSearch.includes('500gram') || textToSearch.includes('500 gram') || textToSearch.includes('500gr') || textToSearch.includes('-500')) matchedWeight = '500g';
    else if (textToSearch.includes('30g') || textToSearch.includes('30gram') || textToSearch.includes('30 gram') || textToSearch.includes('-30')) matchedWeight = '30g';
    else if (textToSearch.includes('50g') || textToSearch.includes('50gram') || textToSearch.includes('50 gram') || textToSearch.includes('-50')) matchedWeight = '50g';

    // 3. Deteksi Tipe Kemasan
    let matchedType = 'Standing Pouch';
    if (textToSearch.includes('toples')) matchedType = 'Toples';
    else if (textToSearch.includes('dus') || textToSearch.includes('box')) matchedType = 'Box / Dus';
    else if (textToSearch.includes('bantal')) matchedType = 'Plastik Bantal';
    else if (textToSearch.includes('pouch')) matchedType = 'Standing Pouch';

    return { flavor: matchedFlavor, weight: matchedWeight, packagingType: matchedType };
  }, []);

  const matchedSeasoningInfo = useMemo(() => {
    const flavor = (packingForm.flavor_variant || 'Original').trim();
    const isOri = flavor.toLowerCase().includes('ori') || flavor.toLowerCase() === 'original';
    if (isOri) {
      return {
        ratio: 0,
        recipeName: 'Tanpa Bumbu (Original)',
        matchedRm: undefined,
        availableStockInGram: null,
        isStockSufficient: true,
        neededGrams: 0,
        stdRecommended: 0,
      };
    }

    const { ratio, name: recipeName } = getSeasoningRatioForVariant(flavor);
    const sLower = flavor.toLowerCase();

    const matchedRm = rawMaterials.find(rm => {
      const rmName = rm.name.toLowerCase();
      if (sLower.includes('balado')) return rmName.includes('balado');
      if (sLower.includes('bbq')) return rmName.includes('bbq') || rmName.includes('barbeque');
      if (sLower.includes('super pedas')) return rmName.includes('super pedas');
      if (sLower.includes('pedas manis')) return rmName.includes('pedas manis') || rmName.includes('manis pedas');
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
    const flavor = (packingForm.flavor_variant || '').toLowerCase();
    const neededPcs = (Number(packingForm.packaged_toples_count) || 0) + (Number(packingForm.defect_packaging_count) || 0);

    const matchedRm = rawMaterials.find(rm => {
      if (rm.material_category !== 'Packaging') return false;
      const nameLower = rm.name.toLowerCase();
      const codeLower = (rm.code || '').toLowerCase();
      const weightMatch = nameLower.includes(pkgWeight.toLowerCase()) || (rm.package_weight || '').toLowerCase().includes(pkgWeight.toLowerCase());
      const flavorMatch = !flavor || nameLower.includes(flavor) ||
        (flavor.includes('balado') && (nameLower.includes('balado') || codeLower.includes('bal'))) ||
        (flavor.includes('bbq') && (nameLower.includes('bbq') || nameLower.includes('barbeque') || codeLower.includes('bar'))) ||
        (flavor.includes('pedas manis') && (nameLower.includes('pedas manis') || codeLower.includes('ped'))) ||
        (flavor.includes('super pedas') && (nameLower.includes('super pedas') || codeLower.includes('sup'))) ||
        (flavor.includes('original') && (nameLower.includes('original') || codeLower.includes('ori')));
      return weightMatch && flavorMatch;
    }) || rawMaterials.find(rm => {
      if (rm.material_category !== 'Packaging') return false;
      const nameLower = rm.name.toLowerCase();
      return nameLower.includes(pkgWeight.toLowerCase());
    }) || rawMaterials.find(rm => rm.material_category === 'Packaging');

    const availableStock = matchedRm ? Number(matchedRm.available_stock || 0) : null;
    const isStockSufficient = availableStock !== null ? availableStock >= neededPcs : true;

    return {
      matchedRm,
      neededPcs,
      availableStock,
      isStockSufficient,
    };
  }, [packingForm.packaging_type, packingForm.packaging_weight_gram, packingForm.flavor_variant, packingForm.packaged_toples_count, packingForm.defect_packaging_count, rawMaterials]);

  // List seluruh bahan baku kategori Bumbu dari warehouse
  const warehouseSeasoningMaterials = useMemo(() => {
    return rawMaterials.filter(rm => {
      const cat = (rm.material_category || '').toLowerCase();
      const code = (rm.code || '').toUpperCase();
      const name = (rm.name || '').toLowerCase();
      return cat.includes('bumbu') || cat.includes('seasoning') || code.startsWith('BT-') || name.includes('bumbu tabur');
    });
  }, [rawMaterials]);

  // Status validasi stok bahan baku warehouse & buffer WIP untuk packing
  const packingValidationStatus = useMemo(() => {
    const pcs = Number(packingForm.packaged_toples_count) || 0;
    const cleanPackGram = parseInt((packingForm.packaging_weight_gram || '60g').replace(/\D/g, ''), 10) || 60;
    const neededKg = Number(((pcs * cleanPackGram) / 1000).toFixed(2));
    const seasoningGramsInput = Number(packingForm.seasoning_used_gram) || 0;
    const isOriginalVariant = (packingForm.flavor_variant || '').toLowerCase().includes('ori') || (packingForm.flavor_variant || '').toLowerCase() === 'original';

    // 1. Stok Kemasan di Warehouse
    const isPackagingSufficient = matchedPackagingInfo.availableStock !== null
      ? matchedPackagingInfo.availableStock >= matchedPackagingInfo.neededPcs && matchedPackagingInfo.neededPcs > 0
      : true;

    // 2. Stok Bumbu Tabur di Warehouse (diabaikan jika Original)
    const currentSeasoningRm = isOriginalVariant ? null : (warehouseSeasoningMaterials.find(rm => rm.id === packingForm.seasoning_material_id) || matchedSeasoningInfo.matchedRm);
    const isGramUom = currentSeasoningRm?.uom?.toLowerCase() === 'gram' || currentSeasoningRm?.uom?.toLowerCase() === 'gr';
    const currentSeasoningStockGram = currentSeasoningRm
      ? (isGramUom ? Number(currentSeasoningRm.available_stock || 0) : Number(currentSeasoningRm.available_stock || 0) * 1000)
      : 0;
    const isSeasoningSufficient = isOriginalVariant
      ? true
      : (currentSeasoningRm ? currentSeasoningStockGram >= seasoningGramsInput && seasoningGramsInput > 0 : seasoningGramsInput > 0);

    // 3. Stok Wadah Jamur Selongsong di Buffer WIP
    const activeContainers = longsongContainers.filter(
      c => (c.status === 'AVAILABLE' || c.status === 'PARTIAL') && Number(c.current_weight_kg) > 0
    );
    const totalContainerKg = activeContainers.reduce((sum, c) => sum + (Number(c.current_weight_kg) || 0), 0);
    const isLongsongSufficient = totalContainerKg >= neededKg && neededKg > 0;

    const isValid = pcs > 0 && isPackagingSufficient && isLongsongSufficient && (isOriginalVariant || (seasoningGramsInput > 0 && isSeasoningSufficient));

    let errorMessage = '';
    if (pcs <= 0) errorMessage = 'Jumlah kemasan wajib diisi minimal 1 pcs';
    else if (!isPackagingSufficient) errorMessage = `Stok kemasan di warehouse kurang (${matchedPackagingInfo.availableStock || 0}/${matchedPackagingInfo.neededPcs} pcs)`;
    else if (!isOriginalVariant && seasoningGramsInput <= 0) errorMessage = 'Timbangan bumbu tabur riil belum diisi';
    else if (!isOriginalVariant && !isSeasoningSufficient) errorMessage = `Stok bumbu di warehouse kurang (${currentSeasoningStockGram}g/${seasoningGramsInput}g)`;
    else if (!isLongsongSufficient) errorMessage = `Stok selongsong di buffer kurang (${totalContainerKg.toFixed(1)}kg/${neededKg.toFixed(1)}kg)`;

    return {
      isValid,
      isPackagingSufficient,
      isSeasoningSufficient,
      isLongsongSufficient,
      isOriginalVariant,
      seasoningGramsInput,
      currentSeasoningStockGram,
      currentSeasoningRm,
      neededKg,
      totalContainerKg,
      errorMessage,
    };
  }, [
    packingForm.packaged_toples_count,
    packingForm.packaging_weight_gram,
    packingForm.seasoning_used_gram,
    packingForm.seasoning_material_id,
    matchedPackagingInfo,
    warehouseSeasoningMaterials,
    matchedSeasoningInfo.matchedRm,
    longsongContainers,
  ]);

  // Status ketersediaan stok gudang untuk 3 bahan baku utama penggorengan
  const fryingStockStatus = useMemo(() => {
    const findStock = (
      keywords: string[],
      defaultUom: string,
      code?: string,
      excludeKeywords: string[] = []
    ) => {
      // 1. Coba pencocokan kode master item jika ada
      if (code) {
        const byCode = rawMaterials.find(m => (m.code || '').toLowerCase() === code.toLowerCase());
        if (byCode) {
          return {
            matchedRm: byCode,
            availableStock: Number(byCode.available_stock || 0),
            uom: byCode.uom || defaultUom,
          };
        }
      }

      // 2. Cari berdasarkan keyword secara berurutan (dari yang paling spesifik)
      for (const kw of keywords) {
        const found = rawMaterials.find(m => {
          const n = m.name.toLowerCase();
          const c = (m.code || '').toLowerCase();
          // Tolak jika mengandung kata eksklusi (misal: gagang, baby)
          if (excludeKeywords.some(ex => n.includes(ex) || c.includes(ex))) {
            return false;
          }
          return n.includes(kw) || c === kw;
        });

        if (found) {
          return {
            matchedRm: found,
            availableStock: Number(found.available_stock || 0),
            uom: found.uom || defaultUom,
          };
        }
      }

      return {
        matchedRm: undefined,
        availableStock: 0,
        uom: defaultUom,
      };
    };

    const mushroomStock = findStock(
      ['jamur tiram segar', 'jamur tiram'],
      'kg',
      'jmr-trm',
      ['gagang', 'baby']
    );
    const premixStock = findStock(
      ['tepung premix khumkhum', 'tepung premix', 'premix'],
      'kg',
      'rm-prx',
      ['terigu', 'tapioka']
    );
    const oilStock = findStock(
      ['minyak goreng', 'minyak'],
      'liter',
      'rm-miny',
      ['bekas', 'jelantah', 'pelumas']
    );

    const actualMushroom = parseFloat(fryingRunForm.actual_mushroom_kg) || 0;
    const actualPremix = parseFloat(fryingRunForm.actual_premix_kg) || 0;
    const actualOil = parseFloat(fryingRunForm.actual_cooking_oil_liter) || 0;

    const isMushroomShortage = actualMushroom > 0 && actualMushroom > mushroomStock.availableStock;
    const isPremixShortage = actualPremix > 0 && actualPremix > premixStock.availableStock;
    const isOilShortage = actualOil > 0 && actualOil > oilStock.availableStock;

    const hasAnyShortage = isMushroomShortage || isPremixShortage || isOilShortage;

    return {
      mushroom: { ...mushroomStock, actual: actualMushroom, isShortage: isMushroomShortage },
      premix: { ...premixStock, actual: actualPremix, isShortage: isPremixShortage },
      oil: { ...oilStock, actual: actualOil, isShortage: isOilShortage },
      hasAnyShortage,
    };
  }, [rawMaterials, fryingRunForm.actual_mushroom_kg, fryingRunForm.actual_premix_kg, fryingRunForm.actual_cooking_oil_liter]);

  // Validasi apakah seluruh formulir (Bahan, Wadah Longsong, dan Batch Wajan) sudah terisi lengkap & valid
  const fryingRunValidation = useMemo(() => {
    const mushroom = parseFloat(fryingRunForm.actual_mushroom_kg);
    const premix = parseFloat(fryingRunForm.actual_premix_kg);
    const oil = parseFloat(fryingRunForm.actual_cooking_oil_liter);
    const output = parseFloat(fryingRunForm.output_finished_kg);
    const longsongCount = parseInt(fryingRunForm.output_longsong_count, 10);
    const batchCount = parseInt(fryingRunForm.batch_count, 10);

    const missing: string[] = [];

    // Tab 1: Bahan & Hasil
    if (isNaN(mushroom) || mushroom <= 0) missing.push('Jamur Segar');
    if (isNaN(premix) || premix < 0 || fryingRunForm.actual_premix_kg.trim() === '') missing.push('Tepung Premix');
    if (isNaN(oil) || oil < 0 || fryingRunForm.actual_cooking_oil_liter.trim() === '') missing.push('Minyak Goreng');
    if (isNaN(output) || output <= 0) missing.push('Hasil Jamur Matang');
    if (isNaN(batchCount) || batchCount <= 0) missing.push('Jumlah Batch');

    // Tab 2: Wadah Longsong
    const totalContainersKg = fryingRunForm.containers.reduce((acc, c) => acc + (parseFloat(c.weight_kg) || 0), 0);
    if (isNaN(longsongCount) || longsongCount <= 0) {
      missing.push('Jumlah Wadah Longsong (Tab 2)');
    } else if (
      fryingRunForm.containers.length !== longsongCount ||
      fryingRunForm.containers.some(c => !c.weight_kg || isNaN(parseFloat(c.weight_kg)) || parseFloat(c.weight_kg) <= 0)
    ) {
      missing.push('Bobot Wadah Longsong (Tab 2)');
    } else if (!isNaN(output) && output > 0 && Math.abs(totalContainersKg - output) > 0.05) {
      const diff = Number((output - totalContainersKg).toFixed(2));
      if (diff > 0) {
        missing.push(`Alokasi Wadah Kurang ${diff} kg dari Total Output (${output} kg)`);
      } else {
        missing.push(`Alokasi Wadah Melebihi ${Math.abs(diff)} kg dari Total Output (${output} kg)`);
      }
    }

    // Tab 3: Rincian Batch Wajan
    if (
      !isNaN(batchCount) && batchCount > 0 &&
      (fryingRunForm.batches.length !== batchCount ||
        fryingRunForm.batches.some(
          b => !b.batch_weight_gram || isNaN(parseFloat(b.batch_weight_gram)) || parseFloat(b.batch_weight_gram) <= 0 ||
               !b.duration_minutes || isNaN(parseFloat(b.duration_minutes)) || parseFloat(b.duration_minutes) <= 0 || parseFloat(b.duration_minutes) > 30 ||
               !b.oil_temp_celsius || isNaN(parseFloat(b.oil_temp_celsius)) || parseFloat(b.oil_temp_celsius) <= 0
        ))
    ) {
      const hasOver30 = fryingRunForm.batches.some(b => parseFloat(b.duration_minutes) > 30);
      const hasInvalidWeight = fryingRunForm.batches.some(b => !b.batch_weight_gram || isNaN(parseFloat(b.batch_weight_gram)) || parseFloat(b.batch_weight_gram) <= 0);
      if (hasOver30) {
        missing.push('Durasi Batch Melebihi 30 Menit (Tab 3)');
      } else if (hasInvalidWeight) {
        missing.push('Bobot Jamur Tiap Batch Harus > 0g (Tab 3)');
      } else {
        missing.push('Durasi/Suhu Tiap Batch (Tab 3)');
      }
    }

    // Rendemen wajar BOM
    const maxYieldPct = productionStandards?.max_yield_percentage || 85.0;
    const maxOutputWajarKg = mushroom > 0 ? Number(((mushroom * maxYieldPct) / 100).toFixed(2)) : 0;
    if (mushroom > 0 && output > 0 && output > maxOutputWajarKg) {
      missing.push(`Output melebihi batas wajar BOM (${maxOutputWajarKg} kg / ${maxYieldPct}%)`);
    }

    // Stok gudang
    if (fryingStockStatus.hasAnyShortage) {
      missing.push('Stok Bahan di Gudang Kurang');
    }

    return {
      isComplete: missing.length === 0,
      missing,
      message: missing.length > 0 ? `Belum lengkap: ${missing.join(', ')}` : '',
    };
  }, [
    fryingRunForm,
    fryingStockStatus.hasAnyShortage,
    productionStandards?.max_yield_percentage,
  ]);

  const isFryingRunFormFullyComplete = fryingRunValidation.isComplete;
  const fryingRunMissingMessage = fryingRunValidation.message;

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
    
    let variantName = 'Jamur Crispy Polos';
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
      clearFormDraft('draft_prod_spk');
      toast.success(
        spkType === 'FRYING'
          ? 'SPK Penggorengan Jamur berhasil dibuat!'
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
      const [ordersRes, optionsRes, fryingRes, packingRes, metricsRes, standardsRes, containersRes] = await Promise.all([
        getProductionOrders(),
        getProductionFormOptions(),
        getAllFryingBatches(),
        getAllPackingEntries(),
        getFryingPackingMetrics(),
        getProductionStandards(),
        getLongsongContainers(),
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
      if (containersRes?.success && containersRes.data) setLongsongContainers(containersRes.data);
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'production_longsong_containers' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  // ── Longsong Belum Packing (Wadah Fisik Buffer WIP yang Aktif / Tersedia) ──
  const unpackedLongsongCount = useMemo(() => {
    // 1. Jika ada wadah fisik longsong di Buffer WIP, hitung langsung wadah yang AVAILABLE atau PARTIAL
    const availableContainers = longsongContainers.filter(c => c.status === 'AVAILABLE' || c.status === 'PARTIAL');
    if (longsongContainers.length > 0) {
      return availableContainers.length;
    }

    // 2. Jika tidak ada wadah fisik terdaftar, hitung selisih dari wajan goreng selesai vs packing
    const totalProduced = fryingBatches
      .filter(b => b.finished_at && Number(b.longsong_count) > 0)
      .reduce((sum, b) => sum + (Number(b.longsong_count) || 0), 0);

    const totalPacked = packingEntries.filter(p => p.is_packed).length;
    const diff = totalProduced - totalPacked;

    if (fryingBatches.length > 0 || packingEntries.length > 0) {
      return Math.max(0, diff);
    }
    return fryingMetrics.unpackedLongsongCount || 0;
  }, [longsongContainers, fryingBatches, packingEntries, fryingMetrics.unpackedLongsongCount]);

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
    if (longsongContainers.length > 0) {
      return longsongContainers.length;
    }

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
  }, [longsongContainers, fryingBatches, allFryingOrders]);

  const totalAllLongsongPacked = useMemo(() => {
    return packingEntries.filter(p => p.is_packed).length;
  }, [packingEntries]);

  const availablePoolLongsong = useMemo(() => {
    if (longsongContainers.length > 0) {
      return longsongContainers.filter(c => c.status === 'AVAILABLE' || c.status === 'PARTIAL').length;
    }
    return Math.max(0, totalAllLongsongProduced - totalAllLongsongPacked);
  }, [longsongContainers, totalAllLongsongProduced, totalAllLongsongPacked]);

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

      // Waktu rata-rata per batch & HACCP Time Study (Standar: 15 ± 2 menit)
      const finishedBatches = batches.filter(b => b.finished_at && Number(b.frying_duration_minutes) > 0);
      let avgDurationMinutes = 0;
      if (finishedBatches.length > 0) {
        avgDurationMinutes = finishedBatches.reduce((s, b) => s + (Number(b.frying_duration_minutes) || 0), 0) / finishedBatches.length;
      } else if (order.cycle_time_avg_seconds && order.cycle_time_avg_seconds > 0) {
        avgDurationMinutes = order.cycle_time_avg_seconds / 60;
      }

      let haccpCompliance: 'OPTIMAL' | 'OVERCOOK' | 'UNDERCOOK' | 'NO_DATA' = 'NO_DATA';
      if (avgDurationMinutes > 0) {
        if (avgDurationMinutes >= 13 && avgDurationMinutes <= 17) {
          haccpCompliance = 'OPTIMAL';
        } else if (avgDurationMinutes > 17) {
          haccpCompliance = 'OVERCOOK';
        } else {
          haccpCompliance = 'UNDERCOOK';
        }
      }

      // Wadah longsong fisik yang terasosiasi dengan SPK ini
      const linkedContainers = longsongContainers.filter(c => c.production_order_id === order.id);
      const readyContainers = linkedContainers.filter(c => c.status === 'AVAILABLE' || c.status === 'PARTIAL');
      const availableWeightKg = readyContainers.reduce((s, c) => s + (Number(c.current_weight_kg) || 0), 0);

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
        avgDurationMinutes,
        haccpCompliance,
        linkedContainers,
        readyContainers,
        availableWeightKg,
      };
    });
  }, [allFryingOrders, fryingBatches, longsongContainers]);



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

  // Handler: Buka & Buat Batch Goreng Curah (Dapat terhubung ke SPK atau Tanpa SPK)
  const handleOpenCreateRegularFrying = (order?: DbProductionOrder) => {
    const spkBatches = order ? fryingBatches.filter(b => b.production_order_id === order.id) : fryingBatches;
    const nextWajan = (spkBatches.length > 0 ? Math.max(...spkBatches.map(b => b.wajan_number)) : 0) + 1;
    const saved = getFormDraft<typeof regularFryingForm>('draft_prod_regular_frying');
    if (saved && (saved.notes || (saved.batch_weight_gram && saved.batch_weight_gram !== '800') || (saved.oil_temp_celsius && saved.oil_temp_celsius !== '170'))) {
      setRegularFryingForm({
        ...saved,
        production_order_id: order?.id || saved.production_order_id || '',
        wajan_number: saved.wajan_number || String(nextWajan),
      });
      toast.info('Draft wajan goreng sebelumnya berhasil dipulihkan');
    } else {
      setRegularFryingForm({
        production_order_id: order?.id || '',
        wajan_number: String(nextWajan),
        batch_weight_gram: '800',
        oil_temp_celsius: '170',
        notes: '',
      });
    }
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
      production_order_id: regularFryingForm.production_order_id || undefined,
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
      clearFormDraft('draft_prod_regular_frying');
      toast.success(`Batch wajan #${regularFryingForm.wajan_number} berhasil disiapkan (Siap Goreng)`);
      setCreateRegularFryingOpen(false);
      loadData();
    } else {
      toast.error(res.error || 'Gagal membuat batch goreng');
    }
  };

  // Handler: Buka Modal Rekap Selesai Masak SPK (Bahan Aktual & Output Longsong & Waktu Batch)
  const handleOpenRecordFryingRun = (order: DbProductionOrder) => {
    setFryingRunTab('BAHAN');
    setSelectedFryingOrder(order);
    const saved = getFormDraft<typeof fryingRunForm>(`draft_prod_frying_run_${order.id}`);
    if (saved && (saved.actual_mushroom_kg || saved.output_finished_kg || saved.notes || saved.batch_count)) {
      setFryingRunForm(saved);
      toast.info('Draft rekap hasil goreng SPK sebelumnya berhasil dipulihkan');
    } else {
      setFryingRunForm({
        actual_mushroom_kg: '',
        actual_premix_kg: '',
        actual_cooking_oil_liter: '',
        output_finished_kg: '',
        output_longsong_count: '',
        batch_count: '',
        notes: '',
        containers: [],
        batches: [],
      });
    }
    setRecordFryingRunOpen(true);
  };

  const handleFryingRunBatchCountChange = (valStr: string) => {
    if (valStr === '') {
      setFryingRunForm(f => ({ ...f, batch_count: '', batches: [] }));
      return;
    }
    const count = parseInt(valStr, 10);
    if (isNaN(count) || count < 0) {
      setFryingRunForm(f => ({ ...f, batch_count: valStr }));
      return;
    }
    const safeCount = Math.min(200, count);
    setFryingRunForm(f => {
      const currentBatches = [...f.batches];
      const newBatches: {
        wajan_number: number;
        batch_weight_gram: string;
        duration_minutes: string;
        oil_temp_celsius: string;
        notes?: string;
      }[] = [];
      const totalMushroomGrams = (parseFloat(f.actual_mushroom_kg) || 0) * 1000;
      const perBatchGram = totalMushroomGrams > 0 && safeCount > 0 ? Math.floor(totalMushroomGrams / safeCount) : 800;
      let remainingGrams = totalMushroomGrams;

      for (let i = 1; i <= safeCount; i++) {
        const assignedGram = totalMushroomGrams > 0
          ? (i === safeCount ? remainingGrams : perBatchGram)
          : (currentBatches[i - 1]?.batch_weight_gram || '800');
        if (totalMushroomGrams > 0) remainingGrams -= perBatchGram;

        if (currentBatches[i - 1]) {
          newBatches.push({
            ...currentBatches[i - 1],
            wajan_number: i,
            batch_weight_gram: currentBatches[i - 1].batch_weight_gram || String(assignedGram),
          });
        } else {
          newBatches.push({
            wajan_number: i,
            batch_weight_gram: String(assignedGram),
            duration_minutes: '',
            oil_temp_celsius: '',
            notes: '',
          });
        }
      }
      return {
        ...f,
        batch_count: valStr,
        batches: newBatches,
      };
    });
  };

  const handleFryingRunMushroomChange = (valStr: string) => {
    if (valStr === '') {
      setFryingRunForm(f => ({ ...f, actual_mushroom_kg: '' }));
      return;
    }
    const val = parseFloat(valStr);
    if (isNaN(val)) {
      setFryingRunForm(f => ({ ...f, actual_mushroom_kg: valStr }));
      return;
    }

    const targetKg = Number(selectedFryingOrder?.target_quantity) || 50;
    const prevInput = Number(selectedFryingOrder?.input_weight) || 0;
    const remainingTargetKg = Math.max(0, targetKg - prevInput);
    const targetBase = remainingTargetKg > 0 ? remainingTargetKg : targetKg;
    const maxAllowed = Number((targetBase * 1.2).toFixed(2));

    const finalValStr = val > maxAllowed ? String(maxAllowed) : valStr;
    const finalVal = parseFloat(finalValStr);

    if (val > maxAllowed) {
      toast.warning(`Input jamur segar dibatasi maksimal target + 20% (${maxAllowed} kg)`);
    }

    setFryingRunForm(f => {
      const bCount = f.batches.length;
      let updatedBatches = f.batches;
      if (bCount > 0 && finalVal > 0) {
        const totalGrams = Math.round(finalVal * 1000);
        const perBatch = Math.floor(totalGrams / bCount);
        let rem = totalGrams;
        updatedBatches = f.batches.map((b, idx) => {
          const w = idx === bCount - 1 ? rem : perBatch;
          rem -= perBatch;
          return { ...b, batch_weight_gram: String(w) };
        });
      }
      return {
        ...f,
        actual_mushroom_kg: finalValStr,
        batches: updatedBatches,
      };
    });
  };

  const handleFryingRunPremixChange = (valStr: string) => {
    if (valStr === '') {
      setFryingRunForm(f => ({ ...f, actual_premix_kg: '' }));
      return;
    }
    const val = parseFloat(valStr);
    if (isNaN(val)) {
      setFryingRunForm(f => ({ ...f, actual_premix_kg: valStr }));
      return;
    }
    const maxStock = fryingStockStatus.premix.availableStock;
    if (maxStock > 0 && val > maxStock) {
      toast.warning(`Tepung premix dibatasi maksimal sesuai stok gudang (${maxStock.toFixed(1)} kg)`);
      setFryingRunForm(f => ({ ...f, actual_premix_kg: String(maxStock) }));
      return;
    }
    setFryingRunForm(f => ({ ...f, actual_premix_kg: valStr }));
  };

  const handleFryingRunOilChange = (valStr: string) => {
    if (valStr === '') {
      setFryingRunForm(f => ({ ...f, actual_cooking_oil_liter: '' }));
      return;
    }
    const val = parseFloat(valStr);
    if (isNaN(val)) {
      setFryingRunForm(f => ({ ...f, actual_cooking_oil_liter: valStr }));
      return;
    }
    const maxStock = fryingStockStatus.oil.availableStock;
    if (maxStock > 0 && val > maxStock) {
      toast.warning(`Minyak goreng dibatasi maksimal sesuai stok gudang (${maxStock.toFixed(1)} L)`);
      setFryingRunForm(f => ({ ...f, actual_cooking_oil_liter: String(maxStock) }));
      return;
    }
    setFryingRunForm(f => ({ ...f, actual_cooking_oil_liter: valStr }));
  };

  const handleFryingRunOutputKgChange = (valStr: string) => {
    if (valStr === '') {
      setFryingRunForm(f => ({ ...f, output_finished_kg: '' }));
      return;
    }
    const val = parseFloat(valStr);
    if (isNaN(val)) {
      setFryingRunForm(f => ({ ...f, output_finished_kg: valStr }));
      return;
    }

    const currentMushroom = parseFloat(fryingRunForm.actual_mushroom_kg) || (Number(selectedFryingOrder?.target_quantity) || 50);
    const maxYieldPct = productionStandards?.max_yield_percentage || 85.0;
    const maxOutputWajarKg = Number(((currentMushroom * maxYieldPct) / 100).toFixed(2));

    if (currentMushroom > 0 && val > maxOutputWajarKg) {
      toast.warning(`Input jamur matang dibatasi maksimal ${maxOutputWajarKg} kg (Batas wajar BOM ${maxYieldPct}% dari jamur segar ${currentMushroom} kg)`);
      setFryingRunForm(f => ({
        ...f,
        output_finished_kg: String(maxOutputWajarKg),
      }));
      return;
    }

    setFryingRunForm(f => ({
      ...f,
      output_finished_kg: valStr,
    }));
  };

  const handleFryingRunLongsongChange = (valStr: string) => {
    if (valStr === '') {
      setFryingRunForm(f => ({ ...f, output_longsong_count: '', containers: [] }));
      return;
    }
    const count = parseInt(valStr, 10);
    if (isNaN(count) || count <= 0) {
      setFryingRunForm(f => ({ ...f, output_longsong_count: valStr, containers: [] }));
      return;
    }

    const safeCount = Math.min(100, count);
    setFryingRunForm(f => {
      const currentContainers = [...f.containers];
      const newContainers: { container_number: number; weight_kg: string }[] = [];
      for (let i = 1; i <= safeCount; i++) {
        if (currentContainers[i - 1]) {
          newContainers.push({ ...currentContainers[i - 1], container_number: i });
        } else {
          newContainers.push({ container_number: i, weight_kg: '' });
        }
      }
      return {
        ...f,
        output_longsong_count: valStr,
        containers: newContainers,
      };
    });
  };

  const handleContainerWeightChange = (index: number, weightStr: string) => {
    setFryingRunForm(f => {
      const totalOutput = parseFloat(f.output_finished_kg) || 0;
      const otherContainersSum = f.containers.reduce((acc, c, i) => {
        if (i === index) return acc;
        return acc + (parseFloat(c.weight_kg) || 0);
      }, 0);

      const maxForThis = Math.max(0, Number((totalOutput - otherContainersSum).toFixed(2)));
      let finalStr = weightStr;
      const inputNum = parseFloat(weightStr);

      if (totalOutput > 0 && !isNaN(inputNum) && inputNum > maxForThis) {
        finalStr = String(maxForThis);
        toast.warning(
          `Bobot Wadah #${f.containers[index]?.container_number || index + 1} dipatok maksimal ${maxForThis.toFixed(2)} kg sesuai sisa total output (${totalOutput.toFixed(2)} kg).`
        );
      }

      const updated = [...f.containers];
      if (updated[index]) {
        updated[index] = { ...updated[index], weight_kg: finalStr };
      }
      return {
        ...f,
        containers: updated,
      };
    });
  };

  const handleFillRemainingContainerWeight = (index: number) => {
    setFryingRunForm(f => {
      const totalOutput = parseFloat(f.output_finished_kg) || 0;
      if (totalOutput <= 0) {
        toast.warning('Isi total berat jamur matang terlebih dahulu di Tab 1');
        return f;
      }
      const otherContainersSum = f.containers.reduce((acc, c, i) => {
        if (i === index) return acc;
        return acc + (parseFloat(c.weight_kg) || 0);
      }, 0);
      const remaining = Math.max(0, Number((totalOutput - otherContainersSum).toFixed(2)));
      const updated = [...f.containers];
      if (updated[index]) {
        updated[index] = { ...updated[index], weight_kg: String(remaining) };
      }
      return {
        ...f,
        containers: updated,
      };
    });
  };

  const handleAutoBalanceContainers = () => {
    setFryingRunForm(f => {
      const total = parseFloat(f.output_finished_kg) || 0;
      const count = parseInt(f.output_longsong_count, 10) || f.containers.length || 0;
      if (total <= 0) {
        toast.warning('Isi total berat jamur matang terlebih dahulu di Tab 1');
        return f;
      }
      if (count <= 0) {
        toast.warning('Isi jumlah wadah longsong terlebih dahulu di Tab 2');
        return f;
      }
      const perWadah = Number((total / count).toFixed(2));
      let remaining = total;
      const balanced = [];
      for (let i = 1; i <= count; i++) {
        const w = i === count ? Number(remaining.toFixed(2)) : perWadah;
        balanced.push({ container_number: i, weight_kg: String(w) });
        remaining -= perWadah;
      }
      return {
        ...f,
        output_longsong_count: String(count),
        containers: balanced,
      };
    });
    toast.info('Berat wadah longsong berhasil dibagi rata otomatis');
  };

  const handleBatchWeightChange = (index: number, val: string) => {
    setFryingRunForm(f => {
      const updated = [...f.batches];
      if (updated[index]) {
        updated[index] = { ...updated[index], batch_weight_gram: val };
      }
      const sumGrams = updated.reduce((acc, b) => acc + (parseFloat(b.batch_weight_gram) || 0), 0);
      const newTotalKg = sumGrams > 0 ? (sumGrams / 1000).toFixed(2).replace(/\.?0+$/, '') : f.actual_mushroom_kg;
      return {
        ...f,
        batches: updated,
        actual_mushroom_kg: sumGrams > 0 ? newTotalKg : f.actual_mushroom_kg,
      };
    });
  };

  const handleAutoBalanceBatchWeights = () => {
    setFryingRunForm(f => {
      const totalKg = parseFloat(f.actual_mushroom_kg) || 0;
      const count = f.batches.length;
      if (totalKg <= 0) {
        toast.warning('Isi total jamur segar di Tab 1 terlebih dahulu');
        return f;
      }
      if (count <= 0) {
        toast.warning('Tambahkan batch wajan terlebih dahulu');
        return f;
      }
      const totalGrams = Math.round(totalKg * 1000);
      const perBatch = Math.floor(totalGrams / count);
      let rem = totalGrams;
      const balanced = f.batches.map((b, idx) => {
        const w = idx === count - 1 ? rem : perBatch;
        rem -= perBatch;
        return { ...b, batch_weight_gram: String(w) };
      });
      return { ...f, batches: balanced };
    });
    toast.info('Bobot jamur per batch berhasil dibagi rata');
  };

  const handleBatchDurationChange = (index: number, val: string) => {
    setFryingRunForm(f => {
      let finalVal = val;
      const numVal = parseFloat(val);
      if (!isNaN(numVal) && numVal > 30) {
        finalVal = '30';
        toast.warning('Durasi penggorengan per batch dibatasi maksimal 30 menit sesuai kontrol proses.');
      }
      const updated = [...f.batches];
      if (updated[index]) {
        updated[index] = { ...updated[index], duration_minutes: finalVal };
      }
      return { ...f, batches: updated };
    });
  };

  const handleBatchTempChange = (index: number, val: string) => {
    setFryingRunForm(f => {
      const updated = [...f.batches];
      if (updated[index]) {
        updated[index] = { ...updated[index], oil_temp_celsius: val };
      }
      return { ...f, batches: updated };
    });
  };

  const handleAddBatch = () => {
    setFryingRunForm(f => {
      const nextNo = (f.batches.length > 0 ? Math.max(...f.batches.map(b => b.wajan_number)) : 0) + 1;
      const updated = [
        ...f.batches,
        { wajan_number: nextNo, batch_weight_gram: '800', duration_minutes: '', oil_temp_celsius: '', notes: '' },
      ];
      const sumGrams = updated.reduce((acc, b) => acc + (parseFloat(b.batch_weight_gram) || 0), 0);
      const newTotalKg = sumGrams > 0 ? (sumGrams / 1000).toFixed(2).replace(/\.?0+$/, '') : f.actual_mushroom_kg;
      return {
        ...f,
        batch_count: String(updated.length),
        batches: updated,
        actual_mushroom_kg: newTotalKg,
      };
    });
  };

  const handleRemoveBatch = (index: number) => {
    setFryingRunForm(f => {
      const updated = f.batches.filter((_, idx) => idx !== index).map((b, idx) => ({
        ...b,
        wajan_number: idx + 1,
      }));
      const sumGrams = updated.reduce((acc, b) => acc + (parseFloat(b.batch_weight_gram) || 0), 0);
      const newTotalKg = sumGrams > 0 ? (sumGrams / 1000).toFixed(2).replace(/\.?0+$/, '') : f.actual_mushroom_kg;
      return {
        ...f,
        batch_count: updated.length > 0 ? String(updated.length) : '',
        batches: updated,
        actual_mushroom_kg: updated.length > 0 ? newTotalKg : f.actual_mushroom_kg,
      };
    });
  };

  const handleSetAllBatchesStandard = () => {
    const rawStd = Number(productionStandards?.frying_duration_minutes) || 15;
    const stdDur = Math.min(30, Math.max(1, rawStd));
    const oilMin = Number(productionStandards?.oil_temp_min) || 150;
    const oilMax = Number(productionStandards?.oil_temp_max) || 180;
    const stdTemp = Math.round((oilMin + oilMax) / 2) || 165;

    setFryingRunForm(f => ({
      ...f,
      batches: f.batches.map(b => ({
        ...b,
        duration_minutes: stdDur.toFixed(1),
        oil_temp_celsius: String(stdTemp),
      })),
    }));
    toast.info(`Seluruh batch diset ke standar SOP (${stdDur} menit, ${stdTemp}°C)`);
  };

  // Handler: Submit Rekap Selesai Masak SPK & Potong Stok Gudang Aktual (Simpan Sementara / Simpan Selesai)
  const handleSubmitFryingRun = async (isPartial = false) => {
    if (!selectedFryingOrder) return;
    const mushroomKg = parseFloat(fryingRunForm.actual_mushroom_kg);
    const premixKg = parseFloat(fryingRunForm.actual_premix_kg);
    const oilLiter = parseFloat(fryingRunForm.actual_cooking_oil_liter);
    const outputKg = parseFloat(fryingRunForm.output_finished_kg);
    const longsongCount = parseInt(fryingRunForm.output_longsong_count, 10);
    const batchCount = parseInt(fryingRunForm.batch_count, 10);

    const maxYieldAllowedPct = productionStandards?.max_yield_percentage || 85.0;
    const maxOutputWajarKg = Number(((mushroomKg * maxYieldAllowedPct) / 100).toFixed(2));

    if (!mushroomKg || mushroomKg <= 0 || isNaN(premixKg) || isNaN(oilLiter) || !outputKg || outputKg <= 0 || !longsongCount || longsongCount <= 0 || !batchCount || batchCount <= 0) {
      toast.error('Mohon lengkapi seluruh rincian bahan aktual, hasil jamur matang, wadah longsong, dan batch wajan.');
      return;
    }

    const targetKg = Number(selectedFryingOrder.target_quantity) || 50;
    const prevInput = Number(selectedFryingOrder.input_weight) || 0;
    const remainingTargetKg = Math.max(0, targetKg - prevInput);
    const targetBase = remainingTargetKg > 0 ? remainingTargetKg : targetKg;
    const maxAllowed = Number((targetBase * 1.2).toFixed(2));

    if (mushroomKg > maxAllowed) {
      toast.error(`Jumlah jamur segar (${mushroomKg} kg) melebihi batas toleransi target + 20% (${maxAllowed} kg). Mohon sesuaikan.`);
      return;
    }

    if (fryingStockStatus.hasAnyShortage) {
      toast.error('Stok bahan baku di gudang tidak mencukupi untuk menyelesaikan SPK ini. Harap lakukan Inbound / Restock terlebih dahulu.');
      return;
    }

    if (outputKg > 0 && mushroomKg > 0 && outputKg > maxOutputWajarKg) {
      toast.error(`Berat output jamur matang (${outputKg} kg) melebihi batas maksimal wajar BOM (${maxOutputWajarKg} kg / ${maxYieldAllowedPct}%). Mohon periksa kembali input Anda.`);
      return;
    }

    // Offset nomor wadah longsong jika SPK ini sudah memiliki wadah sebelumnya
    const existingContainersForThisSpk = longsongContainers.filter(c => c.production_order_id === selectedFryingOrder.id);
    const containerOffset = existingContainersForThisSpk.length;

    const containersPayload = (fryingRunForm.containers && fryingRunForm.containers.length > 0)
      ? fryingRunForm.containers.map(c => ({
          container_number: c.container_number + containerOffset,
          weight_kg: parseFloat(c.weight_kg) || 0,
        }))
      : undefined;

    // Offset nomor wajan batch jika SPK ini sudah memiliki wajan sebelumnya
    const existingBatchesForThisSpk = fryingBatches.filter(b => b.production_order_id === selectedFryingOrder.id);
    const batchOffset = existingBatchesForThisSpk.length;

    const batchesPayload = (fryingRunForm.batches && fryingRunForm.batches.length > 0)
      ? fryingRunForm.batches.map(b => ({
          wajan_number: b.wajan_number + batchOffset,
          batch_weight_gram: parseFloat(b.batch_weight_gram) || Math.round((mushroomKg * 1000) / (fryingRunForm.batches.length || 1)),
          duration_minutes: parseFloat(b.duration_minutes) || 15,
          oil_temp_celsius: parseFloat(b.oil_temp_celsius) || 170,
          notes: b.notes || undefined,
        }))
      : undefined;

    setIsSubmittingFryingRun(true);
    try {
      const res = await recordFryingRunCompletion({
        production_order_id: selectedFryingOrder.id,
        actual_mushroom_kg: mushroomKg,
        actual_premix_kg: premixKg || 0,
        actual_cooking_oil_liter: oilLiter || 0,
        output_finished_kg: outputKg,
        output_longsong_count: longsongCount,
        is_partial: isPartial,
        containers: containersPayload,
        batches: batchesPayload,
        notes: fryingRunForm.notes || undefined,
      });

      if (res.success) {
        if (isPartial) {
          toast.success(`Catatan sementara SPK ${selectedFryingOrder.batch_number} tersimpan! Sesi ini: ${outputKg}kg (${longsongCount} wadah baru). Status SPK tetap Sedang Berjalan.`);
        } else {
          toast.success(`SPK ${selectedFryingOrder.batch_number} selesai tuntas! Total: ${res.data?.accumulatedOutput || outputKg}kg (Rendemen: ${res.data?.yieldPercentage}%)`);
        }
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

  // Handler sebelum submit Simpan Selesai: periksa apakah akumulasi jamur memenuhi target SPK
  const handleInitiateSubmitComplete = () => {
    if (!selectedFryingOrder) return;
    const targetKg = Number(selectedFryingOrder.target_quantity) || 50;
    const prevInput = Number(selectedFryingOrder.input_weight) || 0;
    const currentMushroom = parseFloat(fryingRunForm.actual_mushroom_kg) || 0;
    const totalInput = prevInput + currentMushroom;

    if (totalInput < targetKg) {
      const shortage = targetKg - totalInput;
      const pct = Math.round((totalInput / targetKg) * 100);
      setUnderTargetData({
        targetKg,
        prevInputKg: prevInput,
        currentMushroomKg: currentMushroom,
        totalInputKg: totalInput,
        shortageKg: Number(shortage.toFixed(1)),
        pct,
      });
      setUnderTargetConfirmOpen(true);
    } else {
      handleSubmitFryingRun(false);
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
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
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

  // Handler: Edit SPK
  const handleOpenEditSpk = (order: DbProductionOrder) => {
    setSelectedSpkForEdit(order);
    setEditSpkForm({
      target_quantity: String(order.target_quantity || ''),
      start_date: order.start_date ? order.start_date.split('T')[0] : format(new Date(), 'yyyy-MM-dd'),
      notes: order.notes || '',
    });
    setEditSpkOpen(true);
  };

  const handleSaveEditSpk = async () => {
    if (!selectedSpkForEdit) return;
    const targetQty = parseFloat(editSpkForm.target_quantity);
    if (!targetQty || targetQty <= 0) {
      toast.error('Target kuantitas harus lebih dari 0 kg');
      return;
    }
    setIsUpdatingSpk(true);
    const res = await updateProductionOrder(selectedSpkForEdit.id, {
      target_quantity: targetQty,
      start_date: editSpkForm.start_date,
      notes: editSpkForm.notes,
    });
    setIsUpdatingSpk(false);
    if (res.success) {
      toast.success(`SPK ${selectedSpkForEdit.batch_number} berhasil diperbarui!`);
      setEditSpkOpen(false);
      loadData();
    } else {
      toast.error(res.error || 'Gagal memperbarui SPK');
    }
  };

  // Handler: Hapus / Batalkan SPK
  const handleDeleteSpk = (order: DbProductionOrder) => {
    setConfirmDialog({
      isOpen: true,
      title: `Hapus / Batalkan SPK ${order.batch_number}`,
      description: `Apakah Anda yakin ingin menghapus SPK ${order.batch_number}? Seluruh data alokasi penggorengan terkait SPK ini akan dihapus.`,
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        const res = await deleteProductionOrder(order.id);
        if (res.success) {
          toast.success(`SPK ${order.batch_number} berhasil dihapus!`);
          loadData();
        } else {
          toast.error(res.error || 'Gagal menghapus SPK');
        }
      },
    });
  };

  // Handler: Edit Wadah Longsong
  const handleOpenEditLongsong = (c: DbLongsongContainer) => {
    setSelectedLongsongForEdit(c);
    setEditLongsongForm({
      current_weight_kg: String(c.current_weight_kg ?? c.initial_weight_kg ?? 2.5),
      status: c.status || 'AVAILABLE',
      notes: c.notes || '',
    });
    setEditLongsongOpen(true);
  };

  const handleSaveEditLongsong = async () => {
    if (!selectedLongsongForEdit) return;
    const weight = parseFloat(editLongsongForm.current_weight_kg);
    if (isNaN(weight) || weight < 0) {
      toast.error('Berat sisa tidak boleh negatif');
      return;
    }
    setIsUpdatingLongsong(true);
    const res = await updateLongsongContainer(selectedLongsongForEdit.id, {
      current_weight_kg: weight,
      status: editLongsongForm.status,
      notes: editLongsongForm.notes,
    });
    setIsUpdatingLongsong(false);
    if (res.success) {
      toast.success(`Wadah #${selectedLongsongForEdit.container_number} berhasil diperbarui!`);
      setEditLongsongOpen(false);
      loadData();
    } else {
      toast.error(res.error || 'Gagal memperbarui wadah');
    }
  };

  // Handler: Hapus Wadah Longsong
  const handleDeleteLongsong = (c: DbLongsongContainer) => {
    setConfirmDialog({
      isOpen: true,
      title: `Hapus Wadah #${c.container_number}`,
      description: `Apakah Anda yakin ingin menghapus kartu wadah longsong #${c.container_number} (Sisa: ${c.current_weight_kg} kg)? Data stok wadah ini akan ditiadakan.`,
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        const res = await deleteLongsongContainer(c.id);
        if (res.success) {
          toast.success(`Wadah #${c.container_number} berhasil dihapus`);
          loadData();
        } else {
          toast.error(res.error || 'Gagal menghapus wadah');
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
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
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
    const saved = getFormDraft<typeof haccpFryingForm>('draft_prod_haccp_frying');
    if (saved && (saved.output_weight_gram || saved.longsong_count || saved.notes)) {
      setHaccpFryingForm({
        ...saved,
        production_order_id: targetOrderId || saved.production_order_id || '',
      });
      toast.info('Draft HACCP time study sebelumnya berhasil dipulihkan');
    } else {
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
    }
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

    if (durationMinutes > 30) {
      toast.error('Durasi masak HACCP dibatasi maksimal 30 menit. Periksa kembali jam mulai dan jam selesai.');
      return;
    }

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
      clearFormDraft('draft_prod_haccp_frying');
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
    const saved = getFormDraft<typeof completeFryingForm>(`draft_prod_complete_${batch.id}`);
    if (saved && (saved.output_weight_gram || saved.longsong_count || saved.notes)) {
      setCompleteFryingForm(saved);
      toast.info('Draft timbangan hasil sebelumnya berhasil dipulihkan');
    } else {
      setCompleteFryingForm({
        output_weight_gram: batch.output_weight_gram ? String(batch.output_weight_gram) : '',
        longsong_count: batch.longsong_count ? String(batch.longsong_count) : '',
        kremesan_weight_gram: batch.kremesan_weight_gram != null ? String(batch.kremesan_weight_gram) : '0',
        notes: batch.notes || '',
      });
    }
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
      if (selectedFryingBatch?.id) {
        clearFormDraft(`draft_prod_complete_${selectedFryingBatch.id}`);
      }
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
    const saved = getFormDraft<typeof packingForm>('draft_prod_packing');
    if (saved && (saved.packaged_toples_count || saved.notes || (saved.seasoning_used_gram && saved.seasoning_used_gram !== '0'))) {
      setPackingForm(saved);
      toast.info('Draft input packing sebelumnya berhasil dipulihkan');
      setPackingNavTab('PACKAGING');
      setCreatePackingOpen(true);
      return;
    }

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

    // Auto-detect rasa, gramatur & tipe packaging dari varian target SPK (misal Balado 60g atau Original 75g)
    const detected = detectSpkFlavorAndWeight(target.order);
    const cleanPackGram = parseInt(detected.weight.replace(/\D/g, ''), 10) || 60;
    
    // Default pcs = Sisa target SPK (target_quantity - totalPackagedPcs) atau minimal 1
    const spkTargetPcs = target.order.target_quantity || 200;
    const remainingPcs = Math.max(1, spkTargetPcs - (target.totalPackagedPcs || 0));
    const totalNeededGram = remainingPcs * cleanPackGram;

    // Cari raw material bumbu tabur yang cocok di warehouse
    const sLower = detected.flavor.toLowerCase();
    const matchedSeasoningRm = rawMaterials.find(rm => {
      const rmName = rm.name.toLowerCase();
      const rmCode = (rm.code || '').toLowerCase();
      if (sLower.includes('balado')) return rmName.includes('balado') || rmCode.includes('bld');
      if (sLower.includes('bbq') || sLower.includes('barbeque')) return rmName.includes('bbq') || rmName.includes('barbeque') || rmCode.includes('bbq');
      if (sLower.includes('super pedas')) return rmName.includes('super pedas') || rmCode.includes('sp');
      if (sLower.includes('pedas manis')) return rmName.includes('pedas manis') || rmName.includes('manis pedas') || rmCode.includes('pm');
      if (sLower.includes('original')) return rmName.includes('gurih') || rmName.includes('original') || rmName.includes('asin');
      return rmName.includes(sLower);
    });

    const isOri = detected.flavor.toLowerCase().includes('ori') || detected.flavor.toLowerCase() === 'original';

    setPackingForm({
      production_order_id: spkId,
      seasoning_material_id: isOri ? '' : (matchedSeasoningRm?.id || ''),
      frying_batch_id: '',
      flavor_variant: detected.flavor,
      longsong_number: String(nextLongsong),
      longsong_weight_gram: String(totalNeededGram),
      packaged_toples_count: String(remainingPcs),
      packaging_type: detected.packagingType,
      packaging_weight_gram: detected.weight,
      seasoning_used_gram: isOri ? '0' : '', // Untuk Original default 0g (tidak butuh bumbu tabur)
      longsongs_used_count: '1',
      defect_packaging_count: '0',
      notes: '',
    });
    setPackingNavTab('PACKAGING');
    setCreatePackingOpen(true);
  };

  const handleCreatePacking = async () => {
    if (!packingForm.production_order_id) {
      toast.error('Target SPK Produksi tujuan packing belum terhubung');
      return;
    }
    const pcs = Number(packingForm.packaged_toples_count);
    if (!packingForm.packaged_toples_count || isNaN(pcs) || pcs <= 0) {
      toast.error('Jumlah kemasan yang dihasilkan wajib diisi minimal 1 pcs');
      return;
    }

    // Validasi stok bahan baku warehouse & buffer WIP
    if (!packingValidationStatus.isValid) {
      toast.error(packingValidationStatus.errorMessage || 'Stok bahan baku di gudang atau selongsong tidak mencukupi');
      return;
    }

    const cleanPackGram = parseInt((packingForm.packaging_weight_gram || '60g').replace(/\D/g, ''), 10) || 60;
    const neededKg = Number(((pcs * cleanPackGram) / 1000).toFixed(2));
    const seasoningGram = Number(packingForm.seasoning_used_gram) || 0;

    setIsSavingPacking(true);
    try {
      const res = await createPackingEntry({
        production_order_id: packingForm.production_order_id,
        frying_batch_id: packingForm.frying_batch_id || undefined,
        flavor_variant: packingForm.flavor_variant,
        longsong_number: Number(packingForm.longsong_number) || 1,
        longsong_weight_gram: pcs * cleanPackGram,
        packaged_toples_count: pcs,
        packaging_type: packingForm.packaging_type,
        packaging_weight_gram: packingForm.packaging_weight_gram,
        seasoning_used_gram: seasoningGram,
        longsongs_used_count: Number(packingForm.longsongs_used_count) || 1,
        defect_packaging_count: Number(packingForm.defect_packaging_count) || 0,
        notes: packingForm.notes,
        is_packed: true,
      });

      if (res.success) {
        clearFormDraft('draft_prod_packing');
        // Otomatis potong wadah selongsong di Buffer WIP (FIFO)
        if (neededKg > 0) {
          try {
            await consumeLongsongForPacking(neededKg);
          } catch (cErr) {
            console.warn('Longsong container deduction notice:', cErr);
          }
        }

        toast.success(`Packing ${pcs} pcs (${packingForm.flavor_variant} ${packingForm.packaging_weight_gram}) berhasil dicatat & masuk antrean inspeksi QC!`);
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

  const handleOpenDetailPacking = useCallback((entry: DbPackingEntry) => {
    setDetailPackingModal({ isOpen: true, entry });
  }, []);

  const handleOpenEditPacking = useCallback((entry: DbPackingEntry) => {
    setEditPackingForm({
      flavor_variant: entry.flavor_variant || 'Original',
      packaging_type: entry.packaging_type || 'Standing Pouch',
      packaging_weight_gram: entry.packaging_weight_gram || '100g',
      packaged_toples_count: String(entry.packaged_toples_count || ''),
      seasoning_used_gram: String(entry.seasoning_used_gram || '0'),
      longsong_weight_gram: String(entry.longsong_weight_gram || ''),
      defect_packaging_count: '0',
      notes: entry.notes || '',
    });
    setEditPackingModal({ isOpen: true, entry });
  }, []);

  const handleSaveEditPacking = async () => {
    if (!editPackingModal.entry) return;
    const pcs = Number(editPackingForm.packaged_toples_count);
    if (isNaN(pcs) || pcs <= 0) {
      toast.error('Jumlah kemasan yang dihasilkan wajib diisi minimal 1 pcs');
      return;
    }

    setIsSavingEditPacking(true);
    try {
      const res = await updatePackingEntry(editPackingModal.entry.id, {
        flavor_variant: editPackingForm.flavor_variant,
        packaging_type: editPackingForm.packaging_type,
        packaging_weight_gram: editPackingForm.packaging_weight_gram,
        packaged_toples_count: pcs,
        seasoning_used_gram: Number(editPackingForm.seasoning_used_gram) || 0,
        longsong_weight_gram: Number(editPackingForm.longsong_weight_gram) || 0,
        defect_packaging_count: Number(editPackingForm.defect_packaging_count) || 0,
        notes: editPackingForm.notes,
      });

      if (res.success) {
        toast.success(`Entri packing #${editPackingModal.entry.longsong_number} berhasil diperbarui`);
        setEditPackingModal({ isOpen: false, entry: null });
        loadData();
      } else {
        toast.error(res.error || 'Gagal mengubah entri packing');
      }
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setIsSavingEditPacking(false);
    }
  };

  const handleDeletePackingEntry = useCallback((entry: DbPackingEntry) => {
    setConfirmDialog({
      isOpen: true,
      title: `Hapus / Batalkan Packing Longsong #${entry.longsong_number}`,
      description: `Apakah Anda yakin ingin membatalkan entri packing #${entry.longsong_number} (${entry.flavor_variant} - ${entry.packaged_toples_count} pcs)? Stok bumbu tabur (${entry.seasoning_used_gram || 0}g) dan kemasan (${entry.packaging_type || 'Standing Pouch'}) yang telah dialokasikan/dipotong akan dikembalikan otomatis ke gudang bahan baku.`,
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        const res = await deletePackingEntry(entry.id);
        if (res.success) {
          toast.success(`Packing #${entry.longsong_number} berhasil dibatalkan dan stok dikembalikan`);
          loadData();
        } else {
          toast.error(res.error || 'Gagal menghapus entri packing');
        }
      },
    });
  }, [loadData]);



  // ─────────────────────────────────────────────
  // TABLE COLUMNS — FRYING
  // ─────────────────────────────────────────────

  const fryingColumns = useMemo<ColumnDef<DbFryingBatch>[]>(() => [
    {
      accessorKey: 'wajan_number',
      header: 'Batch #',
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
            Pool Pabrik
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
      header: 'SPK & Batch Asal',
      cell: ({ row }) => {
        const order = orders.find(o => o.id === row.original.production_order_id) || row.original.production_order;
        const wajanNum = row.original.frying_batch?.wajan_number;
        return (
          <div>
            <strong style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary-800)' }}>
              {order?.batch_number || 'SPK Terintegrasi'}
            </strong>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              {wajanNum ? `Batch #${wajanNum}` : 'Campuran SPK'}
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
      header: 'Aksi',
      cell: ({ row }: any) => {
        const entry = row.original;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOpenDetailPacking(entry)}
              title="Lihat Detail Rincian Packing"
              style={{ padding: '6px', color: 'var(--color-primary-700)' }}
            >
              <Eye className="w-3.5 h-3.5" />
            </Button>
            {!isManagement && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleOpenEditPacking(entry)}
                  title="Edit Entri Packing"
                  style={{ padding: '6px' }}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                {!entry.is_packed && (
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<PackageCheck className="w-3.5 h-3.5" aria-hidden="true" />}
                    onClick={() => handleMarkPacked(entry.id)}
                    title="Tandai Selesai Packing"
                  >
                    Selesai
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeletePackingEntry(entry)}
                  title="Hapus / Batalkan entri packing ini & kembalikan stok bahan"
                  style={{ color: 'var(--color-danger-600)', padding: '6px' }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </>
            )}
          </div>
        );
      },
    } as ColumnDef<DbPackingEntry>,
  ], [isManagement, handleMarkPacked, orders, handleOpenDetailPacking, handleOpenEditPacking, handleDeletePackingEntry]);

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
              id="btn-buat-spk"
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
            id={`tab-${tab.key.toLowerCase()}`}
            onClick={() => {
              setActiveTab(tab.key);
              if (typeof window !== 'undefined') {
                const url = new URL(window.location.href);
                url.searchParams.set('tab', tab.key.toLowerCase());
                window.history.replaceState(null, '', url.toString());
              }
            }}
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
                <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Batch Goreng Hari Ini</span>
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
                <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Total Output Jamur Matang</span>
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
                <Box className="w-5 h-5 text-[var(--color-primary-600)]" aria-hidden="true" />
                <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Longsong yang Tersedia</span>
              </div>
              <div style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--color-primary-700)' }}>
                {unpackedLongsongCount} <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-secondary)' }}>wadah</span>
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 'var(--space-1)' }}>
                {unpackedLongsongCount > 0 ? 'Siap untuk tahap packing rasa' : 'Semua longsong sudah dipacking'}
              </div>
            </Card>
          </div>

          {/* Antrean & Progres SPK Goreng Jamur */}
          <Card style={{ marginTop: '-4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 'var(--text-base)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Flame className="w-5 h-5 text-[var(--color-primary-600)]" aria-hidden="true" />
                  Antrean &amp; Progres SPK Penggorengan Jamur
                </h3>
              </div>
            </div>

            {fryingOrdersWithProgress.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-4)', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
                Belum ada SPK Goreng aktif. Klik tombol &quot;+ Buat SPK Baru&quot; di bagian atas untuk menerbitkan perintah kerja baru.
              </div>
            ) : (
              <div style={{
                overflowX: 'auto',
                maxHeight: fryingOrdersWithProgress.length > 5 ? '380px' : undefined,
                overflowY: fryingOrdersWithProgress.length > 5 ? 'auto' : undefined,
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
                  <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-surface)', zIndex: 1 }}>
                    <tr style={{ borderBottom: '2px solid var(--border-default)', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase' }}>
                      <th style={{ padding: '8px 12px', fontWeight: 600 }}>No. SPK / Batch</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600 }}>Target Bahan</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600 }}>Realisasi &amp; Waktu HACCP</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600 }}>Output Longsong (WIP)</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600, minWidth: '140px' }}>Progres</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600 }}>Status</th>
                      {!isManagement && <th style={{ padding: '8px 12px', fontWeight: 600, textAlign: 'right' }}>Aksi</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {fryingOrdersWithProgress.map(({ order, targetKg, realizedKg, realizedBatchesCount, remainingKg, progressPercent, outputKg, longsongTotal, avgDurationMinutes, haccpCompliance, readyContainers, availableWeightKg }) => (
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
                            ~{Math.round(targetKg / 0.8)} batch (@800g)
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <div>
                            <span style={{ fontWeight: 600, color: 'var(--color-success-700)' }}>
                              {realizedKg.toFixed(1)} kg
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '4px' }}>
                              ({realizedBatchesCount} batch)
                            </span>
                            {realizedKg > targetKg && (
                              <span style={{
                                marginLeft: '6px',
                                background: 'var(--color-warning-100)',
                                color: 'var(--color-warning-900)',
                                border: '1px solid var(--color-warning-300)',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                fontWeight: 700,
                                display: 'inline-block',
                              }}>
                                Over Target (+{(realizedKg - targetKg).toFixed(1)} kg)
                              </span>
                            )}
                          </div>
                          {avgDurationMinutes > 0 ? (
                            <div style={{ fontSize: '11px', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                              <Clock size={11} className="text-secondary" />
                              <span style={{ color: 'var(--text-secondary)' }}>
                                Rata-rata: <strong>{avgDurationMinutes.toFixed(1)} mnt/batch</strong>
                              </span>
                              {haccpCompliance === 'OPTIMAL' && (
                                <span style={{ background: 'var(--color-success-100)', color: 'var(--color-success-800)', padding: '1px 5px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                  <Check className="w-2.5 h-2.5" /> Sesuai HACCP (15±2m)
                                </span>
                              )}
                              {haccpCompliance === 'OVERCOOK' && (
                                <span style={{ background: 'var(--color-danger-100)', color: 'var(--color-danger-800)', padding: '1px 5px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                  <AlertTriangle className="w-2.5 h-2.5" /> &gt;17 mnt (Overcook)
                                </span>
                              )}
                              {haccpCompliance === 'UNDERCOOK' && (
                                <span style={{ background: 'var(--color-warning-100)', color: 'var(--color-warning-800)', padding: '1px 5px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                  <AlertTriangle className="w-2.5 h-2.5" /> &lt;13 mnt (Undercook)
                                </span>
                              )}
                            </div>
                          ) : (
                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                              Belum ada batch selesai
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          {longsongTotal > 0 || outputKg > 0 ? (
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--color-primary-800)' }}>
                                {longsongTotal} Wadah ({outputKg.toFixed(1)} kg)
                              </div>
                              {readyContainers.length > 0 ? (
                                <div style={{ fontSize: '11px', color: 'var(--color-success-700)', fontWeight: 600, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Box className="w-3.5 h-3.5 shrink-0" /> {availableWeightKg.toFixed(1)} kg Siap Packing ({readyContainers.length} wadah)
                                </div>
                              ) : (
                                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                                  Seluruh wadah sudah terpakai packing
                                </div>
                              )}
                            </div>
                          ) : (
                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                              Menunggu input selesai masak
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
                          {remainingKg > 0 && order.status !== 'COMPLETED' && (
                            <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                              Sisa {remainingKg.toFixed(1)} kg (~{Math.ceil(remainingKg / 0.8)} wajan)
                            </div>
                          )}
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
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleOpenSpkBatches(order)}
                                leftIcon={<Flame className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />}
                                title="Lihat riwayat rincian batch wajan untuk SPK ini"
                                style={{ padding: '6px 10px', fontSize: '11px', whiteSpace: 'nowrap' }}
                              >
                                Rincian Wajan ({fryingBatches.filter(b => b.production_order_id === order.id).length})
                              </Button>
                              {order.status !== 'COMPLETED' ? (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  leftIcon={<CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />}
                                  onClick={() => handleOpenRecordFryingRun(order)}
                                  title="Catat hasil goreng dan konsumsi bahan aktual (bisa sebagian atau langsung selesai tuntas)"
                                >
                                  Catat Hasil Goreng
                                </Button>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                                  <span style={{ fontSize: '11px', color: 'var(--color-success-700)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 inline" aria-hidden="true" />
                                    <span>Selesai ({longsongTotal} Longsong)</span>
                                  </span>
                                  <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                                    Rendemen: {order.yield_percentage ? `${order.yield_percentage}%` : `${((outputKg / (realizedKg || 1)) * 100).toFixed(0)}%`}
                                  </span>
                                </div>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenEditSpk(order)}
                                title="Edit Target SPK"
                                style={{ padding: '6px' }}
                              >
                                <Pencil className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteSpk(order)}
                                title="Hapus / Batalkan SPK"
                                style={{ color: 'var(--color-danger-600)', padding: '6px' }}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
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

          {/* Buffer WIP: Kartu Stok Longsong (Jamur Matang) */}
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 'var(--text-base)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Box className="w-5 h-5 text-[var(--color-primary-600)]" aria-hidden="true" />
                  Buffer WIP: Kartu Stok Longsong (Jamur Matang)
                </h3>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Daftar wadah fisik jamur matang hasil penggorengan per SPK dengan pencatatan berat aktual per wadah.
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--color-primary-50)',
                  color: 'var(--color-primary-700)',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: '1px solid var(--color-primary-200)',
                }}>
                  Total Tersedia: {longsongContainers.filter(c => c.status === 'AVAILABLE' || c.status === 'PARTIAL').reduce((s, c) => s + (Number(c.current_weight_kg) || 0), 0).toFixed(1)} kg
                </span>
                <span style={{
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--bg-subtle)',
                  color: 'var(--text-secondary)',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: '1px solid var(--border-default)',
                }}>
                  {longsongContainers.filter(c => c.status === 'AVAILABLE' || c.status === 'PARTIAL').length} Wadah Aktif
                </span>
              </div>
            </div>

            {longsongContainers.length === 0 ? (
              <div
                key="empty-longsong-state"
                style={{
                  textAlign: 'center',
                  padding: 'var(--space-4)',
                  color: 'var(--text-secondary)',
                  fontSize: 'var(--text-sm)',
                }}
              >
                Belum ada kartu wadah longsong terdaftar. Selesaikan penggorengan SPK untuk menghasilkan kartu stok wadah longsong fisik.
              </div>
            ) : (
              <div
                key="grid-longsong-containers"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
                  gap: '12px',
                  maxHeight: longsongContainers.length > 5 ? '360px' : undefined,
                  overflowY: longsongContainers.length > 5 ? 'auto' : undefined,
                  padding: longsongContainers.length > 5 ? '0 6px 0 0' : '0',
                }}
              >
                {longsongContainers.map(c => {
                  const isAvailable = c.status === 'AVAILABLE';
                  const isPartial = c.status === 'PARTIAL';
                  const isEmpty = c.status === 'EMPTY';

                  return (
                    <div
                      key={c.id}
                      style={{
                        padding: '12px',
                        borderRadius: 'var(--radius-md)',
                        border: isAvailable
                          ? '1px solid var(--color-success-300)'
                          : isPartial
                          ? '1px solid var(--color-warning-300)'
                          : '1px solid var(--border-default)',
                        background: isAvailable
                          ? 'var(--color-success-50)'
                          : isPartial
                          ? 'var(--color-warning-50)'
                          : 'var(--bg-subtle)',
                        opacity: isEmpty ? 0.6 : 1,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '8px',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{
                            fontWeight: 700,
                            fontSize: '13px',
                            color: isAvailable ? 'var(--color-success-900)' : isPartial ? 'var(--color-warning-900)' : 'var(--text-secondary)',
                          }}>
                            Wadah #{c.container_number}
                          </span>
                          <span style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: 700,
                            background: isAvailable ? 'var(--color-success-200)' : isPartial ? 'var(--color-warning-200)' : 'var(--border-default)',
                            color: isAvailable ? 'var(--color-success-900)' : isPartial ? 'var(--color-warning-900)' : 'var(--text-secondary)',
                          }}>
                            {isAvailable ? 'Tersedia' : isPartial ? 'Sebagian' : 'Kosong'}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          {c.production_order?.batch_number || 'SPK Penggorengan'}
                        </div>
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                          <span style={{ fontSize: '18px', fontWeight: 800, color: isAvailable ? 'var(--color-success-800)' : isPartial ? 'var(--color-warning-800)' : 'var(--text-primary)' }}>
                            {Number(c.current_weight_kg || 0).toFixed(2)}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            / {Number(c.initial_weight_kg || 0).toFixed(2)} kg
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed var(--border-default)' }}>
                          <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                            {c.created_at ? format(new Date(c.created_at), 'dd MMM, HH:mm', { locale: idLocale }) : '-'}
                          </div>
                          {!isManagement && (
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button
                                type="button"
                                onClick={() => handleOpenEditLongsong(c)}
                                title="Edit Wadah Longsong"
                                style={{
                                  border: '1px solid var(--border-default)',
                                  background: 'var(--bg-surface)',
                                  borderRadius: 'var(--radius-sm)',
                                  padding: '3px 6px',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  color: 'var(--text-secondary)',
                                }}
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteLongsong(c)}
                                title="Hapus Wadah Longsong"
                                style={{
                                  border: '1px solid var(--color-danger-300)',
                                  background: 'var(--color-danger-50)',
                                  borderRadius: 'var(--radius-sm)',
                                  padding: '3px 6px',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  color: 'var(--color-danger-600)',
                                }}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

        </>
      )}

      {/* ════════════════════════════════════════════ */}
      {/* TAB 2: PRODUKSI PACKING RASA                */}
      {/* ════════════════════════════════════════════ */}
      {activeTab === 'PACKING' && (
        <>
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
                <Box className="w-5 h-5 text-[var(--color-primary-600)]" aria-hidden="true" />
                <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Longsong yang Tersedia</span>
              </div>
              <div style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--color-primary-700)' }}>
                {unpackedLongsongCount} <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-secondary)' }}>wadah</span>
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 'var(--space-1)' }}>
                {unpackedLongsongCount > 0 ? 'Wadah jamur matang siap dibumbui' : 'Tidak ada wadah siap packing'}
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
            </div>

            {friedOrdersData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-4)', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
                Belum ada SPK Packing Retail aktif. Klik tombol &quot;Buat SPK Packing Rasa&quot; di bagian atas untuk menerbitkan SPK retail kemasan.
              </div>
            ) : (
              <div style={{
                overflowX: 'auto',
                maxHeight: friedOrdersData.length > 5 ? '420px' : undefined,
                overflowY: friedOrdersData.length > 5 ? 'auto' : undefined,
                border: friedOrdersData.length > 5 ? '1px solid var(--border-default)' : undefined,
                borderRadius: friedOrdersData.length > 5 ? 'var(--radius-md)' : undefined,
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border-default)', textAlign: 'left' }}>
                      <th style={{ padding: '8px 12px', fontWeight: 600 }}>No. SPK Batch</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600 }}>Varian Produk</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600 }}>Longsong Terpakai</th>
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
                            {hasPackaged ? (
                              <>
                                <span style={{ fontWeight: 600 }}>
                                  {item.packedCount} / {item.totalLongsongProduced} longsong
                                </span>
                                {item.unpackedCount > 0 && (
                                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500 }}>
                                    {item.unpackedCount} longsong belum packing
                                  </div>
                                )}
                              </>
                            ) : (
                              <div>
                                <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                                  0 / {item.totalLongsongProduced} longsong
                                </span>
                                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                                  Belum ada packing
                                </div>
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            {hasPackaged ? (
                              <strong style={{ fontSize: 'var(--text-sm)', color: 'var(--color-primary-800)' }}>
                                {item.totalPackagedPcs} pcs
                              </strong>
                            ) : (
                              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>
                                0 pcs
                              </span>
                            )}
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
                            ) : hasPackaged ? (
                              <StatusBadge status="active" label="Sedang Dipacking" />
                            ) : (
                              <span style={{
                                fontSize: 'var(--text-xs)',
                                color: 'var(--text-secondary)',
                                fontWeight: 500,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '3px 8px',
                                borderRadius: 'var(--radius-full)',
                                background: 'var(--bg-subtle)',
                                border: '1px solid var(--border-default)',
                              }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text-tertiary)' }} />
                                Belum Dipacking
                              </span>
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
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSpk(item.order)}
                                  title={`Hapus SPK ${item.order.batch_number}`}
                                  style={{
                                    border: '1px solid var(--color-danger-300)',
                                    background: 'var(--color-danger-50)',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: 'pointer',
                                    padding: '6px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--color-danger-600)',
                                  }}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
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
      {/* MODAL: GORENG REGULER (TANPA SPK)               */}
      {/* ═══════════════════════════════════════════════ */}
      <Modal
        isOpen={createRegularFryingOpen}
        onClose={() => setCreateRegularFryingOpen(false)}
        closeOnOverlayClick={false}
        title={`Goreng Jamur (Tanpa SPK) — Wajan #${regularFryingForm.wajan_number}`}
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
          {Boolean(getFormDraft('draft_prod_regular_frying')) && (
            <DraftNoticeBanner
              onReset={() => {
                clearFormDraft('draft_prod_regular_frying');
                setRegularFryingForm({
                  production_order_id: '',
                  wajan_number: regularFryingForm.wajan_number || '1',
                  batch_weight_gram: '800',
                  oil_temp_celsius: '170',
                  notes: '',
                });
                toast.info('Draft form wajan goreng telah direset');
              }}
            />
          )}
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
              Wajan ini dialokasikan untuk <strong>Penggorengan Jamur Bebas (Tanpa SPK)</strong>, seperti sisa jamur segar atau uji coba adonan. Hasil matang akan otomatis masuk ke pool longsong jamur pabrik.
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
                Pool Pabrik (Khusus Tanpa SPK)
              </strong>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                Hasil penggorengan langsung masuk ke stok longsong untuk disiapkan ke tahap packing rasa.
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
        closeOnOverlayClick={false}
        title="Batch HACCP Time Study (Catatan Jam Dinding)"
        size="md"
        footer={
          <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 'var(--space-2)' }}>
            {!isHaccpFryingValid && (
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-danger-600)', textAlign: 'right', fontWeight: 500 }}>
                * Wajib mengisi waktu mulai, waktu selesai (maks 30 menit), output matang (&gt; 0g), dan jumlah longsong (&gt; 0)
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
          {Boolean(getFormDraft('draft_prod_haccp_frying')) && (
            <DraftNoticeBanner
              onReset={() => {
                clearFormDraft('draft_prod_haccp_frying');
                const defaultStart = getCurrentTimeString();
                const defaultEnd = addMinutesToTimeString(defaultStart, 15);
                setHaccpFryingForm({
                  production_order_id: '',
                  wajan_number: haccpFryingForm.wajan_number || '1',
                  batch_weight_gram: '800',
                  oil_temp_celsius: '170',
                  start_time: defaultStart,
                  end_time: defaultEnd,
                  output_weight_gram: '',
                  longsong_count: '',
                  kremesan_weight_gram: '0',
                  notes: '',
                });
                toast.info('Draft form HACCP telah direset');
              }}
            />
          )}
          <FormField label="Alokasi Target Wajan (Opsional)">
            <Select
              options={[
                { value: '', label: 'Pool Pabrik (Tanpa SPK Khusus)' },
                ...fryingOrdersWithProgress.map(({ order: o, targetKg, realizedKg, remainingKg, progressPercent }) => ({
                  value: o.id,
                  label: `SPK ${o.batch_number} (Target: ${targetKg}kg | Realisasi: ${realizedKg.toFixed(1)}kg | Sisa: ${remainingKg.toFixed(1)}kg | ${progressPercent}%)`,
                })),
              ]}
              value={haccpFryingForm.production_order_id}
              onChange={(e) => setHaccpFryingForm({ ...haccpFryingForm, production_order_id: e.target.value })}
            />
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: '4px', display: 'block' }}>
              Penggorengan wajan menghasilkan <strong>Jamur Crispy Polos</strong>. Pemilihan varian rasa (Balado, BBQ, dll) dan kemasan dilakukan pada tahap <strong>Packing Rasa</strong>.
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
        closeOnOverlayClick={false}
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
          {selectedFryingBatch && Boolean(getFormDraft(`draft_prod_complete_${selectedFryingBatch.id}`)) && (
            <DraftNoticeBanner
              onReset={() => {
                clearFormDraft(`draft_prod_complete_${selectedFryingBatch.id}`);
                setCompleteFryingForm({
                  output_weight_gram: selectedFryingBatch.output_weight_gram ? String(selectedFryingBatch.output_weight_gram) : '',
                  longsong_count: selectedFryingBatch.longsong_count ? String(selectedFryingBatch.longsong_count) : '',
                  kremesan_weight_gram: selectedFryingBatch.kremesan_weight_gram != null ? String(selectedFryingBatch.kremesan_weight_gram) : '0',
                  notes: selectedFryingBatch.notes || '',
                });
                toast.info('Draft form hasil timbangan telah direset');
              }}
            />
          )}
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

      {/* ── MODAL: RINCIAN BATCH WAJAN PER SPK ── */}
      <Modal
        isOpen={spkBatchesModalOpen}
        onClose={() => setSpkBatchesModalOpen(false)}
        title={`Rincian Batch Wajan — SPK ${selectedSpkForBatches?.batch_number || ''}`}
        size="xl"
        footer={<Button variant="secondary" onClick={() => setSpkBatchesModalOpen(false)}>Tutup</Button>}
      >
        {selectedSpkForBatches && (() => {
          const orderBatches = fryingBatches.filter(b => b.production_order_id === selectedSpkForBatches.id);
          const totalInputMushroomKg = Number(selectedSpkForBatches.input_weight) || 0;
          const targetQtyKg = Number(selectedSpkForBatches.target_quantity) || 50;

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {/* Header Summary */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '12px',
                padding: '12px 16px',
                background: 'var(--color-primary-50)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-primary-200)',
              }}>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Target SPK:</span>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--color-primary-900)' }}>
                    {targetQtyKg} kg
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Telah Digoreng:</span>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--color-success-700)' }}>
                    {totalInputMushroomKg.toFixed(1)} kg
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Jumlah Wajan:</span>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
                    {orderBatches.length} Wajan
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Status SPK:</span>
                  <div>
                    <StatusBadge
                      status={selectedSpkForBatches.status === 'COMPLETED' ? 'completed' : selectedSpkForBatches.status === 'IN_PROGRESS' ? 'in_progress' : 'pending'}
                      label={selectedSpkForBatches.status === 'COMPLETED' ? 'Selesai' : selectedSpkForBatches.status === 'IN_PROGRESS' ? 'Sedang Jalan' : 'Menunggu'}
                    />
                  </div>
                </div>
              </div>

              {/* Action Toolbar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                  Daftar seluruh batch wajan dan stopwatch penggorengan untuk SPK ini.
                </div>
                {!isManagement && selectedSpkForBatches.status !== 'COMPLETED' && (
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Plus className="w-3.5 h-3.5" aria-hidden="true" />}
                    onClick={() => {
                      handleOpenCreateRegularFrying(selectedSpkForBatches);
                    }}
                  >
                    + Tambah Wajan untuk SPK Ini
                  </Button>
                )}
              </div>

              {/* Tabel Wajan Khusus SPK Ini */}
              <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
                <DataTable columns={fryingColumns} data={orderBatches} />
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ═══════════════════════════════════════════════ */}
      {/* MODAL: REKAP SELESAI MASAK SPK (BAHAN AKTUAL)   */}
      {/* ═══════════════════════════════════════════════ */}
      <Modal
        isOpen={recordFryingRunOpen}
        onClose={() => setRecordFryingRunOpen(false)}
        closeOnOverlayClick={false}
        title={`Catat Hasil Goreng — SPK ${selectedFryingOrder?.batch_number}`}
        size="lg"
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '8px', flexWrap: 'wrap' }}>
            <div>
              <Button variant="secondary" onClick={() => setRecordFryingRunOpen(false)} disabled={isSubmittingFryingRun}>
                Batal
              </Button>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
              {!isFryingRunFormFullyComplete && (
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', maxWidth: '280px', textAlign: 'right' }}>
                  Isi lengkap seluruh tab untuk mengaktifkan simpan
                </span>
              )}

              <Button
                variant="secondary"
                onClick={() => handleSubmitFryingRun(true)}
                disabled={!isFryingRunFormFullyComplete || isSubmittingFryingRun}
                title={!isFryingRunFormFullyComplete ? fryingRunMissingMessage : 'Simpan catatan sesi ini. Status SPK tetap Sedang Berjalan (IN_PROGRESS).'}
              >
                {isSubmittingFryingRun ? 'Menyimpan...' : 'Simpan Sementara'}
              </Button>
              <Button
                variant="primary"
                onClick={handleInitiateSubmitComplete}
                leftIcon={fryingStockStatus.hasAnyShortage ? <AlertTriangle className="w-4 h-4" aria-hidden="true" /> : <CheckCircle2 className="w-4 h-4" aria-hidden="true" />}
                disabled={!isFryingRunFormFullyComplete || isSubmittingFryingRun}
                title={!isFryingRunFormFullyComplete ? fryingRunMissingMessage : 'Simpan dan selesaikan target SPK ini.'}
              >
                {isSubmittingFryingRun
                  ? 'Menyimpan...'
                  : fryingStockStatus.hasAnyShortage
                  ? 'Stok Gudang Kurang'
                  : 'Simpan Selesai'}
              </Button>
            </div>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {selectedFryingOrder && Boolean(getFormDraft(`draft_prod_frying_run_${selectedFryingOrder.id}`)) && (
            <DraftNoticeBanner
              onReset={() => {
                clearFormDraft(`draft_prod_frying_run_${selectedFryingOrder.id}`);
                setFryingRunForm({
                  actual_mushroom_kg: '',
                  actual_premix_kg: '',
                  actual_cooking_oil_liter: '',
                  output_finished_kg: '',
                  output_longsong_count: '',
                  batch_count: '',
                  notes: '',
                  containers: [],
                  batches: [],
                });
                toast.info('Draft form rekap SPK telah direset');
              }}
            />
          )}
          {selectedFryingOrder && (() => {
            const targetMushroom = Number(selectedFryingOrder.target_quantity) || 50;
            const actualMushroom = parseFloat(fryingRunForm.actual_mushroom_kg) || 0;
            const actualPremix = parseFloat(fryingRunForm.actual_premix_kg) || 0;
            const actualOil = parseFloat(fryingRunForm.actual_cooking_oil_liter) || 0;
            const outputFinished = parseFloat(fryingRunForm.output_finished_kg) || 0;
            const longsongCount = parseInt(fryingRunForm.output_longsong_count, 10) || 0;
            const prevInput = Number(selectedFryingOrder.input_weight) || 0;
            const prevOutput = Number(selectedFryingOrder.output_weight) || 0;
            const remainingTargetKg = Math.max(0, targetMushroom - prevInput);
            const targetBase = remainingTargetKg > 0 ? Number(remainingTargetKg.toFixed(2)) : targetMushroom;
            const maxMushroomAllowed = Number((targetBase * 1.2).toFixed(2));

            // Standar BOM & estimasi batch wajan berdasarkan jamur yang dimasak
            const { premixRatio, oilRatio, batchWeightKg, defaultBatchGram } = getFryingBomRatios(selectedFryingOrder);
            const baseMushroomForBom = actualMushroom > 0 ? actualMushroom : maxMushroomAllowed;
            const bomPremix = Number((baseMushroomForBom * premixRatio).toFixed(2));
            const bomOil = Number((baseMushroomForBom * oilRatio).toFixed(2));
            const estBatchForMushroom = Math.max(1, Math.round(baseMushroomForBom / batchWeightKg));
            const diffPremix = actualPremix - bomPremix;
            const diffOil = actualOil - bomOil;

            // Rendemen & Batas BOM
            const minYieldPct = productionStandards?.min_yield_percentage || 65.0;
            const maxYieldPct = productionStandards?.max_yield_percentage || 85.0;
            const yld = actualMushroom > 0 && outputFinished > 0 ? (outputFinished / actualMushroom) * 100 : 0;
            const isTooHighYield = yld > maxYieldPct;
            const isGoodYield = yld >= minYieldPct && !isTooHighYield;
            const isLowYield = yld > 0 && yld < minYieldPct;
            const maxOutputWajarKg = Number(((baseMushroomForBom * maxYieldPct) / 100).toFixed(1));

            return (
              <>
                {/* Header Information Banner */}
                <div style={{
                  padding: '12px 14px',
                  background: 'var(--color-primary-50)',
                  border: '1px solid var(--color-primary-200)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '8px',
                  }}>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--color-primary-800)', textTransform: 'uppercase', fontWeight: 600 }}>
                        SPK Penggorengan
                      </div>
                      <div style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--color-primary-900)' }}>
                        {selectedFryingOrder.batch_number}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '16px', textAlign: 'right', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--color-primary-800)' }}>Target SPK</div>
                        <div style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--color-primary-900)' }}>
                          {targetMushroom} kg
                        </div>
                      </div>
                      {prevInput > 0 && (
                        <div>
                          <div style={{ fontSize: '11px', color: 'var(--color-success-700)' }}>Sudah Digoreng</div>
                          <div style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--color-success-800)' }}>
                            {prevInput.toFixed(1)} kg
                          </div>
                        </div>
                      )}
                      {prevInput > 0 && (
                        <div>
                          <div style={{ fontSize: '11px', color: 'var(--color-warning-700)' }}>Sisa Target</div>
                          <div style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--color-warning-800)' }}>
                            {remainingTargetKg.toFixed(1)} kg
                          </div>
                        </div>
                      )}
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--color-primary-800)' }}>
                          {fryingRunForm.batch_count ? 'Jumlah Batch Sesi Ini' : 'Estimasi Total Batch'}
                        </div>
                        <div style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--color-primary-900)' }}>
                          {fryingRunForm.batch_count ? `${fryingRunForm.batch_count} batch` : `~${Math.round(targetMushroom / batchWeightKg)} batch`}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div style={{
                    fontSize: '11.5px',
                    color: 'var(--color-primary-900)',
                    padding: '6px 10px',
                    borderRadius: '4px',
                    background: 'rgba(255, 255, 255, 0.75)',
                    border: '1px dashed var(--color-primary-300)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}>
                    <Info className="w-3.5 h-3.5 text-primary-700 shrink-0" />
                    <span>
                      Input di bawah adalah bahan &amp; hasil untuk <strong>sesi/shift masak ini</strong>. Pastikan semua tab (Bahan, Longsong, dan Batch) terisi lengkap untuk mengaktifkan tombol <strong>&quot;Simpan Sementara&quot;</strong> atau <strong>&quot;Simpan Selesai&quot;</strong>.
                    </span>
                  </div>
                </div>

                {/* Nav Tabs dalam Modal */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  borderBottom: '1px solid var(--border-default)',
                  marginTop: '6px',
                  width: '100%',
                }}>
                  {[
                    { id: 'BAHAN', label: '1. Bahan & Hasil', icon: <Scale size={14} /> },
                    {
                      id: 'LONGSONG',
                      label: '2. Longsong',
                      icon: <Box size={14} />,
                      badge: fryingRunForm.output_longsong_count ? `${fryingRunForm.output_longsong_count} wadah` : undefined,
                    },
                    {
                      id: 'BATCH',
                      label: '3. Waktu Batch (HACCP)',
                      icon: <Timer size={14} />,
                      badge: fryingRunForm.batches.length > 0 ? `${fryingRunForm.batches.length} batch` : undefined,
                    },
                  ].map((tab) => {
                    const isActive = fryingRunTab === tab.id;

                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setFryingRunTab(tab.id as any)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          padding: '7px 8px',
                          border: 'none',
                          borderBottom: isActive ? '2px solid var(--color-primary-600)' : '2px solid transparent',
                          marginBottom: '-1px',
                          background: isActive ? 'var(--color-primary-50)' : 'transparent',
                          color: isActive ? 'var(--color-primary-800)' : 'var(--text-secondary)',
                          fontWeight: isActive ? 700 : 500,
                          fontSize: '12.5px',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          transition: 'all 0.15s ease',
                          borderRadius: '6px 6px 0 0',
                          width: '100%',
                        }}
                      >
                        {tab.icon}
                        <span>{tab.label}</span>
                        {tab.badge && (
                          <span style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: '10px',
                            background: isActive ? 'var(--color-primary-200)' : 'var(--bg-subtle)',
                            color: isActive ? 'var(--color-primary-900)' : 'var(--text-tertiary)',
                            flexShrink: 0,
                          }}>
                            {tab.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* ── TAB 1: KONSUMSI BAHAN BAKU & HASIL TOTAL ── */}
                {fryingRunTab === 'BAHAN' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                    {fryingStockStatus.hasAnyShortage && (
                      <div style={{
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--color-danger-50)',
                        border: '1px solid var(--color-danger-300)',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        color: 'var(--color-danger-900)',
                        fontSize: '12px',
                      }}>
                        <AlertTriangle size={16} className="text-danger-600 shrink-0" style={{ marginTop: '2px' }} />
                        <div>
                          <div style={{ fontWeight: 700 }}>Stok Bahan Baku di Gudang Tidak Mencukupi!</div>
                          <div style={{ marginTop: '2px', color: 'var(--color-danger-800)', fontSize: '11px' }}>
                            Timbangan konsumsi riil melebihi stok yang tersedia di Warehouse. Harap lakukan penerimaan stok (Inbound / Restock) atau sesuaikan jumlah pemakaian sebelum menyimpan.
                          </div>
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Konsumsi Bahan Baku Riil di Dapur (Timbangan Aktual)
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const mushroomToUse = fryingRunForm.actual_mushroom_kg ? parseFloat(fryingRunForm.actual_mushroom_kg) : maxMushroomAllowed;
                            const calcPremix = Number((mushroomToUse * premixRatio).toFixed(1));
                            const calcOil = Number((mushroomToUse * oilRatio).toFixed(1));
                            setFryingRunForm(f => ({
                              ...f,
                              actual_mushroom_kg: f.actual_mushroom_kg || String(maxMushroomAllowed),
                              actual_premix_kg: String(calcPremix),
                              actual_cooking_oil_liter: String(calcOil),
                            }));
                            toast.success(`Bahan diisi otomatis sesuai standar BOM (Premix: ${calcPremix} kg, Minyak: ${calcOil} L)`);
                          }}
                          style={{
                            fontSize: '11px',
                            color: 'var(--color-primary-700)',
                            fontWeight: 600,
                            background: 'var(--color-primary-50)',
                            border: '1px solid var(--color-primary-200)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '3px 8px',
                            cursor: 'pointer',
                          }}
                        >
                          Isi Sesuai Standar BOM
                        </button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)' }}>
                        <FormField label="Jamur Tiram Segar (kg)" required>
                          <Input
                            type="number"
                            step="0.1"
                            min="0.1"
                            max={maxMushroomAllowed}
                            value={fryingRunForm.actual_mushroom_kg}
                            onChange={(e) => handleFryingRunMushroomChange(e.target.value)}
                            placeholder={`Maks: ${maxMushroomAllowed} kg`}
                            style={{
                              borderColor: fryingStockStatus.mushroom.isShortage ? 'var(--color-danger-500)' : undefined,
                            }}
                          />
                          <div style={{ fontSize: '11px', marginTop: '3px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-tertiary)' }}>
                              <span>Target: <strong>{targetBase} kg</strong> (Maks +20%: <strong>{maxMushroomAllowed} kg</strong>)</span>
                              <span style={{
                                fontWeight: 600,
                                color: fryingStockStatus.mushroom.isShortage ? 'var(--color-danger-600)' : 'var(--color-success-700)',
                              }}>
                                Stok: {fryingStockStatus.mushroom.availableStock.toFixed(1)} kg
                              </span>
                            </div>
                            {fryingStockStatus.mushroom.isShortage && (
                              <span style={{ color: 'var(--color-danger-600)', fontWeight: 600, fontSize: '10.5px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <AlertTriangle className="w-3 h-3 shrink-0" /> Kurang {(fryingStockStatus.mushroom.actual - fryingStockStatus.mushroom.availableStock).toFixed(1)} kg
                              </span>
                            )}
                          </div>
                        </FormField>

                        <FormField label="Tepung Premix (kg)" required>
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            max={fryingStockStatus.premix.availableStock > 0 ? fryingStockStatus.premix.availableStock : undefined}
                            value={fryingRunForm.actual_premix_kg}
                            onChange={(e) => handleFryingRunPremixChange(e.target.value)}
                            placeholder={`BOM: ${bomPremix.toFixed(1)} kg`}
                            style={{
                              borderColor: fryingStockStatus.premix.isShortage ? 'var(--color-danger-500)' : undefined,
                            }}
                          />
                          <div style={{ fontSize: '11px', marginTop: '3px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-tertiary)' }}>
                              <span>BOM: {bomPremix.toFixed(1)} kg</span>
                              <span style={{
                                fontWeight: 600,
                                color: fryingStockStatus.premix.isShortage ? 'var(--color-danger-600)' : 'var(--color-success-700)',
                              }}>
                                Stok: {fryingStockStatus.premix.availableStock.toFixed(1)} kg
                              </span>
                            </div>
                            {fryingStockStatus.premix.isShortage && (
                              <span style={{ color: 'var(--color-danger-600)', fontWeight: 600, fontSize: '10.5px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <AlertTriangle className="w-3 h-3 shrink-0" /> Kurang {(fryingStockStatus.premix.actual - fryingStockStatus.premix.availableStock).toFixed(1)} kg
                              </span>
                            )}
                          </div>
                        </FormField>

                        <FormField label="Minyak Goreng (Liter)" required>
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            max={fryingStockStatus.oil.availableStock > 0 ? fryingStockStatus.oil.availableStock : undefined}
                            value={fryingRunForm.actual_cooking_oil_liter}
                            onChange={(e) => handleFryingRunOilChange(e.target.value)}
                            placeholder={`BOM: ${bomOil.toFixed(1)} L`}
                            style={{
                              borderColor: fryingStockStatus.oil.isShortage ? 'var(--color-danger-500)' : undefined,
                            }}
                          />
                          <div style={{ fontSize: '11px', marginTop: '3px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-tertiary)' }}>
                              <span>BOM: {bomOil.toFixed(1)} L</span>
                              <span style={{
                                fontWeight: 600,
                                color: fryingStockStatus.oil.isShortage ? 'var(--color-danger-600)' : 'var(--color-success-700)',
                              }}>
                                Stok: {fryingStockStatus.oil.availableStock.toFixed(1)} L
                              </span>
                            </div>
                            {fryingStockStatus.oil.isShortage && (
                              <span style={{ color: 'var(--color-danger-600)', fontWeight: 600, fontSize: '10.5px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <AlertTriangle className="w-3 h-3 shrink-0" /> Kurang {(fryingStockStatus.oil.actual - fryingStockStatus.oil.availableStock).toFixed(1)} L
                              </span>
                            )}
                          </div>
                        </FormField>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '8px', borderTop: '1px dashed var(--border-default)' }}>
                      <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Total Hasil Jamur Matang &amp; Jumlah Batch Wajan
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                        <FormField label="Total Berat Jamur Matang + Kremesan (kg)" required>
                          <Input
                            type="number"
                            step="0.1"
                            min="0.1"
                            value={fryingRunForm.output_finished_kg}
                            onChange={(e) => handleFryingRunOutputKgChange(e.target.value)}
                            placeholder={`Misal: ${(baseMushroomForBom * 0.67).toFixed(1)} kg`}
                          />
                          <span style={{ fontSize: '11px', color: isTooHighYield ? 'var(--color-danger-600)' : 'var(--text-tertiary)', marginTop: '2px', display: 'block' }}>
                            Estimasi standar: ~{(baseMushroomForBom * 0.67).toFixed(1)} kg | Maksimal wajar BOM: {maxOutputWajarKg} kg ({maxYieldPct}%)
                          </span>
                        </FormField>

                        <FormField label="Jumlah Batch Wajan yang Digoreng" required>
                          <Input
                            type="number"
                            step="1"
                            min="1"
                            max="100"
                            value={fryingRunForm.batch_count}
                            onChange={(e) => handleFryingRunBatchCountChange(e.target.value)}
                            placeholder="Misal: 10"
                          />
                          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px', display: 'block' }}>
                            Sinkron otomatis dengan {fryingRunForm.batches.length || 0} kartu batch di tab Waktu Batch
                          </span>
                        </FormField>
                      </div>

                      {/* Rendemen Card */}
                      <div style={{
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-md)',
                        background: isTooHighYield ? 'var(--color-danger-50)' : isGoodYield ? 'var(--color-success-50)' : isLowYield ? 'var(--color-warning-50)' : 'var(--bg-subtle)',
                        border: `1px solid ${isTooHighYield ? 'var(--color-danger-300)' : isGoodYield ? 'var(--color-success-300)' : isLowYield ? 'var(--color-warning-300)' : 'var(--border-default)'}`,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}>
                        <div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Rendemen Penggorengan:</div>
                          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: isTooHighYield ? 'var(--color-danger-800)' : isGoodYield ? 'var(--color-success-800)' : 'var(--color-warning-800)' }}>
                            {yld.toFixed(1)}%
                          </div>
                        </div>
                        <div style={{ fontSize: '11px', color: isTooHighYield ? 'var(--color-danger-700)' : isGoodYield ? 'var(--color-success-700)' : 'var(--text-tertiary)', textAlign: 'right' }}>
                          {isTooHighYield ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                              <AlertTriangle className="w-3.5 h-3.5" /> Melebihi batas maksimal wajar BOM (Maks {maxYieldPct}%)
                            </span>
                          ) : isGoodYield ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                              <Check className="w-3.5 h-3.5" /> Memenuhi standar rendemen ({minYieldPct}% - {maxYieldPct}%)
                            </span>
                          ) : isLowYield ? (
                            <span style={{ color: 'var(--color-warning-800)', fontWeight: 600 }}>
                              Di bawah target efisiensi standar (&lt;{minYieldPct}%)
                            </span>
                          ) : (
                            `Target efisiensi dapur: ${minYieldPct}% - ${maxYieldPct}%`
                          )}
                        </div>
                      </div>
                    </div>

                    <FormField label="Catatan Tambahan (Opsional)">
                      <Textarea
                        rows={2}
                        value={fryingRunForm.notes}
                        onChange={(e) => setFryingRunForm({ ...fryingRunForm, notes: e.target.value })}
                        placeholder="Catatan kondisi minyak, api wajan, sisa adonan, dll..."
                      />
                    </FormField>
                  </div>
                )}

                {/* ── TAB 2: RINCIAN WADAH LONGSONG ── */}
                {fryingRunTab === 'LONGSONG' && (() => {
                  const accumulatedContainersKg = fryingRunForm.containers.reduce((acc, c) => acc + (parseFloat(c.weight_kg) || 0), 0);
                  const remainingUnallocatedKg = Number((outputFinished - accumulatedContainersKg).toFixed(2));
                  const isFullyAllocated = Math.abs(remainingUnallocatedKg) <= 0.01;
                  const isOverAllocated = remainingUnallocatedKg < -0.01;

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                      <div style={{
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-md)',
                        background: isFullyAllocated ? 'var(--color-success-50)' : isOverAllocated ? 'var(--color-danger-50)' : 'var(--color-primary-50)',
                        border: `1px solid ${isFullyAllocated ? 'var(--color-success-300)' : isOverAllocated ? 'var(--color-danger-300)' : 'var(--color-primary-200)'}`,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '8px',
                      }}>
                        <div>
                          <div style={{
                            fontWeight: 700,
                            fontSize: 'var(--text-sm)',
                            color: isFullyAllocated ? 'var(--color-success-900)' : isOverAllocated ? 'var(--color-danger-900)' : 'var(--color-primary-900)',
                          }}>
                            Total Output: {outputFinished.toFixed(2)} kg
                          </div>
                          <div style={{
                            fontSize: '11px',
                            color: isFullyAllocated ? 'var(--color-success-700)' : isOverAllocated ? 'var(--color-danger-700)' : 'var(--color-primary-700)',
                            marginTop: '2px',
                            display: 'flex',
                            gap: '8px',
                            flexWrap: 'wrap',
                          }}>
                            <span>Terbagi ke dalam {fryingRunForm.containers.length} wadah</span>
                            <span>•</span>
                            <span>Teralokasi: <strong>{accumulatedContainersKg.toFixed(2)} kg</strong></span>
                            <span>•</span>
                            <span>
                              {isFullyAllocated ? (
                                <strong style={{ color: 'var(--color-success-700)' }}>Semua Wadah Pas 100%</strong>
                              ) : isOverAllocated ? (
                                <strong style={{ color: 'var(--color-danger-700)' }}>Kelebihan {Math.abs(remainingUnallocatedKg).toFixed(2)} kg!</strong>
                              ) : (
                                <strong>Sisa Belum Teralokasi: {remainingUnallocatedKg.toFixed(2)} kg</strong>
                              )}
                            </span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={handleAutoBalanceContainers}
                            title="Bagi rata total berat output ke setiap wadah"
                          >
                            Bagi Rata Otomatis
                          </Button>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', alignItems: 'center' }}>
                        <FormField label="Jumlah Wadah Longsong yang Terisi" required>
                          <Input
                            type="number"
                            min="1"
                            value={fryingRunForm.output_longsong_count}
                            onChange={(e) => handleFryingRunLongsongChange(e.target.value)}
                            placeholder={`Misal: ${Math.max(1, Math.round((actualMushroom * 0.67) / 2.5))}`}
                          />
                          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px', display: 'block' }}>
                            Input manual bobot wadah, atau klik &quot;Bagi Rata Otomatis&quot; di atas.
                          </span>
                        </FormField>

                        <div style={{
                          padding: '10px 12px',
                          borderRadius: 'var(--radius-md)',
                          background: 'var(--bg-subtle)',
                          border: '1px solid var(--border-default)',
                          fontSize: '11px',
                          color: 'var(--text-secondary)',
                        }}>
                          <div>Rata-rata per Longsong: <strong>{(outputFinished / (longsongCount || 1)).toFixed(2)} kg</strong></div>
                          <div style={{ marginTop: '2px', color: 'var(--text-tertiary)' }}>
                            Standar wadah fisik longsong di pabrik: ~2.4 kg - 2.6 kg per wadah.
                          </div>
                        </div>
                      </div>

                      {/* Grid Input Berat Wadah */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Berat Aktual Masing-Masing Wadah Longsong:
                          </span>
                          {fryingRunForm.containers.length > 0 && (
                            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                              {fryingRunForm.containers.filter(c => parseFloat(c.weight_kg) > 0).length} dari {fryingRunForm.containers.length} wadah terisi
                            </span>
                          )}
                        </div>
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                          gap: '8px',
                        }}>
                          {fryingRunForm.containers.map((c, idx) => {
                            const otherSum = fryingRunForm.containers.reduce((acc, otherC, i) => i !== idx ? acc + (parseFloat(otherC.weight_kg) || 0) : acc, 0);
                            const maxForThis = Math.max(0, Number((outputFinished - otherSum).toFixed(2)));
                            const currentVal = parseFloat(c.weight_kg) || 0;
                            const canTakeMore = remainingUnallocatedKg > 0.01;

                            return (
                              <div
                                key={c.container_number}
                                style={{
                                  padding: '8px',
                                  background: 'var(--bg-surface)',
                                  border: `1px solid ${currentVal > 0 ? 'var(--color-primary-300)' : 'var(--border-subtle)'}`,
                                  borderRadius: 'var(--radius-sm)',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '4px',
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                    Wadah #{c.container_number}
                                  </div>
                                  {canTakeMore && (
                                    <button
                                      type="button"
                                      onClick={() => handleFillRemainingContainerWeight(idx)}
                                      style={{
                                        background: 'var(--color-primary-50)',
                                        border: '1px solid var(--color-primary-200)',
                                        color: 'var(--color-primary-700)',
                                        fontSize: '10px',
                                        padding: '1px 5px',
                                        borderRadius: 'var(--radius-sm)',
                                        cursor: 'pointer',
                                        fontWeight: 600,
                                      }}
                                      title={`Isi otomatis wadah #${c.container_number} dengan sisa ${remainingUnallocatedKg.toFixed(2)} kg`}
                                    >
                                      + Sisa ({remainingUnallocatedKg.toFixed(2)})
                                    </button>
                                  )}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Input
                                    type="number"
                                    step="0.05"
                                    min="0.1"
                                    max={maxForThis > 0 ? maxForThis : undefined}
                                    value={c.weight_kg}
                                    onChange={(e) => handleContainerWeightChange(idx, e.target.value)}
                                    placeholder="0.0"
                                    style={{ height: '30px', fontSize: '12px', padding: '2px 6px' }}
                                  />
                                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>kg</span>
                                </div>
                                <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textAlign: 'right' }}>
                                  Maks: {maxForThis.toFixed(2)} kg
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div style={{
                          fontSize: '11px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '6px 10px',
                          borderRadius: 'var(--radius-sm)',
                          background: isFullyAllocated ? 'var(--color-success-50)' : isOverAllocated ? 'var(--color-danger-50)' : 'var(--bg-subtle)',
                          border: `1px solid ${isFullyAllocated ? 'var(--color-success-200)' : isOverAllocated ? 'var(--color-danger-200)' : 'var(--border-default)'}`,
                          color: isFullyAllocated ? 'var(--color-success-800)' : isOverAllocated ? 'var(--color-danger-800)' : 'var(--text-secondary)',
                          flexWrap: 'wrap',
                          gap: '6px',
                        }}>
                          <span>Total Target Output: <strong>{outputFinished.toFixed(2)} kg</strong></span>
                          <span>Akumulasi Wadah: <strong>{accumulatedContainersKg.toFixed(2)} kg</strong></span>
                          <span>
                            {isFullyAllocated ? (
                              <strong style={{ color: 'var(--color-success-700)' }}>Alokasi Sempurna (100%)</strong>
                            ) : isOverAllocated ? (
                              <strong style={{ color: 'var(--color-danger-700)' }}>Kelebihan {Math.abs(remainingUnallocatedKg).toFixed(2)} kg</strong>
                            ) : (
                              <strong style={{ color: 'var(--color-warning-700)' }}>Kurang {remainingUnallocatedKg.toFixed(2)} kg</strong>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* ── TAB 3: WAKTU BATCH PENGGORENGAN (HACCP) ── */}
                {fryingRunTab === 'BATCH' && (() => {
                  const stdDuration = Number(productionStandards?.frying_duration_minutes) || 15;
                  const oilMin = Number(productionStandards?.oil_temp_min) || 150;
                  const oilMax = Number(productionStandards?.oil_temp_max) || 180;
                  const stdTemp = Math.round((oilMin + oilMax) / 2) || 165;
                  const ccpMinMinutes = Math.max(1, stdDuration - 2);
                  const ccpMaxMinutes = stdDuration + 2;

                  const validBatches = fryingRunForm.batches.filter(b => parseFloat(b.duration_minutes) > 0);
                  const hasFilledBatches = validBatches.length > 0;
                  const avgMinutes = hasFilledBatches
                    ? validBatches.reduce((s, b) => s + parseFloat(b.duration_minutes), 0) / validBatches.length
                    : 0;
                  const isHaccpOptimal = hasFilledBatches && avgMinutes >= ccpMinMinutes && avgMinutes <= ccpMaxMinutes;
                  const isHaccpOver = hasFilledBatches && avgMinutes > ccpMaxMinutes;
                  const isHaccpUnder = hasFilledBatches && avgMinutes < ccpMinMinutes;

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                      {/* HACCP Summary Card */}
                      <div style={{
                        padding: '12px 14px',
                        borderRadius: 'var(--radius-md)',
                        background: isHaccpOptimal ? 'var(--color-success-50)' : !hasFilledBatches ? 'var(--bg-subtle)' : 'var(--color-warning-50)',
                        border: `1px solid ${isHaccpOptimal ? 'var(--color-success-300)' : !hasFilledBatches ? 'var(--border-default)' : 'var(--color-warning-300)'}`,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '12px',
                      }}>
                        <div>
                          <div style={{ fontSize: '11px', color: isHaccpOptimal ? 'var(--color-success-800)' : !hasFilledBatches ? 'var(--text-secondary)' : 'var(--color-warning-900)', fontWeight: 600 }}>
                            RATA-RATA WAKTU PENGGORENGAN PER BATCH (HACCP)
                          </div>
                          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: isHaccpOptimal ? 'var(--color-success-800)' : !hasFilledBatches ? 'var(--text-primary)' : 'var(--color-warning-800)', fontFamily: 'monospace' }}>
                            {hasFilledBatches ? `${avgMinutes.toFixed(1)} menit / batch` : 'Belum diisi'}
                          </div>
                          <div style={{ fontSize: '11px', color: isHaccpOptimal ? 'var(--color-success-700)' : !hasFilledBatches ? 'var(--text-tertiary)' : 'var(--color-warning-800)', marginTop: '2px' }}>
                            {!hasFilledBatches && (
                              <span>Standar SOP: {stdDuration} menit (suhu {oilMin}°C - {oilMax}°C). Klik &quot;Set Standar ({stdDuration} Mnt)&quot; di samping atau isi manual.</span>
                            )}
                            {isHaccpOptimal && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                <Check className="w-3 h-3" /> Sesuai batas kritis CCP HACCP (Standar SOP: {stdDuration} ± 2 menit / {ccpMinMinutes} - {ccpMaxMinutes} menit)
                              </span>
                            )}
                            {isHaccpOver && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                <AlertTriangle className="w-3 h-3" /> Rata-rata melebihi {ccpMaxMinutes} menit (Potensi overcook / jamur terlalu gelap)
                              </span>
                            )}
                            {isHaccpUnder && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                <AlertTriangle className="w-3 h-3" /> Rata-rata kurang dari {ccpMinMinutes} menit (Potensi undercook / jamur kurang renyah)
                              </span>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={handleAutoBalanceBatchWeights}
                            title="Bagi rata bobot jamur segar ke seluruh batch"
                          >
                            Bagi Rata Jamur
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={handleSetAllBatchesStandard}
                            title={`Set semua batch ke standar SOP (${stdDuration} menit dan ${stdTemp}°C)`}
                          >
                            Set Standar ({stdDuration} Mnt)
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            leftIcon={<Plus size={14} />}
                            onClick={handleAddBatch}
                          >
                            Tambah Batch
                          </Button>
                        </div>
                      </div>

                      {/* Tabel Durasi Batch */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Daftar Batch dalam SPK Ini ({fryingRunForm.batches.length} Batch):
                          </span>
                          <div style={{ display: 'flex', gap: '10px', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                            <span>
                              Total Jamur: <strong>{fryingRunForm.batches.reduce((s, b) => s + (parseFloat(b.batch_weight_gram) || 0), 0)}g</strong> ({((fryingRunForm.batches.reduce((s, b) => s + (parseFloat(b.batch_weight_gram) || 0), 0)) / 1000).toFixed(2)} kg)
                            </span>
                            <span>
                              Total Waktu: <strong>{validBatches.reduce((s, b) => s + parseFloat(b.duration_minutes), 0).toFixed(1)} menit</strong>
                            </span>
                          </div>
                        </div>

                        {fryingRunForm.batches.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: 'var(--space-4)', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
                            Belum ada batch tercatat. Masukkan &quot;Jumlah Batch Wajan&quot; di Tab 1 (Bahan &amp; Hasil) atau klik &quot;+ Tambah Batch&quot; di atas.
                          </div>
                        ) : (
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                            gap: '10px',
                            maxHeight: '260px',
                            overflowY: 'auto',
                            padding: '4px',
                          }}>
                            {fryingRunForm.batches.map((b, idx) => (
                              <div
                                key={idx}
                                style={{
                                  padding: '10px',
                                  background: 'var(--bg-surface)',
                                  border: '1px solid var(--border-default)',
                                  borderRadius: 'var(--radius-sm)',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '6px',
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-primary-800)' }}>
                                    Batch #{b.wajan_number}
                                  </span>
                                  {fryingRunForm.batches.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveBatch(idx)}
                                      style={{ background: 'none', border: 'none', color: 'var(--color-danger-600)', cursor: 'pointer', padding: '2px' }}
                                      title="Hapus batch ini"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  )}
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                                  <div>
                                    <label style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>
                                      Jamur (gram)
                                    </label>
                                    <Input
                                      type="number"
                                      step="50"
                                      min="100"
                                      max="5000"
                                      value={b.batch_weight_gram || ''}
                                      onChange={(e) => handleBatchWeightChange(idx, e.target.value)}
                                      placeholder="800"
                                      style={{ height: '28px', fontSize: '12px', padding: '2px 6px' }}
                                    />
                                  </div>
                                  <div>
                                    <label style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>
                                      Waktu (Maks 30 mnt)
                                    </label>
                                    <Input
                                      type="number"
                                      step="0.5"
                                      min="1"
                                      max="30"
                                      value={b.duration_minutes}
                                      onChange={(e) => handleBatchDurationChange(idx, e.target.value)}
                                      placeholder={String(stdDuration)}
                                      style={{ height: '28px', fontSize: '12px', padding: '2px 6px' }}
                                    />
                                  </div>
                                  <div>
                                    <label style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>
                                      Suhu (°C)
                                    </label>
                                    <Input
                                      type="number"
                                      step="5"
                                      min="100"
                                      max="250"
                                      value={b.oil_temp_celsius}
                                      onChange={(e) => handleBatchTempChange(idx, e.target.value)}
                                      placeholder={String(stdTemp)}
                                      style={{ height: '28px', fontSize: '12px', padding: '2px 6px' }}
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </>
            );
          })()}
        </div>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* MODAL PERINGATAN: TARGET SPK BELUM TERPENUHI (UNDER-TARGET) */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={underTargetConfirmOpen}
        onClose={() => setUnderTargetConfirmOpen(false)}
        closeOnOverlayClick={false}
        title="Target SPK Belum Terpenuhi"
        size="lg"
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '12px' }}>
            <Button
              variant="secondary"
              onClick={() => setUnderTargetConfirmOpen(false)}
              disabled={isSubmittingFryingRun}
            >
              Batal
            </Button>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Button
                variant="secondary"
                onClick={() => {
                  setUnderTargetConfirmOpen(false);
                  handleSubmitFryingRun(true);
                }}
                disabled={isSubmittingFryingRun}
                title="Status SPK tetap Sedang Berjalan (IN_PROGRESS) untuk dilanjutkan di sesi berikutnya"
              >
                Simpan Sementara
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setUnderTargetConfirmOpen(false);
                  handleSubmitFryingRun(false);
                }}
                disabled={isSubmittingFryingRun}
                style={{ background: 'var(--color-warning-600)', borderColor: 'var(--color-warning-700)' }}
                title="Tutup SPK ini sekarang sebagai selesai tuntas (COMPLETED) di angka ini"
              >
                Selesaikan SPK
              </Button>
            </div>
          </div>
        }
      >
        {underTargetData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{
              display: 'flex',
              gap: '12px',
              padding: '12px 14px',
              background: 'var(--color-warning-50)',
              border: '1px solid var(--color-warning-200)',
              borderRadius: 'var(--radius-md)',
              alignItems: 'flex-start',
            }}>
              <AlertTriangle className="w-5 h-5 text-warning-600 shrink-0 mt-0.5" />
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-warning-900)', lineHeight: 1.5 }}>
                Akumulasi jamur segar yang dimasak pada SPK ini baru mencapai <strong>{underTargetData.totalInputKg.toFixed(1)} kg</strong> dari target <strong>{underTargetData.targetKg} kg</strong> (<strong>{underTargetData.pct}%</strong>).
                Terdapat kekurangan <strong>{underTargetData.shortageKg.toFixed(1)} kg</strong> untuk memenuhi target SPK.
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div style={{
              padding: '12px',
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Progres SPK Saat Ini:</span>
                <span style={{ color: 'var(--color-warning-700)' }}>{underTargetData.pct}% ({underTargetData.totalInputKg.toFixed(1)} / {underTargetData.targetKg} kg)</span>
              </div>
              <div style={{
                height: '10px',
                background: 'var(--bg-surface)',
                borderRadius: '5px',
                overflow: 'hidden',
                border: '1px solid var(--border-subtle)',
              }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(100, Math.max(0, underTargetData.pct))}%`,
                  background: 'var(--color-warning-500)',
                  transition: 'width 0.3s ease',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                <span>Sesi Sebelumnya: {underTargetData.prevInputKg.toFixed(1)} kg</span>
                <span>Sesi Ini: {underTargetData.currentMushroomKg.toFixed(1)} kg</span>
                <span>Kurang: {underTargetData.shortageKg.toFixed(1)} kg</span>
              </div>
            </div>

            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Anda memilih tombol <strong>Simpan Selesai</strong>. Bagaimana Anda ingin memproses SPK ini?
              <ul style={{ margin: '8px 0 0 18px', padding: 0, listStyleType: 'disc', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12.5px' }}>
                <li>
                  <strong>Simpan Sementara:</strong> Catatan sesi ini tersimpan dan stok gudang terpotong, status SPK tetap <em>IN_PROGRESS</em> agar sisa {underTargetData.shortageKg.toFixed(1)} kg dapat dilanjutkan pada shift atau hari berikutnya.
                </li>
                <li>
                  <strong>Selesaikan SPK:</strong> Menutup paksa SPK ini menjadi <em>COMPLETED</em> jika memang kegiatan produksi sengaja disudahi di angka {underTargetData.totalInputKg.toFixed(1)} kg.
                </li>
                <li>
                  <strong>Batal:</strong> Menutup pesan ini untuk memeriksa kembali angka pada formulir jika terjadi salah input.
                </li>
              </ul>
            </div>
          </div>
        )}
      </Modal>

      {/* ═══════════════════════════════════════════════ */}
      {/* MODAL: INPUT PACKING RASA                      */}
      {/* ═══════════════════════════════════════════════ */}
      {/* ═══════════════════════════════════════════════ */}
      {/* MODAL: INPUT PACKING RASA & KEMASAN (2 NAV)     */}
      {/* ═══════════════════════════════════════════════ */}
      <Modal
        isOpen={createPackingOpen}
        onClose={() => setCreatePackingOpen(false)}
        closeOnOverlayClick={false}
        title="Input Packing Rasa & Kemasan SPK"
        size="lg"
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div>
              {packingNavTab === 'BUMBU' ? (
                <Button
                  variant="secondary"
                  onClick={() => setPackingNavTab('PACKAGING')}
                  leftIcon={<ArrowLeft className="w-4 h-4" aria-hidden="true" />}
                  disabled={isSavingPacking}
                >
                  Kembali ke Kemasan
                </Button>
              ) : (
                <Button variant="secondary" onClick={() => setCreatePackingOpen(false)} disabled={isSavingPacking}>
                  Batal
                </Button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              {packingNavTab === 'BUMBU' && (
                <Button variant="secondary" onClick={() => setCreatePackingOpen(false)} disabled={isSavingPacking}>
                  Batal
                </Button>
              )}
              {packingNavTab === 'PACKAGING' ? (
                packingValidationStatus.isOriginalVariant ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {!packingValidationStatus.isValid && (
                      <span style={{ fontSize: '11px', color: 'var(--color-danger-700)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {packingValidationStatus.errorMessage}
                      </span>
                    )}
                    <Button
                      variant="primary"
                      onClick={handleCreatePacking}
                      leftIcon={<Package className="w-4 h-4" aria-hidden="true" />}
                      disabled={isSavingPacking || !packingValidationStatus.isValid}
                      title={!packingValidationStatus.isValid ? packingValidationStatus.errorMessage : undefined}
                    >
                      {isSavingPacking ? 'Sedang Menyimpan...' : 'Simpan & Proses Packing (Original)'}
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="primary"
                    onClick={() => {
                      const pcs = Number(packingForm.packaged_toples_count);
                      if (!pcs || pcs <= 0) {
                        toast.error('Masukkan jumlah kemasan minimal 1 pcs');
                        return;
                      }
                      setPackingNavTab('BUMBU');
                    }}
                    rightIcon={<ArrowRight className="w-4 h-4" aria-hidden="true" />}
                  >
                    Lanjut ke Alokasi Bumbu
                  </Button>
                )
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {!packingValidationStatus.isValid && (
                    <span style={{ fontSize: '11px', color: 'var(--color-danger-700)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {packingValidationStatus.errorMessage}
                    </span>
                  )}
                  <Button
                    variant="primary"
                    onClick={handleCreatePacking}
                    leftIcon={<Package className="w-4 h-4" aria-hidden="true" />}
                    disabled={isSavingPacking || !packingValidationStatus.isValid}
                    title={!packingValidationStatus.isValid ? packingValidationStatus.errorMessage : undefined}
                  >
                    {isSavingPacking ? 'Sedang Menyimpan...' : 'Simpan & Proses Packing'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        }
      >
        {(() => {
          const targetSpk = friedOrdersData.find(d => d.order.id === packingForm.production_order_id) || friedOrdersData[0];
          const spkTargetPcs = targetSpk?.order.target_quantity || 200;
          const spkCompletedPcs = targetSpk?.totalPackagedPcs || 0;
          const spkRemainingPcs = Math.max(0, spkTargetPcs - spkCompletedPcs);

          const cleanPackGram = parseInt((packingForm.packaging_weight_gram || '60g').replace(/\D/g, ''), 10) || 60;
          const pcsInput = Number(packingForm.packaged_toples_count) || 0;
          const neededMushroomGram = pcsInput * cleanPackGram;
          const neededMushroomKg = Number((neededMushroomGram / 1000).toFixed(2));

          const activeContainers = longsongContainers.filter(
            c => (c.status === 'AVAILABLE' || c.status === 'PARTIAL') && Number(c.current_weight_kg) > 0
          );
          const totalContainerKg = activeContainers.reduce((sum, c) => sum + (Number(c.current_weight_kg) || 0), 0);
          const isMushroomSufficient = totalContainerKg >= neededMushroomKg;

          const currentSeasoningRm = warehouseSeasoningMaterials.find(rm => rm.id === packingForm.seasoning_material_id) || matchedSeasoningInfo.matchedRm;
          const isGramUom = currentSeasoningRm?.uom?.toLowerCase() === 'gram' || currentSeasoningRm?.uom?.toLowerCase() === 'gr';
          const currentSeasoningStockGram = currentSeasoningRm
            ? (isGramUom ? Number(currentSeasoningRm.available_stock || 0) : Number(currentSeasoningRm.available_stock || 0) * 1000)
            : 0;


          if (!targetSpk) {
            return (
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
            );
          }

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <DraftNoticeBanner
                onClear={() => {
                  clearFormDraft('draft_prod_packing');
                  if (friedOrdersData.length > 0) {
                    const firstSpk = friedOrdersData[0];
                    const spkTargetPcs = firstSpk.order.target_quantity || 200;
                    const spkCompletedPcs = firstSpk.totalPackagedPcs || 0;
                    const spkRemainingPcs = Math.max(0, spkTargetPcs - spkCompletedPcs);
                    setPackingForm({
                      production_order_id: firstSpk.order.id,
                      seasoning_material_id: '',
                      frying_batch_id: '',
                      flavor_variant: 'Original',
                      longsong_number: '1',
                      longsong_weight_gram: '',
                      packaged_toples_count: String(spkRemainingPcs > 0 ? spkRemainingPcs : spkTargetPcs),
                      packaging_type: 'Standing Pouch',
                      packaging_weight_gram: '60g',
                      seasoning_used_gram: '0',
                      longsongs_used_count: '1',
                      defect_packaging_count: '0',
                      notes: '',
                    });
                  }
                }}
              />
              {/* Locked SPK Information Header */}
              <div style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-primary-50)',
                border: '1px solid var(--color-primary-200)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles className="w-4 h-4 text-[var(--color-primary-600)]" aria-hidden="true" />
                    <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--color-primary-950)' }}>
                      Target SPK {targetSpk.order.batch_number} — {targetSpk.order.product?.name || targetSpk.order.product_variant || 'KhumKhum'}
                    </span>
                  </div>
                  <span style={{
                    fontSize: '11px',
                    background: 'var(--color-primary-100)',
                    color: 'var(--color-primary-800)',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}>
                    <Lock className="w-3 h-3" /> Terkunci dari SPK
                  </span>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '8px',
                  fontSize: 'var(--text-xs)',
                  borderTop: '1px solid var(--color-primary-200)',
                  paddingTop: '8px',
                }}>
                  <div>
                    <div style={{ color: 'var(--text-tertiary)', fontSize: '10.5px' }}>Varian Rasa</div>
                    <strong style={{ color: 'var(--color-primary-900)' }}>{packingForm.flavor_variant}</strong>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-tertiary)', fontSize: '10.5px' }}>Kemasan &amp; Berat</div>
                    <strong style={{ color: 'var(--color-primary-900)' }}>{packingForm.packaging_type} {packingForm.packaging_weight_gram}</strong>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-tertiary)', fontSize: '10.5px' }}>Target SPK</div>
                    <strong style={{ color: 'var(--color-primary-900)' }}>{spkTargetPcs} pcs</strong>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-tertiary)', fontSize: '10.5px' }}>Sisa Belum Dipacking</div>
                    <strong style={{ color: spkRemainingPcs > 0 ? 'var(--color-primary-700)' : 'var(--color-success-700)' }}>
                      {spkRemainingPcs} pcs
                    </strong>
                  </div>
                </div>
              </div>

              {/* 2 Navigation Tabs */}
              <div style={{
                display: 'flex',
                borderBottom: '1px solid var(--border-default)',
                gap: '8px',
              }}>
                <button
                  type="button"
                  onClick={() => setPackingNavTab('PACKAGING')}
                  style={{
                    padding: '8px 16px',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 600,
                    border: 'none',
                    background: 'none',
                    borderBottom: packingNavTab === 'PACKAGING' ? '2px solid var(--color-primary-600)' : '2px solid transparent',
                    color: packingNavTab === 'PACKAGING' ? 'var(--color-primary-700)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Package className="w-4 h-4" aria-hidden="true" />
                  <span>1. Kemasan Jadi &amp; Jamur Longsong</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const pcs = Number(packingForm.packaged_toples_count);
                    if (!pcs || pcs <= 0) {
                      toast.error('Masukkan jumlah kemasan minimal 1 pcs di Tab 1');
                      return;
                    }
                    setPackingNavTab('BUMBU');
                  }}
                  style={{
                    padding: '8px 16px',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 600,
                    border: 'none',
                    background: 'none',
                    borderBottom: packingNavTab === 'BUMBU' ? '2px solid var(--color-primary-600)' : '2px solid transparent',
                    color: packingNavTab === 'BUMBU' ? 'var(--color-primary-700)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Sparkles className="w-4 h-4" aria-hidden="true" />
                  <span>2. Alokasi Bumbu Tabur {packingValidationStatus.isOriginalVariant ? '(Tidak Diperlukan)' : ''}</span>
                </button>
              </div>

              {/* TAB 1: KEMASAN JADI & JAMUR LONGSONG */}
              {packingNavTab === 'PACKAGING' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {/* Auto-Matched Warehouse Packaging Card */}
                  <div style={{
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    background: '#fff',
                    border: '1px solid var(--border-default)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Box className="w-4 h-4 text-[var(--color-primary-600)]" aria-hidden="true" />
                        <strong style={{ fontSize: 'var(--text-sm)' }}>Bahan Baku Kemasan (Gudang Warehouse)</strong>
                      </div>
                      {matchedPackagingInfo.isStockSufficient ? (
                        <span style={{
                          fontSize: '11px',
                          color: 'var(--color-success-700)',
                          background: 'var(--color-success-50)',
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-full)',
                          border: '1px solid var(--color-success-200)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontWeight: 600,
                        }}>
                          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                          Stok Warehouse Mencukupi
                        </span>
                      ) : (
                        <span style={{
                          fontSize: '11px',
                          color: 'var(--color-warning-700)',
                          background: 'var(--color-warning-50)',
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-full)',
                          border: '1px solid var(--color-warning-200)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontWeight: 600,
                        }}>
                          <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                          Stok Gudang Kurang
                        </span>
                      )}
                    </div>

                    <div style={{
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-subtle)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: 'var(--text-xs)',
                    }}>
                      <div>
                        <strong style={{ color: 'var(--text-primary)' }}>
                          {matchedPackagingInfo.matchedRm?.name || `Packaging Standing Pouch ${packingForm.flavor_variant} ${packingForm.packaging_weight_gram}`}
                        </strong>
                        <div style={{ color: 'var(--text-tertiary)', fontSize: '11px', marginTop: '2px' }}>
                          Kode: <span style={{ fontFamily: 'monospace' }}>{matchedPackagingInfo.matchedRm?.code || 'PKG-AUTO'}</span> • Kategori: Packaging
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ color: 'var(--text-secondary)' }}>Stok Gudang: <strong>{matchedPackagingInfo.availableStock !== null ? `${matchedPackagingInfo.availableStock.toLocaleString('id-ID')} pcs` : 'Tersedia'}</strong></div>
                        <div style={{ color: 'var(--color-primary-700)', fontWeight: 600 }}>Dibutuhkan: {matchedPackagingInfo.neededPcs} pcs</div>
                      </div>
                    </div>
                  </div>

                  {/* Input Target Kemasan Pcs & Defect */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                    <FormField label="Jumlah Kemasan Jadi (pcs) *" required>
                      <Input
                        type="number"
                        min="1"
                        value={packingForm.packaged_toples_count}
                        onChange={(e) => {
                          const newPcs = e.target.value;
                          const numPcs = Number(newPcs) || 0;
                          const newWeightGram = numPcs * cleanPackGram;
                          setPackingForm(prev => ({
                            ...prev,
                            packaged_toples_count: newPcs,
                            longsong_weight_gram: String(newWeightGram),
                          }));
                        }}
                        placeholder="200"
                      />
                      <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px', display: 'block' }}>
                        Default sesuai target SPK ({spkRemainingPcs} pcs). Bisa diubah jika packing bertahap.
                      </span>
                    </FormField>

                    <FormField label="Kemasan Rusak / Scrap Saat Seal (pcs)">
                      <Input
                        type="number"
                        min="0"
                        value={packingForm.defect_packaging_count}
                        onChange={(e) => setPackingForm({ ...packingForm, defect_packaging_count: e.target.value })}
                        placeholder="0"
                      />
                      <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px', display: 'block' }}>
                        Pouch / toples rusak saat sealing (opsional).
                      </span>
                    </FormField>
                  </div>

                  {/* Kalkulasi Kebutuhan Jamur Longsong (Buffer WIP) */}
                  <div style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-primary-50)',
                    border: '1px solid var(--color-primary-200)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    fontSize: 'var(--text-xs)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: 'var(--color-primary-950)' }}>
                        <Scale className="w-4 h-4 text-[var(--color-primary-600)]" aria-hidden="true" />
                        <span>Kebutuhan Jamur Matang (Wadah Selongsong Buffer WIP)</span>
                      </div>
                      {isMushroomSufficient ? (
                        <span style={{
                          fontSize: '11px',
                          color: 'var(--color-success-700)',
                          background: 'var(--color-success-50)',
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-full)',
                          border: '1px solid var(--color-success-200)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontWeight: 600,
                        }}>
                          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                          Selongsong Cukup
                        </span>
                      ) : (
                        <span style={{
                          fontSize: '11px',
                          color: 'var(--color-warning-700)',
                          background: 'var(--color-warning-50)',
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-full)',
                          border: '1px solid var(--color-warning-200)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontWeight: 600,
                        }}>
                          <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                          Stok Wadah Kurang
                        </span>
                      )}
                    </div>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '8px',
                    }}>
                      <div style={{ background: '#fff', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-primary-200)' }}>
                        <div style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>Kalkulasi Kebutuhan Jamur:</div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-primary-900)', marginTop: '2px' }}>
                          {pcsInput} pcs × {cleanPackGram}g = <span style={{ color: 'var(--color-primary-700)' }}>{neededMushroomKg.toFixed(1)} kg</span> ({neededMushroomGram.toLocaleString('id-ID')}g)
                        </div>
                      </div>

                      <div style={{ background: '#fff', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-primary-200)' }}>
                        <div style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>Ketersediaan di Buffer Selongsong:</div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: isMushroomSufficient ? 'var(--color-success-700)' : 'var(--color-warning-700)', marginTop: '2px' }}>
                          {totalContainerKg.toFixed(1)} kg <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)' }}>({activeContainers.length} wadah aktif)</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ color: 'var(--color-primary-800)', fontSize: '11px', lineHeight: 1.4, borderTop: '1px dashed var(--color-primary-200)', paddingTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Zap className="w-3.5 h-3.5 text-primary-600 shrink-0" />
                      <span>Saat disimpan, sistem secara otomatis memotong <strong>{neededMushroomKg.toFixed(1)} kg jamur matang</strong> dari wadah selongsong secara urut (FIFO) dan memotong <strong>{matchedPackagingInfo.neededPcs} pcs kemasan</strong> dari Warehouse.</span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: ALOKASI BUMBU TABUR */}
              {packingNavTab === 'BUMBU' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {packingValidationStatus.isOriginalVariant ? (
                    <div style={{
                      padding: '16px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--color-success-50)',
                      border: '1px solid var(--color-success-200)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: 'var(--color-success-900)' }}>
                        <CheckCircle2 className="w-5 h-5 text-[var(--color-success-600)]" aria-hidden="true" />
                        <span>Varian Original Tidak Menggunakan Bumbu Tabur</span>
                      </div>
                      <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--color-success-800)', lineHeight: 1.5 }}>
                        Produk jamur crispy rasa <strong>Original</strong> mengandalkan gurih alami dari adonan tepung premix saat penggorengan. Tidak ada bumbu tabur yang dibutuhkan dan tidak ada stok bumbu yang akan dipotong dari gudang.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Dropdown Pemilihan Bumbu Tabur dari Warehouse */}
                      <FormField label="Pilih Bahan Baku Bumbu Tabur (Gudang Warehouse)" required>
                        <Select
                          options={warehouseSeasoningMaterials.map(rm => ({
                            value: rm.id,
                            label: `[${rm.code || 'BUMBU'}] ${rm.name} (Stok: ${Number(rm.available_stock || 0).toLocaleString('id-ID')} ${rm.uom || 'g'})`,
                          }))}
                          value={packingForm.seasoning_material_id || currentSeasoningRm?.id || ''}
                          onChange={(e) => {
                            const rmId = e.target.value;
                            setPackingForm(prev => ({
                              ...prev,
                              seasoning_material_id: rmId,
                            }));
                          }}
                        />
                      </FormField>

                      {/* Stok Status Bumbu Card */}
                      {currentSeasoningRm && (
                        <div style={{
                          padding: '10px 12px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--bg-subtle)',
                          border: '1px solid var(--border-default)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: 'var(--text-xs)',
                        }}>
                          <div>
                            <div style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>Item Bumbu Terpilih:</div>
                            <strong style={{ color: 'var(--text-primary)' }}>{currentSeasoningRm.name}</strong>
                            <span style={{ color: 'var(--text-secondary)', marginLeft: '6px', fontFamily: 'monospace' }}>({currentSeasoningRm.code})</span>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ color: 'var(--text-secondary)' }}>Stok Tersedia di Warehouse:</div>
                            <strong style={{ color: currentSeasoningStockGram > 0 ? 'var(--color-success-700)' : 'var(--color-danger-700)' }}>
                              {currentSeasoningStockGram.toLocaleString('id-ID')} gram ({(currentSeasoningStockGram / 1000).toFixed(1)} kg)
                            </strong>
                          </div>
                        </div>
                      )}

                      {/* Input Timbangan Riil Bumbu Tabur (Manual) */}
                      <FormField label="Timbangan Riil Bumbu Tabur (gram) *" required>
                        <Input
                          type="number"
                          min="0"
                          step="0.1"
                          value={packingForm.seasoning_used_gram}
                          onChange={(e) => setPackingForm({ ...packingForm, seasoning_used_gram: e.target.value })}
                          placeholder="Masukkan timbangan bumbu riil (gram)..."
                        />
                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Info className="w-3.5 h-3.5 shrink-0" />
                          <span>Masukkan timbangan riil bumbu tabur dalam gram sesuai hasil penimbangan aktual di lapangan.</span>
                        </div>
                        {currentSeasoningRm && Number(packingForm.seasoning_used_gram) > currentSeasoningStockGram && (
                          <div style={{
                            marginTop: '6px',
                            padding: '6px 10px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--color-danger-50)',
                            border: '1px solid var(--color-danger-200)',
                            color: 'var(--color-danger-800)',
                            fontSize: '11px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontWeight: 600,
                          }}>
                            <AlertTriangle className="w-3.5 h-3.5 text-[var(--color-danger-600)] shrink-0" aria-hidden="true" />
                            <span>Stok bumbu di warehouse kurang ({currentSeasoningStockGram.toLocaleString('id-ID')}g tersedia, dibutuhkan {packingForm.seasoning_used_gram}g). Packing tidak dapat disimpan sebelum stok gudang mencukupi.</span>
                          </div>
                        )}
                      </FormField>
                    </>
                  )}

                  {/* Catatan Packing */}
                  <FormField label="Catatan Packing (Opsional)">
                    <Textarea
                      rows={2}
                      value={packingForm.notes}
                      onChange={(e) => setPackingForm({ ...packingForm, notes: e.target.value })}
                      placeholder="Catatan batch packing..."
                    />
                  </FormField>
                </div>
              )}
            </div>
          );
        })()}
      </Modal>

      {/* ═══════════════════════════════════════════════ */}
      {/* MODAL: DETAIL RINCIAN ENTRI PACKING             */}
      {/* ═══════════════════════════════════════════════ */}
      <Modal
        isOpen={detailPackingModal.isOpen}
        onClose={() => setDetailPackingModal({ isOpen: false, entry: null })}
        closeOnOverlayClick={false}
        title={`Rincian Packing Longsong #${detailPackingModal.entry?.longsong_number || ''} — ${detailPackingModal.entry?.flavor_variant || ''}`}
        size="md"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
            <Button variant="secondary" onClick={() => setDetailPackingModal({ isOpen: false, entry: null })}>
              Tutup
            </Button>
            {!isManagement && detailPackingModal.entry && (
              <Button
                variant="primary"
                leftIcon={<Pencil className="w-4 h-4" />}
                onClick={() => {
                  const e = detailPackingModal.entry!;
                  setDetailPackingModal({ isOpen: false, entry: null });
                  handleOpenEditPacking(e);
                }}
              >
                Edit Data
              </Button>
            )}
          </div>
        }
      >
        {detailPackingModal.entry && (() => {
          const entry = detailPackingModal.entry;
          const order = orders.find(o => o.id === entry.production_order_id) || entry.production_order;
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {/* Header card with status */}
              <div style={{
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-default)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>No. Longsong</div>
                  <strong style={{ fontSize: 'var(--text-lg)', color: 'var(--color-primary-700)' }}>
                    #{entry.longsong_number}
                  </strong>
                </div>
                <StatusBadge
                  status={entry.is_packed ? 'completed' : 'pending'}
                  label={entry.is_packed ? 'Dipacking (Selesai)' : 'Menunggu Packing'}
                />
              </div>

              {/* Grid 2 Columns */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div style={{
                  padding: 'var(--space-3)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-default)',
                }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '2px' }}>SPK & Batch Asal</div>
                  <strong style={{ fontSize: 'var(--text-sm)', color: 'var(--color-primary-800)' }}>
                    {order?.batch_number || 'SPK Terintegrasi'}
                  </strong>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                    {entry.frying_batch ? `Wajan #${entry.frying_batch.wajan_number}` : 'Campuran SPK / Pool'}
                  </div>
                </div>

                <div style={{
                  padding: 'var(--space-3)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-default)',
                }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '2px' }}>Varian Rasa</div>
                  <strong style={{ fontSize: 'var(--text-sm)', color: 'var(--color-primary-800)' }}>
                    {entry.flavor_variant}
                  </strong>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                    Resep Tabur KhumKhum
                  </div>
                </div>

                <div style={{
                  padding: 'var(--space-3)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-default)',
                }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '2px' }}>Hasil Kemasan Jadi</div>
                  <strong style={{ fontSize: 'var(--text-sm)', color: 'var(--color-success-700)' }}>
                    {entry.packaged_toples_count} pcs
                  </strong>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                    {entry.packaging_type || 'Standing Pouch'} @{entry.packaging_weight_gram || '100g'}
                  </div>
                </div>

                <div style={{
                  padding: 'var(--space-3)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-default)',
                }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '2px' }}>Penggunaan Bumbu Tabur</div>
                  <strong style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                    {Number(entry.seasoning_used_gram || 0).toFixed(1)} gram
                  </strong>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                    Dipotong dari Stok Gudang
                  </div>
                </div>

                <div style={{
                  padding: 'var(--space-3)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-default)',
                }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '2px' }}>Berat Longsong Jamur</div>
                  <strong style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                    {entry.longsong_weight_gram ? `${entry.longsong_weight_gram.toLocaleString('id-ID')}g` : '-'}
                  </strong>
                </div>

                <div style={{
                  padding: 'var(--space-3)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-default)',
                }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '2px' }}>Waktu Pencatatan</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-primary)', fontWeight: 600 }}>
                    {entry.created_at ? format(new Date(entry.created_at), 'dd MMM yyyy, HH:mm', { locale: idLocale }) : '-'}
                  </div>
                </div>
              </div>

              {entry.notes && (
                <div style={{
                  padding: 'var(--space-3)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-default)',
                  fontSize: 'var(--text-xs)',
                }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '2px' }}>Catatan Khusus:</div>
                  <div style={{ color: 'var(--text-primary)' }}>{entry.notes}</div>
                </div>
              )}
            </div>
          );
        })()}
      </Modal>

      {/* ═══════════════════════════════════════════════ */}
      {/* MODAL: EDIT DATA ENTRI PACKING                  */}
      {/* ═══════════════════════════════════════════════ */}
      <Modal
        isOpen={editPackingModal.isOpen}
        onClose={() => setEditPackingModal({ isOpen: false, entry: null })}
        closeOnOverlayClick={false}
        title={`Edit Data Packing Longsong #${editPackingModal.entry?.longsong_number || ''}`}
        size="md"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
            <Button variant="secondary" onClick={() => setEditPackingModal({ isOpen: false, entry: null })} disabled={isSavingEditPacking}>
              Batal
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveEditPacking}
              disabled={isSavingEditPacking}
            >
              {isSavingEditPacking ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div style={{
            padding: '10px 12px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-primary-50)',
            border: '1px solid var(--color-primary-200)',
            fontSize: '11px',
            color: 'var(--color-primary-900)',
          }}>
            Perubahan varian, jumlah kemasan, atau bumbu akan otomatis merevisi kartu stok gudang bahan baku dan progres SPK.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <FormField label="Varian Rasa">
              <Select
                options={FLAVOR_VARIANTS.map(v => ({ value: v, label: v }))}
                value={editPackingForm.flavor_variant}
                onChange={(e) => setEditPackingForm(prev => ({ ...prev, flavor_variant: e.target.value }))}
              />
            </FormField>

            <FormField label="Jenis Kemasan">
              <Select
                options={PACKAGING_TYPES.map(t => ({ value: t, label: t }))}
                value={editPackingForm.packaging_type}
                onChange={(e) => setEditPackingForm(prev => ({ ...prev, packaging_type: e.target.value }))}
              />
            </FormField>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <FormField label="Gramasi / Netto Kemasan">
              <Select
                options={PACKAGING_WEIGHTS.map(w => ({ value: w.value, label: w.label }))}
                value={editPackingForm.packaging_weight_gram}
                onChange={(e) => setEditPackingForm(prev => ({ ...prev, packaging_weight_gram: e.target.value }))}
              />
            </FormField>

            <FormField label="Jumlah Kemasan Jadi (pcs) *" required>
              <Input
                type="number"
                min="1"
                value={editPackingForm.packaged_toples_count}
                onChange={(e) => setEditPackingForm(prev => ({ ...prev, packaged_toples_count: e.target.value }))}
                placeholder="Contoh: 100"
              />
            </FormField>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <FormField label="Bumbu Tabur Dipakai (gram)">
              <Input
                type="number"
                min="0"
                step="0.1"
                value={editPackingForm.seasoning_used_gram}
                onChange={(e) => setEditPackingForm(prev => ({ ...prev, seasoning_used_gram: e.target.value }))}
                placeholder="0"
              />
            </FormField>

            <FormField label="Berat Longsong Jamur (gram)">
              <Input
                type="number"
                min="0"
                value={editPackingForm.longsong_weight_gram}
                onChange={(e) => setEditPackingForm(prev => ({ ...prev, longsong_weight_gram: e.target.value }))}
                placeholder="Contoh: 7500"
              />
            </FormField>
          </div>

          <FormField label="Catatan / Keterangan">
            <Input
              type="text"
              value={editPackingForm.notes}
              onChange={(e) => setEditPackingForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Catatan kendala / keterangan batch..."
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
        closeOnOverlayClick={false}
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
        closeOnOverlayClick={false}
        title={spkType === 'FRYING' ? 'Buat SPK Penggorengan Jamur' : 'Buat SPK Packing Rasa'}
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
          <DraftNoticeBanner
            onClear={() => {
              clearFormDraft('draft_prod_spk');
              setSpkForm({
                product_id: '',
                target_quantity: spkType === 'FRYING' ? '50' : '200',
                start_date: format(new Date(), 'yyyy-MM-dd'),
                notes: '',
                spk_type: spkType,
              });
            }}
          />
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
                  Penggorengan Jamur Crispy Polos
                </div>
                <div style={{ color: 'var(--color-primary-800)', lineHeight: 1.4 }}>
                  Pada tahap penggorengan, jamur digoreng original menjadi stok Longsong. Pemilihan varian bumbu rasa (Balado, BBQ, Pedas Manis, dll) dan jenis kemasan dilakukan pada tahap SPK Packing.
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
                    Jamur Crispy Polos (Longsong)
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
                  WIP / Polos
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

              {parseFloat(spkForm.target_quantity) > 0 && (() => {
                const selProduct = products.find(p => p.id === spkForm.product_id);
                const { premixRatio, oilRatio, batchWeightKg, defaultBatchGram } = getFryingBomRatios(null, selProduct?.name);
                const targetQty = parseFloat(spkForm.target_quantity);
                return (
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
                          {targetQty.toLocaleString('id-ID')} kg
                        </div>
                      </div>
                      <div style={{ background: 'var(--bg-surface)', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-default)' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Tepung Premix ({(premixRatio * 100).toFixed(0)}%):</span>
                        <div style={{ fontWeight: 700, color: '#7e22ce', fontSize: '13px' }}>
                          {(targetQty * premixRatio).toFixed(2)} kg
                        </div>
                      </div>
                      <div style={{ background: 'var(--bg-surface)', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-default)' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Minyak Goreng ({(oilRatio * 100).toFixed(0)}%):</span>
                        <div style={{ fontWeight: 700, color: '#a16207', fontSize: '13px' }}>
                          {(targetQty * oilRatio).toFixed(2)} Liter
                        </div>
                      </div>
                      <div style={{ background: 'var(--bg-surface)', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-default)' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Estimasi Wajan:</span>
                        <div style={{ fontWeight: 700, color: 'var(--color-primary-700)', fontSize: '13px' }}>
                          ~{Math.round(targetQty / batchWeightKg)} Batch (@{defaultBatchGram}g)
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
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
                  Menggunakan stok Longsong Jamur Matang dari hasil penggorengan untuk dibumbui dan dikemas sesuai target pesanan/penjualan.
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

      {/* Modal: Edit SPK Penggorengan */}
      <Modal
        isOpen={editSpkOpen}
        onClose={() => setEditSpkOpen(false)}
        closeOnOverlayClick={false}
        title={`Edit SPK ${selectedSpkForEdit?.batch_number || ''}`}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
            <Button variant="ghost" onClick={() => setEditSpkOpen(false)}>
              Batal
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveEditSpk}
              loading={isUpdatingSpk}
            >
              Simpan Perubahan
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <FormField label="Target Jamur Segar (Kg)" required>
            <Input
              type="number"
              step="0.1"
              value={editSpkForm.target_quantity}
              onChange={(e) => setEditSpkForm({ ...editSpkForm, target_quantity: e.target.value })}
              placeholder="Misal: 100"
            />
          </FormField>
          <FormField label="Tanggal Mulai Produksi" required>
            <Input
              type="date"
              value={editSpkForm.start_date}
              onChange={(e) => setEditSpkForm({ ...editSpkForm, start_date: e.target.value })}
            />
          </FormField>
          <FormField label="Catatan Tambahan (Opsional)">
            <Textarea
              rows={3}
              value={editSpkForm.notes}
              onChange={(e) => setEditSpkForm({ ...editSpkForm, notes: e.target.value })}
              placeholder="Catatan SPK..."
            />
          </FormField>
        </div>
      </Modal>

      {/* Modal: Edit Wadah Longsong */}
      <Modal
        isOpen={editLongsongOpen}
        onClose={() => setEditLongsongOpen(false)}
        closeOnOverlayClick={false}
        title={`Edit Wadah #${selectedLongsongForEdit?.container_number || ''}`}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
            <Button variant="ghost" onClick={() => setEditLongsongOpen(false)}>
              Batal
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveEditLongsong}
              loading={isUpdatingLongsong}
            >
              Simpan Perubahan
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <FormField label="Sisa Berat Jamur Matang Saat Ini (Kg)" required>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={editLongsongForm.current_weight_kg}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 0;
                setEditLongsongForm({
                  ...editLongsongForm,
                  current_weight_kg: e.target.value,
                  status: val <= 0 ? 'EMPTY' : val < (selectedLongsongForEdit?.initial_weight_kg || 0) ? 'PARTIAL' : 'AVAILABLE',
                });
              }}
            />
          </FormField>
          <FormField label="Status Wadah" required>
            <Select
              options={[
                { value: 'AVAILABLE', label: 'Tersedia (Penuh / Siap Packing)' },
                { value: 'PARTIAL', label: 'Sebagian (Sudah Terpakai Sebagian)' },
                { value: 'EMPTY', label: 'Kosong (Habis Terpakai)' },
              ]}
              value={editLongsongForm.status}
              onChange={(e) => setEditLongsongForm({ ...editLongsongForm, status: e.target.value as 'AVAILABLE' | 'PARTIAL' | 'EMPTY' })}
            />
          </FormField>
          <FormField label="Catatan Wadah (Opsional)">
            <Input
              value={editLongsongForm.notes}
              onChange={(e) => setEditLongsongForm({ ...editLongsongForm, notes: e.target.value })}
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
