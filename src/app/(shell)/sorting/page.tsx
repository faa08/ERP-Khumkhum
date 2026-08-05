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
      title: 'Cancel Sorting Session',
      description: `Are you sure you want to cancel this record?`,
      variant: 'danger',
      onConfirm: async () => {
        setData(data.map(d => d.id === item.id ? { ...d, status: 'cancelled' } : d));
        toast.success('Sorting Session cancelled');
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const columns = useMemo<ColumnDef<Entity>[]>(() => [
    { accessorKey: 'sessionId', header: 'Session ID' },
    { accessorKey: 'receivingBatch', header: 'Linked Receiving Batch' },
    { accessorKey: 'grade', header: 'Grade Classification' },
    { accessorKey: 'acceptedQty', header: 'Accepted Qty (kg)' },
    { accessorKey: 'rejectedQty', header: 'Rejected Qty (kg)' },
    { accessorKey: 'wasteQty', header: 'Waste Qty (kg)' },
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
            { id: 'view', label: 'View Details', icon: <Eye size={14} /> },
            { id: 'edit', label: 'Edit', icon: <Edit2 size={14} />, onClick: () => handleEdit(row.original) },
            { divider: true, id: 'div1', label: '' },
            { 
              id: 'cancel', 
              label: 'Cancel Record', 
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
        title="Sorting & Grading"
        description="Process raw materials into graded categories."
        breadcrumbs={[{ label: 'Operations' }, { label: 'Sorting & Grading' }]}
        actions={<Button variant="primary" onClick={handleCreate} leftIcon={<Plus size={16} />}>Create Sorting Session</Button>}
      />
      
      <DataTable columns={columns} data={data} />

      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedItem ? 'Edit Sorting Session' : 'Create Sorting Session'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDrawerOpen(false)}>Close</Button>
            <Button variant="primary" onClick={() => { setDrawerOpen(false); toast.success('Saved successfully'); }}>Save</Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <FormField label="Session ID" required><Input defaultValue={selectedItem?.sessionId || ''} /></FormField>
          <FormField label="Linked Receiving Batch" required><Input defaultValue={selectedItem?.receivingBatch || ''} /></FormField>
          <FormField label="Grade Classification" required><Input defaultValue={selectedItem?.grade || ''} /></FormField>
          <FormField label="Accepted Qty (kg)" required><Input defaultValue={selectedItem?.acceptedQty || ''} /></FormField>
          <FormField label="Rejected Qty (kg)" required><Input defaultValue={selectedItem?.rejectedQty || ''} /></FormField>
          <FormField label="Waste Qty (kg)" required><Input defaultValue={selectedItem?.wasteQty || ''} /></FormField>
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
