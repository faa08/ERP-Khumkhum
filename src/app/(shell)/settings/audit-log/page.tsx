'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/data-table/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Download, RefreshCw, FileText, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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

  const handleExportExcel = async () => {
    if (logs.length === 0) {
      toast.error('Tidak ada data audit untuk diekspor');
      return;
    }

    try {
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Jejak Audit');

      // Add Title
      sheet.mergeCells('A1:G1');
      const titleCell = sheet.getCell('A1');
      titleCell.value = 'LAPORAN JEJAK AUDIT (AUDIT LOG)';
      titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F447E' } };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

      // Add Date Info
      sheet.mergeCells('A2:G2');
      const dateCell = sheet.getCell('A2');
      dateCell.value = `Tanggal Diekspor: ${formatDateTime(new Date().toISOString())}`;
      dateCell.font = { name: 'Arial', size: 10, italic: true };
      dateCell.alignment = { horizontal: 'right' };

      sheet.addRow([]); // spacing

      // Define Columns
      sheet.columns = [
        { header: 'No', key: 'no', width: 5 },
        { header: 'Waktu Aktivitas', key: 'waktu', width: 22 },
        { header: 'Nama Pengguna', key: 'user', width: 25 },
        { header: 'Peran (Role)', key: 'role', width: 18 },
        { header: 'Aksi', key: 'aksi', width: 15 },
        { header: 'Modul', key: 'modul', width: 20 },
        { header: 'Detail Lengkap', key: 'detail', width: 60 }
      ];

      // Style Header Row
      const headerRow = sheet.getRow(4);
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2980B9' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'thin' }, left: { style: 'thin' },
          bottom: { style: 'thin' }, right: { style: 'thin' }
        };
      });

      // Add Rows
      logs.forEach((log, index) => {
        const row = sheet.addRow({
          no: index + 1,
          waktu: log.timestamp,
          user: log.user,
          role: log.userRole,
          aksi: log.action,
          modul: log.module,
          detail: log.details
        });

        const isEven = index % 2 === 0;
        row.eachCell((cell, colNumber) => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFEEEEEE' } },
            bottom: { style: 'thin', color: { argb: 'FFEEEEEE' } },
            left: { style: 'thin', color: { argb: 'FFEEEEEE' } },
            right: { style: 'thin', color: { argb: 'FFEEEEEE' } }
          };
          if (isEven) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F8FC' } };
          }
          
          if (colNumber === 5) {
            cell.font = { bold: true };
            if (['CREATE', 'LOGIN'].includes(log.action)) cell.font.color = { argb: 'FF27AE60' };
            if (['DELETE', 'REJECT'].includes(log.action)) cell.font.color = { argb: 'FFC0392B' };
            if (['UPDATE', 'APPROVE'].includes(log.action)) cell.font.color = { argb: 'FF2980B9' };
          }
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `Audit_Log_KhumKhum_${new Date().toISOString().slice(0, 10)}.xlsx`;
      anchor.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Log audit berhasil diunduh (Excel Rapih)');
    } catch (err) {
      console.error(err);
      toast.error('Gagal mengekspor Excel, mohon coba lagi');
    }
  };

  const handleExportPDF = () => {
    if (logs.length === 0) {
      toast.error('Tidak ada data audit untuk diekspor');
      return;
    }

    const doc = new jsPDF('landscape');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // --- SLIDE 1: COVER & EXECUTIVE SUMMARY ---
    // Background Split: Left Dark Blue, Right White
    doc.setFillColor(15, 68, 126);
    doc.rect(0, 0, pageWidth * 0.35, pageHeight, 'F');
    
    // Left side content (Title)
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(36);
    doc.text('LAPORAN', 20, 70);
    doc.text('AUDIT', 20, 85);
    doc.text('INTERNAL', 20, 100);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.text('ERP KhumKhum', 20, 120);
    doc.text(`Tanggal: ${formatDateTime(new Date().toISOString())}`, 20, 130);

    // Right side content (Summary Stats)
    doc.setTextColor(51, 51, 51);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('Ringkasan Eksekutif', pageWidth * 0.40, 50);

    // Calculate stats
    const totalLogs = logs.length;
    const actionsCount: Record<string, number> = {};
    const usersCount: Record<string, number> = {};
    logs.forEach(l => {
      actionsCount[l.action] = (actionsCount[l.action] || 0) + 1;
      usersCount[l.user] = (usersCount[l.user] || 0) + 1;
    });

    const topUser = Object.keys(usersCount).sort((a,b) => usersCount[b] - usersCount[a])[0] || '-';

    // Stats Cards function
    const drawStatCard = (x: number, y: number, title: string, value: string, highlightColor: number[]) => {
      doc.setFillColor(245, 248, 252);
      doc.roundedRect(x, y, 70, 35, 3, 3, 'F');
      
      doc.setFillColor(highlightColor[0], highlightColor[1], highlightColor[2]);
      doc.rect(x, y, 5, 35, 'F');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(title, x + 12, y + 12);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(15, 68, 126);
      doc.text(value, x + 12, y + 25);
    };

    drawStatCard(pageWidth * 0.40, 70, 'Total Aktivitas', `${totalLogs} Entri`, [15, 68, 126]);
    drawStatCard(pageWidth * 0.40 + 75, 70, 'Pengguna Teraktif', topUser.substring(0, 15), [46, 204, 113]);
    drawStatCard(pageWidth * 0.40, 115, 'Aksi Berisiko (DELETE)', `${actionsCount['DELETE'] || 0} Insiden`, [231, 76, 60]);
    drawStatCard(pageWidth * 0.40 + 75, 115, 'Sistem Login', `${actionsCount['LOGIN'] || 0} Sesi`, [52, 152, 219]);

    // --- SLIDE 2+: DETAIL AKTIVITAS (Card Layout) ---
    const itemsPerPage = 4;
    for (let i = 0; i < logs.length; i += itemsPerPage) {
      doc.addPage();
      
      // Header for content pages
      doc.setFillColor(15, 68, 126);
      doc.rect(0, 0, pageWidth, 25, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Daftar Rincian Aktivitas Sistem', 15, 16);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Halaman ${doc.getCurrentPageInfo().pageNumber}`, pageWidth - 20, 16, { align: 'right' });

      let startY = 35;
      const slice = logs.slice(i, i + itemsPerPage);
      
      slice.forEach((log) => {
        // Card Background
        doc.setFillColor(250, 250, 250);
        doc.setDrawColor(220, 220, 220);
        doc.roundedRect(15, startY, pageWidth - 30, 35, 2, 2, 'FD');

        // Action Accent Color
        let badgeColor = [149, 165, 166];
        if (['CREATE', 'LOGIN'].includes(log.action)) badgeColor = [46, 204, 113];
        if (['DELETE', 'REJECT'].includes(log.action)) badgeColor = [231, 76, 60];
        if (['UPDATE', 'APPROVE'].includes(log.action)) badgeColor = [52, 152, 219];
        
        doc.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2]);
        doc.rect(15, startY, 4, 35, 'F');

        // Date
        doc.setTextColor(150, 150, 150);
        doc.setFontSize(9);
        doc.text(log.timestamp, 25, startY + 8);
        
        // User & Role
        doc.setTextColor(51, 51, 51);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(log.user, 25, startY + 16);
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(log.userRole, 25, startY + 22);

        // Action Badge
        doc.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2]);
        doc.roundedRect(90, startY + 12, 26, 7, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text(log.action, 103, startY + 17, { align: 'center' });

        // Module & Details
        doc.setTextColor(51, 51, 51);
        doc.setFontSize(10);
        doc.text(`[${log.module}]`, 125, startY + 16);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        let detailText = log.details;
        if (detailText.length > 95) detailText = detailText.substring(0, 95) + '...';
        doc.text(detailText, 125, startY + 24);

        startY += 40;
      });
    }

    doc.save(`Laporan_Audit_Presentasi_${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success('Laporan Audit (Format Presentasi) berhasil diunduh!');
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
              CSV
            </Button>
            <Button
              variant="secondary"
              leftIcon={<FileSpreadsheet size={16} />}
              onClick={handleExportExcel}
            >
              Excel
            </Button>
            <Button
              variant="secondary"
              leftIcon={<FileText size={16} />}
              onClick={handleExportPDF}
            >
              PDF
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
