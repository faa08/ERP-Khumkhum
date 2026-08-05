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
import { Plus, MoreVertical, Edit2, Ban, CheckCircle, Eye, ShieldCheck } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';

interface Entity {
  id: string;
  inspectionId: string;
  productionBatch: string;
  result: string;
  defectCategory: string;
  defectQty: string;
  notes: string;
  status: string;
}

const MOCK_DATA: Entity[] = [
  { id: '1', inspectionId: 'Sample Inspection ID 1', productionBatch: 'Sample Linked Prod Batch 1', result: 'Sample Result 1', defectCategory: 'Sample Defect Category 1', defectQty: 'Sample Defect Qty 1', notes: 'Sample Notes 1', status: 'in_progress' },
  { id: '2', inspectionId: 'Sample Inspection ID 2', productionBatch: 'Sample Linked Prod Batch 2', result: 'Sample Result 2', defectCategory: 'Sample Defect Category 2', defectQty: 'Sample Defect Qty 2', notes: 'Sample Notes 2', status: 'completed' },
];

export default function QualitycontrolPage() {
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
      title: 'Cancel QC Inspection',
      description: `Are you sure you want to cancel this record?`,
      variant: 'danger',
      onConfirm: async () => {
        setData(data.map(d => d.id === item.id ? { ...d, status: 'cancelled' } : d));
        toast.success('QC Inspection cancelled');
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const columns = useMemo<ColumnDef<Entity>[]>(() => [
    { accessorKey: 'inspectionId', header: 'Inspection ID' },
    { accessorKey: 'productionBatch', header: 'Linked Prod Batch' },
    { accessorKey: 'result', header: 'Result' },
    { accessorKey: 'defectCategory', header: 'Defect Category' },
    { accessorKey: 'defectQty', header: 'Defect Qty' },
    { accessorKey: 'notes', header: 'Notes' },
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
        title="Quality Control"
        description="Manage quality inspections and defect tracking."
        breadcrumbs={[{ label: 'Operations' }, { label: 'Quality Control' }]}
        actions={<Button variant="primary" onClick={handleCreate} leftIcon={<Plus size={16} />}>Create QC Inspection</Button>}
      />
      
      <DataTable columns={columns} data={data} />

      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedItem ? 'Edit QC Inspection' : 'Create QC Inspection'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDrawerOpen(false)}>Close</Button>
            <Button variant="primary" onClick={() => { setDrawerOpen(false); toast.success('Saved successfully'); }}>Save</Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <FormField label="Inspection ID" required><Input defaultValue={selectedItem?.inspectionId || ''} /></FormField>
          <FormField label="Linked Prod Batch" required><Input defaultValue={selectedItem?.productionBatch || ''} /></FormField>
          <FormField label="Result" required><Input defaultValue={selectedItem?.result || ''} /></FormField>
          <FormField label="Defect Category" required><Input defaultValue={selectedItem?.defectCategory || ''} /></FormField>
          <FormField label="Defect Qty" required><Input defaultValue={selectedItem?.defectQty || ''} /></FormField>
          <FormField label="Notes" required><Input defaultValue={selectedItem?.notes || ''} /></FormField>
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
