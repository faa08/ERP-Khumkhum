import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/hooks/useToast';
import { getProductionStandards, saveProductionStandards } from '@/actions/standards';
import { getProducts } from '@/actions/master';
import type { DbProduct } from '@/types/database';

interface Step4Props {
  onComplete: () => void;
  onBack: () => void;
}

export function Step4Bom({ onComplete, onBack }: Step4Props) {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<DbProduct[]>([]);
  const toast = useToast();

  const [recipes, setRecipes] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      const pRes = await getProducts();
      if (pRes.success && pRes.data) {
        setProducts(pRes.data);
        
        // Initialize recipes for each product
        const initialRecipes = pRes.data.map(p => ({
          product_name: p.name,
          raw_mushroom_ratio: 1.0,
          premix_flour_ratio: 0.25,
          cooking_oil_ratio: 0.30,
          seasoning_ratio: 0.05
        }));
        setRecipes(initialRecipes);
      }
    }
    fetchData();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      const currentStandards = await getProductionStandards();
      if (!currentStandards.success) throw new Error('Gagal mengambil standar saat ini');

      const updated = {
        ...currentStandards.data,
        bom_recipes: recipes
      };

      const res = await saveProductionStandards(updated);
      if (!res.success) throw new Error(res.error);

      toast.success('Resep (BOM) berhasil diracik dan disimpan!');
      onComplete();
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan saat menyimpan Resep');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 'var(--space-2)' }}>
        Langkah 4: Resep Produksi (Bill of Materials)
      </h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-4)' }}>
        Silakan racik takaran bahan baku untuk menghasilkan <strong>1 Kg Produk Akhir</strong>. Sistem akan menggunakan rasio ini untuk otomatis memotong stok di Gudang saat produksi berjalan.
      </p>

      {products.length === 0 ? (
        <Card>
          <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Belum ada produk yang didaftarkan. Harap kembali ke Langkah 3.
          </div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {recipes.map((recipe, idx) => (
            <Card key={idx} header={<div style={{ fontWeight: 600 }}>Resep untuk: {recipe.product_name}</div>}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-4)', marginTop: 'var(--space-2)' }}>
                <div>
                  <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>Jamur Mentah (Kg)</label>
                  <Input 
                    type="number" 
                    step="0.01" 
                    value={recipe.raw_mushroom_ratio} 
                    onChange={(e) => {
                      const newR = [...recipes];
                      newR[idx].raw_mushroom_ratio = parseFloat(e.target.value) || 0;
                      setRecipes(newR);
                    }} 
                  />
                </div>
                <div>
                  <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>Tepung Premix (Kg)</label>
                  <Input 
                    type="number" 
                    step="0.01" 
                    value={recipe.premix_flour_ratio} 
                    onChange={(e) => {
                      const newR = [...recipes];
                      newR[idx].premix_flour_ratio = parseFloat(e.target.value) || 0;
                      setRecipes(newR);
                    }} 
                  />
                </div>
                <div>
                  <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>Minyak Goreng (Kg)</label>
                  <Input 
                    type="number" 
                    step="0.01" 
                    value={recipe.cooking_oil_ratio} 
                    onChange={(e) => {
                      const newR = [...recipes];
                      newR[idx].cooking_oil_ratio = parseFloat(e.target.value) || 0;
                      setRecipes(newR);
                    }} 
                  />
                </div>
                <div>
                  <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>Bumbu Tabur (Kg)</label>
                  <Input 
                    type="number" 
                    step="0.01" 
                    value={recipe.seasoning_ratio} 
                    onChange={(e) => {
                      const newR = [...recipes];
                      newR[idx].seasoning_ratio = parseFloat(e.target.value) || 0;
                      setRecipes(newR);
                    }} 
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-4)' }}>
        <Button variant="secondary" onClick={onBack} disabled={loading}>Kembali</Button>
        <Button variant="primary" onClick={handleSave} loading={loading} disabled={products.length === 0}>
          Simpan Resep & Lanjutkan
        </Button>
      </div>
    </div>
  );
}
