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
import { getProducts, createProduct, updateProduct, deleteProduct } from '@/actions/master';
import type { DbProduct } from '@/types/database';

export default function ProductsPage() {
  const [data, setData] = useState<DbProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DbProduct | null>(null);
  
  const [form, setForm] = useState({ sku: '', name: '', description: '' });
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
    const res = await getProducts();
    if (res.success && res.data) {
      setData(res.data);
    } else {
      toast.error(res.error || 'Failed to load products');
    }
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = () => {
    setSelectedItem(null);
    setForm({ sku: '', name: '', description: '' });
    setDrawerOpen(true);
  };

  const handleEdit = (item: DbProduct) => {
    setSelectedItem(item);
    setForm({
      sku: item.sku || '',
      name: item.name || '',
      description: item.description || ''
    });
    setDrawerOpen(true);
  };

  const handleSave = async () => {
    if (!form.sku || !form.name) {
      toast.error('SKU and Name are required');
      return;
    }
    setIsSaving(true);
    
    if (selectedItem) {
      const res = await updateProduct(selectedItem.id, form);
      if (res.success) {
        toast.success('Product updated successfully');
        setDrawerOpen(false);
        loadData();
      } else {
        toast.error(res.error || 'Failed to update product');
      }
    } else {
      const res = await createProduct(form);
      if (res.success) {
        toast.success('Product created successfully');
        setDrawerOpen(false);
        loadData();
      } else {
        toast.error(res.error || 'Failed to create product');
      }
    }
    setIsSaving(false);
  };

  const handleDelete = (item: DbProduct) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Product',
      description: `Are you sure you want to delete ${item.name}?`,
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        const res = await deleteProduct(item.id);
        if (res.success) {
          toast.success('Product deleted successfully');
          loadData();
        } else {
          toast.error(res.error || 'Failed to delete product');
        }
      }
    });
  };

  const columns = useMemo<ColumnDef<DbProduct>[]>(() => [
    { accessorKey: 'sku', header: 'SKU' },
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'description', header: 'Description' },
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
        title="Data Induk Produk"
        description="Manage finished products catalog."
        breadcrumbs={[{ label: 'Data Induk' }, { label: 'Products' }]}
        actions={<Button variant="primary" onClick={handleCreate} leftIcon={<Plus size={16} />}>Create Product</Button>}
      />
      <DataTable columns={columns} data={data} />

      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedItem ? 'Edit Product' : 'Buat Product'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} loading={isSaving}>Simpan</Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <FormField label="SKU" required>
            <Input 
              value={form.sku} 
              onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} 
              placeholder="e.g. SKU-ORIG-100G" 
            />
          </FormField>
          <FormField label="Name" required>
            <Input 
              value={form.name} 
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} 
              placeholder="e.g. Jamur Crispy Original 100g" 
            />
          </FormField>
          <FormField label="Description">
            <Input 
              value={form.description} 
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} 
              placeholder="Deskripsi produk" 
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
