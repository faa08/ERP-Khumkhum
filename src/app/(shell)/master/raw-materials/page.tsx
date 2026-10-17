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
  Box,
  Layers,
  Tag,
  Wand2,
  Sparkles,
  Sprout,
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { getRawMaterials, createRawMaterial, updateRawMaterial, deleteRawMaterial } from '@/actions/master';
import type { DbRawMaterial } from '@/types/database';
import { BatchPackagingGeneratorModal } from '@/components/master/BatchPackagingGeneratorModal';

const PACKAGING_TYPE_OPTIONS = [
  'Standing Pouch',
  'Toples',
  'Pouch Bantal',
  'Lainnya',
];

const FLAVOR_OPTIONS = [
  'Umum (Semua Rasa / Polos)',
  'Original',
  'Balado',
  'Barbeque',
  'Pedas Manis',
  'Super Pedas',
  'Jagung Bakar',
  'Keju',
];

const QUICK_WEIGHT_SUGGESTIONS = [
  '30g',
  '50g',
  '60g',
  '75g',
  '100g',
  '150g',
  '250g',
  '500g',
];

export default function RawmaterialsPage() {
  const { user } = useAuth();
  const isManagement = user?.role === 'MANAGEMENT';

  const [data, setData] = useState<DbRawMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ALL' | 'UTAMA' | 'BUMBU' | 'PACKAGING' | 'LAINNYA'>('ALL');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab === 'UTAMA' || tab === 'BUMBU' || tab === 'PACKAGING' || tab === 'LAINNYA') {
        setActiveTab(tab as any);
      }
    }
  }, []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DbRawMaterial | null>(null);

  const [form, setForm] = useState({
    code: '',
    name: '',
    uom: '',
    min_stock: 0,
    rop: 0,
    material_category: '',
    packaging_type: 'Standing Pouch',
    flavor_variant: 'Original',
    package_weight: '',
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
    const res = await getRawMaterials();
    if (res.success && res.data) {
      setData(res.data);
    } else {
      toast.error(res.error || 'Gagal memuat data bahan baku');
    }
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Helper untuk mendeteksi kategori bahan baku standar (4 Kategori)
  const getMaterialCategory = useCallback((item: DbRawMaterial): 'UTAMA' | 'BUMBU' | 'PACKAGING' | 'LAINNYA' => {
    const cat = (item.material_category || '').toLowerCase();
    const name = (item.name || '').toLowerCase();

    if (
      cat === 'packaging' ||
      cat === 'kemasan' ||
      name.includes('packaging') ||
      name.includes('standing pouch') ||
      name.includes('pouch') ||
      name.includes('toples') ||
      name.includes('segel')
    ) {
      return 'PACKAGING';
    }
    if (
      cat === 'bumbu' ||
      cat.includes('bumbu') ||
      name.includes('bumbu') ||
      name.includes('balado') ||
      name.includes('pedas') ||
      name.includes('barbeque') ||
      name.includes('seasoning') ||
      name.includes('honeysia')
    ) {
      return 'BUMBU';
    }
    if (
      cat === 'bahan utama' ||
      cat === 'utama' ||
      cat === 'tepung' ||
      name.includes('jamur tiram') ||
      name.includes('minyak') ||
      name.includes('tepung') ||
      name.includes('premix') ||
      name.includes('tapioka') ||
      name.includes('terigu')
    ) {
      return 'UTAMA';
    }
    return 'LAINNYA';
  }, []);

  const isPackagingMaterial = useCallback((item: DbRawMaterial): boolean => {
    return getMaterialCategory(item) === 'PACKAGING';
  }, [getMaterialCategory]);

  // Filter data berdasarkan tab
  const filteredData = useMemo(() => {
    if (activeTab === 'ALL') return data;
    return data.filter(item => getMaterialCategory(item) === activeTab);
  }, [data, activeTab, getMaterialCategory]);

  const handleCreate = (isPackagingDefault = false) => {
    setSelectedItem(null);
    setForm({
      code: isPackagingDefault ? 'PKG-' : '',
      name: '',
      uom: isPackagingDefault ? 'pcs' : '',
      min_stock: 0,
      rop: 0,
      material_category: isPackagingDefault ? 'Packaging' : '',
      packaging_type: 'Standing Pouch',
      flavor_variant: 'Original',
      package_weight: '',
    });
    setIsModalOpen(true);
  };

  const handleEdit = (item: DbRawMaterial) => {
    setSelectedItem(item);
    const isPkg = isPackagingMaterial(item);
    setForm({
      code: item.code || '',
      name: item.name || '',
      uom: item.uom || '',
      min_stock: item.min_stock || 0,
      rop: item.rop || 0,
      material_category: item.material_category || (isPkg ? 'Packaging' : ''),
      packaging_type: item.packaging_type || 'Standing Pouch',
      flavor_variant: item.flavor_variant || 'Original',
      package_weight: item.package_weight || '',
    });
    setIsModalOpen(true);
  };

  // Generator otomatis untuk nama dan kode kemasan
  const handleAutoGeneratePackaging = () => {
    const type = form.packaging_type || 'Pouch';
    const flavor = form.flavor_variant || 'Original';
    const weight = form.package_weight?.trim() || '';

    const shortType = type.toLowerCase().includes('toples')
      ? 'TPL'
      : type.toLowerCase().includes('bantal')
      ? 'BTL'
      : 'PCH';
    const shortFlavor = flavor.toLowerCase().includes('umum')
      ? 'ALL'
      : flavor.substring(0, 3).toUpperCase();
    const cleanWeight = weight.replace(/\s+/g, '').toUpperCase();

    const generatedCode = `PKG-${shortType}-${shortFlavor}${cleanWeight ? `-${cleanWeight}` : ''}`;
    const generatedName = `Packaging ${type} ${flavor}${weight ? ` ${weight}` : ''}`;

    setForm(prev => ({
      ...prev,
      code: generatedCode,
      name: generatedName,
      uom: 'pcs',
      material_category: 'Packaging',
    }));
    toast.success('Nama dan Kode kemasan berhasil di-generate!');
  };

  const handleSave = async () => {
    if (!form.code || !form.name || !form.uom) {
      toast.error('Kode, Nama, dan Satuan (UOM) wajib diisi');
      return;
    }
    setIsSaving(true);

    const payload: Partial<DbRawMaterial> = {
      code: form.code,
      name: form.name,
      uom: form.uom,
      min_stock: form.min_stock,
      rop: form.rop,
      material_category: form.material_category,
      packaging_type: form.material_category === 'Packaging' ? form.packaging_type : null,
      flavor_variant: form.material_category === 'Packaging' ? form.flavor_variant : null,
      package_weight: form.material_category === 'Packaging' ? form.package_weight : null,
    };

    if (selectedItem) {
      const res = await updateRawMaterial(selectedItem.id, payload);
      if (res.success) {
        toast.success('Bahan baku/kemasan berhasil diperbarui');
        setIsModalOpen(false);
        loadData();
      } else {
        toast.error(res.error || 'Gagal memperbarui bahan');
      }
    } else {
      const res = await createRawMaterial(payload);
      if (res.success) {
        toast.success('Bahan baku/kemasan berhasil ditambahkan');
        setIsModalOpen(false);
        loadData();
      } else {
        toast.error(res.error || 'Gagal menambahkan bahan');
      }
    }
    setIsSaving(false);
  };

  const handleDelete = (item: DbRawMaterial) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Hapus Bahan Baku',
      description: `Apakah Anda yakin ingin menghapus "${item.name}"? Data stok terkait akan terdampak.`,
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        const res = await deleteRawMaterial(item.id);
        if (res.success) {
          toast.success('Bahan baku berhasil dihapus');
          loadData();
        } else {
          toast.error(res.error || 'Gagal menghapus bahan');
        }
      },
    });
  };

  const columns = useMemo<ColumnDef<DbRawMaterial>[]>(() => [
    {
      accessorKey: 'code',
      header: 'Kode',
      cell: ({ row }) => (
        <strong style={{ fontFamily: 'monospace', color: 'var(--color-primary-800)', fontSize: 'var(--text-xs)' }}>
          {row.original.code}
        </strong>
      ),
    },
    {
      accessorKey: 'name',
      header: 'Nama Bahan',
      cell: ({ row }) => {
        const item = row.original;
        const isPkg = isPackagingMaterial(item);
        return (
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.name}</div>
            {isPkg && (
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                <span style={{
                  fontSize: '10px',
                  padding: '1px 6px',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--color-primary-50)',
                  color: 'var(--color-primary-700)',
                  border: '1px solid var(--color-primary-200)',
                  fontWeight: 600,
                }}>
                  {item.packaging_type || 'Kemasan'}
                </span>
                {item.flavor_variant && (
                  <span style={{
                    fontSize: '10px',
                    padding: '1px 6px',
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--color-warning-50)',
                    color: 'var(--color-warning-800)',
                    border: '1px solid var(--color-warning-200)',
                    fontWeight: 600,
                  }}>
                    {item.flavor_variant}
                  </span>
                )}
                {item.package_weight && (
                  <span style={{
                    fontSize: '10px',
                    padding: '1px 6px',
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--bg-subtle)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-default)',
                    fontWeight: 600,
                  }}>
                    {item.package_weight}
                  </span>
                )}
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'material_category',
      header: 'Kategori',
      cell: ({ row }) => {
        const cat = getMaterialCategory(row.original);
        const catConfig = {
          UTAMA: { label: 'Bahan Utama', bg: '#DCFCE7', color: '#166534' },
          BUMBU: { label: 'Bumbu Tabur', bg: '#FEF3C7', color: '#92400E' },
          PACKAGING: { label: 'Bahan Kemasan', bg: '#E0E7FF', color: '#3730A3' },
          LAINNYA: { label: 'Lainnya', bg: '#F1F5F9', color: '#475569' },
        }[cat];
        return (
          <span style={{
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: 'var(--radius-sm)',
            background: catConfig.bg,
            color: catConfig.color,
          }}>
            {catConfig.label}
          </span>
        );
      },
    },
    {
      accessorKey: 'uom',
      header: 'Satuan (UOM)',
      cell: ({ row }) => (
        <span style={{ fontWeight: 500, fontSize: 'var(--text-xs)' }}>
          {row.original.uom}
        </span>
      ),
    },
    {
      accessorKey: 'min_stock',
      header: 'Min. Stock',
      cell: ({ row }) => (
        <span>{row.original.min_stock != null ? row.original.min_stock.toLocaleString('id-ID') : '-'}</span>
      ),
    },
    {
      accessorKey: 'rop',
      header: 'ROP',
      cell: ({ row }) => (
        <span>{row.original.rop != null ? row.original.rop.toLocaleString('id-ID') : '-'}</span>
      ),
    },
    ...(isManagement
      ? []
      : [
          {
            id: 'actions',
            cell: ({ row }: { row: any }) => (
              <Dropdown
                trigger={
                  <Button variant="ghost" size="sm" style={{ padding: '0 8px' }} aria-label="Aksi baris">
                    <MoreVertical size={16} aria-hidden="true" />
                  </Button>
                }
                items={[
                  {
                    id: 'edit',
                    label: 'Edit',
                    icon: <Edit2 size={14} aria-hidden="true" />,
                    onClick: () => handleEdit(row.original),
                  },
                  { divider: true, id: 'div1', label: '' },
                  {
                    id: 'delete',
                    label: 'Hapus',
                    icon: <Trash2 size={14} aria-hidden="true" />,
                    danger: true,
                    onClick: () => handleDelete(row.original),
                  },
                ]}
              />
            ),
          },
        ]),
  ], [isManagement, isPackagingMaterial]);

  return (
    <div>
      <PageHeader
        title="Data Induk Bahan Baku &amp; Kemasan"
        description="Kelola katalog bahan baku mentah, bumbu racikan, dan bahan kemasan (packaging variasi &amp; ukuran)."
        breadcrumbs={[{ label: 'Data Induk' }, { label: 'Bahan Baku & Kemasan' }]}
        actions={
          !isManagement ? (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {activeTab === 'PACKAGING' ? (
                <Button
                  variant="primary"
                  onClick={() => setIsBatchModalOpen(true)}
                  leftIcon={<Plus className="w-4 h-4" aria-hidden="true" />}
                >
                  Tambah Kemasan
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={() => handleCreate(false)}
                  leftIcon={<Plus className="w-4 h-4" aria-hidden="true" />}
                >
                  Tambah Bahan Baku
                </Button>
              )}
            </div>
          ) : undefined
        }
      />

      {/* ── FILTER TAB PER KATEGORI BAHAN BAKU ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        borderBottom: '2px solid var(--border-default)',
        marginBottom: 'var(--space-4)',
        marginTop: 'var(--space-2)',
        overflowX: 'auto',
      }}>
        {[
          { id: 'ALL', label: 'Semua Bahan', icon: Layers },
          { id: 'UTAMA', label: 'Bahan Baku Utama', icon: Sprout },
          { id: 'BUMBU', label: 'Bumbu Tabur', icon: Tag },
          { id: 'PACKAGING', label: 'Bahan Kemasan', icon: Box },
          { id: 'LAINNYA', label: 'Lainnya', icon: Sparkles },
        ].map(tab => {
          const count = tab.id === 'ALL' ? data.length : data.filter(i => getMaterialCategory(i) === tab.id).length;
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: 'var(--space-2) var(--space-4)',
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
              <Icon className="w-4 h-4" aria-hidden="true" />
              {tab.label} ({count})
            </button>
          );
        })}
      </div>

      <DataTable columns={columns} data={filteredData} isLoading={isLoading} />

      {/* ── MODAL POPUP EDIT / TAMBAH BAHAN BAKU & KEMASAN ── */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          selectedItem
            ? `Edit ${form.material_category === 'Packaging' ? 'Bahan Kemasan' : 'Bahan Baku'}`
            : `Tambah ${form.material_category === 'Packaging' ? 'Bahan Kemasan (Packaging)' : 'Bahan Baku Baru'}`
        }
        description="Kelola spesifikasi detail bahan baku mentah atau bahan kemasan siap pakai."
        size="lg"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', width: '100%' }}>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Batal
            </Button>
            <Button variant="primary" onClick={handleSave} loading={isSaving}>
              Simpan Data
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Baris 1: Kategori & Satuan */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 'var(--space-3)' }}>
            <FormField label="Kategori Bahan" required>
              <select
                value={form.material_category}
                onChange={e => {
                  const newCat = e.target.value;
                  let defaultUom = form.uom;
                  if (newCat === 'Packaging' && !form.uom) defaultUom = 'pcs';
                  else if (newCat === 'Bumbu' && !form.uom) defaultUom = 'gram';
                  else if (newCat === 'Bahan Utama' && !form.uom) defaultUom = 'kg';
                  setForm(f => ({
                    ...f,
                    material_category: newCat,
                    uom: defaultUom,
                  }));
                }}
                style={{
                  width: '100%',
                  padding: 'var(--space-2) var(--space-3)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-default)',
                  color: 'var(--text-primary)',
                  fontSize: 'var(--text-sm)',
                }}
              >
                <option value="">-- Pilih Kategori --</option>
                <option value="Bahan Utama">Bahan Baku Utama (Jamur, Tepung, Minyak)</option>
                <option value="Bumbu">Bumbu Tabur</option>
                <option value="Packaging">Bahan Kemasan (Packaging)</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </FormField>

            <FormField label="Satuan / Unit of Measure (UOM)" required>
              <Input
                value={form.uom}
                onChange={e => setForm(f => ({ ...f, uom: e.target.value }))}
                placeholder={form.material_category === 'Packaging' ? 'pcs' : form.material_category === 'Bumbu' ? 'gram' : 'kg, liter'}
              />
            </FormField>
          </div>

          {/* ── KONFIGURASI PACKAGING (HANYA KETIKA KATEGORI PACKAGING) ── */}
          {form.material_category === 'Packaging' && (
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
                  Spesifikasi &amp; Variasi Kemasan
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleAutoGeneratePackaging}
                  leftIcon={<Wand2 className="w-3.5 h-3.5" aria-hidden="true" />}
                  style={{ fontSize: '12px' }}
                >
                  Generate Nama &amp; Kode
                </Button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <FormField label="Tipe Kemasan">
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
                    {PACKAGING_TYPE_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
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
                    {FLAVOR_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </FormField>
              </div>

              <FormField label="Ukuran / Berat Kemasan (Manual / Custom)">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <Input
                    value={form.package_weight}
                    onChange={e => setForm(f => ({ ...f, package_weight: e.target.value }))}
                    placeholder="Contoh: 60g, 100g, 75g, 500g, atau 1kg"
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Pilihan cepat:</span>
                    {QUICK_WEIGHT_SUGGESTIONS.map(w => (
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
          )}

          {/* Baris 2: Kode & Nama Bahan */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--space-3)' }}>
            <FormField label="Kode Bahan (Code)" required>
              <Input
                value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                placeholder={form.material_category === 'Packaging' ? 'e.g. PKG-PCH-BAL-60G' : 'e.g. RM-JAMUR-BASAH'}
              />
            </FormField>

            <FormField label="Nama Bahan (Name)" required>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder={form.material_category === 'Packaging' ? 'e.g. Packaging Standing Pouch Balado 60g' : 'e.g. Jamur Tiram Segar'}
              />
            </FormField>
          </div>

          {/* Baris 3: Min Stock & ROP */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <FormField label="Minimum Stock">
              <Input
                type="number"
                value={form.min_stock.toString()}
                onChange={e => setForm(f => ({ ...f, min_stock: parseFloat(e.target.value) || 0 }))}
              />
            </FormField>

            <FormField label="Reorder Point (ROP)">
              <Input
                type="number"
                value={form.rop.toString()}
                onChange={e => setForm(f => ({ ...f, rop: parseFloat(e.target.value) || 0 }))}
              />
            </FormField>
          </div>
        </div>
      </Modal>

      <BatchPackagingGeneratorModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        existingMaterials={data}
        onSuccess={() => {
          loadData();
          setActiveTab('PACKAGING');
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
