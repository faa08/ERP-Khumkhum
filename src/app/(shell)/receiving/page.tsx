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
import { Plus, MoreVertical, Eye, Leaf, AlertTriangle, CheckCircle, MessageCircle, Sprout, ClipboardCheck } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { getReceivings, createReceiving, getInboundEstimates } from '@/actions/receiving';
import { getFarmers, getRawMaterials } from '@/actions/master';
import type { DbReceiving, DbFarmerHarvestEstimate } from '@/types/database';

interface FormState {
  farmer_id: string;
  raw_material_id: string;
  weight_sent: string;
  weight: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  farmer_id: '',
  raw_material_id: '',
  weight_sent: '',
  weight: '',
  notes: '',
};

export default function ReceivingPage() {
  const [data, setData] = useState<DbReceiving[]>([]);
  const [farmers, setFarmers] = useState<{ id: string; name: string; phone_number?: string | null }[]>([]);
  const [rawMaterials, setRawMaterials] = useState<{ id: string; name: string; code: string }[]>([]);
  const [inboundEstimates, setInboundEstimates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'menunggu' | 'selesai'>('menunggu');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [viewItem, setViewItem] = useState<DbReceiving | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
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
    const [recRes, farmRes, rmRes, estRes] = await Promise.all([
      getReceivings(),
      getFarmers(),
      getRawMaterials(),
      getInboundEstimates(),
    ]);
    if (recRes.success && recRes.data) setData(recRes.data);
    if (farmRes.success) setFarmers(farmRes.data as any);
    if (rmRes.success) setRawMaterials(rmRes.data as any);
    if (estRes.success && estRes.estimates) setInboundEstimates(estRes.estimates);
    setIsLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Handlers ────────────────────────────────────────────────────
  const handleOpenCreate = () => { setForm(EMPTY_FORM); setDrawerOpen(true); };

  const handleSave = async () => {
    if (!form.farmer_id || !form.raw_material_id || !form.weight_sent || !form.weight) {
      toast.error('Lengkapi semua field yang wajib diisi');
      return;
    }
    setIsSaving(true);
    const res = await createReceiving({
      farmer_id: form.farmer_id,
      raw_material_id: form.raw_material_id,
      weight_sent: parseFloat(form.weight_sent),
      weight: parseFloat(form.weight),
      notes: form.notes || undefined,
    });
    setIsSaving(false);
    if (res.success) {
      toast.success('Penerimaan berhasil dicatat! Nota WA terkirim ke petani.');
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
      header: 'Selisih %',
      cell: ({ row }) => {
        const pct = row.original.diff_percentage;
        if (pct == null) return '-';
        const ok = Math.abs(pct) <= 2;
        return (
          <span style={{
            color: ok ? 'var(--color-success-600)' : 'var(--color-danger-600)',
            fontWeight: 600,
          }}>
            {pct > 0 ? '+' : ''}{pct.toFixed(2)}%
            {ok ? ' ✓' : ' ⚠'}
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
      id: 'date',
      header: 'Tanggal',
      cell: ({ row }) => format(new Date(row.original.received_date), 'dd/MM/yyyy HH:mm'),
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <Dropdown
          trigger={<Button variant="ghost" size="sm" style={{ padding: '0 8px' }}><MoreVertical size={16} /></Button>}
          items={[
            { id: 'view', label: 'Lihat Detail', icon: <Eye size={14} />, onClick: () => handleView(row.original) },
          ]}
        />
      ),
    },
  ], []);

  const estimateColumns = useMemo<ColumnDef<any>[]>(() => [
    {
      id: 'farmer_name',
      header: 'Petani Mitra',
      cell: ({ row }) => row.original.farmer?.name || row.original.farmer_id || '-',
    },
    {
      accessorKey: 'expected_date',
      header: 'Rencana Kedatangan',
      cell: ({ row }) => format(new Date(row.original.expected_date), 'dd MMM yyyy', { locale: idLocale }),
    },
    {
      accessorKey: 'estimated_kg',
      header: 'Estimasi Kiriman',
      cell: ({ row }) => <strong>{row.original.estimated_kg} kg</strong>,
    },
    {
      accessorKey: 'source',
      header: 'Sumber',
      cell: ({ row }) => <StatusBadge status={row.original.source === 'WA_BOT' ? 'success' : 'info'} label={row.original.source === 'WA_BOT' ? 'WhatsApp' : 'Manual'} />,
    },
    {
      id: 'actions',
      header: 'Aksi',
      cell: ({ row }) => (
        <Button 
          variant="primary" 
          size="sm" 
          onClick={() => {
            setForm(f => ({
              ...f,
              farmer_id: row.original.farmer_id,
              weight_sent: String(row.original.estimated_kg),
            }));
            toast.info(`Data otomatis diisi untuk ${row.original.farmer?.name || 'Petani'}`);
            setDrawerOpen(true);
          }}
        >
          Terima Barang
        </Button>
      ),
    },
  ], [toast]);

  return (
    <div>
      <PageHeader
        title="Penerimaan Bahan Baku"
        description="Catat penerimaan jamur dari petani mitra. Nota timbangan otomatis terkirim via WhatsApp."
        breadcrumbs={[{ label: 'Operasional' }, { label: 'Penerimaan BB' }]}
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
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Rencana Pasokan Hari Ini</h3>
            <Button variant="secondary" onClick={handleOpenCreate} leftIcon={<Plus size={16} />}>
              Catat Penerimaan Manual
            </Button>
          </div>
          <DataTable columns={estimateColumns} data={inboundEstimates} />
        </div>
      )}

      {activeTab === 'selesai' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="primary" onClick={handleOpenCreate} leftIcon={<Plus size={16} />}>
              Catat Penerimaan Manual
            </Button>
          </div>
          <DataTable columns={columns} data={data} />
        </div>
      )}

      {/* ── CREATE DRAWER ── */}
      <Modal
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Catat Penerimaan Bahan Baku"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDrawerOpen(false)}>Batal</Button>
            <Button variant="primary" onClick={handleSave} loading={isSaving}>
              Simpan & Kirim Nota WA
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Selection removed, handled directly via button on row */}

          <FormField label="Petani Mitra" required>
            <select
              value={form.farmer_id}
              onChange={e => setForm(f => ({ ...f, farmer_id: e.target.value }))}
              style={{
                width: '100%', padding: 'var(--space-2) var(--space-3)',
                border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)',
                background: 'var(--bg-default)', color: 'var(--text-primary)',
                fontSize: 'var(--text-sm)',
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

          <FormField label="Bahan Baku" required>
            <select
              value={form.raw_material_id}
              onChange={e => setForm(f => ({ ...f, raw_material_id: e.target.value }))}
              style={{
                width: '100%', padding: 'var(--space-2) var(--space-3)',
                border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)',
                background: 'var(--bg-default)', color: 'var(--text-primary)',
                fontSize: 'var(--text-sm)',
              }}
            >
              <option value="">-- Pilih Bahan Baku --</option>
              {rawMaterials.map(rm => (
                <option key={rm.id} value={rm.id}>{rm.name} ({rm.code})</option>
              ))}
            </select>
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

          <FormField label="Catatan (Opsional)">
            <Input
              placeholder="Catatan tambahan..."
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </FormField>

          <div style={{
            padding: 'var(--space-3)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-primary-50)',
            border: '1px solid var(--color-primary-200)',
            display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
            fontSize: 'var(--text-sm)', color: 'var(--color-primary-700)',
          }}>
            <MessageCircle size={14} />
            Nota timbangan akan otomatis terkirim ke WhatsApp petani setelah disimpan.
          </div>
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
