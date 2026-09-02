'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/data-table/DataTable';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/form/FormField';
import { useToast } from '@/hooks/useToast';
import { Package, AlertTriangle, TrendingDown, Plus, Save, BarChart3, ClipboardList, Search, CheckCircle2, Sprout } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { getInventorySummary, getStockMovements, receiveNonMushroomItem, saveStockOpname, getLossReport } from '@/actions/inventory';
import { getRawMaterials } from '@/actions/master';
import { usePathname } from 'next/navigation';
import type { DbInventory, DbStockMovement, DbRawMaterial } from '@/types/database';

const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; rop: number }> = {
  RAW_MATERIAL: { label: 'Bahan Baku Jamur', icon: <Sprout className="w-6 h-6 text-currentColor" aria-hidden="true" />, color: 'var(--color-success-600)', rop: 50 },
  PRODUCT: { label: 'Produk Jadi', icon: <Package className="w-6 h-6 text-currentColor" aria-hidden="true" />, color: 'var(--color-primary-600)', rop: 100 },
};

export default function InventoryPage() {
  const pathname = usePathname();
  const isWarehouseMode = pathname.includes('/warehouse');

  const [inventoryData, setInventoryData] = useState<DbInventory[]>([]);
  const [movements, setMovements] = useState<DbStockMovement[]>([]);
  const [lossData, setLossData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [physicalInputs, setPhysicalInputs] = useState<Record<string, string>>({});
  const [isSavingOpname, setIsSavingOpname] = useState(false);

  const [inboundDrawerOpen, setInboundDrawerOpen] = useState(false);
  const [inboundForm, setInboundForm] = useState({ item_name: '', uom: 'kg', quantity: 0, notes: '' });
  const [isSavingInbound, setIsSavingInbound] = useState(false);
  const [masterRawMaterials, setMasterRawMaterials] = useState<DbRawMaterial[]>([]);

  const toast = useToast();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const [invRes, mvRes, lossRes, rmRes] = await Promise.all([
      getInventorySummary(),
      getStockMovements(),
      getLossReport(),
      getRawMaterials()
    ]);
    
    let filteredInv: DbInventory[] = [];
    if (invRes.success && invRes.data) {
      filteredInv = invRes.data.filter(i => isWarehouseMode ? i.item_type === 'RAW_MATERIAL' : i.item_type === 'PRODUCT');
      setInventoryData(filteredInv);
    }
    
    if (mvRes.success && mvRes.data) {
      const invIds = new Set(filteredInv.map(i => i.id));
      const filteredMv = mvRes.data.filter(m => invIds.has(m.inventory_id));
      setMovements(filteredMv);
    }
    
    if (lossRes.success && lossRes.data) setLossData(lossRes.data);
    if (rmRes.success && rmRes.data) setMasterRawMaterials(rmRes.data);
    
    setIsLoading(false);
  }, [isWarehouseMode]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSaveOpname = async () => {
    setIsSavingOpname(true);
    const itemsToSave = inventoryData.map(inv => {
      const phys = physicalInputs[inv.id];
      if (phys === undefined || phys === '') return null;
      const physical_qty = parseFloat(phys);
      if (isNaN(physical_qty)) return null;
      return {
        inventory_id: inv.id,
        item_name: inv.item_name || 'Item',
        system_qty: inv.quantity,
        physical_qty,
        difference: physical_qty - inv.quantity,
      };
    }).filter(Boolean) as any[];

    if (itemsToSave.length === 0) {
      toast.error('Tidak ada data opname yang diisi');
      setIsSavingOpname(false);
      return;
    }

    const res = await saveStockOpname(itemsToSave);
    if (res.success) {
      toast.success('Hasil stock opname berhasil disimpan dan stok disesuaikan');
      setPhysicalInputs({});
      loadData();
    } else {
      toast.error(res.error || 'Gagal menyimpan stock opname');
    }
    setIsSavingOpname(false);
  };

  const handleSaveInbound = async () => {
    if (!inboundForm.item_name || inboundForm.quantity <= 0) {
      toast.error('Masukkan nama item dan jumlah yang valid');
      return;
    }
    setIsSavingInbound(true);
    const res = await receiveNonMushroomItem(inboundForm);
    if (res.success) {
      toast.success('Penerimaan barang berhasil');
      setInboundDrawerOpen(false);
      setInboundForm({ item_name: '', uom: 'kg', quantity: 0, notes: '' });
      loadData();
    } else {
      toast.error(res.error || 'Gagal menerima barang');
    }
    setIsSavingInbound(false);
  };

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

  const movementsWithBalance = useMemo(() => {
    const sortedDesc = [...movements].sort((a, b) => new Date(b.movement_date).getTime() - new Date(a.movement_date).getTime());
    
    const movementsByInv = new Map<string, any[]>();
    sortedDesc.forEach(m => {
      if (!movementsByInv.has(m.inventory_id)) movementsByInv.set(m.inventory_id, []);
      movementsByInv.get(m.inventory_id)!.push(m);
    });

    const result: any[] = [];
    
    for (const inv of inventoryData) {
      const invMovements = movementsByInv.get(inv.id) || [];
      let currentBalance = inv.quantity;
      
      for (const m of invMovements) {
        result.push({ ...m, item_name: inv.item_name, balance: currentBalance });
        
        if (m.movement_type === 'IN') {
          currentBalance -= m.quantity;
        } else if (m.movement_type === 'OUT') {
          currentBalance += m.quantity;
        } else if (m.movement_type === 'ADJUSTMENT') {
          currentBalance -= m.quantity;
        } else if (m.movement_type === 'TRANSFER') {
          currentBalance -= m.quantity;
        }
      }
    }
    
    return result.sort((a, b) => new Date(b.movement_date).getTime() - new Date(a.movement_date).getTime());
  }, [movements, inventoryData]);

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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 600, color: low ? 'var(--color-danger-600)' : 'var(--text-primary)' }}>
              {row.original.quantity.toLocaleString('id-ID')} kg
            </span>
            {low && (
              <div style={{ 
                background: 'var(--color-danger-100)', 
                color: 'var(--color-danger-700)', 
                padding: '2px 6px', 
                borderRadius: '4px', 
                fontSize: '0.7rem', 
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}>
                <AlertTriangle size={12} /> Need Reorder
              </div>
            )}
          </div>
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

  const mvColumns = useMemo<ColumnDef<any>[]>(() => [
    { id: 'date', header: 'Tanggal', cell: ({ row }) => format(new Date(row.original.movement_date), 'dd/MM/yyyy HH:mm') },
    { accessorKey: 'item_name', header: 'Item' },
    { accessorKey: 'notes', header: 'Referensi / Keterangan', cell: ({ row }) => row.original.notes || '-' },
    { id: 'in', header: 'In', cell: ({ row }) => {
      const isPositive = row.original.quantity > 0 || row.original.movement_type === 'IN'; 
      const qty = Math.abs(row.original.quantity);
      return <strong style={{ color: 'var(--color-success-600)' }}>{isPositive && qty > 0 ? `+${qty.toLocaleString('id-ID')} kg` : '-'}</strong>;
    }},
    { id: 'out', header: 'Out', cell: ({ row }) => {
      const isNegative = row.original.quantity < 0 || row.original.movement_type === 'OUT';
      const qty = Math.abs(row.original.quantity);
      return <strong style={{ color: 'var(--color-danger-600)' }}>{isNegative && qty > 0 ? `-${qty.toLocaleString('id-ID')} kg` : '-'}</strong>;
    }},
    { id: 'balance', header: 'Saldo (kg)', cell: ({ row }) => <strong>{row.original.balance.toLocaleString('id-ID')} kg</strong> },
  ], []);

  const lossColumns = useMemo<ColumnDef<any>[]>(() => [
    { id: 'date', header: 'Tanggal Opname', cell: ({ row }) => format(new Date(row.original.created_at), 'dd/MM/yyyy HH:mm') },
    { accessorKey: 'item_name', header: 'Item' },
    { id: 'warehouse', header: 'Gudang', cell: ({ row }) => row.original.inventory?.warehouse?.name || '-' },
    { accessorKey: 'system_quantity', header: 'Stok Sistem' },
    { accessorKey: 'physical_quantity', header: 'Stok Fisik' },
    { accessorKey: 'difference', header: 'Selisih Minus', cell: ({ row }) => <strong style={{ color: 'var(--color-danger-600)' }}>{row.original.difference} kg</strong> },
    { accessorKey: 'notes', header: 'Catatan', cell: ({ row }) => row.original.notes || '-' },
  ], []);

  const tabContent = (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        {Array.from(categoryTotals.entries()).map(([type, stat]) => {
          const cfg = CATEGORY_CONFIG[type] || { label: type, icon: <Package className="w-6 h-6 text-currentColor" aria-hidden="true" />, color: 'var(--text-primary)', rop: 0 };
          return (
            <Card key={type}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                <div style={{ padding: '8px', borderRadius: '8px', background: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {cfg.icon}
                </div>
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
      </div>

      <DataTable columns={invColumns} data={inventoryData} />

      <Modal
        isOpen={inboundDrawerOpen}
        onClose={() => setInboundDrawerOpen(false)}
        title="Input Pemasukan Barang (Non-Jamur)"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setInboundDrawerOpen(false)}>Batal</Button>
            <Button variant="primary" onClick={handleSaveInbound} loading={isSavingInbound}>Simpan</Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <FormField label="Nama Barang" required>
            <Select
              value={inboundForm.item_name}
              onChange={e => {
                const val = e.target.value;
                const selected = masterRawMaterials.find(rm => rm.name === val);
                setInboundForm(f => ({ 
                  ...f, 
                  item_name: val,
                  uom: selected ? selected.uom : f.uom 
                }));
              }}
              options={[
                { value: '', label: 'Pilih Bahan Baku dari Master Data...' },
                ...masterRawMaterials.map(rm => ({ value: rm.name, label: rm.name }))
              ]}
            />
          </FormField>
          <FormField label="Satuan (UOM)" required>
            <Input
              value={inboundForm.uom}
              onChange={e => setInboundForm(f => ({ ...f, uom: e.target.value }))}
              placeholder="e.g. kg, liter, pcs"
              disabled
            />
          </FormField>
          <FormField label="Jumlah (kg/pcs)" required>
            <Input 
              type="number"
              value={inboundForm.quantity.toString()} 
              onChange={e => setInboundForm(f => ({ ...f, quantity: parseFloat(e.target.value) || 0 }))} 
            />
          </FormField>
          <FormField label="Referensi / Catatan">
            <Input 
              value={inboundForm.notes} 
              onChange={e => setInboundForm(f => ({ ...f, notes: e.target.value }))} 
              placeholder="e.g. Nota Supplier ABC" 
            />
          </FormField>
        </div>
      </Modal>
    </>
  );

  const movementContent = (
    <div style={{ marginTop: 'var(--space-4)' }}>
      <DataTable columns={mvColumns} data={movementsWithBalance} />
    </div>
  );

  const opnameContent = (
    <div style={{ marginTop: 'var(--space-4)' }}>
      <Card header={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong>Stock Opname — Input Stok Fisik</strong>
          <Button variant="primary" onClick={handleSaveOpname} loading={isSavingOpname} leftIcon={<Save size={16} />}>
            Simpan Hasil Opname
          </Button>
        </div>
      }>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-4)' }}>
          Masukkan hasil hitung fisik untuk setiap item di gudang. Sistem akan menghitung akurasi stok secara otomatis dan memperbarui stok.
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
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <span>Target ≥ 98% — </span>
                  {opnameAccuracy >= 98 ? (
                    <span style={{ color: 'var(--color-success-600)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 className="w-4 h-4 text-currentColor" aria-hidden="true" />
                      <span>Tercapai</span>
                    </span>
                  ) : (
                    <span style={{ color: 'var(--color-warning-600)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <AlertTriangle className="w-4 h-4 text-currentColor" aria-hidden="true" />
                      <span>Perlu Pengecekan</span>
                    </span>
                  )}
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

  const lossContent = (
    <div style={{ marginTop: 'var(--space-4)' }}>
      <Card header={<strong>Laporan Rekap Kerugian</strong>}>
        <DataTable columns={lossColumns} data={lossData} />
      </Card>
    </div>
  );

  return (
    <div>
      <PageHeader 
        title={isWarehouseMode ? "Warehouse (Bahan Baku)" : "Inventaris (Produk Jadi)"}
        description={isWarehouseMode ? "Monitor stok bahan baku, kartu stok mutasi, dan stock opname gudang material." : "Monitor stok produk siap jual, kartu stok mutasi, dan stock opname."}
        breadcrumbs={[{ label: 'Operasional' }, { label: isWarehouseMode ? 'Warehouse' : 'Inventaris' }]}
        actions={
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Button leftIcon={<Plus className="w-4 h-4 text-currentColor" aria-hidden="true" />} onClick={() => setInboundDrawerOpen(true)}>
              {isWarehouseMode ? "Penerimaan Barang Non-Jamur" : "Penerimaan Produk Jadi"}
            </Button>
            <Button variant="secondary" onClick={loadData}>Refresh Data</Button>
          </div>
        }
      />

      <Tabs
        tabs={[
          { id: 'realtime', label: <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><BarChart3 className="w-4 h-4 text-currentColor" aria-hidden="true" /> Stok Real-time</span>, content: tabContent },
          { id: 'ledger', label: <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><ClipboardList className="w-4 h-4 text-currentColor" aria-hidden="true" /> Kartu Stok (Rekening Koran)</span>, content: movementContent },
          { id: 'opname', label: <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Search className="w-4 h-4 text-currentColor" aria-hidden="true" /> Stock Opname</span>, content: opnameContent },
          { id: 'loss', label: <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><TrendingDown className="w-4 h-4 text-currentColor" aria-hidden="true" /> Laporan Kerugian</span>, content: lossContent },
        ]}
      />
    </div>
  );
}
