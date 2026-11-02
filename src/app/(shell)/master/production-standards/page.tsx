'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
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
  Lock,
  RotateCcw,
  Sparkles,
  Database,
} from 'lucide-react';
import { getProductionStandards, saveProductionStandards } from '@/actions/standards';
import { getProducts, getRawMaterials } from '@/actions/master';
import { parseNettoGram, DEFAULT_PACKAGING_BOM_MAP } from '@/lib/packaging-bom';
import type {
  ProductionStandardConfig,
  BomRecipe,
  BomIngredientItem,
  DbProduct,
  DbRawMaterial,
  SeasoningConfig,
  PackagingConfig,
  PackagingBomStandard,
} from '@/types/database';

export default function ProductionStandardsPage() {
  const { user } = useAuth();
  const isManagement = user?.role === 'MANAGEMENT';

  const [activeTab, setActiveTab] = useState<'FRYING' | 'MACHINERY' | 'PACKAGING_BOM'>('FRYING');

  const [config, setConfig] = useState<ProductionStandardConfig>({
    min_yield_percentage: 80.0,
    warning_yield_percentage: 75.0,
    max_yield_percentage: 85.0,
    oil_temp_min: 160,
    oil_temp_max: 180,
    frying_duration_minutes: 15,
    spinning_duration_minutes: 5,
    default_batch_weight_gram: 800,
    default_rating_factor: 1.0,
    default_allowance_factor: 0.15,
    bom_recipes: [
      {
        product_name: 'Jamur Crispy Polos (Resep Dasar Penggorengan Curah)',
        raw_mushroom_ratio: 1.0,
        premix_flour_ratio: 0.25,
        cooking_oil_ratio: 0.30,
        seasoning_ratio: 0.0,
        ingredients: [],
      },
    ],
    premix_recipes: [],
    seasoning_per_variant: [],
    packaging_configs: [],
    packaging_bom_standards: [
      { id: 'bom-75g', package_size: '75g', packaging_type: 'Standing Pouch', seasoning_gram: 0, mushroom_gram: 75 },
      { id: 'bom-60g', package_size: '60g', packaging_type: 'Standing Pouch', seasoning_gram: 0, mushroom_gram: 60 },
    ],
  });

  const [products, setProducts] = useState<DbProduct[]>([]);
  const [rawMaterials, setRawMaterials] = useState<DbRawMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Sinkronisasi otomatis ukuran kemasan dari Master Produk Jadi (DbProduct[])
  const currentBomStandards = useMemo(() => {
    const existingList: PackagingBomStandard[] = config.packaging_bom_standards && config.packaging_bom_standards.length > 0
      ? config.packaging_bom_standards
      : [
          { id: 'bom-75g', package_size: '75g', packaging_type: 'Standing Pouch', seasoning_gram: 0, mushroom_gram: 75 },
          { id: 'bom-60g', package_size: '60g', packaging_type: 'Standing Pouch', seasoning_gram: 0, mushroom_gram: 60 },
        ];

    const map = new Map<string, PackagingBomStandard>();
    existingList.forEach(item => {
      const key = `${parseNettoGram(item.package_size)}g`;
      map.set(key, { ...item, package_size: key });
    });

    // Otomatis ekstrak dari seluruh produk jadi aktif
    products.forEach(p => {
      const weightMatch = (p.name || '').match(/\d+\s*(?:g|gr|gram|kg)/i);
      const rawWeight = p.package_weight || (weightMatch ? weightMatch[0] : null);
      if (rawWeight) {
        const netto = parseNettoGram(rawWeight);
        if (netto > 0) {
          const key = `${netto}g`;
          if (!map.has(key)) {
            const nameLower = (p.name || '').toLowerCase();
            const pType = nameLower.includes('toples') ? 'Toples' : nameLower.includes('bantal') ? 'Pouch Bantal' : 'Standing Pouch';
            // Default awal takaran bumbu 0g, menunggu input dari KhumKhum
            map.set(key, {
              id: `bom-${key}`,
              package_size: key,
              packaging_type: pType,
              seasoning_gram: 0,
              mushroom_gram: netto,
            });
          }
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => parseNettoGram(b.package_size) - parseNettoGram(a.package_size));
  }, [config.packaging_bom_standards, products]);

  const handleUpdateBomItem = (id: string, field: keyof PackagingBomStandard, val: any) => {
    const activeList = config.packaging_bom_standards && config.packaging_bom_standards.length > 0
      ? config.packaging_bom_standards
      : currentBomStandards;
    const targetItem = activeList.find(item => item.id === id || item.package_size === id);
    const netto = parseNettoGram(targetItem?.package_size);
    const maxSeasoning = Math.round((netto / 2) * 10) / 10;

    let finalVal = val;
    if (field === 'seasoning_gram') {
      let num = parseFloat(val);
      if (isNaN(num) || num < 0) num = 0;
      if (num > maxSeasoning) {
        num = maxSeasoning;
        toast.warning(`Takaran bumbu maksimal 50% dari berat kemasan (maks. ${maxSeasoning}g untuk kemasan ${netto}g)`);
      }
      finalVal = num;
    }

    setConfig(prev => {
      const list = [...(prev.packaging_bom_standards && prev.packaging_bom_standards.length > 0 ? prev.packaging_bom_standards : currentBomStandards)];
      const idx = list.findIndex(item => item.id === id || item.package_size === id);

      if (idx === -1) {
        if (!targetItem) return prev;
        const current = { ...targetItem, [field]: finalVal };
        if (field === 'seasoning_gram' || field === 'package_size') {
          const sGram = Number(current.seasoning_gram) || 0;
          current.mushroom_gram = Math.max(0, netto - sGram);
        }
        return { ...prev, packaging_bom_standards: [...list, current] };
      }

      const current = { ...list[idx], [field]: finalVal };
      if (field === 'seasoning_gram' || field === 'package_size') {
        const sGram = Number(current.seasoning_gram) || 0;
        current.mushroom_gram = Math.max(0, netto - sGram);
      }
      list[idx] = current;
      return { ...prev, packaging_bom_standards: list };
    });
  };

  // State tambah bahan wajan baru
  const [selectedFryingRawId, setSelectedFryingRawId] = useState('');
  const [newFryingRatio, setNewFryingRatio] = useState('0.25');
  const [isAddingFryingCustom, setIsAddingFryingCustom] = useState(false);

  // State Simulasi Level 2 (Wajan Penggorengan Curah)
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
    const premixIng = fryingIngredients.find(i => i.name.toLowerCase().includes('premix') || i.name.toLowerCase().includes('tepung'));
    const oilIng = fryingIngredients.find(i => i.name.toLowerCase().includes('minyak'));
    const mushroomIng = fryingIngredients.find(i => i.name.toLowerCase().includes('jamur'));

    const baseSynced: BomRecipe = {
      ...(config.bom_recipes?.[0] || baseFryingRecipe),
      ingredients: fryingIngredients,
      ...(premixIng ? { premix_flour_ratio: premixIng.ratio_per_kg, premix_flour_id: premixIng.raw_material_id } : {}),
      ...(oilIng ? { cooking_oil_ratio: oilIng.ratio_per_kg, cooking_oil_id: oilIng.raw_material_id } : {}),
      ...(mushroomIng ? { raw_mushroom_ratio: mushroomIng.ratio_per_kg, raw_mushroom_id: mushroomIng.raw_material_id } : {}),
    };

    let updatedBom = [...(config.bom_recipes || [])];
    if (updatedBom.length === 0) {
      updatedBom.push(baseSynced);
    } else {
      updatedBom[0] = baseSynced;
    }
    const finalConfig = {
      ...config,
      bom_recipes: updatedBom,
      packaging_bom_standards: config.packaging_bom_standards || currentBomStandards,
    };

    const res = await saveProductionStandards(finalConfig);
    if (res.success) {
      setConfig(finalConfig);
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
      product_name: 'Jamur Crispy Polos (Resep Dasar Penggorengan Curah)',
      raw_mushroom_ratio: 1.0,
      premix_flour_ratio: 0.25,
      cooking_oil_ratio: 0.30,
      seasoning_ratio: 0.0,
      ingredients: [],
    };
  }, [config.bom_recipes]);

  const updateBaseRecipe = useCallback((fields: Partial<BomRecipe>) => {
    const updatedRecipes = [...(config.bom_recipes || [])];
    if (updatedRecipes.length === 0) {
      updatedRecipes.push({ ...baseFryingRecipe, ...fields });
    } else {
      updatedRecipes[0] = { ...updatedRecipes[0], ...fields };
    }
    setConfig(prev => ({ ...prev, bom_recipes: updatedRecipes }));
  }, [config.bom_recipes, baseFryingRecipe]);

  // Daftar bahan baku wajan aktif (Dinamis dari Warehouse seperti Premix)
  const fryingIngredients = useMemo<BomIngredientItem[]>(() => {
    if (baseFryingRecipe.ingredients && baseFryingRecipe.ingredients.length > 0) {
      return baseFryingRecipe.ingredients;
    }
    // Jika belum ada array ingredients, inisialisasi dari legacy data jika ada
    const items: BomIngredientItem[] = [];
    if (baseFryingRecipe.raw_mushroom_id) {
      const rm = rawMaterials.find(r => r.id === baseFryingRecipe.raw_mushroom_id);
      items.push({
        raw_material_id: baseFryingRecipe.raw_mushroom_id,
        name: rm?.name || 'Jamur Tiram Segar',
        ratio_per_kg: Number(baseFryingRecipe.raw_mushroom_ratio) || 1.0,
        uom: rm?.uom || 'kg',
      });
    }
    if (baseFryingRecipe.premix_flour_id) {
      const rm = rawMaterials.find(r => r.id === baseFryingRecipe.premix_flour_id);
      items.push({
        raw_material_id: baseFryingRecipe.premix_flour_id,
        name: rm?.name || 'Tepung Premix KhumKhum',
        ratio_per_kg: Number(baseFryingRecipe.premix_flour_ratio) || 0.25,
        uom: rm?.uom || 'kg',
      });
    }
    if (baseFryingRecipe.cooking_oil_id) {
      const rm = rawMaterials.find(r => r.id === baseFryingRecipe.cooking_oil_id);
      items.push({
        raw_material_id: baseFryingRecipe.cooking_oil_id,
        name: rm?.name || 'Minyak Goreng',
        ratio_per_kg: Number(baseFryingRecipe.cooking_oil_ratio) || 0.30,
        uom: rm?.uom || 'liter',
      });
    }
    return items;
  }, [baseFryingRecipe, rawMaterials]);

  // Tambah bahan baru ke resep wajan
  const handleAddFryingItem = () => {
    if (!selectedFryingRawId) {
      toast.error('Pilih bahan baku dari warehouse terlebih dahulu');
      return;
    }
    const rm = rawMaterials.find(r => r.id === selectedFryingRawId);
    if (!rm) return;

    if (fryingIngredients.some(i => i.raw_material_id === selectedFryingRawId)) {
      toast.error(`${rm.name} sudah ada di daftar resep wajan`);
      return;
    }

    const ratio = Number(newFryingRatio) || 0.1;
    const updated = [
      ...fryingIngredients,
      {
        raw_material_id: rm.id,
        name: rm.name,
        ratio_per_kg: ratio,
        uom: rm.uom || 'kg',
      },
    ];

    updateBaseRecipe({ ingredients: updated });
    setSelectedFryingRawId('');
    setNewFryingRatio('0.25');
    setIsAddingFryingCustom(false);
    toast.success(`${rm.name} berhasil ditambahkan & terkunci ke resep wajan.`);
  };

  // Ubah rasio per kg bahan wajan
  const handleChangeFryingRatio = (rawId: string, val: string) => {
    const num = Number(val);
    const updated = fryingIngredients.map(item =>
      item.raw_material_id === rawId ? { ...item, ratio_per_kg: isNaN(num) ? 0 : num } : item
    );
    updateBaseRecipe({ ingredients: updated });
  };

  // Hapus satu bahan dari resep wajan
  const handleRemoveFryingItem = (rawId: string) => {
    const updated = fryingIngredients.filter(item => item.raw_material_id !== rawId);
    updateBaseRecipe({ ingredients: updated });
  };

  // Kosongkan seluruh bahan wajan
  const handleClearFryingRecipe = () => {
    updateBaseRecipe({
      ingredients: [],
      raw_mushroom_id: '',
      premix_flour_id: '',
      cooking_oil_id: '',
      additional_ingredients: [],
    });
    toast.success('Daftar bahan wajan dikosongkan. Silakan tentukan bahan dari gudang.');
  };

  // Muat Formula Acuan Standar Pabrik
  const handleLoadStandardFryingRecipe = () => {
    const mushroom = rawMaterials.find(rm => rm.name.toLowerCase().includes('jamur'));
    const premix = rawMaterials.find(rm => rm.name.toLowerCase().includes('premix') || rm.name.toLowerCase().includes('tepung'));
    const oil = rawMaterials.find(rm => rm.name.toLowerCase().includes('minyak'));

    const items: BomIngredientItem[] = [];
    if (mushroom) items.push({ raw_material_id: mushroom.id, name: mushroom.name, ratio_per_kg: 1.0, uom: mushroom.uom || 'kg' });
    if (premix) items.push({ raw_material_id: premix.id, name: premix.name, ratio_per_kg: 0.25, uom: premix.uom || 'kg' });
    if (oil) items.push({ raw_material_id: oil.id, name: oil.name, ratio_per_kg: 0.30, uom: oil.uom || 'liter' });

    updateBaseRecipe({
      ingredients: items,
      raw_mushroom_id: mushroom?.id || '',
      raw_mushroom_ratio: 1.0,
      premix_flour_id: premix?.id || '',
      premix_flour_ratio: 0.25,
      cooking_oil_id: oil?.id || '',
      cooking_oil_ratio: 0.30,
    });
    toast.success('Formula acuan standar wajan berhasil dimuat. Bahan terkunci, takaran rasio bebas disesuaikan.');
  };

  // Kalkulasi Simulasi Wajan (Dinamis dari fryingIngredients)
  const simScale = simulatedBatchGram / 1000;
  const simOutputMinKg = Math.round(simScale * ((config.min_yield_percentage || 80) / 100) * 0.35 * 1000) / 1000;
  const simOutputMaxKg = Math.round(simScale * 0.35 * 1000) / 1000;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <PageHeader
        title="Standar Manufaktur & Resep Formula (BOM)"
        description="Konfigurasi integrasi alur pabrik: Resep wajan penggorengan serta parameter efisiensi rendemen mesin."
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
              <strong style={{ fontSize: 'var(--text-base)' }}>Standar Manufaktur &amp; Resep Formula (BOM)</strong>
            </div>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', background: 'var(--bg-subtle)', padding: '4px 10px', borderRadius: '12px' }}>
              Formula bahan baku ditentukan bebas langsung dari warehouse
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 'var(--space-3)',
              background: 'var(--bg-subtle)',
              padding: 'var(--space-3)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--color-warning-100)', color: 'var(--color-warning-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '13px' }}>1</div>
              <div>
                <strong style={{ display: 'block', fontSize: 'var(--text-sm)' }}>Resep Wajan Penggorengan</strong>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Bahan Baku Gudang Dipilih Bebas (Goreng Polos)</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--color-success-100)', color: 'var(--color-success-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '13px' }}>2</div>
              <div>
                <strong style={{ display: 'block', fontSize: 'var(--text-sm)' }}>Standar Mesin &amp; Rendemen</strong>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Suhu Penggorengan &amp; Target Rendemen Min 80%</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--color-primary-100, #dcfce7)', color: 'var(--color-primary-800, #166534)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '13px' }}>3</div>
              <div>
                <strong style={{ display: 'block', fontSize: 'var(--text-sm)' }}>Kemasan &amp; Bumbu (Level 3)</strong>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Proporsi Netto Jamur &amp; Bumbu Tabur per Pack</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* NAVIGATION TABS (2 CORE TABS) */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px', flexWrap: 'wrap' }}>
        <Button
          variant={activeTab === 'FRYING' ? 'primary' : 'ghost'}
          onClick={() => setActiveTab('FRYING')}
          leftIcon={<Flame className="w-4 h-4" aria-hidden="true" />}
        >
          Resep Wajan (Goreng Polos)
        </Button>
        <Button
          variant={activeTab === 'MACHINERY' ? 'primary' : 'ghost'}
          onClick={() => setActiveTab('MACHINERY')}
          leftIcon={<Sliders className="w-4 h-4" aria-hidden="true" />}
        >
          Standar Mesin &amp; Rendemen
        </Button>
        <Button
          variant={activeTab === 'PACKAGING_BOM' ? 'primary' : 'ghost'}
          onClick={() => setActiveTab('PACKAGING_BOM')}
          leftIcon={<Package className="w-4 h-4" aria-hidden="true" />}
        >
          Komposisi Kemasan &amp; Bumbu (BOM Level 3)
        </Button>
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* ── TAB 1: RESEP PENGGORENGAN WAJAN (GORENG POLOS) ──    */}
      {/* ═══════════════════════════════════════════════════════ */}
      {activeTab === 'FRYING' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Card
            header={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Flame className="w-5 h-5 text-[var(--color-primary-600)]" aria-hidden="true" />
                  <div>
                    <strong style={{ fontSize: 'var(--text-base)' }}>Resep Bahan Baku Wajan (Penggorengan Polos)</strong>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', display: 'block' }}>
                      Bahan baku gudang ditentukan mandiri dengan rasio per 1 kg basis wajan
                    </span>
                  </div>
                </div>

                {!isManagement && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleLoadStandardFryingRecipe}
                      leftIcon={<RotateCcw size={12} />}
                      style={{ fontSize: '11px', color: 'var(--color-primary-700)' }}
                      title="Muat formula acuan standar wajan"
                    >
                      Muat Acuan Pabrik
                    </Button>
                    {fryingIngredients.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearFryingRecipe}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-tertiary)',
                          fontSize: '11px',
                          cursor: 'pointer',
                          padding: '4px 6px',
                        }}
                        title="Kosongkan resep"
                      >
                        Kosongkan
                      </button>
                    )}
                  </div>
                )}
              </div>
            }
          >
            {/* Callout Informasi */}
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
                <strong>Ketentuan Penggorengan KhumKhum:</strong> Seluruh varian rasa digoreng dengan formula wajan yang sama secara <strong>POLOS TANPA BUMBU TABUR</strong>. Anda bebas memilih bahan apa saja dari warehouse (Jamur, Tepung Premix, Minyak, atau bahan racikan lain) beserta rasio pemakaiannya.
              </div>
            </div>

            {/* 1. KONDISI AWAL KOSONG (EMPTY STATE) */}
            {fryingIngredients.length === 0 ? (
              <div
                style={{
                  padding: '32px 16px',
                  textAlign: 'center',
                  background: 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1.5px dashed var(--border-default)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: 'var(--space-4)',
                }}
              >
                <CookingPot className="w-9 h-9 text-[var(--color-primary-600)]" />
                <div>
                  <strong style={{ fontSize: 'var(--text-sm)', display: 'block', color: 'var(--text-primary)' }}>
                    Daftar Bahan Wajan Masih Kosong
                  </strong>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', display: 'block', marginTop: '2px', maxWidth: '360px' }}>
                    Tentukan sendiri bahan baku penggorengan langsung dari warehouse gudang atau muat formula acuan standar pabrik.
                  </span>
                </div>

                {!isManagement && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginTop: '4px' }}>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleLoadStandardFryingRecipe}
                      leftIcon={<Sparkles size={14} />}
                    >
                      + Muat Formula Acuan Standar
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setIsAddingFryingCustom(true)}
                      leftIcon={<Plus size={14} />}
                    >
                      + Tambah Bahan Baku Wajan
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              /* 2. DAFTAR BAHAN DINAMIS BEBAS DARI WAREHOUSE */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: 'var(--space-4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Bahan Baku Wajan Terdaftar ({fryingIngredients.length} bahan):
                  </label>
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                    Semua bahan terhubung ke stok gudang real-time
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-3)' }}>
                  {fryingIngredients.map((ing, idx) => {
                    const matchedRaw = rawMaterials.find(r => r.id === ing.raw_material_id);
                    return (
                      <div
                        key={ing.raw_material_id || idx}
                        style={{
                          padding: '14px',
                          borderRadius: 'var(--radius-lg, 10px)',
                          background: 'linear-gradient(180deg, #FFFDF8 0%, #FAF5EB 100%)',
                          border: '1.5px solid rgba(139, 94, 60, 0.18)',
                          boxShadow: '0 1px 3px rgba(42, 24, 16, 0.04)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                        }}
                      >
                        {/* Header Kartu Bahan */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                            <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--color-primary-100)', color: 'var(--color-primary-800)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>
                              {idx + 1}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Lock size={12} style={{ color: 'var(--color-primary-700)', flexShrink: 0 }} />
                                <strong style={{ fontSize: '13px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={ing.name}>
                                  {ing.name}
                                </strong>
                              </div>
                              <span style={{ fontSize: '10.5px', color: 'var(--text-tertiary)', display: 'block' }}>
                                Master: {matchedRaw?.code || 'Gudang'} • {matchedRaw?.material_category || 'Bahan Baku'}
                              </span>
                            </div>
                          </div>

                          {!isManagement && (
                            <button
                              type="button"
                              onClick={() => handleRemoveFryingItem(ing.raw_material_id)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--color-danger-600)',
                                cursor: 'pointer',
                                padding: '2px',
                              }}
                              title="Hapus bahan dari resep wajan"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>

                        {/* Input Rasio */}
                        <div>
                          <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '3px' }}>
                            Rasio per 1 kg Basis Wajan:
                          </label>
                          <div className="input-group">
                            <input
                              disabled={isManagement}
                              type="number"
                              step="0.01"
                              min="0"
                              value={ing.ratio_per_kg}
                              onChange={e => handleChangeFryingRatio(ing.raw_material_id, e.target.value)}
                              style={{ fontSize: '12px', padding: '6px 8px' }}
                            />
                            <span className="input-group-addon" style={{ fontSize: '11px' }}>
                              {ing.uom} / kg basis
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Tombol Tambah Bahan Lain */}
                {!isManagement && (
                  <div style={{ marginTop: '4px' }}>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setIsAddingFryingCustom(true)}
                      leftIcon={<Plus size={13} />}
                      style={{ fontSize: '12px' }}
                    >
                      + Tambah Bahan Baku Wajan
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* MODAL / POPOVER PILIH BAHAN BARU */}
            {isAddingFryingCustom && (
              <div
                style={{
                  marginBottom: 'var(--space-4)',
                  padding: '14px',
                  background: 'var(--bg-default)',
                  border: '1.5px solid var(--color-primary-300)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Pilih Bahan Baku Dari Gudang untuk Dimasukkan ke Resep Wajan:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr auto auto', gap: '8px', alignItems: 'center' }}>
                  <select
                    value={selectedFryingRawId}
                    onChange={e => setSelectedFryingRawId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-default)',
                      background: 'var(--bg-default)',
                      fontSize: 'var(--text-xs)',
                      minHeight: '36px',
                    }}
                  >
                    <option value="">
                      {rawMaterials.length === 0
                        ? '-- Belum ada bahan baku di warehouse --'
                        : `-- Pilih Bahan Baku Gudang (${rawMaterials.length} bahan tersedia) --`}
                    </option>
                    {rawMaterials.map(rm => {
                      const stock = (rm as any).available_stock ?? rm.stock_quantity ?? 0;
                      return (
                        <option key={rm.id} value={rm.id}>
                          {rm.code ? `[${rm.code}] ` : ''}{rm.name} ({rm.uom}) — Stok: {stock} {rm.uom}
                        </option>
                      );
                    })}
                  </select>

                  <div className="input-group">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Rasio"
                      value={newFryingRatio}
                      onChange={e => setNewFryingRatio(e.target.value)}
                      style={{ fontSize: '12px', padding: '6px 8px', minHeight: '36px' }}
                    />
                    <span className="input-group-addon" style={{ fontSize: '11px' }}>
                      per kg
                    </span>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleAddFryingItem}
                    style={{ fontSize: '12px', minHeight: '36px' }}
                  >
                    Kunci &amp; Masukkan
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsAddingFryingCustom(false);
                      setSelectedFryingRawId('');
                    }}
                    style={{ fontSize: '12px', minHeight: '36px' }}
                  >
                    Batal
                  </Button>
                </div>
              </div>
            )}

            {/* LIVE SIMULATOR WAJAN (DINAMIS DARI SEMUA BAHAN AKTIF) */}
            <div
              style={{
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calculator className="w-4 h-4 text-[var(--color-primary-600)]" aria-hidden="true" />
                  <strong>Simulasi Kebutuhan Wajan Penggorengan (Live Preview)</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Kapasitas Wajan:</span>
                  <div style={{ width: '110px' }}>
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
                {fryingIngredients.map((ing) => {
                  const neededAmount = Math.round(simScale * Number(ing.ratio_per_kg || 0) * 1000) / 1000;
                  return (
                    <div key={ing.raw_material_id} style={{ padding: '8px 12px', borderRadius: '6px', background: 'var(--bg-default)', border: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ing.name}:
                      </span>
                      <strong style={{ fontSize: '13.5px', color: 'var(--color-primary-700)' }}>
                        {neededAmount} {ing.uom} ({Math.round(neededAmount * 1000)} {ing.uom === 'liter' ? 'ml' : 'gr'})
                      </strong>
                    </div>
                  );
                })}

                <div style={{ padding: '8px 12px', borderRadius: '6px', background: 'var(--bg-default)', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', display: 'block' }}>Estimasi Jamur Matang (Longsong):</span>
                  <strong style={{ fontSize: '13.5px', color: 'var(--color-success-700)' }}>
                    ~{Math.round(simOutputMinKg * 1000)} - {Math.round(simOutputMaxKg * 1000)} gr
                  </strong>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* ── TAB 3: STANDAR MESIN & RENDEMEN ──                   */}
      {/* ═══════════════════════════════════════════════════════ */}
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

              <FormField label="Batas Maksimal Rendemen Wajar / Toleransi Output (%)" required>
                <Input
                  disabled={isManagement}
                  type="number"
                  step="0.5"
                  value={config.max_yield_percentage ?? 85.0}
                  onChange={(e) => setConfig({ ...config, max_yield_percentage: Number(e.target.value) })}
                />
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                  Batas atas toleransi hasil matang. Output melebihi angka ini akan ditahan/ditolak karena tidak masuk akal.
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
          <Card header={<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Flame className="w-4 h-4 text-[var(--color-warning-600)]" aria-hidden="true" /> <strong>Parameter Penggorengan &amp; Penirisan</strong></div>}>
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

      {/* ═══════════════════════════════════════════════════════ */}
      {/* ── TAB 3: KOMPOSISI KEMASAN & BUMBU (BOM LEVEL 3) ── */}
      {/* ═══════════════════════════════════════════════════════ */}
      {activeTab === 'PACKAGING_BOM' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Card
            header={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Package className="w-5 h-5 text-primary" aria-hidden="true" />
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                    Standar Acuan Netto &amp; Proporsi Bumbu Kemasan KhumKhum (BOM Level 3)
                  </h3>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Ubah takaran gram bumbu pada baris yang diinginkan. Tekan tombol <strong>Simpan Perubahan Standar</strong> di pojok kanan atas untuk menyimpan.
                  </div>
                </div>
              </div>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div style={{
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-info-50, #eff6ff)',
                border: '1px solid var(--color-info-200, #bfdbfe)',
                display: 'flex',
                gap: 'var(--space-3)',
                fontSize: 'var(--text-sm)',
                color: 'var(--color-info-900, #1e3a8a)',
                lineHeight: 1.5,
              }}>
                <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <strong>Sinkronisasi Otomatis:</strong> Ukuran kemasan di bawah ini terhubung langsung dengan Master Produk Jadi. Jika Anda menambahkan produk dengan ukuran baru (contoh: 30g) di menu Produk Jadi, ukuran tersebut otomatis muncul di tabel ini. Anda dapat langsung mengatur takaran bumbu tabur per kemasan di bawah ini.
                </div>
              </div>

              {/* TABEL INTERAKTIF & EDITABLE ACUAN UKURAN KEMASAN */}
              <div style={{ overflowX: 'auto', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '10px 14px', fontWeight: 600, width: '130px' }}>Ukuran Netto</th>
                      <th style={{ padding: '10px 14px', fontWeight: 600, width: '180px' }}>Tipe Kemasan</th>
                      <th style={{ padding: '10px 14px', fontWeight: 600, width: '220px' }}>Takaran Bumbu Tabur (Gram)</th>
                      <th style={{ padding: '10px 14px', fontWeight: 600, width: '220px' }}>Porsi Jamur Matang</th>
                      <th style={{ padding: '10px 14px', fontWeight: 600 }}>Varian Original (Polos)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentBomStandards.map((item, idx) => {
                      const netto = parseNettoGram(item.package_size);
                      return (
                        <tr key={item.id} style={{ borderBottom: idx < currentBomStandards.length - 1 ? '1px solid var(--border-subtle)' : 'none', background: idx % 2 === 0 ? 'transparent' : 'var(--bg-subtle)' }}>
                          {/* 1. Ukuran Netto */}
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '4px 10px',
                              borderRadius: 'var(--radius-sm)',
                              background: 'var(--bg-card)',
                              border: '1px solid var(--border-default)',
                              fontWeight: 700,
                              fontSize: '13px',
                              color: 'var(--text-primary)',
                            }}>
                              {item.package_size}
                            </span>
                          </td>

                          {/* 2. Tipe Kemasan */}
                          <td style={{ padding: '10px 14px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                            {item.packaging_type || 'Standing Pouch'}
                          </td>

                          {/* 3. Input Bumbu Tabur (Gram) */}
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                max={netto / 2}
                                disabled={isManagement}
                                value={item.seasoning_gram}
                                onChange={e => handleUpdateBomItem(item.id, 'seasoning_gram', e.target.value)}
                                style={{
                                  width: '80px',
                                  padding: '6px 10px',
                                  fontSize: '13px',
                                  fontWeight: 700,
                                  color: '#b45309',
                                  border: '2px solid #f59e0b',
                                  borderRadius: 'var(--radius-sm)',
                                  background: isManagement ? 'var(--bg-subtle)' : '#fffbeb',
                                  textAlign: 'center',
                                }}
                              />
                              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)' }}>gram</span>
                            </div>
                            <div style={{ fontSize: '10.5px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                              Maks. {netto / 2}g (50%)
                            </div>
                          </td>

                          {/* 4. Jamur Matang (Auto Calculated) */}
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 10px',
                              borderRadius: 'var(--radius-sm)',
                              background: 'var(--color-primary-50, #f0fdf4)',
                              border: '1px solid var(--color-primary-300, #86efac)',
                              color: 'var(--color-primary-800, #166534)',
                              fontWeight: 700,
                              fontSize: '12.5px',
                            }}>
                              <span>{item.mushroom_gram} gram</span>
                              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500 }}>
                                ({netto}g - {item.seasoning_gram}g)
                              </span>
                            </div>
                          </td>

                          {/* 5. Original */}
                          <td style={{ padding: '10px 14px', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                            {netto} gram (100% Jamur)
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        </div>
      )}

    </div>
  );
}
