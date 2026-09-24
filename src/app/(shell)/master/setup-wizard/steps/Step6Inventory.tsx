import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/hooks/useToast';
import { getRawMaterials, getProducts, initializeInventory } from '@/actions/master';
import type { DbRawMaterial, DbProduct } from '@/types/database';

interface Step6Props {
  onComplete: () => void;
  onBack: () => void;
}

export function Step6Inventory({ onComplete, onBack }: Step6Props) {
  const [loading, setLoading] = useState(false);
  const [rms, setRms] = useState<(DbRawMaterial & { initQty: number })[]>([]);
  const [prods, setProds] = useState<(DbProduct & { initQty: number })[]>([]);
  const toast = useToast();

  useEffect(() => {
    async function fetchData() {
      const [rRes, pRes] = await Promise.all([getRawMaterials(), getProducts()]);
      if (rRes.success && rRes.data) {
        setRms(rRes.data.map(r => ({ ...r, initQty: 0 })));
      }
      if (pRes.success && pRes.data) {
        setProds(pRes.data.map(p => ({ ...p, initQty: 0 })));
      }
    }
    fetchData();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      const payload: { item_id: string; item_type: 'RAW_MATERIAL'|'PRODUCT'; quantity: number }[] = [];

      rms.forEach(r => {
        if (r.initQty > 0) payload.push({ item_id: r.id, item_type: 'RAW_MATERIAL', quantity: r.initQty });
      });
      prods.forEach(p => {
        if (p.initQty > 0) payload.push({ item_id: p.id, item_type: 'PRODUCT', quantity: p.initQty });
      });

      if (payload.length > 0) {
        const res = await initializeInventory(payload);
        if (!res.success) throw new Error(res.error);
      }

      toast.success('Saldo Awal Stok berhasil disimpan!');
      onComplete(); // This completes the entire wizard
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan saat menyimpan stok awal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 'var(--space-2)' }}>
        Langkah 6: Saldo Awal (Initial Inventory)
      </h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-4)' }}>
        Masukkan jumlah stok fisik yang saat ini sudah ada di gudang agar sistem tidak mulai dari 0. Kosongkan (0) jika barang tersebut belum ada stoknya.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }}>
        <Card header={<div style={{ fontWeight: 600 }}>Stok Awal Bahan Baku</div>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
            {rms.map((rm, idx) => (
              <div key={rm.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 'var(--text-sm)' }}>
                  {rm.name} <span style={{ color: 'var(--text-secondary)' }}>({rm.uom})</span>
                </div>
                <Input 
                  type="number" 
                  step="0.1" 
                  value={rm.initQty} 
                  onChange={e => {
                    const newR = [...rms];
                    newR[idx].initQty = parseFloat(e.target.value) || 0;
                    setRms(newR);
                  }} 
                  style={{ width: '120px' }} 
                />
              </div>
            ))}
            {rms.length === 0 && <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Belum ada bahan baku.</div>}
          </div>
        </Card>

        <Card header={<div style={{ fontWeight: 600 }}>Stok Awal Produk Jadi</div>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
            {prods.map((prod, idx) => (
              <div key={prod.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 'var(--text-sm)' }}>
                  {prod.name}
                </div>
                <Input 
                  type="number" 
                  value={prod.initQty} 
                  onChange={e => {
                    const newP = [...prods];
                    newP[idx].initQty = parseFloat(e.target.value) || 0;
                    setProds(newP);
                  }} 
                  style={{ width: '120px' }} 
                />
              </div>
            ))}
            {prods.length === 0 && <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Belum ada produk jadi.</div>}
          </div>
        </Card>
      </div>

      <div style={{ padding: 'var(--space-3)', background: 'var(--color-success-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-success-200)', marginTop: 'var(--space-4)' }}>
        <strong>Selesai!</strong> Setelah menekan "Selesaikan Setup", sistem ERP Anda siap digunakan sepenuhnya dengan data HACCP dan konfigurasi Gudang yang sudah terintegrasi.
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-4)' }}>
        <Button variant="secondary" onClick={onBack} disabled={loading}>Kembali</Button>
        <Button variant="primary" onClick={handleSave} loading={loading}>
          Selesaikan Setup & Mulai Menggunakan ERP
        </Button>
      </div>
    </div>
  );
}
