'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/data-table/DataTable';
import { Button } from '@/components/ui/Button';
import { Dropdown } from '@/components/ui/Dropdown';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Drawer } from '@/components/ui/Drawer';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/form/FormField';
import { useToast } from '@/hooks/useToast';
import { Plus, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { getCustomers, createCustomer, updateCustomer, deleteCustomer } from '@/actions/master';
import type { DbCustomer } from '@/types/database';

export default function CustomersPage() {
  const [data, setData] = useState<DbCustomer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DbCustomer | null>(null);
  
  const [form, setForm] = useState({ name: '', contact: '', address: '' });
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
    const res = await getCustomers();
    if (res.success && res.data) {
      setData(res.data);
    } else {
      toast.error(res.error || 'Failed to load customers');
    }
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = () => {
    setSelectedItem(null);
    setForm({ name: '', contact: '', address: '' });
    setDrawerOpen(true);
  };

  const handleEdit = (item: DbCustomer) => {
    setSelectedItem(item);
    setForm({
      name: item.name || '',
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
      const res = await updateCustomer(selectedItem.id, form);
      if (res.success) {
        toast.success('Customer updated successfully');
        setDrawerOpen(false);
        loadData();
      } else {
        toast.error(res.error || 'Failed to update customer');
      }
    } else {
      const res = await createCustomer(form);
      if (res.success) {
        toast.success('Customer created successfully');
        setDrawerOpen(false);
        loadData();
      } else {
        toast.error(res.error || 'Failed to create customer');
      }
    }
    setIsSaving(false);
  };

  const handleDelete = (item: DbCustomer) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Customer',
      description: `Are you sure you want to delete ${item.name}?`,
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        const res = await deleteCustomer(item.id);
        if (res.success) {
          toast.success('Customer deleted successfully');
          loadData();
        } else {
          toast.error(res.error || 'Failed to delete customer');
        }
      }
    });
  };

  const columns = useMemo<ColumnDef<DbCustomer>[]>(() => [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'contact', header: 'Contact Person' },
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
        title="Data Induk Pelanggan"
        description="Manage customer data."
        breadcrumbs={[{ label: 'Data Induk' }, { label: 'Customers' }]}
        actions={<Button variant="primary" onClick={handleCreate} leftIcon={<Plus size={16} />}>Create Customer</Button>}
      />
      <DataTable columns={columns} data={data} />

      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedItem ? 'Edit Customer' : 'Buat Customer'}
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
              placeholder="Nama Toko/Distributor" 
            />
          </FormField>
          <FormField label="Contact Person">
            <Input 
              value={form.contact} 
              onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} 
              placeholder="No Kontak / PIC" 
            />
          </FormField>
          <FormField label="Address">
            <Input 
              value={form.address} 
              onChange={e => setForm(f => ({ ...f, address: e.target.value }))} 
              placeholder="Alamat Kirim" 
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
