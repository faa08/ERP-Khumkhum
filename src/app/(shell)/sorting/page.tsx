'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/form/FormField';
import { useToast } from '@/hooks/useToast';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import {
  getUnsortedReceivings,
  getDailySortingSummary,
  createSorting,
} from '@/actions/sorting';

interface FormState {
  receiving_id: string;
  leaf_weight: string;
  stem_weight: string;
}

const EMPTY_FORM: FormState = { receiving_id: '', leaf_weight: '', stem_weight: '' };

export default function SortingPage() {
  const [unsortedReceivings, setUnsortedReceivings] = useState<
    { id: string; batch_number: string; weight: number; farmer?: { name: string } | null }[]
  >([]);
  const [dailySummary, setDailySummary] = useState<{
    total_sorted: number;
    total_leaf: number;
    total_waste: number;
    waste_percentage: number;
  } | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

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
    const [unsortRes, sumRes] = await Promise.all([
      getUnsortedReceivings(),
      getDailySortingSummary(),
    ]);
    if (unsortRes.success && unsortRes.data) setUnsortedReceivings(unsortRes.data as any);
    if (sumRes.success && sumRes.data) setDailySummary(sumRes.data);
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
      toast.success('Sortasi berhasil dicatat!');
      setForm(EMPTY_FORM);
      loadData(); // refresh list & summary
    } else {
      toast.error(res.error || 'Gagal menyimpan');
    }
  };

  if (isLoading && unsortedReceivings.length === 0) {
    return <div style={{ padding: 'var(--space-4)' }}>Loading...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <PageHeader
        title="Input Sortasi & Grading"
        description="Pisahkan berat daun dan batang jamur, hitung % daun, dan tentukan grade kualitas. (Mode Khusus Input)"
        breadcrumbs={[{ label: 'Operasional' }, { label: 'Input Sortasi' }]}
      />

      {dailySummary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--space-4)' }}>
          <div style={{ background: 'var(--bg-default)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Total Disortir Hari Ini</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{dailySummary.total_sorted.toFixed(2)} kg</div>
          </div>
          <div style={{ background: 'var(--bg-default)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-success-200)', borderLeft: '4px solid var(--color-success-500)' }}>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Daun Bersih (Grade A/B)</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--color-success-700)' }}>{dailySummary.total_leaf.toFixed(2)} kg</div>
          </div>
          <div style={{ background: 'var(--bg-default)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-danger-200)', borderLeft: '4px solid var(--color-danger-500)' }}>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Total Afkir (Batang)</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--color-danger-700)' }}>{dailySummary.total_waste.toFixed(2)} kg</div>
          </div>
        </div>
      )}

      <Card header={<div style={{ fontWeight: 600 }}>Form Input Hasil Sortasi Baru</div>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          
          <FormField label="No. Penerimaan (Belum Disortasi)" required>
            <select
              value={form.receiving_id}
              onChange={e => setForm(f => ({ ...f, receiving_id: e.target.value }))}
              style={{
                width: '100%', padding: 'var(--space-3)',
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
            {unsortedReceivings.length === 0 && (
               <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-warning-600)', marginTop: '4px', display: 'block' }}>
                 Tidak ada bahan baku yang menunggu sortasi saat ini.
               </span>
            )}
          </FormField>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--space-4)' }}>
            <FormField label="Berat Daun / W_daun (kg)" required>
              <Input
                type="number" step="0.01" min="0" placeholder="0.00"
                value={form.leaf_weight}
                onChange={e => setForm(f => ({ ...f, leaf_weight: e.target.value }))}
                style={{ padding: 'var(--space-3)' }}
              />
            </FormField>
            <FormField label="Berat Batang / W_batang (kg)" required>
              <Input
                type="number" step="0.01" min="0" placeholder="0.00"
                value={form.stem_weight}
                onChange={e => setForm(f => ({ ...f, stem_weight: e.target.value }))}
                style={{ padding: 'var(--space-3)' }}
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: 'var(--space-3)' }}>
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
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
             <Button variant="primary" size="lg" onClick={handleSave} loading={isSaving} disabled={!form.receiving_id || !form.leaf_weight || !form.stem_weight}>
                Simpan & Rekam Sortasi
             </Button>
          </div>

          <div style={{
            padding: 'var(--space-3)', borderRadius: 'var(--radius-md)',
            background: 'var(--color-primary-50)', border: '1px solid var(--color-primary-200)',
            display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
            fontSize: 'var(--text-sm)', color: 'var(--color-primary-700)',
            marginTop: 'var(--space-2)'
          }}>
            <CheckCircle size={14} />
            Data yang disimpan akan memotong antrean penerimaan dan otomatis menambah stok gudang jamur bersih.
          </div>
        </div>
      </Card>
    </div>
  );
}
