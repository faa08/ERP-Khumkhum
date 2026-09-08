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
import { useAuth } from '@/hooks/useAuth';
import { Plus, MoreVertical, Edit2, Ban, CheckCircle, Eye, Trash2 } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { getFarmers, createFarmer, updateFarmer, deleteFarmer } from '@/actions/master';
import type { DbFarmer } from '@/types/database';

export default function FarmersPage() {
  const { user } = useAuth();
  const isManagement = user?.role === 'MANAGEMENT';

  const [data, setData] = useState<DbFarmer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DbFarmer | null>(null);
  
  const [form, setForm] = useState({ 
    name: '', phone_number: '', contact: '', address: '',
    price_per_kg: '', supplier_type: 'FARMER_MICRO', bank_name: '', bank_account_number: '' 
  });
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
    setForm({ 
      name: '', phone_number: '', contact: '', address: '', 
      price_per_kg: '', supplier_type: 'FARMER_MICRO', bank_name: '', bank_account_number: '' 
    });
    setDrawerOpen(true);
  };

  const handleEdit = (item: DbFarmer) => {
    setSelectedItem(item);
    setForm({
      name: item.name || '',
      phone_number: item.phone_number || '',
      contact: item.contact || '',
      address: item.address || '',
      price_per_kg: item.price_per_kg ? item.price_per_kg.toString() : '',
      supplier_type: item.supplier_type || 'FARMER_MICRO',
      bank_name: item.bank_name || '',
      bank_account_number: item.bank_account_number || ''
    });
    setDrawerOpen(true);
  };

  const handleSave = async () => {
    if (!form.name) {
      toast.error('Name is required');
      return;
    }
    setIsSaving(true);
    
    const payload = {
      ...form,
      price_per_kg: form.price_per_kg ? parseFloat(form.price_per_kg) : null,
    };
    
    if (selectedItem) {
      const res = await updateFarmer(selectedItem.id, payload);
      if (res.success) {
        toast.success('Farmer updated successfully');
        setDrawerOpen(false);
        loadData();
      } else {
        toast.error(res.error || 'Failed to update farmer');
      }
    } else {
      const res = await createFarmer(payload);
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
    { 
      id: 'supplier_type', 
      header: 'Kategori',
      cell: ({ row }) => {
        const type = row.original.supplier_type;
        if (type === 'FARMER_MAIN') return <StatusBadge status="warning" label="Mitra Besar" />;
        if (type === 'EXTERNAL_SUPPLIER') return <StatusBadge status="info" label="Supplier Eksternal" />;
        return <StatusBadge status="success" label="Petani Sekitar" />;
      }
    },
    { accessorKey: 'phone_number', header: 'WhatsApp' },
    { 
      id: 'price', 
      header: 'Harga Acuan',
      cell: ({ row }) => row.original.price_per_kg ? `Rp ${row.original.price_per_kg.toLocaleString('id-ID')}/kg` : '-'
    },
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
        title="Data Induk Petani"
        description="Manage farmer partners and suppliers."
        breadcrumbs={[{ label: 'Data Induk' }, { label: 'Farmers' }]}
        actions={!isManagement ? <Button variant="primary" onClick={handleCreate} leftIcon={<Plus size={16} />}>Create Farmer</Button> : undefined}
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
          <FormField label="Kategori Pemasok" required>
            <select
              value={form.supplier_type}
              onChange={e => setForm(f => ({ ...f, supplier_type: e.target.value }))}
              style={{
                width: '100%', padding: 'var(--space-2) var(--space-3)',
                border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)',
                background: 'var(--bg-default)', color: 'var(--text-primary)',
                fontSize: 'var(--text-sm)',
              }}
            >
              <option value="FARMER_MICRO">Petani Sekitar / Mikro</option>
              <option value="FARMER_MAIN">Petani Besar / Sentra</option>
              <option value="EXTERNAL_SUPPLIER">Supplier Eksternal (MOU)</option>
            </select>
          </FormField>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <FormField label="Name" required>
              <Input 
                value={form.name} 
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} 
                placeholder="Nama Petani/Kelompok Tani" 
              />
            </FormField>
            <FormField label="Kontak WhatsApp">
              <Input 
                value={form.phone_number} 
                onChange={e => setForm(f => ({ ...f, phone_number: e.target.value }))} 
                placeholder="e.g. 08123456789" 
              />
            </FormField>
          </div>

          <FormField label="Alamat">
            <Input 
              value={form.address} 
              onChange={e => setForm(f => ({ ...f, address: e.target.value }))} 
              placeholder="Alamat lengkap" 
            />
          </FormField>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <FormField label="Bank / E-Wallet">
              <Input 
                value={form.bank_name} 
                onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))} 
                placeholder="BCA, Mandiri, DANA, dll" 
              />
            </FormField>
            <FormField label="Nomor Rekening">
              <Input 
                value={form.bank_account_number} 
                onChange={e => setForm(f => ({ ...f, bank_account_number: e.target.value }))} 
                placeholder="No. Rekening" 
              />
            </FormField>
          </div>

          <FormField label="Tarif Beli Acuan (Rp/kg)">
            <Input 
              type="number"
              value={form.price_per_kg} 
              onChange={e => setForm(f => ({ ...f, price_per_kg: e.target.value }))} 
              placeholder="15000" 
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
