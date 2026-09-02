'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/data-table/DataTable';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Dropdown } from '@/components/ui/Dropdown';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/form/FormField';
import { useToast } from '@/hooks/useToast';
import { Plus, MoreVertical, Eye, Edit, CheckCircle, AlertTriangle, MessageCircle } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import {
  getSortings,
  createSorting,
  updateSorting,
  getUnsortedReceivings,
} from '@/actions/sorting';
import type { DbSorting } from '@/types/database';

interface FormState {
  receiving_id: string;
  leaf_weight: string;
  stem_weight: string;
}

const EMPTY_FORM: FormState = { receiving_id: '', leaf_weight: '', stem_weight: '' };

export default function SortingPage() {
  const [data, setData] = useState<DbSorting[]>([]);
  const [unsortedReceivings, setUnsortedReceivings] = useState<
    { id: string; batch_number: string; weight: number; farmer?: { name: string } | null }[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [viewItem, setViewItem] = useState<DbSorting | null>(null);
  const [viewOpen, setViewOpen] = useState(false);

  // State Edit/Koreksi
  const [editItem, setEditItem] = useState<DbSorting | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<{ leaf_weight: string; stem_weight: string }>({ leaf_weight: '', stem_weight: '' });
  const [isUpdating, setIsUpdating] = useState(false);

  const toast = useToast();

  // ── Live kalkulasi ─────────────────────────────────────────────
  const leafW = parseFloat(form.leaf_weight) || 0;
  const stemW = parseFloat(form.stem_weight) || 0;
  const total = leafW + stemW;
  const leafPct = total > 0 ? (leafW / total) * 100 : 0;
  const grade = leafPct >= 80 ? 'A' : leafPct >= 75 ? 'B' : 'C';
  const isStandard = leafPct >= 75;
  const gradeColor = grade === 'A' ? 'var(--color-success-600)' : grade === 'B' ? 'var(--color-warning-600)' : 'var(--color-danger-600)';

  // ── Load data ──────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setIsLoading(true);
    const [sortRes, unsortRes] = await Promise.all([
      getSortings(),
      getUnsortedReceivings(),
    ]);
    if (sortRes.success && sortRes.data) setData(sortRes.data);
    if (unsortRes.success && unsortRes.data) setUnsortedReceivings(unsortRes.data as any);
    setIsLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSave = async () => {
    if (!form.receiving_id || !form.leaf_weight || !form.stem_weight) {
      toast.error('Lengkapi semua field wajib');
      return;
    }
    setIsSaving(true);
    const res = await createSorting({
      receiving_id: form.receiving_id,
      leaf_weight: parseFloat(form.leaf_weight),
      stem_weight: parseFloat(form.stem_weight),
    });
    setIsSaving(false);
    if (res.success) {
      toast.success('Sortasi berhasil dicatat! Info hasil sortasi terkirim ke petani.');
      setDrawerOpen(false);
      setForm(EMPTY_FORM);
      loadData();
    } else {
      toast.error(res.error || 'Gagal menyimpan');
    }
  };

  // ── Live kalkulasi Edit ─────────────────────────────────────────
  const editLeafW = parseFloat(editForm.leaf_weight) || 0;
  const editStemW = parseFloat(editForm.stem_weight) || 0;
  const editTotal = editLeafW + editStemW;
  const editLeafPct = editTotal > 0 ? (editLeafW / editTotal) * 100 : 0;
  const editGrade = editLeafPct >= 80 ? 'A' : editLeafPct >= 75 ? 'B' : 'C';
  const editIsStandard = editLeafPct >= 75;
  const editGradeColor = editGrade === 'A' ? 'var(--color-success-600)' : editGrade === 'B' ? 'var(--color-warning-600)' : 'var(--color-danger-600)';

  const handleOpenEdit = (item: DbSorting) => {
    setEditItem(item);
    setEditForm({
      leaf_weight: (item.leaf_weight != null ? item.leaf_weight : item.accepted_quantity).toString(),
      stem_weight: (item.stem_weight != null ? item.stem_weight : item.waste).toString(),
    });
    setEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!editItem || !editForm.leaf_weight || !editForm.stem_weight) {
      toast.error('Lengkapi berat daun dan batang');
      return;
    }
    setIsUpdating(true);
    const res = await updateSorting({
      id: editItem.id,
      leaf_weight: parseFloat(editForm.leaf_weight),
      stem_weight: parseFloat(editForm.stem_weight),
    });
    setIsUpdating(false);
    if (res.success) {
      toast.success('Data sortasi berhasil dikoreksi! Stok gudang telah disesuaikan.');
      setEditOpen(false);
      setEditItem(null);
      loadData();
    } else {
      toast.error(res.error || 'Gagal mengupdate sortasi');
    }
  };

  // ── Columns ────────────────────────────────────────────────────
  const columns = useMemo<ColumnDef<DbSorting>[]>(() => [
    {
      id: 'receiving_no',
      header: 'No. Penerimaan',
      cell: ({ row }) => (
        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--color-primary-600)' }}>
          {row.original.receiving?.batch_number || row.original.receiving_id}
        </span>
      ),
    },
    {
      id: 'farmer',
      header: 'Petani',
      cell: ({ row }) => (row.original as any).receiving?.farmer?.name || '-',
    },
    {
      id: 'leaf_weight',
      header: 'Berat Daun (kg)',
      cell: ({ row }) => row.original.leaf_weight != null ? `${row.original.leaf_weight} kg` : `${row.original.accepted_quantity} kg`,
    },
    {
      id: 'stem_weight',
      header: 'Berat Batang (kg)',
      cell: ({ row }) => row.original.stem_weight != null ? `${row.original.stem_weight} kg` : `${row.original.waste} kg`,
    },
    {
      id: 'leaf_pct',
      header: '% Daun',
      cell: ({ row }) => {
        const pct = row.original.leaf_percentage;
        if (pct == null) return '-';
        const color = pct >= 80 ? 'var(--color-success-600)' : pct >= 75 ? 'var(--color-warning-600)' : 'var(--color-danger-600)';
        return <strong style={{ color }}>{pct.toFixed(1)}%</strong>;
      },
    },
    {
      id: 'grade',
      header: 'Grade',
      cell: ({ row }) => {
        const g = row.original.quality_grade || '-';
        const color = g === 'A' ? 'var(--color-success-600)' : g === 'B' ? 'var(--color-warning-600)' : g === 'C' ? 'var(--color-danger-600)' : 'var(--text-secondary)';
        return <strong style={{ color }}>Grade {g}</strong>;
      },
    },
    {
      id: 'standard',
      header: 'Status Standar',
      cell: ({ row }) => {
        const ok = row.original.is_standard_compliant;
        if (ok == null) return '-';
        return (
          <span style={{
            color: ok ? 'var(--color-success-600)' : 'var(--color-danger-600)',
            display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500,
          }}>
            {ok ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
            {ok ? 'Lolos (≥75%)' : 'Di Bawah Standar'}
          </span>
        );
      },
    },
    {
      id: 'date',
      header: 'Tanggal',
      cell: ({ row }) => format(new Date(row.original.sorting_date), 'dd/MM/yyyy HH:mm'),
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <Dropdown
          trigger={<Button variant="ghost" size="sm" style={{ padding: '0 8px' }}><MoreVertical size={16} /></Button>}
          items={[
            { id: 'view', label: 'Lihat Detail', icon: <Eye size={14} />, onClick: () => { setViewItem(row.original); setViewOpen(true); } },
            { id: 'edit', label: 'Koreksi / Edit Sortasi', icon: <Edit size={14} />, onClick: () => handleOpenEdit(row.original) },
          ]}
        />
      ),
    },
  ], []);

  return (
    <div>
      <PageHeader
        title="Sortasi & Grading"
        description="Pisahkan berat daun dan batang jamur, hitung % daun, dan assign grade kualitas."
        breadcrumbs={[{ label: 'Operasional' }, { label: 'Sortasi & Grading' }]}
        actions={
          <Button variant="primary" onClick={() => { setForm(EMPTY_FORM); setDrawerOpen(true); }} leftIcon={<Plus size={16} />}>
            Buat Sortasi
          </Button>
        }
      />

      <DataTable columns={columns} data={data} />

      {/* ── CREATE MODAL (POP UP) ── */}
      <Modal
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Form Input Hasil Sortasi & Grading"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDrawerOpen(false)}>Batal</Button>
            <Button variant="primary" onClick={handleSave} loading={isSaving}>Simpan Sortasi</Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <FormField label="No. Penerimaan (Belum Disortasi)" required>
            <select
              value={form.receiving_id}
              onChange={e => setForm(f => ({ ...f, receiving_id: e.target.value }))}
              style={{
                width: '100%', padding: 'var(--space-2) var(--space-3)',
                border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)',
                background: 'var(--bg-default)', color: 'var(--text-primary)', fontSize: 'var(--text-sm)',
              }}
            >
              <option value="">-- Pilih Nomor Penerimaan --</option>
              {unsortedReceivings.map(r => (
                <option key={r.id} value={r.id}>
                  {r.batch_number} — {(r as any).farmer?.name || 'Petani'} ({r.weight} kg)
                </option>
              ))}
            </select>
          </FormField>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <FormField label="Berat Daun / W_daun (kg)" required>
              <Input
                type="number" step="0.01" min="0" placeholder="0.00"
                value={form.leaf_weight}
                onChange={e => setForm(f => ({ ...f, leaf_weight: e.target.value }))}
              />
            </FormField>
            <FormField label="Berat Batang / W_batang (kg)" required>
              <Input
                type="number" step="0.01" min="0" placeholder="0.00"
                value={form.stem_weight}
                onChange={e => setForm(f => ({ ...f, stem_weight: e.target.value }))}
              />
            </FormField>
          </div>

          {/* Live Preview */}
          {total > 0 && (
            <div style={{
              padding: 'var(--space-4)',
              borderRadius: 'var(--radius-md)',
              background: isStandard ? 'var(--color-success-50)' : 'var(--color-danger-50)',
              border: `1px solid ${isStandard ? 'var(--color-success-200)' : 'var(--color-danger-200)'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)', fontWeight: 600,
                color: isStandard ? 'var(--color-success-700)' : 'var(--color-danger-700)' }}>
                {isStandard ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                {isStandard ? 'Lolos Standar (≥ 75%)' : 'Di Bawah Standar (< 75%)'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-3)' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>% Daun</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: gradeColor }}>{leafPct.toFixed(1)}%</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Grade</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: gradeColor }}>Grade {grade}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Total</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{total.toFixed(2)} kg</div>
                </div>
              </div>
              <div style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                Formula: %Daun = W_daun / (W_daun + W_batang) × 100 = {leafW} / ({leafW} + {stemW}) × 100 = {leafPct.toFixed(2)}%
              </div>
            </div>
          )}

          <div style={{
            padding: 'var(--space-3)', borderRadius: 'var(--radius-md)',
            background: 'var(--color-primary-50)', border: '1px solid var(--color-primary-200)',
            display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
            fontSize: 'var(--text-sm)', color: 'var(--color-primary-700)',
          }}>
            <MessageCircle size={14} />
            Info hasil sortasi akan otomatis terkirim ke WhatsApp petani.
          </div>
        </div>
      </Modal>

      {/* ── VIEW MODAL (POP UP) ── */}
      <Modal
        isOpen={viewOpen}
        onClose={() => setViewOpen(false)}
        title="Detail Sortasi"
        size="md"
        footer={<Button variant="secondary" onClick={() => setViewOpen(false)}>Tutup</Button>}
      >
        {viewItem && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {[
              { label: 'No. Penerimaan', value: (viewItem as any).receiving?.batch_number || viewItem.receiving_id },
              { label: 'Petani', value: (viewItem as any).receiving?.farmer?.name || '-' },
              { label: 'Berat Daun', value: viewItem.leaf_weight != null ? `${viewItem.leaf_weight} kg` : `${viewItem.accepted_quantity} kg` },
              { label: 'Berat Batang', value: viewItem.stem_weight != null ? `${viewItem.stem_weight} kg` : `${viewItem.waste} kg` },
              { label: '% Daun', value: viewItem.leaf_percentage != null ? `${viewItem.leaf_percentage.toFixed(2)}%` : '-' },
              { label: 'Grade', value: viewItem.quality_grade || '-' },
              { label: 'Status Standar', value: viewItem.is_standard_compliant != null ? (viewItem.is_standard_compliant ? <span style={{ color: 'var(--color-success-600)', display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle size={14} /> Lolos (≥75%)</span> : <span style={{ color: 'var(--color-danger-600)', display: 'flex', alignItems: 'center', gap: '4px' }}><AlertTriangle size={14} /> Di Bawah Standar</span>) : '-' },
              { label: 'Tanggal Sortasi', value: format(new Date(viewItem.sorting_date), 'dd/MM/yyyy HH:mm') },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 'var(--space-2)', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>{row.label}</span>
                <strong style={{ fontSize: 'var(--text-sm)' }}>{row.value}</strong>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* ── EDIT / KOREKSI MODAL (POP UP) ── */}
      <Modal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        title="Koreksi / Edit Hasil Sortasi"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditOpen(false)}>Batal</Button>
            <Button variant="primary" onClick={handleUpdate} loading={isUpdating}>Simpan Perubahan</Button>
          </>
        }
      >
        {editItem && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{
              padding: 'var(--space-3)', borderRadius: 'var(--radius-md)',
              background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)',
            }}>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Batch Penerimaan</div>
              <div style={{ fontWeight: 600, color: 'var(--color-primary-600)', fontFamily: 'monospace' }}>
                {(editItem as any).receiving?.batch_number || editItem.receiving_id}
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Petani: <strong>{(editItem as any).receiving?.farmer?.name || '-'}</strong>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <FormField label="Berat Daun Baru (kg)" required>
                <Input
                  type="number" step="0.01" min="0" placeholder="0.00"
                  value={editForm.leaf_weight}
                  onChange={e => setEditForm(f => ({ ...f, leaf_weight: e.target.value }))}
                />
              </FormField>
              <FormField label="Berat Batang Baru (kg)" required>
                <Input
                  type="number" step="0.01" min="0" placeholder="0.00"
                  value={editForm.stem_weight}
                  onChange={e => setEditForm(f => ({ ...f, stem_weight: e.target.value }))}
                />
              </FormField>
            </div>

            {/* Live Preview Edit */}
            {editTotal > 0 && (
              <div style={{
                padding: 'var(--space-4)',
                borderRadius: 'var(--radius-md)',
                background: editIsStandard ? 'var(--color-success-50)' : 'var(--color-danger-50)',
                border: `1px solid ${editIsStandard ? 'var(--color-success-200)' : 'var(--color-danger-200)'}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)', fontWeight: 600,
                  color: editIsStandard ? 'var(--color-success-700)' : 'var(--color-danger-700)' }}>
                  {editIsStandard ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                  {editIsStandard ? 'Lolos Standar (≥ 75%)' : 'Di Bawah Standar (< 75%)'}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-3)' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>% Daun Baru</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: editGradeColor }}>{editLeafPct.toFixed(1)}%</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Grade Baru</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: editGradeColor }}>Grade {editGrade}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Total Baru</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{editTotal.toFixed(2)} kg</div>
                  </div>
                </div>
              </div>
            )}

            <div style={{
              padding: 'var(--space-3)', borderRadius: 'var(--radius-md)',
              background: 'var(--color-warning-50)', border: '1px solid var(--color-warning-200)',
              fontSize: 'var(--text-xs)', color: 'var(--color-warning-800)',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <AlertTriangle className="w-4 h-4 text-currentColor flex-shrink-0" aria-hidden="true" />
              <span>Stok persediaan jamur bersih di gudang akan otomatis disesuaikan dengan selisih timbangan baru.</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
