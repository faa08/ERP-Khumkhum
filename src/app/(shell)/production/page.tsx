'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  type CreateProductionOrderInput,
  type MaterialConsumptionItem,
  type SpkSuggestion,
} from '@/actions/production';
import { getPpicData } from '@/actions/ppic';
import type { DbProductionOrder, DbProduct, DbRawMaterial } from '@/types/database';

const recalculateBomFromProductKg = (productKg: number, productName: string) => {
  const match = productName.match(/(\d+)g/i);
  const packWeightGrams = match ? parseInt(match[1]) : 50;
  const packWeightKg = packWeightGrams / 1000;
  
  const targetPcs = Math.ceil(productKg / packWeightKg);
  const daunNeeded = parseFloat((productKg * 1.3).toFixed(1));
  
  return {
    target_pcs: targetPcs,
    bom: [
      { material: 'Jamur Tiram Segar (Daun)', needed_kg: daunNeeded, note: 'Estimasi rendemen 75% (1.3kg daun basah/kg produk)' },
      { material: 'Minyak Goreng', needed_kg: parseFloat((productKg * 0.3).toFixed(1)), note: '30% serapan & sirkulasi wajan' },
      { material: 'Tepung Bumbu', needed_kg: parseFloat((productKg * 0.08).toFixed(1)), note: '8% rasio adonan tepung' },
      { material: `Kemasan Pouch ${packWeightGrams}g`, needed_kg: targetPcs, note: `${targetPcs} pcs kemasan @${packWeightGrams}g` },
    ]
  };
};

export default function ProductionPage() {
  const [orders, setOrders] = useState<DbProductionOrder[]>([]);
  const [metrics, setMetrics] = useState({
    activeBatches: 0,
    avgYieldPercentage: 80.0,
    completedThisMonth: 0,
    yieldComplianceRate: 100,
  });
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [rawMaterials, setRawMaterials] = useState<(DbRawMaterial & { available_stock?: number })[]>([]);
  const [ppicWeeklyTotal, setPpicWeeklyTotal] = useState<number>(0);
  const [spkSuggestions, setSpkSuggestions] = useState<SpkSuggestion[]>([]);
  const [checkedSpk, setCheckedSpk] = useState<Set<string>>(new Set());
  const [isCreatingSpk, setIsCreatingSpk] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [consumptionModalOpen, setConsumptionModalOpen] = useState(false);
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<DbProductionOrder | null>(null);

  const [periodPreset, setPeriodPreset] = useState<'ALL' | 'TODAY' | 'THIS_MONTH' | 'THIS_YEAR' | 'CUSTOM'>('ALL');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [spkForm, setSpkForm] = useState<{
    productId: string;
    productVariant: string;
    targetQuantity: string;
    startDate: string;
    notes: string;
  }>({
    productId: '',
    productVariant: 'Jamur Crispy Original 100g',
    targetQuantity: '500',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  });

  const [consumedMaterials, setConsumedMaterials] = useState<MaterialConsumptionItem[]>([
    { raw_material_id: '', consumption_quantity: 0 },
  ]);

  const [resultForm, setResultForm] = useState<{
    outputWeight: string;
    finishedGoodsQty: string;
    anomalyReason: string;
  }>({
    outputWeight: '',
    finishedGoodsQty: '',
    anomalyReason: '',
  });

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    variant: 'danger' | 'primary';
  }>({ isOpen: false, title: '', description: '', onConfirm: () => {}, variant: 'primary' });

  const toast = useToast();

  const totalDaunNeeded = useMemo(() => {
    return Array.from(checkedSpk).reduce((sum, id) => {
      const s = spkSuggestions.find(x => x.id === id);
      if (!s) return sum;
      const daunBom = s.bom.find(b => b.material.includes('Daun'));
      return sum + (daunBom ? daunBom.needed_kg : 0);
    }, 0);
  }, [checkedSpk, spkSuggestions]);
  
  const totalTargetPcs = useMemo(() => {
    return Array.from(checkedSpk).reduce((sum, id) => {
      const s = spkSuggestions.find(x => x.id === id);
      return sum + (s ? s.target_pcs : 0);
    }, 0);
  }, [checkedSpk, spkSuggestions]);

  const isDaunValid = checkedSpk.size === 0 || Math.abs(totalDaunNeeded - ppicWeeklyTotal) < 0.5;

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [ordersRes, metricsRes, optionsRes, ppicRes, spkRes] = await Promise.all([
        getProductionOrders(),
        getProductionOverviewMetrics(),
        getProductionFormOptions(),
        getPpicData(),
        getSpkSuggestions(),
      ]);

      if (ordersRes.success && ordersRes.data) {
        setOrders(ordersRes.data);
      }
      if (metricsRes.success && metricsRes.data) {
        setMetrics(metricsRes.data);
      }
      if (optionsRes.success) {
        if (optionsRes.products) setProducts(optionsRes.products);
        if (optionsRes.rawMaterials) setRawMaterials(optionsRes.rawMaterials);
      }
      if (ppicRes.success && ppicRes.weeklyTotal !== undefined) {
        setPpicWeeklyTotal(ppicRes.weeklyTotal);
      }
      if (spkRes.success && spkRes.suggestions) {
        setSpkSuggestions(spkRes.suggestions);
      }
    } catch (err: any) {
      console.error('Gagal memuat data lini produksi:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (statusFilter !== 'ALL' && order.status !== statusFilter) {
        return false;
      }
      const rawDate = order.start_date || order.created_at;
      if (!rawDate) return true;
      const orderDate = new Date(rawDate);

      if (periodPreset === 'TODAY') {
        return isToday(orderDate);
      } else if (periodPreset === 'THIS_MONTH') {
        return isThisMonth(orderDate);
      } else if (periodPreset === 'THIS_YEAR') {
        return isThisYear(orderDate);
      } else if (periodPreset === 'CUSTOM') {
        if (filterStartDate) {
          const start = startOfDay(new Date(filterStartDate));
          if (orderDate < start) return false;
        }
        if (filterEndDate) {
          const end = endOfDay(new Date(filterEndDate));
          if (orderDate > end) return false;
        }
      }
      return true;
    });
  }, [orders, periodPreset, filterStartDate, filterEndDate, statusFilter]);

  // Handlers
  const handleOpenCreate = () => {
    setSpkForm({
      productId: products[0]?.id || '',
      productVariant: products[0]?.name || 'Jamur Crispy Original 100g',
      targetQuantity: '500',
      startDate: format(new Date(), 'yyyy-MM-dd'),
      notes: '',
    });
    setCreateDrawerOpen(true);
  };

  const handleSaveSpk = async () => {
    if (!spkForm.productVariant || Number(spkForm.targetQuantity) <= 0) {
      toast.error('Varian produk dan target kuantitas (> 0) wajib diisi');
      return;
    }

    const payload: CreateProductionOrderInput = {
      product_id: spkForm.productId || undefined,
      product_variant: spkForm.productVariant,
      target_quantity: Number(spkForm.targetQuantity),
      start_date: spkForm.startDate ? new Date(spkForm.startDate).toISOString() : undefined,
      notes: spkForm.notes,
    };

    const res = await createProductionOrder(payload);
    if (res.success) {
      toast.success(`SPK Batch ${res.data?.batch_number} berhasil dibuat`);
      setCreateDrawerOpen(false);
      loadData();
    } else {
      toast.error(res.error || 'Gagal membuat SPK');
    }
  };

  const handleOpenConsumption = (order: DbProductionOrder) => {
    setSelectedOrder(order);
    // Initialize default material rows
    if (rawMaterials.length > 0) {
      setConsumedMaterials(
        rawMaterials.map((rm) => ({
          raw_material_id: rm.id,
          consumption_quantity: rm.name.toLowerCase().includes('jamur') ? 50 : 0,
        }))
      );
    } else {
      setConsumedMaterials([{ raw_material_id: '', consumption_quantity: 0 }]);
    }
    setConsumptionModalOpen(true);
  };

  const handleSaveConsumption = async () => {
    if (!selectedOrder) return;

    const validMaterials = consumedMaterials.filter((m) => m.raw_material_id && m.consumption_quantity > 0);
    if (validMaterials.length === 0) {
      toast.error('Harap masukkan minimal 1 bahan baku yang dikonsumsi dengan jumlah > 0');
      return;
    }

    const res = await recordMaterialConsumption({
      production_order_id: selectedOrder.id,
      materials: validMaterials,
    });

    if (res.success) {
      toast.success('Konsumsi bahan baku berhasil dicatat & stok gudang telah terpotong');
      setConsumptionModalOpen(false);
      loadData();
    } else {
      toast.error(res.error || 'Gagal mencatat konsumsi bahan');
    }
  };

  const handleOpenResult = (order: DbProductionOrder) => {
    setSelectedOrder(order);
    const estOutput = order.input_weight ? (order.input_weight * 0.82).toFixed(1) : '';
    setResultForm({
      outputWeight: estOutput,
      finishedGoodsQty: order.target_quantity ? String(order.target_quantity) : '500',
      anomalyReason: '',
    });
    setResultModalOpen(true);
  };

  // Live Rendemen calculation
  const liveYield = useMemo(() => {
    if (!selectedOrder || !selectedOrder.input_weight || !resultForm.outputWeight) return null;
    const inputW = Number(selectedOrder.input_weight);
    const outputW = Number(resultForm.outputWeight);
    if (inputW <= 0 || outputW <= 0) return null;
    const yieldPct = (outputW / inputW) * 100;
    return parseFloat(yieldPct.toFixed(2));
  }, [selectedOrder, resultForm.outputWeight]);

  const handleSaveResult = async () => {
    if (!selectedOrder) return;
    if (!resultForm.outputWeight || Number(resultForm.outputWeight) <= 0) {
      toast.error('Berat output jamur matang harus lebih dari 0 kg');
      return;
    }

    if (liveYield !== null && liveYield < 80.0 && !resultForm.anomalyReason.trim()) {
      toast.error('Rendemen di bawah target 80%. Wajib mengisi alasan anomali.');
      return;
    }

    const res = await recordProductionResult({
      production_order_id: selectedOrder.id,
      output_weight: Number(resultForm.outputWeight),
      finished_goods_quantity: Number(resultForm.finishedGoodsQty || 0),
      anomaly_reason: resultForm.anomalyReason,
    });

    if (res.success) {
      toast.success(`Hasil produksi disimpan! Rendemen: ${res.yield_percentage}%. Batch dialihkan ke antrean QC.`);
      setResultModalOpen(false);
      loadData();
    } else {
      toast.error(res.error || 'Gagal menyimpan hasil produksi');
    }
  };

  const handleCancelOrder = (order: DbProductionOrder) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Batalkan SPK Produksi',
      description: `Apakah Anda yakin ingin membatalkan batch ${order.batch_number}? Status akan diubah menjadi CANCELLED.`,
      variant: 'danger',
      onConfirm: async () => {
        const res = await updateProductionOrderStatus(order.id, 'CANCELLED', 'Dibatalkan oleh operator produksi');
        if (res.success) {
          toast.success(`Batch ${order.batch_number} berhasil dibatalkan`);
          loadData();
        } else {
          toast.error(res.error || 'Gagal membatalkan batch');
        }
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleOpenDetail = (order: DbProductionOrder) => {
    setSelectedOrder(order);
    setDetailModalOpen(true);
  };

  // Table Columns
  const columns = useMemo<ColumnDef<DbProductionOrder>[]>(() => [
    {
      accessorKey: 'batch_number',
      header: 'No. Batch SPK',
      cell: ({ row }) => (
        <div>
          <strong style={{ color: 'var(--color-primary-700)', fontFamily: 'monospace' }}>
            {row.original.batch_number}
          </strong>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
            Oleh: {row.original.creator?.name || 'Operator'}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'start_date',
      header: 'Tanggal SPK',
      cell: ({ row }) => {
        const d = row.original.start_date || row.original.created_at;
        return (
          <div>
            <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-sm)' }}>
              <Calendar size={14} style={{ color: 'var(--color-primary-600)' }} />
              {d ? format(new Date(d), 'dd MMM yyyy', { locale: idLocale }) : '-'}
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', paddingLeft: '20px' }}>
              {d ? format(new Date(d), 'HH:mm') : ''}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'product_variant',
      header: 'Varian Produk',
      cell: ({ row }) => (
        <div>
          <div style={{ fontWeight: 600 }}>{row.original.product_variant || row.original.product?.name || 'Jamur Crispy Original'}</div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
            Target: {row.original.target_quantity ? `${row.original.target_quantity.toLocaleString('id-ID')} pcs` : '-'}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'input_weight',
      header: 'Bahan Masuk (Input)',
      cell: ({ row }) => (
        <span>
          {row.original.input_weight ? (
            <strong>{Number(row.original.input_weight).toFixed(1)} kg</strong>
          ) : (
            <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>Belum input</span>
          )}
        </span>
      ),
    },
    {
      accessorKey: 'output_weight',
      header: 'Hasil Jamur (Output)',
      cell: ({ row }) => (
        <span>
          {row.original.output_weight ? (
            <strong style={{ color: 'var(--color-success-700)' }}>
              {Number(row.original.output_weight).toFixed(1)} kg
            </strong>
          ) : (
            <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>Sedang proses</span>
          )}
        </span>
      ),
    },
    {
      accessorKey: 'yield_percentage',
      header: 'Rendemen (%)',
      cell: ({ row }) => {
        const yieldVal = row.original.yield_percentage;
        if (yieldVal === null || yieldVal === undefined) {
          return <span style={{ color: 'var(--text-tertiary)' }}>-</span>;
        }

        const isCompliant = yieldVal >= 80.0;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 8px',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 700,
                fontSize: 'var(--text-sm)',
                backgroundColor: isCompliant ? 'var(--color-success-100)' : 'var(--color-danger-100)',
                color: isCompliant ? 'var(--color-success-800)' : 'var(--color-danger-800)',
              }}
            >
              {isCompliant ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
              {Number(yieldVal).toFixed(1)}%
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status Batch',
      cell: ({ row }) => {
        const status = row.original.status;
        let label: string = status;
        let badgeStatus = 'default';

        if (status === 'DRAFT') {
          label = 'Draft SPK';
          badgeStatus = 'draft';
        } else if (status === 'IN_PROGRESS') {
          label = 'Proses Masak';
          badgeStatus = 'in_progress';
        } else if (status === 'COMPLETED_WIP' || status === 'QC_PENDING') {
          label = 'Menunggu QC';
          badgeStatus = 'pending';
        } else if (status === 'COMPLETED' || status === 'RELEASED') {
          label = 'Selesai & Lolos';
          badgeStatus = 'completed';
        } else if (status === 'CANCELLED') {
          label = 'Dibatalkan';
          badgeStatus = 'cancelled';
        }

        return <StatusBadge status={badgeStatus} label={label} />;
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const item = row.original;
        const items = [
          {
            id: 'detail',
            label: 'Lihat Detail Batch',
            icon: <Eye size={14} />,
            onClick: () => handleOpenDetail(item),
          },
        ];

        if (item.status === 'DRAFT' || item.status === 'IN_PROGRESS') {
          items.push({
            id: 'consume',
            label: 'Catat Konsumsi Bahan (BOM)',
            icon: <Flame size={14} />,
            onClick: () => handleOpenConsumption(item),
          });
        }

        if (item.status === 'IN_PROGRESS' || (item.input_weight && !item.output_weight)) {
          items.push({
            id: 'result',
            label: 'Input Hasil & Rendemen',
            icon: <Scale size={14} />,
            onClick: () => handleOpenResult(item),
          });
        }

        if (item.status !== 'COMPLETED' && item.status !== 'CANCELLED') {
          items.push({
            id: 'cancel',
            label: 'Batalkan SPK',
            icon: <Ban size={14} />,
            danger: true,
            onClick: () => handleCancelOrder(item),
          } as any);
        }

        return (
          <Dropdown
            trigger={
              <Button variant="ghost" size="sm" style={{ padding: '0 8px' }}>
                <MoreVertical size={16} />
              </Button>
            }
            items={items}
          />
        );
      },
    },
  ], [rawMaterials]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <PageHeader
        title="Lini Manufaktur & Rendemen Produksi"
        description="Penerbitan SPK, pencatatan konsumsi bahan baku BOM, monitoring rasio rendemen penggorengan, dan serah terima batch ke QC."
        breadcrumbs={[{ label: 'Manufaktur' }, { label: 'Pesanan Produksi' }]}
        actions={
          <Button variant="primary" onClick={handleOpenCreate} leftIcon={<Plus size={16} />}>
            Buat SPK Produksi Baru
          </Button>
        }
      />

      {/* Overview KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
            <Factory size={20} color="var(--color-primary-600)" />
            <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Batch Aktif di Lini</span>
          </div>
          <div style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--color-primary-700)' }}>
            {metrics.activeBatches} <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-secondary)' }}>Batch</span>
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 'var(--space-1)' }}>
            Sedang digoreng / siap uji QC
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
            <TrendingUp size={20} color="var(--color-success-600)" />
            <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Rata-rata Rendemen</span>
          </div>
          <div style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--color-success-700)' }}>
            {metrics.avgYieldPercentage}%
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 'var(--space-1)' }}>
            Target standar efisiensi: ≥ 80.0%
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
            <PackageCheck size={20} color="var(--color-info-600)" />
            <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Batch Lolos Selesai</span>
          </div>
          <div style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--color-info-700)' }}>
            {metrics.completedThisMonth} <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-secondary)' }}>Batch</span>
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 'var(--space-1)' }}>
            Telah lolos inspeksi rilis QC
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
            <Sparkles size={20} color="var(--color-warning-600)" />
            <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Kepatuhan Rendemen</span>
          </div>
          <div style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--color-warning-700)' }}>
            {metrics.yieldComplianceRate}%
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 'var(--space-1)' }}>
            Batch yang memenuhi target yield
          </div>
        </Card>
      </div>

      {/* Filter & Periode Toolbar */}
      <Card>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Preset Buttons */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginRight: 'var(--space-1)' }}>
              <Filter size={14} /> Filter Periode SPK:
            </span>
            {(
              [
                { key: 'ALL', label: 'Semua Periode' },
                { key: 'TODAY', label: 'Hari Ini' },
                { key: 'THIS_MONTH', label: 'Bulan Ini' },
                { key: 'THIS_YEAR', label: 'Tahun Ini' },
                { key: 'CUSTOM', label: 'Rentang Kustom' },
              ] as const
            ).map((preset) => (
              <Button
                key={preset.key}
                size="sm"
                variant={periodPreset === preset.key ? 'primary' : 'secondary'}
                onClick={() => setPeriodPreset(preset.key)}
              >
                {preset.label}
              </Button>
            ))}
          </div>

          {/* Status Filter Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', fontWeight: 600 }}>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                height: '32px',
                padding: '0 var(--space-2)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-default)',
                background: 'var(--bg-default)',
                color: 'var(--text-primary)',
                fontSize: 'var(--text-xs)',
              }}
            >
              <option value="ALL">Semua Status</option>
              <option value="DRAFT">Draft SPK</option>
              <option value="IN_PROGRESS">Proses Masak</option>
              <option value="COMPLETED_WIP">Menunggu QC</option>
              <option value="COMPLETED">Selesai & Lolos</option>
              <option value="CANCELLED">Dibatalkan</option>
            </select>
          </div>
        </div>

        {/* Custom Date Range Inputs (Visible when CUSTOM or dates are picked) */}
        {periodPreset === 'CUSTOM' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', alignItems: 'center', marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)', borderTop: '1px dashed var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', fontWeight: 600 }}>Dari Tanggal:</span>
              <Input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                style={{ width: '160px', height: '32px', fontSize: 'var(--text-xs)' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', fontWeight: 600 }}>Sampai Tanggal:</span>
              <Input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                style={{ width: '160px', height: '32px', fontSize: 'var(--text-xs)' }}
              />
            </div>
            {(filterStartDate || filterEndDate) && (
              <Button
                size="sm"
                variant="ghost"
                leftIcon={<RotateCcw size={13} />}
                onClick={() => {
                  setFilterStartDate('');
                  setFilterEndDate('');
                }}
              >
                Reset Tanggal
              </Button>
            )}
          </div>
        )}

        {/* Counter summary */}
        <div style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
          Menampilkan <strong>{filteredOrders.length}</strong> dari <strong>{orders.length}</strong> total batch SPK produksi.
        </div>
      </Card>


      {/* Main Data Table */}
      <DataTable columns={columns} data={filteredOrders} />

      {/* ───────────────────────────────────────────── */}
      {/* 1. MODAL (POP UP): BUAT SPK PRODUKSI BARU     */}
      {/* ───────────────────────────────────────────── */}
      <Modal
        isOpen={createDrawerOpen}
        onClose={() => { setCreateDrawerOpen(false); setCheckedSpk(new Set()); }}
        title="Penerbitan Surat Perintah Kerja (SPK) Baru"
        size="lg"
        footer={
          checkedSpk.size > 0 ? (
            <>
              <Button variant="secondary" onClick={() => setCheckedSpk(new Set())}>
                Batal Pilih
              </Button>
              <Button
                variant="primary"
                leftIcon={<Factory size={16} />}
                disabled={isCreatingSpk || !isDaunValid}
                onClick={async () => {
                  setIsCreatingSpk(true);
                  let createdCount = 0;
                  for (const sid of Array.from(checkedSpk)) {
                    const suggestion = spkSuggestions.find(s => s.id === sid);
                    if (!suggestion) continue;
                    const res = await createProductionOrder({
                      product_id: suggestion.product_id,
                      product_variant: suggestion.product_name,
                      target_quantity: suggestion.target_pcs,
                      start_date: spkForm.startDate ? new Date(spkForm.startDate).toISOString() : new Date().toISOString(),
                      notes: (spkForm.notes ? `${spkForm.notes}\n\n` : '') + `SPK otomatis dari rekomendasi warehouse. Target: ${suggestion.target_kg} kg (${suggestion.target_pcs} pcs). Basis: rata-rata ${suggestion.avg_weekly_kg} kg/minggu dari ${suggestion.weeks_of_data} batch data historis.`,
                    });
                    if (res.success) createdCount++;
                  }
                  setIsCreatingSpk(false);
                  setCheckedSpk(new Set());
                  if (createdCount > 0) {
                    toast.success(`${createdCount} SPK berhasil diterbitkan! Batch siap dieksekusi.`);
                    setCreateDrawerOpen(false);
                    loadData();
                  } else {
                    toast.error('Gagal membuat SPK. Silakan coba lagi.');
                  }
                }}
              >
                {isCreatingSpk ? 'Memproses...' : `Mulai Produksi (${checkedSpk.size} SPK)`}
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setCreateDrawerOpen(false)}>
                Batal
              </Button>
              <Button variant="primary" onClick={handleSaveSpk} leftIcon={<Send size={16} />}>
                Terbitkan SPK Manual
              </Button>
            </>
          )
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* ── SECTION 1: Rekomendasi dari History Warehouse ── */}
          <div style={{ padding: 'var(--space-3)', background: 'var(--color-warning-50)', borderRadius: 'var(--radius-md)', color: 'var(--color-warning-900)', fontSize: 'var(--text-sm)', border: '1px solid var(--color-warning-200)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, marginBottom: '4px' }}>
              <Sparkles size={16} /> Rekomendasi Target dari History Warehouse
            </div>
            Centang produk di bawah untuk membuat SPK otomatis berdasarkan data historis produksi. Atau scroll ke bawah untuk input manual.
          </div>

          {spkSuggestions.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {spkSuggestions.map((s) => {
                const isChecked = checkedSpk.has(s.id);
                return (
                  <div
                    key={s.id}
                    style={{
                      border: `2px solid ${isChecked ? 'var(--color-primary-500)' : 'var(--border-default)'}`,
                      borderRadius: 'var(--radius-lg)',
                      padding: 'var(--space-3)',
                      backgroundColor: isChecked ? 'var(--color-primary-50)' : 'var(--bg-default)',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      setCheckedSpk(prev => {
                        const next = new Set(prev);
                        if (next.has(s.id)) next.delete(s.id);
                        else next.add(s.id);
                        return next;
                      });
                    }}
                  >
                    {/* Header row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                      <div style={{
                        width: '22px', height: '22px', borderRadius: 'var(--radius-sm)',
                        border: `2px solid ${isChecked ? 'var(--color-primary-600)' : 'var(--border-default)'}`,
                        backgroundColor: isChecked ? 'var(--color-primary-600)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, transition: 'all 0.15s ease',
                      }}>
                        {isChecked && <CheckCircle2 size={14} color="white" />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>{s.product_name}</div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                          SKU: {s.product_sku} • {s.avg_weekly_kg} kg/minggu
                          {s.weeks_of_data > 0 ? ` (${s.weeks_of_data} batch)` : ' (estimasi)'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 'var(--space-2)', flexShrink: 0, alignItems: 'center' }}>
                        <input
                          type="number"
                          value={s.target_kg}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            const updated = recalculateBomFromProductKg(val, s.product_name);
                            setSpkSuggestions(prev => prev.map(item => item.id === s.id ? { ...item, target_kg: val, target_pcs: updated.target_pcs, bom: updated.bom } : item));
                          }}
                          style={{
                            width: '70px', padding: '4px', borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--color-primary-300)', backgroundColor: 'white', color: 'var(--color-primary-800)',
                            fontWeight: 700, fontSize: 'var(--text-xs)', textAlign: 'center'
                          }}
                        />
                        <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--color-primary-800)' }}>kg</span>
                        <span style={{ padding: '4px 10px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-success-100)', color: 'var(--color-success-800)', fontWeight: 700, fontSize: 'var(--text-xs)' }}>
                          {s.target_pcs.toLocaleString('id-ID')} pcs
                        </span>
                      </div>
                    </div>

                    {/* Expanded BOM */}
                    {isChecked && (
                      <div style={{ marginTop: 'var(--space-2)', paddingTop: 'var(--space-2)', borderTop: '1px dashed var(--border-subtle)' }}>
                        <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 'var(--space-1)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Flame size={12} /> BOM — Kebutuhan Bahan
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-1)' }}>
                          {s.bom.map((b, idx) => (
                            <div key={idx} style={{ padding: '4px 8px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--text-xs)' }}>
                              <span>{b.material}</span>
                              <strong style={{ color: 'var(--color-primary-700)' }}>
                                {b.material.includes('Kemasan') ? `${b.needed_kg.toLocaleString('id-ID')} pcs` : `${b.needed_kg} kg`}
                              </strong>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {spkSuggestions.length > 0 && checkedSpk.size > 0 && (
            <div style={{
              padding: 'var(--space-3)',
              borderRadius: 'var(--radius-md)',
              background: isDaunValid ? 'var(--color-success-50)' : 'var(--color-danger-50)',
              border: `1px solid ${isDaunValid ? 'var(--color-success-200)' : 'var(--color-danger-200)'}`,
              marginTop: 'var(--space-1)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 'var(--text-sm)', color: isDaunValid ? 'var(--color-success-800)' : 'var(--color-danger-800)' }}>
                <span>Total Kebutuhan Daun Jamur (SPK Terpilih):</span>
                <span>{totalDaunNeeded.toFixed(1)} kg / {ppicWeeklyTotal.toFixed(1)} kg (Tersedia)</span>
              </div>
              {!isDaunValid && (
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-danger-700)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <AlertTriangle size={14} /> Total kebutuhan daun tidak boleh kurang atau lebih dari persediaan batch (selisih maks 0.5 kg). Sesuaikan target (kg) tiap produk di atas.
                </div>
              )}
            </div>
          )}

          {/* ── DIVIDER ── */}
          {checkedSpk.size === 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', margin: 'var(--space-1) 0' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-default)' }} />
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', fontWeight: 600 }}>ATAU INPUT MANUAL</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-default)' }} />
            </div>
          )}

          {/* ── SECTION 2: Form Manual (existing) ── */}
          <div style={{ display: 'grid', gridTemplateColumns: checkedSpk.size > 0 ? '1fr' : '1fr 1fr', gap: 'var(--space-4)' }}>
            {checkedSpk.size === 0 && (
              <FormField label="Pilih Produk Jadi (SKU)" required>
                <Select
                  options={
                    products.length > 0
                      ? products.map((p) => ({ value: p.id, label: `${p.name} (${p.sku})` }))
                      : [
                          { value: '1', label: 'Jamur Crispy Original 100g' },
                          { value: '2', label: 'Jamur Crispy Balado Pedas 100g' },
                          { value: '3', label: 'Jamur Crispy BBQ Smoked 100g' },
                        ]
                  }
                  value={spkForm.productId}
                  onChange={(e) => {
                    const val = e.target.value;
                    const found = products.find((p) => p.id === val);
                    setSpkForm((prev) => ({
                      ...prev,
                      productId: val,
                      productVariant: found?.name || prev.productVariant,
                    }));
                  }}
                />
              </FormField>
            )}

            <FormField label="Tanggal Penerbitan SPK" required>
              <Input
                type="date"
                value={spkForm.startDate}
                onChange={(e) => setSpkForm({ ...spkForm, startDate: e.target.value })}
                required
              />
            </FormField>
          </div>

          <FormField label={checkedSpk.size > 0 ? "Total Target Output Produksi (pcs kemasan dari SPK terpilih)" : "Target Output Produksi (pcs kemasan)"} required>
            <Input
              type="number"
              value={checkedSpk.size > 0 ? totalTargetPcs : spkForm.targetQuantity}
              onChange={(e) => setSpkForm({ ...spkForm, targetQuantity: e.target.value })}
              placeholder="500"
              readOnly={checkedSpk.size > 0}
              style={{ backgroundColor: checkedSpk.size > 0 ? 'var(--bg-subtle)' : 'var(--bg-default)' }}
            />
          </FormField>

          <FormField label="Catatan / Instruksi Khusus Operator">
            <Textarea
              rows={2}
              value={spkForm.notes}
              onChange={(e) => setSpkForm({ ...spkForm, notes: e.target.value })}
              placeholder="Contoh: Wajan #2, gunakan bumbu racikan baru..."
            />
          </FormField>
        </div>
      </Modal>

      {/* ───────────────────────────────────────────── */}
      {/* 2. MODAL: CATAT KONSUMSI BAHAN BAKU (BOM)     */}
      {/* ───────────────────────────────────────────── */}
      <Modal
        isOpen={consumptionModalOpen}
        onClose={() => setConsumptionModalOpen(false)}
        title={`Konsumsi Bahan Baku (BOM) — ${selectedOrder?.batch_number}`}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConsumptionModalOpen(false)}>
              Tutup
            </Button>
            <Button variant="primary" onClick={handleSaveConsumption} leftIcon={<Flame size={16} />}>
              Simpan & Potong Stok Gudang
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
            Masukkan jumlah riil bahan baku yang dimasukkan ke dalam wajan penggorengan. Sistem akan otomatis memotong stok bahan di gudang dan mencatat mutasi keluar.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {consumedMaterials.map((item, index) => {
              const matchedRm = rawMaterials.find((rm) => rm.id === item.raw_material_id);
              return (
                <div
                  key={index}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 1fr',
                    gap: 'var(--space-3)',
                    alignItems: 'center',
                    padding: 'var(--space-3)',
                    background: 'var(--bg-subtle)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', display: 'block' }}>
                      Bahan Baku #{index + 1}
                    </span>
                    <Select
                      options={rawMaterials.map((rm) => ({
                        value: rm.id,
                        label: `${rm.name} (${rm.uom})`,
                      }))}
                      value={item.raw_material_id}
                      onChange={(e) => {
                        const updated = [...consumedMaterials];
                        updated[index].raw_material_id = e.target.value;
                        setConsumedMaterials(updated);
                      }}
                    />
                  </div>

                  <div>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', display: 'block' }}>
                      Qty ({matchedRm?.uom || 'kg'})
                    </span>
                    <Input
                      type="number"
                      value={item.consumption_quantity || ''}
                      onChange={(e) => {
                        const updated = [...consumedMaterials];
                        updated[index].consumption_quantity = Number(e.target.value);
                        setConsumedMaterials(updated);
                      }}
                      placeholder="0.0"
                    />
                  </div>

                  <div>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', display: 'block' }}>
                      Stok Tersedia
                    </span>
                    <strong style={{ fontSize: 'var(--text-sm)', color: 'var(--color-primary-600)' }}>
                      {matchedRm?.available_stock !== undefined ? `${matchedRm.available_stock} ${matchedRm.uom}` : '-'}
                    </strong>
                  </div>
                </div>
              );
            })}
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setConsumedMaterials([...consumedMaterials, { raw_material_id: '', consumption_quantity: 0 }])}
            leftIcon={<Plus size={14} />}
          >
            Tambah Baris Bahan Baku
          </Button>
        </div>
      </Modal>

      {/* ───────────────────────────────────────────── */}
      {/* 3. MODAL: INPUT HASIL & LIVE RENDEMEN          */}
      {/* ───────────────────────────────────────────── */}
      <Modal
        isOpen={resultModalOpen}
        onClose={() => setResultModalOpen(false)}
        title={`Pencatatan Hasil Masak & Kalkulasi Rendemen — ${selectedOrder?.batch_number}`}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setResultModalOpen(false)}>
              Batal
            </Button>
            <Button variant="primary" onClick={handleSaveResult} leftIcon={<Scale size={16} />}>
              Simpan & Serahkan ke QC
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div style={{ padding: 'var(--space-3)', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Total Bahan Masuk (Input)</span>
              <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                {selectedOrder?.input_weight ? `${Number(selectedOrder.input_weight).toFixed(1)} kg` : '0 kg'}
              </div>
            </div>

            <div style={{ padding: 'var(--space-3)', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Target Kemasan</span>
              <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                {selectedOrder?.target_quantity ? `${selectedOrder.target_quantity} pcs` : '-'}
              </div>
            </div>
          </div>

          <FormField label="Berat Jamur Matang Hasil Goreng & Bumbu (kg)" required>
            <Input
              type="number"
              step="0.1"
              value={resultForm.outputWeight}
              onChange={(e) => setResultForm({ ...resultForm, outputWeight: e.target.value })}
              placeholder="Contoh: 41.5"
            />
          </FormField>

          <FormField label="Jumlah Kemasan Jadi (pcs kemasan)" required>
            <Input
              type="number"
              value={resultForm.finishedGoodsQty}
              onChange={(e) => setResultForm({ ...resultForm, finishedGoodsQty: e.target.value })}
              placeholder="500"
            />
          </FormField>

          {/* Live Yield Banner */}
          {liveYield !== null && (
            <div
              style={{
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: liveYield >= 80.0 ? 'var(--color-success-50)' : 'var(--color-danger-50)',
                border: `1px solid ${liveYield >= 80.0 ? 'var(--color-success-300)' : 'var(--color-danger-300)'}`,
                color: liveYield >= 80.0 ? 'var(--color-success-900)' : 'var(--color-danger-900)',
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 'var(--text-base)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {liveYield >= 80.0 ? <CheckCircle2 size={18} color="var(--color-success-600)" /> : <AlertTriangle size={18} color="var(--color-danger-600)" />}
                  Rendemen Terhitung: {liveYield}%
                </div>
                <div style={{ fontSize: 'var(--text-xs)', marginTop: '2px' }}>
                  {liveYield >= 80.0
                    ? 'Optimal: Memenuhi standar efisiensi manufaktur (≥ 80.0%)'
                    : 'Peringatan: Rendemen di bawah standar! Wajib mengisi alasan anomali.'}
                </div>
              </div>
            </div>
          )}

          {liveYield !== null && liveYield < 80.0 && (
            <FormField label="Alasan Anomali Penurunan Rendemen" required>
              <Textarea
                rows={2}
                value={resultForm.anomalyReason}
                onChange={(e) => setResultForm({ ...resultForm, anomalyReason: e.target.value })}
                placeholder="Contoh: Kadar air jamur basah tinggi (sortasi Grade B), minyak kurang panas, atau susut penirisan berlebih..."
              />
            </FormField>
          )}
        </div>
      </Modal>

      {/* ───────────────────────────────────────────── */}
      {/* 4. MODAL: DETAIL BATCH LENGKAP                */}
      {/* ───────────────────────────────────────────── */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title={`Detail Batch Produksi — ${selectedOrder?.batch_number}`}
        size="lg"
        footer={<Button variant="secondary" onClick={() => setDetailModalOpen(false)}>Tutup</Button>}
      >
        {selectedOrder && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-3)' }}>
              <div style={{ padding: 'var(--space-3)', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Status Batch</span>
                <div><StatusBadge status={selectedOrder.status as any} /></div>
              </div>
              <div style={{ padding: 'var(--space-3)', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Varian Produk</span>
                <strong style={{ display: 'block' }}>{selectedOrder.product_variant}</strong>
              </div>
              <div style={{ padding: 'var(--space-3)', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Rasio Rendemen</span>
                <strong style={{ display: 'block', color: selectedOrder.yield_percentage && selectedOrder.yield_percentage >= 80 ? 'var(--color-success-700)' : 'var(--color-danger-700)' }}>
                  {selectedOrder.yield_percentage ? `${selectedOrder.yield_percentage}%` : '-'}
                </strong>
              </div>
            </div>

            {selectedOrder.anomaly_reason && (
              <div style={{ padding: 'var(--space-3)', background: 'var(--color-danger-50)', color: 'var(--color-danger-800)', borderRadius: 'var(--radius-md)' }}>
                <strong>Catatan Anomali Rendemen:</strong> {selectedOrder.anomaly_reason}
              </div>
            )}

            {/* Consumed materials list */}
            <div>
              <strong style={{ display: 'block', marginBottom: 'var(--space-2)' }}>Bahan Baku yang Digunakan (BOM):</strong>
              {selectedOrder.materials && selectedOrder.materials.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {selectedOrder.materials.map((m, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-2) var(--space-3)', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
                      <span>{m.raw_material?.name || 'Bahan Baku'}</span>
                      <strong>{m.consumption_quantity} {m.raw_material?.uom || 'kg'}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', fontStyle: 'italic' }}>
                  Belum ada catatan konsumsi bahan.
                </p>
              )}
            </div>
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
