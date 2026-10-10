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
  CookingPot,
} from 'lucide-react';
import { getProductionStandards, saveProductionStandards } from '@/actions/standards';
import { getProducts, getRawMaterials } from '@/actions/master';
import type { ProductionStandardConfig, BomRecipe, DbProduct, DbRawMaterial } from '@/types/database';

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
    premix_recipes: [],
    seasoning_per_variant: [],
  });

  const [products, setProducts] = useState<DbProduct[]>([]);
  const [rawMaterials, setRawMaterials] = useState<DbRawMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const toast = useToast();

  const loadStandards = useCallback(async () => {
    setIsLoading(true);
    const [resStd, resProd, resRaw] = await Promise.all([
      getProductionStandards(),
      getProducts(),
      getRawMaterials()
    ]);
    
    if (resStd.success && resStd.data) {
      setConfig(resStd.data);
    }
    if (resProd.success && resProd.data) {
      setProducts(resProd.data);
    }
    if (resRaw.success && resRaw.data) {
      setRawMaterials(resRaw.data);
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

  const handleAddPremixRecipe = () => {
    const newRecipe = {
      premix_name: 'Tepung Premix KhumKhum',
      output_qty: 10,
      ingredients: [
        { name: 'Tepung Terigu', qty: 8 },
        { name: 'Tepung Tapioka', qty: 1 },
        { name: 'Bawang Putih Bubuk', qty: 1 }
      ]
    };
    setConfig({ ...config, premix_recipes: [...(config.premix_recipes || []), newRecipe] });
  };

  const handleRemovePremixRecipe = (index: number) => {
    const updated = (config.premix_recipes || []).filter((_, i) => i !== index);
    setConfig({ ...config, premix_recipes: updated });
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

      {/* 3. BOM Recipe Configuration — 1 Resep Dasar Goreng */}
      <Card header={<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Factory className="w-4 h-4 text-[var(--color-success-600)]" aria-hidden="true" /> <strong>Resep BOM Dasar — Goreng Jamur (Tanpa Rasa)</strong></div>
        {!isManagement && config.bom_recipes.length === 0 && <Button variant="secondary" size="sm" onClick={handleAddRecipe} leftIcon={<Plus className="w-3.5 h-3.5" aria-hidden="true" />}>Tambah Resep</Button>}
      </div>}>
        <p style={{ margin: 0, marginBottom: 'var(--space-2)', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
          Rasio kebutuhan bahan per 1,0 kg jamur tiram segar untuk proses <strong>goreng saja</strong>. Bumbu/rasa (Ori, Balado, BBQ, Pedas Manis, Super Pedas) ditambahkan pada tahap packing.
        </p>

        <div style={{
          padding: 'var(--space-3)', borderRadius: 'var(--radius-md)',
          background: 'var(--color-info-50)', border: '1px solid var(--color-info-200)',
          fontSize: 'var(--text-sm)', color: 'var(--color-info-700)',
          marginBottom: 'var(--space-3)',
        }}>
          💡 Cukup 1 resep dasar karena semua varian rasa menggunakan jamur goreng yang sama. Pemberian bumbu dilakukan saat packing.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {config.bom_recipes.map((recipe, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-3)',
                padding: 'var(--space-3)',
                background: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-3)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, maxWidth: '400px' }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Produk / Varian</span>
                  <select
                    disabled={isManagement}
                    className="input"
                    style={{ width: '100%' }}
                    value={recipe.product_id || ''}
                    onChange={(e) => {
                      const updated = [...config.bom_recipes];
                      const selectedId = e.target.value;
                      const selectedProd = products.find(p => p.id === selectedId);
                      updated[index].product_id = selectedId;
                      updated[index].product_name = selectedProd ? selectedProd.name : '';
                      setConfig({ ...config, bom_recipes: updated });
                    }}
                  >
                    <option value="" disabled>-- Pilih Produk --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
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

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-4)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Jamur Mentah</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select
                      disabled={isManagement}
                      className="input"
                      style={{ flex: 1, minWidth: 0 }}
                      value={recipe.raw_mushroom_id || ''}
                      onChange={(e) => {
                        const updated = [...config.bom_recipes];
                        updated[index].raw_mushroom_id = e.target.value;
                        setConfig({ ...config, bom_recipes: updated });
                      }}
                    >
                      <option value="" disabled>-- Pilih Jamur --</option>
                      {rawMaterials.filter(rm => rm.name.toLowerCase().includes('jamur') || rm.material_category === 'SAYURAN' || rm.material_category === 'LAINNYA').map(rm => (
                        <option key={rm.id} value={rm.id}>{rm.name} ({rm.uom})</option>
                      ))}
                    </select>
                    <div style={{ width: '90px', flexShrink: 0 }}>
                      <Input disabled={isManagement}
                        fullWidth
                        type="number"
                        step="0.1"
                        placeholder="kg"
                        value={recipe.raw_mushroom_ratio}
                        onChange={(e) => {
                          const updated = [...config.bom_recipes];
                          updated[index].raw_mushroom_ratio = Number(e.target.value);
                          setConfig({ ...config, bom_recipes: updated });
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Tepung Premiks</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select
                      disabled={isManagement}
                      className="input"
                      style={{ flex: 1, minWidth: 0 }}
                      value={recipe.premix_flour_id || ''}
                      onChange={(e) => {
                        const updated = [...config.bom_recipes];
                        updated[index].premix_flour_id = e.target.value;
                        setConfig({ ...config, bom_recipes: updated });
                      }}
                    >
                      <option value="" disabled>-- Pilih Premiks --</option>
                      {rawMaterials.map(rm => (
                        <option key={rm.id} value={rm.id}>{rm.name} ({rm.uom})</option>
                      ))}
                    </select>
                    <div style={{ width: '90px', flexShrink: 0 }}>
                      <Input disabled={isManagement}
                        fullWidth
                        type="number"
                        step="0.05"
                        placeholder="kg"
                        value={recipe.premix_flour_ratio}
                        onChange={(e) => {
                          const updated = [...config.bom_recipes];
                          updated[index].premix_flour_ratio = Number(e.target.value);
                          setConfig({ ...config, bom_recipes: updated });
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Minyak Goreng</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select
                      disabled={isManagement}
                      className="input"
                      style={{ flex: 1, minWidth: 0 }}
                      value={recipe.cooking_oil_id || ''}
                      onChange={(e) => {
                        const updated = [...config.bom_recipes];
                        updated[index].cooking_oil_id = e.target.value;
                        setConfig({ ...config, bom_recipes: updated });
                      }}
                    >
                      <option value="" disabled>-- Pilih Minyak --</option>
                      {rawMaterials.filter(rm => rm.name.toLowerCase().includes('minyak') || rm.material_category === 'LAINNYA').map(rm => (
                        <option key={rm.id} value={rm.id}>{rm.name} ({rm.uom})</option>
                      ))}
                    </select>
                    <div style={{ width: '90px', flexShrink: 0 }}>
                      <Input disabled={isManagement}
                        fullWidth
                        type="number"
                        step="0.05"
                        placeholder="L"
                        value={recipe.cooking_oil_ratio}
                        onChange={(e) => {
                          const updated = [...config.bom_recipes];
                          updated[index].cooking_oil_ratio = Number(e.target.value);
                          setConfig({ ...config, bom_recipes: updated });
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* 4. Premix Recipe Configuration */}
      <Card header={<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CookingPot className="w-4 h-4 text-[var(--color-primary-600)]" aria-hidden="true" /> <strong>Resep Dasar — Pembuatan Premix</strong></div>
        {!isManagement && (config.premix_recipes?.length || 0) === 0 && <Button variant="secondary" size="sm" onClick={handleAddPremixRecipe} leftIcon={<Plus className="w-3.5 h-3.5" aria-hidden="true" />}>Tambah Resep Premix</Button>}
      </div>}>
        <p style={{ margin: 0, marginBottom: 'var(--space-2)', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
          Standar komposisi bahan baku (Terigu, Bumbu, dll) untuk menghasilkan 1 batch Tepung Premix.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {(config.premix_recipes || []).map((recipe, index) => (
            <div
              key={`premix-${index}`}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 2fr auto',
                gap: 'var(--space-2)',
                alignItems: 'start',
                padding: 'var(--space-3)',
                background: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Nama Output</span>
                <Input disabled={isManagement}
                  value={recipe.premix_name}
                  onChange={(e) => {
                    const updated = [...(config.premix_recipes || [])];
                    updated[index].premix_name = e.target.value;
                    setConfig({ ...config, premix_recipes: updated });
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Output (kg)</span>
                <Input disabled={isManagement}
                  type="number"
                  step="0.1"
                  value={recipe.output_qty}
                  onChange={(e) => {
                    const updated = [...(config.premix_recipes || [])];
                    updated[index].output_qty = Number(e.target.value);
                    setConfig({ ...config, premix_recipes: updated });
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Komposisi (kg)</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {recipe.ingredients.map((ing, iIdx) => (
                    <div key={iIdx} style={{ display: 'flex', gap: '8px' }}>
                        <select
                          disabled={isManagement}
                          className="input"
                          style={{ flex: 1, minWidth: 0 }}
                          value={ing.raw_material_id || ''}
                          onChange={(e) => {
                            const updated = [...(config.premix_recipes || [])];
                            const selectedId = e.target.value;
                            const selectedRm = rawMaterials.find(rm => rm.id === selectedId);
                            updated[index].ingredients[iIdx].raw_material_id = selectedId;
                            updated[index].ingredients[iIdx].name = selectedRm ? selectedRm.name : '';
                            setConfig({ ...config, premix_recipes: updated });
                          }}
                        >
                          <option value="" disabled>-- Pilih Bahan --</option>
                          {rawMaterials
                            .map(rm => (
                            <option key={rm.id} value={rm.id}>{rm.name} ({rm.uom})</option>
                          ))}
                        </select>
                      <div style={{ width: '90px', flexShrink: 0 }}>
                        <Input disabled={isManagement}
                          fullWidth
                          type="number"
                          step="0.1"
                          placeholder="Qty"
                          value={ing.qty}
                          onChange={(e) => {
                            const updated = [...(config.premix_recipes || [])];
                            updated[index].ingredients[iIdx].qty = Number(e.target.value);
                            setConfig({ ...config, premix_recipes: updated });
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  {!isManagement && (
                    <Button variant="secondary" size="sm" onClick={() => {
                      const updated = [...(config.premix_recipes || [])];
                      updated[index].ingredients.push({ name: '', qty: 0 });
                      setConfig({ ...config, premix_recipes: updated });
                    }} style={{ alignSelf: 'flex-start', marginTop: '4px' }}>+ Tambah Bahan</Button>
                  )}
                </div>
              </div>

              <div style={{ paddingTop: '16px' }}>
                {!isManagement && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemovePremixRecipe(index)}
                    aria-label={`Hapus resep premix`}
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
