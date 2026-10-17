'use client';

import React, { useState, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/hooks/useToast';
import {
  Sparkles,
  Check,
  Plus,
  Box,
  Scale,
  Palette,
  AlertTriangle,
  CheckCircle2,
  X,
  RotateCcw,
} from 'lucide-react';
import { createBatchProducts } from '@/actions/master';
import type { DbProduct } from '@/types/database';

interface BatchProductGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingProducts: DbProduct[];
  onSuccess: () => void;
}

export const DEFAULT_PRODUCT_TYPES = [
  'Standing Pouch',
  'Toples',
  'Pouch Bantal',
];

export const DEFAULT_PRODUCT_WEIGHTS = [
  '30g',
  '50g',
  '60g',
  '75g',
  '100g',
  '150g',
  '250g',
  '500g',
];

export const DEFAULT_PRODUCT_FLAVORS = [
  'Original',
  'Balado',
  'Barbeque',
  'Pedas Manis',
  'Super Pedas',
];

export const BRAND_SUGGESTIONS = [
  'KhumKhum',
  'Jamur Crispy',
];

export function generateProductSku(
  arg1: string,
  arg2: string,
  arg3: string,
  arg4?: string,
  arg5?: string
): string {
  let type = arg1;
  let flavor = arg2;
  let weight = arg3;
  let prefix = 'FG';

  // Flexible argument handling: (type, flavor, weight, prefix) or (brand, type, flavor, weight, prefix)
  if (arg5 !== undefined) {
    type = arg2;
    flavor = arg3;
    weight = arg4 || '';
    prefix = arg5;
  } else if (arg4 !== undefined) {
    if (arg1 === 'Jamur Crispy' || arg1 === 'KhumKhum') {
      type = arg2;
      flavor = arg3;
      weight = arg4;
      prefix = 'FG';
    } else {
      prefix = arg4;
    }
  }

  const shortType = type.toLowerCase().includes('toples')
    ? 'TPL'
    : type.toLowerCase().includes('bantal')
    ? 'BTL'
    : 'PCH';

  const shortFlavor = flavor.toLowerCase().includes('original')
    ? 'ORI'
    : flavor.toLowerCase().includes('balado')
    ? 'BLD'
    : flavor.toLowerCase().includes('barbeque') || flavor.toLowerCase().includes('bbq')
    ? 'BBQ'
    : flavor.toLowerCase().includes('pedas manis')
    ? 'PDM'
    : flavor.toLowerCase().includes('super pedas')
    ? 'SPD'
    : flavor.toLowerCase().includes('jagung')
    ? 'JGB'
    : flavor.toLowerCase().includes('keju')
    ? 'KEJ'
    : flavor.toLowerCase().includes('rumput laut')
    ? 'SEA'
    : flavor.substring(0, 3).toUpperCase();

  const cleanWeight = (weight || '').replace(/\s+/g, '').toUpperCase();
  const cleanPrefix = (prefix || 'FG').toUpperCase().trim();

  return `${cleanPrefix}-${shortType}-${shortFlavor}${cleanWeight ? `-${cleanWeight}` : ''}`;
}

export function generateProductName(
  arg1: string,
  arg2: string,
  arg3?: string,
  arg4?: string
): string {
  let brand = 'Jamur Crispy';
  let type = arg1;
  let flavor = arg2;
  let weight = arg3 || '';

  if (arg4 !== undefined) {
    brand = arg1;
    type = arg2;
    flavor = arg3 || '';
    weight = arg4;
  }

  const cleanBrand = brand?.trim() || 'Jamur Crispy';
  const cleanType = type?.trim() || 'Standing Pouch';
  const cleanFlavor = flavor?.trim() || 'Original';
  const cleanWeight = weight?.trim() ? ` ${weight.trim()}` : '';

  return `${cleanBrand} ${cleanType} ${cleanFlavor}${cleanWeight}`;
}

export function BatchProductGeneratorModal({
  isOpen,
  onClose,
  existingProducts,
  onSuccess,
}: BatchProductGeneratorModalProps) {
  const toast = useToast();

  // Dimensi 1: Tipe Kemasan / Wadah
  const [types, setTypes] = useState<string[]>(DEFAULT_PRODUCT_TYPES);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['Standing Pouch']);
  const [customTypeInput, setCustomTypeInput] = useState('');

  // Dimensi 2: Ukuran Gramatur / Berat
  const [weights, setWeights] = useState<string[]>(DEFAULT_PRODUCT_WEIGHTS);
  const [selectedWeights, setSelectedWeights] = useState<string[]>(['60g', '100g']);
  const [customWeightInput, setCustomWeightInput] = useState('');

  // Dimensi 3: Varian Rasa
  const [flavors, setFlavors] = useState<string[]>(DEFAULT_PRODUCT_FLAVORS);
  const [selectedFlavors, setSelectedFlavors] = useState<string[]>([
    'Original',
    'Balado',
    'Barbeque',
    'Pedas Manis',
    'Super Pedas',
  ]);
  const [customFlavorInput, setCustomFlavorInput] = useState('');

  // Manual exclude item dari tabel preview
  const [excludedKeys, setExcludedKeys] = useState<Set<string>>(new Set());
  const [filterQuery, setFilterQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lookup existing products untuk deteksi duplikat
  const existingSet = useMemo(() => {
    const set = new Set<string>();
    existingProducts.forEach(p => {
      if (p.sku) set.add(p.sku.toLowerCase().trim());
      if (p.name) set.add(p.name.toLowerCase().trim());
    });
    return set;
  }, [existingProducts]);

  // Handle Toggle Type
  const toggleType = (t: string) => {
    setSelectedTypes(prev =>
      prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
    );
  };

  const handleAddCustomType = () => {
    const val = customTypeInput.trim();
    if (!val) return;
    if (!types.includes(val)) setTypes(prev => [...prev, val]);
    if (!selectedTypes.includes(val)) setSelectedTypes(prev => [...prev, val]);
    setCustomTypeInput('');
  };

  const handleDeleteType = (t: string) => {
    setTypes(prev => prev.filter(x => x !== t));
    setSelectedTypes(prev => prev.filter(x => x !== t));
  };

  const handleResetTypes = () => {
    setTypes(DEFAULT_PRODUCT_TYPES);
    setSelectedTypes(['Standing Pouch']);
  };

  // Handle Toggle Weight
  const toggleWeight = (w: string) => {
    setSelectedWeights(prev =>
      prev.includes(w) ? prev.filter(x => x !== w) : [...prev, w]
    );
  };

  const handleDeleteWeight = (w: string) => {
    setWeights(prev => prev.filter(x => x !== w));
    setSelectedWeights(prev => prev.filter(x => x !== w));
  };

  const handleResetWeights = () => {
    setWeights(DEFAULT_PRODUCT_WEIGHTS);
    setSelectedWeights(['60g', '100g']);
  };

  const handleAddCustomWeight = () => {
    const val = customWeightInput.trim();
    if (!val) return;
    const parts = val.split(',').map(s => s.trim()).filter(Boolean);
    parts.forEach(part => {
      if (!weights.includes(part)) setWeights(prev => [...prev, part]);
      if (!selectedWeights.includes(part)) setSelectedWeights(prev => [...prev, part]);
    });
    setCustomWeightInput('');
  };

  // Handle Toggle Flavor
  const toggleFlavor = (f: string) => {
    setSelectedFlavors(prev =>
      prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]
    );
  };

  const handleDeleteFlavor = (f: string) => {
    setFlavors(prev => prev.filter(x => x !== f));
    setSelectedFlavors(prev => prev.filter(x => x !== f));
  };

  const handleResetFlavors = () => {
    setFlavors(DEFAULT_PRODUCT_FLAVORS);
    setSelectedFlavors([
      'Original',
      'Balado',
      'Barbeque',
      'Pedas Manis',
      'Super Pedas',
    ]);
  };

  const handleAddCustomFlavor = () => {
    const val = customFlavorInput.trim();
    if (!val) return;
    if (!flavors.includes(val)) setFlavors(prev => [...prev, val]);
    if (!selectedFlavors.includes(val)) setSelectedFlavors(prev => [...prev, val]);
    setCustomFlavorInput('');
  };

  // Hitung Cartesian Product
  const matrixCombinations = useMemo(() => {
    const result: Array<{
      key: string;
      sku: string;
      name: string;
      packaging_type: string;
      package_weight: string;
      flavor_variant: string;
      isExisting: boolean;
    }> = [];

    selectedTypes.forEach(t => {
      selectedWeights.forEach(w => {
        selectedFlavors.forEach(f => {
          const sku = generateProductSku(t, f, w, 'FG');
          const name = generateProductName(t, f, w, 'Jamur Crispy');
          const isExisting =
            existingSet.has(sku.toLowerCase().trim()) ||
            existingSet.has(name.toLowerCase().trim());

          result.push({
            key: sku,
            sku,
            name,
            packaging_type: t,
            package_weight: w,
            flavor_variant: f,
            isExisting,
          });
        });
      });
    });

    return result;
  }, [selectedTypes, selectedWeights, selectedFlavors, existingSet]);

  // Item yang valid & belum diexclude
  const itemsToCreate = useMemo(() => {
    return matrixCombinations.filter(
      item => !item.isExisting && !excludedKeys.has(item.key)
    );
  }, [matrixCombinations, excludedKeys]);

  const existingCount = useMemo(() => {
    return matrixCombinations.filter(item => item.isExisting).length;
  }, [matrixCombinations]);

  const toggleExclude = (key: string) => {
    setExcludedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSelectAll = () => {
    setExcludedKeys(new Set());
  };

  const handleDeselectAll = () => {
    const allKeys = new Set(matrixCombinations.filter(i => !i.isExisting).map(i => i.key));
    setExcludedKeys(allKeys);
  };

  // Filtered view untuk tabel preview
  const filteredCombinations = useMemo(() => {
    if (!filterQuery.trim()) return matrixCombinations;
    const q = filterQuery.toLowerCase().trim();
    return matrixCombinations.filter(
      item =>
        item.sku.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        item.packaging_type.toLowerCase().includes(q) ||
        item.flavor_variant.toLowerCase().includes(q)
    );
  }, [matrixCombinations, filterQuery]);

  // Handle Simpan Batch
  const handleSubmit = async () => {
    if (itemsToCreate.length === 0) {
      toast.error('Tidak ada produk jadi baru yang dipilih untuk dibuat');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = itemsToCreate.map(item => ({
        sku: item.sku,
        name: item.name,
        category: 'Barang Jadi',
        uom: 'pcs',
        unit_price: 15000,
        description: `Produk Jadi Kemasan ${item.packaging_type} (${item.package_weight}), Rasa ${item.flavor_variant}`,
        rop: 50,
        packaging_type: item.packaging_type,
        flavor_variant: item.flavor_variant,
        package_weight: item.package_weight,
      }));

      const res = await createBatchProducts(payload);

      if (res.success) {
        toast.success(
          `Berhasil membuat ${res.count || itemsToCreate.length} produk jadi baru sekaligus!`
        );
        onSuccess();
        onClose();
      } else {
        toast.error(res.error || 'Gagal menyimpan produk batch');
      }
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Tambah Produk Jadi (Matrix Generator)"
      description="Buat puluhan SKU produk jadi sekaligus secara otomatis (Tipe Kemasan × Ukuran Gramatur × Varian Rasa)."
      size="xl"
      footer={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Total Kombinasi: <strong>{matrixCombinations.length}</strong> | Siap Dibuat:{' '}
              <strong style={{ color: 'var(--color-success-700, #15803d)' }}>{itemsToCreate.length} baru</strong>
              {existingCount > 0 && ` (${existingCount} sudah ada)`}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Batal
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              loading={isSubmitting}
              disabled={itemsToCreate.length === 0}
              leftIcon={<Check className="w-4 h-4" aria-hidden="true" />}
            >
              Simpan &amp; Buat {itemsToCreate.length} Produk Jadi
            </Button>
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', width: '100%' }}>
        
        {/* ── BAGIAN 1: PEMILIHAN 3 DIMENSI MATRIX ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-3)' }}>
          
          {/* Kolom 1: Tipe Kemasan / Wadah */}
          <div
            style={{
              padding: '14px',
              borderRadius: 'var(--radius-md, 8px)',
              border: '1px solid var(--border-default)',
              background: 'var(--bg-subtle, #FAF8F5)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Box className="w-4 h-4 text-[var(--color-primary-600)]" />
                1. Tipe Kemasan / Wadah
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                  {selectedTypes.length} dipilih
                </span>
                {types.length !== DEFAULT_PRODUCT_TYPES.length && (
                  <button
                    type="button"
                    onClick={handleResetTypes}
                    title="Kembalikan tipe default"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '2px',
                      fontSize: '10.5px',
                      color: 'var(--color-primary-700)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <RotateCcw size={10} /> Reset
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {types.length === 0 ? (
                <div style={{ fontSize: '11.5px', color: 'var(--text-tertiary)', padding: '12px 8px', textAlign: 'center' }}>
                  Belum ada tipe kemasan. Tambahkan di bawah.
                </div>
              ) : (
                types.map(t => {
                  const isChecked = selectedTypes.includes(t);
                  return (
                    <div
                      key={t}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        fontSize: '12.5px',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        background: isChecked ? 'var(--color-primary-100, #FBEFD9)' : 'var(--bg-default)',
                        border: `1px solid ${isChecked ? 'var(--color-primary-400, #D4AF37)' : 'var(--border-subtle)'}`,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', flex: 1, margin: 0 }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleType(t)}
                          style={{ cursor: 'pointer' }}
                        />
                        <span style={{ fontWeight: isChecked ? 600 : 400 }}>{t}</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => handleDeleteType(t)}
                        title={`Hapus tipe ${t}`}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-tertiary)',
                          cursor: 'pointer',
                          padding: '2px 4px',
                          display: 'flex',
                          alignItems: 'center',
                          borderRadius: '4px',
                        }}
                      >
                        <X size={13} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
              <Input
                size="sm"
                value={customTypeInput}
                onChange={e => setCustomTypeInput(e.target.value)}
                placeholder="+ Tambah tipe baru..."
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomType();
                  }
                }}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleAddCustomType}
                disabled={!customTypeInput.trim()}
              >
                <Plus size={14} />
              </Button>
            </div>
          </div>

          {/* Kolom 2: Ukuran Gramatur */}
          <div
            style={{
              padding: '14px',
              borderRadius: 'var(--radius-md, 8px)',
              border: '1px solid var(--border-default)',
              background: 'var(--bg-subtle, #FAF8F5)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Scale className="w-4 h-4 text-[var(--color-primary-600)]" />
                2. Ukuran Gramatur / Berat
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                  {selectedWeights.length} dipilih
                </span>
                {weights.length !== DEFAULT_PRODUCT_WEIGHTS.length && (
                  <button
                    type="button"
                    onClick={handleResetWeights}
                    title="Kembalikan gramatur default"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '2px',
                      fontSize: '10.5px',
                      color: 'var(--color-primary-700)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <RotateCcw size={10} /> Reset
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
              {weights.map(w => {
                const isChecked = selectedWeights.includes(w);
                return (
                  <div
                    key={w}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '6px',
                      fontSize: '12px',
                      padding: '4px 6px',
                      borderRadius: '6px',
                      background: isChecked ? 'var(--color-primary-100, #FBEFD9)' : 'var(--bg-default)',
                      border: `1px solid ${isChecked ? 'var(--color-primary-400, #D4AF37)' : 'var(--border-subtle)'}`,
                    }}
                  >
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', flex: 1, margin: 0 }}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleWeight(w)}
                        style={{ cursor: 'pointer' }}
                      />
                      <span style={{ fontWeight: isChecked ? 600 : 400 }}>{w}</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleDeleteWeight(w)}
                      title={`Hapus ${w}`}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-tertiary)',
                        cursor: 'pointer',
                        padding: '1px 3px',
                      }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
              <Input
                size="sm"
                value={customWeightInput}
                onChange={e => setCustomWeightInput(e.target.value)}
                placeholder="+ Gramatur (cth: 80g, 1kg)"
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomWeight();
                  }
                }}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleAddCustomWeight}
                disabled={!customWeightInput.trim()}
              >
                <Plus size={14} />
              </Button>
            </div>
          </div>

          {/* Kolom 3: Varian Rasa */}
          <div
            style={{
              padding: '14px',
              borderRadius: 'var(--radius-md, 8px)',
              border: '1px solid var(--border-default)',
              background: 'var(--bg-subtle, #FAF8F5)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Palette className="w-4 h-4 text-[var(--color-primary-600)]" />
                3. Varian Rasa
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                  {selectedFlavors.length} dipilih
                </span>
                {flavors.length !== DEFAULT_PRODUCT_FLAVORS.length && (
                  <button
                    type="button"
                    onClick={handleResetFlavors}
                    title="Kembalikan rasa default"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '2px',
                      fontSize: '10.5px',
                      color: 'var(--color-primary-700)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <RotateCcw size={10} /> Reset
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {flavors.map(f => {
                const isChecked = selectedFlavors.includes(f);
                return (
                  <div
                    key={f}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      fontSize: '12.5px',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      background: isChecked ? 'var(--color-primary-100, #FBEFD9)' : 'var(--bg-default)',
                      border: `1px solid ${isChecked ? 'var(--color-primary-400, #D4AF37)' : 'var(--border-subtle)'}`,
                    }}
                  >
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', flex: 1, margin: 0 }}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleFlavor(f)}
                        style={{ cursor: 'pointer' }}
                      />
                      <span style={{ fontWeight: isChecked ? 600 : 400 }}>{f}</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleDeleteFlavor(f)}
                      title={`Hapus rasa ${f}`}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-tertiary)',
                        cursor: 'pointer',
                        padding: '2px 4px',
                      }}
                    >
                      <X size={13} />
                    </button>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
              <Input
                size="sm"
                value={customFlavorInput}
                onChange={e => setCustomFlavorInput(e.target.value)}
                placeholder="+ Tambah varian rasa..."
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomFlavor();
                  }
                }}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleAddCustomFlavor}
                disabled={!customFlavorInput.trim()}
              >
                <Plus size={14} />
              </Button>
            </div>
          </div>
        </div>

        {/* ── BAGIAN 2: PRATINJAU DAFTAR KOMBINASI MATRIX ── */}
        <div
          style={{
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-lg, 10px)',
            background: 'var(--bg-default)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '10px 14px',
              background: 'var(--bg-subtle, #FAF8F5)',
              borderBottom: '1px solid var(--border-default)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles className="w-4 h-4 text-[var(--color-primary-600)]" />
              <span style={{ fontSize: '13px', fontWeight: 700 }}>
                Pratinjau Daftar Produk Jadi yang Akan Dibuat ({matrixCombinations.length})
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Input
                size="sm"
                value={filterQuery}
                onChange={e => setFilterQuery(e.target.value)}
                placeholder="Cari SKU / nama di pratinjau..."
                style={{ width: '200px' }}
              />
              <button
                type="button"
                onClick={handleSelectAll}
                style={{
                  fontSize: '11px',
                  color: 'var(--color-primary-700)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Pilih Semua
              </button>
              <span style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>|</span>
              <button
                type="button"
                onClick={handleDeselectAll}
                style={{
                  fontSize: '11px',
                  color: 'var(--text-tertiary)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Batal Semua
              </button>
            </div>
          </div>

          <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-subtle)', textAlign: 'left', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ width: '40px', padding: '8px 12px' }}></th>
                  <th style={{ padding: '8px 12px' }}>Kode SKU</th>
                  <th style={{ padding: '8px 12px' }}>Nama Produk Jadi</th>
                  <th style={{ padding: '8px 12px' }}>Kemasan</th>
                  <th style={{ padding: '8px 12px' }}>Varian Rasa</th>
                  <th style={{ padding: '8px 12px' }}>Gramatur</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredCombinations.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                      Pilih minimal 1 Tipe Kemasan, 1 Berat, dan 1 Varian untuk menampilkan pratinjau.
                    </td>
                  </tr>
                ) : (
                  filteredCombinations.map(item => {
                    const isExcluded = excludedKeys.has(item.key);
                    const isIncluded = !item.isExisting && !isExcluded;

                    return (
                      <tr
                        key={item.key}
                        style={{
                          borderBottom: '1px solid var(--border-subtle)',
                          background: item.isExisting
                            ? 'rgba(0,0,0,0.02)'
                            : isIncluded
                            ? 'rgba(245, 158, 11, 0.03)'
                            : 'transparent',
                          opacity: item.isExisting ? 0.6 : isExcluded ? 0.45 : 1,
                        }}
                      >
                        <td style={{ padding: '6px 12px', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            disabled={item.isExisting}
                            checked={isIncluded}
                            onChange={() => toggleExclude(item.key)}
                            style={{ cursor: item.isExisting ? 'not-allowed' : 'pointer' }}
                          />
                        </td>
                        <td style={{ padding: '6px 12px', fontFamily: 'monospace', fontWeight: 600 }}>
                          {item.sku}
                        </td>
                        <td style={{ padding: '6px 12px', fontWeight: 500 }}>
                          {item.name}
                        </td>
                        <td style={{ padding: '6px 12px', color: 'var(--text-secondary)' }}>
                          {item.packaging_type}
                        </td>
                        <td style={{ padding: '6px 12px', color: 'var(--text-secondary)' }}>
                          {item.flavor_variant}
                        </td>
                        <td style={{ padding: '6px 12px', color: 'var(--text-secondary)' }}>
                          {item.package_weight}
                        </td>
                        <td style={{ padding: '6px 12px', textAlign: 'center' }}>
                          {item.isExisting ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                padding: '2px 8px',
                                borderRadius: '999px',
                                fontSize: '10.5px',
                                fontWeight: 600,
                                background: 'rgba(100, 116, 139, 0.1)',
                                color: 'var(--text-secondary)',
                              }}
                            >
                              <AlertTriangle size={11} /> Sudah Ada
                            </span>
                          ) : isIncluded ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                padding: '2px 8px',
                                borderRadius: '999px',
                                fontSize: '10.5px',
                                fontWeight: 600,
                                background: 'rgba(34, 197, 94, 0.1)',
                                color: 'var(--color-success-700, #15803d)',
                              }}
                            >
                              <CheckCircle2 size={11} /> Baru
                            </span>
                          ) : (
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: '999px',
                                fontSize: '10.5px',
                                background: 'rgba(0,0,0,0.05)',
                                color: 'var(--text-tertiary)',
                              }}
                            >
                              Dilewati
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </Modal>
  );
}
