'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/data-table/DataTable';
import { Button } from '@/components/ui/Button';
import { Dropdown } from '@/components/ui/Dropdown';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/form/FormField';
import { useToast } from '@/hooks/useToast';
import { Plus, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { getWarehouses, createWarehouse, updateWarehouse, deleteWarehouse } from '@/actions/master';
import type { DbWarehouse } from '@/types/database';

export default function WarehousesPage() {
  const [data, setData] = useState<DbWarehouse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DbWarehouse | null>(null);
  
  const [form, setForm] = useState({ name: '', location: '' });
  const [isSaving, setIsSaving] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    variant: 'danger' | 'primary';
  }>({ isOpen: false, title: '', description: '', onConfirm: () => {}, variant: 'primary' });

  const toast = useToast();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const res = await getWarehouses();
    if (res.success && res.data) {
      setData(res.data);
    } else {
      toast.error(res.error || 'Failed to load warehouses');
    }
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = () => {
    setSelectedItem(null);
    setForm({ name: '', location: '' });
    setModalOpen(true);
  };

  const handleEdit = (item: DbWarehouse) => {
    setSelectedItem(item);
    setForm({
      name: item.name || '',
      location: item.location || ''
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.location) {
      toast.error('Name and Location are required');
      return;
    }
    setIsSaving(true);
    
    if (selectedItem) {
      const res = await updateWarehouse(selectedItem.id, form);
      if (res.success) {
        toast.success('Warehouse updated successfully');
        setModalOpen(false);
        loadData();
      } else {
        toast.error(res.error || 'Failed to update warehouse');
      }
    } else {
      const res = await createWarehouse(form);
      if (res.success) {
        toast.success('Warehouse created successfully');
        setModalOpen(false);
        loadData();
      } else {
        toast.error(res.error || 'Failed to create warehouse');
      }
    }
    setIsSaving(false);
  };

  const handleDelete = (item: DbWarehouse) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Warehouse',
      description: `Are you sure you want to delete ${item.name}?`,
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        const res = await deleteWarehouse(item.id);
        if (res.success) {
          toast.success('Warehouse deleted successfully');
          loadData();
        } else {
          toast.error(res.error || 'Failed to delete warehouse');
        }
      }
    });
  };

  const columns = useMemo<ColumnDef<DbWarehouse>[]>(() => [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'location', header: 'Location' },
    {
      id: 'actions',
      cell: ({ row }) => (
        <Dropdown
          trigger={<Button variant="ghost" size="sm" style={{ padding: '0 8px' }}><MoreVertical size={16} /></Button>}
          items={[
            { id: 'edit', label: 'Edit', icon: <Edit2 size={14} />, onClick: () => handleEdit(row.original) },
            { divider: true, id: 'div1', label: '' },
            { 
              id: 'delete', 
              label: 'Delete', 
              icon: <Trash2 size={14} />,
              danger: true,
              onClick: () => handleDelete(row.original)
            },
          ]}
        />
      )
    }
  ], []);

  return (
    <div>
      <PageHeader
        title="Data Induk Gudang"
        description="Manage warehouse locations."
        breadcrumbs={[{ label: 'Data Induk' }, { label: 'Warehouses' }]}
        actions={<Button variant="primary" onClick={handleCreate} leftIcon={<Plus size={16} />}>Create Warehouse</Button>}
      />
      <DataTable columns={columns} data={data} />

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selectedItem ? 'Edit Warehouse' : 'Buat Warehouse'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} loading={isSaving}>Simpan</Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <FormField label="Name" required>
            <Input 
              value={form.name} 
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} 
              placeholder="e.g. Gudang Bahan Baku A" 
            />
          </FormField>
          <FormField label="Location" required>
            <Input 
              value={form.location} 
              onChange={e => setForm(f => ({ ...f, location: e.target.value }))} 
              placeholder="e.g. Zona Utara" 
            />
          </FormField>
        </div>
      </Modal>

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
