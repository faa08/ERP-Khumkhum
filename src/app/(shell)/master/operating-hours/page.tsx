'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/form/FormField';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import {
  Clock,
  Save,
  Sun,
  Sunset,
  Coffee,
  Timer,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import {
  getOperatingHoursStandards,
  saveOperatingHoursStandards,
} from '@/actions/standards';
import type { OperatingHoursConfig, ShiftConfig } from '@/actions/standards';

const ALL_DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

export default function OperatingHoursPage() {
  const { user } = useAuth();
  const isManagement = user?.role === 'MANAGEMENT';

  const [config, setConfig] = useState<OperatingHoursConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const toast = useToast();

  const loadConfig = useCallback(async () => {
    setIsLoading(true);
    const res = await getOperatingHoursStandards();
    if (res.success && res.data) {
      setConfig(res.data);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleSave = async () => {
    if (!config) return;
    setIsSaving(true);
    const res = await saveOperatingHoursStandards(config);
    if (res.success) {
      toast.success('Pengaturan jam operasional berhasil disimpan!');
    } else {
      toast.error(res.error || 'Gagal menyimpan pengaturan');
    }
    setIsSaving(false);
  };

  const toggleDay = (day: string) => {
    if (!config) return;
    const current = config.work_days;
    const updated = current.includes(day)
      ? current.filter(d => d !== day)
      : [...current, day];
    setConfig({ ...config, work_days: updated });
  };

  const updateShift = (index: number, field: keyof ShiftConfig, value: any) => {
    if (!config) return;
    const shifts = [...config.shifts];
    shifts[index] = { ...shifts[index], [field]: value };
    
    // Auto-recalculate effective hours
    const start = shifts[index].start_time.split(':').map(Number);
    const end = shifts[index].end_time.split(':').map(Number);
    const totalMinutes = (end[0] * 60 + end[1]) - (start[0] * 60 + start[1]);
    const effectiveMinutes = totalMinutes - shifts[index].break_minutes;
    shifts[index].effective_hours = Math.max(0, Number((effectiveMinutes / 60).toFixed(1)));
    
    // Auto-recalculate max batches
    if (config.batch_parameters.total_cycle_minutes > 0) {
      shifts[index].max_fryer_batches = Math.floor(effectiveMinutes / config.batch_parameters.total_cycle_minutes);
    }

    setConfig({ ...config, shifts });
  };

  const updateBatchParam = (field: string, value: number | number[]) => {
    if (!config) return;
    const bp = { ...config.batch_parameters, [field]: value };
    
    // Auto-recalculate total cycle (Waktu Baku) using Time Study Formula
    const samples = bp.time_study_samples || [30, 30, 30, 30, 30, 30, 30, 30, 30, 30];
    const avgCycleTime = samples.reduce((a, b) => a + b, 0) / Math.max(1, samples.length);
    const normalTime = avgCycleTime * ((bp.rating_factor_pct || 100) / 100);
    const standardTime = normalTime * (1 + (bp.allowance_pct || 10) / 100);
    
    bp.total_cycle_minutes = Math.round(standardTime);
    
    // Recalculate max batches for all shifts
    const shifts = config.shifts.map(shift => {
      const start = shift.start_time.split(':').map(Number);
      const end = shift.end_time.split(':').map(Number);
      const totalMinutes = (end[0] * 60 + end[1]) - (start[0] * 60 + start[1]);
      const effectiveMinutes = totalMinutes - shift.break_minutes;
      return {
        ...shift,
        max_fryer_batches: bp.total_cycle_minutes > 0 ? Math.floor(effectiveMinutes / bp.total_cycle_minutes) : 0,
      };
    });

    setConfig({ ...config, batch_parameters: bp, shifts });
  };

  const updateTimeStudySample = (index: number, value: number) => {
    if (!config) return;
    const newSamples = [...(config.batch_parameters.time_study_samples || [30, 30, 30, 30, 30, 30, 30, 30, 30, 30])];
    newSamples[index] = value;
    updateBatchParam('time_study_samples', newSamples);
  };

  if (isLoading || !config) {
    return (
      <div>
        <PageHeader
          title="Jam Operasional Pabrik"
          description="Pengaturan jadwal kerja, shift, dan parameter siklus produksi."
          breadcrumbs={[{ label: 'Data Induk' }, { label: 'Jam Operasional' }]}
        />
        <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Memuat pengaturan jam operasional...
        </div>
      </div>
    );
  }

  // Calculate total daily capacity
  const activeShifts = config.shifts.filter(s => s.is_active);
  const totalDailyBatches = activeShifts.reduce((sum, s) => sum + s.max_fryer_batches, 0);
  const totalDailyHours = activeShifts.reduce((sum, s) => sum + s.effective_hours, 0);

  return (
    <div>
      <PageHeader
        title="Jam Operasional Pabrik"
        description="Pengaturan jadwal kerja, shift, dan parameter siklus produksi."
        breadcrumbs={[{ label: 'Data Induk' }, { label: 'Jam Operasional' }]}
        actions={
          !isManagement && (
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={isSaving}
              leftIcon={<Save size={16} />}
            >
              {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          )
        }
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
        {/* Summary Card */}
        <Card header={<strong>📊 Ringkasan Kapasitas Harian</strong>}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
            <div style={{
              padding: 'var(--space-4)', borderRadius: 'var(--radius-md)',
              background: 'var(--color-primary-50)', borderLeft: '4px solid var(--color-primary-600)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-primary-700)', marginBottom: 4 }}>Shift Aktif</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-primary-600)' }}>{activeShifts.length}</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>dari {config.shifts.length} shift</div>
            </div>
            <div style={{
              padding: 'var(--space-4)', borderRadius: 'var(--radius-md)',
              background: 'var(--color-success-50)', borderLeft: '4px solid var(--color-success-600)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-success-700)', marginBottom: 4 }}>Jam Efektif / Hari</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-success-600)' }}>{totalDailyHours}</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>jam kerja bersih</div>
            </div>
            <div style={{
              padding: 'var(--space-4)', borderRadius: 'var(--radius-md)',
              background: 'var(--color-warning-50)', borderLeft: '4px solid var(--color-warning-600)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-warning-700)', marginBottom: 4 }}>Maks. Batch Goreng / Hari</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-warning-600)' }}>{totalDailyBatches}</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>@ {config.batch_parameters.total_cycle_minutes} menit/siklus</div>
            </div>
            <div style={{
              padding: 'var(--space-4)', borderRadius: 'var(--radius-md)',
              background: 'var(--bg-subtle)', borderLeft: '4px solid var(--text-tertiary)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 4 }}>Hari Kerja / Minggu</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)' }}>{config.work_days.length}</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>hari aktif</div>
            </div>
          </div>
        </Card>

        {/* Work Days */}
        <Card header={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Clock size={18} /> <strong>Hari Kerja Pabrik</strong></span>}>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
            Pilih hari-hari di mana pabrik beroperasi. Klik untuk menandai aktif / nonaktif.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
            {ALL_DAYS.map(day => {
              const isActive = config.work_days.includes(day);
              return (
                <button
                  key={day}
                  onClick={() => !isManagement && toggleDay(day)}
                  disabled={isManagement}
                  style={{
                    padding: '10px 20px',
                    borderRadius: 'var(--radius-md)',
                    border: `2px solid ${isActive ? 'var(--color-primary-500)' : 'var(--border-color)'}`,
                    background: isActive ? 'var(--color-primary-50)' : 'var(--bg-surface)',
                    color: isActive ? 'var(--color-primary-700)' : 'var(--text-secondary)',
                    fontWeight: isActive ? 600 : 400,
                    cursor: isManagement ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8,
                    transition: 'all 0.2s ease',
                  }}
                >
                  {isActive ? <CheckCircle size={16} /> : <XCircle size={16} />}
                  {day}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Shifts */}
        {config.shifts.map((shift, idx) => (
          <Card
            key={shift.shift_id}
            header={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {idx === 0 ? <Sun size={18} /> : <Sunset size={18} />}
                  <strong>{shift.shift_name}</strong>
                </span>
                <button
                  onClick={() => !isManagement && updateShift(idx, 'is_active', !shift.is_active)}
                  disabled={isManagement}
                  style={{
                    padding: '6px 16px',
                    borderRadius: 'var(--radius-full)',
                    border: 'none',
                    background: shift.is_active ? 'var(--color-success-500)' : 'var(--bg-subtle)',
                    color: shift.is_active ? 'white' : 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: 'var(--text-sm)',
                    cursor: isManagement ? 'not-allowed' : 'pointer',
                  }}
                >
                  {shift.is_active ? '✅ Aktif' : '⏸ Nonaktif'}
                </button>
              </div>
            }
          >
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 'var(--space-4)',
              opacity: shift.is_active ? 1 : 0.5,
              pointerEvents: isManagement ? 'none' : 'auto',
            }}>
              <FormField label="Jam Mulai">
                <Input
                  type="time"
                  value={shift.start_time}
                  onChange={e => updateShift(idx, 'start_time', e.target.value)}
                />
              </FormField>
              <FormField label="Jam Selesai">
                <Input
                  type="time"
                  value={shift.end_time}
                  onChange={e => updateShift(idx, 'end_time', e.target.value)}
                />
              </FormField>
              <FormField label="Istirahat (menit)">
                <Input
                  type="number"
                  value={shift.break_minutes}
                  onChange={e => updateShift(idx, 'break_minutes', Number(e.target.value))}
                  min={0}
                />
              </FormField>
              <FormField label="Jam Efektif">
                <div style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-subtle)',
                  fontWeight: 700,
                  color: 'var(--color-primary-600)',
                  fontSize: 'var(--text-lg)',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <Timer size={16} /> {shift.effective_hours} jam
                </div>
              </FormField>
              <FormField label="Maks. Batch Goreng">
                <div style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-warning-50)',
                  fontWeight: 700,
                  color: 'var(--color-warning-700)',
                  fontSize: 'var(--text-lg)',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  🔥 {shift.max_fryer_batches} batch
                </div>
              </FormField>
            </div>
          </Card>
        ))}

        {/* Batch Parameters */}
        <Card header={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Coffee size={18} /> <strong>Parameter Siklus Produksi (Per Batch)</strong></span>}>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
            Waktu standar untuk setiap tahapan produksi dalam 1 siklus (batch). Perubahan akan otomatis menghitung ulang kapasitas batch per shift.
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 'var(--space-4)',
            pointerEvents: isManagement ? 'none' : 'auto',
          }}>
            <FormField label="Lama Penggorengan (menit)">
              <Input
                type="number"
                value={config.batch_parameters.standard_frying_minutes}
                onChange={e => updateBatchParam('standard_frying_minutes', Number(e.target.value))}
                min={1}
              />
            </FormField>
            <FormField label="Lama Penirisan / Spinner (menit)">
              <Input
                type="number"
                value={config.batch_parameters.standard_spinning_minutes}
                onChange={e => updateBatchParam('standard_spinning_minutes', Number(e.target.value))}
                min={1}
              />
            </FormField>
            <FormField label="Lama Pembumbuan (menit)">
              <Input
                type="number"
                value={config.batch_parameters.standard_seasoning_minutes}
                onChange={e => updateBatchParam('standard_seasoning_minutes', Number(e.target.value))}
                min={1}
              />
            </FormField>
            <FormField label="Kapasitas per Batch (kg)">
              <Input
                type="number"
                step="0.5"
                value={config.batch_parameters.batch_capacity_kg || 5}
                onChange={e => updateBatchParam('batch_capacity_kg', Number(e.target.value))}
                min={1}
              />
            </FormField>
          </div>
        </Card>


      </div>
    </div>
  );
}
