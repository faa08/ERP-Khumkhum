'use client';

import React, { useMemo } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/data-table/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { ColumnDef } from '@tanstack/react-table';

interface AuditRecord {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  module: string;
  oldValue: string;
  newValue: string;
}

const MOCK_AUDIT_DATA: AuditRecord[] = [
  { id: '1', timestamp: '2026-08-05 08:30:00', user: 'Admin User', action: 'Login', module: 'Auth', oldValue: '-', newValue: '-' },
  { id: '2', timestamp: '2026-08-05 09:15:22', user: 'Operator A', action: 'Create', module: 'Receiving', oldValue: '-', newValue: 'Batch RCV-001' },
  { id: '3', timestamp: '2026-08-05 10:45:11', user: 'Manager B', action: 'Status Change', module: 'Production', oldValue: 'Pending', newValue: 'In Progress' },
  { id: '4', timestamp: '2026-08-05 11:20:05', user: 'QC Inspector', action: 'Update', module: 'QC', oldValue: 'Passed: 95%', newValue: 'Passed: 98%' },
  { id: '5', timestamp: '2026-08-05 13:05:40', user: 'Admin User', action: 'Delete', module: 'Master Data', oldValue: 'Product X', newValue: '-' },
];

export default function AuditLogPage() {
  const columns = useMemo<ColumnDef<AuditRecord>[]>(() => [
    { accessorKey: 'timestamp', header: 'Timestamp' },
    { accessorKey: 'user', header: 'User' },
    {
      accessorKey: 'action',
      header: 'Action',
      cell: ({ row }) => {
        const action = row.original.action;
        let status = 'neutral';
        if (action === 'Create') status = 'success';
        if (action === 'Delete') status = 'danger';
        if (action === 'Update' || action === 'Status Change') status = 'info';
        return <StatusBadge status={status} label={action} />;
      }
    },
    { accessorKey: 'module', header: 'Module' },
    { accessorKey: 'oldValue', header: 'Old Value' },
    { accessorKey: 'newValue', header: 'New Value' },
  ], []);

  return (
    <div>
      <PageHeader
        title="Audit Log"
        description="Track all important activities and data modifications in the system."
        breadcrumbs={[{ label: 'System' }, { label: 'Settings', href: '/settings' }, { label: 'Audit Log' }]}
        actions={<Button variant="secondary" leftIcon={<Download size={16} />}>Export Log</Button>}
      />
      
      <DataTable
        columns={columns}
        data={MOCK_AUDIT_DATA}
      />
    </div>
  );
}
