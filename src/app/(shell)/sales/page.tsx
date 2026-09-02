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
import { Plus, MoreVertical, Eye, CheckCircle, Truck, Package, FileText, Trash2 } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { getSalesOrders, createSalesOrder, updateSalesOrderStatus } from '@/actions/sales';
import { getCustomers, getProducts } from '@/actions/master';
import type { DbSalesOrder } from '@/types/database';

interface OrderItem { product_id: string; quantity: string; unit_price: string; }

interface FormState {
  customer_id: string;
  notes: string;
  items: OrderItem[];
}

const EMPTY_ITEM: OrderItem = { product_id: '', quantity: '', unit_price: '' };
const EMPTY_FORM: FormState = { customer_id: '', notes: '', items: [{ ...EMPTY_ITEM }] };

const STATUS_FLOW: DbSalesOrder['status'][] = ['PENDING', 'PROCESSING', 'SHIPPED', 'COMPLETED'];
const NEXT_STATUS: Partial<Record<DbSalesOrder['status'], DbSalesOrder['status']>> = {
  PENDING: 'PROCESSING', PROCESSING: 'SHIPPED', SHIPPED: 'COMPLETED',
};

export default function SalesPage() {
  const [data, setData] = useState<DbSalesOrder[]>([]);
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [products, setProducts] = useState<{ id: string; sku: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [viewItem, setViewItem] = useState<DbSalesOrder | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean; title: string; description: string;
    onConfirm: () => void; variant: 'danger' | 'primary';
  }>({ isOpen: false, title: '', description: '', onConfirm: () => {}, variant: 'primary' });

  const toast = useToast();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const [soRes, custRes, prodRes] = await Promise.all([
      getSalesOrders(), getCustomers(), getProducts(),
    ]);
    if (soRes.success && soRes.data) setData(soRes.data);
    if (custRes.success) setCustomers(custRes.data as any);
    if (prodRes.success) setProducts(prodRes.data as any);
    setIsLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

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
      return { ...f, items };
    });
  };

  const handleSave = async () => {
    if (!form.customer_id || form.items.some(it => !it.product_id || !it.quantity)) {
      toast.error('Lengkapi customer dan semua item pesanan');
      return;
    }
    setIsSaving(true);
    const res = await createSalesOrder({
      customer_id: form.customer_id,
      notes: form.notes || undefined,
      items: form.items.map(it => ({
        product_id: it.product_id,
        quantity: parseFloat(it.quantity),
        unit_price: parseFloat(it.unit_price) || 0,
      })),
    });
    setIsSaving(false);
    if (res.success) {
      toast.success('Sales Order berhasil dibuat!');
      setDrawerOpen(false);
      setForm(EMPTY_FORM);
      loadData();
    } else {
      toast.error(res.error || 'Gagal menyimpan');
    }
  };

  const handleAdvanceStatus = (item: DbSalesOrder) => {
    const nextStatus = NEXT_STATUS[item.status];
    if (!nextStatus) return;
    setConfirmDialog({
      isOpen: true,
      title: `Ubah Status ke ${nextStatus}`,
      description: `SO ${item.order_number || item.id} akan diubah ke status ${nextStatus}. Konfirmasi?`,
      variant: 'primary',
      onConfirm: async () => {
        const res = await updateSalesOrderStatus(item.id, nextStatus);
        if (res.success) {
          toast.success(`Status berhasil diubah ke ${nextStatus}`);
          loadData();
        } else {
          toast.error(res.error || 'Gagal update status');
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
        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--color-primary-600)' }}>
          {row.original.order_number || row.original.id.slice(0, 8).toUpperCase()}
        </span>
      ),
    },
    { id: 'customer', header: 'Customer', cell: ({ row }) => row.original.customer?.name || row.original.customer_id },
    { id: 'items_count', header: 'Jumlah Item', cell: ({ row }) => `${row.original.items?.length || 0} item` },
    {
      id: 'total',
      header: 'Total',
      cell: ({ row }) => row.original.total_amount != null
        ? `Rp ${row.original.total_amount.toLocaleString('id-ID')}`
        : '-',
    },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status.toLowerCase()} /> },
    { id: 'date', header: 'Tanggal', cell: ({ row }) => format(new Date(row.original.order_date), 'dd/MM/yyyy') },
    {
      id: 'actions',
      cell: ({ row }) => {
        const nextStatus = NEXT_STATUS[row.original.status];
        return (
          <Dropdown
            trigger={<Button variant="ghost" size="sm" style={{ padding: '0 8px' }}><MoreVertical size={16} /></Button>}
            items={[
              { id: 'view', label: 'Lihat Detail', icon: <Eye size={14} />, onClick: () => { setViewItem(row.original); setViewOpen(true); } },
              ...(nextStatus ? [{
                id: 'advance',
                label: `Ubah ke ${nextStatus}`,
                icon: nextStatus === 'SHIPPED' ? <Truck size={14} /> : <CheckCircle size={14} />,
                onClick: () => handleAdvanceStatus(row.original),
              }] : []),
            ]}
          />
        );
      },
    },
  ], []);

  return (
    <div>
      <PageHeader
        title="Sales Order & Pengiriman"
        description="Kelola pesanan distributor, alokasi stok, dan tracking status pengiriman."
        breadcrumbs={[{ label: 'Operasional' }, { label: 'Sales Orders' }]}
        actions={
          <Button variant="primary" onClick={() => { setForm(EMPTY_FORM); setDrawerOpen(true); }} leftIcon={<Plus size={16} />}>
            Buat Sales Order
          </Button>
        }
      />

      <DataTable columns={columns} data={data} />

      {/* ── CREATE DRAWER ── */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Buat Sales Order Baru"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDrawerOpen(false)}>Batal</Button>
            <Button variant="primary" onClick={handleSave} loading={isSaving}>Buat SO</Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <FormField label="Customer" required>
            <select
              value={form.customer_id}
              onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))}
              style={{
                width: '100%', padding: 'var(--space-2) var(--space-3)',
                border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)',
                background: 'var(--bg-default)', color: 'var(--text-primary)', fontSize: 'var(--text-sm)',
              }}
            >
              <option value="">-- Pilih Customer --</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </FormField>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
              <label style={{ fontWeight: 500, fontSize: 'var(--text-sm)' }}>Item Pesanan <span style={{ color: 'var(--color-danger-500)' }}>*</span></label>
              <Button variant="secondary" size="sm" onClick={addItem} leftIcon={<Plus size={12} />}>Tambah Item</Button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {form.items.map((item, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 'var(--space-2)', alignItems: 'flex-end', padding: 'var(--space-3)', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <FormField label="Produk">
                    <select
                      value={item.product_id}
                      onChange={e => updateItem(i, 'product_id', e.target.value)}
                      style={{
                        width: '100%', padding: 'var(--space-2) var(--space-3)',
                        border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)',
                        background: 'var(--bg-default)', color: 'var(--text-primary)', fontSize: 'var(--text-sm)',
                      }}
                    >
                      <option value="">-- Pilih --</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                    </select>
                  </FormField>
                  <FormField label="Qty (kg)">
                    <Input type="number" step="0.01" min="0" placeholder="0" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} />
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
              ))}
            </div>
          </div>

          {totalAmount > 0 && (
            <div style={{ padding: 'var(--space-3)', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between' }}>
              <strong>Total Pesanan:</strong>
              <strong style={{ color: 'var(--color-success-600)', fontSize: '1.1rem' }}>
                Rp {totalAmount.toLocaleString('id-ID')}
              </strong>
            </div>
          )}

          <FormField label="Catatan">
            <Input placeholder="Catatan pengiriman..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </FormField>
        </div>
      </Drawer>

      {/* ── VIEW DRAWER ── */}
      <Drawer
        isOpen={viewOpen}
        onClose={() => setViewOpen(false)}
        title={`Detail SO — ${viewItem?.order_number || ''}`}
        size="md"
        footer={<Button variant="secondary" onClick={() => setViewOpen(false)}>Tutup</Button>}
      >
        {viewItem && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {[
              { label: 'No. SO', value: viewItem.order_number || '-' },
              { label: 'Customer', value: viewItem.customer?.name || '-' },
              { label: 'Tanggal', value: format(new Date(viewItem.order_date), 'dd/MM/yyyy HH:mm') },
              { label: 'Status', value: viewItem.status },
              { label: 'Total', value: viewItem.total_amount != null ? `Rp ${viewItem.total_amount.toLocaleString('id-ID')}` : '-' },
              { label: 'Catatan', value: viewItem.notes || '-' },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 'var(--space-2)', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>{row.label}</span>
                <strong style={{ fontSize: 'var(--text-sm)' }}>{row.value}</strong>
              </div>
            ))}
            {viewItem.items && viewItem.items.length > 0 && (
              <div>
                <h4 style={{ margin: '0 0 var(--space-2)', fontSize: 'var(--text-sm)' }}>Item Pesanan</h4>
                {viewItem.items.map((it, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-2)', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-1)' }}>
                    <span>{it.product?.name || it.product_id}</span>
                    <span>{it.quantity} kg × Rp {(it.unit_price || 0).toLocaleString('id-ID')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Drawer>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        description={confirmDialog.description}
        variant={confirmDialog.variant}
      />
    </div>
  );
}
