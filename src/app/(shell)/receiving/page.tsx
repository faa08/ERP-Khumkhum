'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/data-table/DataTable';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Dropdown } from '@/components/ui/Dropdown';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/form/FormField';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { Plus, MoreVertical, Eye, Leaf, AlertTriangle, CheckCircle, MessageCircle, Sprout, ClipboardCheck, Check, Trash2, Edit2 } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { ImportExcelModal } from '@/components/ui/ImportExcelModal';
import { Download } from 'lucide-react';
import { getReceivings, createReceiving, updateReceiving, deleteReceiving, getInboundEstimates } from '@/actions/receiving';
import { getFarmers, getRawMaterials } from '@/actions/master';
import { supabase } from '@/lib/supabase';
import type { DbReceiving, DbWhatsAppMessage } from '@/types/database';

function getCurrentDateTimeLocal(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 16);
}

interface FormState {
  farmer_id: string;
  raw_material_id: string;
  weight_sent: string;
  weight: string;
  notes: string;
  received_date: string;
  correction_reason?: string;
}

const EMPTY_FORM: FormState = {
  farmer_id: '',
  raw_material_id: '',
  weight_sent: '',
  weight: '',
  notes: '',
  received_date: '',
  correction_reason: '',
};

export default function ReceivingPage() {
  const { user } = useAuth();
  const isManagement = user?.role === 'MANAGEMENT';

  const [data, setData] = useState<DbReceiving[]>([]);
  const [farmers, setFarmers] = useState<{ id: string; name: string; phone_number?: string | null }[]>([]);
  const [rawMaterials, setRawMaterials] = useState<{ id: string; name: string; code: string }[]>([]);
  const [draftEstimates, setDraftEstimates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'menunggu' | 'selesai'>('menunggu');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewItem, setViewItem] = useState<DbReceiving | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  // Import state
  const [importOpen, setImportOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean; title: string; description: string;
    onConfirm: () => void; variant: 'danger' | 'primary';
  }>({ isOpen: false, title: '', description: '', onConfirm: () => {}, variant: 'primary' });

  const toast = useToast();

  // ── Kalkulasi live ──────────────────────────────────────────────
  const weightSent = parseFloat(form.weight_sent) || 0;
  const weightReceived = parseFloat(form.weight) || 0;
  const deltaW = weightReceived - weightSent;
  const diffPct = weightSent > 0 ? (deltaW / weightSent) * 100 : 0;
  const isWithinTolerance = Math.abs(diffPct) <= 2;

  // ── Load data ───────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setIsLoading(true);
    const [recRes, farmRes, rmRes, draftRes] = await Promise.all([
      getReceivings(),
      getFarmers(),
      getRawMaterials(),
      getInboundEstimates(),
    ]);
    if (recRes.success && recRes.data) setData(recRes.data);
    if (farmRes.success) setFarmers(farmRes.data as any);
    if (rmRes.success) setRawMaterials(rmRes.data as any);
    if (draftRes.success && draftRes.estimates) setDraftEstimates(draftRes.estimates);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();

    // Supabase Realtime Subscription
    const channel = supabase
      .channel('receiving_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'receivings' }, () => {
        loadData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'farmer_harvest_estimates' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  // ── Handlers ────────────────────────────────────────────────────
  const handleOpenCreate = () => {
    setEditId(null);
    setForm({ ...EMPTY_FORM, received_date: getCurrentDateTimeLocal() });
    setDrawerOpen(true);
  };

  const handleOpenEdit = (item: DbReceiving) => {
    setEditId(item.id);
    let rDate = '';
    if (item.received_date) {
      // Ensure format is YYYY-MM-DDThh:mm for datetime-local
      rDate = new Date(item.received_date).toISOString().slice(0, 16);
    }
    setForm({
      farmer_id: item.farmer_id || '',
      raw_material_id: item.raw_material_id || '',
      weight_sent: item.weight_sent != null ? String(item.weight_sent) : '',
      weight: item.weight != null ? String(item.weight) : '',
      notes: item.notes || '',
      received_date: rDate,
      correction_reason: '',
    });
    setDrawerOpen(true);
  };

  const handleSave = async () => {
    const jamurMaterial = rawMaterials.find(rm => rm.name.toLowerCase().includes('jamur') || rm.code === 'JMR-TRM');
    const finalRawMaterialId = form.raw_material_id || jamurMaterial?.id;
    
    if (!form.farmer_id || !finalRawMaterialId || !form.weight_sent || !form.weight) {
      toast.error('Lengkapi semua field yang wajib diisi');
      return;
    }
    
    if (editId && !form.correction_reason?.trim()) {
      toast.error('Alasan revisi wajib diisi');
      return;
    }
    
    setIsSaving(true);
    let res;
    if (editId) {
      res = await updateReceiving({
        id: editId,
        weight: parseFloat(form.weight),
        weight_sent: parseFloat(form.weight_sent),
        notes: form.notes || undefined,
        correction_reason: form.correction_reason || 'Revisi data',
        received_date: form.received_date || undefined,
      });
    } else {
      res = await createReceiving({
        farmer_id: form.farmer_id,
        raw_material_id: finalRawMaterialId,
        weight_sent: parseFloat(form.weight_sent),
        weight: parseFloat(form.weight),
        notes: form.notes || undefined,
        received_date: form.received_date || undefined,
      });
    }
    setIsSaving(false);
    
    if (res.success) {
      toast.success(editId ? 'Revisi penerimaan berhasil disimpan!' : 'Penerimaan berhasil dicatat! Nota WA terkirim ke petani.');
      setDrawerOpen(false);
      loadData();
    } else {
      toast.error(res.error || 'Gagal menyimpan');
    }
  };



  const handleView = (item: DbReceiving) => { setViewItem(item); setViewOpen(true); };

  // ── Columns ─────────────────────────────────────────────────────
  const columns = useMemo<ColumnDef<DbReceiving>[]>(() => [
    {
      accessorKey: 'batch_number',
      header: 'No. Penerimaan',
      cell: ({ row }) => (
        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--color-primary-600)' }}>
          {row.original.batch_number}
        </span>
      ),
    },
    {
      id: 'farmer_name',
      accessorFn: (row) => row.farmer?.name || row.farmer_id || '-',
      header: 'Petani',
      cell: ({ row }) => row.original.farmer?.name || row.original.farmer_id || '-',
    },
    {
      accessorKey: 'weight_sent',
      header: 'Berat Kirim (kg)',
      cell: ({ row }) => row.original.weight_sent != null ? `${row.original.weight_sent} kg` : '-',
    },
    {
      accessorKey: 'weight',
      header: 'Berat Terima (kg)',
      cell: ({ row }) => <strong>{row.original.weight} kg</strong>,
    },
    {
      id: 'diff',
      accessorFn: (row) => row.diff_percentage || 0,
      header: 'Selisih %',
      cell: ({ row }) => {
        const pct = row.original.diff_percentage;
        if (pct == null) return '-';
        const ok = Math.abs(pct) <= 2;
        return (
          <span style={{
            color: ok ? 'var(--color-success-600)' : 'var(--color-danger-600)',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}>
            <span>{pct > 0 ? '+' : ''}{pct.toFixed(2)}%</span>
            {ok ? (
              <Check className="w-3.5 h-3.5 text-currentColor" aria-hidden="true" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-currentColor" aria-hidden="true" />
            )}
          </span>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={(row.original.status || 'received').toLowerCase()} />,
    },
    {
      accessorKey: 'received_date',
      header: 'Tanggal',
      cell: ({ row }) => format(new Date(row.original.received_date), 'dd/MM/yyyy HH:mm'),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const item = row.original;
        const canEdit = !isManagement && item.status !== 'SORTED';
        const canDelete = !isManagement && item.status !== 'SORTED';
        return (
          <Dropdown
            trigger={<Button variant="ghost" size="sm" style={{ padding: '0 8px' }}><MoreVertical size={16} /></Button>}
            items={[
              { id: 'view', label: 'Lihat Detail', icon: <Eye size={14} aria-hidden="true" />, onClick: () => handleView(item) },
              ...(canEdit ? [
                {
                  id: 'edit',
                  label: 'Revisi Data',
                  icon: <Edit2 size={14} aria-hidden="true" />,
                  onClick: () => handleOpenEdit(item),
                },
              ] : []),
              ...(canDelete ? [
                {
                  id: 'delete',
                  label: 'Hapus Penerimaan',
                  icon: <Trash2 size={14} aria-hidden="true" />,
                  danger: true,
                  onClick: () => {
                    setConfirmDialog({
                      isOpen: true,
                      title: 'Hapus Penerimaan Bahan Baku',
                      description: `Apakah Anda yakin ingin menghapus penerimaan batch ${item.batch_number} dari petani ${item.farmer?.name || '-'}? Data yang dihapus tidak dapat dikembalikan.`,
                      variant: 'danger',
                      onConfirm: async () => {
                        const res = await deleteReceiving(item.id);
                        if (res.success) {
                          toast.success('Penerimaan berhasil dihapus!');
                          setConfirmDialog(p => ({ ...p, isOpen: false }));
                          loadData();
                        } else {
                          toast.error(res.error || 'Gagal menghapus penerimaan');
                        }
                      },
                    });
                  },
                },
              ] : []),
            ]}
          />
        );
      },
    },
  ], [isManagement, loadData]);

  // Handlers for Import
  const handleDownloadTemplate = async () => {
    try {
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Penerimaan');
      
      sheet.columns = [
        { header: 'Nama Petani', key: 'farmer', width: 25 },
        { header: 'Berat Kirim (kg)', key: 'weight_sent', width: 20 },
        { header: 'Berat Terima (kg)', key: 'weight_receive', width: 20 },
        { header: 'Catatan', key: 'notes', width: 30 },
        { header: 'Tanggal', key: 'date', width: 20 },
      ];
      
      sheet.getRow(1).eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
        cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
        cell.alignment = { horizontal: 'center' };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });
      
      sheet.addRow({
        farmer: farmers[0]?.name || 'Contoh Petani',
        weight_sent: 50,
        weight_receive: 48.5,
        notes: 'Jamur sedikit basah',
        date: format(new Date(), 'yyyy-MM-dd')
      });
      
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Template_Penerimaan_KhumKhum.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      toast.error('Gagal membuat template Excel');
    }
  };

  const handleImportData = async (data: any[]) => {
    try {
      const rawMat = rawMaterials.find(rm => rm.name.toLowerCase().includes('jamur tiram')) || rawMaterials[0];
      if (!rawMat) return { success: false, error: 'Bahan baku tidak ditemukan' };
      
      const importedRecords = [];
      for (const row of data) {
        const farmerName = row['Nama Petani'];
        const weightSent = parseFloat(row['Berat Kirim (kg)']);
        const weightReceive = parseFloat(row['Berat Terima (kg)']);
        const notes = row['Catatan'];
        let dateStr = row['Tanggal'];

        // Jika exceljs / xlsx baca tanggal sebagai serial number Excel
        if (typeof dateStr === 'number') {
          const date = new Date(Math.round((dateStr - 25569) * 86400 * 1000));
          dateStr = format(date, 'yyyy-MM-dd');
        }
        
        if (!farmerName) continue;
        const weightSentVal = parseFloat(String(weightSent)) || 0;
        const weightReceiveVal = parseFloat(String(weightReceive)) || 0;
        
        if (isNaN(weightReceiveVal)) continue;
        
        const farmerNameClean = String(farmerName).trim().toLowerCase();
        const farmer = farmers.find(f => f.name.toLowerCase().trim() === farmerNameClean);
        if (!farmer) continue; 
        
        importedRecords.push({
          farmer_id: farmer.id,
          raw_material_id: rawMat.id,
          weight_sent: weightSentVal,
          weight: weightReceiveVal,
          notes: notes || undefined,
          received_date: dateStr ? new Date(dateStr).toISOString() : new Date().toISOString(),
        });
      }
      
      if (importedRecords.length === 0) {
        return { success: false, error: 'Tidak ada data valid yang bisa diimport. Pastikan nama petani sesuai dengan master data.' };
      }
      
      // Simpan satu-satu untuk saat ini
      let successCount = 0;
      for (const record of importedRecords) {
        const res = await createReceiving(record);
        if (res.success) successCount++;
      }
      
      loadData();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const draftColumns = useMemo<ColumnDef<any>[]>(() => [
    {
      id: 'farmer_name',
      header: 'Petani Mitra',
      cell: ({ row }) => row.original.farmer?.name || '-',
    },
    {
      accessorKey: 'estimated_kg',
      header: 'Estimasi Berat',
      cell: ({ row }) => (
        <span style={{ fontWeight: 600 }}>
          {row.original.estimated_kg > 0 ? `${row.original.estimated_kg} kg` : 'Belum diketahui'}
        </span>
      ),
    },
    {
      accessorKey: 'created_at',
      header: 'Waktu Diterima',
      cell: ({ row }) => format(new Date(row.original.created_at), 'dd MMM HH:mm', { locale: idLocale }),
    },
    {
      accessorKey: 'source',
      header: 'Sumber Data',
      cell: ({ row }) => (
        <StatusBadge 
          status={row.original.source === 'WA_BOT' ? 'success' : 'info'} 
          label={row.original.source === 'WA_BOT' ? 'Ekstrak AI (WA)' : 'Manual'} 
        />
      ),
    },
    ...(isManagement ? [] : [{
      id: 'actions',
      header: 'Aksi',
      cell: ({ row }: { row: any }) => {
        const fId = row.original.farmer_id;
        const estKg = row.original.estimated_kg;
        return (
          <Button 
            variant="primary" 
            size="sm" 
            disabled={!fId}
            onClick={() => {
              if (fId) {
                setForm(f => ({
                  ...f,
                  farmer_id: fId,
                  weight_sent: estKg > 0 ? String(estKg) : '',
                  // Auto-select Jamur Tiram Segar as raw material if available
                  raw_material_id: rawMaterials.find(rm => rm.name.toLowerCase().includes('jamur tiram'))?.id || '',
                }));
                toast.info(`Draft terisi otomatis dari chat petani. Silakan masukkan berat aktual.`);
                setDrawerOpen(true);
              }
            }}
          >
            Timbang Sekarang
          </Button>
        );
      },
    }]),
  ], [toast, rawMaterials, isManagement]);

  return (
    <div>
      <PageHeader
        title={isManagement ? "Penerimaan Bahan Baku (Mode Peninjauan Investor)" : "Penerimaan Bahan Baku"}
        description="Catat penerimaan jamur dari petani mitra. Nota timbangan otomatis terkirim via WhatsApp."
        breadcrumbs={[{ label: 'Operasional' }, { label: 'Penerimaan BB' }]}
        actions={isManagement ? (
          <span style={{ 
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '4px 12px', borderRadius: 'var(--radius-full)', 
            background: 'var(--color-primary-50)', color: 'var(--color-primary-700)', 
            fontSize: 'var(--text-xs)', fontWeight: 600, border: '1px solid var(--color-primary-200)' 
          }}>
            Investor / Read-Only Mode
          </span>
        ) : (
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Button 
              variant="secondary" 
              onClick={() => setImportOpen(true)}
              leftIcon={<Download size={16} />}
            >
              Import CSV / Excel
            </Button>
            <Button 
              variant="primary" 
              onClick={handleOpenCreate}
              leftIcon={<Plus size={16} />}
            >
              Tambah Penerimaan
            </Button>
          </div>
        )}
      />

      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 'var(--space-2)' }}>
        <button
          onClick={() => setActiveTab('menunggu')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'none', border: 'none', cursor: 'pointer',
            padding: 'var(--space-2) var(--space-4)',
            fontSize: 'var(--text-md)', fontWeight: 600,
            color: activeTab === 'menunggu' ? 'var(--color-primary-600)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'menunggu' ? '2px solid var(--color-primary-600)' : '2px solid transparent',
            marginBottom: '-17px' // overlapping border
          }}
        >
          <Sprout size={18} />
          Menunggu Kedatangan
        </button>
        <button
          onClick={() => setActiveTab('selesai')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'none', border: 'none', cursor: 'pointer',
            padding: 'var(--space-2) var(--space-4)',
            fontSize: 'var(--text-md)', fontWeight: 600,
            color: activeTab === 'selesai' ? 'var(--color-primary-600)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'selesai' ? '2px solid var(--color-primary-600)' : '2px solid transparent',
            marginBottom: '-17px'
          }}
        >
          <ClipboardCheck size={18} />
          Selesai Dicatat
        </button>
      </div>

      {activeTab === 'menunggu' && (
        <div style={{ background: 'var(--bg-default)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Draft Estimasi (Dari WhatsApp)</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginTop: '4px' }}>Draft otomatis hasil ekstraksi AI dari chat petani.</p>
            </div>
          </div>
          <DataTable columns={draftColumns} data={draftEstimates} />
        </div>
      )}

      {activeTab === 'selesai' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <DataTable columns={columns} data={data} />
        </div>
      )}

      {/* ── CREATE/EDIT DRAWER ── */}
      <Modal
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editId ? "Revisi Penerimaan Bahan Baku" : "Catat Penerimaan Bahan Baku"}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDrawerOpen(false)}>Batal</Button>
            <Button variant="primary" onClick={handleSave} loading={isSaving}>
              {editId ? "Simpan Revisi" : "Simpan & Kirim Nota WA"}
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <FormField label="Petani Mitra" required>
            <select
              value={form.farmer_id}
              onChange={e => setForm(f => ({ ...f, farmer_id: e.target.value }))}
              disabled={!!editId} // Petani tidak bisa diganti jika revisi
              style={{
                width: '100%', padding: 'var(--space-2) var(--space-3)',
                border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)',
                background: !!editId ? 'var(--bg-muted)' : 'var(--bg-default)', 
                color: 'var(--text-primary)',
                fontSize: 'var(--text-sm)',
                cursor: !!editId ? 'not-allowed' : 'default',
              }}
            >
              <option value="">-- Pilih Petani --</option>
              {farmers.map(f => (
                <option key={f.id} value={f.id}>
                  {f.name}{f.phone_number ? ` (${f.phone_number})` : ''}
                </option>
              ))}
            </select>
          </FormField>


          <FormField label="Tanggal & Waktu Penerimaan">
            <Input
              type="datetime-local"
              value={form.received_date}
              onChange={e => setForm(f => ({ ...f, received_date: e.target.value }))}
            />
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: '2px', display: 'block' }}>
              Dapat disesuaikan jika mencatat kiriman jamur yang tiba kemarin atau jam sebelumnya.
            </span>
          </FormField>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <FormField label="Berat Kirim Petani (kg)" required>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={form.weight_sent}
                onChange={e => setForm(f => ({ ...f, weight_sent: e.target.value }))}
              />
            </FormField>
            <FormField label="Berat Timbang Aktual (kg)" required>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={form.weight}
                onChange={e => setForm(f => ({ ...f, weight: e.target.value }))}
              />
            </FormField>
          </div>

          {/* Live Kalkulasi */}
          {weightSent > 0 && weightReceived > 0 && (
            <div style={{
              padding: 'var(--space-3)',
              borderRadius: 'var(--radius-md)',
              background: isWithinTolerance ? 'var(--color-success-50)' : 'var(--color-danger-50)',
              border: `1px solid ${isWithinTolerance ? 'var(--color-success-200)' : 'var(--color-danger-200)'}`,
              display: 'flex', flexDirection: 'column', gap: 'var(--space-1)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontWeight: 600,
                color: isWithinTolerance ? 'var(--color-success-700)' : 'var(--color-danger-700)' }}>
                {isWithinTolerance ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                {isWithinTolerance ? 'Selisih Dalam Toleransi (≤ 2%)' : 'Selisih Melebihi Toleransi (> 2%)'}
              </div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                ΔW = <strong>{deltaW > 0 ? '+' : ''}{deltaW.toFixed(2)} kg</strong>
                &nbsp;|&nbsp; %ΔW = <strong style={{ color: isWithinTolerance ? 'var(--color-success-600)' : 'var(--color-danger-600)' }}>
                  {diffPct > 0 ? '+' : ''}{diffPct.toFixed(2)}%
                </strong>
              </div>
            </div>
          )}

          {editId && (
            <FormField label="Alasan Revisi" required>
              <Input
                placeholder="Contoh: Salah input angka timbangan awal"
                value={form.correction_reason}
                onChange={e => setForm(f => ({ ...f, correction_reason: e.target.value }))}
              />
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-warning-600)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertTriangle size={12} /> Revisi data ini akan tercatat dalam sistem audit.
              </span>
            </FormField>
          )}

          <FormField label="Catatan (Opsional)">
            <Input
              placeholder="Catatan tambahan..."
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </FormField>

          {!editId && (
            <div style={{
              padding: 'var(--space-3)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-primary-50)',
              border: '1px solid var(--color-primary-200)',
              display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
              fontSize: 'var(--text-sm)', color: 'var(--color-primary-700)',
            }}>
              <MessageCircle size={14} />
              Nota timbangan otomatis terkirim ke WhatsApp petani setelah disimpan.
            </div>
          )}
        </div>
      </Modal>

      {/* ── VIEW DRAWER ── */}
      <Modal
        isOpen={viewOpen}
        onClose={() => setViewOpen(false)}
        title={`Detail Penerimaan — ${viewItem?.batch_number}`}
        size="md"
        footer={<Button variant="secondary" onClick={() => setViewOpen(false)}>Tutup</Button>}
      >
        {viewItem && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {[
              { label: 'No. Penerimaan', value: viewItem.batch_number },
              { label: 'Petani', value: viewItem.farmer?.name || '-' },
              { label: 'No. HP Petani', value: viewItem.farmer?.phone_number || '-' },
              { label: 'Berat Kirim', value: viewItem.weight_sent ? `${viewItem.weight_sent} kg` : '-' },
              { label: 'Berat Terima', value: `${viewItem.weight} kg` },
              { label: 'Selisih (ΔW)', value: viewItem.weight_difference != null ? `${viewItem.weight_difference > 0 ? '+' : ''}${viewItem.weight_difference} kg` : '-' },
              { label: 'Selisih (%)', value: viewItem.diff_percentage != null ? `${viewItem.diff_percentage.toFixed(2)}%` : '-' },
              { label: 'Status', value: viewItem.status || 'RECEIVED' },
              { label: 'Tanggal Terima', value: format(new Date(viewItem.received_date), 'dd/MM/yyyy HH:mm') },
              { label: 'Catatan', value: viewItem.notes || '-' },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 'var(--space-2)', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>{row.label}</span>
                <strong style={{ fontSize: 'var(--text-sm)' }}>{row.value}</strong>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <ImportExcelModal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import Data Penerimaan"
        expectedColumns={['Nama Petani', 'Berat Kirim (kg)', 'Berat Terima (kg)']}
        onDownloadTemplate={handleDownloadTemplate}
        onImportData={handleImportData}
      />

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
