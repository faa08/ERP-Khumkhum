'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/data-table/DataTable';
import { Button } from '@/components/ui/Button';
import { Dropdown } from '@/components/ui/Dropdown';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/form/FormField';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import {
  Plus,
  MoreVertical,
  Edit2,
  Trash2,
  Package,
  Box,
  Layers,
  Wand2,
  Sparkles,
  Tag,
  CheckCircle2,
  Palette,
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from '@/actions/master';
import type { DbProduct } from '@/types/database';
import {
  BatchProductGeneratorModal,
  generateProductSku,
  generateProductName,
  DEFAULT_PRODUCT_TYPES,
  DEFAULT_PRODUCT_FLAVORS,
  DEFAULT_PRODUCT_WEIGHTS,
} from '@/components/master/BatchProductGeneratorModal';

export const FLAVOR_TABS = [
  { id: 'ALL', label: 'Semua Produk' },
  { id: 'Original', label: 'Original' },
  { id: 'Balado', label: 'Balado' },
  { id: 'Barbeque', label: 'Barbeque' },
  { id: 'Pedas Manis', label: 'Pedas Manis' },
  { id: 'Super Pedas', label: 'Super Pedas' },
] as const;

export function getProductFlavor(item: DbProduct): string {
  const explicit = (item.flavor_variant || '').trim().toLowerCase();
  const name = (item.name || '').trim().toLowerCase();
  
  if (explicit === 'super pedas' || name.includes('super pedas') || name.includes('extra pedas') || name.includes('spicy')) {
    return 'Super Pedas';
  }
  if (explicit === 'pedas manis' || name.includes('pedas manis')) {
    return 'Pedas Manis';
  }
  if (explicit === 'balado' || name.includes('balado')) {
    return 'Balado';
  }
  if (explicit === 'barbeque' || explicit === 'bbq' || name.includes('barbeque') || name.includes('bbq')) {
    return 'Barbeque';
  }
  if (explicit === 'original' || explicit === 'ori' || name.includes('original') || name.includes('ori') || name.includes('polos')) {
    return 'Original';
  }
  return 'Lainnya';
}

export default function ProductsPage() {
  const { user } = useAuth();
  const isManagement = user?.role === 'MANAGEMENT';

  const [data, setData] = useState<DbProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DbProduct | null>(null);

  // Form State untuk Single Create/Edit
  const [form, setForm] = useState({
    packaging_type: 'Standing Pouch',
    flavor_variant: 'Original',
    package_weight: '60g',
    sku: '',
    name: '',
    description: '',
    unit_price: 15000,
    uom: 'pcs',
    rop: 50,
  });

  const [isSaving, setIsSaving] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    variant: 'danger' | 'primary';
  }>({ isOpen: false, title: '', description: '', onConfirm: () => {}, variant: 'primary' });

  const toast = useToast();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const res = await getProducts();
    if (res.success && res.data) {
      setData(res.data);
    } else {
      toast.error(res.error || 'Gagal memuat katalog produk jadi');
    }
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-generate SKU dan Nama Produk
  const handleAutoGenerateProduct = () => {
    const sku = generateProductSku(
      form.packaging_type,
      form.flavor_variant,
      form.package_weight,
      'FG'
    );
    const name = generateProductName(
      form.packaging_type,
      form.flavor_variant,
      form.package_weight,
      'Jamur Crispy'
    );
    setForm(f => ({
      ...f,
      sku,
      name,
      description: f.description || `Produk Jadi Kemasan ${f.packaging_type} (${f.package_weight}), Rasa ${f.flavor_variant}`,
    }));
  };

  const handleCreate = () => {
    setSelectedItem(null);
    const initialType = 'Standing Pouch';
    const initialFlavor = 'Original';
    const initialWeight = '60g';

    setForm({
      packaging_type: initialType,
      flavor_variant: initialFlavor,
      package_weight: initialWeight,
      sku: generateProductSku(initialType, initialFlavor, initialWeight, 'FG'),
      name: generateProductName(initialType, initialFlavor, initialWeight, 'Jamur Crispy'),
      description: `Produk Jadi Kemasan ${initialType} (${initialWeight}), Rasa ${initialFlavor}`,
      unit_price: 15000,
      uom: 'pcs',
      rop: 50,
    });
    setIsModalOpen(true);
  };

  const handleEdit = (item: DbProduct) => {
    setSelectedItem(item);
    
    // Deteksi tipe kemasan dari nama
    const nameLower = (item.name || '').toLowerCase();
    const detectedType = nameLower.includes('toples')
      ? 'Toples'
      : nameLower.includes('bantal')
      ? 'Pouch Bantal'
      : 'Standing Pouch';

    // Deteksi rasa
    const detectedFlavor = nameLower.includes('balado')
      ? 'Balado'
      : nameLower.includes('barbeque') || nameLower.includes('bbq')
      ? 'Barbeque'
      : nameLower.includes('pedas manis')
      ? 'Pedas Manis'
      : nameLower.includes('super pedas')
      ? 'Super Pedas'
      : nameLower.includes('jagung')
      ? 'Jagung Bakar'
      : nameLower.includes('keju')
      ? 'Keju'
      : 'Original';

    // Deteksi berat
    const weightMatch = item.name.match(/\d+\s*(?:g|gr|gram|kg)/i);
    const detectedWeight = weightMatch ? weightMatch[0] : '60g';

    setForm({
      packaging_type: item.packaging_type || detectedType,
      flavor_variant: item.flavor_variant || detectedFlavor,
      package_weight: item.package_weight || detectedWeight,
      sku: item.sku || '',
      name: item.name || '',
      description: item.description || '',
      unit_price: Number(item.unit_price) || 0,
      uom: item.uom || 'pcs',
      rop: Number(item.rop) || 0,
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.sku || !form.name) {
      toast.error('Kode SKU dan Nama Produk wajib diisi');
      return;
    }
    setIsSaving(true);

    const payload = {
      sku: form.sku.trim(),
      name: form.name.trim(),
      description: form.description?.trim() || null,
      category: 'Barang Jadi',
      uom: form.uom || 'pcs',
      unit_price: Number(form.unit_price) > 0 ? Number(form.unit_price) : null,
      rop: Number(form.rop) || 0,
      packaging_type: form.packaging_type,
      flavor_variant: form.flavor_variant,
      package_weight: form.package_weight,
    };
    
    if (selectedItem) {
      const res = await updateProduct(selectedItem.id, payload);
      if (res.success) {
        toast.success('Produk jadi berhasil diperbarui');
        setIsModalOpen(false);
        loadData();
      } else {
        toast.error(res.error || 'Gagal memperbarui produk jadi');
      }
    } else {
      const res = await createProduct(payload);
      if (res.success) {
        toast.success('Produk jadi baru berhasil ditambahkan');
        setIsModalOpen(false);
        loadData();
      } else {
        toast.error(res.error || 'Gagal membuat produk jadi');
      }
    }
    setIsSaving(false);
  };

  const handleDelete = (item: DbProduct) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Hapus Produk Jadi',
      description: `Apakah Anda yakin ingin menghapus produk "${item.name}" (${item.sku})? Data transaksi terdahulu akan tetap aman.`,
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        const res = await deleteProduct(item.id);
        if (res.success) {
          toast.success('Produk berhasil dihapus');
          loadData();
        } else {
          toast.error(res.error || 'Gagal menghapus produk');
        }
      }
    });
  };

  // Hitung jumlah SKU per rasa
  const flavorCounts = useMemo(() => {
    const c: Record<string, number> = {
      ALL: data.length,
      Original: 0,
      Balado: 0,
      Barbeque: 0,
      'Pedas Manis': 0,
      'Super Pedas': 0,
      Lainnya: 0,
    };
    data.forEach(item => {
      const f = getProductFlavor(item);
      c[f] = (c[f] || 0) + 1;
    });
    return c;
  }, [data]);

  // Helper filter data per tab rasa
  const filteredData = useMemo(() => {
    if (activeTab === 'ALL') return data;
    return data.filter(item => getProductFlavor(item) === activeTab);
  }, [data, activeTab]);

  // Format IDR
  const formatRupiah = (val?: number | null) => {
    if (val === null || val === undefined || isNaN(val) || val === 0) return '-';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  };

  const columns = useMemo<ColumnDef<DbProduct>[]>(() => [
    {
      accessorKey: 'sku',
      header: 'Kode SKU',
      cell: ({ row }) => (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '2px 8px',
          borderRadius: 'var(--radius-sm, 4px)',
          background: 'var(--color-primary-50, #fefce8)',
          color: 'var(--color-primary-800, #854d0e)',
          border: '1px solid var(--color-primary-200, #fef08a)',
          fontFamily: 'monospace',
          fontWeight: 700,
          fontSize: '12px',
        }}>
          {row.original.sku}
        </span>
      ),
    },
    {
      accessorKey: 'name',
      header: 'Nama Produk Jadi',
      cell: ({ row }) => {
        const item = row.original;
        const flavor = getProductFlavor(item);

        let flavorBadgeBg = 'var(--bg-subtle)';
        let flavorBadgeColor = 'var(--text-secondary)';
        let flavorBorder = 'var(--border-subtle)';

        if (flavor === 'Balado') {
          flavorBadgeBg = 'rgba(239, 68, 68, 0.1)';
          flavorBadgeColor = '#dc2626';
          flavorBorder = 'rgba(239, 68, 68, 0.25)';
        } else if (flavor === 'Super Pedas') {
          flavorBadgeBg = 'rgba(185, 28, 28, 0.12)';
          flavorBadgeColor = '#991b1b';
          flavorBorder = 'rgba(185, 28, 28, 0.3)';
        } else if (flavor === 'Original') {
          flavorBadgeBg = 'rgba(16, 185, 129, 0.1)';
          flavorBadgeColor = '#059669';
          flavorBorder = 'rgba(16, 185, 129, 0.25)';
        } else if (flavor === 'Barbeque') {
          flavorBadgeBg = 'rgba(217, 119, 6, 0.1)';
          flavorBadgeColor = '#b45309';
          flavorBorder = 'rgba(217, 119, 6, 0.25)';
        } else if (flavor === 'Pedas Manis') {
          flavorBadgeBg = 'rgba(249, 115, 22, 0.1)';
          flavorBadgeColor = '#ea580c';
          flavorBorder = 'rgba(249, 115, 22, 0.25)';
        }

        return (
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13.5px' }}>
              {item.name}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
              <span style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '1px 8px',
                borderRadius: '4px',
                background: flavorBadgeBg,
                color: flavorBadgeColor,
                border: `1px solid ${flavorBorder}`,
              }}>
                Rasa {flavor}
              </span>
              {item.description && (
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  • {item.description}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'uom',
      header: 'Satuan',
      cell: ({ row }) => (
        <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
          {row.original.uom || 'pcs'}
        </span>
      ),
    },
    {
      accessorKey: 'unit_price',
      header: 'Harga Jual',
      cell: ({ row }) => (
        <span style={{ fontWeight: 600, fontSize: '12.5px', color: 'var(--text-primary)' }}>
          {formatRupiah(row.original.unit_price)}
        </span>
      ),
    },
    {
      accessorKey: 'rop',
      header: 'Reorder Point (ROP)',
      cell: ({ row }) => (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '2px 8px',
          borderRadius: '999px',
          fontSize: '11.5px',
          fontWeight: 600,
          background: 'var(--bg-subtle)',
          color: 'var(--text-secondary)',
          border: '1px solid var(--border-subtle)',
        }}>
          {Number(row.original.rop) || 0} pcs
        </span>
      ),
    },
    ...(isManagement ? [] : [{
      id: 'actions',
      header: 'Aksi',
      cell: ({ row }: { row: any }) => (
        <Dropdown
          trigger={
            <Button variant="ghost" size="sm" style={{ padding: '0 8px' }}>
              <MoreVertical size={16} />
            </Button>
          }
          items={[
            { id: 'edit', label: 'Edit Produk', icon: <Edit2 size={14} />, onClick: () => handleEdit(row.original) },
            { divider: true, id: 'div1', label: '' },
            { 
              id: 'delete', 
              label: 'Hapus Produk', 
              icon: <Trash2 size={14} />,
              danger: true,
              onClick: () => handleDelete(row.original)
            },
          ]}
        />
      )
    }])
  ], [isManagement]);

  // Statistik Ringkas
  const pouchCount = data.filter(d => (d.name || '').toLowerCase().includes('pouch') && !(d.name || '').toLowerCase().includes('bantal')).length;
  const toplesCount = data.filter(d => (d.name || '').toLowerCase().includes('toples')).length;
  const bantalCount = data.filter(d => (d.name || '').toLowerCase().includes('bantal')).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <PageHeader
        title="Pusat Data Produk Jadi (Finished Goods)"
        description="Kelola katalog produk siap jual pabrik Khumkhum. Gunakan Generator Matriks untuk membuat varian rasa & kemasan produk jadi sekaligus."
        breadcrumbs={[{ label: 'Data Induk' }, { label: 'Produk Jadi' }]}
        actions={
          !isManagement ? (
            <Button
              variant="primary"
              onClick={() => setIsBatchModalOpen(true)}
              leftIcon={<Plus size={16} />}
            >
              Tambah Produk Jadi
            </Button>
          ) : undefined
        }
      />

      {/* ── STATISTIK MINI ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 'var(--space-3)',
      }}>
        <div style={{
          padding: '12px 16px',
          borderRadius: 'var(--radius-lg, 10px)',
          background: 'var(--bg-default)',
          border: '1px solid var(--border-default)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <div style={{
            padding: '8px',
            borderRadius: '8px',
            background: 'var(--color-primary-50)',
            color: 'var(--color-primary-700)',
          }}>
            <Package size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
              Total SKU KhumKhum
            </div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {data.length} <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-tertiary)' }}>SKU Siap Jual</span>
            </div>
          </div>
        </div>

        <div style={{
          padding: '12px 16px',
          borderRadius: 'var(--radius-lg, 10px)',
          background: 'var(--bg-default)',
          border: '1px solid var(--border-default)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <div style={{
            padding: '8px',
            borderRadius: '8px',
            background: 'rgba(245, 158, 11, 0.1)',
            color: '#d97706',
          }}>
            <Palette size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
              5 Varian Rasa Utama
            </div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {['Original', 'Balado', 'Barbeque', 'Pedas Manis', 'Super Pedas'].filter(r => (flavorCounts[r] || 0) > 0).length} / 5 <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-tertiary)' }}>Rasa Aktif</span>
            </div>
          </div>
        </div>

        <div style={{
          padding: '12px 16px',
          borderRadius: 'var(--radius-lg, 10px)',
          background: 'var(--bg-default)',
          border: '1px solid var(--border-default)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <div style={{
            padding: '8px',
            borderRadius: '8px',
            background: 'rgba(16, 185, 129, 0.1)',
            color: '#059669',
          }}>
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
              Buffer Aman Minimum (ROP)
            </div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {data.reduce((acc, it) => acc + (Number(it.rop) || 0), 0)} <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-tertiary)' }}>pcs</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── FILTER TAB PER RASA (5 RASA UTAMA KHUMKHUM) ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        borderBottom: '1px solid var(--border-default)',
        paddingBottom: '0',
        overflowX: 'auto',
      }}>
        {FLAVOR_TABS.map(tab => {
          const count = flavorCounts[tab.id] || 0;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '8px 14px',
                fontSize: 'var(--text-sm)',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? 'var(--color-primary-700)' : 'var(--text-secondary)',
                background: isActive ? 'var(--color-primary-50)' : 'transparent',
                border: 'none',
                borderBottom: isActive ? '3px solid var(--color-primary-600)' : '3px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.label} ({count})
            </button>
          );
        })}

        {flavorCounts.Lainnya > 0 && (
          <button
            type="button"
            onClick={() => setActiveTab('Lainnya')}
            style={{
              padding: '8px 14px',
              fontSize: 'var(--text-sm)',
              fontWeight: activeTab === 'Lainnya' ? 700 : 500,
              color: activeTab === 'Lainnya' ? 'var(--color-primary-700)' : 'var(--text-secondary)',
              background: activeTab === 'Lainnya' ? 'var(--color-primary-50)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'Lainnya' ? '3px solid var(--color-primary-600)' : '3px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
            }}
          >
            Varian Lainnya ({flavorCounts.Lainnya})
          </button>
        )}
      </div>

      <DataTable columns={columns} data={filteredData} isLoading={isLoading} />

      {/* ── MODAL TAMBAH / EDIT PRODUK SATUAN (PERSIS SEPERTI KEMASAN) ── */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedItem ? `Edit Produk Jadi: ${selectedItem.name}` : 'Tambah Data Produk Jadi Baru'}
        description="Lengkapi spesifikasi kemasan, varian rasa, dan gramatur produk. Gunakan fitur auto-generate untuk membuat SKU dan Nama standar."
        size="lg"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', width: '100%' }}>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Batal
            </Button>
            <Button variant="primary" onClick={handleSave} loading={isSaving}>
              Simpan Data Produk
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          
          {/* KOTAK GENERATOR SPESIFIKASI & VARIASI (MIRIP KEMASAN) */}
          <div style={{
            padding: 'var(--space-4)',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border-default)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 'var(--space-2)' }}>
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Box className="w-4 h-4 text-primary" aria-hidden="true" />
                Spesifikasi &amp; Variasi Produk Jadi
              </span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleAutoGenerateProduct}
                leftIcon={<Wand2 className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />}
                style={{ fontSize: '12px' }}
              >
                Generate Nama &amp; SKU Otomatis
              </Button>
            </div>

            {/* Tipe Kemasan & Variasi Rasa Target */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <FormField label="Tipe Kemasan / Wadah">
                <select
                  value={form.packaging_type}
                  onChange={e => setForm(f => ({ ...f, packaging_type: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: 'var(--space-2) var(--space-3)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-default)',
                    fontSize: 'var(--text-sm)',
                  }}
                >
                  {DEFAULT_PRODUCT_TYPES.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                  <option value="Lainnya">Lainnya</option>
                </select>
              </FormField>

              <FormField label="Variasi Rasa Target">
                <select
                  value={form.flavor_variant}
                  onChange={e => setForm(f => ({ ...f, flavor_variant: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: 'var(--space-2) var(--space-3)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-default)',
                    fontSize: 'var(--text-sm)',
                  }}
                >
                  {DEFAULT_PRODUCT_FLAVORS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                  <option value="Rumput Laut">Rumput Laut</option>
                  <option value="Cokelat">Cokelat</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </FormField>
            </div>

            {/* Baris 3: Ukuran Gramatur & Pilihan Cepat */}
            <FormField label="Ukuran / Berat Kemasan (Gramatur)">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <Input
                  value={form.package_weight}
                  onChange={e => setForm(f => ({ ...f, package_weight: e.target.value }))}
                  placeholder="Contoh: 60g, 100g, 75g, 500g, atau 1kg"
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Pilihan cepat:</span>
                  {DEFAULT_PRODUCT_WEIGHTS.map(w => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, package_weight: w }))}
                      style={{
                        padding: '2px 8px',
                        fontSize: '11px',
                        borderRadius: 'var(--radius-sm)',
                        border: form.package_weight === w ? '1px solid var(--color-primary-600)' : '1px solid var(--border-default)',
                        background: form.package_weight === w ? 'var(--color-primary-50)' : 'var(--bg-default)',
                        color: form.package_weight === w ? 'var(--color-primary-700)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontWeight: form.package_weight === w ? 600 : 400,
                      }}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>
            </FormField>
          </div>

          {/* HASIL KODE SKU & NAMA RESMI PRODUK */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--space-3)' }}>
            <FormField label="Kode SKU (Otomatis / Manual)" required>
              <Input
                value={form.sku}
                onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
                placeholder="e.g. FG-PCH-BLD-60G"
                style={{ fontFamily: 'monospace', fontWeight: 600 }}
              />
            </FormField>

            <FormField label="Nama Lengkap Produk Jadi" required>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Jamur Crispy Standing Pouch Balado 60g"
              />
            </FormField>
          </div>

          {/* PARAMETER HARGA, ROP & SATUAN */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 'var(--space-3)' }}>
            <FormField label="Harga Jual Satuan (Rp)">
              <Input
                type="number"
                value={form.unit_price.toString()}
                onChange={e => setForm(f => ({ ...f, unit_price: parseFloat(e.target.value) || 0 }))}
                placeholder="15000"
              />
            </FormField>

            <FormField label="Reorder Point (ROP)">
              <Input
                type="number"
                value={form.rop.toString()}
                onChange={e => setForm(f => ({ ...f, rop: parseFloat(e.target.value) || 0 }))}
                placeholder="50"
              />
            </FormField>

            <FormField label="Satuan (UOM)">
              <Input
                value={form.uom}
                onChange={e => setForm(f => ({ ...f, uom: e.target.value }))}
                placeholder="pcs, toples, box"
              />
            </FormField>
          </div>

          {/* DESKRIPSI */}
          <FormField label="Deskripsi / Catatan Tambahan">
            <Input
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Keterangan spesifik (misal: kemasan edisi khusus, target reseller, dll)"
            />
          </FormField>
        </div>
      </Modal>

      {/* ── MODAL GENERATOR MATRIX BATCH (MASSAL) ── */}
      <BatchProductGeneratorModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        existingProducts={data}
        onSuccess={() => {
          loadData();
        }}
      />

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        description={confirmDialog.description}
        variant={confirmDialog.variant}
      />
    </div>
  );
}
