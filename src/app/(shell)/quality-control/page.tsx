'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/data-table/DataTable';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Card } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Radio } from '@/components/ui/Radio';
import { FormField } from '@/components/form/FormField';
import { useToast } from '@/hooks/useToast';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileCheck2,
  BarChart3,
  ListOrdered,
  Plus,
  Eye,
  Printer,
  Sparkles,
  ClipboardList,
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import {
  getQcInspections,
  getPendingQcBatches,
  createQcInspection,
  getQcParetoData,
  getQcSummaryMetrics,
  type CreateQcInspectionInput,
} from '@/actions/qc';
import type { DbQcInspection, DbProductionOrder, QcParetoItem } from '@/types/database';

export default function QualityControlPage() {
  const [inspections, setInspections] = useState<DbQcInspection[]>([]);
  const [pendingBatches, setPendingBatches] = useState<DbProductionOrder[]>([]);
  const [paretoData, setParetoData] = useState<QcParetoItem[]>([]);
  const [metrics, setMetrics] = useState({
    totalInspections: 0,
    passRate: 95.0,
    avgDefectRate: 2.5,
    pendingCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [inspectionModalOpen, setInspectionModalOpen] = useState(false);
  const [certificateModalOpen, setCertificateModalOpen] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<DbQcInspection | null>(null);

  // Form State
  const [formState, setFormState] = useState<{
    referenceId: string;
    sampleSize: string;
    defectBurnt: string;
    defectSalty: string;
    defectLeaking: string;
    defectCrushed: string;
    defectSoggy: string;
    decision: 'RELEASED' | 'REWORK' | 'REJECTED';
    notes: string;
  }>({
    referenceId: '',
    sampleSize: '50',
    defectBurnt: '0',
    defectSalty: '0',
    defectLeaking: '0',
    defectCrushed: '0',
    defectSoggy: '0',
    decision: 'RELEASED',
    notes: '',
  });

  const toast = useToast();

  // Load Data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [insRes, pendRes, paretoRes, metricsRes] = await Promise.all([
        getQcInspections(),
        getPendingQcBatches(),
        getQcParetoData(),
        getQcSummaryMetrics(),
      ]);

      if (insRes.success && insRes.data) setInspections(insRes.data);
      if (pendRes.success && pendRes.data) setPendingBatches(pendRes.data);
      if (paretoRes.success && paretoRes.data) setParetoData(paretoRes.data);
      if (metricsRes.success && metricsRes.data) setMetrics(metricsRes.data);
    } catch (err: any) {
      console.error('Gagal memuat data Quality Control:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Live calculation of defects & rate
  const liveDefects = useMemo(() => {
    const burnt = Number(formState.defectBurnt || 0);
    const salty = Number(formState.defectSalty || 0);
    const leaking = Number(formState.defectLeaking || 0);
    const crushed = Number(formState.defectCrushed || 0);
    const soggy = Number(formState.defectSoggy || 0);
    const total = burnt + salty + leaking + crushed + soggy;
    const sampleSize = Number(formState.sampleSize || 50);
    const rate = sampleSize > 0 ? parseFloat(((total / sampleSize) * 100).toFixed(2)) : 0;
    return { total, rate };
  }, [formState]);

  const handleOpenInspection = (batch?: DbProductionOrder) => {
    setFormState({
      referenceId: batch?.id || (pendingBatches[0]?.id || ''),
      sampleSize: '50',
      defectBurnt: '0',
      defectSalty: '0',
      defectLeaking: '0',
      defectCrushed: '0',
      defectSoggy: '0',
      decision: 'RELEASED',
      notes: '',
    });
    setInspectionModalOpen(true);
  };

  const handleSaveInspection = async () => {
    if (!formState.referenceId) {
      toast.error('Pilih batch produksi yang akan diinspeksi');
      return;
    }
    if (Number(formState.sampleSize) <= 0) {
      toast.error('Ukuran sampel inspeksi harus > 0');
      return;
    }

    const payload: CreateQcInspectionInput = {
      reference_type: 'PRODUCTION',
      reference_id: formState.referenceId,
      sample_size: Number(formState.sampleSize),
      defect_burnt: Number(formState.defectBurnt || 0),
      defect_salty: Number(formState.defectSalty || 0),
      defect_leaking_pack: Number(formState.defectLeaking || 0),
      defect_crushed: Number(formState.defectCrushed || 0),
      defect_soggy: Number(formState.defectSoggy || 0),
      decision: formState.decision,
      notes: formState.notes,
    };

    const res = await createQcInspection(payload);
    if (res.success) {
      toast.success(`Hasil inspeksi disimpan! Keputusan: ${formState.decision}`);
      setInspectionModalOpen(false);
      loadData();
    } else {
      toast.error(res.error || 'Gagal menyimpan hasil inspeksi');
    }
  };

  const handleViewCertificate = (inspection: DbQcInspection) => {
    setSelectedInspection(inspection);
    setCertificateModalOpen(true);
  };

  // Columns: Pending Batches
  const pendingColumns = useMemo<ColumnDef<DbProductionOrder>[]>(() => [
    {
      accessorKey: 'batch_number',
      header: 'No. Batch Produksi',
      cell: ({ row }) => (
        <div>
          <strong style={{ color: 'var(--color-primary-700)', fontFamily: 'monospace' }}>
            {row.original.batch_number}
          </strong>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
            {row.original.created_at ? format(new Date(row.original.created_at), 'dd MMM yyyy, HH:mm', { locale: idLocale }) : '-'}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'product_variant',
      header: 'Varian Produk',
      cell: ({ row }) => row.original.product_variant || row.original.product?.name || 'Jamur Crispy Original',
    },
    {
      accessorKey: 'output_weight',
      header: 'Berat Jamur Matang',
      cell: ({ row }) => (
        <strong>{row.original.output_weight ? `${Number(row.original.output_weight).toFixed(1)} kg` : '-'}</strong>
      ),
    },
    {
      accessorKey: 'yield_percentage',
      header: 'Rendemen Produksi',
      cell: ({ row }) => (
        <span style={{ fontWeight: 600, color: 'var(--color-success-700)' }}>
          {row.original.yield_percentage ? `${row.original.yield_percentage}%` : '-'}
        </span>
      ),
    },
    {
      id: 'action',
      header: '',
      cell: ({ row }) => (
        <Button
          variant="primary"
          size="sm"
          onClick={() => handleOpenInspection(row.original)}
          leftIcon={<ShieldCheck size={14} />}
        >
          Uji Mutu Sampling
        </Button>
      ),
    },
  ], [pendingBatches]);

  // Columns: History Inspections
  const historyColumns = useMemo<ColumnDef<DbQcInspection>[]>(() => [
    {
      accessorKey: 'inspection_date',
      header: 'Waktu Inspeksi',
      cell: ({ row }) => (
        <div>
          <strong>{format(new Date(row.original.inspection_date), 'dd MMM yyyy', { locale: idLocale })}</strong>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
            {format(new Date(row.original.inspection_date), 'HH:mm')} WIB
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'batch_id',
      header: 'Batch Produksi',
      cell: ({ row }) => (
        <div>
          <strong style={{ fontFamily: 'monospace' }}>
            {row.original.production_order?.batch_number || row.original.batch_id || row.original.reference_id}
          </strong>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
            {row.original.production_order?.product_variant || 'Jamur Crispy Original'}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'sample_size',
      header: 'Sampel (N)',
      cell: ({ row }) => `${row.original.sample_size || 50} pcs`,
    },
    {
      accessorKey: 'total_defects',
      header: 'Total Cacat',
      cell: ({ row }) => (
        <span style={{ color: Number(row.original.total_defects || 0) > 0 ? 'var(--color-danger-700)' : 'var(--color-success-700)', fontWeight: 600 }}>
          {row.original.total_defects || 0} pcs ({row.original.defect_rate || 0}%)
        </span>
      ),
    },
    {
      accessorKey: 'decision',
      header: 'Keputusan Mutu',
      cell: ({ row }) => {
        const decision = row.original.decision || (row.original.is_passed ? 'RELEASED' : 'REJECTED');
        if (decision === 'RELEASED') {
          return <StatusBadge status="completed" label="RELEASED (Lolos)" />;
        } else if (decision === 'REWORK') {
          return <StatusBadge status="pending" label="REWORK (Perbaikan)" />;
        } else {
          return <StatusBadge status="cancelled" label="REJECTED (Afkir)" />;
        }
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => handleViewCertificate(row.original)}
          leftIcon={<FileCheck2 size={14} />}
        >
          Sertifikat QC
        </Button>
      ),
    },
  ], []);

  // Tabs Content
  const PendingTab = (
    <div style={{ marginTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {pendingBatches.length === 0 ? (
        <Card>
          <div style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--text-secondary)' }}>
            <CheckCircle2 size={40} color="var(--color-success-600)" style={{ margin: '0 auto var(--space-2)' }} />
            <strong style={{ display: 'block', fontSize: 'var(--text-base)', color: 'var(--text-primary)' }}>
              Antrean Bersih: Tidak Ada Batch Menunggu QC
            </strong>
            <span>Seluruh batch hasil penggorengan telah selesai diinspeksi.</span>
          </div>
        </Card>
      ) : (
        <DataTable columns={pendingColumns} data={pendingBatches} />
      )}
    </div>
  );

  const HistoryTab = (
    <div style={{ marginTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <DataTable columns={historyColumns} data={inspections} />
    </div>
  );

  const ParetoTab = (
    <div style={{ marginTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <Card header={<strong>Analisis Diagram Pareto Cacat Pangan (Prinsip 80/20)</strong>}>
        <p style={{ margin: 0, marginBottom: 'var(--space-4)', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
          Mengidentifikasi 20% jenis cacat yang menyumbang 80% total penolakan produk agar tindakan korektif tepat sasaran.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {paretoData.map((item, idx) => (
            <div
              key={idx}
              style={{
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-2)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>{item.category}</strong>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginLeft: '8px' }}>
                    {item.count} kejadian ({item.percentage}%)
                  </span>
                </div>
                <strong style={{ color: item.cumulativePercentage <= 80 ? 'var(--color-danger-600)' : 'var(--color-primary-600)' }}>
                  Kumulatif: {item.cumulativePercentage}%
                </strong>
              </div>

              {/* Progress bar */}
              <div style={{ height: '8px', width: '100%', background: 'var(--color-neutral-200)', borderRadius: '999px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${item.percentage}%`,
                    background: item.cumulativePercentage <= 80 ? 'var(--color-danger-500)' : 'var(--color-primary-500)',
                    borderRadius: '999px',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <PageHeader
        title="Kendali Mutu & Jaminan Kualitas (QC)"
        description="Inspeksi mutu sampling organoleptik & fisik, penetapan keputusan rilis produk jadi, analisis pareto defect, dan penerbitan sertifikat kelayakan mutu."
        breadcrumbs={[{ label: 'Operasional' }, { label: 'Quality Control' }]}
        actions={
          <Button variant="primary" onClick={() => handleOpenInspection()} leftIcon={<Plus size={16} />}>
            Catat Inspeksi Baru
          </Button>
        }
      />

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
            <ClipboardList size={20} color="var(--color-primary-600)" />
            <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Total Sesi Inspeksi</span>
          </div>
          <div style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--color-primary-700)' }}>
            {metrics.totalInspections} <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-secondary)' }}>Batch</span>
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
            <ShieldCheck size={20} color="var(--color-success-600)" />
            <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Tingkat Lolos (Pass Rate)</span>
          </div>
          <div style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--color-success-700)' }}>
            {metrics.passRate}%
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
            <AlertTriangle size={20} color="var(--color-warning-600)" />
            <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Rata-rata Defect Rate</span>
          </div>
          <div style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--color-warning-700)' }}>
            {metrics.avgDefectRate}%
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
            <ListOrdered size={20} color="var(--color-info-600)" />
            <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Antrean Menunggu QC</span>
          </div>
          <div style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--color-info-700)' }}>
            {metrics.pendingCount} <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-secondary)' }}>Batch</span>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          {
            id: 'pending',
            label: (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ListOrdered size={16} /> Antrean Menunggu QC ({pendingBatches.length})
              </span>
            ),
            content: PendingTab,
          },
          {
            id: 'history',
            label: (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={16} /> Riwayat Inspeksi & Sertifikat ({inspections.length})
              </span>
            ),
            content: HistoryTab,
          },
          {
            id: 'pareto',
            label: (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BarChart3 size={16} /> Analisis Pareto Cacat (80/20)
              </span>
            ),
            content: ParetoTab,
          },
        ]}
      />

      {/* ───────────────────────────────────────────── */}
      {/* MODAL: FORM UJI SAMPLING QC & KEPUTUSAN MUTU   */}
      {/* ───────────────────────────────────────────── */}
      <Modal
        isOpen={inspectionModalOpen}
        onClose={() => setInspectionModalOpen(false)}
        title="Form Inspeksi Mutu Sampling & Penetapan Rilis Produk"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setInspectionModalOpen(false)}>
              Batal
            </Button>
            <Button variant="primary" onClick={handleSaveInspection} leftIcon={<ShieldCheck size={16} />}>
              Simpan & Tetapkan Keputusan
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <FormField label="Pilih Batch Produksi yang Diinspeksi" required>
            <Select
              options={
                pendingBatches.length > 0
                  ? pendingBatches.map((b) => ({
                      value: b.id,
                      label: `${b.batch_number} — ${b.product_variant || 'Jamur Crispy'} (${b.output_weight || 0} kg)`,
                    }))
                  : [{ value: '', label: 'Tidak ada antrean batch' }]
              }
              value={formState.referenceId}
              onChange={(e) => setFormState({ ...formState, referenceId: e.target.value })}
            />
          </FormField>

          <FormField label="Ukuran Sampel Uji (N_sample pcs kemasan)" required>
            <Input
              type="number"
              value={formState.sampleSize}
              onChange={(e) => setFormState({ ...formState, sampleSize: e.target.value })}
              placeholder="50"
            />
          </FormField>

          {/* Tally Cacat Table */}
          <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)' }}>
            <strong style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>
              Tally Cacat Organoleptik & Fisik (pcs sampel):
            </strong>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-3)' }}>
              <div>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', display: 'block' }}>Gosong / Overcooked</span>
                <Input
                  type="number"
                  value={formState.defectBurnt}
                  onChange={(e) => setFormState({ ...formState, defectBurnt: e.target.value })}
                />
              </div>

              <div>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', display: 'block' }}>Keasinan / Bumbu Tidak Rata</span>
                <Input
                  type="number"
                  value={formState.defectSalty}
                  onChange={(e) => setFormState({ ...formState, defectSalty: e.target.value })}
                />
              </div>

              <div>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', display: 'block' }}>Kemasan Bocor / Seal Rusak</span>
                <Input
                  type="number"
                  value={formState.defectLeaking}
                  onChange={(e) => setFormState({ ...formState, defectLeaking: e.target.value })}
                />
              </div>

              <div>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', display: 'block' }}>Remuk / Patah Berlebih</span>
                <Input
                  type="number"
                  value={formState.defectCrushed}
                  onChange={(e) => setFormState({ ...formState, defectCrushed: e.target.value })}
                />
              </div>

              <div>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', display: 'block' }}>Melempem / Kurang Renyah</span>
                <Input
                  type="number"
                  value={formState.defectSoggy}
                  onChange={(e) => setFormState({ ...formState, defectSoggy: e.target.value })}
                />
              </div>
            </div>

            {/* Calculated Rate */}
            <div style={{ marginTop: 'var(--space-3)', padding: 'var(--space-2) var(--space-3)', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between' }}>
              <span>Total Cacat Terhitung: <strong>{liveDefects.total} pcs</strong></span>
              <strong style={{ color: liveDefects.rate <= 5.0 ? 'var(--color-success-700)' : 'var(--color-danger-700)' }}>
                Defect Rate: {liveDefects.rate}% (Maks. toleransi: 5.0%)
              </strong>
            </div>
          </div>

          {/* Decision */}
          <FormField label="Keputusan Mutu (QC Decision)" required>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-2)' }}>
              <Button
                variant={formState.decision === 'RELEASED' ? 'primary' : 'secondary'}
                onClick={() => setFormState({ ...formState, decision: 'RELEASED' })}
                leftIcon={<CheckCircle2 size={16} />}
              >
                RELEASED (Lolos)
              </Button>

              <Button
                variant={formState.decision === 'REWORK' ? 'primary' : 'secondary'}
                onClick={() => setFormState({ ...formState, decision: 'REWORK' })}
                leftIcon={<AlertTriangle size={16} />}
              >
                REWORK (Perbaikan)
              </Button>

              <Button
                variant={formState.decision === 'REJECTED' ? 'danger' : 'secondary'}
                onClick={() => setFormState({ ...formState, decision: 'REJECTED' })}
                leftIcon={<XCircle size={16} />}
              >
                REJECTED (Afkir)
              </Button>
            </div>
          </FormField>

          <FormField label="Catatan Evaluasi & Rekomendasi Mutu">
            <Textarea
              rows={2}
              value={formState.notes}
              onChange={(e) => setFormState({ ...formState, notes: e.target.value })}
              placeholder="Catatan parameter kerenyahan, aroma, rasa, dan kerapatan seal..."
            />
          </FormField>
        </div>
      </Modal>

      {/* ───────────────────────────────────────────── */}
      {/* MODAL: PREVIEW SERTIFIKAT KELAYAKAN MUTU QC   */}
      {/* ───────────────────────────────────────────── */}
      <Modal
        isOpen={certificateModalOpen}
        onClose={() => setCertificateModalOpen(false)}
        title="Sertifikat Kelayakan Mutu Batch (QC Release Certificate)"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCertificateModalOpen(false)}>
              Tutup
            </Button>
            <Button variant="primary" onClick={() => window.print()} leftIcon={<Printer size={16} />}>
              Cetak Dokumen
            </Button>
          </>
        }
      >
        {selectedInspection && (
          <div style={{ border: '2px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 'var(--space-5)', background: '#fff', color: '#1a1a1a' }}>
            <div style={{ textAlign: 'center', borderBottom: '2px solid #333', paddingBottom: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
              <h3 style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>CV KHAIRA BUANA MAS</h3>
              <h4 style={{ margin: '4px 0', color: '#666' }}>Sertifikat Kelayakan Mutu Pangan (QC Certificate)</h4>
              <span style={{ fontSize: '12px', color: '#888' }}>Kulon Progo, D.I. Yogyakarta — Standar Kemenperin RI</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', fontSize: '13px', marginBottom: 'var(--space-4)' }}>
              <div><strong>No. Dokumen:</strong> QC-{selectedInspection.id.substring(0, 8).toUpperCase()}</div>
              <div><strong>Tanggal:</strong> {format(new Date(selectedInspection.inspection_date), 'dd MMMM yyyy', { locale: idLocale })}</div>
              <div><strong>Nomor Batch:</strong> {selectedInspection.production_order?.batch_number || selectedInspection.batch_id || '-'}</div>
              <div><strong>Varian Produk:</strong> {selectedInspection.production_order?.product_variant || 'Jamur Crispy Original'}</div>
            </div>

            <div style={{ background: '#f8f9fa', padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-4)', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>Jumlah Sampel Diuji (N):</span>
                <strong>{selectedInspection.sample_size || 50} pcs</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>Total Cacat Ditemukan:</span>
                <strong>{selectedInspection.total_defects || 0} pcs</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Defect Rate (%):</span>
                <strong>{selectedInspection.defect_rate || 0}%</strong>
              </div>
            </div>

            <div style={{ textAlign: 'center', padding: 'var(--space-3)', background: selectedInspection.is_passed ? '#e6f4ea' : '#fce8e6', borderRadius: 'var(--radius-sm)', color: selectedInspection.is_passed ? '#137333' : '#c5221f', fontWeight: 700, fontSize: '16px' }}>
              STATUS KEPUTUSAN: {selectedInspection.decision || (selectedInspection.is_passed ? 'RELEASED (LOLOS)' : 'REJECTED')}
            </div>

            <div style={{ marginTop: 'var(--space-5)', display: 'flex', justifyContent: 'flex-end', textAlign: 'center', fontSize: '12px' }}>
              <div>
                <p style={{ margin: '0 0 40px 0' }}>Inspektur Quality Assurance,</p>
                <strong>{selectedInspection.inspector?.name || 'Petugas QC KhumKhum'}</strong>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
