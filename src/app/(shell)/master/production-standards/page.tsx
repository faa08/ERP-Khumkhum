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
  Factory,
  Save,
  Flame,
  Scale,
  Sparkles,
  Plus,
  Trash2,
  Sliders,
} from 'lucide-react';
import { getProductionStandards, saveProductionStandards } from '@/actions/standards';
import type { ProductionStandardConfig, BomRecipe } from '@/types/database';

export default function ProductionStandardsPage() {
  const { user } = useAuth();
  const isManagement = user?.role === 'MANAGEMENT';

  const [config, setConfig] = useState<ProductionStandardConfig>({
    min_yield_percentage: 80.0,
    warning_yield_percentage: 75.0,
    oil_temp_min: 160,
    oil_temp_max: 180,
    frying_duration_minutes: 15,
    spinning_duration_minutes: 5,
    default_batch_weight_gram: 800,
    default_rating_factor: 1.0,
    default_allowance_factor: 0.15,
    bom_recipes: [],
    seasoning_per_variant: [],
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const toast = useToast();

  const loadStandards = useCallback(async () => {
    setIsLoading(true);
    const res = await getProductionStandards();
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
    const res = await saveProductionStandards(config);
    if (res.success) {
      toast.success('Standar parameter produksi & resep BOM berhasil disimpan');
    } else {
      toast.error(res.error || 'Gagal menyimpan konfigurasi standar');
    }
    setIsSaving(false);
  };

  const handleAddRecipe = () => {
    const newRecipe: BomRecipe = {
      product_name: 'Jamur Crispy Varian Baru',
      raw_mushroom_ratio: 1.0,
      premix_flour_ratio: 0.25,
      cooking_oil_ratio: 0.30,
      seasoning_ratio: 0.06,
    };
    setConfig({ ...config, bom_recipes: [...config.bom_recipes, newRecipe] });
  };

  const handleRemoveRecipe = (index: number) => {
    const updated = config.bom_recipes.filter((_, i) => i !== index);
    setConfig({ ...config, bom_recipes: updated });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <PageHeader
        title="Standar Manufaktur & Resep Formula (BOM)"
        description="Konfigurasi target rendemen efisiensi wajan, suhu & durasi penggorengan, serta standar kebutuhan bahan per 1 kg jamur tiram segar."
        breadcrumbs={[{ label: 'Data Induk' }, { label: 'Standar Produksi' }]}
        actions={
          !isManagement ? (
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={isSaving || isLoading}
              leftIcon={<Save className="w-4 h-4" aria-hidden="true" />}
            >
              {isSaving ? 'Menyimpan...' : 'Simpan Perubahan Standar'}
            </Button>
          ) : undefined
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 'var(--space-4)' }}>
        {/* 1. Rendemen Thresholds */}
        <Card header={<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Scale className="w-4 h-4 text-[var(--color-primary-600)]" aria-hidden="true" /> <strong>Ambang Batas Rendemen (%)</strong></div>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <FormField label="Target Efisiensi Rendemen Minimum (%)" required>
              <Input disabled={isManagement}
                type="number"
                step="0.5"
                value={config.min_yield_percentage}
                onChange={(e) => setConfig({ ...config, min_yield_percentage: Number(e.target.value) })}
              />
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                Rendemen di atas nilai ini ditandai Hijau (Optimal).
              </span>
            </FormField>

            <FormField label="Batas Peringatan Rendemen Rendah / Warning (%)" required>
              <Input disabled={isManagement}
                type="number"
                step="0.5"
                value={config.warning_yield_percentage}
                onChange={(e) => setConfig({ ...config, warning_yield_percentage: Number(e.target.value) })}
              />
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                Rendemen di bawah nilai ini wajib mengisi alasan anomali produksi.
              </span>
            </FormField>
          </div>
        </Card>

        {/* 2. Frying Parameters */}
        <Card header={<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Flame className="w-4 h-4 text-[var(--color-warning-600)]" aria-hidden="true" /> <strong>Parameter Penggorengan & Penirisan</strong></div>}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <FormField label="Suhu Minyak Min (°C)">
              <Input disabled={isManagement}
                type="number"
                value={config.oil_temp_min}
                onChange={(e) => setConfig({ ...config, oil_temp_min: Number(e.target.value) })}
              />
            </FormField>

            <FormField label="Suhu Minyak Maks (°C)">
              <Input disabled={isManagement}
                type="number"
                value={config.oil_temp_max}
                onChange={(e) => setConfig({ ...config, oil_temp_max: Number(e.target.value) })}
              />
            </FormField>

            <FormField label="Durasi Goreng (Menit)">
              <Input disabled={isManagement}
                type="number"
                value={config.frying_duration_minutes}
                onChange={(e) => setConfig({ ...config, frying_duration_minutes: Number(e.target.value) })}
              />
            </FormField>

            <FormField label="Durasi Spinner Minyak (Menit)">
              <Input disabled={isManagement}
                type="number"
                value={config.spinning_duration_minutes}
                onChange={(e) => setConfig({ ...config, spinning_duration_minutes: Number(e.target.value) })}
              />
            </FormField>
          </div>
        </Card>
      </div>

      {/* 3. BOM Recipes Configuration */}
      <Card header={<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Factory className="w-4 h-4 text-[var(--color-success-600)]" aria-hidden="true" /> <strong>Resep Bill of Materials (BOM) Standar per 1 kg Jamur Bersih</strong></div>
        {!isManagement && <Button variant="secondary" size="sm" onClick={handleAddRecipe} leftIcon={<Plus className="w-3.5 h-3.5" aria-hidden="true" />}>Tambah Varian Resep</Button>}
      </div>}>
        <p style={{ margin: 0, marginBottom: 'var(--space-3)', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
          Rasio kebutuhan bahan pembantu per 1.0 kg jamur tiram segar untuk estimasi kebutuhan bahan otomatis (MRP).
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {config.bom_recipes.map((recipe, index) => (
            <div
              key={index}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto',
                gap: 'var(--space-2)',
                alignItems: 'center',
                padding: 'var(--space-3)',
                background: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Nama Produk / Varian</span>
                <Input disabled={isManagement}
                  value={recipe.product_name}
                  onChange={(e) => {
                    const updated = [...config.bom_recipes];
                    updated[index].product_name = e.target.value;
                    setConfig({ ...config, bom_recipes: updated });
                  }}
                />
              </div>

              <div>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Jamur (kg)</span>
                <Input disabled={isManagement}
                  type="number"
                  step="0.1"
                  value={recipe.raw_mushroom_ratio}
                  onChange={(e) => {
                    const updated = [...config.bom_recipes];
                    updated[index].raw_mushroom_ratio = Number(e.target.value);
                    setConfig({ ...config, bom_recipes: updated });
                  }}
                />
              </div>

              <div>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Premiks (kg)</span>
                <Input disabled={isManagement}
                  type="number"
                  step="0.05"
                  value={recipe.premix_flour_ratio}
                  onChange={(e) => {
                    const updated = [...config.bom_recipes];
                    updated[index].premix_flour_ratio = Number(e.target.value);
                    setConfig({ ...config, bom_recipes: updated });
                  }}
                />
              </div>

              <div>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Minyak (L)</span>
                <Input disabled={isManagement}
                  type="number"
                  step="0.05"
                  value={recipe.cooking_oil_ratio}
                  onChange={(e) => {
                    const updated = [...config.bom_recipes];
                    updated[index].cooking_oil_ratio = Number(e.target.value);
                    setConfig({ ...config, bom_recipes: updated });
                  }}
                />
              </div>

              <div>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Bumbu (kg)</span>
                <Input disabled={isManagement}
                  type="number"
                  step="0.01"
                  value={recipe.seasoning_ratio}
                  onChange={(e) => {
                    const updated = [...config.bom_recipes];
                    updated[index].seasoning_ratio = Number(e.target.value);
                    setConfig({ ...config, bom_recipes: updated });
                  }}
                />
              </div>

              <div style={{ paddingTop: '16px' }}>
                {!isManagement && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveRecipe(index)}
                    aria-label={`Hapus resep ${recipe.product_name}`}
                  >
                    <Trash2 className="w-4 h-4 text-[var(--color-danger-600)]" aria-hidden="true" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
