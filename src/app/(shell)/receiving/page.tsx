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
import { Plus, MoreVertical, Eye, AlertTriangle, CheckCircle, MessageCircle, ClipboardCheck, Check, DollarSign, Download } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { getReceivings, createReceiving, getFarmerRecap } from '@/actions/receiving';
import { getFarmers, getRawMaterials } from '@/actions/master';
import type { DbReceiving } from '@/types/database';

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
  const [farmers, setFarmers] = useState<{ id: string; name: string; phone_number?: string | null; supplier_type?: string | null }[]>([]);
  const [rawMaterials, setRawMaterials] = useState<{ id: string; name: string; code: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'selesai' | 'rekap'>('selesai');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [viewItem, setViewItem] = useState<DbReceiving | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    variant: 'danger' | 'primary';
    onConfirm: () => void;
  }>({ isOpen: false, title: '', description: '', variant: 'primary', onConfirm: () => {} });
  
  // Recap States
  const [recapData, setRecapData] = useState<any[]>([]);
  const [recapMonth, setRecapMonth] = useState(new Date().getMonth() + 1);
  const [recapYear, setRecapYear] = useState(new Date().getFullYear());
  const [recapFarmerId, setRecapFarmerId] = useState('');
  const [isLoadingRecap, setIsLoadingRecap] = useState(false);

  const toast = useToast();

  const weightSent = parseFloat(form.weight_sent) || 0;
  const weightReceived = parseFloat(form.weight) || 0;
  const deltaW = weightReceived - weightSent;
  const diffPct = weightSent > 0 ? (deltaW / weightSent) * 100 : 0;
  const isWithinTolerance = Math.abs(diffPct) <= 2;

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const [recRes, farmRes, rmRes] = await Promise.all([
      getReceivings(),
      getFarmers(),
      getRawMaterials(),
    ]);
    if (recRes.success && recRes.data) setData(recRes.data);
    if (farmRes.success) setFarmers(farmRes.data as any);
    if (rmRes.success) setRawMaterials(rmRes.data as any);
    setIsLoading(false);
  }, []);

  const loadRecap = useCallback(async () => {
    setIsLoadingRecap(true);
    const res = await getFarmerRecap(recapMonth, recapYear, recapFarmerId || undefined);
    if (res.success && res.data) setRecapData(res.data);
    setIsLoadingRecap(false);
  }, [recapMonth, recapYear, recapFarmerId]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { if (activeTab === 'rekap') loadRecap(); }, [activeTab, loadRecap]);

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

  const columns = useMemo<ColumnDef<DbReceiving>[]>(() => [
    {
      accessorKey: 'batch_number',
      header: 'No. Penerimaan / Lot',
      cell: ({ row }) => (
        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--color-primary-600)' }}>
          {row.original.batch_number}
        </span>
      ),
    },
    {
      id: 'farmer_name',
      header: 'Petani / Pemasok',
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

  const recapColumns = useMemo<ColumnDef<any>[]>(() => [
    { accessorKey: 'farmer_name', header: 'Petani / Supplier' },
    { 
      accessorKey: 'supplier_type', 
      header: 'Kategori', 
      cell: ({ row }) => {
        const t = row.original.supplier_type;
        return <StatusBadge status={t === 'FARMER_MAIN' ? 'warning' : t === 'EXTERNAL_SUPPLIER' ? 'info' : 'success'} label={t === 'FARMER_MAIN' ? 'Mitra Besar' : t === 'EXTERNAL_SUPPLIER' ? 'Supplier Eksternal' : 'Petani Mikro'} />
      } 
    },
    { accessorKey: 'total_frequency', header: 'Total Frekuensi' },
    { accessorKey: 'total_weight', header: 'Total Berat (kg)', cell: ({ row }) => <strong>{row.original.total_weight.toFixed(2)} kg</strong> },
    { accessorKey: 'price_per_kg', header: 'Tarif / kg', cell: ({ row }) => `Rp ${row.original.price_per_kg.toLocaleString('id-ID')}` },
    { accessorKey: 'total_payment', header: 'Total Hak Bayar', cell: ({ row }) => <strong style={{ color: 'var(--color-primary-600)' }}>Rp {row.original.total_payment.toLocaleString('id-ID')}</strong> },
  ], []);

  return (
    <div>
      <PageHeader
        title="Penerimaan Bahan Baku"
        description="Catat penerimaan jamur dari petani mitra. Nota timbangan otomatis terkirim via WhatsApp."
        breadcrumbs={[{ label: 'Operasional' }, { label: 'Penerimaan BB' }]}
      />

      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 'var(--space-2)' }}>
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
          Riwayat Penerimaan
        </button>
        <button
          onClick={() => setActiveTab('rekap')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'none', border: 'none', cursor: 'pointer',
            padding: 'var(--space-2) var(--space-4)',
            fontSize: 'var(--text-md)', fontWeight: 600,
            color: activeTab === 'rekap' ? 'var(--color-primary-600)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'rekap' ? '2px solid var(--color-primary-600)' : '2px solid transparent',
            marginBottom: '-17px'
          }}
        >
          <DollarSign size={18} />
          Rekap Pembayaran Bulanan
        </button>
      </div>

      {activeTab === 'selesai' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="primary" onClick={handleOpenCreate} leftIcon={<Plus size={16} />}>
              Catat Penerimaan Inbound
            </Button>
          </div>
          <DataTable columns={columns} data={data} />
        </div>
      )}

      {activeTab === 'rekap' && (
        <div style={{ background: 'var(--bg-default)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <FormField label="Bulan">
                <select value={recapMonth} onChange={e => setRecapMonth(Number(e.target.value))} style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-default)' }}>
                  {Array.from({length: 12}).map((_, i) => <option key={i+1} value={i+1}>{new Date(2000, i, 1).toLocaleString('id-ID', { month: 'long' })}</option>)}
                </select>
              </FormField>
              <FormField label="Tahun">
                <select value={recapYear} onChange={e => setRecapYear(Number(e.target.value))} style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-default)' }}>
                  {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </FormField>
              <FormField label="Filter Pemasok">
                <select value={recapFarmerId} onChange={e => setRecapFarmerId(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-default)' }}>
                  <option value="">-- Semua Pemasok --</option>
                  {farmers.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </FormField>
            </div>
            <Button variant="secondary" leftIcon={<Download size={16} />} onClick={() => { toast.success('Mengekspor laporan ke Excel...'); }}>
              Export Excel
            </Button>
          </div>
          <DataTable columns={recapColumns} data={recapData} />
        </div>
      )}

      <Modal
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Catat Penerimaan Inbound (Timbang Nyata)"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDrawerOpen(false)}>Batal</Button>
            <Button variant="primary" onClick={handleSave} loading={isSaving}>
              Simpan & Terbitkan Lot
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <FormField label="Sumber Pemasok" required>
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
              <option value="">-- Pilih Pemasok / Petani Mitra --</option>
              {farmers.map(f => {
                const label = f.supplier_type === 'EXTERNAL_SUPPLIER' ? '[MOU Eksternal]' : f.supplier_type === 'FARMER_MAIN' ? '[Mitra Besar]' : '[Petani Mikro]';
                return (
                  <option key={f.id} value={f.id}>
                    {label} {f.name}{f.phone_number ? ` (${f.phone_number})` : ''}
                  </option>
                );
              })}
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
              <div>
                <Input
                  type="number" step="0.1" min="0" placeholder="0.0"
                  value={form.weight_sent}
                  onChange={e => setForm(f => ({ ...f, weight_sent: e.target.value }))}
                />
                {weightSent > 0 && <div style={{ fontSize: '12px', marginTop: '4px', color: 'var(--text-secondary)' }}>Kira-kira {weightSent * 10} ons</div>}
              </div>
            </FormField>
            <FormField label="Berat Timbang Aktual (kg)" required>
              <div>
                <Input
                  type="number" step="0.1" min="0" placeholder="0.0"
                  value={form.weight}
                  onChange={e => setForm(f => ({ ...f, weight: e.target.value }))}
                />
                {weightReceived > 0 && <div style={{ fontSize: '12px', marginTop: '4px', color: 'var(--text-secondary)' }}>Kira-kira {weightReceived * 10} ons</div>}
              </div>
            </FormField>
          </div>

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
            Nota penerimaan (Lot Number) akan diterbitkan setelah disimpan.
          </div>
        </div>
      </Modal>

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
