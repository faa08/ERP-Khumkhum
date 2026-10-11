'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Plus,
  Trash2,
  Sliders,
  CookingPot,
  Package,
  Info,
  Layers,
  ArrowRight,
  CheckCircle2,
  Calculator,
} from 'lucide-react';
import { getProductionStandards, saveProductionStandards } from '@/actions/standards';
import { getProducts, getRawMaterials } from '@/actions/master';
import type {
  ProductionStandardConfig,
  BomRecipe,
  DbProduct,
  DbRawMaterial,
  SeasoningConfig,
  PackagingConfig,
} from '@/types/database';

export default function ProductionStandardsPage() {
  const { user } = useAuth();
  const isManagement = user?.role === 'MANAGEMENT';

  const [activeTab, setActiveTab] = useState<'FRYING' | 'PACKAGING' | 'PREMIX' | 'MACHINERY'>('FRYING');

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
    bom_recipes: [
      {
        product_name: 'Jamur Crispy (Resep Dasar Penggorengan)',
        raw_mushroom_ratio: 1.0,
        premix_flour_ratio: 0.25,
        cooking_oil_ratio: 0.30,
        seasoning_ratio: 0.05,
      },
    ],
    premix_recipes: [],
    seasoning_per_variant: [],
    packaging_configs: [],
  });

  const [products, setProducts] = useState<DbProduct[]>([]);
  const [rawMaterials, setRawMaterials] = useState<DbRawMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [simulatedBatchGram, setSimulatedBatchGram] = useState<number>(800);

  const toast = useToast();

  const loadStandards = useCallback(async () => {
    setIsLoading(true);
    const [resStd, resProd, resRaw] = await Promise.all([
      getProductionStandards(),
      getProducts(),
      getRawMaterials(),
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

  // ── BOM Recipe Helpers (Goreng Dasar) ──
  const baseFryingRecipe: BomRecipe = useMemo(() => {
    if (config.bom_recipes && config.bom_recipes.length > 0) {
      return config.bom_recipes[0];
    }
    return {
      product_name: 'Jamur Crispy (Resep Dasar Penggorengan)',
      raw_mushroom_ratio: 1.0,
      premix_flour_ratio: 0.25,
      cooking_oil_ratio: 0.30,
      seasoning_ratio: 0.05,
    };
  }, [config.bom_recipes]);

  const updateBaseRecipe = (fields: Partial<BomRecipe>) => {
    const updatedRecipes = [...(config.bom_recipes || [])];
    if (updatedRecipes.length === 0) {
      updatedRecipes.push({ ...baseFryingRecipe, ...fields });
    } else {
      updatedRecipes[0] = { ...updatedRecipes[0], ...fields };
    }
    setConfig({ ...config, bom_recipes: updatedRecipes });
  };

  const handleAddAdditionalRecipe = () => {
    const newRecipe: BomRecipe = {
      product_name: 'Jamur Crispy Varian Khusus',
      raw_mushroom_ratio: 1.0,
      premix_flour_ratio: 0.25,
      cooking_oil_ratio: 0.30,
      seasoning_ratio: 0.05,
    };
    setConfig({ ...config, bom_recipes: [...(config.bom_recipes || []), newRecipe] });
  };

  const handleRemoveRecipe = (index: number) => {
    if (index === 0 && (config.bom_recipes || []).length === 1) {
      toast.error('Resep dasar utama tidak boleh dihapus');
      return;
    }
    const updated = (config.bom_recipes || []).filter((_, i) => i !== index);
    setConfig({ ...config, bom_recipes: updated });
  };

  // ── Premix Recipe Helpers ──
  const handleAddPremixRecipe = () => {
    const newRecipe = {
      premix_name: 'Tepung Premix KhumKhum',
      output_qty: 10,
      ingredients: [
        { name: 'Tepung Terigu', qty: 8 },
        { name: 'Tepung Tapioka', qty: 1 },
        { name: 'Bawang Putih Bubuk', qty: 1 },
      ],
    };
    setConfig({ ...config, premix_recipes: [...(config.premix_recipes || []), newRecipe] });
  };

  const handleRemovePremixRecipe = (index: number) => {
    const updated = (config.premix_recipes || []).filter((_, i) => i !== index);
    setConfig({ ...config, premix_recipes: updated });
  };

  // ── Seasoning / Packaging Helpers ──
  const updateSeasoningConfig = (index: number, fields: Partial<SeasoningConfig>) => {
    const updated = [...(config.seasoning_per_variant || [])];
    if (updated[index]) {
      updated[index] = { ...updated[index], ...fields };
      setConfig({ ...config, seasoning_per_variant: updated });
    }
  };

  const updatePackagingConfig = (index: number, fields: Partial<PackagingConfig>) => {
    const updated = [...(config.packaging_configs || [])];
    if (updated[index]) {
      updated[index] = { ...updated[index], ...fields };
      setConfig({ ...config, packaging_configs: updated });
    }
  };

  // Kalkulasi Simulasi Wajan
  const simMushroomKg = simulatedBatchGram / 1000;
  const simPremixKg = Math.round(simMushroomKg * (baseFryingRecipe.premix_flour_ratio || 0.25) * 1000) / 1000;
  const simOilLiter = Math.round(simMushroomKg * (baseFryingRecipe.cooking_oil_ratio || 0.30) * 1000) / 1000;
  const simOutputMinKg = Math.round(simMushroomKg * ((config.min_yield_percentage || 80) / 100) * 0.35 * 1000) / 1000;
  const simOutputMaxKg = Math.round(simMushroomKg * 0.35 * 1000) / 1000;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <PageHeader
        title="Standar Manufaktur & Resep Formula (BOM)"
        description="Konfigurasi integrasi alur pabrik: Resep dasar penggorengan jamur, bumbu & packaging per varian, formula premix, serta parameter rendemen."
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

      {/* PIPELINE INTEGRATION OVERVIEW BANNER */}
      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers className="w-5 h-5 text-[var(--color-primary-600)]" aria-hidden="true" />
              <strong style={{ fontSize: 'var(--text-base)' }}>Alur Integrasi Resep Manufaktur KhumKhum</strong>
            </div>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', background: 'var(--bg-subtle)', padding: '4px 10px', borderRadius: '12px' }}>
              Terintegrasi Otomatis dengan Modul Produksi & Stok Gudang
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 'var(--space-3)',
              background: 'var(--bg-subtle)',
              padding: 'var(--space-3)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--color-primary-100)', color: 'var(--color-primary-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '13px' }}>1</div>
              <div>
                <strong style={{ display: 'block', fontSize: 'var(--text-sm)' }}>Penggorengan Wajan</strong>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Jamur Segar + Premix + Minyak</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--color-warning-100)', color: 'var(--color-warning-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '13px' }}>2</div>
              <div>
                <strong style={{ display: 'block', fontSize: 'var(--text-sm)' }}>Penirisan Minyak</strong>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Jamur Goreng Curah (Longsong)</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--color-info-100)', color: 'var(--color-info-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '13px' }}>3</div>
              <div>
                <strong style={{ display: 'block', fontSize: 'var(--text-sm)' }}>Bumbu & Packaging</strong>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Bumbu Tabur Rasa + Pouch / Toples</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--color-success-100)', color: 'var(--color-success-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '13px' }}>4</div>
              <div>
                <strong style={{ display: 'block', fontSize: 'var(--text-sm)' }}>Produk Siap Jual</strong>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Stok Gudang Produk Jadi (FG)</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* NAVIGATION TABS */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px', flexWrap: 'wrap' }}>
        <Button
          variant={activeTab === 'FRYING' ? 'primary' : 'ghost'}
          onClick={() => setActiveTab('FRYING')}
          leftIcon={<Flame className="w-4 h-4" aria-hidden="true" />}
        >
          Resep Penggorengan (Goreng Jamur)
        </Button>
        <Button
          variant={activeTab === 'PACKAGING' ? 'primary' : 'ghost'}
          onClick={() => setActiveTab('PACKAGING')}
          leftIcon={<Package className="w-4 h-4" aria-hidden="true" />}
        >
          Standar Bumbu & Packaging
        </Button>
        <Button
          variant={activeTab === 'PREMIX' ? 'primary' : 'ghost'}
          onClick={() => setActiveTab('PREMIX')}
          leftIcon={<CookingPot className="w-4 h-4" aria-hidden="true" />}
        >
          Formula Tepung Premix
        </Button>
        <Button
          variant={activeTab === 'MACHINERY' ? 'primary' : 'ghost'}
          onClick={() => setActiveTab('MACHINERY')}
          leftIcon={<Sliders className="w-4 h-4" aria-hidden="true" />}
        >
          Standar Mesin & Rendemen
        </Button>
      </div>

      {/* ── TAB 1: RESEP PENGGORENGAN (GORENG JAMUR) ── */}
      {activeTab === 'FRYING' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Main Base Recipe Card */}
          <Card
            header={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Factory className="w-4 h-4 text-[var(--color-primary-600)]" aria-hidden="true" />
                  <strong>Resep BOM Dasar — Penggorengan Jamur Crispy (Tanpa Rasa)</strong>
                </div>
                <span style={{ fontSize: 'var(--text-xs)', background: 'var(--color-success-50)', color: 'var(--color-success-700)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                  Resep Standar Utama
                </span>
              </div>
            }
          >
            {/* Info callout tanpa emoji */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-info-50)',
                border: '1px solid var(--color-info-200)',
                fontSize: 'var(--text-sm)',
                color: 'var(--color-info-800)',
                marginBottom: 'var(--space-4)',
              }}
            >
              <Info className="w-5 h-5 text-[var(--color-info-600)] shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <strong>Ketentuan Penggorengan KhumKhum:</strong> Semua varian rasa (Original, Balado, BBQ, Pedas Manis, Super Pedas) menggunakan formula penggorengan dasar yang sama. Penggorengan dilakukan tanpa bumbu tabur. Penambahan bumbu rasa dan bahan kemasan diatur pada tahap <strong>Standar Bumbu & Packaging</strong>.
              </div>
            </div>

            {/* Frying Formula Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
              {/* 1. Jamur Mentah */}
              <div style={{ padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', background: 'var(--bg-default)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <strong style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>1. Jamur Tiram Bersih</strong>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Bahan Baku Utama</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <select
                    disabled={isManagement}
                    className="input"
                    style={{ width: '100%' }}
                    value={baseFryingRecipe.raw_mushroom_id || ''}
                    onChange={(e) => updateBaseRecipe({ raw_mushroom_id: e.target.value })}
                  >
                    <option value="" disabled>-- Pilih Bahan Jamur --</option>
                    {rawMaterials.filter(rm => rm.name.toLowerCase().includes('jamur')).map(rm => (
                      <option key={rm.id} value={rm.id}>{rm.name} ({rm.uom})</option>
                    ))}
                  </select>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Input
                      disabled={isManagement}
                      type="number"
                      step="0.1"
                      value={baseFryingRecipe.raw_mushroom_ratio}
                      onChange={(e) => updateBaseRecipe({ raw_mushroom_ratio: Number(e.target.value) })}
                    />
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>kg (Basis Rasio)</span>
                  </div>
                </div>
              </div>

              {/* 2. Tepung Premiks */}
              <div style={{ padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', background: 'var(--bg-default)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <strong style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>2. Tepung Premiks</strong>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Campuran Pelapis</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <select
                    disabled={isManagement}
                    className="input"
                    style={{ width: '100%' }}
                    value={baseFryingRecipe.premix_flour_id || ''}
                    onChange={(e) => updateBaseRecipe({ premix_flour_id: e.target.value })}
                  >
                    <option value="" disabled>-- Pilih Bahan Premiks --</option>
                    {rawMaterials.filter(rm => rm.name.toLowerCase().includes('premix') || rm.name.toLowerCase().includes('tepung')).map(rm => (
                      <option key={rm.id} value={rm.id}>{rm.name} ({rm.uom})</option>
                    ))}
                  </select>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Input
                      disabled={isManagement}
                      type="number"
                      step="0.01"
                      value={baseFryingRecipe.premix_flour_ratio}
                      onChange={(e) => updateBaseRecipe({ premix_flour_ratio: Number(e.target.value) })}
                    />
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>kg per 1 kg jamur</span>
                  </div>
                </div>
              </div>

              {/* 3. Minyak Goreng */}
              <div style={{ padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', background: 'var(--bg-default)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <strong style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>3. Minyak Goreng</strong>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Media Menggoreng</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <select
                    disabled={isManagement}
                    className="input"
                    style={{ width: '100%' }}
                    value={baseFryingRecipe.cooking_oil_id || ''}
                    onChange={(e) => updateBaseRecipe({ cooking_oil_id: e.target.value })}
                  >
                    <option value="" disabled>-- Pilih Minyak Goreng --</option>
                    {rawMaterials.filter(rm => rm.name.toLowerCase().includes('minyak')).map(rm => (
                      <option key={rm.id} value={rm.id}>{rm.name} ({rm.uom})</option>
                    ))}
                  </select>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Input
                      disabled={isManagement}
                      type="number"
                      step="0.01"
                      value={baseFryingRecipe.cooking_oil_ratio}
                      onChange={(e) => updateBaseRecipe({ cooking_oil_ratio: Number(e.target.value) })}
                    />
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>liter per 1 kg jamur</span>
                  </div>
                </div>
              </div>
            </div>

            {/* LIVE SIMULATOR CARD */}
            <div
              style={{
                marginTop: 'var(--space-4)',
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calculator className="w-4 h-4 text-[var(--color-primary-600)]" aria-hidden="true" />
                  <strong>Simulasi Kebutuhan Wajan Otomatis (Live Preview)</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Kapasitas Wajan:</span>
                  <div style={{ width: '100px' }}>
                    <Input
                      type="number"
                      step="50"
                      value={simulatedBatchGram}
                      onChange={(e) => setSimulatedBatchGram(Number(e.target.value) || 0)}
                    />
                  </div>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>gram</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-2)' }}>
                <div style={{ padding: '8px', borderRadius: '6px', background: 'var(--bg-default)' }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', display: 'block' }}>Jamur Tiram:</span>
                  <strong style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{simMushroomKg} kg ({simulatedBatchGram} gr)</strong>
                </div>
                <div style={{ padding: '8px', borderRadius: '6px', background: 'var(--bg-default)' }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', display: 'block' }}>Tepung Premiks:</span>
                  <strong style={{ fontSize: 'var(--text-sm)', color: 'var(--color-primary-700)' }}>{simPremixKg} kg ({Math.round(simPremixKg * 1000)} gr)</strong>
                </div>
                <div style={{ padding: '8px', borderRadius: '6px', background: 'var(--bg-default)' }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', display: 'block' }}>Minyak Goreng:</span>
                  <strong style={{ fontSize: 'var(--text-sm)', color: 'var(--color-warning-700)' }}>{simOilLiter} L ({Math.round(simOilLiter * 1000)} ml)</strong>
                </div>
                <div style={{ padding: '8px', borderRadius: '6px', background: 'var(--bg-default)' }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', display: 'block' }}>Estimasi Jamur Matang:</span>
                  <strong style={{ fontSize: 'var(--text-sm)', color: 'var(--color-success-700)' }}>~{Math.round(simOutputMinKg * 1000)} - {Math.round(simOutputMaxKg * 1000)} gr</strong>
                </div>
              </div>
            </div>
          </Card>

          {/* Optional Additional Frying Recipes */}
          {(config.bom_recipes || []).length > 1 && (
            <Card header={<strong>Resep Penggorengan Khusus Tambahan</strong>}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {(config.bom_recipes || []).slice(1).map((recipe, idx) => {
                  const actualIdx = idx + 1;
                  return (
                    <div
                      key={actualIdx}
                      style={{
                        padding: 'var(--space-3)',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--bg-subtle)',
                        border: '1px solid var(--border-default)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Input
                          style={{ maxWidth: '300px' }}
                          value={recipe.product_name}
                          onChange={(e) => {
                            const updated = [...(config.bom_recipes || [])];
                            updated[actualIdx].product_name = e.target.value;
                            setConfig({ ...config, bom_recipes: updated });
                          }}
                        />
                        {!isManagement && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveRecipe(actualIdx)}
                            aria-label={`Hapus resep ${recipe.product_name}`}
                          >
                            <Trash2 className="w-4 h-4 text-[var(--color-danger-600)]" aria-hidden="true" />
                          </Button>
                        )}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                        <div>
                          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Rasio Premiks (kg/kg):</span>
                          <Input
                            type="number"
                            step="0.01"
                            value={recipe.premix_flour_ratio}
                            onChange={(e) => {
                              const updated = [...(config.bom_recipes || [])];
                              updated[actualIdx].premix_flour_ratio = Number(e.target.value);
                              setConfig({ ...config, bom_recipes: updated });
                            }}
                          />
                        </div>
                        <div>
                          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Rasio Minyak (L/kg):</span>
                          <Input
                            type="number"
                            step="0.01"
                            value={recipe.cooking_oil_ratio}
                            onChange={(e) => {
                              const updated = [...(config.bom_recipes || [])];
                              updated[actualIdx].cooking_oil_ratio = Number(e.target.value);
                              setConfig({ ...config, bom_recipes: updated });
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {!isManagement && (
            <div>
              <Button variant="secondary" size="sm" onClick={handleAddAdditionalRecipe} leftIcon={<Plus className="w-4 h-4" aria-hidden="true" />}>
                Tambah Resep Penggorengan Khusus
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: STANDAR BUMBU & PACKAGING (PACKING) ── */}
      {activeTab === 'PACKAGING' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Card
            header={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Package className="w-4 h-4 text-[var(--color-primary-600)]" aria-hidden="true" />
                <strong>Standar Bumbu Tabur & Bahan Kemasan per Varian Rasa (Tahap Packing)</strong>
              </div>
            }
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-info-50)',
                border: '1px solid var(--color-info-200)',
                fontSize: 'var(--text-sm)',
                color: 'var(--color-info-800)',
                marginBottom: 'var(--space-4)',
              }}
            >
              <Info className="w-5 h-5 text-[var(--color-info-600)] shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <strong>Alur Tahap Packing:</strong> Jamur goreng curah (longsong) ditimbang, dicampur bumbu tabur sesuai varian rasa, lalu dikemas ke dalam Standing Pouch / Toples. Saat operator mencatat packing di modul Produksi, stok bumbu tabur dan bahan kemasan akan otomatis terpotong sesuai standar rasio di bawah ini.
              </div>
            </div>

            {/* Seasoning per Variant Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {(config.seasoning_per_variant || []).map((seasoning, sIdx) => {
                const ratioGram = Math.round(Number(seasoning.seasoning_ratio_per_kg || 0) * 1000);
                return (
                  <div
                    key={seasoning.variant}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '160px 1fr 140px 1fr',
                      gap: 'var(--space-3)',
                      alignItems: 'center',
                      padding: 'var(--space-3)',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-subtle)',
                      border: '1px solid var(--border-default)',
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', display: 'block' }}>
                        Varian {seasoning.variant}
                      </strong>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                        KhumKhum {seasoning.variant}
                      </span>
                    </div>

                    <div>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                        Bahan Bumbu Tabur:
                      </span>
                      <select
                        disabled={isManagement}
                        className="input"
                        style={{ width: '100%' }}
                        value={seasoning.seasoning_material_id || ''}
                        onChange={(e) => updateSeasoningConfig(sIdx, { seasoning_material_id: e.target.value })}
                      >
                        <option value="" disabled>-- Pilih Bahan Bumbu --</option>
                        {rawMaterials.filter(rm => rm.name.toLowerCase().includes('bumbu') || rm.material_category?.toLowerCase().includes('bumbu')).map(rm => (
                          <option key={rm.id} value={rm.id}>{rm.name} ({rm.uom})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                        Rasio Bumbu:
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Input
                          disabled={isManagement}
                          type="number"
                          step="0.005"
                          value={seasoning.seasoning_ratio_per_kg}
                          onChange={(e) => updateSeasoningConfig(sIdx, { seasoning_ratio_per_kg: Number(e.target.value) })}
                        />
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                          kg/kg ({ratioGram}g)
                        </span>
                      </div>
                    </div>

                    <div>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                        Bahan Kemasan Standar:
                      </span>
                      <select
                        disabled={isManagement}
                        className="input"
                        style={{ width: '100%' }}
                        value={seasoning.packaging_material_id || ''}
                        onChange={(e) => updateSeasoningConfig(sIdx, { packaging_material_id: e.target.value })}
                      >
                        <option value="" disabled>-- Pilih Bahan Kemasan --</option>
                        {rawMaterials.filter(rm => rm.name.toLowerCase().includes('kemasan') || rm.name.toLowerCase().includes('pack') || rm.name.toLowerCase().includes('toples') || rm.name.toLowerCase().includes('pouch')).map(rm => (
                          <option key={rm.id} value={rm.id}>{rm.name} ({rm.uom})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Packaging Types Specifications */}
          <Card
            header={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Package className="w-4 h-4 text-[var(--color-primary-600)]" aria-hidden="true" />
                <strong>Spesifikasi Tipe Kemasan & Master Material</strong>
              </div>
            }
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-3)' }}>
              {(config.packaging_configs || []).map((pkg, pIdx) => (
                <div
                  key={pkg.packaging_type}
                  style={{
                    padding: 'var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-default)',
                    background: 'var(--bg-default)',
                  }}
                >
                  <strong style={{ fontSize: 'var(--text-sm)', display: 'block', marginBottom: '4px' }}>{pkg.packaging_type}</strong>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Material Gudang Terhubung:</span>
                    <select
                      disabled={isManagement}
                      className="input"
                      style={{ width: '100%' }}
                      value={pkg.packaging_material_id || ''}
                      onChange={(e) => updatePackagingConfig(pIdx, { packaging_material_id: e.target.value })}
                    >
                      <option value="" disabled>-- Pilih Bahan Kemasan --</option>
                      {rawMaterials.map(rm => (
                        <option key={rm.id} value={rm.id}>{rm.name} ({rm.uom})</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── TAB 3: FORMULA TEPUNG PREMIX ── */}
      {activeTab === 'PREMIX' && (
        <Card
          header={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CookingPot className="w-4 h-4 text-[var(--color-primary-600)]" aria-hidden="true" />
                <strong>Resep Formula Dasar — Pembuatan Tepung Premix KhumKhum</strong>
              </div>
              {!isManagement && (config.premix_recipes?.length || 0) === 0 && (
                <Button variant="secondary" size="sm" onClick={handleAddPremixRecipe} leftIcon={<Plus className="w-4 h-4" aria-hidden="true" />}>
                  Tambah Resep Premix
                </Button>
              )}
            </div>
          }
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              padding: 'var(--space-3)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-info-50)',
              border: '1px solid var(--color-info-200)',
              fontSize: 'var(--text-sm)',
              color: 'var(--color-info-800)',
              marginBottom: 'var(--space-4)',
            }}
          >
            <Info className="w-5 h-5 text-[var(--color-info-600)] shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              Standar komposisi bahan baku (Tepung Terigu, Tepung Tapioka, Bawang Putih Bubuk, dll) untuk menghasilkan 1 batch Tepung Premix. Data ini terintegrasi dengan formulir <strong>Laporan Produksi Premix</strong> di modul Produksi.
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {(config.premix_recipes || []).map((recipe, index) => (
              <div
                key={`premix-${index}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 120px 2fr auto',
                  gap: 'var(--space-3)',
                  alignItems: 'start',
                  padding: 'var(--space-3)',
                  background: 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-default)',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Nama Output Premix:</span>
                  <Input
                    disabled={isManagement}
                    value={recipe.premix_name}
                    onChange={(e) => {
                      const updated = [...(config.premix_recipes || [])];
                      updated[index].premix_name = e.target.value;
                      setConfig({ ...config, premix_recipes: updated });
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Target Hasil (kg):</span>
                  <Input
                    disabled={isManagement}
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
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Komposisi Bahan Mentah (kg):</span>
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
                          {rawMaterials.map(rm => (
                            <option key={rm.id} value={rm.id}>{rm.name} ({rm.uom})</option>
                          ))}
                        </select>
                        <div style={{ width: '90px', flexShrink: 0 }}>
                          <Input
                            disabled={isManagement}
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
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          const updated = [...(config.premix_recipes || [])];
                          updated[index].ingredients.push({ name: '', qty: 0 });
                          setConfig({ ...config, premix_recipes: updated });
                        }}
                        style={{ alignSelf: 'flex-start', marginTop: '4px' }}
                      >
                        + Tambah Bahan Komposisi
                      </Button>
                    )}
                  </div>
                </div>

                <div style={{ paddingTop: '20px' }}>
                  {!isManagement && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemovePremixRecipe(index)}
                      aria-label="Hapus resep premix"
                    >
                      <Trash2 className="w-4 h-4 text-[var(--color-danger-600)]" aria-hidden="true" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── TAB 4: STANDAR MESIN & RENDEMEN ── */}
      {activeTab === 'MACHINERY' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 'var(--space-4)' }}>
          {/* 1. Rendemen Thresholds */}
          <Card header={<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Scale className="w-4 h-4 text-[var(--color-primary-600)]" aria-hidden="true" /> <strong>Ambang Batas Rendemen (%)</strong></div>}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <FormField label="Target Efisiensi Rendemen Minimum (%)" required>
                <Input
                  disabled={isManagement}
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
                <Input
                  disabled={isManagement}
                  type="number"
                  step="0.5"
                  value={config.warning_yield_percentage}
                  onChange={(e) => setConfig({ ...config, warning_yield_percentage: Number(e.target.value) })}
                />
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                  Rendemen di bawah nilai ini wajib mengisi alasan anomali produksi.
                </span>
              </FormField>

              <FormField label="Standar Berat Wajan per Batch (Gram)">
                <Input
                  disabled={isManagement}
                  type="number"
                  step="50"
                  value={config.default_batch_weight_gram || 800}
                  onChange={(e) => setConfig({ ...config, default_batch_weight_gram: Number(e.target.value) })}
                />
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                  Kapasitas optimal wajan saat penggorengan (default 800g).
                </span>
              </FormField>
            </div>
          </Card>

          {/* 2. Frying Parameters */}
          <Card header={<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Flame className="w-4 h-4 text-[var(--color-warning-600)]" aria-hidden="true" /> <strong>Parameter Penggorengan & Penirisan</strong></div>}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <FormField label="Suhu Minyak Min (°C)">
                <Input
                  disabled={isManagement}
                  type="number"
                  value={config.oil_temp_min}
                  onChange={(e) => setConfig({ ...config, oil_temp_min: Number(e.target.value) })}
                />
              </FormField>

              <FormField label="Suhu Minyak Maks (°C)">
                <Input
                  disabled={isManagement}
                  type="number"
                  value={config.oil_temp_max}
                  onChange={(e) => setConfig({ ...config, oil_temp_max: Number(e.target.value) })}
                />
              </FormField>

              <FormField label="Durasi Goreng (Menit)">
                <Input
                  disabled={isManagement}
                  type="number"
                  value={config.frying_duration_minutes}
                  onChange={(e) => setConfig({ ...config, frying_duration_minutes: Number(e.target.value) })}
                />
              </FormField>

              <FormField label="Durasi Spinner Minyak (Menit)">
                <Input
                  disabled={isManagement}
                  type="number"
                  value={config.spinning_duration_minutes}
                  onChange={(e) => setConfig({ ...config, spinning_duration_minutes: Number(e.target.value) })}
                />
              </FormField>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
