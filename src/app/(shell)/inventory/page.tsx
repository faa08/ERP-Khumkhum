'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/data-table/DataTable';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Drawer } from '@/components/ui/Drawer';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/form/FormField';
import { useToast } from '@/hooks/useToast';
import { Package, AlertTriangle, TrendingDown, Plus } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { getInventorySummary, getStockMovements } from '@/actions/inventory';
import type { DbInventory, DbStockMovement } from '@/types/database';

const CATEGORY_CONFIG: Record<string, { label: string; icon: string; color: string; rop: number }> = {
  RAW_MATERIAL: { label: 'Bahan Baku Jamur', icon: '🍄', color: 'var(--color-success-600)', rop: 50 },
  PRODUCT: { label: 'Produk Jadi', icon: '📦', color: 'var(--color-primary-600)', rop: 100 },
};

export default function InventoryPage() {
  const [inventoryData, setInventoryData] = useState<DbInventory[]>([]);
  const [movements, setMovements] = useState<DbStockMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [opnameDrawerOpen, setOpnameDrawerOpen] = useState(false);
  const [physicalInputs, setPhysicalInputs] = useState<Record<string, string>>({});

  const toast = useToast();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const [invRes, mvRes] = await Promise.all([
      getInventorySummary(),
      getStockMovements(),
    ]);
    if (invRes.success && invRes.data) setInventoryData(invRes.data);
    if (mvRes.success && mvRes.data) setMovements(mvRes.data);
    setIsLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Aggregate stok per kategori ────────────────────────────────
  const categoryTotals = useMemo(() => {
    const map = new Map<string, { total: number; items: DbInventory[]; belowRop: number }>();
    for (const inv of inventoryData) {
      if (!map.has(inv.item_type)) {
        map.set(inv.item_type, { total: 0, items: [], belowRop: 0 });
      }
      const entry = map.get(inv.item_type)!;
      entry.total += inv.quantity;
      entry.items.push(inv);
      const rop = inv.reorder_point || CATEGORY_CONFIG[inv.item_type]?.rop || 0;
      if (inv.quantity < rop) entry.belowRop += 1;
    }
    return map;
  }, [inventoryData]);

  // ── Kalkulasi akurasi opname ───────────────────────────────────
  const opnameAccuracy = useMemo(() => {
    const results = inventoryData.map(inv => {
      const physical = parseFloat(physicalInputs[inv.id] || '');
      if (isNaN(physical) || inv.quantity === 0) return null;
      return Math.abs(physical - inv.quantity) / inv.quantity;
    }).filter(v => v !== null) as number[];

    if (results.length === 0) return null;
    const avgDiff = results.reduce((s, v) => s + v, 0) / results.length;
    return (1 - avgDiff) * 100;
  }, [inventoryData, physicalInputs]);

  // ── Inventory table columns ────────────────────────────────────
  const invColumns = useMemo<ColumnDef<DbInventory>[]>(() => [
    {
      id: 'item_name',
      header: 'Item',
      cell: ({ row }) => (
        <div>
          <div style={{ fontWeight: 600 }}>{row.original.item_name || 'Item'}</div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
            {row.original.item_type}
          </div>
        </div>
      ),
    },
    { id: 'warehouse', header: 'Gudang', cell: ({ row }) => row.original.warehouse?.name || '-' },
    {
      accessorKey: 'quantity',
      header: 'Stok (kg)',
      cell: ({ row }) => {
        const rop = row.original.reorder_point || CATEGORY_CONFIG[row.original.item_type]?.rop || 0;
        const low = row.original.quantity < rop;
        return (
          <span style={{ fontWeight: 600, color: low ? 'var(--color-danger-600)' : 'var(--text-primary)' }}>
            {row.original.quantity.toLocaleString('id-ID')} kg
            {low && <span style={{ marginLeft: 6, fontSize: 'var(--text-xs)' }}>⚠ Low</span>}
          </span>
        );
      },
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const rop = row.original.reorder_point || CATEGORY_CONFIG[row.original.item_type]?.rop || 0;
        const status = row.original.quantity === 0 ? 'out_of_stock' : row.original.quantity < rop ? 'low_stock' : 'in_stock';
        return <StatusBadge status={status} />;
      },
    },
    {
      id: 'updated',
      header: 'Update Terakhir',
      cell: ({ row }) => format(new Date(row.original.last_updated_at), 'dd/MM/yyyy HH:mm'),
    },
  ], []);

  // ── Movement table columns ─────────────────────────────────────
  const mvColumns = useMemo<ColumnDef<DbStockMovement>[]>(() => [
    { accessorKey: 'movement_type', header: 'Tipe', cell: ({ row }) => {
      const colors: Record<string, string> = { IN: 'var(--color-success-600)', OUT: 'var(--color-danger-600)', ADJUSTMENT: 'var(--color-warning-600)', TRANSFER: 'var(--color-primary-600)' };
      return <StatusBadge status={row.original.movement_type.toLowerCase()} />;
    }},
    { accessorKey: 'quantity', header: 'Qty (kg)', cell: ({ row }) => {
      const isIn = row.original.movement_type === 'IN';
      return <strong style={{ color: isIn ? 'var(--color-success-600)' : 'var(--color-danger-600)' }}>
        {isIn ? '+' : '-'}{Math.abs(row.original.quantity).toLocaleString('id-ID')} kg
      </strong>;
    }},
    { accessorKey: 'notes', header: 'Keterangan', cell: ({ row }) => row.original.notes || '-' },
    { id: 'date', header: 'Tanggal', cell: ({ row }) => format(new Date(row.original.movement_date), 'dd/MM/yyyy HH:mm') },
  ], []);

  // ── TABS ───────────────────────────────────────────────────────
  const tabContent = (
    <>
      {/* TAB 1: Stok Real-time */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        {Array.from(categoryTotals.entries()).map(([type, stat]) => {
          const cfg = CATEGORY_CONFIG[type] || { label: type, icon: '📦', color: 'var(--text-primary)', rop: 0 };
          return (
            <Card key={type}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                <span style={{ fontSize: '2rem' }}>{cfg.icon}</span>
                <div>
                  <div style={{ fontWeight: 600 }}>{cfg.label}</div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{stat.items.length} item(s)</div>
                </div>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: cfg.color }}>
                {stat.total.toLocaleString('id-ID')} <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>kg</span>
              </div>
              {stat.belowRop > 0 && (
                <div style={{ marginTop: 'var(--space-2)', display: 'flex', alignItems: 'center', gap: 'var(--space-1)', color: 'var(--color-warning-600)', fontSize: 'var(--text-sm)' }}>
                  <AlertTriangle size={14} />
                  {stat.belowRop} item di bawah Reorder Point
                </div>
              )}
            </Card>
          );
        })}

        {/* Fallback jika kosong */}
        {categoryTotals.size === 0 && !isLoading && (
          <>
            {[
              { label: 'Jamur Bersih', icon: '🍄', qty: 0, color: 'var(--color-success-600)' },
              { label: 'Minyak & Tepung', icon: '🫙', qty: 0, color: 'var(--color-warning-600)' },
              { label: 'Bumbu', icon: '🌶️', qty: 0, color: 'var(--color-danger-600)' },
              { label: 'Kemasan', icon: '📦', qty: 0, color: 'var(--color-primary-600)' },
              { label: 'Produk Jadi', icon: '🏪', qty: 0, color: 'var(--color-info-600)' },
            ].map(c => (
              <Card key={c.label}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                  <span style={{ fontSize: '2rem' }}>{c.icon}</span>
                  <div style={{ fontWeight: 600 }}>{c.label}</div>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-tertiary)' }}>0 kg</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 4 }}>Belum ada data stok</div>
              </Card>
            ))}
          </>
        )}
      </div>

      <DataTable columns={invColumns} data={inventoryData} />
    </>
  );

  const movementContent = (
    <div style={{ marginTop: 'var(--space-4)' }}>
      <DataTable columns={mvColumns} data={movements} />
    </div>
  );

  const opnameContent = (
    <div style={{ marginTop: 'var(--space-4)' }}>
      <Card header={<strong>Stock Opname — Input Stok Fisik</strong>}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-4)' }}>
          Masukkan hasil hitung fisik untuk setiap item di gudang. Sistem akan menghitung akurasi stok secara otomatis.
        </p>
        {inventoryData.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {inventoryData.slice(0, 10).map(inv => (
              <div key={inv.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 'var(--space-3)', alignItems: 'center', padding: 'var(--space-3)', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                <div>
                  <div style={{ fontWeight: 500 }}>{inv.item_name}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>{inv.warehouse?.name}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Sistem</div>
                  <strong>{inv.quantity} kg</strong>
                </div>
                <div>
                  <Input
                    type="number" step="0.01" min="0"
                    placeholder="Fisik (kg)"
                    value={physicalInputs[inv.id] || ''}
                    onChange={e => setPhysicalInputs(prev => ({ ...prev, [inv.id]: e.target.value }))}
                  />
                </div>
                <div style={{ textAlign: 'center' }}>
                  {physicalInputs[inv.id] && (
                    <div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Selisih</div>
                      <strong style={{
                        color: Math.abs(parseFloat(physicalInputs[inv.id]) - inv.quantity) < 0.01
                          ? 'var(--color-success-600)' : 'var(--color-danger-600)'
                      }}>
                        {(parseFloat(physicalInputs[inv.id]) - inv.quantity).toFixed(2)} kg
                      </strong>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {opnameAccuracy !== null && (
              <div style={{
                padding: 'var(--space-4)', borderRadius: 'var(--radius-md)',
                background: opnameAccuracy >= 98 ? 'var(--color-success-50)' : 'var(--color-warning-50)',
                border: `1px solid ${opnameAccuracy >= 98 ? 'var(--color-success-200)' : 'var(--color-warning-200)'}`,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Akurasi Stok</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 700, color: opnameAccuracy >= 98 ? 'var(--color-success-600)' : 'var(--color-warning-600)' }}>
                  {opnameAccuracy.toFixed(1)}%
                </div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                  Target ≥ 98% — {opnameAccuracy >= 98 ? '✅ Tercapai' : '⚠️ Perlu Pengecekan'}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: 'var(--space-8)' }}>
            Belum ada data inventory untuk diverifikasi
          </div>
        )}
      </Card>
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Manajemen Inventori"
        description="Monitor stok real-time 5 kategori gudang, kartu stok mutasi, dan rekonsiliasi stock opname."
        breadcrumbs={[{ label: 'Operasional' }, { label: 'Inventori' }]}
      />

      <Tabs
        tabs={[
          { id: 'realtime', label: '📊 Stok Real-time', content: tabContent },
          { id: 'ledger', label: '📋 Kartu Stok / Ledger', content: movementContent },
          { id: 'opname', label: '🔍 Stock Opname', content: opnameContent },
        ]}
      />
    </div>
  );
}
