'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/form/FormField';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import {
  Sparkles,
  CookingPot,
  Boxes,
  Layers,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  History,
  ArrowDownRight,
  ArrowUpRight,
  Database,
  RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { getPremixData, recordPremixMixing } from '@/actions/production';

// Formula resep default premix untuk membantu operator mengisi otomatis
const PREMIX_RECIPE_TEMPLATES: Record<string, { label: string; ingredients: { nameMatch: string; ratioPerKg: number }[] }> = {
  'premix_standard': {
    label: 'Premix Tepung Jamur Crispy (Standard)',
    ingredients: [
      { nameMatch: 'terigu', ratioPerKg: 0.60 },
      { nameMatch: 'tapioka', ratioPerKg: 0.25 },
      { nameMatch: 'bawang', ratioPerKg: 0.05 },
      { nameMatch: 'garam', ratioPerKg: 0.05 },
      { nameMatch: 'bumbu', ratioPerKg: 0.05 },
    ],
  },
  'bumbu_balado': {
    label: 'Racikan Bumbu Balado Rahasia Khumkhum',
    ingredients: [
      { nameMatch: 'balado', ratioPerKg: 0.70 },
      { nameMatch: 'gula', ratioPerKg: 0.15 },
      { nameMatch: 'garam', ratioPerKg: 0.10 },
      { nameMatch: 'cabai', ratioPerKg: 0.05 },
    ],
  },
};

export default function PremixProductionPage() {
  const { user } = useAuth();
  const isManagement = user?.role === 'MANAGEMENT';
  const toast = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [premixItems, setPremixItems] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  // Form State
  const [form, setForm] = useState({
    premix_item_id: '',
    output_qty: '',
    notes: '',
  });

  const [selectedIngredients, setSelectedIngredients] = useState<
    { inventory_id: string; qty: string; _id: number }[]
  >([{ inventory_id: '', qty: '', _id: Date.now() }]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const res = await getPremixData();
    if (res.success) {
      if (res.premixItems) setPremixItems(res.premixItems);
      if (res.ingredients) setIngredients(res.ingredients);
      if (res.history) setHistory(res.history);
    } else {
      toast.error(res.error || 'Gagal memuat data premix & gudang');
    }
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddIngredient = () => {
    setSelectedIngredients(prev => [
      ...prev,
      { inventory_id: '', qty: '', _id: Date.now() + Math.random() },
    ]);
  };

  const handleRemoveIngredient = (id: number) => {
    setSelectedIngredients(prev => prev.filter(i => i._id !== id));
  };

  const handleUpdateIngredient = (id: number, field: 'inventory_id' | 'qty', val: string) => {
    setSelectedIngredients(prev =>
      prev.map(i => (i._id === id ? { ...i, [field]: val } : i))
    );
  };

  // Terapkan template resep jika ada
  const handleApplyTemplate = (templateKey: string) => {
    const template = PREMIX_RECIPE_TEMPLATES[templateKey];
    if (!template) return;

    const targetQty = Number(form.output_qty) || 10;
    const matchedItems: { inventory_id: string; qty: string; _id: number }[] = [];

    template.ingredients.forEach((ing, idx) => {
      const foundInv = ingredients.find(i =>
        i.name.toLowerCase().includes(ing.nameMatch.toLowerCase())
      );
      if (foundInv) {
        const requiredQty = (targetQty * ing.ratioPerKg).toFixed(2);
        matchedItems.push({
          inventory_id: foundInv.id,
          qty: String(requiredQty),
          _id: Date.now() + idx,
        });
      }
    });

    if (matchedItems.length > 0) {
      setSelectedIngredients(matchedItems);
      toast.success(`Komposisi resep "${template.label}" berhasil diterapkan!`);
    } else {
      toast.warning('Bahan baku sesuai template belum ditemukan di stok gudang.');
    }
  };

  const handleSubmit = async () => {
    if (!form.premix_item_id) {
      toast.error('Pilih target Premix atau Bumbu yang akan diracik');
      return;
    }
    if (!form.output_qty || Number(form.output_qty) <= 0) {
      toast.error('Jumlah hasil produksi premix (kg) wajib diisi');
      return;
    }

    const validIngredients = selectedIngredients.filter(
      i => i.inventory_id && Number(i.qty) > 0
    );
    if (validIngredients.length === 0) {
      toast.error('Pilih minimal 1 bahan baku yang dipakai beserta jumlahnya');
      return;
    }

    // Validasi stok cukup
    for (const ing of validIngredients) {
      const inv = ingredients.find(i => i.id === ing.inventory_id);
      if (inv && Number(inv.quantity) < Number(ing.qty)) {
        toast.error(`Stok ${inv.name} tidak mencukupi (Tersedia: ${inv.quantity} ${inv.uom}, Butuh: ${ing.qty})`);
        return;
      }
    }

    setIsSubmitting(true);
    const res = await recordPremixMixing({
      premix_item_id: form.premix_item_id,
      output_qty: Number(form.output_qty),
      notes: form.notes,
      ingredients: validIngredients.map(i => ({
        inventory_id: i.inventory_id,
        qty: Number(i.qty),
      })),
    });
    setIsSubmitting(false);

    if (res.success) {
      toast.success('Bahan baku gudang berhasil dipotong & stok Premix bertambah di Warehouse!');
      setForm({ premix_item_id: '', output_qty: '', notes: '' });
      setSelectedIngredients([{ inventory_id: '', qty: '', _id: Date.now() }]);
      loadData();
    } else {
      toast.error(res.error || 'Gagal menyimpan peracikan premix');
    }
  };

  // Kalkulasi metrik
  const inStockIngredientsCount = useMemo(() => {
    return ingredients.filter(i => Number(i.quantity) > 0).length;
  }, [ingredients]);

  const totalMixingProduced = useMemo(() => {
    return history
      .filter(h => h.movement_type === 'IN')
      .reduce((sum, h) => sum + (Number(h.quantity) || 0), 0);
  }, [history]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <PageHeader
        title="Peracikan Premix &amp; Bumbu Rahasia"
        description="Kelola formula racikan premix tepung dan bumbu rahasia jamur crispy, terintegrasi langsung ke pemotongan stok bahan baku di Gudang."
        breadcrumbs={[{ label: 'Produksi' }, { label: 'Peracikan Premix & Bumbu' }]}
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={loadData}
            leftIcon={<RefreshCw className="w-4 h-4" aria-hidden="true" />}
          >
            Segarkan Data
          </Button>
        }
      />

      {/* ── KPI METRICS ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 'var(--space-4)',
      }}>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Sparkles className="w-5 h-5 text-[var(--color-primary-600)]" aria-hidden="true" />
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Varian Premix / Bumbu
            </span>
          </div>
          <div style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--color-primary-700)' }}>
            {premixItems.length}{' '}
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-secondary)' }}>
              item terdaftar
            </span>
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Database className="w-5 h-5 text-[var(--color-success-600)]" aria-hidden="true" />
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Bahan Mentah Tersedia
            </span>
          </div>
          <div style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--color-success-700)' }}>
            {inStockIngredientsCount}{' '}
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-secondary)' }}>
              bahan di gudang
            </span>
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <CookingPot className="w-5 h-5 text-[var(--color-warning-600)]" aria-hidden="true" />
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Total Hasil Racik Terdata
            </span>
          </div>
          <div style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--color-warning-700)' }}>
            {totalMixingProduced.toLocaleString('id-ID')}{' '}
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-secondary)' }}>
              kilogram
            </span>
          </div>
        </Card>
      </div>

      {/* ── GRID UTAMA: FORM RACIK & STOK WAREHOUSE ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 1.2fr) minmax(300px, 1fr)', gap: 'var(--space-4)' }}>
        {/* CARD FORMULIR PERACIKAN */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
            <h3 style={{ margin: 0, fontSize: 'var(--text-base)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CookingPot className="w-5 h-5 text-[var(--color-primary-600)]" aria-hidden="true" />
              Formulir Peracikan Premix &amp; Bumbu
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Sinkron Otomatis ke Gudang
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <FormField label="Pilih Hasil Racikan Premix / Bumbu" required>
              <select
                value={form.premix_item_id}
                onChange={e => setForm({ ...form, premix_item_id: e.target.value })}
              >
                <option value="">-- Pilih Target Hasil Racikan --</option>
                {premixItems.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.code} — {item.name} ({item.uom})
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Jumlah Dihasilkan (kg)" required>
              <Input
                type="number"
                step="0.1"
                min="0.1"
                placeholder="Misal: 25"
                value={form.output_qty}
                onChange={e => setForm({ ...form, output_qty: e.target.value })}
              />
            </FormField>

            {/* Template Bantuan Cepat */}
            <div style={{
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-default)',
              fontSize: 'var(--text-xs)',
            }}>
              <span style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                Template Standar Resep (Bantuan Isi Cepat):
              </span>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => handleApplyTemplate('premix_standard')}
                  style={{ fontSize: '11px', padding: '2px 8px' }}
                >
                  Formula Premix Tepung
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => handleApplyTemplate('bumbu_balado')}
                  style={{ fontSize: '11px', padding: '2px 8px' }}
                >
                  Formula Bumbu Balado
                </Button>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-default)', marginTop: '4px', paddingTop: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                  Bahan Baku Mentah Yang Digunakan
                </label>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleAddIngredient}
                  leftIcon={<Plus className="w-3.5 h-3.5" aria-hidden="true" />}
                  style={{ fontSize: '11px' }}
                >
                  Tambah Bahan
                </Button>
              </div>

              {selectedIngredients.map((ing) => (
                <div key={ing._id} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                  <select
                    value={ing.inventory_id}
                    onChange={e => handleUpdateIngredient(ing._id, 'inventory_id', e.target.value)}
                    style={{ flex: 1, minWidth: 0 }}
                  >
                    <option value="">-- Pilih Bahan Baku Gudang --</option>
                    {ingredients.map(inv => (
                      <option key={inv.id} value={inv.id}>
                        {inv.name} (Sisa Stok: {inv.quantity} {inv.uom})
                      </option>
                    ))}
                  </select>

                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="Qty"
                    value={ing.qty}
                    onChange={e => handleUpdateIngredient(ing._id, 'qty', e.target.value)}
                    style={{ width: '90px' }}
                  />

                  {selectedIngredients.length > 1 && (
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => handleRemoveIngredient(ing._id)}
                      style={{ padding: '0 8px' }}
                      aria-label="Hapus bahan"
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <FormField label="Catatan Peracikan (Opsional)">
              <Input
                placeholder="Catatan batch racikan, nomor lot bumbu..."
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
              />
            </FormField>

            {!isManagement && (
              <Button
                variant="primary"
                onClick={handleSubmit}
                loading={isSubmitting}
                leftIcon={<Sparkles className="w-4 h-4" aria-hidden="true" />}
                style={{ marginTop: 'var(--space-2)' }}
              >
                Proses Peracikan &amp; Potong Stok Gudang
              </Button>
            )}
          </div>
        </Card>

        {/* CARD STOK BAHAN BAKU DI WAREHOUSE */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
            <h3 style={{ margin: 0, fontSize: 'var(--text-base)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Database className="w-5 h-5 text-[var(--color-primary-600)]" aria-hidden="true" />
              Ketersediaan Bahan Baku Gudang
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Real-time Warehouse
            </span>
          </div>

          <div style={{ overflowX: 'auto', maxHeight: '420px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-xs)' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-default)', textAlign: 'left' }}>
                  <th style={{ padding: '8px 10px', fontWeight: 600 }}>Nama Bahan</th>
                  <th style={{ padding: '8px 10px', fontWeight: 600 }}>Kategori</th>
                  <th style={{ padding: '8px 10px', fontWeight: 600, textAlign: 'right' }}>Stok Gudang</th>
                </tr>
              </thead>
              <tbody>
                {ingredients.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', padding: '16px', color: 'var(--text-secondary)' }}>
                      Belum ada stok bahan baku di gudang
                    </td>
                  </tr>
                ) : (
                  ingredients.map(inv => {
                    const isLow = Number(inv.quantity) <= 5;
                    return (
                      <tr key={inv.id} style={{ borderBottom: '1px solid var(--border-default)' }}>
                        <td style={{ padding: '8px 10px' }}>
                          <div style={{ fontWeight: 600 }}>{inv.name}</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>
                            {inv.code}
                          </div>
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <span style={{
                            fontSize: '10px',
                            padding: '1px 6px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--bg-subtle)',
                            color: 'var(--text-secondary)',
                          }}>
                            {inv.category}
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

      {/* ── RIWAYAT PERACIKAN PREMIX & MUTASI WAREHOUSE ── */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
          <h3 style={{ margin: 0, fontSize: 'var(--text-base)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <History className="w-5 h-5 text-[var(--color-primary-600)]" aria-hidden="true" />
            Riwayat Aktivitas Peracikan Premix &amp; Mutasi Gudang
          </h3>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
            50 aktivitas terakhir
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
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
              {history.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>
                    Belum ada riwayat peracikan premix
                  </td>
                </tr>
              ) : (
                history.map(item => {
                  const isIncoming = item.movement_type === 'IN';
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border-default)' }}>
                      <td style={{ padding: '10px 12px', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                        {item.created_at ? format(new Date(item.created_at), 'dd MMM yyyy HH:mm', { locale: idLocale }) : '-'}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
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
                            <ArrowDownRight className="w-3.5 h-3.5 text-currentColor" aria-hidden="true" />
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
                            <ArrowUpRight className="w-3.5 h-3.5 text-currentColor" aria-hidden="true" />
                            KONSUMSI BAHAN (OUT)
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 600 }}>
                        {item.itemName}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: isIncoming ? 'var(--color-success-700)' : 'var(--color-danger-700)' }}>
                        {isIncoming ? '+' : '-'}{Number(item.quantity).toLocaleString('id-ID')} {item.uom}
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
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
  );
}
