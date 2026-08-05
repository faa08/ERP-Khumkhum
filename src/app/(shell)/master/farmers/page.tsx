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
import { Plus, MoreVertical, Edit2, Ban, CheckCircle, Eye } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';

interface Farmer {
  id: string;
  code: string;
  name: string;
  location: string;
  phone: string;
  isActive: boolean;
}

const MOCK_DATA: Farmer[] = [
  { id: '1', code: 'F-001', name: 'Petani Jamur Makmur', location: 'Bandung', phone: '08123456789', isActive: true },
  { id: '2', code: 'F-002', name: 'Koperasi Lestari', location: 'Lembang', phone: '08987654321', isActive: true },
];

export default function FarmersPage() {
  const [data, setData] = useState<Farmer[]>(MOCK_DATA);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Farmer | null>(null);
  
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    variant: 'danger' | 'primary';
  }>({ isOpen: false, title: '', description: '', onConfirm: () => {}, variant: 'primary' });

  const toast = useToast();

  const handleCreate = () => { setSelectedItem(null); setDrawerOpen(true); };
  const handleEdit = (item: Farmer) => { setSelectedItem(item); setDrawerOpen(true); };

  const handleToggleStatus = (item: Farmer) => {
    const isActivating = !item.isActive;
    setConfirmDialog({
      isOpen: true,
      title: isActivating ? 'Activate Farmer' : 'Deactivate Farmer',
      description: `Are you sure you want to ${isActivating ? 'activate' : 'deactivate'} ${item.name}?`,
      variant: isActivating ? 'primary' : 'danger',
      onConfirm: async () => {
        setData(data.map(d => d.id === item.id ? { ...d, isActive: isActivating } : d));
        toast.success(`Farmer ${isActivating ? 'activated' : 'deactivated'}`);
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const columns = useMemo<ColumnDef<Farmer>[]>(() => [
    { accessorKey: 'code', header: 'Code' },
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'location', header: 'Location' },
    { accessorKey: 'phone', header: 'Phone' },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => (
        <StatusBadge status={row.original.isActive ? 'active' : 'inactive'} label={row.original.isActive ? 'Active' : 'Inactive'} />
      )
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
              id: 'toggle', 
              label: row.original.isActive ? 'Deactivate' : 'Activate', 
              icon: row.original.isActive ? <Ban size={14} /> : <CheckCircle size={14} />,
              danger: row.original.isActive,
              onClick: () => handleToggleStatus(row.original)
            },
          ]}
        />
      )
    }
  ], [data]);

  return (
    <div>
      <PageHeader
        title="Farmers Master Data"
        description="Manage farmer partners and suppliers."
        breadcrumbs={[{ label: 'Master Data' }, { label: 'Farmers' }]}
        actions={<Button variant="primary" onClick={handleCreate} leftIcon={<Plus size={16} />}>Create Farmer</Button>}
      />
      <DataTable columns={columns} data={data}  />

      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedItem ? 'Edit Farmer' : 'Create Farmer'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => { setDrawerOpen(false); toast.success('Saved successfully'); }}>Save</Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <FormField label="Code" required><Input defaultValue={selectedItem?.code || ''} /></FormField>
          <FormField label="Name" required><Input defaultValue={selectedItem?.name || ''} /></FormField>
          <FormField label="Location"><Input defaultValue={selectedItem?.location || ''} /></FormField>
          <FormField label="Phone"><Input defaultValue={selectedItem?.phone || ''} /></FormField>
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
