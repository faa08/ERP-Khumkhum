const fs = require('fs');
const path = require('path');

const basePath = path.join(__dirname, 'src', 'app', '(shell)', 'master');

const entities = [
  {
    folder: 'products',
    title: 'Products',
    singular: 'Product',
    description: 'Manage finished products catalog.',
    fields: [
      { name: 'code', label: 'Code' },
      { name: 'name', label: 'Name' },
      { name: 'description', label: 'Description' }
    ]
  },
  {
    folder: 'raw-materials',
    title: 'Raw Materials',
    singular: 'Raw Material',
    description: 'Manage raw materials inventory catalog.',
    fields: [
      { name: 'code', label: 'Code' },
      { name: 'name', label: 'Name' },
      { name: 'type', label: 'Material Type' }
    ]
  },
  {
    folder: 'customers',
    title: 'Customers',
    singular: 'Customer',
    description: 'Manage customer data.',
    fields: [
      { name: 'code', label: 'Code' },
      { name: 'name', label: 'Name' },
      { name: 'address', label: 'Address' }
    ]
  },
  {
    folder: 'warehouses',
    title: 'Warehouses',
    singular: 'Warehouse',
    description: 'Manage warehouse locations.',
    fields: [
      { name: 'code', label: 'Code' },
      { name: 'name', label: 'Name' },
      { name: 'location', label: 'Location' }
    ]
  },
  {
    folder: 'production-standards',
    title: 'Production Standards',
    singular: 'Production Standard',
    description: 'Manage production standards and recipes.',
    fields: [
      { name: 'name', label: 'Name' },
      { name: 'version', label: 'Version' }
    ]
  },
  {
    folder: 'sorting-standards',
    title: 'Sorting Standards',
    singular: 'Sorting Standard',
    description: 'Manage sorting standards and criteria.',
    fields: [
      { name: 'name', label: 'Name' },
      { name: 'criteria', label: 'Criteria' }
    ]
  },
  {
    folder: 'qc-standards',
    title: 'QC Standards',
    singular: 'QC Standard',
    description: 'Manage quality control standards and parameters.',
    fields: [
      { name: 'name', label: 'Name' },
      { name: 'parameters', label: 'Parameters' }
    ]
  }
];

const template = (entity) => `'use client';

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
import { Plus, MoreVertical, Edit2, Ban, CheckCircle, Eye } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';

interface Entity {
  id: string;
${entity.fields.map(f => `  ${f.name}: string;`).join('\n')}
  isActive: boolean;
}

const MOCK_DATA: Entity[] = [
  { id: '1', ${entity.fields.map(f => `${f.name}: 'Sample ${f.label} 1'`).join(', ')}, isActive: true },
  { id: '2', ${entity.fields.map(f => `${f.name}: 'Sample ${f.label} 2'`).join(', ')}, isActive: true },
];

export default function ${entity.folder.replace(/-/g, '').replace(/^\w/, c => c.toUpperCase())}Page() {
  const [data, setData] = useState<Entity[]>(MOCK_DATA);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Entity | null>(null);
  
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    intent: 'danger' | 'warning' | 'primary';
  }>({ isOpen: false, title: '', description: '', onConfirm: () => {}, intent: 'primary' });

  const { addToast } = useToast();

  const handleCreate = () => { setSelectedItem(null); setDrawerOpen(true); };
  const handleEdit = (item: Entity) => { setSelectedItem(item); setDrawerOpen(true); };

  const handleToggleStatus = (item: Entity) => {
    const isActivating = !item.isActive;
    setConfirmDialog({
      isOpen: true,
      title: isActivating ? 'Activate ${entity.singular}' : 'Deactivate ${entity.singular}',
      description: \`Are you sure you want to \${isActivating ? 'activate' : 'deactivate'} \${item.name}?\`,
      intent: isActivating ? 'primary' : 'danger',
      onConfirm: async () => {
        setData(data.map(d => d.id === item.id ? { ...d, isActive: isActivating } : d));
        addToast({ title: \`${entity.singular} \${isActivating ? 'activated' : 'deactivated'}\`, variant: 'success' });
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const columns = useMemo<ColumnDef<Entity>[]>(() => [
${entity.fields.map(f => `    { accessorKey: '${f.name}', header: '${f.label}' },`).join('\n')}
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => (
        <StatusBadge status={row.original.isActive ? 'active' : 'inactive'}>
          {row.original.isActive ? 'Active' : 'Inactive'}
        </StatusBadge>
      )
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
              id: 'toggle', 
              label: row.original.isActive ? 'Deactivate' : 'Activate', 
              icon: row.original.isActive ? <Ban size={14} /> : <CheckCircle size={14} />,
              danger: row.original.isActive,
              onClick: () => handleToggleStatus(row.original)
            },
          ]}
        />
      )
    }
  ], [data]);

  return (
    <div>
      <PageHeader
        title="${entity.title} Master Data"
        description="${entity.description}"
        breadcrumbs={[{ label: 'Master Data' }, { label: '${entity.title}' }]}
        actions={<Button variant="primary" onClick={handleCreate} leftIcon={<Plus size={16} />}>Create ${entity.singular}</Button>}
      />
      <DataTable columns={columns} data={data} searchable searchField="name" />

      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedItem ? 'Edit ${entity.singular}' : 'Create ${entity.singular}'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => { setDrawerOpen(false); addToast({ title: 'Saved successfully', variant: 'success' }); }}>Save</Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
${entity.fields.map(f => `          <FormField label="${f.label}" required><Input defaultValue={selectedItem?.${f.name} || ''} /></FormField>`).join('\n')}
        </div>
      </Drawer>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        description={confirmDialog.description}
        intent={confirmDialog.intent}
      />
    </div>
  );
}
`;

entities.forEach(entity => {
  const dirPath = path.join(basePath, entity.folder);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  fs.writeFileSync(path.join(dirPath, 'page.tsx'), template(entity));
});

console.log('Master data scaffolding complete.');
