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
import { Plus, MoreVertical, Edit2, Ban, CheckCircle, Eye, ShoppingCart } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';

interface Entity {
  id: string;
  orderNo: string;
  customer: string;
  product: string;
  quantity: string;
  deliveryStatus: string;
  status: string;
}

const MOCK_DATA: Entity[] = [
  { id: '1', orderNo: 'Sample Order No 1', customer: 'Sample Customer 1', product: 'Sample Product 1', quantity: 'Sample Quantity 1', deliveryStatus: 'Sample Delivery Status 1', status: 'in_progress' },
  { id: '2', orderNo: 'Sample Order No 2', customer: 'Sample Customer 2', product: 'Sample Product 2', quantity: 'Sample Quantity 2', deliveryStatus: 'Sample Delivery Status 2', status: 'completed' },
];

export default function SalesPage() {
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
      title: 'Batalkan Sales Order',
      description: `Are you sure you want to cancel this record?`,
      variant: 'danger',
      onConfirm: async () => {
        setData(data.map(d => d.id === item.id ? { ...d, status: 'cancelled' } : d));
        toast.success('Sales Order cancelled');
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const columns = useMemo<ColumnDef<Entity>[]>(() => [
    { accessorKey: 'orderNo', header: 'Order No' },
    { accessorKey: 'customer', header: 'Customer' },
    { accessorKey: 'product', header: 'Product' },
    { accessorKey: 'quantity', header: 'Quantity' },
    { accessorKey: 'deliveryStatus', header: 'Delivery Status' },
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
        title="Pesanan Penjualan"
        description="Manage customer orders and delivery statuses."
        breadcrumbs={[{ label: 'Operasional' }, { label: 'Sales Orders' }]}
        actions={<Button variant="primary" onClick={handleCreate} leftIcon={<Plus size={16} />}>Create Sales Order</Button>}
      />
      
      <DataTable columns={columns} data={data} />

      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedItem ? 'Edit Sales Order' : 'Buat Sales Order'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDrawerOpen(false)}>Tutup</Button>
            <Button variant="primary" onClick={() => { setDrawerOpen(false); toast.success('Berhasil disimpan'); }}>Simpan</Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <FormField label="Order No" required><Input defaultValue={selectedItem?.orderNo || ''} /></FormField>
          <FormField label="Customer" required><Input defaultValue={selectedItem?.customer || ''} /></FormField>
          <FormField label="Product" required><Input defaultValue={selectedItem?.product || ''} /></FormField>
          <FormField label="Quantity" required><Input defaultValue={selectedItem?.quantity || ''} /></FormField>
          <FormField label="Delivery Status" required><Input defaultValue={selectedItem?.deliveryStatus || ''} /></FormField>
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
