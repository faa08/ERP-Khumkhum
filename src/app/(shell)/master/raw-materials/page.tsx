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
import { useAuth } from '@/hooks/useAuth';
import { Plus, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { getRawMaterials, createRawMaterial, updateRawMaterial, deleteRawMaterial } from '@/actions/master';
import type { DbRawMaterial } from '@/types/database';

export default function RawmaterialsPage() {
  const { user } = useAuth();
  const isManagement = user?.role === 'MANAGEMENT';

  const [data, setData] = useState<DbRawMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DbRawMaterial | null>(null);
  
  const [form, setForm] = useState({ code: '', name: '', uom: '', min_stock: 0, rop: 0, material_category: '' });
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
    const res = await getRawMaterials();
    if (res.success && res.data) {
      setData(res.data);
    } else {
      toast.error(res.error || 'Failed to load raw materials');
    }
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = () => {
    setSelectedItem(null);
    setForm({ code: '', name: '', uom: '', min_stock: 0, rop: 0, material_category: '' });
    setDrawerOpen(true);
  };

  const handleEdit = (item: DbRawMaterial) => {
    setSelectedItem(item);
    setForm({
      code: item.code || '',
      name: item.name || '',
      uom: item.uom || '',
      min_stock: item.min_stock || 0,
      rop: item.rop || 0,
      material_category: item.material_category || ''
    });
    setDrawerOpen(true);
  };

  const handleSave = async () => {
    if (!form.code || !form.name || !form.uom) {
      toast.error('Code, Name, and UOM are required');
      return;
    }
    setIsSaving(true);
    
    if (selectedItem) {
      const res = await updateRawMaterial(selectedItem.id, form);
      if (res.success) {
        toast.success('Raw material updated successfully');
        setDrawerOpen(false);
        loadData();
      } else {
        toast.error(res.error || 'Failed to update raw material');
      }
    } else {
      const res = await createRawMaterial(form);
      if (res.success) {
        toast.success('Raw material created successfully');
        setDrawerOpen(false);
        loadData();
      } else {
        toast.error(res.error || 'Failed to create raw material');
      }
    }
    setIsSaving(false);
  };

  const handleDelete = (item: DbRawMaterial) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Raw Material',
      description: `Are you sure you want to delete ${item.name}?`,
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        const res = await deleteRawMaterial(item.id);
        if (res.success) {
          toast.success('Raw material deleted successfully');
          loadData();
        } else {
          toast.error(res.error || 'Failed to delete raw material');
        }
      }
    });
  };

  const columns = useMemo<ColumnDef<DbRawMaterial>[]>(() => [
    { accessorKey: 'code', header: 'Code' },
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'material_category', header: 'Kategori' },
    { accessorKey: 'uom', header: 'Unit of Measure (UOM)' },
    { accessorKey: 'min_stock', header: 'Minimum Stock' },
    { accessorKey: 'rop', header: 'Reorder Point (ROP)' },
    ...(isManagement ? [] : [{
      id: 'actions',
      cell: ({ row }: { row: any }) => (
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
    }])
  ], [isManagement]);

  return (
    <div>
      <PageHeader
        title="Data Induk Bahan Baku"
        description="Manage raw materials inventory catalog."
        breadcrumbs={[{ label: 'Data Induk' }, { label: 'Raw Materials' }]}
        actions={!isManagement ? <Button variant="primary" onClick={handleCreate} leftIcon={<Plus size={16} />}>Create Raw Material</Button> : undefined}
      />
      <DataTable columns={columns} data={data} />

      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedItem ? 'Edit Raw Material' : 'Buat Raw Material'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} loading={isSaving}>Simpan</Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <FormField label="Code" required>
            <Input 
              value={form.code} 
              onChange={e => setForm(f => ({ ...f, code: e.target.value }))} 
              placeholder="e.g. RM-JAMUR-BASAH" 
            />
          </FormField>
          <FormField label="Name" required>
            <Input 
              value={form.name} 
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} 
              placeholder="e.g. Jamur Tiram Basah" 
            />
          </FormField>
          <FormField label="Kategori" required>
            <select
              value={form.material_category}
              onChange={e => setForm(f => ({ ...f, material_category: e.target.value }))}
              style={{
                width: '100%', padding: 'var(--space-2) var(--space-3)',
                border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)',
                background: 'var(--bg-default)', color: 'var(--text-primary)', fontSize: 'var(--text-sm)'
              }}
            >
              <option value="">-- Pilih Kategori --</option>
              <option value="Jamur">Jamur (Utama)</option>
              <option value="Bumbu">Bumbu (Pendukung)</option>
              <option value="Tepung">Tepung (Pendukung)</option>
              <option value="Minyak">Minyak (Pendukung)</option>
              <option value="Packaging">Packaging</option>
            </select>
          </FormField>
          <FormField label="Unit of Measure (UOM)" required>
            <Input 
              value={form.uom} 
              onChange={e => setForm(f => ({ ...f, uom: e.target.value }))} 
              placeholder="e.g. kg, gram" 
            />
          </FormField>
          <FormField label="Minimum Stock">
            <Input 
              type="number"
              value={form.min_stock.toString()} 
              onChange={e => setForm(f => ({ ...f, min_stock: parseFloat(e.target.value) || 0 }))} 
            />
          </FormField>
          <FormField label="Reorder Point (ROP)">
            <Input 
              type="number"
              value={form.rop.toString()} 
              onChange={e => setForm(f => ({ ...f, rop: parseFloat(e.target.value) || 0 }))} 
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
