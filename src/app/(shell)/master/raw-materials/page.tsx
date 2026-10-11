'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/data-table/DataTable';
import { Button } from '@/components/ui/Button';
import { Dropdown } from '@/components/ui/Dropdown';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Drawer } from '@/components/ui/Drawer';
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
  Sparkles,
  Tag,
  Wand2,
  PackageCheck,
  Filter,
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { getRawMaterials, createRawMaterial, updateRawMaterial, deleteRawMaterial } from '@/actions/master';
import type { DbRawMaterial } from '@/types/database';

const PACKAGING_TYPE_OPTIONS = [
  'Standing Pouch',
  'Toples',
  'Pouch Bantal',
  'Sachet',
  'Kardus / Box',
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

const WEIGHT_OPTIONS = [
  '50g',
  '60g',
  '75g',
  '100g',
  '150g',
  '250g',
  '500g',
  '800ml',
  '1000g / 1kg',
  'Custom',
];

export default function RawmaterialsPage() {
  const { user } = useAuth();
  const isManagement = user?.role === 'MANAGEMENT';

  const [data, setData] = useState<DbRawMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ALL' | 'RAW' | 'PACKAGING'>('ALL');

  const [drawerOpen, setDrawerOpen] = useState(false);
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
    package_weight: '100g',
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

  // Helper untuk mendeteksi apakah material termasuk kategori packaging
  const isPackagingMaterial = useCallback((item: DbRawMaterial): boolean => {
    const cat = (item.material_category || '').toLowerCase();
    const name = (item.name || '').toLowerCase();
    return (
      cat === 'packaging' ||
      name.includes('packaging') ||
      name.includes('kemasan') ||
      name.includes('toples') ||
      name.includes('pouch')
    );
  }, []);

  // Filter data berdasarkan tab
  const filteredData = useMemo(() => {
    if (activeTab === 'PACKAGING') {
      return data.filter(isPackagingMaterial);
    }
    if (activeTab === 'RAW') {
      return data.filter(item => !isPackagingMaterial(item));
    }
    return data;
  }, [data, activeTab, isPackagingMaterial]);

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
      package_weight: '100g',
    });
    setDrawerOpen(true);
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
      package_weight: item.package_weight || '100g',
    });
    setDrawerOpen(true);
  };

  // Generator otomatis untuk nama dan kode kemasan
  const handleAutoGeneratePackaging = () => {
    const type = form.packaging_type || 'Pouch';
    const flavor = form.flavor_variant || 'Original';
    const weight = form.package_weight || '100g';

    const shortType = type.toLowerCase().includes('toples')
      ? 'TPL'
      : type.toLowerCase().includes('bantal')
      ? 'BTL'
      : 'PCH';
    const shortFlavor = flavor.toLowerCase().includes('umum')
      ? 'ALL'
      : flavor.substring(0, 3).toUpperCase();
    const cleanWeight = weight.replace(/\s+/g, '').toUpperCase();

    const generatedCode = `PKG-${shortType}-${shortFlavor}-${cleanWeight}`;
    const generatedName = `Packaging ${type} ${flavor} ${weight}`;

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
        setDrawerOpen(false);
        loadData();
      } else {
        toast.error(res.error || 'Gagal memperbarui bahan');
      }
    } else {
      const res = await createRawMaterial(payload);
      if (res.success) {
        toast.success('Bahan baku/kemasan berhasil ditambahkan');
        setDrawerOpen(false);
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
        const cat = row.original.material_category || 'Bahan Baku';
        const isPkg = isPackagingMaterial(row.original);
        return (
          <span style={{
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: 'var(--radius-sm)',
            background: isPkg ? 'var(--color-primary-100)' : 'var(--bg-subtle)',
            color: isPkg ? 'var(--color-primary-800)' : 'var(--text-secondary)',
          }}>
            {cat}
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
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                variant="secondary"
                onClick={() => handleCreate(true)}
                leftIcon={<Box className="w-4 h-4" aria-hidden="true" />}
              >
                Tambah Kemasan (Packaging)
              </Button>
              <Button
                variant="primary"
                onClick={() => handleCreate(false)}
                leftIcon={<Plus className="w-4 h-4" aria-hidden="true" />}
              >
                Tambah Bahan Baku
              </Button>
            </div>
          ) : undefined
        }
      />

      {/* ── TAB FILTER BAHAN BAKU VS PACKAGING ── */}
      <div style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '2px solid var(--border-default)',
        marginBottom: 'var(--space-4)',
        marginTop: 'var(--space-2)',
      }}>
        <button
          onClick={() => setActiveTab('ALL')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: 'var(--space-2) var(--space-4)',
            fontSize: 'var(--text-sm)',
            fontWeight: activeTab === 'ALL' ? 700 : 500,
            color: activeTab === 'ALL' ? 'var(--color-primary-700)' : 'var(--text-secondary)',
            background: activeTab === 'ALL' ? 'var(--color-primary-50)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'ALL' ? '3px solid var(--color-primary-600)' : '3px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <Layers className="w-4 h-4" aria-hidden="true" />
          Semua Bahan ({data.length})
        </button>

        <button
          onClick={() => setActiveTab('RAW')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: 'var(--space-2) var(--space-4)',
            fontSize: 'var(--text-sm)',
            fontWeight: activeTab === 'RAW' ? 700 : 500,
            color: activeTab === 'RAW' ? 'var(--color-primary-700)' : 'var(--text-secondary)',
            background: activeTab === 'RAW' ? 'var(--color-primary-50)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'RAW' ? '3px solid var(--color-primary-600)' : '3px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <Tag className="w-4 h-4" aria-hidden="true" />
          Bahan Mentah &amp; Bumbu ({data.filter(i => !isPackagingMaterial(i)).length})
        </button>

        <button
          onClick={() => setActiveTab('PACKAGING')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: 'var(--space-2) var(--space-4)',
            fontSize: 'var(--text-sm)',
            fontWeight: activeTab === 'PACKAGING' ? 700 : 500,
            color: activeTab === 'PACKAGING' ? 'var(--color-primary-700)' : 'var(--text-secondary)',
            background: activeTab === 'PACKAGING' ? 'var(--color-primary-50)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'PACKAGING' ? '3px solid var(--color-primary-600)' : '3px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <Box className="w-4 h-4" aria-hidden="true" />
          Bahan Kemasan / Packaging ({data.filter(isPackagingMaterial).length})
        </button>
      </div>

      <DataTable columns={columns} data={filteredData} isLoading={isLoading} />

      {/* ── DRAWER FORM EDIT / TAMBAH BAHAN & PACKAGING ── */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={
          selectedItem
            ? `Edit ${form.material_category === 'Packaging' ? 'Bahan Kemasan' : 'Bahan Baku'}`
            : `Tambah ${form.material_category === 'Packaging' ? 'Kemasan (Packaging)' : 'Bahan Baku Baru'}`
        }
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDrawerOpen(false)}>Batal</Button>
            <Button variant="primary" onClick={handleSave} loading={isSaving}>Simpan Data</Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <FormField label="Kategori Bahan" required>
            <select
              value={form.material_category}
              onChange={e => {
                const newCat = e.target.value;
                setForm(f => ({
                  ...f,
                  material_category: newCat,
                  uom: newCat === 'Packaging' && !f.uom ? 'pcs' : f.uom,
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
              <option value="Packaging">Packaging (Bahan Kemasan Jadi)</option>
              <option value="Jamur">Jamur (Bahan Utama)</option>
              <option value="Bumbu">Bumbu Tabur / Seasoning</option>
              <option value="Tepung">Tepung &amp; Premix</option>
              <option value="Minyak">Minyak Goreng</option>
              <option value="Lainnya">Lainnya</option>
            </select>
          </FormField>

          {/* ── FITUR SPESIFIK PACKAGING (VARIASI & UKURAN/BERAT) ── */}
          {form.material_category === 'Packaging' && (
            <div style={{
              padding: 'var(--space-3)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-primary-50)',
              border: '1px solid var(--color-primary-200)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-primary-900)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Box className="w-4 h-4 text-[var(--color-primary-600)]" aria-hidden="true" />
                  Konfigurasi Variasi &amp; Ukuran Kemasan
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleAutoGeneratePackaging}
                  leftIcon={<Wand2 className="w-3.5 h-3.5" aria-hidden="true" />}
                  style={{ fontSize: '11px', padding: '2px 8px' }}
                >
                  Generate Nama &amp; Kode
                </Button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
                <FormField label="Tipe Kemasan">
                  <select
                    value={form.packaging_type}
                    onChange={e => setForm(f => ({ ...f, packaging_type: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: 'var(--space-2)',
                      border: '1px solid var(--border-default)',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-default)',
                      fontSize: 'var(--text-xs)',
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
                      padding: 'var(--space-2)',
                      border: '1px solid var(--border-default)',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-default)',
                      fontSize: 'var(--text-xs)',
                    }}
                  >
                    {FLAVOR_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </FormField>
              </div>

              <FormField label="Ukuran / Berat Kemasan">
                <select
                  value={form.package_weight}
                  onChange={e => setForm(f => ({ ...f, package_weight: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: 'var(--space-2)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-default)',
                    fontSize: 'var(--text-xs)',
                  }}
                >
                  {WEIGHT_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </FormField>
            </div>
          )}

          <FormField label="Kode Bahan (Code)" required>
            <Input
              value={form.code}
              onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
              placeholder={form.material_category === 'Packaging' ? 'e.g. PKG-PCH-BAL-75G' : 'e.g. RM-JAMUR-BASAH'}
            />
          </FormField>

          <FormField label="Nama Bahan (Name)" required>
            <Input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder={form.material_category === 'Packaging' ? 'e.g. Packaging Standing Pouch Balado 75g' : 'e.g. Jamur Tiram Basah'}
            />
          </FormField>

          <FormField label="Satuan / Unit of Measure (UOM)" required>
            <Input
              value={form.uom}
              onChange={e => setForm(f => ({ ...f, uom: e.target.value }))}
              placeholder={form.material_category === 'Packaging' ? 'pcs' : 'kg, gram, liter'}
            />
          </FormField>

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
      </Drawer>

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
