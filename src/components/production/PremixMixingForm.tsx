'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { FormField } from '@/components/form/FormField';
import { useToast } from '@/hooks/useToast';
import {
  CookingPot,
  Database,
  History,
  Lock,
  Plus,
  Trash2,
  RefreshCw,
  ArrowDownRight,
  ArrowUpRight,
  Sparkles,
  RotateCcw,
  Scale,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { recordPremixMixing, getPremixData } from '@/actions/production';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

interface IngredientRow {
  _id: number;
  inventory_id: string;
  material_name: string;
  qty: string;
  available_qty: number;
  uom: string;
}

const DEFAULT_FORMULA_ITEMS = [
  { name: 'Tepung Terigu', keywords: ['terigu'], defaultRatio: 0.65 },
  { name: 'Tepung Tapioka', keywords: ['tapioka'], defaultRatio: 0.25 },
  { name: 'Bawang Putih Bubuk', keywords: ['bawang'], defaultRatio: 0.05 },
  { name: 'Garam Halus', keywords: ['garam'], defaultRatio: 0.05 },
];

export function PremixMixingForm() {
  const [inventories, setInventories] = useState<any[]>([]);
  const [premixItems, setPremixItems] = useState<any[]>([]);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mobileTab, setMobileTab] = useState<'FORM' | 'STOCK' | 'HISTORY'>('FORM');
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [selectedCustomInvId, setSelectedCustomInvId] = useState('');
  const toast = useToast();

  const [form, setForm] = useState({
    premix_item_id: '',
    output_qty: '50',
    notes: '',
  });

  // Di awal daftar bahan baku KOSONG sesuai request user
  const [ingredients, setIngredients] = useState<IngredientRow[]>([]);

  // ── 1. Map 4 Bahan Baku Standar ke Inventory ──
  const buildStandardRows = useCallback((invList: any[], targetKg: number): IngredientRow[] => {
    return DEFAULT_FORMULA_ITEMS.map((item, idx) => {
      const matchedInv = invList.find((inv: any) => {
        const invName = (inv.name || '').toLowerCase();
        return item.keywords.some(k => invName.includes(k));
      });

      const calcQty = Math.round(targetKg * item.defaultRatio * 100) / 100;

      return {
        _id: Date.now() + idx,
        inventory_id: matchedInv?.id || '',
        material_name: matchedInv?.name || item.name,
        qty: calcQty.toString(),
        available_qty: Number(matchedInv?.quantity) || 0,
        uom: matchedInv?.uom || 'kg',
      };
    });
  }, []);

  // ── 2. Load Master Data ──
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const premixRes = await getPremixData();
      if (premixRes.success) {
        const invList = premixRes.ingredients || [];
        setInventories(invList);
        setPremixItems(premixRes.premixItems || []);
        setHistoryList(premixRes.history || []);

        if (premixRes.premixItems && premixRes.premixItems.length > 0 && !form.premix_item_id) {
          setForm(prev => ({ ...prev, premix_item_id: premixRes.premixItems![0].id }));
        }
      }
    } catch (err: any) {
      console.error('Failed to load premix data:', err);
      toast.error('Gagal memuat data premix');
    } finally {
      setIsLoading(false);
    }
  }, [form.premix_item_id, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── 3. Handle Muat Formula Standar ──
  const handleLoadStandardIngredients = () => {
    const targetOutput = Number(form.output_qty) || 50;
    const standardRows = buildStandardRows(inventories, targetOutput);
    setIngredients(standardRows);
    toast.success('Bahan baku formula standar berhasil dimuat. Sesuaikan takaran kg atau hapus bahan yang tidak dipakai.');
  };

  // ── 4. Handle Tambah 1 Bahan Baku Baru ──
  const handleAddCustomMaterial = () => {
    if (!selectedCustomInvId) {
      toast.error('Pilih bahan baku dari stok gudang terlebih dahulu');
      return;
    }

    const matchedInv = inventories.find(i => i.id === selectedCustomInvId);
    if (!matchedInv) return;

    // Cek apakah sudah ada di tabel
    const exists = ingredients.some(i => i.inventory_id === selectedCustomInvId);
    if (exists) {
      toast.error(`${matchedInv.name} sudah ada di daftar bahan baku`);
      return;
    }

    setIngredients(prev => [
      ...prev,
      {
        _id: Date.now() + Math.random(),
        inventory_id: matchedInv.id,
        material_name: matchedInv.name,
        qty: '',
        available_qty: Number(matchedInv.quantity) || 0,
        uom: matchedInv.uom || 'kg',
      },
    ]);

    setSelectedCustomInvId('');
    setIsAddingCustom(false);
    toast.success(`Bahan ${matchedInv.name} ditambahkan & terkunci. Masukkan takaran kg.`);
  };

  // ── 5. Manual Qty & Row Handlers ──
  const handleQtyChange = (id: number, val: string) => {
    setIngredients(prev =>
      prev.map(item => (item._id === id ? { ...item, qty: val } : item))
    );
  };

  const handleRemoveRow = (id: number) => {
    setIngredients(prev => prev.filter(item => item._id !== id));
  };

  const handleClearAllIngredients = () => {
    setIngredients([]);
  };

  // Total berat bahan baku yang dimasukkan
  const totalInputKg = useMemo(() => {
    return ingredients.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  }, [ingredients]);

  // ── 6. Submit Pembuatan Premix ──
  const handleSubmit = async () => {
    if (!form.premix_item_id) {
      toast.error('Pilih target Tepung Premix yang dihasilkan');
      return;
    }

    const outputNum = Number(form.output_qty);
    if (!outputNum || outputNum <= 0) {
      toast.error('Masukkan jumlah premix yang dihasilkan (kg)');
      return;
    }

    const validIngredients = ingredients
      .filter(i => i.inventory_id && Number(i.qty) > 0)
      .map(i => ({
        inventory_id: i.inventory_id,
        qty: Number(i.qty),
      }));

    if (validIngredients.length === 0) {
      toast.error('Pilih minimal 1 bahan baku yang dipakai beserta takarannya');
      return;
    }

    // Cek stok minus
    const shortages = ingredients.filter(i => Number(i.qty) > i.available_qty);
    if (shortages.length > 0) {
      const names = shortages.map(s => s.material_name).join(', ');
      toast.error(`Stok tidak mencukupi untuk: ${names}. Harap periksa ketersediaan gudang.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await recordPremixMixing({
        premix_item_id: form.premix_item_id,
        output_qty: outputNum,
        notes: form.notes || undefined,
        ingredients: validIngredients,
      });

      if (res.success) {
        toast.success(`Berhasil! Stok ${outputNum} kg premix bertambah & bahan baku otomatis terpotong.`);
        setForm(prev => ({ ...prev, notes: '' }));
        setIngredients([]); // Reset kembali kosong untuk produksi berikutnya
        await loadData();
      } else {
        toast.error(res.error || 'Gagal menyimpan produksi premix');
      }
    } catch (err: any) {
      console.error('Submit premix error:', err);
      toast.error('Terjadi kesalahan saat memproses premix');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', width: '100%' }}>
      
      {/* ── MOBILE-FIRST SEGMENTED SWITCHER (CLEAN FLOW, TIDAK NABRAK KONTEN) ── */}
      <div className="mobile-premix-switcher">
        <button
          type="button"
          onClick={() => setMobileTab('FORM')}
          className={`mobile-tab-btn ${mobileTab === 'FORM' ? 'active' : ''}`}
        >
          <CookingPot size={15} />
          <span>Form Racik</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('STOCK')}
          className={`mobile-tab-btn ${mobileTab === 'STOCK' ? 'active' : ''}`}
        >
          <Database size={15} />
          <span>Stok Gudang ({inventories.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('HISTORY')}
          className={`mobile-tab-btn ${mobileTab === 'HISTORY' ? 'active' : ''}`}
        >
          <History size={15} />
          <span>Riwayat ({historyList.length})</span>
        </button>
      </div>

      {/* ── GRID ATAS: FORM RACIK (KIRI) & STOK WAREHOUSE (KANAN) ── */}
      <div className="premix-top-grid">
        
        {/* ═══════════════════════════════════════════════ */}
        {/* KOLOM KIRI: FORMULIR PEMBUATAN PREMIX           */}
        {/* ═══════════════════════════════════════════════ */}
        <div className={`premix-panel-form ${mobileTab !== 'FORM' ? 'mobile-hidden' : ''}`}>
          <Card
            header={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CookingPot className="w-5 h-5 text-[var(--color-primary-600)]" aria-hidden="true" />
                  <div>
                    <strong style={{ fontSize: 'var(--text-base)' }}>Formulir Pembuatan Premix</strong>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', display: 'block' }}>
                      Sinkron otomatis ke stok bahan baku gudang
                    </span>
                  </div>
                </div>

                {ingredients.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllIngredients}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 8px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-tertiary)',
                      fontSize: '11px',
                      cursor: 'pointer',
                    }}
                    title="Kosongkan daftar bahan"
                  >
                    <RotateCcw size={11} />
                    <span>Kosongkan</span>
                  </button>
                )}
              </div>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              
              {/* HASIL PREMIX YANG DIHASILKAN */}
              <FormField label="Pilih Hasil Premix (Barang Setengah Jadi)" required>
                <select
                  value={form.premix_item_id}
                  onChange={e => setForm({ ...form, premix_item_id: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-default)',
                    background: 'var(--bg-default)',
                    fontSize: 'var(--text-sm)',
                    minHeight: '40px',
                  }}
                >
                  <option value="">-- Pilih Jenis Premix --</option>
                  {premixItems.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.code ? `${item.code} — ` : ''}{item.name} ({item.uom})
                    </option>
                  ))}
                </select>
              </FormField>

              {/* JUMLAH DIHASILKAN (KG) */}
              <FormField label="Target Jumlah Dihasilkan (kg)" required>
                <Input
                  type="number"
                  step="0.5"
                  min="1"
                  placeholder="Misal: 50"
                  value={form.output_qty}
                  onChange={e => setForm(prev => ({ ...prev, output_qty: e.target.value }))}
                  style={{ fontSize: 'var(--text-sm)', minHeight: '40px' }}
                />
              </FormField>

              <div style={{ borderTop: '1px solid var(--border-subtle)' }} />

              {/* DAFTAR BAHAN BAKU YANG TERPAKAI */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '6px' }}>
                  <label style={{ fontWeight: 600, fontSize: 'var(--text-sm)', margin: 0 }}>
                    Bahan Baku Yang Terpakai ({ingredients.length})
                  </label>

                  {ingredients.length > 0 && (
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      Total Racikan:{' '}
                      <strong style={{ color: totalInputKg > 0 ? 'var(--color-primary-700)' : 'inherit' }}>
                        {Math.round(totalInputKg * 100) / 100} kg
                      </strong>
                    </span>
                  )}
                </div>

                {/* 1. KONDISI AWAL: KOSONG (EMPTY STATE) */}
                {ingredients.length === 0 ? (
                  <div
                    style={{
                      padding: '24px 16px',
                      textAlign: 'center',
                      background: 'var(--bg-subtle)',
                      borderRadius: 'var(--radius-lg)',
                      border: '1.5px dashed var(--border-default)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '10px',
                    }}
                  >
                    <CookingPot className="w-8 h-8 text-[var(--color-primary-600)]" />
                    <div>
                      <strong style={{ fontSize: 'var(--text-sm)', display: 'block', color: 'var(--text-primary)' }}>
                        Daftar Bahan Baku Masih Kosong
                      </strong>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', display: 'block', marginTop: '2px', maxWidth: '320px' }}>
                        Silakan muat formula bahan standar atau pilih bahan baku langsung dari gudang.
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginTop: '4px' }}>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleLoadStandardIngredients}
                        leftIcon={<Sparkles size={14} />}
                      >
                        + Muat Formula Standar
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setIsAddingCustom(true)}
                        leftIcon={<Plus size={14} />}
                      >
                        + Tambah Bahan Baku
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* 2. DAFTAR BAHAN: NAMA TERKUNCI, BERAT KG MANUAL BISA DIEDIT */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {ingredients.map((ing) => {
                      const needed = Number(ing.qty) || 0;
                      const isShortage = needed > ing.available_qty;

                      return (
                        <div
                          key={ing._id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 12px',
                            background: isShortage ? 'var(--color-danger-50)' : 'var(--bg-subtle)',
                            borderRadius: 'var(--radius-md)',
                            border: isShortage ? '1px solid var(--color-danger-300)' : '1px solid var(--border-subtle)',
                          }}
                        >
                          {/* NAMA BAHAN TERKUNCI (LABEL DENGAN IKON GEMBOK) */}
                          <div style={{ flex: 1.5, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <Lock size={12} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                              <strong
                                style={{
                                  fontSize: 'var(--text-xs)',
                                  color: 'var(--text-primary)',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                                title={ing.material_name}
                              >
                                {ing.material_name}
                              </strong>
                            </div>
                            <span
                              style={{
                                fontSize: '10px',
                                color: isShortage ? 'var(--color-danger-700)' : 'var(--text-tertiary)',
                                display: 'block',
                                marginTop: '2px',
                              }}
                            >
                              {isShortage
                                ? `⚠️ Kurang! Stok: ${ing.available_qty} ${ing.uom}`
                                : `Stok gudang: ${ing.available_qty} ${ing.uom}`}
                            </span>
                          </div>

                          {/* INPUT TAKARAN MANUAL KG (BEBAS DIEDIT) */}
                          <div style={{ width: '115px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Input
                              type="number"
                              step="0.1"
                              min="0"
                              placeholder="0"
                              value={ing.qty}
                              onChange={e => handleQtyChange(ing._id, e.target.value)}
                              style={{ fontSize: 'var(--text-xs)', padding: '6px 8px', minHeight: '36px' }}
                            />
                            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', fontWeight: 600 }}>
                              {ing.uom}
                            </span>
                          </div>

                          {/* TOMBOL HAPUS BARIS */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveRow(ing._id)}
                            style={{ padding: '4px', color: 'var(--color-danger-600)', minWidth: '28px' }}
                            title="Hapus bahan dari racikan"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      );
                    })}

                    {/* TOMBOL AKSI TAMBAH SAAT SUDAH ADA BAHAN */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setIsAddingCustom(true)}
                        leftIcon={<Plus size={13} />}
                        style={{ fontSize: '12px' }}
                      >
                        Tambah Bahan Lain
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleLoadStandardIngredients}
                        leftIcon={<RotateCcw size={13} />}
                        style={{ fontSize: '12px', color: 'var(--color-primary-700)' }}
                      >
                        Muat Ulang Formula Standar
                      </Button>
                    </div>
                  </div>
                )}

                {/* MODAL / POPOVER PILIH BAHAN BARU */}
                {isAddingCustom && (
                  <div
                    style={{
                      marginTop: '10px',
                      padding: '12px',
                      background: 'var(--bg-default)',
                      border: '1.5px solid var(--color-primary-300)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Pilih Bahan Baku Dari Gudang:
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <select
                        value={selectedCustomInvId}
                        onChange={e => setSelectedCustomInvId(e.target.value)}
                        style={{
                          flex: 1,
                          padding: '6px 10px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-default)',
                          background: 'var(--bg-default)',
                          fontSize: 'var(--text-xs)',
                          minHeight: '36px',
                        }}
                      >
                        <option value="">-- Pilih Bahan Baku --</option>
                        {inventories.map(inv => (
                          <option key={inv.id} value={inv.id}>
                            {inv.name} (Stok: {inv.quantity} {inv.uom})
                          </option>
                        ))}
                      </select>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleAddCustomMaterial}
                        style={{ fontSize: '12px' }}
                      >
                        Kunci &amp; Masukkan
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setIsAddingCustom(false);
                          setSelectedCustomInvId('');
                        }}
                        style={{ fontSize: '12px' }}
                      >
                        Batal
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle)' }} />

              {/* CATATAN */}
              <FormField label="Catatan (Opsional)">
                <Input
                  placeholder="Catatan racikan atau nomor wajan..."
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  style={{ fontSize: 'var(--text-sm)', minHeight: '40px' }}
                />
              </FormField>

              {/* TOMBOL SIMPAN */}
              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={isSubmitting || isLoading || !form.output_qty || Number(form.output_qty) <= 0 || ingredients.length === 0}
                leftIcon={<CookingPot className="w-4 h-4" aria-hidden="true" />}
                style={{ width: '100%', padding: '12px', fontWeight: 600, minHeight: '44px' }}
              >
                {isSubmitting ? 'Menyimpan...' : 'Simpan Produksi Premix'}
              </Button>

            </div>
          </Card>
        </div>

        {/* ═══════════════════════════════════════════════ */}
        {/* KOLOM KANAN: STOK BAHAN BAKU DI WAREHOUSE       */}
        {/* ═══════════════════════════════════════════════ */}
        <div className={`premix-panel-stock ${mobileTab !== 'STOCK' ? 'mobile-hidden' : ''}`}>
          <Card
            header={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Database className="w-5 h-5 text-[var(--color-primary-600)]" aria-hidden="true" />
                  <div>
                    <strong style={{ fontSize: 'var(--text-base)' }}>Ketersediaan Bahan Baku Gudang</strong>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', display: 'block' }}>
                      Real-time Warehouse
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadData}
                  style={{ padding: '4px 6px' }}
                  title="Refresh stok gudang"
                >
                  <RefreshCw size={14} />
                </Button>
              </div>
            }
          >
            <div style={{ overflowX: 'auto', maxHeight: '440px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-xs)' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-default)', textAlign: 'left' }}>
                    <th style={{ padding: '8px 10px', fontWeight: 600 }}>Nama Bahan</th>
                    <th style={{ padding: '8px 10px', fontWeight: 600 }}>Kategori</th>
                    <th style={{ padding: '8px 10px', fontWeight: 600, textAlign: 'right' }}>Stok Gudang</th>
                  </tr>
                </thead>
                <tbody>
                  {inventories.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center', padding: '16px', color: 'var(--text-secondary)' }}>
                        Belum ada stok bahan baku di gudang
                      </td>
                    </tr>
                  ) : (
                    inventories.map(inv => {
                      const isLow = Number(inv.quantity) <= 5;
                      return (
                        <tr key={inv.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '8px 10px' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{inv.name}</div>
                            {inv.code && (
                              <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>
                                {inv.code}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '8px 10px' }}>
                            <span style={{
                              fontSize: '10px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: 'var(--bg-subtle)',
                              color: 'var(--text-secondary)',
                            }}>
                              {inv.category || 'Bahan Mentah'}
                            </span>
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                            <strong style={{ color: isLow ? 'var(--color-danger-700)' : 'var(--color-success-700)' }}>
                              {Number(inv.quantity).toLocaleString('id-ID')} {inv.uom}
                            </strong>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* BARIS BAWAH: RIWAYAT PERACIKAN PREMIX & MUTASI GUDANG   */}
      {/* ═══════════════════════════════════════════════════════ */}
      <div className={`premix-panel-history ${mobileTab !== 'HISTORY' ? 'mobile-hidden' : ''}`}>
        <Card
          header={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <History className="w-5 h-5 text-[var(--color-primary-600)]" aria-hidden="true" />
                <div>
                  <strong style={{ fontSize: 'var(--text-base)' }}>Riwayat Aktivitas Peracikan Premix &amp; Mutasi Gudang</strong>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', display: 'block' }}>
                    Log pergerakan barang masuk (hasil premix) dan keluar (bahan baku terpakai)
                  </span>
                </div>
              </div>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                {historyList.length} aktivitas terdata
              </span>
            </div>
          }
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-xs)' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-default)', textAlign: 'left' }}>
                  <th style={{ padding: '8px 12px', fontWeight: 600 }}>Waktu</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600 }}>Jenis Mutasi</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600 }}>Bahan / Premix</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600, textAlign: 'right' }}>Jumlah</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600 }}>Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {historyList.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>
                      Belum ada riwayat peracikan premix
                    </td>
                  </tr>
                ) : (
                  historyList.slice(0, 30).map(item => {
                    const isIncoming = item.movement_type === 'IN';
                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                          {item.created_at ? format(new Date(item.created_at), 'dd MMM yyyy, HH:mm', { locale: idLocale }) : '-'}
                        </td>
                        <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                          {isIncoming ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11px',
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-full)',
                              background: 'var(--color-success-50)',
                              color: 'var(--color-success-700)',
                              border: '1px solid var(--color-success-200)',
                            }}>
                              <ArrowDownRight size={13} />
                              HASIL RACIK (IN)
                            </span>
                          ) : (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11px',
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-full)',
                              background: 'var(--color-danger-50)',
                              color: 'var(--color-danger-700)',
                              border: '1px solid var(--color-danger-200)',
                            }}>
                              <ArrowUpRight size={13} />
                              KONSUMSI BAHAN (OUT)
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {item.itemName}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: isIncoming ? 'var(--color-success-700)' : 'var(--color-danger-700)' }}>
                          {isIncoming ? '+' : '-'}{Number(item.quantity).toLocaleString('id-ID')} {item.uom}
                        </td>
                        <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>
                          {item.notes || '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* ── RESPONSIVE MOBILE-FIRST CSS (NO OVERLAP, NO GEPENG) ── */}
      <style jsx>{`
        /* Desktop Default (>= 768px): 2 Kolom di Atas, Riwayat di Bawah */
        .mobile-premix-switcher {
          display: none;
        }

        .premix-top-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
          gap: var(--space-4);
          align-items: start;
        }

        /* Mobile Screens (< 768px): Segmented Switcher in Document Flow */
        @media (max-width: 767px) {
          .mobile-premix-switcher {
            display: flex;
            background: var(--bg-surface);
            padding: 6px;
            border-radius: var(--radius-lg);
            border: 1px solid var(--border-default);
            gap: 6px;
            margin-bottom: var(--space-2);
            width: 100%;
            box-shadow: var(--shadow-sm);
          }

          .mobile-tab-btn {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            padding: 9px 6px;
            font-size: 12px;
            font-weight: 600;
            color: var(--text-secondary);
            background: transparent;
            border: none;
            border-radius: var(--radius-md);
            cursor: pointer;
            transition: all 0.15s ease;
          }

          .mobile-tab-btn.active {
            background: var(--bg-default);
            color: var(--color-primary-700);
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
          }

          .premix-top-grid {
            display: block;
          }

          .mobile-hidden {
            display: none !important;
          }
        }
      `}</style>

    </div>
  );
}
