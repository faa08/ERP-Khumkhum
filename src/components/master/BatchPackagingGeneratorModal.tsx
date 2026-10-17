'use client';

import React, { useState, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/form/FormField';
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
  Layers,
  Info,
  X,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { createBatchRawMaterials } from '@/actions/master';
import type { DbRawMaterial } from '@/types/database';

interface BatchPackagingGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingMaterials: DbRawMaterial[];
  onSuccess: () => void;
}

const DEFAULT_TYPES = [
  'Standing Pouch',
  'Toples',
  'Pouch Bantal',
];

const DEFAULT_WEIGHTS = [
  '30g',
  '50g',
  '60g',
  '75g',
  '100g',
  '150g',
  '250g',
  '500g',
];

const DEFAULT_FLAVORS = [
  'Polos / Umum',
  'Original',
  'Balado',
  'Barbeque',
  'Pedas Manis',
  'Super Pedas',
  'Jagung Bakar',
  'Keju',
];

export function generatePackagingCode(type: string, flavor: string, weight: string): string {
  const shortType = type.toLowerCase().includes('toples')
    ? 'TPL'
    : type.toLowerCase().includes('bantal')
    ? 'BTL'
    : 'PCH';

  const shortFlavor =
    flavor.toLowerCase().includes('umum') || flavor.toLowerCase().includes('polos')
      ? 'ALL'
      : flavor.substring(0, 3).toUpperCase();

  const cleanWeight = weight.replace(/\s+/g, '').toUpperCase();

  return `PKG-${shortType}-${shortFlavor}${cleanWeight ? `-${cleanWeight}` : ''}`;
}

export function generatePackagingName(type: string, flavor: string, weight: string): string {
  const isAll = flavor.toLowerCase().includes('umum') || flavor.toLowerCase().includes('polos');
  const flavorText = isAll ? 'Umum (Semua Rasa)' : flavor;
  return `Packaging ${type} ${flavorText}${weight ? ` ${weight}` : ''}`;
}

export function BatchPackagingGeneratorModal({
  isOpen,
  onClose,
  existingMaterials,
  onSuccess,
}: BatchPackagingGeneratorModalProps) {
  const toast = useToast();

  // Dimensi 1: Tipe Kemasan
  const [types, setTypes] = useState<string[]>(DEFAULT_TYPES);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['Standing Pouch']);
  const [customTypeInput, setCustomTypeInput] = useState('');

  // Dimensi 2: Ukuran Gramatur
  const [weights, setWeights] = useState<string[]>(DEFAULT_WEIGHTS);
  const [selectedWeights, setSelectedWeights] = useState<string[]>(['60g', '75g']);
  const [customWeightInput, setCustomWeightInput] = useState('');

  // Dimensi 3: Varian Rasa
  const [flavors, setFlavors] = useState<string[]>(DEFAULT_FLAVORS);
  const [selectedFlavors, setSelectedFlavors] = useState<string[]>(['Original', 'Balado']);
  const [customFlavorInput, setCustomFlavorInput] = useState('');

  // Parameter Standar
  const [minStock, setMinStock] = useState<number>(100);
  const [rop, setRop] = useState<number>(50);

  // Manual exclude item dari tabel preview
  const [excludedKeys, setExcludedKeys] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lookup existing materials untuk deteksi duplikat
  const existingSet = useMemo(() => {
    const set = new Set<string>();
    existingMaterials.forEach(m => {
      if (m.code) set.add(m.code.toLowerCase().trim());
      if (m.name) set.add(m.name.toLowerCase().trim());
    });
    return set;
  }, [existingMaterials]);

  // Handle Toggle Type
  const toggleType = (t: string) => {
    setSelectedTypes(prev =>
      prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
    );
  };

  const handleAddCustomType = () => {
    const val = customTypeInput.trim();
    if (!val) return;
    if (!types.includes(val)) {
      setTypes(prev => [...prev, val]);
    }
    if (!selectedTypes.includes(val)) {
      setSelectedTypes(prev => [...prev, val]);
    }
    setCustomTypeInput('');
  };

  const handleDeleteType = (t: string) => {
    setTypes(prev => prev.filter(x => x !== t));
    setSelectedTypes(prev => prev.filter(x => x !== t));
  };

  const handleResetTypes = () => {
    setTypes(DEFAULT_TYPES);
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
    setWeights(DEFAULT_WEIGHTS);
    setSelectedWeights(['60g', '75g']);
  };

  const handleAddCustomWeight = () => {
    const val = customWeightInput.trim();
    if (!val) return;
    const parts = val.split(',').map(s => s.trim()).filter(Boolean);
    parts.forEach(part => {
      if (!weights.includes(part)) {
        setWeights(prev => [...prev, part]);
      }
      if (!selectedWeights.includes(part)) {
        setSelectedWeights(prev => [...prev, part]);
      }
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
    setFlavors(DEFAULT_FLAVORS);
    setSelectedFlavors(['Original', 'Balado']);
  };

  const handleAddCustomFlavor = () => {
    const val = customFlavorInput.trim();
    if (!val) return;
    if (!flavors.includes(val)) {
      setFlavors(prev => [...prev, val]);
    }
    if (!selectedFlavors.includes(val)) {
      setSelectedFlavors(prev => [...prev, val]);
    }
    setCustomFlavorInput('');
  };

  // Hitung Cartesian Product
  const matrixCombinations = useMemo(() => {
    const result: Array<{
      key: string;
      code: string;
      name: string;
      packaging_type: string;
      package_weight: string;
      flavor_variant: string;
      isExisting: boolean;
    }> = [];

    selectedTypes.forEach(t => {
      selectedWeights.forEach(w => {
        selectedFlavors.forEach(f => {
          const code = generatePackagingCode(t, f, w);
          const name = generatePackagingName(t, f, w);
          const isExisting =
            existingSet.has(code.toLowerCase().trim()) ||
            existingSet.has(name.toLowerCase().trim());

          result.push({
            key: code,
            code,
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

  // Item yang valid & siap dibuat (baru dan tidak di-exclude)
  const itemsToCreate = useMemo(() => {
    return matrixCombinations.filter(
      item => !item.isExisting && !excludedKeys.has(item.key)
    );
  }, [matrixCombinations, excludedKeys]);

  const existingCount = matrixCombinations.filter(m => m.isExisting).length;

  const toggleExclude = (key: string) => {
    setExcludedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setExcludedKeys(new Set());
  };

  const handleDeselectAll = () => {
    const allKeys = new Set(matrixCombinations.map(m => m.key));
    setExcludedKeys(allKeys);
  };

  // Eksekusi Simpan Batch
  const handleSubmit = async () => {
    if (itemsToCreate.length === 0) {
      toast.error('Tidak ada kemasan baru yang dipilih untuk dibuat');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Partial<DbRawMaterial>[] = itemsToCreate.map(item => ({
        code: item.code,
        name: item.name,
        uom: 'pcs',
        min_stock: minStock,
        rop: rop,
        material_category: 'Packaging',
        packaging_type: item.packaging_type,
        flavor_variant: item.flavor_variant,
        package_weight: item.package_weight,
      }));

      const res = await createBatchRawMaterials(payload);
      if (res.success) {
        toast.success(
          `Berhasil membuat ${res.count || itemsToCreate.length} kemasan baru sekaligus!`
        );
        onSuccess();
        onClose();
      } else {
        toast.error(res.error || 'Gagal menyimpan kemasan batch');
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
      title="Tambah Data Kemasan (Matrix Generator)"
      description="Buat puluhan SKU kemasan sekaligus secara otomatis (Tipe Kemasan × Ukuran Gramatur × Varian Rasa)."
      size="xl"
      footer={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
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
              Simpan &amp; Buat {itemsToCreate.length} Kemasan
            </Button>
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', width: '100%' }}>
        {/* ── BAGIAN 1: PEMILIHAN 3 DIMENSI MATRIX ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-3)' }}>
          
          {/* Kolom 1: Tipe Kemasan */}
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
                1. Tipe Kemasan
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                  {selectedTypes.length} dipilih
                </span>
                {types.length !== DEFAULT_TYPES.length && (
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', maxHeight: '180px', overflowY: 'auto' }}>
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
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLElement).style.color = 'var(--color-danger-600, #dc2626)';
                          (e.currentTarget as HTMLElement).style.background = 'rgba(220, 38, 38, 0.08)';
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.color = 'var(--text-tertiary)';
                          (e.currentTarget as HTMLElement).style.background = 'transparent';
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
              <Button size="sm" variant="secondary" onClick={handleAddCustomType} style={{ padding: '0 8px' }}>
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
                2. Berat / Gramatur
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                  {selectedWeights.length} dipilih
                </span>
                {weights.length !== DEFAULT_WEIGHTS.length && (
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
              {weights.length === 0 ? (
                <div style={{ gridColumn: 'span 2', fontSize: '11.5px', color: 'var(--text-tertiary)', padding: '12px 8px', textAlign: 'center' }}>
                  Belum ada ukuran gramatur. Tambahkan di bawah.
                </div>
              ) : (
                weights.map(w => {
                  const isChecked = selectedWeights.includes(w);
                  return (
                    <div
                      key={w}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '4px 6px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: isChecked ? 700 : 500,
                        background: isChecked ? 'var(--color-primary-600, #8B5E3C)' : 'var(--bg-default)',
                        color: isChecked ? '#FFF' : 'var(--text-primary)',
                        border: `1px solid ${isChecked ? 'var(--color-primary-700)' : 'var(--border-default)'}`,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => toggleWeight(w)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'inherit',
                          fontWeight: 'inherit',
                          fontSize: '12px',
                          cursor: 'pointer',
                          flex: 1,
                          textAlign: 'left',
                          padding: '2px',
                        }}
                      >
                        {w}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteWeight(w);
                        }}
                        title={`Hapus ukuran ${w}`}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: isChecked ? 'rgba(255,255,255,0.8)' : 'var(--text-tertiary)',
                          cursor: 'pointer',
                          padding: '2px',
                          display: 'flex',
                          alignItems: 'center',
                          borderRadius: '3px',
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLElement).style.color = isChecked ? '#FFF' : 'var(--color-danger-600, #dc2626)';
                        }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
              <Input
                size="sm"
                value={customWeightInput}
                onChange={e => setCustomWeightInput(e.target.value)}
                placeholder="Tambah berat (misal: 120g, 1kg)"
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomWeight();
                  }
                }}
              />
              <Button size="sm" variant="secondary" onClick={handleAddCustomWeight} style={{ padding: '0 8px' }}>
                <Plus size={14} />
              </Button>
            </div>
          </div>

          {/* Kolom 3: Pola Varian Label */}
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
                {flavors.length !== DEFAULT_FLAVORS.length && (
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', maxHeight: '180px', overflowY: 'auto' }}>
              {flavors.length === 0 ? (
                <div style={{ fontSize: '11.5px', color: 'var(--text-tertiary)', padding: '12px 8px', textAlign: 'center' }}>
                  Belum ada varian rasa. Tambahkan di bawah.
                </div>
              ) : (
                flavors.map(f => {
                  const isChecked = selectedFlavors.includes(f);
                  return (
                    <div
                      key={f}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        fontSize: '12px',
                        padding: '4px 6px',
                        borderRadius: '4px',
                        background: isChecked ? 'var(--color-primary-100, #FBEFD9)' : 'var(--bg-default)',
                        border: `1px solid ${isChecked ? 'var(--color-primary-400)' : 'var(--border-subtle)'}`,
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
                        title={`Hapus varian ${f}`}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-tertiary)',
                          cursor: 'pointer',
                          padding: '2px 4px',
                          display: 'flex',
                          alignItems: 'center',
                          borderRadius: '3px',
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLElement).style.color = 'var(--color-danger-600, #dc2626)';
                          (e.currentTarget as HTMLElement).style.background = 'rgba(220, 38, 38, 0.08)';
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.color = 'var(--text-tertiary)';
                          (e.currentTarget as HTMLElement).style.background = 'transparent';
                        }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              <Input
                size="sm"
                value={customFlavorInput}
                onChange={e => setCustomFlavorInput(e.target.value)}
                placeholder="+ Tambah varian rasa baru..."
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomFlavor();
                  }
                }}
              />
              <Button size="sm" variant="secondary" onClick={handleAddCustomFlavor} style={{ padding: '0 8px' }}>
                <Plus size={14} />
              </Button>
            </div>
          </div>
        </div>

        {/* ── BAGIAN 2: PARAMETER STOK DEFAULT ── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 'var(--space-3)',
            padding: '12px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-default)',
            border: '1px solid var(--border-default)',
          }}
        >
          <FormField label="Satuan Default (UOM)">
            <Input value="pcs" disabled style={{ background: 'var(--bg-subtle)' }} />
          </FormField>

          <FormField label="Stok Minimum Default (Min Stock)">
            <Input
              type="number"
              value={minStock}
              onChange={e => setMinStock(Number(e.target.value) || 0)}
              placeholder="100"
            />
          </FormField>

          <FormField label="Titik Pemesanan Ulang (ROP Default)">
            <Input
              type="number"
              value={rop}
              onChange={e => setRop(Number(e.target.value) || 0)}
              placeholder="50"
            />
          </FormField>
        </div>

        {/* ── BAGIAN 3: TABEL PRATINJAU MATRIX (HASIL GENERATE) ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Layers className="w-4 h-4 text-[var(--color-primary-600)]" />
              Pratinjau Daftar Kemasan yang Akan Dibuat ({matrixCombinations.length})
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={handleSelectAll}
                style={{
                  fontSize: '11.5px',
                  color: 'var(--color-primary-700)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Pilih Semua
              </button>
              <span style={{ color: 'var(--border-default)' }}>|</span>
              <button
                type="button"
                onClick={handleDeselectAll}
                style={{
                  fontSize: '11.5px',
                  color: 'var(--text-secondary)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Kosongkan
              </button>
            </div>
          </div>

          <div
            style={{
              maxHeight: '260px',
              overflowY: 'auto',
              borderRadius: 'var(--radius-md, 8px)',
              border: '1px solid var(--border-default)',
              background: 'var(--bg-default)',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-subtle, #FAF8F5)', borderBottom: '1px solid var(--border-default)', textAlign: 'left' }}>
                  <th style={{ padding: '8px 12px', width: '36px' }}>#</th>
                  <th style={{ padding: '8px 12px' }}>Kode SKU</th>
                  <th style={{ padding: '8px 12px' }}>Nama Kemasan</th>
                  <th style={{ padding: '8px 12px' }}>Tipe</th>
                  <th style={{ padding: '8px 12px' }}>Ukuran</th>
                  <th style={{ padding: '8px 12px' }}>Varian</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {matrixCombinations.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                      Pilih minimal 1 Tipe Kemasan, 1 Berat, dan 1 Varian untuk menampilkan pratinjau.
                    </td>
                  </tr>
                ) : (
                  matrixCombinations.map((item, idx) => {
                    const isExcluded = excludedKeys.has(item.key);
                    const isSelected = !item.isExisting && !isExcluded;

                    return (
                      <tr
                        key={item.key}
                        style={{
                          borderBottom: '1px solid var(--border-subtle)',
                          background: item.isExisting
                            ? '#FFF9F0'
                            : isSelected
                            ? '#F8FAF5'
                            : 'transparent',
                          opacity: item.isExisting ? 0.65 : 1,
                        }}
                      >
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={item.isExisting}
                            onChange={() => toggleExclude(item.key)}
                            style={{ cursor: item.isExisting ? 'not-allowed' : 'pointer' }}
                          />
                        </td>
                        <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 600 }}>
                          {item.code}
                        </td>
                        <td style={{ padding: '8px 12px', fontWeight: 500 }}>
                          {item.name}
                        </td>
                        <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>
                          {item.packaging_type}
                        </td>
                        <td style={{ padding: '8px 12px', fontWeight: 600 }}>
                          {item.package_weight}
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          {item.flavor_variant}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                          {item.isExisting ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '11px',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                background: '#FEF3C7',
                                color: '#92400E',
                                fontWeight: 600,
                              }}
                            >
                              <AlertTriangle size={12} />
                              Sudah Ada (Dilewati)
                            </span>
                          ) : (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '11px',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                background: '#DCFCE7',
                                color: '#166534',
                                fontWeight: 600,
                              }}
                            >
                              <CheckCircle2 size={12} />
                              Siap Dibuat
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
