import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/hooks/useToast';
import { createRawMaterial, createProduct } from '@/actions/master';
import { Plus, Trash2 } from 'lucide-react';

interface Step3Props {
  onComplete: () => void;
  onBack: () => void;
}

export function Step3Items({ onComplete, onBack }: Step3Props) {
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const [rawMaterials, setRawMaterials] = useState([
    { code: 'RM-JMR', name: 'Jamur Tiram Segar', uom: 'kg', material_category: 'Jamur' },
    { code: 'RM-MYK', name: 'Minyak Goreng', uom: 'kg', material_category: 'Minyak' },
    { code: 'RM-BMB', name: 'Bumbu Balado', uom: 'kg', material_category: 'Bumbu' },
  ]);

  const [products, setProducts] = useState([
    { sku: 'FG-BLD-50', name: 'Jamur Crispy Balado 50g' },
    { sku: 'FG-ORG-50', name: 'Jamur Crispy Original 50g' }
  ]);

  const addRM = () => setRawMaterials([...rawMaterials, { code: '', name: '', uom: 'kg', material_category: '' }]);
  const removeRM = (idx: number) => setRawMaterials(rawMaterials.filter((_, i) => i !== idx));

  const addProduct = () => setProducts([...products, { sku: '', name: '' }]);
  const removeProduct = (idx: number) => setProducts(products.filter((_, i) => i !== idx));

  const handleSave = async () => {
    const validRMs = rawMaterials.filter(r => r.name.trim() !== '' && r.code.trim() !== '');
    const validProds = products.filter(p => p.name.trim() !== '' && p.sku.trim() !== '');

    if (validRMs.length === 0) {
      toast.error('Harap masukkan minimal 1 Bahan Baku utama.');
      return;
    }
    if (validProds.length === 0) {
      toast.error('Harap masukkan minimal 1 Produk Jadi.');
      return;
    }

    setLoading(true);
    try {
      for (const rm of validRMs) {
        const res = await createRawMaterial(rm);
        if (!res.success) throw new Error(`Gagal menyimpan ${rm.name}: ${res.error}`);
      }
      for (const p of validProds) {
        const res = await createProduct(p);
        if (!res.success) throw new Error(`Gagal menyimpan ${p.name}: ${res.error}`);
      }

      toast.success('Bahan Baku & Produk berhasil disimpan!');
      onComplete();
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 'var(--space-2)' }}>
        Langkah 3: Item Master (Bahan Baku & Produk Jadi)
      </h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-4)' }}>
        Daftarkan SKU (Stock Keeping Unit) untuk bahan baku yang dibeli dan produk akhir yang dijual. Beberapa contoh umum sudah diisi.
      </p>

      <Card header={<div style={{ fontWeight: 600 }}>Daftar Bahan Baku (Bahan Dasar)</div>}>
        <div style={{ overflowX: 'auto', marginTop: 'var(--space-2)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
            <thead>
              <tr style={{ background: 'var(--bg-subtle)', textAlign: 'left' }}>
                <th style={{ padding: '8px', borderBottom: '1px solid var(--border-default)' }}>Kode Item (RM)</th>
                <th style={{ padding: '8px', borderBottom: '1px solid var(--border-default)' }}>Nama Bahan Baku</th>
                <th style={{ padding: '8px', borderBottom: '1px solid var(--border-default)' }}>Kategori</th>
                <th style={{ padding: '8px', borderBottom: '1px solid var(--border-default)' }}>Satuan</th>
                <th style={{ padding: '8px', borderBottom: '1px solid var(--border-default)' }}></th>
              </tr>
            </thead>
            <tbody>
              {rawMaterials.map((rm, idx) => (
                <tr key={idx}>
                  <td style={{ padding: '4px' }}>
                    <Input value={rm.code} onChange={(e) => {
                      const newRM = [...rawMaterials]; newRM[idx].code = e.target.value; setRawMaterials(newRM);
                    }} style={{ padding: '6px' }} />
                  </td>
                  <td style={{ padding: '4px' }}>
                    <Input value={rm.name} onChange={(e) => {
                      const newRM = [...rawMaterials]; newRM[idx].name = e.target.value; setRawMaterials(newRM);
                    }} style={{ padding: '6px' }} />
                  </td>
                  <td style={{ padding: '4px' }}>
                    <Input value={rm.material_category} onChange={(e) => {
                      const newRM = [...rawMaterials]; newRM[idx].material_category = e.target.value; setRawMaterials(newRM);
                    }} placeholder="Cth: Bumbu" style={{ padding: '6px' }} />
                  </td>
                  <td style={{ padding: '4px' }}>
                    <select value={rm.uom} onChange={(e) => {
                      const newRM = [...rawMaterials]; newRM[idx].uom = e.target.value; setRawMaterials(newRM);
                    }} style={{ padding: '6px', width: '100%', border: '1px solid var(--border-default)', borderRadius: '4px' }}>
                      <option value="kg">Kilogram (kg)</option>
                      <option value="gram">Gram (g)</option>
                      <option value="pcs">Pcs</option>
                      <option value="liter">Liter</option>
                    </select>
                  </td>
                  <td style={{ padding: '4px', textAlign: 'center' }}>
                    <Button variant="ghost" size="sm" onClick={() => removeRM(idx)} disabled={rawMaterials.length === 1}>
                      <Trash2 size={16} color="var(--color-danger-500)" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Button variant="ghost" size="sm" onClick={addRM} leftIcon={<Plus size={16} />} style={{ marginTop: '8px' }}>
            Tambah Bahan Baku
          </Button>
        </div>
      </Card>

      <Card header={<div style={{ fontWeight: 600 }}>Daftar Produk Jadi (Finished Goods)</div>}>
        <div style={{ overflowX: 'auto', marginTop: 'var(--space-2)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
            <thead>
              <tr style={{ background: 'var(--bg-subtle)', textAlign: 'left' }}>
                <th style={{ padding: '8px', borderBottom: '1px solid var(--border-default)' }}>Kode SKU (FG)</th>
                <th style={{ padding: '8px', borderBottom: '1px solid var(--border-default)' }}>Nama Produk Akhir & Ukuran</th>
                <th style={{ padding: '8px', borderBottom: '1px solid var(--border-default)' }}></th>
              </tr>
            </thead>
            <tbody>
              {products.map((prod, idx) => (
                <tr key={idx}>
                  <td style={{ padding: '4px', width: '30%' }}>
                    <Input value={prod.sku} onChange={(e) => {
                      const newP = [...products]; newP[idx].sku = e.target.value; setProducts(newP);
                    }} style={{ padding: '6px' }} />
                  </td>
                  <td style={{ padding: '4px' }}>
                    <Input value={prod.name} onChange={(e) => {
                      const newP = [...products]; newP[idx].name = e.target.value; setProducts(newP);
                    }} placeholder="Cth: Jamur Crispy Rasa Pedas 100g" style={{ padding: '6px' }} />
                  </td>
                  <td style={{ padding: '4px', textAlign: 'center', width: '60px' }}>
                    <Button variant="ghost" size="sm" onClick={() => removeProduct(idx)} disabled={products.length === 1}>
                      <Trash2 size={16} color="var(--color-danger-500)" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Button variant="ghost" size="sm" onClick={addProduct} leftIcon={<Plus size={16} />} style={{ marginTop: '8px' }}>
            Tambah Produk Jadi
          </Button>
        </div>
      </Card>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-4)' }}>
        <Button variant="secondary" onClick={onBack} disabled={loading}>Kembali</Button>
        <Button variant="primary" onClick={handleSave} loading={loading}>Simpan & Lanjutkan</Button>
      </div>
    </div>
  );
}
