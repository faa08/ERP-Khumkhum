'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/data-table/DataTable';
import { Button } from '@/components/ui/Button';
import { Dropdown } from '@/components/ui/Dropdown';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/form/FormField';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { Plus, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { getWarehousePics, createWarehousePic, updateWarehousePic, deleteWarehousePic, testSendReminderAction } from '@/actions/master';
import type { DbWarehousePic } from '@/types/database';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

export default function WarehousePicsPage() {
  const { user } = useAuth();
  const isManagement = user?.role === 'MANAGEMENT';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [data, setData] = useState<DbWarehousePic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DbWarehousePic | null>(null);
  
  const [form, setForm] = useState<{ name: string; phone_number: string; next_reminder_datetime: string }>({ name: '', phone_number: '', next_reminder_datetime: '' });
  const [isSaving, setIsSaving] = useState(false);

  // Time picker logic
  const datetimeObj = form.next_reminder_datetime ? new Date(form.next_reminder_datetime) : null;
  const pad = (n: number) => n.toString().padStart(2, '0');
  
  const dateStr = datetimeObj && !isNaN(datetimeObj.getTime()) ? `${datetimeObj.getFullYear()}-${pad(datetimeObj.getMonth()+1)}-${pad(datetimeObj.getDate())}` : '';
  const hourStr = datetimeObj && !isNaN(datetimeObj.getTime()) ? pad(datetimeObj.getHours()) : '08';
  const minStr = datetimeObj && !isNaN(datetimeObj.getTime()) ? pad(datetimeObj.getMinutes()) : '00';

  const updateDatetime = (newDate: string, newHour: string, newMin: string) => {
    if (!newDate) {
      setForm(f => ({ ...f, next_reminder_datetime: '' }));
      return;
    }
    const d = new Date(`${newDate}T${newHour}:${newMin}:00`);
    if (!isNaN(d.getTime())) {
      setForm(f => ({ ...f, next_reminder_datetime: d.toISOString() }));
    }
  };

  const hourOptions = Array.from({length: 24}).map((_, i) => ({ value: pad(i), label: pad(i) }));
  const minuteOptions = ['00', '15', '30', '45'].map(m => ({ value: m, label: m }));

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
    const res = await getWarehousePics();
    if (res.success && res.data) {
      setData(res.data);
    } else {
      toast.error(res.error || 'Failed to load warehouse PICs');
    }
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = () => {
    setSelectedItem(null);
    setForm({ name: '', phone_number: '', next_reminder_datetime: '' });
    setModalOpen(true);
  };

  const handleEdit = (item: DbWarehousePic) => {
    setSelectedItem(item);
    setForm({
      name: item.name || '',
      phone_number: item.phone_number || '',
      next_reminder_datetime: item.next_reminder_datetime ? new Date(item.next_reminder_datetime).toISOString() : ''
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.phone_number) {
      toast.error('Name and Phone Number are required');
      return;
    }
    setIsSaving(true);
    
    try {
      const payload = {
        ...form,
        next_reminder_datetime: form.next_reminder_datetime ? new Date(form.next_reminder_datetime).toISOString() : null,
      };

      if (selectedItem) {
        const res = await updateWarehousePic(selectedItem.id, payload);
        if (res.success) {
          toast.success('Warehouse PIC updated successfully');
          setModalOpen(false);
          loadData();
        } else {
          toast.error(res.error || 'Failed to update warehouse PIC');
        }
      } else {
        const res = await createWarehousePic(payload);
        if (res.success) {
          toast.success('Warehouse PIC created successfully');
          setModalOpen(false);
          loadData();
        } else {
          toast.error(res.error || 'Failed to create warehouse PIC');
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'An error occurred');
    }
    setIsSaving(false);
  };

  const handleDelete = (item: DbWarehousePic) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Warehouse PIC',
      description: `Are you sure you want to delete ${item.name}?`,
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        const res = await deleteWarehousePic(item.id);
        if (res.success) {
          toast.success('Warehouse PIC deleted successfully');
          loadData();
        } else {
          toast.error(res.error || 'Failed to delete warehouse PIC');
        }
      }
    });
  };

  const handleTestSend = async (picId: string) => {
    toast.success('Mengirim tes reminder...');
    const res = await testSendReminderAction(picId);
    if (res.success) {
      toast.success(res.message || 'Berhasil mengirim tes reminder');
    } else {
      toast.error(res.error || 'Gagal mengirim tes reminder');
    }
  };

  const columns = useMemo<ColumnDef<DbWarehousePic>[]>(() => [
    { accessorKey: 'name', header: 'PIC Name' },
    { accessorKey: 'phone_number', header: 'WhatsApp Number' },
    { 
      accessorKey: 'next_reminder_datetime', 
      header: 'Jadwal Berikutnya',
      cell: ({ row }) => {
        const val = row.original.next_reminder_datetime;
        if (!val) return '-';
        return format(new Date(val), 'dd MMM yyyy, HH:mm', { locale: localeId });
      }
    },
    ...(isManagement ? [] : [{
      id: 'actions',
      cell: ({ row }: { row: any }) => (
        <Dropdown
          trigger={<Button variant="ghost" size="sm" style={{ padding: '0 8px' }}><MoreVertical size={16} /></Button>}
          items={[
            ...(isSuperAdmin ? [
              { id: 'test-send', label: 'Tes Kirim Reminder', onClick: () => handleTestSend(row.original.id) }, 
              { divider: true, id: 'div-test', label: '' }
            ] : []),
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
        title="Data Induk PIC Gudang"
        description="Manage warehouse PICs and their WhatsApp numbers."
        breadcrumbs={[{ label: 'Data Induk' }, { label: 'PIC Gudang' }]}
        actions={!isManagement ? <Button variant="primary" onClick={handleCreate} leftIcon={<Plus size={16} />}>Create PIC</Button> : undefined}
      />
      <DataTable columns={columns} data={data} />

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selectedItem ? 'Edit PIC Gudang' : 'Buat PIC Gudang'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} loading={isSaving}>Simpan</Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <FormField label="Nama PIC" required>
            <Input 
              value={form.name} 
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} 
              placeholder="e.g. Budi Santoso" 
            />
          </FormField>
          <FormField label="Nomor WhatsApp" required>
            <Input 
              value={form.phone_number} 
              onChange={e => setForm(f => ({ ...f, phone_number: e.target.value }))} 
              placeholder="e.g. 08123456789" 
            />
          </FormField>
          <FormField label="Jadwal Pengingat Berikutnya" required>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Input 
                type="date"
                value={dateStr} 
                onChange={e => updateDatetime(e.target.value, hourStr, minStr)} 
                style={{ flex: 1 }}
              />
              <Select 
                options={hourOptions}
                value={hourStr}
                onChange={e => updateDatetime(dateStr || new Date().toISOString().split('T')[0], e.target.value, minStr)}
              />
              <span>:</span>
              <Select 
                options={minuteOptions}
                value={minStr}
                onChange={e => updateDatetime(dateStr || new Date().toISOString().split('T')[0], hourStr, e.target.value)}
              />
            </div>
            <p className="text-xs text-neutral-500 mt-1">Pesan akan dikirim pada tanggal dan jam ini.</p>
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
