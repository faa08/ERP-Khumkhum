'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
import { Plus, MoreVertical, Edit2, Ban, CheckCircle, Eye, Trash2 } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { getFarmers, createFarmer, updateFarmer, deleteFarmer } from '@/actions/master';
import type { DbFarmer } from '@/types/database';

export default function FarmersPage() {
  const [data, setData] = useState<DbFarmer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DbFarmer | null>(null);
  
  const [form, setForm] = useState({ name: '', phone_number: '', contact: '', address: '' });
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
    const res = await getFarmers();
    if (res.success && res.data) {
      setData(res.data);
    } else {
      toast.error(res.error || 'Failed to load farmers');
    }
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = () => {
    setSelectedItem(null);
    setForm({ name: '', phone_number: '', contact: '', address: '' });
    setDrawerOpen(true);
  };

  const handleEdit = (item: DbFarmer) => {
    setSelectedItem(item);
    setForm({
      name: item.name || '',
      phone_number: item.phone_number || '',
      contact: item.contact || '',
      address: item.address || ''
    });
    setDrawerOpen(true);
  };

  const handleSave = async () => {
    if (!form.name) {
      toast.error('Name is required');
      return;
    }
    setIsSaving(true);
    
    if (selectedItem) {
      const res = await updateFarmer(selectedItem.id, form);
      if (res.success) {
        toast.success('Farmer updated successfully');
        setDrawerOpen(false);
        loadData();
      } else {
        toast.error(res.error || 'Failed to update farmer');
      }
    } else {
      const res = await createFarmer(form);
      if (res.success) {
        toast.success('Farmer created successfully');
        setDrawerOpen(false);
        loadData();
      } else {
        toast.error(res.error || 'Failed to create farmer');
      }
    }
    setIsSaving(false);
  };

  const handleDelete = (item: DbFarmer) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Farmer',
      description: `Are you sure you want to delete ${item.name}? This action cannot be undone.`,
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        const res = await deleteFarmer(item.id);
        if (res.success) {
          toast.success('Farmer deleted successfully');
          loadData();
        } else {
          toast.error(res.error || 'Failed to delete farmer');
        }
      }
    });
  };

  const columns = useMemo<ColumnDef<DbFarmer>[]>(() => [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'contact', header: 'Contact Person' },
    { accessorKey: 'phone_number', header: 'Phone' },
    { accessorKey: 'address', header: 'Address' },
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
        title="Data Induk Petani"
        description="Manage farmer partners and suppliers."
        breadcrumbs={[{ label: 'Data Induk' }, { label: 'Farmers' }]}
        actions={<Button variant="primary" onClick={handleCreate} leftIcon={<Plus size={16} />}>Create Farmer</Button>}
      />
      <DataTable columns={columns} data={data} />

      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedItem ? 'Edit Farmer' : 'Buat Farmer'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} loading={isSaving}>Simpan</Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <FormField label="Name" required>
            <Input 
              value={form.name} 
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} 
              placeholder="Nama Petani/Kelompok Tani" 
            />
          </FormField>
          <FormField label="Contact Person">
            <Input 
              value={form.contact} 
              onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} 
              placeholder="Nama Penanggung Jawab" 
            />
          </FormField>
          <FormField label="Phone Number">
            <Input 
              value={form.phone_number} 
              onChange={e => setForm(f => ({ ...f, phone_number: e.target.value }))} 
              placeholder="e.g. 08123456789" 
            />
          </FormField>
          <FormField label="Address">
            <Input 
              value={form.address} 
              onChange={e => setForm(f => ({ ...f, address: e.target.value }))} 
              placeholder="Alamat lengkap" 
            />
          </FormField>
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
