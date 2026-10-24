'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { FormField } from '@/components/form/FormField';
import { DataTable } from '@/components/data-table/DataTable';
import type { ColumnDef } from '@/types/table';
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
  Eye,
  Layers,
  AlertCircle,
  Calendar,
  Info,
} from 'lucide-react';
import { recordPremixMixing, getPremixData, deletePremixBatch, type PremixBatchSession } from '@/actions/production';
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

const PREMIX_DRAFT_KEY = 'draft_prod_premix_form';

interface PremixDraftData {
  form: {
    premix_item_id: string;
    output_qty: string;
    notes: string;
  };
  ingredients: IngredientRow[];
}

const getPremixDraft = (): PremixDraftData | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PREMIX_DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const savePremixDraft = (data: PremixDraftData) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PREMIX_DRAFT_KEY, JSON.stringify(data));
  } catch {}
};

const clearPremixDraft = () => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(PREMIX_DRAFT_KEY);
  } catch {}
};

const DEFAULT_FORMULA_ITEMS = [
  { name: 'Tepung Terigu', keywords: ['terigu'], defaultRatio: 0.65 },
  { name: 'Tepung Tapioka', keywords: ['tapioka'], defaultRatio: 0.25 },
  { name: 'Bawang Putih Bubuk', keywords: ['bawang'], defaultRatio: 0.05 },
  { name: 'Garam Halus', keywords: ['garam'], defaultRatio: 0.05 },
];

function convertToKg(qty: number, uom?: string): number {
  if (!qty) return 0;
  const u = (uom || '').toLowerCase().trim();
  if (u === 'gram' || u === 'gr' || u === 'g') {
    return qty / 1000;
  }
  if (u === 'mg') {
    return qty / 1000000;
  }
  if (u === 'ons') {
    return qty / 10;
  }
  return qty;
}

export function PremixMixingForm() {
  const [inventories, setInventories] = useState<any[]>([]);
  const [premixItems, setPremixItems] = useState<any[]>([]);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [batches, setBatches] = useState<PremixBatchSession[]>([]);
  const [selectedBatchForDetail, setSelectedBatchForDetail] = useState<PremixBatchSession | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [batchToDelete, setBatchToDelete] = useState<PremixBatchSession | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isDeletingBatch, setIsDeletingBatch] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mobileTab, setMobileTab] = useState<'FORM' | 'STOCK' | 'HISTORY'>('FORM');
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [selectedCustomInvId, setSelectedCustomInvId] = useState('');
  const toast = useToast();

  const [hasDraft, setHasDraft] = useState(false);

  const [form, setForm] = useState(() => {
    const saved = getPremixDraft();
    if (saved?.form) {
      return saved.form;
    }
    return {
      premix_item_id: '',
      output_qty: '50',
      notes: '',
    };
  });

  // Di awal daftar bahan baku KOSONG sesuai request user, atau dari draf yang tersimpan
  const [ingredients, setIngredients] = useState<IngredientRow[]>(() => {
    const saved = getPremixDraft();
    return saved?.ingredients && Array.isArray(saved.ingredients) ? saved.ingredients : [];
  });

  // ── 1. Map 4 Bahan Baku Standar ke Inventory ──
  const buildStandardRows = useCallback((invList: any[], targetKg: number): IngredientRow[] => {
    return DEFAULT_FORMULA_ITEMS.map((item, idx) => {
      const matchedInv = invList.find((inv: any) => {
        const invName = (inv.name || '').toLowerCase();
        return item.keywords.some(k => invName.includes(k));
      });

      const uom = matchedInv?.uom || 'kg';
      const uomNorm = uom.toLowerCase().trim();
      let targetForMaterial = targetKg * item.defaultRatio;
      if (uomNorm === 'gram' || uomNorm === 'gr' || uomNorm === 'g') {
        targetForMaterial = targetForMaterial * 1000;
      }
      const calcQty = Math.round(targetForMaterial * 100) / 100;

      return {
        _id: Date.now() + idx,
        inventory_id: matchedInv?.id || '',
        material_name: matchedInv?.name || item.name,
        qty: calcQty.toString(),
        available_qty: Number(matchedInv?.quantity) || 0,
        uom: uom,
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
        setBatches(premixRes.batches || []);

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

  useEffect(() => {
    const saved = getPremixDraft();
    if (saved && (saved.ingredients.length > 0 || saved.form.notes || (saved.form.output_qty && saved.form.output_qty !== '50'))) {
      setHasDraft(true);
    }
  }, []);

  useEffect(() => {
    if (ingredients.length > 0 || form.notes || form.output_qty !== '50') {
      savePremixDraft({ form, ingredients });
      setHasDraft(true);
    }
  }, [form, ingredients]);

  const handleClearDraft = () => {
    clearPremixDraft();
    setHasDraft(false);
    setForm(prev => ({
      premix_item_id: premixItems[0]?.id || prev.premix_item_id,
      output_qty: '50',
      notes: '',
    }));
    setIngredients([]);
    toast.success('Formulir berhasil dibersihkan');
  };

  // ── 2b. Handler Batalkan / Hapus Sesi Batch ──
  const handleDeleteBatch = async () => {
    if (!batchToDelete) return;
    setIsDeletingBatch(true);
    try {
      const res = await deletePremixBatch(batchToDelete.batch_id, batchToDelete.movement_ids);
      if (res.success) {
        toast.success(`Batch ${batchToDelete.batch_code} berhasil dibatalkan. Stok gudang otomatis di-rollback.`);
        setConfirmDeleteOpen(false);
        setBatchToDelete(null);
        await loadData();
      } else {
        toast.error(res.error || 'Gagal membatalkan sesi pembuatan premix');
      }
    } catch (err: any) {
      console.error('delete batch error:', err);
      toast.error('Terjadi kesalahan saat membatalkan sesi premix');
    } finally {
      setIsDeletingBatch(false);
    }
  };

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
    const saved = getPremixDraft();
    if (saved) {
      savePremixDraft({ ...saved, ingredients: [] });
    }
  };

  // Total berat bahan baku yang dimasukkan (dikonversikan ke kg)
  const totalInputKg = useMemo(() => {
    const sumKg = ingredients.reduce((sum, item) => {
      const q = Number(item.qty) || 0;
      return sum + convertToKg(q, item.uom);
    }, 0);
    return Math.round(sumKg * 1000) / 1000;
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
        clearPremixDraft();
        setHasDraft(false);
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

  // ── 7. Definisi Kolom DataTable untuk Sesi Pembuatan Premix ──
  const batchColumns = useMemo<ColumnDef<PremixBatchSession & { id: string }>[]>(() => [
    {
      id: 'created_at',
      accessorFn: (row) => row.created_at,
      header: 'Waktu Sesi',
      cell: ({ row }) => {
        const d = row.original.created_at;
        return (
          <div style={{ whiteSpace: 'nowrap' }}>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              {d ? format(new Date(d), 'dd MMM yyyy', { locale: idLocale }) : '-'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
              {d ? format(new Date(d), 'HH:mm', { locale: idLocale }) + ' WIB' : ''}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'batch_code',
      header: 'Kode Batch',
      cell: ({ row }) => (
        <span style={{
          fontFamily: 'monospace',
          fontSize: '11px',
          fontWeight: 700,
          padding: '3px 8px',
          borderRadius: '4px',
          background: 'var(--color-primary-50)',
          color: 'var(--color-primary-700)',
          border: '1px solid var(--color-primary-200)',
          display: 'inline-block',
          letterSpacing: '0.3px',
        }}>
          {row.original.batch_code}
        </span>
      ),
    },
    {
      id: 'output',
      header: 'Hasil Produksi Premix',
      cell: ({ row }) => (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              fontWeight: 700,
              color: 'var(--color-success-700)',
              background: 'var(--color-success-50)',
              padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
              fontSize: '12px',
              border: '1px solid var(--color-success-200)',
            }}>
              <ArrowDownRight size={13} />
              +{row.original.output_quantity.toLocaleString('id-ID')} {row.original.output_uom}
            </span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', fontWeight: 500 }}>
            {row.original.output_item_name}
          </div>
        </div>
      ),
    },
    {
      id: 'ingredients',
      header: 'Bahan Terpakai',
      cell: ({ row }) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
            {row.original.ingredients.length} Jenis Bahan Baku
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
            Total input: {row.original.total_ingredients_qty.toLocaleString('id-ID')} kg
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'notes',
      header: 'Catatan',
      cell: ({ row }) => (
        <div className="truncate" style={{ maxWidth: '220px' }} title={row.original.notes || '-'}>
          {row.original.notes || '-'}
        </div>
      ),
    },
    {
      id: 'actions',
      header: 'Aksi',
      cell: ({ row }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setSelectedBatchForDetail(row.original);
              setDetailModalOpen(true);
            }}
            leftIcon={<Eye size={13} />}
            style={{ fontSize: '11px', padding: '4px 10px', height: '30px' }}
          >
            Detail
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setBatchToDelete(row.original);
              setConfirmDeleteOpen(true);
            }}
            leftIcon={<Trash2 size={13} />}
            style={{ fontSize: '11px', padding: '4px 10px', height: '30px', color: 'var(--color-danger-600)' }}
            title="Batalkan sesi pembuatan ini & pulihkan stok gudang"
          >
            Hapus
          </Button>
        </div>
      ),
    },
  ], []);

  const batchTableData = useMemo(() => {
    return batches.map(b => ({
      ...b,
      id: b.batch_id,
    }));
  }, [batches]);

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
          <span>Riwayat ({batches.length})</span>
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
              {hasDraft && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-primary-50)',
                  border: '1px solid var(--color-primary-200)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-primary-800)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Info size={14} className="shrink-0 text-[var(--color-primary-600)]" />
                    <span>Draf formulir racik dipulihkan dari sesi sebelumnya</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearDraft}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-primary-700)',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    Bersihkan Form
                  </button>
                </div>
              )}
              
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
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                marginTop: '2px',
                              }}
                            >
                              {isShortage ? (
                                <>
                                  <AlertTriangle className="w-3 h-3 text-rose-600 inline" aria-hidden="true" />
                                  <span>Kurang! Stok: {ing.available_qty} {ing.uom}</span>
                                </>
                              ) : (
                                <span>Stok gudang: {ing.available_qty} {ing.uom}</span>
                              )}
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
                id="btn-simpan-premix"
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
      {/* ═══════════════════════════════════════════════════════ */}
      {/* BARIS BAWAH: RIWAYAT SESI PEMBUATAN PREMIX (1 BARIS = 1 BATCH) */}
      {/* ═══════════════════════════════════════════════════════ */}
      <div className={`premix-panel-history ${mobileTab !== 'HISTORY' ? 'mobile-hidden' : ''}`}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <History className="w-5 h-5 text-[var(--color-primary-600)]" aria-hidden="true" />
            <div>
              <strong style={{ fontSize: 'var(--text-base)' }}>Riwayat Sesi Pembuatan Premix</strong>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', display: 'block' }}>
                1 Baris = 1 Transaksi Sesi Produksi Premix lengkap dengan rincian bahan &amp; aksi pembatalan
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontSize: '11px',
              fontWeight: 600,
              padding: '3px 10px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--bg-subtle)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-default)',
            }}>
              {batches.length} Sesi Pembuatan
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadData}
              style={{ padding: '4px 6px' }}
              title="Refresh riwayat batch"
            >
              <RefreshCw size={14} />
            </Button>
          </div>
        </div>

        <DataTable
          columns={batchColumns}
          data={batchTableData}
          dateField="created_at"
          emptyStateTitle="Belum ada riwayat sesi pembuatan premix"
          emptyStateDescription="Gunakan formulir di atas untuk mencatat sesi pembuatan dan peracikan tepung premix."
        />
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* MODAL 1: DETAIL SESI PEMBUATAN PREMIX                   */}
      {/* ═══════════════════════════════════════════════════════ */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        closeOnOverlayClick={false}
        title={`Rincian Sesi Pembuatan: ${selectedBatchForDetail?.batch_code || ''}`}
        size="lg"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
            <Button variant="secondary" onClick={() => setDetailModalOpen(false)}>
              Tutup
            </Button>
          </div>
        }
      >
        {selectedBatchForDetail && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            
            {/* RINGKASAN SESI */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px',
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
            }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', display: 'block' }}>Hasil Premix Dihasilkan</span>
                <strong style={{ fontSize: '15px', color: 'var(--color-success-700)' }}>
                  +{selectedBatchForDetail.output_quantity.toLocaleString('id-ID')} {selectedBatchForDetail.output_uom}
                </strong>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {selectedBatchForDetail.output_item_name}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', display: 'block' }}>Total Bahan Masuk</span>
                <strong style={{ fontSize: '15px', color: 'var(--color-primary-700)' }}>
                  {selectedBatchForDetail.total_ingredients_qty.toLocaleString('id-ID')} kg
                </strong>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {selectedBatchForDetail.ingredients.length} jenis bahan baku terpakai
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', display: 'block' }}>Waktu Sesi Produksi</span>
                <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                  {selectedBatchForDetail.created_at ? format(new Date(selectedBatchForDetail.created_at), 'dd MMMM yyyy, HH:mm', { locale: idLocale }) + ' WIB' : '-'}
                </strong>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                  Status: <span style={{ color: 'var(--color-success-700)', fontWeight: 600 }}>Tercatat di Inventori</span>
                </div>
              </div>
            </div>

            {/* TABEL RINCIAN BAHAN TERPAKAI */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Daftar Komposisi Bahan Baku Yang Dipakai:
              </div>

              <div style={{ overflowX: 'auto', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-xs)' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-default)', textAlign: 'left' }}>
                      <th style={{ padding: '8px 12px', fontWeight: 600, width: '40px' }}>No</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600 }}>Nama Bahan Baku</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600, width: '100px' }}>Kode</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600, textAlign: 'right', width: '130px' }}>Takaran Dipakai</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600, textAlign: 'right', width: '90px' }}>Proporsi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedBatchForDetail.ingredients.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '16px', color: 'var(--text-tertiary)' }}>
                          Tidak ada rincian bahan tercatat untuk sesi ini
                        </td>
                      </tr>
                    ) : (
                      selectedBatchForDetail.ingredients.map((ing, idx) => {
                        const ingQtyInKg = convertToKg(ing.quantity, ing.uom);
                        const proportion = selectedBatchForDetail.total_ingredients_qty > 0
                          ? Math.round((ingQtyInKg / selectedBatchForDetail.total_ingredients_qty) * 1000) / 10
                          : 0;

                        return (
                          <tr key={ing.movement_id || idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <td style={{ padding: '8px 12px', color: 'var(--text-tertiary)' }}>{idx + 1}</td>
                            <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {ing.item_name}
                            </td>
                            <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                              {ing.item_code || '-'}
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--color-danger-700)' }}>
                              -{ing.quantity.toLocaleString('id-ID')} {ing.uom}
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                              {proportion}%
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {selectedBatchForDetail.ingredients.length > 0 && (
                    <tfoot>
                      <tr style={{ background: 'var(--bg-subtle)', fontWeight: 700, borderTop: '2px solid var(--border-default)' }}>
                        <td colSpan={3} style={{ padding: '10px 12px', textAlign: 'right' }}>
                          Total Bahan Terpakai:
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--color-danger-700)' }}>
                          -{selectedBatchForDetail.total_ingredients_qty.toLocaleString('id-ID')} kg
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                          100%
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* CATATAN SESI */}
            {selectedBatchForDetail.notes && (
              <div style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-default)',
                border: '1px solid var(--border-subtle)',
                fontSize: '12px',
                color: 'var(--text-secondary)',
              }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Catatan: </span>
                {selectedBatchForDetail.notes}
              </div>
            )}

          </div>
        )}
      </Modal>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* MODAL 2: KONFIRMASI PEMBATALAN & ROLLBACK STOK          */}
      {/* ═══════════════════════════════════════════════════════ */}
      <Modal
        isOpen={confirmDeleteOpen}
        onClose={() => {
          if (!isDeletingBatch) setConfirmDeleteOpen(false);
        }}
        closeOnOverlayClick={false}
        title="Batalkan Sesi Pembuatan Premix?"
        size="md"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', width: '100%' }}>
            <Button
              variant="secondary"
              onClick={() => setConfirmDeleteOpen(false)}
              disabled={isDeletingBatch}
            >
              Tutup / Batal
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteBatch}
              disabled={isDeletingBatch}
              leftIcon={<Trash2 size={14} />}
            >
              {isDeletingBatch ? 'Membatalkan & Rollback...' : 'Ya, Batalkan & Pulihkan Stok'}
            </Button>
          </div>
        }
      >
        {batchToDelete && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-danger-50)',
              border: '1px solid var(--color-danger-200)',
              color: 'var(--color-danger-800)',
              fontSize: '13px',
              lineHeight: 1.5,
            }}>
              <div style={{ fontWeight: 700, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertCircle size={16} />
                <span>Peringatan Pembatalan Transaksi</span>
              </div>
              <div>
                Anda akan membatalkan sesi pembuatan kode <strong style={{ fontFamily: 'monospace' }}>{batchToDelete.batch_code}</strong>.
              </div>
            </div>

            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Aksi ini akan secara otomatis melakukan <strong>rollback</strong> stok di sistem gudang:
            </div>

            <ul style={{
              fontSize: '12px',
              color: 'var(--text-primary)',
              paddingLeft: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              margin: 0,
            }}>
              <li>
                Stok <strong>{batchToDelete.output_item_name}</strong> akan <strong>dikurangi</strong> sebanyak <strong>{batchToDelete.output_quantity} {batchToDelete.output_uom}</strong>.
              </li>
              <li>
                Stok <strong>{batchToDelete.ingredients.length} bahan baku</strong> yang terpakai ({batchToDelete.total_ingredients_qty} kg) akan <strong>dikembalikan</strong> ke gudang secara utuh.
              </li>
              <li>
                Log mutasi barang masuk &amp; keluar untuk sesi ini akan dihapus dari riwayat.
              </li>
            </ul>

            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
              * Gunakan fitur ini jika ada kesalahan input kuantitas, resep salah, atau sesi produksi batal dilaksanakan.
            </div>
          </div>
        )}
      </Modal>

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
