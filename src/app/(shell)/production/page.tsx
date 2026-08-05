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
import { Plus, MoreVertical, Edit2, Ban, CheckCircle, Eye, Factory } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';

interface Entity {
  id: string;
  orderNo: string;
  product: string;
  materialConsumed: string;
  finishedGoods: string;
  wip: string;
  yield: string;
  status: string;
}

const MOCK_DATA: Entity[] = [
  { id: '1', orderNo: 'Sample Order No 1', product: 'Sample Product 1', materialConsumed: 'Sample Material Consumed (kg) 1', finishedGoods: 'Sample Finished Goods (kg) 1', wip: 'Sample WIP (kg) 1', yield: 'Sample Yield % 1', status: 'in_progress' },
  { id: '2', orderNo: 'Sample Order No 2', product: 'Sample Product 2', materialConsumed: 'Sample Material Consumed (kg) 2', finishedGoods: 'Sample Finished Goods (kg) 2', wip: 'Sample WIP (kg) 2', yield: 'Sample Yield % 2', status: 'completed' },
];

export default function ProductionPage() {
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
      title: 'Cancel Production Order',
      description: `Are you sure you want to cancel this record?`,
      variant: 'danger',
      onConfirm: async () => {
        setData(data.map(d => d.id === item.id ? { ...d, status: 'cancelled' } : d));
        toast.success('Production Order cancelled');
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const columns = useMemo<ColumnDef<Entity>[]>(() => [
    { accessorKey: 'orderNo', header: 'Order No' },
    { accessorKey: 'product', header: 'Product' },
    { accessorKey: 'materialConsumed', header: 'Material Consumed (kg)' },
    { accessorKey: 'finishedGoods', header: 'Finished Goods (kg)' },
    { accessorKey: 'wip', header: 'WIP (kg)' },
    { accessorKey: 'yield', header: 'Yield %' },
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
            { id: 'view', label: 'View Details', icon: <Eye size={14} /> },
            { id: 'edit', label: 'Edit', icon: <Edit2 size={14} />, onClick: () => handleEdit(row.original) },
            { divider: true, id: 'div1', label: '' },
            { 
              id: 'cancel', 
              label: 'Cancel Record', 
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
        title="Production Orders"
        description="Manage production batches, WIP, and finished goods."
        breadcrumbs={[{ label: 'Operations' }, { label: 'Production Orders' }]}
        actions={<Button variant="primary" onClick={handleCreate} leftIcon={<Plus size={16} />}>Create Production Order</Button>}
      />
      
      <DataTable columns={columns} data={data} />

      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedItem ? 'Edit Production Order' : 'Create Production Order'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDrawerOpen(false)}>Close</Button>
            <Button variant="primary" onClick={() => { setDrawerOpen(false); toast.success('Saved successfully'); }}>Save</Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <FormField label="Order No" required><Input defaultValue={selectedItem?.orderNo || ''} /></FormField>
          <FormField label="Product" required><Input defaultValue={selectedItem?.product || ''} /></FormField>
          <FormField label="Material Consumed (kg)" required><Input defaultValue={selectedItem?.materialConsumed || ''} /></FormField>
          <FormField label="Finished Goods (kg)" required><Input defaultValue={selectedItem?.finishedGoods || ''} /></FormField>
          <FormField label="WIP (kg)" required><Input defaultValue={selectedItem?.wip || ''} /></FormField>
          <FormField label="Yield %" required><Input defaultValue={selectedItem?.yield || ''} /></FormField>
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
