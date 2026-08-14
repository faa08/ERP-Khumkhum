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

interface Entity {
  id: string;
  name: string;
  criteria: string;
  isActive: boolean;
}

const MOCK_DATA: Entity[] = [
  { id: '1', name: 'Sample Name 1', criteria: 'Sample Criteria 1', isActive: true },
  { id: '2', name: 'Sample Name 2', criteria: 'Sample Criteria 2', isActive: true },
];

export default function SortingstandardsPage() {
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

  const handleToggleStatus = (item: Entity) => {
    const isActivating = !item.isActive;
    setConfirmDialog({
      isOpen: true,
      title: isActivating ? 'Activate Sorting Standard' : 'Deactivate Sorting Standard',
      description: `Are you sure you want to ${isActivating ? 'activate' : 'deactivate'} ${item.name}?`,
      variant: isActivating ? 'primary' : 'danger',
      onConfirm: async () => {
        setData(data.map(d => d.id === item.id ? { ...d, isActive: isActivating } : d));
        toast.success(`Sorting Standard ${isActivating ? 'activated' : 'deactivated'}`);
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const columns = useMemo<ColumnDef<Entity>[]>(() => [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'criteria', header: 'Criteria' },
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
        title="Data Induk Standar Sortasi"
        description="Manage sorting standards and criteria."
        breadcrumbs={[{ label: 'Master Data' }, { label: 'Sorting Standards' }]}
        actions={<Button variant="primary" onClick={handleCreate} leftIcon={<Plus size={16} />}>Create Sorting Standard</Button>}
      />
      <DataTable columns={columns} data={data}  />

      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedItem ? 'Edit Sorting Standard' : 'Create Sorting Standard'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => { setDrawerOpen(false); toast.success('Saved successfully'); }}>Save</Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <FormField label="Name" required><Input defaultValue={selectedItem?.name || ''} /></FormField>
          <FormField label="Criteria" required><Input defaultValue={selectedItem?.criteria || ''} /></FormField>
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
