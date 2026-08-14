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
import { Plus, MoreVertical, Edit2, Ban, CheckCircle, Eye, ClipboardList } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';

interface Entity {
  id: string;
  batchNumber: string;
  farmerId: string;
  materialId: string;
  grossWeight: string;
  netWeight: string;
  moisture: string;
  status: string;
}

const MOCK_DATA: Entity[] = [
  { id: '1', batchNumber: 'Sample Batch Number 1', farmerId: 'Sample Farmer / Supplier 1', materialId: 'Sample Material 1', grossWeight: 'Sample Gross Wt (kg) 1', netWeight: 'Sample Net Wt (kg) 1', moisture: 'Sample Moisture % 1', status: 'in_progress' },
  { id: '2', batchNumber: 'Sample Batch Number 2', farmerId: 'Sample Farmer / Supplier 2', materialId: 'Sample Material 2', grossWeight: 'Sample Gross Wt (kg) 2', netWeight: 'Sample Net Wt (kg) 2', moisture: 'Sample Moisture % 2', status: 'completed' },
];

export default function ReceivingPage() {
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
      title: 'Batalkan Receiving Batch',
      description: `Are you sure you want to cancel this record?`,
      variant: 'danger',
      onConfirm: async () => {
        setData(data.map(d => d.id === item.id ? { ...d, status: 'cancelled' } : d));
        toast.success('Receiving Batch cancelled');
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const columns = useMemo<ColumnDef<Entity>[]>(() => [
    { accessorKey: 'batchNumber', header: 'Batch Number' },
    { accessorKey: 'farmerId', header: 'Farmer / Supplier' },
    { accessorKey: 'materialId', header: 'Material' },
    { accessorKey: 'grossWeight', header: 'Gross Wt (kg)' },
    { accessorKey: 'netWeight', header: 'Net Wt (kg)' },
    { accessorKey: 'moisture', header: 'Moisture %' },
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
        title="Penerimaan Bahan Baku"
        description="Manage incoming raw materials from farmers and suppliers."
        breadcrumbs={[{ label: 'Operasional' }, { label: 'Raw Material Receiving' }]}
        actions={<Button variant="primary" onClick={handleCreate} leftIcon={<Plus size={16} />}>Create Receiving Batch</Button>}
      />
      
      <DataTable columns={columns} data={data} />

      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedItem ? 'Edit Receiving Batch' : 'Buat Receiving Batch'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDrawerOpen(false)}>Tutup</Button>
            <Button variant="primary" onClick={() => { setDrawerOpen(false); toast.success('Berhasil disimpan'); }}>Simpan</Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <FormField label="Batch Number" required><Input defaultValue={selectedItem?.batchNumber || ''} /></FormField>
          <FormField label="Farmer / Supplier" required><Input defaultValue={selectedItem?.farmerId || ''} /></FormField>
          <FormField label="Material" required><Input defaultValue={selectedItem?.materialId || ''} /></FormField>
          <FormField label="Gross Wt (kg)" required><Input defaultValue={selectedItem?.grossWeight || ''} /></FormField>
          <FormField label="Net Wt (kg)" required><Input defaultValue={selectedItem?.netWeight || ''} /></FormField>
          <FormField label="Moisture %" required><Input defaultValue={selectedItem?.moisture || ''} /></FormField>
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
