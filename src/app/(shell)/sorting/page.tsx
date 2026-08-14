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
import { Plus, MoreVertical, Edit2, Ban, CheckCircle, Eye, Scale } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';

interface Entity {
  id: string;
  sessionId: string;
  receivingBatch: string;
  grade: string;
  acceptedQty: string;
  rejectedQty: string;
  wasteQty: string;
  status: string;
}

const MOCK_DATA: Entity[] = [
  { id: '1', sessionId: 'Sample Session ID 1', receivingBatch: 'Sample Linked Receiving Batch 1', grade: 'Sample Grade Classification 1', acceptedQty: 'Sample Accepted Qty (kg) 1', rejectedQty: 'Sample Rejected Qty (kg) 1', wasteQty: 'Sample Waste Qty (kg) 1', status: 'in_progress' },
  { id: '2', sessionId: 'Sample Session ID 2', receivingBatch: 'Sample Linked Receiving Batch 2', grade: 'Sample Grade Classification 2', acceptedQty: 'Sample Accepted Qty (kg) 2', rejectedQty: 'Sample Rejected Qty (kg) 2', wasteQty: 'Sample Waste Qty (kg) 2', status: 'completed' },
];

export default function SortingPage() {
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

  const handleCancel = (item: Entity) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Batalkan Sesi Sortasi',
      description: `Apakah Anda yakin ingin membatalkan rekam jejak ini?`,
      variant: 'danger',
      onConfirm: async () => {
        setData(data.map(d => d.id === item.id ? { ...d, status: 'dibatalkan' } : d));
        toast.success('Sesi Sortasi berhasil dibatalkan');
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const columns = useMemo<ColumnDef<Entity>[]>(() => [
    { accessorKey: 'sessionId', header: 'ID Sesi' },
    { accessorKey: 'receivingBatch', header: 'Batch Penerimaan' },
    { accessorKey: 'grade', header: 'Klasifikasi Grade' },
    { accessorKey: 'acceptedQty', header: 'Qty Diterima (kg)' },
    { accessorKey: 'rejectedQty', header: 'Qty Ditolak (kg)' },
    { accessorKey: 'wasteQty', header: 'Qty Limbah (kg)' },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <Dropdown
          trigger={<Button variant="ghost" size="sm" style={{ padding: '0 8px' }}><MoreVertical size={16} /></Button>}
          items={[
            { id: 'view', label: 'Lihat Detail', icon: <Eye size={14} /> },
            { id: 'edit', label: 'Edit', icon: <Edit2 size={14} />, onClick: () => handleEdit(row.original) },
            { divider: true, id: 'div1', label: '' },
            { 
              id: 'cancel', 
              label: 'Batalkan Rekam Jejak', 
              icon: <Ban size={14} />,
              danger: true,
              onClick: () => handleCancel(row.original)
            },
          ]}
        />
      )
    }
  ], [data]);

  return (
    <div>
      <PageHeader
        title="Sortasi & Grading"
        description="Memproses bahan baku menjadi berbagai kategori grade (kualitas)."
        breadcrumbs={[{ label: 'Operasional' }, { label: 'Sortasi & Grading' }]}
        actions={<Button variant="primary" onClick={handleCreate} leftIcon={<Plus size={16} />}>Buat Sesi Sortasi</Button>}
      />
      
      <DataTable columns={columns} data={data} />

      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedItem ? 'Edit Sesi Sortasi' : 'Buat Sesi Sortasi Baru'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDrawerOpen(false)}>Tutup</Button>
            <Button variant="primary" onClick={() => { setDrawerOpen(false); toast.success('Berhasil disimpan'); }}>Simpan</Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <FormField label="ID Sesi" required><Input defaultValue={selectedItem?.sessionId || ''} /></FormField>
          <FormField label="Batch Penerimaan" required><Input defaultValue={selectedItem?.receivingBatch || ''} /></FormField>
          <FormField label="Klasifikasi Grade" required><Input defaultValue={selectedItem?.grade || ''} /></FormField>
          <FormField label="Qty Diterima (kg)" required><Input defaultValue={selectedItem?.acceptedQty || ''} /></FormField>
          <FormField label="Qty Ditolak (kg)" required><Input defaultValue={selectedItem?.rejectedQty || ''} /></FormField>
          <FormField label="Qty Limbah (kg)" required><Input defaultValue={selectedItem?.wasteQty || ''} /></FormField>
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
