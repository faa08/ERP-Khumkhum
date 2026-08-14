'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/data-table/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Download, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { ColumnDef } from '@tanstack/react-table';
import { getAuditLogsAction } from '@/actions/audit';
import type { DbAuditLog } from '@/types/database';
import { formatDateTime } from '@/lib/utils';
import { useToast } from '@/hooks/useToast';

interface AuditRow {
  id: string;
  timestamp: string;
  user: string;
  userRole: string;
  action: string;
  module: string;
  details: string;
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAuditLogsAction({ limit: 150 });
      if (res.success && res.data) {
        const mapped: AuditRow[] = res.data.map((l) => ({
          id: l.id,
          timestamp: formatDateTime(l.created_at),
          user: l.user?.name || l.user?.email || 'Sistem / Anonim',
          userRole: l.user?.role || '-',
          action: l.action,
          module: l.entity_type || 'System',
          details: l.details ? JSON.stringify(l.details) : '-',
        }));
        setLogs(mapped);
      } else {
        toast.error(res.error || 'Gagal memuat log audit');
      }
    } catch {
      toast.error('Terjadi kesalahan saat memuat data log audit');
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleExportCSV = () => {
    if (logs.length === 0) {
      toast.error('Tidak ada data audit untuk diekspor');
      return;
    }

    const headers = ['ID', 'Waktu', 'Pengguna', 'Role', 'Aksi', 'Modul', 'Detail'];
    const csvContent = [
      headers.join(','),
      ...logs.map((row) =>
        [
          `"${row.id}"`,
          `"${row.timestamp}"`,
          `"${row.user}"`,
          `"${row.userRole}"`,
          `"${row.action}"`,
          `"${row.module}"`,
          `"${row.details.replace(/"/g, '""')}"`,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Audit_Log_KhumKhum_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Log audit berhasil diunduh (CSV)');
  };

  const columns = useMemo<ColumnDef<AuditRow>[]>(
    () => [
      {
        accessorKey: 'timestamp',
        header: 'Waktu Aktivitas',
      },
      {
        accessorKey: 'user',
        header: 'Pengguna',
        cell: ({ row }) => (
          <div>
            <div style={{ fontWeight: 'var(--font-medium)' }}>{row.original.user}</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
              {row.original.userRole}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'action',
        header: 'Jenis Aksi',
        cell: ({ row }) => {
          const action = row.original.action;
          let status = 'neutral';
          if (action === 'CREATE' || action === 'LOGIN') status = 'success';
          if (action === 'DELETE' || action === 'REJECT') status = 'danger';
          if (action === 'UPDATE' || action === 'APPROVE') status = 'info';
          if (action === 'LOGOUT') status = 'warning';
          return <StatusBadge status={status} label={action} />;
        },
      },
      {
        accessorKey: 'module',
        header: 'Modul / Entitas',
      },
      {
        accessorKey: 'details',
        header: 'Rincian Perubahan',
        cell: ({ row }) => (
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: 'var(--text-xs)',
              color: 'var(--text-secondary)',
              maxWidth: '300px',
              display: 'inline-block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={row.original.details}
          >
            {row.original.details}
          </span>
        ),
      },
    ],
    []
  );

  return (
    <div>
      <PageHeader
        title="Jejak Audit (Audit Log)"
        description="Rekaman riwayat seluruh aktivitas pengguna dan mutasi data dalam sistem ERP secara abadi."
        breadcrumbs={[
          { label: 'Sistem' },
          { label: 'Pengaturan', href: '/settings' },
          { label: 'Audit Log' },
        ]}
        actions={
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Button
              variant="secondary"
              leftIcon={<RefreshCw size={16} />}
              onClick={fetchLogs}
              loading={loading}
            >
              Segarkan
            </Button>
            <Button
              variant="secondary"
              leftIcon={<Download size={16} />}
              onClick={handleExportCSV}
            >
              Ekspor CSV
            </Button>
          </div>
        }
      />

      <DataTable
        columns={columns}
        data={logs}
        isLoading={loading}
      />
    </div>
  );
}
