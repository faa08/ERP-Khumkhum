'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/Button/Button';
import { FormField } from '@/components/form/FormField';
import { DataTable } from '@/components/data-table/DataTable';
import { clockIn, clockOut, pauseSession, resumeSession } from '@/actions/timeStudy';
import { Play, Square, Pause, Clock, Timer, List, Info } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';

export default function WorkerTerminal({ masterOperations, initialSession, historySessions = [] }: any) {
  const [session, setSession] = useState<any>(initialSession);
  const [selectedWorker, setSelectedWorker] = useState<string>('');
  const [selectedOp, setSelectedOp] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live Timer
  const [elapsedMinutes, setElapsedMinutes] = useState<number>(0);

  useEffect(() => {
    if (session && session.status === 'ACTIVE') {
      const interval = setInterval(() => {
        const start = new Date(session.clock_in_time).getTime();
        const now = new Date().getTime();
        setElapsedMinutes(Math.floor((now - start) / 60000));
      }, 60000);

      const start = new Date(session.clock_in_time).getTime();
      const now = new Date().getTime();
      setElapsedMinutes(Math.floor((now - start) / 60000));

      return () => clearInterval(interval);
    }
  }, [session]);

  const handleClockIn = async () => {
    if (!selectedWorker || !selectedOp) {
      setError('Pilih nama pekerja dan jenis pekerjaan terlebih dahulu!');
      return;
    }
    setLoading(true);
    setError(null);
    const res = await clockIn(selectedOp, selectedWorker);
    if (res.success) window.location.reload();
    else { setError(res.error || 'Gagal clock in'); setLoading(false); }
  };

  const handlePause = async () => {
    setLoading(true);
    const res = await pauseSession(session.id);
    if (res.success) window.location.reload();
    else { setError(res.error || 'Gagal jeda'); setLoading(false); }
  };

  const handleResume = async () => {
    setLoading(true);
    const res = await resumeSession(session.id);
    if (res.success) window.location.reload();
    else { setError(res.error || 'Gagal lanjut'); setLoading(false); }
  };

  const handleClockOut = async () => {
    if (!confirm('Apakah Anda yakin ingin mengakhiri sesi kerja hari ini?')) return;
    setLoading(true);
    const res = await clockOut(session.id);
    if (res.success) window.location.reload();
    else { setError(res.error || 'Gagal clock out'); setLoading(false); }
  };

  const historyColumns = useMemo<ColumnDef<any>[]>(() => [
    {
      accessorKey: 'worker_name',
      header: 'Pekerja',
      cell: ({ row }) => <strong style={{ color: 'var(--text-primary)' }}>{row.original.worker_name || 'Fachry'}</strong>
    },
    {
      accessorKey: 'operation',
      header: 'Pekerjaan',
      cell: ({ row }) => row.original.operation?.operation_name
    },
    {
      accessorKey: 'clock_in_time',
      header: 'Jam Mulai',
      cell: ({ row }) => format(new Date(row.original.clock_in_time), 'HH:mm')
    },
    {
      accessorKey: 'clock_out_time',
      header: 'Jam Selesai',
      cell: ({ row }) => row.original.clock_out_time ? format(new Date(row.original.clock_out_time), 'HH:mm') : '-'
    },
    {
      accessorKey: 'total_working_minutes',
      header: 'Durasi Bersih',
      cell: ({ row }) => {
        const mins = row.original.total_working_minutes;
        if (!mins) return '-';
        const h = Math.floor(mins / 60);
        const m = Math.round(mins % 60);
        return <span style={{ fontWeight: 600 }}>{h}j {m}m</span>;
      }
    },
    {
      accessorKey: 'total_paused_minutes',
      header: 'Waktu Jeda',
      cell: ({ row }) => row.original.total_paused_minutes ? `${Math.round(row.original.total_paused_minutes)} mnt` : '-'
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <span style={{ 
          padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
          background: row.original.status === 'COMPLETED' ? 'var(--color-success-100)' : 'var(--color-warning-100)',
          color: row.original.status === 'COMPLETED' ? 'var(--color-success-700)' : 'var(--color-warning-700)'
        }}>
          {row.original.status}
        </span>
      )
    }
  ], []);

  const isPaused = session?.status === 'PAUSED';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {error && <div style={{ padding: 'var(--space-3)', background: 'var(--color-danger-50)', color: 'var(--color-danger-700)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-danger-200)', fontSize: 'var(--text-sm)' }}>{error}</div>}
      
      {!session ? (
        <div style={{ background: 'var(--bg-default)', padding: 'var(--space-6)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', maxWidth: '600px', margin: '0 auto', marginTop: 'var(--space-8)' }}>
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
            <Clock size={48} style={{ margin: '0 auto', color: 'var(--text-tertiary)', marginBottom: 'var(--space-4)' }} />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Mulai Sesi Kerja</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>Silakan pilih jenis pekerjaan untuk memulai sesi (Clock In).</p>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <FormField label="Nama Pekerja" required>
                <select
                  value={selectedWorker}
                  onChange={(e) => setSelectedWorker(e.target.value)}
                  style={{
                    width: '100%', padding: 'var(--space-2) var(--space-3)',
                    border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-default)', color: 'var(--text-primary)',
                    fontSize: 'var(--text-sm)',
                  }}
                >
                  <option value="">-- Pilih Pekerja --</option>
                  <option value="Fachry">Fachry</option>
                  <option value="Budi">Budi</option>
                  <option value="Siti">Siti</option>
                  <option value="Agus">Agus</option>
                </select>
              </FormField>

              <FormField label="Operasi / Jenis Pekerjaan" required>
                <select
                  value={selectedOp}
                  onChange={(e) => setSelectedOp(e.target.value)}
                  style={{
                    width: '100%', padding: 'var(--space-2) var(--space-3)',
                    border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-default)', color: 'var(--text-primary)',
                    fontSize: 'var(--text-sm)',
                  }}
                >
                  <option value="">-- Pilih Pekerjaan --</option>
                  {masterOperations.map((op: any) => (
                    <option key={op.id} value={op.id}>{op.operation_name}</option>
                  ))}
                </select>
              </FormField>
            </div>

            <div style={{ paddingTop: 'var(--space-4)' }}>
              <Button variant="primary" fullWidth onClick={handleClockIn} disabled={loading} leftIcon={<Play size={18} />}>
                CLOCK IN SEKARANG
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* HEADER STATUS */}
          <div style={{ background: isPaused ? 'var(--color-warning-50)' : 'var(--color-success-50)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', border: `1px solid ${isPaused ? 'var(--color-warning-200)' : 'var(--color-success-200)'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                {isPaused ? <Pause size={20} style={{ color: 'var(--color-warning-600)' }} /> : <Play size={20} style={{ color: 'var(--color-success-600)' }} />}
                {isPaused ? 'Sesi Dijeda (Istirahat)' : 'Sesi Kerja Aktif'}
              </h2>
              <div style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                <p>Pekerja: <strong style={{ color: 'var(--text-primary)' }}>{session.worker_name || 'Fachry'}</strong></p>
                <p>Pekerjaan: <strong style={{ color: 'var(--text-primary)' }}>{session.operation?.operation_name}</strong></p>
                <p>Dimulai: <strong>{format(new Date(session.clock_in_time), 'HH:mm')}</strong></p>
              </div>
            </div>
            
            {!isPaused && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)', marginBottom: '4px', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
                  <Timer size={14} /> Durasi Sesi
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {String(Math.floor(elapsedMinutes / 60)).padStart(2, '0')}:{String(elapsedMinutes % 60).padStart(2, '0')}
                </div>
              </div>
            )}
          </div>

          {/* KONTROL SESI */}
          <div style={{ background: 'var(--bg-default)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--space-4)' }}>
              <Clock size={18}/> Kontrol Sesi
            </h3>
            <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                {isPaused ? (
                  <Button variant="primary" fullWidth onClick={handleResume} disabled={loading} leftIcon={<Play size={18} />}>
                    Lanjutkan Bekerja
                  </Button>
                ) : (
                  <Button variant="secondary" fullWidth onClick={handlePause} disabled={loading} leftIcon={<Pause size={18} />}>
                    Jeda / Istirahat
                  </Button>
                )}
              </div>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <Button variant="danger" fullWidth onClick={handleClockOut} disabled={loading} leftIcon={<Square size={18} />}>
                  Akhiri Sesi (Clock Out)
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RIWAYAT SESI KERJA */}
      <div style={{ background: 'var(--bg-default)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <List size={18}/> Riwayat Sesi Kerja
          </h3>
        </div>
        
        {historySessions.length === 0 ? (
          <div style={{ padding: 'var(--space-8) 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <Info size={32} style={{ margin: '0 auto', marginBottom: 'var(--space-2)', opacity: 0.5 }} />
            <p style={{ fontSize: 'var(--text-sm)' }}>Belum ada riwayat sesi kerja sebelumnya.</p>
          </div>
        ) : (
          <DataTable columns={historyColumns} data={historySessions} />
        )}
      </div>
    </div>
  );
}
