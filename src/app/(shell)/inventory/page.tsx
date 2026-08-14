'use client';

import React, { useState, useMemo } from 'react';
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
import { Plus, MoreVertical, Edit2, Ban, CheckCircle, Eye, Package } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';

interface Entity {
  id: string;
  itemCode: string;
  itemName: string;
  warehouse: string;
  batchNumber: string;
  currentStock: string;
  status: string;
}

const MOCK_DATA: Entity[] = [
  { id: '1', itemCode: 'Sample Item Code 1', itemName: 'Sample Item Name 1', warehouse: 'Sample Warehouse 1', batchNumber: 'Sample Batch Tracking 1', currentStock: 'Sample Current Stock 1', status: 'in_progress' },
  { id: '2', itemCode: 'Sample Item Code 2', itemName: 'Sample Item Name 2', warehouse: 'Sample Warehouse 2', batchNumber: 'Sample Batch Tracking 2', currentStock: 'Sample Current Stock 2', status: 'completed' },
];

export default function InventoryPage() {
  const [data, setData] = useState<Entity[]>(MOCK_DATA);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Entity | null>(null);
  
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    variant: 'danger' | 'primary';
  }>({ isOpen: false, title: '', description: '', onConfirm: () => {}, variant: 'primary' });

  const toast = useToast();

  const handleCreate = () => { setSelectedItem(null); setDrawerOpen(true); };
  const handleEdit = (item: Entity) => { setSelectedItem(item); setDrawerOpen(true); };

  const handleCancel = (item: Entity) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Batalkan Stock Adjustment',
      description: `Are you sure you want to cancel this record?`,
      variant: 'danger',
      onConfirm: async () => {
        setData(data.map(d => d.id === item.id ? { ...d, status: 'cancelled' } : d));
        toast.success('Stock Adjustment cancelled');
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const columns = useMemo<ColumnDef<Entity>[]>(() => [
    { accessorKey: 'itemCode', header: 'Item Code' },
    { accessorKey: 'itemName', header: 'Item Name' },
    { accessorKey: 'warehouse', header: 'Warehouse' },
    { accessorKey: 'batchNumber', header: 'Batch Tracking' },
    { accessorKey: 'currentStock', header: 'Current Stock' },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <Dropdown
          trigger={<Button variant="ghost" size="sm" style={{ padding: '0 8px' }}><MoreVertical size={16} /></Button>}
          items={[
            { id: 'view', label: 'Lihat Detail', icon: <Eye size={14} /> },
            { id: 'edit', label: 'Edit', icon: <Edit2 size={14} />, onClick: () => handleEdit(row.original) },
            { divider: true, id: 'div1', label: '' },
            { 
              id: 'cancel', 
              label: 'Batalkan Rekam Jejak', 
              icon: <Ban size={14} />,
              danger: true,
              onClick: () => handleCancel(row.original)
            },
          ]}
        />
      )
    }
  ], [data]);

  return (
    <div>
      <PageHeader
        title="Ringkasan Inventaris"
        description="Monitor stock levels, movements, and perform adjustments."
        breadcrumbs={[{ label: 'Operasional' }, { label: 'Inventory Overview' }]}
        actions={<Button variant="primary" onClick={handleCreate} leftIcon={<Plus size={16} />}>Create Stock Adjustment</Button>}
      />
      
      <DataTable columns={columns} data={data} />

      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedItem ? 'Edit Stock Adjustment' : 'Buat Stock Adjustment'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDrawerOpen(false)}>Tutup</Button>
            <Button variant="primary" onClick={() => { setDrawerOpen(false); toast.success('Berhasil disimpan'); }}>Simpan</Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <FormField label="Item Code" required><Input defaultValue={selectedItem?.itemCode || ''} /></FormField>
          <FormField label="Item Name" required><Input defaultValue={selectedItem?.itemName || ''} /></FormField>
          <FormField label="Warehouse" required><Input defaultValue={selectedItem?.warehouse || ''} /></FormField>
          <FormField label="Batch Tracking" required><Input defaultValue={selectedItem?.batchNumber || ''} /></FormField>
          <FormField label="Current Stock" required><Input defaultValue={selectedItem?.currentStock || ''} /></FormField>
        </div>
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
