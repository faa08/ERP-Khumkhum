'use client';

import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button/Button';
import { Input } from '@/components/ui/Input/Input';
import { Textarea } from '@/components/ui/Textarea/Textarea';
import { Modal } from '@/components/ui/Modal/Modal';
import { FormField } from '@/components/form/FormField';
import { DataTable } from '@/components/data-table/DataTable';
import { Plus, Save, Timer, Info } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { createTimeStudyBatch } from '@/actions/timeStudy';

interface StandardTimesTableProps {
  operation: any;
  batches: any[];
  summary: any;
}

export default function StandardTimesTable({ operation, batches, summary }: StandardTimesTableProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form
  const [temperature, setTemperature] = useState<number | ''>('');
  const [batchQty, setBatchQty] = useState<number | ''>('');
  const [defectQty, setDefectQty] = useState<number | ''>('');
  const [duration, setDuration] = useState<number | ''>('');
  const [notes, setNotes] = useState('');

  const columns = useMemo<ColumnDef<any>[]>(() => [
    {
      id: 'sample_id',
      header: 'Sample',
      cell: ({ row }) => <strong style={{ color: 'var(--text-primary)' }}>Batch {row.index + 1}</strong>
    },
    {
      accessorKey: 'temperature',
      header: 'Suhu',
      cell: ({ row }) => row.original.temperature ? `${row.original.temperature} °C` : '-'
    },
    {
      accessorKey: 'batch_quantity',
      header: 'Hasil (Kg)',
      cell: ({ row }) => `${row.original.batch_quantity} Kg`
    },
    {
      accessorKey: 'duration_minutes',
      header: 'Waktu (Menit)',
      cell: ({ row }) => `${row.original.duration_minutes} Mnt`
    },
    {
      id: 'cycle_time',
      header: 'Waktu Siklus',
      cell: ({ row }) => {
        const ws = row.original.duration_minutes / row.original.batch_quantity;
        return <span style={{ fontWeight: 600 }}>{ws.toFixed(4)} Mnt/Kg</span>;
      }
    },
    {
      accessorKey: 'defect_quantity',
      header: 'Reject',
      cell: ({ row }) => row.original.defect_quantity ? `${row.original.defect_quantity} Kg` : '-'
    },
    {
      accessorKey: 'notes',
      header: 'Catatan',
      cell: ({ row }) => row.original.notes || '-'
    }
  ], []);

  const handleSubmit = async () => {
    if (!operation || !batchQty || !duration) {
      setError('Kuantitas dan Durasi wajib diisi.');
      return;
    }
    setLoading(true);
    setError(null);
    const res = await createTimeStudyBatch({
      operation_id: operation.id,
      batch_quantity: Number(batchQty),
      defect_quantity: Number(defectQty) || 0,
      duration_minutes: Number(duration),
      temperature: temperature ? Number(temperature) : undefined,
      notes
    });

    if (res.success) {
      window.location.reload();
    } else {
      setError(res.error || 'Gagal menyimpan sampel.');
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* SUMMARY CARDS */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
          <div style={{ background: 'var(--bg-default)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            <div style={{ background: 'var(--color-primary-50)', color: 'var(--color-primary-600)', padding: '12px', borderRadius: '50%' }}>
              <Timer size={24} />
            </div>
            <div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', fontWeight: 600 }}>RATA-RATA SIKLUS (Ws)</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>{Number(summary.average_cycle_time_per_unit || 0).toFixed(4)} <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Mnt/Kg</span></div>
            </div>
          </div>
          <div style={{ background: 'var(--bg-default)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            <div style={{ background: 'var(--color-warning-50)', color: 'var(--color-warning-600)', padding: '12px', borderRadius: '50%' }}>
              <Timer size={24} />
            </div>
            <div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', fontWeight: 600 }}>WAKTU NORMAL (Wn)</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>{Number(summary.normal_time || 0).toFixed(4)} <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Mnt/Kg</span></div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>RF: {(Number(summary.rating_factor) * 100).toFixed(0)}%</div>
            </div>
          </div>
          <div style={{ background: 'var(--bg-default)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', border: '2px solid var(--color-success-400)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            <div style={{ background: 'var(--color-success-50)', color: 'var(--color-success-600)', padding: '12px', borderRadius: '50%' }}>
              <Timer size={24} />
            </div>
            <div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-success-700)', fontWeight: 800 }}>WAKTU BAKU FINAL (Wb)</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--color-success-700)' }}>{Number(summary.standard_time || 0).toFixed(4)} <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-success-600)' }}>Mnt/Kg</span></div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Allowance: {(Number(summary.allowance_percentage) * 100).toFixed(0)}%</div>
            </div>
          </div>
        </div>
      )}

      {/* TABLE */}
      <div style={{ background: 'var(--bg-default)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Log Sampel Batch</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginTop: '4px' }}>
              Daftar seluruh sampel pencatatan waktu untuk produksi penggorengan.
            </p>
          </div>
          <Button variant="secondary" leftIcon={<Plus size={16} />} onClick={() => setIsModalOpen(true)}>
            Tambah Sampel (Batch Baru)
          </Button>
        </div>

        {batches.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-8) 0', color: 'var(--text-secondary)' }}>
            <Info size={32} style={{ margin: '0 auto', marginBottom: 'var(--space-2)', opacity: 0.5 }} />
            Belum ada data sampel batch yang tercatat. Silakan tambah sampel baru.
          </div>
        ) : (
          <DataTable columns={columns} data={batches} />
        )}
      </div>

      {/* MODAL TAMBAH SAMPEL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Catat Sampel Batch (Time Study)"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button variant="primary" onClick={handleSubmit} disabled={loading} leftIcon={<Save size={16} />}>
              Simpan Data
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {error && <div style={{ padding: 'var(--space-3)', background: 'var(--color-danger-50)', color: 'var(--color-danger-700)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-danger-200)', fontSize: 'var(--text-sm)' }}>{error}</div>}
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <FormField label="Suhu Penggorengan (°C)" optional>
              <Input 
                type="number" min="0" step="1" placeholder="Misal: 160"
                value={temperature} onChange={(e) => setTemperature(e.target.value ? Number(e.target.value) : '')}
              />
            </FormField>
            <FormField label="Waktu Aktual (Menit)" required>
              <Input 
                type="number" min="1" placeholder="0"
                value={duration} onChange={(e) => setDuration(e.target.value ? Number(e.target.value) : '')}
              />
            </FormField>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <FormField label="Hasil / Yield (Kg)" required>
              <Input 
                type="number" min="0.1" step="0.1" placeholder="0.0"
                value={batchQty} onChange={(e) => setBatchQty(e.target.value ? Number(e.target.value) : '')}
              />
            </FormField>
            <FormField label="Reject / Cacat (Kg)" optional>
              <Input 
                type="number" min="0" step="0.1" placeholder="0.0"
                value={defectQty} onChange={(e) => setDefectQty(e.target.value ? Number(e.target.value) : '')}
              />
            </FormField>
          </div>

          <FormField label="Keterangan Tambahan" optional>
            <Textarea 
              placeholder="Catatan sampel..."
              value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
            />
          </FormField>
        </div>
      </Modal>
    </div>
  );
}
