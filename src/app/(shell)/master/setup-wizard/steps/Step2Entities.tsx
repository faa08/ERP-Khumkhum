import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/hooks/useToast';
import { createFarmer, createCustomer } from '@/actions/master';
import { Plus, Trash2 } from 'lucide-react';

interface Step2Props {
  onComplete: () => void;
  onBack: () => void;
}

export function Step2Entities({ onComplete, onBack }: Step2Props) {
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const [farmers, setFarmers] = useState([{ name: '', phone_number: '', farmer_type: 'SEKITAR' }]);
  const [customers, setCustomers] = useState([{ name: '', contact: '', address: '' }]);

  const addFarmer = () => setFarmers([...farmers, { name: '', phone_number: '', farmer_type: 'SEKITAR' }]);
  const removeFarmer = (idx: number) => setFarmers(farmers.filter((_, i) => i !== idx));

  const addCustomer = () => setCustomers([...customers, { name: '', contact: '', address: '' }]);
  const removeCustomer = (idx: number) => setCustomers(customers.filter((_, i) => i !== idx));

  const handleSave = async () => {
    // Filter empty rows
    const validFarmers = farmers.filter(f => f.name.trim() !== '');
    const validCustomers = customers.filter(c => c.name.trim() !== '');

    if (validFarmers.length === 0 && validCustomers.length === 0) {
      toast.error('Harap masukkan minimal 1 Petani atau 1 Pelanggan.');
      return;
    }

    setLoading(true);
    try {
      // Save Farmers
      for (const f of validFarmers) {
        const res = await createFarmer(f as any);
        if (!res.success) throw new Error(`Gagal menyimpan petani ${f.name}: ${res.error}`);
      }

      // Save Customers
      for (const c of validCustomers) {
        const res = await createCustomer(c);
        if (!res.success) throw new Error(`Gagal menyimpan pelanggan ${c.name}: ${res.error}`);
      }

      toast.success('Data Petani & Pelanggan berhasil disimpan!');
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
        Langkah 2: Entitas Eksternal (Petani & Pelanggan)
      </h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-4)' }}>
        Masukkan daftar orang/mitra yang menyuplai bahan baku dan membeli produk Anda. Anda bisa mengetik langsung seperti di Excel dan menambah baris baru.
      </p>

      <Card header={<div style={{ fontWeight: 600 }}>Daftar Petani / Supplier Jamur</div>}>
        <div style={{ overflowX: 'auto', marginTop: 'var(--space-2)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
            <thead>
              <tr style={{ background: 'var(--bg-subtle)', textAlign: 'left' }}>
                <th style={{ padding: '8px', borderBottom: '1px solid var(--border-default)' }}>Nama Petani</th>
                <th style={{ padding: '8px', borderBottom: '1px solid var(--border-default)' }}>No WhatsApp</th>
                <th style={{ padding: '8px', borderBottom: '1px solid var(--border-default)' }}>Tipe Petani</th>
                <th style={{ padding: '8px', borderBottom: '1px solid var(--border-default)' }}></th>
              </tr>
            </thead>
            <tbody>
              {farmers.map((farmer, idx) => (
                <tr key={idx}>
                  <td style={{ padding: '4px' }}>
                    <Input 
                      placeholder="Nama Petani" 
                      value={farmer.name}
                      onChange={(e) => {
                        const newF = [...farmers];
                        newF[idx].name = e.target.value;
                        setFarmers(newF);
                      }}
                      style={{ padding: '6px' }}
                    />
                  </td>
                  <td style={{ padding: '4px' }}>
                    <Input 
                      placeholder="08..." 
                      value={farmer.phone_number}
                      onChange={(e) => {
                        const newF = [...farmers];
                        newF[idx].phone_number = e.target.value;
                        setFarmers(newF);
                      }}
                      style={{ padding: '6px' }}
                    />
                  </td>
                  <td style={{ padding: '4px' }}>
                    <select 
                      value={farmer.farmer_type}
                      onChange={(e) => {
                        const newF = [...farmers];
                        newF[idx].farmer_type = e.target.value as any;
                        setFarmers(newF);
                      }}
                      style={{ padding: '6px', width: '100%', border: '1px solid var(--border-default)', borderRadius: '4px' }}
                    >
                      <option value="SEKITAR">Sekitar</option>
                      <option value="MITRA_BESAR">Mitra Besar</option>
                    </select>
                  </td>
                  <td style={{ padding: '4px', textAlign: 'center' }}>
                    <Button variant="ghost" size="sm" onClick={() => removeFarmer(idx)} disabled={farmers.length === 1}>
                      <Trash2 size={16} color="var(--color-danger-500)" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Button variant="ghost" size="sm" onClick={addFarmer} leftIcon={<Plus size={16} />} style={{ marginTop: '8px' }}>
            Tambah Baris Petani
          </Button>
        </div>
      </Card>

      <Card header={<div style={{ fontWeight: 600 }}>Daftar Pelanggan / Buyer</div>}>
        <div style={{ overflowX: 'auto', marginTop: 'var(--space-2)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
            <thead>
              <tr style={{ background: 'var(--bg-subtle)', textAlign: 'left' }}>
                <th style={{ padding: '8px', borderBottom: '1px solid var(--border-default)' }}>Nama Pelanggan / Toko</th>
                <th style={{ padding: '8px', borderBottom: '1px solid var(--border-default)' }}>Kontak (Opsional)</th>
                <th style={{ padding: '8px', borderBottom: '1px solid var(--border-default)' }}>Alamat (Opsional)</th>
                <th style={{ padding: '8px', borderBottom: '1px solid var(--border-default)' }}></th>
              </tr>
            </thead>
            <tbody>
              {customers.map((cust, idx) => (
                <tr key={idx}>
                  <td style={{ padding: '4px' }}>
                    <Input 
                      placeholder="Nama Toko/Pembeli" 
                      value={cust.name}
                      onChange={(e) => {
                        const newC = [...customers];
                        newC[idx].name = e.target.value;
                        setCustomers(newC);
                      }}
                      style={{ padding: '6px' }}
                    />
                  </td>
                  <td style={{ padding: '4px' }}>
                    <Input 
                      placeholder="No HP / PIC" 
                      value={cust.contact}
                      onChange={(e) => {
                        const newC = [...customers];
                        newC[idx].contact = e.target.value;
                        setCustomers(newC);
                      }}
                      style={{ padding: '6px' }}
                    />
                  </td>
                  <td style={{ padding: '4px' }}>
                    <Input 
                      placeholder="Alamat" 
                      value={cust.address}
                      onChange={(e) => {
                        const newC = [...customers];
                        newC[idx].address = e.target.value;
                        setCustomers(newC);
                      }}
                      style={{ padding: '6px' }}
                    />
                  </td>
                  <td style={{ padding: '4px', textAlign: 'center' }}>
                    <Button variant="ghost" size="sm" onClick={() => removeCustomer(idx)} disabled={customers.length === 1}>
                      <Trash2 size={16} color="var(--color-danger-500)" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Button variant="ghost" size="sm" onClick={addCustomer} leftIcon={<Plus size={16} />} style={{ marginTop: '8px' }}>
            Tambah Baris Pelanggan
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
