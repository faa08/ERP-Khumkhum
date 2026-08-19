'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/data-table/DataTable';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Dropdown } from '@/components/ui/Dropdown';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Drawer } from '@/components/ui/Drawer';
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
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import {
  getProductionOrders,
  createProductionOrder,
  recordMaterialConsumption,
  recordProductionResult,
  updateProductionOrderStatus,
import { getProductionOverviewMetrics, getProductionFormOptions, type CreateProductionOrderInput, type MaterialConsumptionItem } from '@/actions/production';
import { getPpicData } from '@/actions/ppic';
import type { DbProductionOrder, DbProduct, DbRawMaterial } from '@/types/database';

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
  const [isLoading, setIsLoading] = useState(true);

  // Drawers & Modals state
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [consumptionModalOpen, setConsumptionModalOpen] = useState(false);
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<DbProductionOrder | null>(null);

  // Form states - Create SPK
  const [spkForm, setSpkForm] = useState<{
    productId: string;
    productVariant: string;
    targetQuantity: string;
    notes: string;
  }>({
    productId: '',
    productVariant: 'Jamur Crispy Original 100g',
    targetQuantity: '500',
    notes: '',
  });

  // Form states - Material Consumption
  const [consumedMaterials, setConsumedMaterials] = useState<MaterialConsumptionItem[]>([
    { raw_material_id: '', consumption_quantity: 0 },
  ]);

  // Form states - Production Result & Live Yield
  const [resultForm, setResultForm] = useState<{
    outputWeight: string;
    finishedGoodsQty: string;
    anomalyReason: string;
  }>({
    outputWeight: '',
    finishedGoodsQty: '',
    anomalyReason: '',
  });

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    variant: 'danger' | 'primary';
  }>({ isOpen: false, title: '', description: '', onConfirm: () => {}, variant: 'primary' });

  const toast = useToast();

  // Load Data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [ordersRes, metricsRes, optionsRes, ppicRes] = await Promise.all([
        getProductionOrders(),
        getProductionOverviewMetrics(),
        getProductionFormOptions(),
        getPpicData(),
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
    } catch (err: any) {
      console.error('Gagal memuat data lini produksi:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handlers
  const handleOpenCreate = () => {
    setSpkForm({
      productId: products[0]?.id || '',
      productVariant: products[0]?.name || 'Jamur Crispy Original 100g',
      targetQuantity: '500',
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
            {row.original.created_at ? format(new Date(row.original.created_at), 'dd MMM yyyy, HH:mm', { locale: idLocale }) : '-'}
          </div>
        </div>
      ),
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

      {/* Main Data Table */}
      <DataTable columns={columns} data={orders} />

      {/* ───────────────────────────────────────────── */}
      {/* 1. DRAWER: BUAT SPK PRODUKSI BARU             */}
      {/* ───────────────────────────────────────────── */}
      <Drawer
        isOpen={createDrawerOpen}
        onClose={() => setCreateDrawerOpen(false)}
        title="Penerbitan Surat Perintah Kerja (SPK) Baru"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateDrawerOpen(false)}>
              Batal
            </Button>
            <Button variant="primary" onClick={handleSaveSpk} leftIcon={<Send size={16} />}>
              Terbitkan SPK
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{ padding: 'var(--space-3)', background: 'var(--color-primary-50)', borderRadius: 'var(--radius-md)', color: 'var(--color-primary-800)', fontSize: 'var(--text-sm)' }}>
            <strong>Format Nomor Batch Otomatis:</strong> <code>PRD-YYYYMMDD-XXXX</code>
            <br />Nomor batch unik akan diterbitkan sistem sebagai identitas pelacakan ketertelusuran 2-arah.
          </div>

          {ppicWeeklyTotal > 0 && (
            <div style={{ padding: 'var(--space-3)', background: 'var(--color-success-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-success-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ color: 'var(--color-success-800)' }}>💡 Rekomendasi Target PPIC</strong>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-success-700)', marginTop: '4px' }}>
                  Berdasarkan estimasi panen <strong>{ppicWeeklyTotal} kg</strong> minggu ini,<br/>kebutuhan produksi adalah <strong>{Math.ceil(ppicWeeklyTotal * 0.75 / 0.05)} kemasan (pcs)</strong>.
                </div>
              </div>
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => {
                  setSpkForm(f => ({ ...f, targetQuantity: String(Math.ceil(ppicWeeklyTotal * 0.75 / 0.05)) }));
                  toast.success('Target Output disesuaikan dengan rekomendasi PPIC');
                }}
              >
                Gunakan Angka Ini
              </Button>
            </div>
          )}

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

          <FormField label="Varian Rasa Produk" required>
            <Input
              value={spkForm.productVariant}
              onChange={(e) => setSpkForm({ ...spkForm, productVariant: e.target.value })}
              placeholder="Contoh: Jamur Crispy Original 100g"
            />
          </FormField>

          <FormField label="Target Output Produksi (pcs kemasan)" required>
            <Input
              type="number"
              value={spkForm.targetQuantity}
              onChange={(e) => setSpkForm({ ...spkForm, targetQuantity: e.target.value })}
              placeholder="500"
            />
          </FormField>

          <FormField label="Catatan / Instruksi Khusus Operator">
            <Textarea
              rows={3}
              value={spkForm.notes}
              onChange={(e) => setSpkForm({ ...spkForm, notes: e.target.value })}
              placeholder="Contoh: Wajan #2, gunakan bumbu racikan baru..."
            />
          </FormField>
        </div>
      </Drawer>

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
