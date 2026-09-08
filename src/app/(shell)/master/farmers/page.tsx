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
import { Plus, MoreVertical, Edit2, Trash2, MessageCircle } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { getFarmers, createFarmer, updateFarmer, deleteFarmer, inquireFarmerStockAction } from '@/actions/master';
import { getRecentFarmerMessages } from '@/actions/whatsapp';
import type { DbFarmer, FarmerType, DbWhatsAppMessage } from '@/types/database';

const FARMER_TYPE_LABELS: Record<FarmerType, string> = {
  SEKITAR: 'Petani Sekitar',
  MITRA_BESAR: 'Mitra Besar',
};

const FARMER_TYPE_COLORS: Record<FarmerType, string> = {
  SEKITAR: 'var(--color-primary-600)',
  MITRA_BESAR: 'var(--color-success-600)',
};

export default function FarmersPage() {
  const { user } = useAuth();
  const isManagement = user?.role === 'MANAGEMENT';

  const [data, setData] = useState<DbFarmer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DbFarmer | null>(null);
  
  const [form, setForm] = useState({ name: '', phone_number: '', contact: '', address: '', farmer_type: 'SEKITAR' as FarmerType });
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
    const [farmRes, msgRes] = await Promise.all([
      getFarmers(),
      getRecentFarmerMessages(100) // fetch up to 100 recent messages for mapping
    ]);
    
    if (farmRes.success && farmRes.data) {
      let farmersData = farmRes.data as (DbFarmer & { _last_message?: string, _last_message_date?: string })[];
      
      if (msgRes.success && msgRes.data) {
        const msgs = msgRes.data as DbWhatsAppMessage[];
        const msgMap = new Map();
        msgs.forEach(m => {
          if (m.farmer_id && !msgMap.has(m.farmer_id)) {
            msgMap.set(m.farmer_id, m);
          }
        });
        
        farmersData = farmersData.map(f => {
          const m = msgMap.get(f.id);
          return m ? { ...f, _last_message: m.message, _last_message_date: m.created_at } : f;
        });
      }
      
      setData(farmersData);
    } else {
      toast.error(farmRes.error || 'Failed to load farmers');
    }
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = () => {
    setSelectedItem(null);
    setForm({ name: '', phone_number: '', contact: '', address: '', farmer_type: 'SEKITAR' });
    setDrawerOpen(true);
  };

  const handleEdit = (item: DbFarmer) => {
    setSelectedItem(item);
    setForm({
      name: item.name || '',
      phone_number: item.phone_number || '',
      contact: item.contact || '',
      address: item.address || '',
      farmer_type: item.farmer_type || 'SEKITAR',
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
        toast.success('Data petani berhasil diperbarui');
        setDrawerOpen(false);
        loadData();
      } else {
        toast.error(res.error || 'Gagal memperbarui data petani');
      }
    } else {
      const res = await createFarmer(form);
      if (res.success) {
        toast.success('Petani berhasil ditambahkan');
        setDrawerOpen(false);
        loadData();
      } else {
        toast.error(res.error || 'Gagal menambahkan petani');
      }
    }
    setIsSaving(false);
  };

  const handleDelete = (item: DbFarmer) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Hapus Petani',
      description: `Apakah Anda yakin ingin menghapus ${item.name}? Tindakan ini tidak dapat dibatalkan.`,
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        const res = await deleteFarmer(item.id);
        if (res.success) {
          toast.success('Petani berhasil dihapus');
          loadData();
        } else {
          toast.error(res.error || 'Gagal menghapus petani');
        }
      }
    });
  };

  const handleInquiry = async (item: DbFarmer) => {
    if (!item.phone_number) {
      toast.error('Petani ini belum memiliki nomor HP');
      return;
    }

    const res = await inquireFarmerStockAction({ farmerId: item.id });

    if (res.success) {
      toast.success(`Pesan tanya ketersediaan stok terkirim ke ${item.name}`);
      // Jika Fonnte dalam mode simulasi, buka direct WA link sebagai fallback
      if (res.directUrl) {
        window.open(res.directUrl, '_blank');
      }
    } else {
      toast.error(res.error || 'Gagal mengirim pesan');
    }
  };

  const columns = useMemo<ColumnDef<DbFarmer>[]>(() => [
    { accessorKey: 'name', header: 'Nama Petani' },
    {
      id: 'farmer_type',
      header: 'Tipe',
      cell: ({ row }) => {
        const type = row.original.farmer_type || 'SEKITAR';
        return (
          <span style={{
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            color: FARMER_TYPE_COLORS[type],
            background: type === 'MITRA_BESAR' ? 'var(--color-success-50)' : 'var(--color-primary-50)',
            padding: '2px 8px',
            borderRadius: 'var(--radius-full)',
          }}>
            {FARMER_TYPE_LABELS[type]}
          </span>
        );
      },
    },
    { accessorKey: 'contact', header: 'PJ / Kontak' },
    { accessorKey: 'phone_number', header: 'No. HP' },
    { accessorKey: 'address', header: 'Alamat' },
    {
      id: 'last_message',
      header: 'Pesan Terakhir',
      cell: ({ row }: { row: any }) => {
        const msg = row.original._last_message;
        const date = row.original._last_message_date;
        if (!msg) return '-';
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>"{msg}"</span>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              {new Date(date).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        );
      }
    },
    ...(isManagement ? [] : [{
      id: 'actions',
      cell: ({ row }: { row: any }) => (
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {row.original.phone_number && (
            <Button
              variant="ghost"
              size="sm"
              style={{ padding: '0 6px', color: 'var(--color-success-600)' }}
              onClick={() => handleInquiry(row.original)}
              title="Tanya Ketersediaan Stok via WA"
            >
              <MessageCircle size={16} />
            </Button>
          )}
          <Dropdown
            trigger={<Button variant="ghost" size="sm" style={{ padding: '0 8px' }}><MoreVertical size={16} /></Button>}
            items={[
              { id: 'edit', label: 'Edit', icon: <Edit2 size={14} />, onClick: () => handleEdit(row.original) },
              { divider: true, id: 'div1', label: '' },
              { 
                id: 'delete', 
                label: 'Hapus', 
                icon: <Trash2 size={14} />,
                danger: true,
                onClick: () => handleDelete(row.original)
              },
            ]}
          />
        </div>
      )
    }])
  ], [isManagement]);

  return (
    <div>
      <PageHeader
        title="Data Induk Petani"
        description="Kelola data petani sekitar dan petani mitra besar KhumKhum."
        breadcrumbs={[{ label: 'Data Induk' }, { label: 'Petani' }]}
        actions={!isManagement ? <Button variant="primary" onClick={handleCreate} leftIcon={<Plus size={16} />}>Tambah Petani</Button> : undefined}
      />
      <DataTable columns={columns} data={data} />

      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedItem ? 'Edit Petani' : 'Tambah Petani Baru'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDrawerOpen(false)}>Batal</Button>
            <Button variant="primary" onClick={handleSave} loading={isSaving}>Simpan</Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <FormField label="Nama Petani" required>
            <Input 
              value={form.name} 
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} 
              placeholder="Nama Petani/Kelompok Tani" 
            />
          </FormField>
          <FormField label="Tipe Petani" required>
            <select
              value={form.farmer_type}
              onChange={e => setForm(f => ({ ...f, farmer_type: e.target.value as FarmerType }))}
              style={{
                width: '100%',
                padding: 'var(--space-2) var(--space-3)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-primary)',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: 'var(--text-sm)',
              }}
            >
              <option value="SEKITAR">Petani Sekitar (Lokal/Harian)</option>
              <option value="MITRA_BESAR">Petani Mitra Besar (Komersial/Terjadwal)</option>
            </select>
          </FormField>
          <FormField label="Penanggung Jawab">
            <Input 
              value={form.contact} 
              onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} 
              placeholder="Nama PJ / kontak" 
            />
          </FormField>
          <FormField label="Nomor HP (WhatsApp)">
            <Input 
              value={form.phone_number} 
              onChange={e => setForm(f => ({ ...f, phone_number: e.target.value }))} 
              placeholder="e.g. 08123456789" 
            />
          </FormField>
          <FormField label="Alamat">
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
