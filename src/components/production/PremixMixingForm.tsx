'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/form/FormField';
import { useToast } from '@/hooks/useToast';
import { Trash2, Plus } from 'lucide-react';
import { recordPremixMixing } from '@/actions/production';
import { supabase } from '@/lib/supabase';

export function PremixMixingForm() {
  const [inventories, setInventories] = useState<any[]>([]);
  const [rawMaterials, setRawMaterials] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();

  const [form, setForm] = useState({
    premix_item_id: '',
    output_qty: '',
    notes: '',
  });

  const [ingredients, setIngredients] = useState<{ inventory_id: string; qty: string; _id: number }[]>([
    { inventory_id: '', qty: '', _id: Date.now() },
  ]);

  useEffect(() => {
    async function load() {
      const { data: inv } = await supabase.from('inventory').select('id, quantity, item_id, item_type');
      const { data: rm } = await supabase.from('raw_materials').select('id, name, uom');
      
      setInventories(inv || []);
      setRawMaterials(rm || []);
      setIsLoading(false);
    }
    load();
  }, []);

  const handleAddIngredient = () => {
    setIngredients([...ingredients, { inventory_id: '', qty: '', _id: Date.now() }]);
  };

  const handleRemoveIngredient = (id: number) => {
    setIngredients(ingredients.filter(i => i._id !== id));
  };

  const handleUpdateIngredient = (id: number, field: string, val: string) => {
    setIngredients(ingredients.map(i => i._id === id ? { ...i, [field]: val } : i));
  };

  const handleSubmit = async () => {
    if (!form.premix_item_id || !form.output_qty) {
      toast.error('Pilih Premix dan masukkan hasil (kg)');
      return;
    }

    const validIngredients = ingredients.filter(i => i.inventory_id && Number(i.qty) > 0);
    if (validIngredients.length === 0) {
      toast.error('Pilih minimal 1 bahan baku yang dipakai beserta jumlahnya');
      return;
    }

    setIsLoading(true);
    const res = await recordPremixMixing({
      premix_item_id: form.premix_item_id,
      output_qty: Number(form.output_qty),
      notes: form.notes,
      ingredients: validIngredients.map(i => ({
        inventory_id: i.inventory_id,
        qty: Number(i.qty),
      })),
    });
    setIsLoading(false);

    if (res.success) {
      toast.success('Bahan baku berhasil dipotong dan stok Premix bertambah!');
      setForm({ premix_item_id: '', output_qty: '', notes: '' });
      setIngredients([{ inventory_id: '', qty: '', _id: Date.now() }]);
    } else {
      toast.error(res.error || 'Gagal menyimpan produksi premix');
    }
  };

  return (
    <div style={{ background: 'var(--bg-default)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', maxWidth: '600px' }}>
      <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 'var(--space-4)' }}>Laporan Produksi Premix</h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <FormField label="Hasil Premix (Barang Setengah Jadi)" required>
          <select
            value={form.premix_item_id}
            onChange={e => setForm({ ...form, premix_item_id: e.target.value })}
            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-default)' }}
          >
            <option value="">-- Pilih Premix --</option>
            {rawMaterials.map(rm => (
              <option key={rm.id} value={rm.id}>{rm.name}</option>
            ))}
          </select>
        </FormField>

        <FormField label="Jumlah Dihasilkan (kg)" required>
          <Input 
            type="number" step="0.1" placeholder="Misal: 50" 
            value={form.output_qty} 
            onChange={e => setForm({ ...form, output_qty: e.target.value })} 
          />
        </FormField>

        <div style={{ borderTop: '1px solid var(--border-subtle)', margin: 'var(--space-2) 0' }} />

        <div>
          <label style={{ display: 'block', fontWeight: 600, fontSize: 'var(--text-sm)', marginBottom: 'var(--space-2)' }}>Bahan Baku Yang Terpakai</label>
          
          {ingredients.map((ing, idx) => (
            <div key={ing._id} style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
              <select
                value={ing.inventory_id}
                onChange={e => handleUpdateIngredient(ing._id, 'inventory_id', e.target.value)}
                style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid var(--border-default)' }}
              >
                <option value="">-- Pilih Bahan --</option>
                {inventories.filter(i => i.item_type === 'RAW_MATERIAL').map(inv => {
                  const rm = rawMaterials.find(r => r.id === inv.item_id);
                  return (
                    <option key={inv.id} value={inv.id}>
                      {rm ? rm.name : 'Unknown'} (Sisa: {inv.quantity} {rm?.uom || ''})
                    </option>
                  );
                })}
              </select>
              <Input 
                type="number" step="0.1" placeholder="Qty" style={{ width: '100px' }}
                value={ing.qty}
                onChange={e => handleUpdateIngredient(ing._id, 'qty', e.target.value)}
              />
              <Button variant="danger" onClick={() => handleRemoveIngredient(ing._id)} style={{ padding: '0 12px' }}>
                <Trash2 size={16} />
              </Button>
            </div>
          ))}
          
          <Button variant="secondary" size="sm" onClick={handleAddIngredient} leftIcon={<Plus size={16}/>}>
            Tambah Bahan
          </Button>
        </div>

        <div style={{ borderTop: '1px solid var(--border-subtle)', margin: 'var(--space-2) 0' }} />

        <FormField label="Catatan (Opsional)">
          <Input 
            placeholder="Catatan..." 
            value={form.notes} 
            onChange={e => setForm({ ...form, notes: e.target.value })} 
          />
        </FormField>

        <Button variant="primary" onClick={handleSubmit} loading={isLoading}>
          Simpan Produksi Premix
        </Button>
      </div>
    </div>
  );
}
