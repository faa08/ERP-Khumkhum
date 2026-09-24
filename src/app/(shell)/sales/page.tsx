'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/data-table/DataTable';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Dropdown } from '@/components/ui/Dropdown';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Drawer } from '@/components/ui/Drawer';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/form/FormField';
import { useToast } from '@/hooks/useToast';
import {
  Plus,
  MoreVertical,
  Eye,
  CheckCircle,
  Truck,
  Package,
  PackageCheck,
  FileText,
  Trash2,
  RefreshCw,
  ShoppingCart,
  AlertTriangle,
  Layers,
  TrendingUp,
  Clock,
  CheckCircle2,
  ChevronRight,
  Boxes,
  Sparkles,
  Filter,
  Flame,
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import {
  getSalesOrders,
  createSalesOrder,
  updateSalesOrderStatus,
  returnSalesOrder,
  getSalesRealtimeTracking,
  type SalesRealtimeTrackingData,
  type FinishedGoodSalesStock,
} from '@/actions/sales';
import { importSalesOrderBulk } from '@/actions/sales-import';
import { getCustomers, getProducts } from '@/actions/master';
import type { DbSalesOrder, DbProduct } from '@/types/database';

interface OrderItem {
  product_id: string;
  quantity: string;
  unit_price: string;
}

interface FormState {
  customer_id: string;
  location: string;
  notes: string;
  items: OrderItem[];
}

const EMPTY_ITEM: OrderItem = { product_id: '', quantity: '1', unit_price: '' };
const EMPTY_FORM: FormState = { customer_id: '', location: '', notes: '', items: [{ ...EMPTY_ITEM }] };

const STATUS_FLOW: DbSalesOrder['status'][] = ['PENDING', 'PROCESSING', 'SHIPPED', 'COMPLETED'];
const NEXT_STATUS: Partial<Record<DbSalesOrder['status'], DbSalesOrder['status']>> = {
  PENDING: 'PROCESSING',
  PROCESSING: 'SHIPPED',
  SHIPPED: 'COMPLETED',
};

const FLAVOR_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Original: { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D' },
  Balado: { bg: '#FEE2E2', text: '#B91C1C', border: '#FCA5A5' },
  BBQ: { bg: '#FFEDD5', text: '#C2410C', border: '#FDBA74' },
  'Pedas Manis': { bg: '#FFE4E6', text: '#BE123C', border: '#FDA4AF' },
  'Super Pedas': { bg: '#7F1D1D', text: '#FEF2F2', border: '#991B1B' },
  'Jagung Bakar': { bg: '#FEF9C3', text: '#854D0E', border: '#FDE047' },
};

export default function SalesPage() {
  const [data, setData] = useState<DbSalesOrder[]>([]);
  const [tracking, setTracking] = useState<SalesRealtimeTrackingData | null>(null);
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [flavorFilter, setFlavorFilter] = useState<string>('ALL');

  // Drawers & Modals
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadCustomer, setUploadCustomer] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [viewItem, setViewItem] = useState<DbSalesOrder | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    variant: 'danger' | 'primary';
  }>({ isOpen: false, title: '', description: '', onConfirm: () => {}, variant: 'primary' });

  const toast = useToast();

  const loadData = useCallback(async (showToast = false) => {
    if (showToast) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const [soRes, trackingRes, custRes, prodRes] = await Promise.all([
        getSalesOrders(),
        getSalesRealtimeTracking(),
        getCustomers(),
        getProducts(),
      ]);

      if (soRes.success && soRes.data) setData(soRes.data);
      if (trackingRes.success && trackingRes.data) setTracking(trackingRes.data);
      if (custRes.success && custRes.data) setCustomers(custRes.data as any);
      if (prodRes.success && prodRes.data) setProducts(prodRes.data as any);

      if (showToast) {
        toast.success('Data stok packing & pesanan berhasil diperbarui secara real-time');
      }
    } catch (err: any) {
      toast.error('Gagal memuat data penjualan: ' + err.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Lookup map untuk stok produk jadi real-time
  const productsStockMap = useMemo(() => {
    const map = new Map<string, FinishedGoodSalesStock>();
    if (tracking?.productsStock) {
      for (const p of tracking.productsStock) {
        map.set(p.product_id, p);
      }
    }
    return map;
  }, [tracking]);

  // Daftar produk jadi yang tersedia dari hasil packing
  const availableStockList = useMemo(() => {
    if (!tracking?.productsStock) return [];
    if (flavorFilter === 'ALL') return tracking.productsStock;
    return tracking.productsStock.filter(p => p.flavor.toLowerCase() === flavorFilter.toLowerCase());
  }, [tracking, flavorFilter]);

  // Filter Sales Orders
  const filteredSalesOrders = useMemo(() => {
    if (statusFilter === 'ALL') return data;
    return data.filter(item => item.status === statusFilter);
  }, [data, statusFilter]);

  // ── Form helpers ───────────────────────────────────────────────
  const totalAmount = form.items.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unit_price) || 0;
    return sum + qty * price;
  }, 0);

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { ...EMPTY_ITEM }] }));
  const removeItem = (i: number) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));

  const updateItem = (i: number, field: keyof OrderItem, value: string) => {
    setForm(f => {
      const items = [...f.items];
      items[i] = { ...items[i], [field]: value };

      // Jika mengganti product_id, otomatis isi unit_price default
      if (field === 'product_id') {
        const pStock = productsStockMap.get(value);
        if (pStock && (!items[i].unit_price || items[i].unit_price === '0')) {
          items[i].unit_price = String(pStock.unit_price);
        }
      }

      return { ...f, items };
    });
  };

  // Quick action: Pesan langsung varian produk dari kartu katalog
  const handleQuickOrder = (pStock: FinishedGoodSalesStock) => {
    setForm({
      customer_id: customers[0]?.id || '',
      location: '',
      notes: `Pesanan khusus varian ${pStock.name} (Hasil Packing)`,
      items: [
        {
          product_id: pStock.product_id,
          quantity: pStock.available_stock > 0 ? String(Math.min(20, pStock.available_stock)) : '10',
          unit_price: String(pStock.unit_price),
        },
      ],
    });
    setDrawerOpen(true);
  };

  const handleSave = async () => {
    if (!form.customer_id) {
      toast.error('Pilih customer terlebih dahulu');
      return;
    }
    if (form.items.some(it => !it.product_id || !it.quantity || parseFloat(it.quantity) <= 0)) {
      toast.error('Lengkapi produk dan jumlah kemasan untuk semua item pesanan');
      return;
    }

    setIsSaving(true);
    const res = await createSalesOrder({
      customer_id: form.customer_id,
      location: form.location || undefined,
      notes: form.notes || undefined,
      items: form.items.map(it => ({
        product_id: it.product_id,
        quantity: parseFloat(it.quantity),
        unit_price: parseFloat(it.unit_price) || 0,
      })),
    });
    setIsSaving(false);

    if (res.success) {
      toast.success(`Sales Order ${res.data?.order_number || ''} berhasil dibuat & stok terintegrasi!`);
      setDrawerOpen(false);
      setForm(EMPTY_FORM);
      loadData();
    } else {
      toast.error(res.error || 'Gagal menyimpan pesanan penjualan');
    }
  };

  const handleUpload = async () => {
    if (!uploadCustomer) {
      toast.error('Pilih Platform / Customer terlebih dahulu');
      return;
    }
    if (!uploadFile) {
      toast.error('Pilih file Excel yang akan diunggah');
      return;
    }
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', uploadFile);
    const res = await importSalesOrderBulk(formData, uploadCustomer);
    setIsUploading(false);
    if (res.success) {
      toast.success(res.error || `Berhasil mengimpor ${res.count} pesanan!`);
      setUploadOpen(false);
      loadData();
    } else {
      toast.error(res.error || 'Gagal mengimpor data');
    }
  };

  const handleAdvanceStatus = (item: DbSalesOrder) => {
    const nextStatus = NEXT_STATUS[item.status];
    if (!nextStatus) return;

    let desc = `SO ${item.order_number || item.id.slice(0, 8)} akan diubah ke status ${nextStatus}.`;
    if (nextStatus === 'SHIPPED') {
      desc += ' Stok produk jadi di gudang akan otomatis dipotong dan mutasi pengiriman dicatat.';
    }

    setConfirmDialog({
      isOpen: true,
      title: `Ubah Status Pesanan ke ${nextStatus}`,
      description: desc,
      variant: 'primary',
      onConfirm: async () => {
        const res = await updateSalesOrderStatus(item.id, nextStatus);
        if (res.success) {
          toast.success(`Status berhasil diubah ke ${nextStatus}`);
          loadData();
        } else {
          toast.error(res.error || 'Gagal mengubah status');
        }
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      },
    });
  };

  // ── Columns ────────────────────────────────────────────────────
  const columns = useMemo<ColumnDef<DbSalesOrder>[]>(() => [
    {
      id: 'order_number',
      header: 'No. SO',
      cell: ({ row }) => (
        <div>
          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-primary-700)', fontSize: 'var(--text-sm)' }}>
            {row.original.order_number || row.original.id.slice(0, 8).toUpperCase()}
          </span>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
            {format(new Date(row.original.order_date), 'dd/MM/yyyy HH:mm')}
          </div>
        </div>
      ),
    },
    {
      id: 'customer',
      header: 'Customer / Distributor',
      cell: ({ row }) => (
        <div>
          <strong style={{ fontSize: 'var(--text-sm)' }}>{row.original.customer?.name || 'Distributor KhumKhum'}</strong>
          {row.original.customer?.contact && (
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
              Kontak: {row.original.customer.contact}
            </div>
          )}
          {row.original.location && (
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
              Tempat: {row.original.location}
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'items_summary',
      header: 'Produk Jadi (Kemasan)',
      cell: ({ row }) => {
        const items = row.original.items || [];
        if (items.length === 0) return <span style={{ color: 'var(--text-tertiary)' }}>-</span>;

        const totalPcs = items.reduce((acc, it) => acc + Number(it.quantity || 0), 0);

        return (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{totalPcs} pcs</span>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                ({items.length} varian)
              </span>
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {items.map(it => `${it.product?.name || 'Produk'} (${it.quantity}x)`).join(', ')}
            </div>
          </div>
        );
      },
    },
    {
      id: 'stock_status',
      header: 'Status Alokasi Stok',
      cell: ({ row }) => {
        const items = row.original.items || [];
        const isShipped = row.original.status === 'SHIPPED' || row.original.status === 'COMPLETED';

        if (isShipped) {
          return (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 600,
                background: '#DCFCE7',
                color: '#166534',
                border: '1px solid #86EFAC',
              }}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-currentColor" aria-hidden="true" />
              Stok Terkirim
            </span>
          );
        }

        // Cek apakah semua item cukup stoknya
        let isFullyAvailable = true;
        for (const it of items) {
          const pStock = productsStockMap.get(it.product_id);
          if (!pStock || pStock.available_stock < Number(it.quantity || 0)) {
            isFullyAvailable = false;
            break;
          }
        }

        if (isFullyAvailable && items.length > 0) {
          return (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 600,
                background: '#EFF6FF',
                color: '#1E40AF',
                border: '1px solid #BFDBFE',
              }}
            >
              <PackageCheck className="w-3.5 h-3.5 text-currentColor" aria-hidden="true" />
              Siap Kirim (Stok Cukup)
            </span>
          );
        }

        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: 600,
              background: '#FEF3C7',
              color: '#92400E',
              border: '1px solid #FDE68A',
            }}
          >
            <Clock className="w-3.5 h-3.5 text-currentColor" aria-hidden="true" />
            Menunggu Hasil Packing
          </span>
        );
      },
    },
    {
      id: 'total',
      header: 'Total Nilai',
      cell: ({ row }) => (
        <span style={{ fontWeight: 700, color: 'var(--color-success-700)', fontSize: 'var(--text-sm)' }}>
          {row.original.total_amount != null
            ? `Rp ${row.original.total_amount.toLocaleString('id-ID')}`
            : '-'}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status SO',
      cell: ({ row }) => <StatusBadge status={row.original.status.toLowerCase()} />,
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const nextStatus = NEXT_STATUS[row.original.status];
        return (
          <Dropdown
            trigger={
              <Button variant="ghost" size="sm" style={{ padding: '0 8px' }} aria-label="Aksi Pesanan">
                <MoreVertical className="w-4 h-4 text-currentColor" aria-hidden="true" />
              </Button>
            }
            items={[
              {
                id: 'view',
                label: 'Lihat Detail Pesanan',
                icon: <Eye className="w-3.5 h-3.5 text-currentColor" aria-hidden="true" />,
                onClick: () => {
                  setViewItem(row.original);
                  setViewOpen(true);
                },
              },
              ...(nextStatus
                ? [
                    {
                      id: 'advance',
                      label: `Ubah Status ke ${nextStatus}`,
                      icon:
                        nextStatus === 'SHIPPED' ? (
                          <Truck className="w-3.5 h-3.5 text-currentColor" aria-hidden="true" />
                        ) : (
                          <CheckCircle className="w-3.5 h-3.5 text-currentColor" aria-hidden="true" />
                        ),
                      onClick: () => handleAdvanceStatus(row.original),
                    },
                  ]
                : []),
              ...(row.original.status === 'SHIPPED' || row.original.status === 'COMPLETED'
                ? [
                    {
                      id: 'return',
                      label: 'Tandai Retur/Pengembalian',
                      icon: <AlertTriangle className="w-3.5 h-3.5 text-currentColor" aria-hidden="true" />,
                      onClick: () => {
                        setConfirmDialog({
                          isOpen: true,
                          title: 'Tandai Pesanan Retur',
                          description: `Apakah Anda yakin ingin menandai pesanan ${row.original.order_number || row.original.id.slice(0, 8)} sebagai retur?`,
                          variant: 'danger',
                          onConfirm: async () => {
                            const res = await returnSalesOrder(row.original.id);
                            if (res.success) {
                              toast.success('Pesanan berhasil ditandai sebagai retur');
                              loadData();
                            } else {
                              toast.error(res.error || 'Gagal meretur pesanan');
                            }
                            setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                          },
                        });
                      },
                    },
                  ]
                : []),
            ]}
          />
        );
      },
    },
  ], [productsStockMap]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* ── HEADER ── */}
      <PageHeader
        title="Sales Order & Pelacakan Penjualan Real-Time"
        description="Integrasi langsung hasil packing produk jadi pabrik dengan pesanan distributor & pelacakan stok siap jual secara real-time."
        breadcrumbs={[{ label: 'Operasional' }, { label: 'Sales & Orders' }]}
        actions={
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Button
              variant="secondary"
              onClick={() => {
                setUploadCustomer('');
                setUploadFile(null);
                setUploadOpen(true);
              }}
              leftIcon={<FileText className="w-4 h-4 text-currentColor" aria-hidden="true" />}
            >
              Upload Excel
            </Button>
            <Button
              variant="secondary"
              onClick={() => loadData(true)}
              loading={isRefreshing}
              leftIcon={<RefreshCw className="w-4 h-4 text-currentColor" aria-hidden="true" />}
            >
              Sinkronkan Real-Time
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setForm(EMPTY_FORM);
                setDrawerOpen(true);
              }}
              leftIcon={<Plus className="w-4 h-4 text-currentColor" aria-hidden="true" />}
            >
              Buat Sales Order
            </Button>
          </div>
        }
      />

      {/* ── 4 REAL-TIME TRACKING METRIC CARDS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-4)' }}>
        {/* Card 1: Stok Siap Jual (Packing) */}
        <div
          style={{
            padding: 'var(--space-4)',
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-md)',
              background: '#DCFCE7',
              color: '#15803D',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <PackageCheck className="w-6 h-6 text-currentColor" aria-hidden="true" />
          </div>
          <div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Stok Siap Jual (Packing)
            </div>
            <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: '#166534' }}>
              {(tracking?.summary?.totalFinishedGoodsStock || 0).toLocaleString('id-ID')} pcs
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
              Hasil Packing Siap di Gudang
            </div>
          </div>
        </div>

        {/* Card 2: Pesanan Aktif (Dalam Antrean) */}
        <div
          style={{
            padding: 'var(--space-4)',
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-md)',
              background: '#FEF3C7',
              color: '#B45309',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Clock className="w-6 h-6 text-currentColor" aria-hidden="true" />
          </div>
          <div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Pesanan Aktif (Terpesan)
            </div>
            <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: '#92400E' }}>
              {(tracking?.summary?.totalOrderedPending || 0).toLocaleString('id-ID')} pcs
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
              {tracking?.summary?.activeOrdersCount || 0} Sales Order (Pending/Proses)
            </div>
          </div>
        </div>

        {/* Card 3: Sisa Stok Bebas Siap Jual */}
        <div
          style={{
            padding: 'var(--space-4)',
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-md)',
              background: '#EDE9FE',
              color: '#6D28D9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Layers className="w-6 h-6 text-currentColor" aria-hidden="true" />
          </div>
          <div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Sisa Stok Bebas (Available)
            </div>
            <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: '#5B21B6' }}>
              {(tracking?.summary?.availableStock || 0).toLocaleString('id-ID')} pcs
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
              Dapat Segera Dipesan Bebas
            </div>
          </div>
        </div>

        {/* Card 4: Penjualan Realisasi Terkirim */}
        <div
          style={{
            padding: 'var(--space-4)',
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-md)',
              background: '#E0F2FE',
              color: '#0369A1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <TrendingUp className="w-6 h-6 text-currentColor" aria-hidden="true" />
          </div>
          <div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Realisasi Penjualan (Terkirim)
            </div>
            <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: '#075985' }}>
              Rp {(tracking?.summary?.totalRevenue || 0).toLocaleString('id-ID')}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
              {(tracking?.summary?.totalSoldShipped || 0).toLocaleString('id-ID')} pcs terkirim ({tracking?.summary?.fulfillmentRate || 100}% terpenuhi)
            </div>
          </div>
        </div>
      </div>

      {/* ── KATALOG STOK PRODUK JADI REAL-TIME (HASIL PACKING) ── */}
      <div
        style={{
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-sm)',
          padding: 'var(--space-4)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 'var(--space-3)',
            marginBottom: 'var(--space-4)',
            paddingBottom: 'var(--space-3)',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Boxes className="w-5 h-5 text-currentColor" style={{ color: 'var(--color-primary-600)' }} aria-hidden="true" />
            <div>
              <h3 style={{ margin: 0, fontSize: 'var(--text-base)', fontWeight: 600 }}>
                Katalog Stok Produk Jadi Real-Time (Hasil Packing Produksi)
              </h3>
              <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                Stok otomatis bertambah saat operator packing mencatat kemasan di modul produksi
              </p>
            </div>
          </div>

          {/* Filter Rasa */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Filter Varian:
            </span>
            {['ALL', 'Original', 'Balado', 'BBQ', 'Pedas Manis', 'Super Pedas'].map(flavor => {
              const isActive = flavorFilter === flavor;
              return (
                <button
                  key={flavor}
                  type="button"
                  onClick={() => setFlavorFilter(flavor)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '11px',
                    fontWeight: isActive ? 600 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    background: isActive ? 'var(--color-primary-600)' : 'var(--bg-subtle)',
                    color: isActive ? '#fff' : 'var(--text-secondary)',
                    border: '1px solid ' + (isActive ? 'var(--color-primary-600)' : 'var(--border-subtle)'),
                  }}
                >
                  {flavor === 'ALL' ? 'Semua Varian' : flavor}
                </button>
              );
            })}
          </div>
        </div>

        {/* Grid Kartu Produk Jadi Hasil Packing */}
        {availableStockList.length === 0 ? (
          <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-tertiary)' }}>
            Belum ada data stok produk jadi dari hasil packing.
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 'var(--space-3)',
            }}
          >
            {availableStockList.map(p => {
              const fStyle = FLAVOR_COLORS[p.flavor] || { bg: '#F3F4F6', text: '#374151', border: '#D1D5DB' };
              const isAvailable = p.available_stock > 0;

              return (
                <div
                  key={p.product_id}
                  style={{
                    padding: 'var(--space-3)',
                    background: 'var(--bg-default)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 'var(--space-3)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div>
                    {/* Header: Tag Varian & Badge Status */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: fStyle.bg,
                          color: fStyle.text,
                          border: `1px solid ${fStyle.border}`,
                        }}
                      >
                        {p.flavor}
                      </span>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 600,
                          background: p.status === 'READY' ? '#DCFCE7' : p.status === 'LOW' ? '#FEF3C7' : '#FEE2E2',
                          color: p.status === 'READY' ? '#166534' : p.status === 'LOW' ? '#92400E' : '#991B1B',
                          border: `1px solid ${p.status === 'READY' ? '#86EFAC' : p.status === 'LOW' ? '#FCD34D' : '#FCA5A5'}`,
                        }}
                      >
                        {p.status === 'READY' ? 'Ready Stock' : p.status === 'LOW' ? 'Stok Menipis' : 'Stok Habis'}
                      </span>
                    </div>

                    {/* Nama Produk & Info Kemasan */}
                    <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-primary)', marginBottom: '4px' }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      SKU: <span style={{ fontFamily: 'monospace' }}>{p.sku}</span> • {p.packaging_type} ({p.weight})
                    </div>
                  </div>

                  {/* Metrik Stok Bar */}
                  <div style={{ background: 'var(--bg-subtle)', padding: 'var(--space-2)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', textAlign: 'center', gap: '4px' }}>
                      <div>
                        <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Fisik Gudang</div>
                        <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                          {p.warehouse_stock}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Terpesan</div>
                        <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: '#D97706' }}>
                          {p.reserved_stock}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Sisa Siap Jual</div>
                        <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: isAvailable ? '#15803D' : '#DC2626' }}>
                          {p.available_stock} pcs
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tombol Aksi Pesan Langsung */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                      Rp {p.unit_price.toLocaleString('id-ID')} / pcs
                    </span>
                    <Button
                      variant={isAvailable ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => handleQuickOrder(p)}
                      leftIcon={<ShoppingCart className="w-3.5 h-3.5 text-currentColor" aria-hidden="true" />}
                    >
                      Pesan Produk Ini
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── SECTION DAFTAR SALES ORDER ── */}
      <div
        style={{
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-sm)',
          padding: 'var(--space-4)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 'var(--space-3)',
            marginBottom: 'var(--space-4)',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: 'var(--text-base)', fontWeight: 600 }}>
              Daftar Sales Order & Status Alokasi Pengiriman
            </h3>
            <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
              Memantau pemenuhan pesanan dari stok produk jadi yang telah selesai dipacking
            </p>
          </div>

          {/* Filter Status Tab */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Status SO:
            </span>
            {['ALL', 'PENDING', 'PROCESSING', 'SHIPPED', 'COMPLETED'].map(status => {
              const isActive = statusFilter === status;
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '11px',
                    fontWeight: isActive ? 600 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    background: isActive ? 'var(--color-primary-600)' : 'var(--bg-subtle)',
                    color: isActive ? '#fff' : 'var(--text-secondary)',
                    border: '1px solid ' + (isActive ? 'var(--color-primary-600)' : 'var(--border-subtle)'),
                  }}
                >
                  {status === 'ALL' ? 'Semua' : status}
                </button>
              );
            })}
          </div>
        </div>

        <DataTable columns={columns} data={filteredSalesOrders} isLoading={isLoading} />
      </div>

      {/* ── CREATE SALES ORDER DRAWER ── */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Buat Sales Order Baru (Alokasi Stok Packing)"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDrawerOpen(false)}>
              Batal
            </Button>
            <Button variant="primary" onClick={handleSave} loading={isSaving}>
              Simpan & Alokasikan SO
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
          <FormField label="Customer / Distributor" required>
            <select
              value={form.customer_id}
              onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))}
              style={{
                width: '100%',
                padding: 'var(--space-2) var(--space-3)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-default)',
                color: 'var(--text-primary)',
                fontSize: 'var(--text-sm)',
              }}
            >
              <option value="">-- Pilih Customer / Distributor --</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Nama Tempat / Lokasi">
            <Input
              placeholder="Contoh: Toko Cabang A, Gudang Utama..."
              value={form.location}
              onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
            />
          </FormField>
        </div>

          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 'var(--space-2)',
              }}
            >
              <label style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                Daftar Item Produk Jadi (Kemasan) <span style={{ color: 'var(--color-danger-500)' }}>*</span>
              </label>
              <Button
                variant="secondary"
                size="sm"
                onClick={addItem}
                leftIcon={<Plus className="w-3.5 h-3.5 text-currentColor" aria-hidden="true" />}
              >
                Tambah Item
              </Button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {form.items.map((item, i) => {
                const selectedStock = productsStockMap.get(item.product_id);
                const requestedQty = parseFloat(item.quantity) || 0;
                const available = selectedStock?.available_stock || 0;
                const isOverStock = item.product_id && requestedQty > available;

                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'var(--space-2)',
                      padding: 'var(--space-3)',
                      background: 'var(--bg-subtle)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '3fr 1.2fr 1.5fr auto',
                        gap: 'var(--space-2)',
                        alignItems: 'flex-end',
                      }}
                    >
                      <FormField label="Varian Produk Jadi (Hasil Packing)" required>
                        <select
                          value={item.product_id}
                          onChange={e => updateItem(i, 'product_id', e.target.value)}
                          style={{
                            width: '100%',
                            padding: 'var(--space-2) var(--space-3)',
                            border: '1px solid var(--border-default)',
                            borderRadius: 'var(--radius-md)',
                            background: 'var(--bg-default)',
                            color: 'var(--text-primary)',
                            fontSize: 'var(--text-sm)',
                          }}
                        >
                          <option value="">-- Pilih Varian Produk Jadi --</option>
                          {tracking?.productsStock?.map(p => (
                            <option key={p.product_id} value={p.product_id}>
                              {p.name} — Siap Jual: {p.available_stock} pcs (Rp {p.unit_price.toLocaleString('id-ID')})
                            </option>
                          ))}
                        </select>
                      </FormField>

                      <FormField label="Jumlah (Pcs)" required>
                        <Input
                          type="number"
                          step="1"
                          min="1"
                          placeholder="Pcs"
                          value={item.quantity}
                          onChange={e => updateItem(i, 'quantity', e.target.value)}
                        />
                      </FormField>

                      <FormField label="Harga / Pcs (Rp)">
                        <Input
                          type="number"
                          step="500"
                          min="0"
                          placeholder="Rp"
                          value={item.unit_price}
                          onChange={e => updateItem(i, 'unit_price', e.target.value)}
                        />
                      </FormField>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(i)}
                        aria-label="Hapus baris item"
                        style={{ color: 'var(--color-danger-600)', marginBottom: '2px' }}
                      >
                        <Trash2 className="w-4 h-4 text-currentColor" aria-hidden="true" />
                      </Button>
                    </div>

                    {/* Info Stok Real-Time & Peringatan Jika Melebihi Ketersediaan */}
                    {selectedStock && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '4px 8px',
                          borderRadius: 'var(--radius-sm)',
                          background: isOverStock ? '#FEF2F2' : '#F0FDF4',
                          border: `1px solid ${isOverStock ? '#FCA5A5' : '#BBF7D0'}`,
                          fontSize: '11px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {isOverStock ? (
                            <AlertTriangle className="w-3.5 h-3.5 text-currentColor" style={{ color: '#DC2626' }} aria-hidden="true" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5 text-currentColor" style={{ color: '#16A34A' }} aria-hidden="true" />
                          )}
                          <span style={{ color: isOverStock ? '#991B1B' : '#166534', fontWeight: 500 }}>
                            {isOverStock
                              ? `Pesanan (${requestedQty} pcs) melebihi stok siap jual (${available} pcs). Kekurangan ${requestedQty - available} pcs menunggu output packing berikutnya.`
                              : `Stok siap jual tersedia: ${available} pcs (Gudang: ${selectedStock.warehouse_stock} pcs, Terpesan: ${selectedStock.reserved_stock} pcs)`}
                          </span>
                        </div>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          Subtotal: Rp {((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)).toLocaleString('id-ID')}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {totalAmount > 0 && (
            <div
              style={{
                padding: 'var(--space-3) var(--space-4)',
                background: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>Total Nilai Pesanan:</span>
              <strong style={{ color: 'var(--color-success-700)', fontSize: 'var(--text-lg)' }}>
                Rp {totalAmount.toLocaleString('id-ID')}
              </strong>
            </div>
          )}

          <FormField label="Catatan Pengiriman / Instruksi Distributor">
            <Input
              placeholder="Contoh: Kirim via kurir logistik cabang Yogyakarta..."
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </FormField>
        </div>
      </Drawer>

      {/* ── VIEW SALES ORDER DRAWER ── */}
      <Drawer
        isOpen={viewOpen}
        onClose={() => setViewOpen(false)}
        title={`Detail Sales Order — ${viewItem?.order_number || viewItem?.id.slice(0, 8) || ''}`}
        size="md"
        footer={
          <Button variant="secondary" onClick={() => setViewOpen(false)}>
            Tutup
          </Button>
        }
      >
        {viewItem && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {[
              { label: 'Nomor Order', value: viewItem.order_number || viewItem.id.slice(0, 8).toUpperCase() },
              { label: 'Customer', value: viewItem.customer?.name || viewItem.customer_id },
              { label: 'Tempat / Lokasi', value: viewItem.location || '-' },
              { label: 'Tanggal Pesanan', value: format(new Date(viewItem.order_date), 'dd/MM/yyyy HH:mm') },
              { label: 'Status Saat Ini', value: viewItem.status },
              {
                label: 'Total Nilai Pesanan',
                value: viewItem.total_amount != null ? `Rp ${viewItem.total_amount.toLocaleString('id-ID')}` : '-',
              },
              { label: 'Catatan Pengiriman', value: viewItem.notes || '-' },
            ].map(row => (
              <div
                key={row.label}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingBottom: 'var(--space-2)',
                  borderBottom: '1px solid var(--border-subtle)',
                }}
              >
                <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>{row.label}</span>
                <strong style={{ fontSize: 'var(--text-sm)' }}>{row.value}</strong>
              </div>
            ))}

            {viewItem.items && viewItem.items.length > 0 && (
              <div>
                <h4 style={{ margin: 'var(--space-2) 0', fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                  Rincian Item Produk Jadi
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {viewItem.items.map((it, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: 'var(--space-3)',
                        background: 'var(--bg-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                          {it.product?.name || it.product_id}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                          {it.product?.sku || 'SKU-KHK'}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--color-primary-700)' }}>
                          {it.quantity} pcs
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          @ Rp {(it.unit_price || 0).toLocaleString('id-ID')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* ── CONFIRM DIALOG ── */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        description={confirmDialog.description}
        variant={confirmDialog.variant}
      />

      {/* ── UPLOAD EXCEL DRAWER ── */}
      <Drawer
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title="Upload Bulk Sales Order (Excel)"
        size="md"
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <a href="/api/sales-template" target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" leftIcon={<FileText className="w-4 h-4" />}>
                Download Template
              </Button>
            </a>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button variant="secondary" onClick={() => setUploadOpen(false)}>Batal</Button>
              <Button variant="primary" onClick={handleUpload} loading={isUploading}>
                Upload & Proses
              </Button>
            </div>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{ padding: 'var(--space-3)', background: 'var(--color-primary-50)', borderRadius: 'var(--radius-md)', color: 'var(--color-primary-800)', fontSize: 'var(--text-sm)' }}>
            Gunakan fitur ini untuk mengunggah ratusan pesanan dari Shopee, Tokopedia, TikTok Shop, atau distributor sekaligus tanpa perlu input manual satu per satu.
          </div>
          
          <FormField label="Pilih Customer / Platform Asal Order" required>
            <select
              value={uploadCustomer}
              onChange={e => setUploadCustomer(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-default)',
                background: 'var(--bg-default)',
              }}
            >
              <option value="">-- Pilih Customer / Marketplace --</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="File Excel (.xlsx)" required>
            <Input
              type="file"
              accept=".xlsx"
              onChange={e => {
                if (e.target.files && e.target.files.length > 0) {
                  setUploadFile(e.target.files[0]);
                }
              }}
            />
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
              Pastikan format kolom sesuai dengan template (Maksimal 5MB).
            </div>
          </FormField>
        </div>
      </Drawer>
    </div>
  );
}
