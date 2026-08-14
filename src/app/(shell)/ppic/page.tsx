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
import { Plus, MoreVertical, Edit2, Ban, CheckCircle, Eye, CalendarDays } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';

interface Entity {
  id: string;
  planId: string;
  product: string;
  requiredDate: string;
  targetQty: string;
  materialAvail: string;
  status: string;
}

const MOCK_DATA: Entity[] = [
  { id: '1', planId: 'Sample Plan ID 1', product: 'Sample Product 1', requiredDate: 'Sample Required Date 1', targetQty: 'Sample Target Qty 1', materialAvail: 'Sample Material Availability 1', status: 'in_progress' },
  { id: '2', planId: 'Sample Plan ID 2', product: 'Sample Product 2', requiredDate: 'Sample Required Date 2', targetQty: 'Sample Target Qty 2', materialAvail: 'Sample Material Availability 2', status: 'completed' },
];

export default function PpicPage() {
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
      title: 'Batalkan Production Plan',
      description: `Are you sure you want to cancel this record?`,
      variant: 'danger',
      onConfirm: async () => {
        setData(data.map(d => d.id === item.id ? { ...d, status: 'cancelled' } : d));
        toast.success('Production Plan cancelled');
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const columns = useMemo<ColumnDef<Entity>[]>(() => [
    { accessorKey: 'planId', header: 'Plan ID' },
    { accessorKey: 'product', header: 'Product' },
    { accessorKey: 'requiredDate', header: 'Required Date' },
    { accessorKey: 'targetQty', header: 'Target Qty' },
    { accessorKey: 'materialAvail', header: 'Material Availability' },
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
        title="Perencanaan Produksi"
        description="Manage production schedules and material requirements."
        breadcrumbs={[{ label: 'Operasional' }, { label: 'Production Planning' }]}
        actions={<Button variant="primary" onClick={handleCreate} leftIcon={<Plus size={16} />}>Create Production Plan</Button>}
      />
      
      <DataTable columns={columns} data={data} />

      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedItem ? 'Edit Production Plan' : 'Buat Production Plan'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDrawerOpen(false)}>Tutup</Button>
            <Button variant="primary" onClick={() => { setDrawerOpen(false); toast.success('Berhasil disimpan'); }}>Simpan</Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <FormField label="Plan ID" required><Input defaultValue={selectedItem?.planId || ''} /></FormField>
          <FormField label="Product" required><Input defaultValue={selectedItem?.product || ''} /></FormField>
          <FormField label="Required Date" required><Input defaultValue={selectedItem?.requiredDate || ''} /></FormField>
          <FormField label="Target Qty" required><Input defaultValue={selectedItem?.targetQty || ''} /></FormField>
          <FormField label="Material Availability" required><Input defaultValue={selectedItem?.materialAvail || ''} /></FormField>
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
