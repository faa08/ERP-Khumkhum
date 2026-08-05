const fs = require('fs');
const path = require('path');

const opsPath = path.join(process.cwd(), 'src', 'app', '(shell)');

const modules = [
  {
    folder: 'receiving',
    title: 'Raw Material Receiving',
    singular: 'Receiving Batch',
    description: 'Manage incoming raw materials from farmers and suppliers.',
    icon: 'ClipboardList',
    fields: [
      { name: 'batchNumber', label: 'Batch Number' },
      { name: 'farmerId', label: 'Farmer / Supplier' },
      { name: 'materialId', label: 'Material' },
      { name: 'grossWeight', label: 'Gross Wt (kg)' },
      { name: 'netWeight', label: 'Net Wt (kg)' },
      { name: 'moisture', label: 'Moisture %' }
    ]
  },
  {
    folder: 'sorting',
    title: 'Sorting & Grading',
    singular: 'Sorting Session',
    description: 'Process raw materials into graded categories.',
    icon: 'Scale',
    fields: [
      { name: 'sessionId', label: 'Session ID' },
      { name: 'receivingBatch', label: 'Linked Receiving Batch' },
      { name: 'grade', label: 'Grade Classification' },
      { name: 'acceptedQty', label: 'Accepted Qty (kg)' },
      { name: 'rejectedQty', label: 'Rejected Qty (kg)' },
      { name: 'wasteQty', label: 'Waste Qty (kg)' }
    ]
  },
  {
    folder: 'ppic',
    title: 'Production Planning',
    singular: 'Production Plan',
    description: 'Manage production schedules and material requirements.',
    icon: 'CalendarDays',
    fields: [
      { name: 'planId', label: 'Plan ID' },
      { name: 'product', label: 'Product' },
      { name: 'requiredDate', label: 'Required Date' },
      { name: 'targetQty', label: 'Target Qty' },
      { name: 'materialAvail', label: 'Material Availability' }
    ]
  },
  {
    folder: 'production',
    title: 'Production Orders',
    singular: 'Production Order',
    description: 'Manage production batches, WIP, and finished goods.',
    icon: 'Factory',
    fields: [
      { name: 'orderNo', label: 'Order No' },
      { name: 'product', label: 'Product' },
      { name: 'materialConsumed', label: 'Material Consumed (kg)' },
      { name: 'finishedGoods', label: 'Finished Goods (kg)' },
      { name: 'wip', label: 'WIP (kg)' },
      { name: 'yield', label: 'Yield %' }
    ]
  },
  {
    folder: 'quality-control',
    title: 'Quality Control',
    singular: 'QC Inspection',
    description: 'Manage quality inspections and defect tracking.',
    icon: 'ShieldCheck',
    fields: [
      { name: 'inspectionId', label: 'Inspection ID' },
      { name: 'productionBatch', label: 'Linked Prod Batch' },
      { name: 'result', label: 'Result' },
      { name: 'defectCategory', label: 'Defect Category' },
      { name: 'defectQty', label: 'Defect Qty' },
      { name: 'notes', label: 'Notes' }
    ]
  },
  {
    folder: 'inventory',
    title: 'Inventory Overview',
    singular: 'Stock Adjustment',
    description: 'Monitor stock levels, movements, and perform adjustments.',
    icon: 'Package',
    fields: [
      { name: 'itemCode', label: 'Item Code' },
      { name: 'itemName', label: 'Item Name' },
      { name: 'warehouse', label: 'Warehouse' },
      { name: 'batchNumber', label: 'Batch Tracking' },
      { name: 'currentStock', label: 'Current Stock' }
    ]
  },
  {
    folder: 'sales',
    title: 'Sales Orders',
    singular: 'Sales Order',
    description: 'Manage customer orders and delivery statuses.',
    icon: 'ShoppingCart',
    fields: [
      { name: 'orderNo', label: 'Order No' },
      { name: 'customer', label: 'Customer' },
      { name: 'product', label: 'Product' },
      { name: 'quantity', label: 'Quantity' },
      { name: 'deliveryStatus', label: 'Delivery Status' }
    ]
  }
];

const template = (mod) => `'use client';

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
import { Plus, MoreVertical, Edit2, Ban, CheckCircle, Eye, ${mod.icon} } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';

interface Entity {
  id: string;
${mod.fields.map(f => `  ${f.name}: string;`).join('\n')}
  status: string;
}

const MOCK_DATA: Entity[] = [
  { id: '1', ${mod.fields.map(f => `${f.name}: 'Sample ${f.label} 1'`).join(', ')}, status: 'in_progress' },
  { id: '2', ${mod.fields.map(f => `${f.name}: 'Sample ${f.label} 2'`).join(', ')}, status: 'completed' },
];

export default function ${mod.folder.replace(/-/g, '').replace(/^\w/, c => c.toUpperCase())}Page() {
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
      title: 'Cancel ${mod.singular}',
      description: \`Are you sure you want to cancel this record?\`,
      variant: 'danger',
      onConfirm: async () => {
        setData(data.map(d => d.id === item.id ? { ...d, status: 'cancelled' } : d));
        toast.success('${mod.singular} cancelled');
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const columns = useMemo<ColumnDef<Entity>[]>(() => [
${mod.fields.map(f => `    { accessorKey: '${f.name}', header: '${f.label}' },`).join('\n')}
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
        title="${mod.title}"
        description="${mod.description}"
        breadcrumbs={[{ label: 'Operations' }, { label: '${mod.title}' }]}
        actions={<Button variant="primary" onClick={handleCreate} leftIcon={<Plus size={16} />}>Create ${mod.singular}</Button>}
      />
      
      <DataTable columns={columns} data={data} />

      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedItem ? 'Edit ${mod.singular}' : 'Create ${mod.singular}'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDrawerOpen(false)}>Close</Button>
            <Button variant="primary" onClick={() => { setDrawerOpen(false); toast.success('Saved successfully'); }}>Save</Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
${mod.fields.map(f => `          <FormField label="${f.label}" required><Input defaultValue={selectedItem?.${f.name} || ''} /></FormField>`).join('\n')}
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
`;

modules.forEach(mod => {
  const dirPath = path.join(opsPath, mod.folder);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  fs.writeFileSync(path.join(dirPath, 'page.tsx'), template(mod));
});

console.log('Operations scaffolding complete.');
