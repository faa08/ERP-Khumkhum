'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/form/FormField';
import { useToast } from '@/hooks/useToast';
import {
  ShieldCheck,
  Save,
  CheckCircle2,
  AlertTriangle,
  Droplets,
  Plus,
  Trash2,
} from 'lucide-react';
import { getQcStandards, saveQcStandards } from '@/actions/standards';
import type { QcStandardConfig, DefectCategoryConfig } from '@/types/database';

export default function QcStandardsPage() {
  const [config, setConfig] = useState<QcStandardConfig>({
    max_defect_rate: 5.0,
    max_moisture_percentage: 12.0,
    min_sample_size: 20,
    defect_categories: [],
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const toast = useToast();

  const loadStandards = useCallback(async () => {
    setIsLoading(true);
    const res = await getQcStandards();
    if (res.success && res.data) {
      setConfig(res.data);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadStandards();
  }, [loadStandards]);

  const handleSave = async () => {
    setIsSaving(true);
    const res = await saveQcStandards(config);
    if (res.success) {
      toast.success('Standar parameter mutu & kategori cacat QC berhasil disimpan');
    } else {
      toast.error(res.error || 'Gagal menyimpan konfigurasi standar QC');
    }
    setIsSaving(false);
  };

  const handleAddCategory = () => {
    const newCat: DefectCategoryConfig = {
      id: `defect_${Date.now()}`,
      name: 'Kategori Cacat Baru',
      weight: 1.0,
      severity: 'MEDIUM',
    };
    setConfig({ ...config, defect_categories: [...config.defect_categories, newCat] });
  };

  const handleRemoveCategory = (index: number) => {
    const updated = config.defect_categories.filter((_, i) => i !== index);
    setConfig({ ...config, defect_categories: updated });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <PageHeader
        title="Standar Kendali Mutu & Parameter QC"
        description="Konfigurasi batas toleransi cacat produk jadi pangan, batas kadar air maksimum, ukuran sampling minimum, dan klasifikasi tingkat keparahan cacat."
        breadcrumbs={[{ label: 'Data Induk' }, { label: 'Standar QC' }]}
        actions={
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={isSaving || isLoading}
            leftIcon={<Save size={16} />}
          >
            {isSaving ? 'Menyimpan...' : 'Simpan Perubahan Standar'}
          </Button>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 'var(--space-4)' }}>
        {/* 1. Quality Thresholds */}
        <Card header={<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><ShieldCheck size={18} color="var(--color-primary-600)" /> <strong>Batas Ambang Mutu & Sampling</strong></div>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <FormField label="Maksimal Batas Cacat Toleransi / Defect Rate (%)" required>
              <Input
                type="number"
                step="0.5"
                value={config.max_defect_rate}
                onChange={(e) => setConfig({ ...config, max_defect_rate: Number(e.target.value) })}
              />
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                Jika defect rate &gt; batas ini, batch otomatis direkomendasikan REWORK / REJECT.
              </span>
            </FormField>

            <FormField label="Maksimal Kadar Air Jamur Crispy Matang (%)" required>
              <Input
                type="number"
                step="0.5"
                value={config.max_moisture_percentage}
                onChange={(e) => setConfig({ ...config, max_moisture_percentage: Number(e.target.value) })}
              />
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                Standar mutu kerenyahan pangan: maksimal 12.0%.
              </span>
            </FormField>

            <FormField label="Ukuran Sampel Minimum per Batch (pcs kemasan)" required>
              <Input
                type="number"
                value={config.min_sample_size}
                onChange={(e) => setConfig({ ...config, min_sample_size: Number(e.target.value) })}
              />
            </FormField>
          </div>
        </Card>

        {/* 2. Organoleptic Testing Guide */}
        <Card header={<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Droplets size={18} color="var(--color-info-600)" /> <strong>Panduan Parameter Uji Organoleptik</strong></div>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', fontSize: 'var(--text-sm)' }}>
            <div style={{ padding: 'var(--space-2) var(--space-3)', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
              <strong>1. Warna & Penampilan:</strong> Cerah keemasan merata, tidak terdapat bintik gosong hitam.
            </div>
            <div style={{ padding: 'var(--space-2) var(--space-3)', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
              <strong>2. Kerenyahan (Crispiness):</strong> Renyah rekah tanpa ada sensasi liat/alot (kadar air &le; 12%).
            </div>
            <div style={{ padding: 'var(--space-2) var(--space-3)', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
              <strong>3. Aroma & Rasa:</strong> Gurih khas jamur tiram, bumbu merata, tidak tengik (minyak baru).
            </div>
            <div style={{ padding: 'var(--space-2) var(--space-3)', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
              <strong>4. Integritas Sealing:</strong> Kemasan tertutup kedap udara tanpa ada celah kebocoran seal.
            </div>
          </div>
        </Card>
      </div>

      {/* 3. Defect Categories Configuration */}
      <Card header={<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><AlertTriangle size={18} color="var(--color-warning-600)" /> <strong>Master Klasifikasi Jenis Cacat Mutu</strong></div>
        <Button variant="secondary" size="sm" onClick={handleAddCategory} leftIcon={<Plus size={14} />}>Tambah Jenis Cacat</Button>
      </div>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {config.defect_categories.map((cat, index) => (
            <div
              key={index}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr auto',
                gap: 'var(--space-3)',
                alignItems: 'center',
                padding: 'var(--space-3)',
                background: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Deskripsi Cacat</span>
                <Input
                  value={cat.name}
                  onChange={(e) => {
                    const updated = [...config.defect_categories];
                    updated[index].name = e.target.value;
                    setConfig({ ...config, defect_categories: updated });
                  }}
                />
              </div>

              <div>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Tingkat Keparahan</span>
                <Select
                  options={[
                    { value: 'CRITICAL', label: 'Kritis (Critical)' },
                    { value: 'HIGH', label: 'Tinggi (High)' },
                    { value: 'MEDIUM', label: 'Sedang (Medium)' },
                    { value: 'LOW', label: 'Rendah (Low)' },
                  ]}
                  value={cat.severity}
                  onChange={(e) => {
                    const updated = [...config.defect_categories];
                    updated[index].severity = e.target.value as any;
                    setConfig({ ...config, defect_categories: updated });
                  }}
                />
              </div>

              <div>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Bobot Penalti</span>
                <Input
                  type="number"
                  step="0.1"
                  value={cat.weight}
                  onChange={(e) => {
                    const updated = [...config.defect_categories];
                    updated[index].weight = Number(e.target.value);
                    setConfig({ ...config, defect_categories: updated });
                  }}
                />
              </div>

              <div style={{ paddingTop: '16px' }}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveCategory(index)}
                  style={{ color: 'var(--color-danger-600)' }}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
