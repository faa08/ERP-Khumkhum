import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/hooks/useToast';
import { 
  getProductionStandards, 
  saveProductionStandards, 
  getQcStandards, 
  saveQcStandards 
} from '@/actions/standards';

interface Step5Props {
  onComplete: () => void;
  onBack: () => void;
}

export function Step5Standards({ onComplete, onBack }: Step5Props) {
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const [prodStd, setProdStd] = useState<any>(null);
  const [qcStd, setQcStd] = useState<any>(null);

  useEffect(() => {
    async function fetchData() {
      const pRes = await getProductionStandards();
      if (pRes.success && pRes.data) setProdStd(pRes.data);

      const qRes = await getQcStandards();
      if (qRes.success && qRes.data) setQcStd(qRes.data);
    }
    fetchData();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      if (prodStd) {
        const pRes = await saveProductionStandards(prodStd);
        if (!pRes.success) throw new Error(pRes.error);
      }
      if (qcStd) {
        const qRes = await saveQcStandards(qcStd);
        if (!qRes.success) throw new Error(qRes.error);
      }

      toast.success('Standar Produksi & HACCP berhasil disimpan!');
      onComplete();
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan saat menyimpan standar');
    } finally {
      setLoading(false);
    }
  };

  if (!prodStd || !qcStd) return <div style={{ padding: '20px' }}>Memuat standar bawaan...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 'var(--space-2)' }}>
        Langkah 5: Standar Mutu (HACCP) & Produksi
      </h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-4)' }}>
        Tentukan parameter kritis (Critical Control Points) untuk operasional harian. Angka ini akan memicu peringatan (merah/kuning/hijau) di Dashboard Produksi.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }}>
        <Card header={<div style={{ fontWeight: 600, color: 'var(--color-primary-700)' }}>1. Parameter Suhu & Waktu (Produksi)</div>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginTop: 'var(--space-2)' }}>
            <div>
              <label style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Suhu Minyak Penggorengan (°C)</label>
              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <Input 
                  type="number" placeholder="Min" value={prodStd.oil_temp_min} 
                  onChange={e => setProdStd({ ...prodStd, oil_temp_min: parseInt(e.target.value) || 0 })} 
                />
                <span style={{ alignSelf: 'center' }}>-</span>
                <Input 
                  type="number" placeholder="Max" value={prodStd.oil_temp_max} 
                  onChange={e => setProdStd({ ...prodStd, oil_temp_max: parseInt(e.target.value) || 0 })} 
                />
              </div>
            </div>
            
            <div>
              <label style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Target Rendemen (Yield %)</label>
              <Input 
                type="number" step="0.1" value={prodStd.min_yield_percentage} 
                onChange={e => setProdStd({ ...prodStd, min_yield_percentage: parseFloat(e.target.value) || 0 })} 
                style={{ marginTop: '4px' }}
              />
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>Persentase minimum jamur matang dari jamur mentah.</div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Durasi Goreng (Menit)</label>
                <Input 
                  type="number" value={prodStd.frying_duration_minutes} 
                  onChange={e => setProdStd({ ...prodStd, frying_duration_minutes: parseInt(e.target.value) || 0 })} 
                  style={{ marginTop: '4px' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Durasi Spinner (Menit)</label>
                <Input 
                  type="number" value={prodStd.spinning_duration_minutes} 
                  onChange={e => setProdStd({ ...prodStd, spinning_duration_minutes: parseInt(e.target.value) || 0 })} 
                  style={{ marginTop: '4px' }}
                />
              </div>
            </div>
          </div>
        </Card>

        <Card header={<div style={{ fontWeight: 600, color: 'var(--color-danger-600)' }}>2. Parameter Cacat & Inspeksi (QC)</div>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginTop: 'var(--space-2)' }}>
            <div>
              <label style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Batas Maksimal Barang Cacat (Reject %)</label>
              <Input 
                type="number" step="0.1" value={qcStd.max_defect_rate} 
                onChange={e => setQcStd({ ...qcStd, max_defect_rate: parseFloat(e.target.value) || 0 })} 
                style={{ marginTop: '4px' }}
              />
            </div>
            
            <div>
              <label style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Kadar Air Maksimal (%)</label>
              <Input 
                type="number" step="0.1" value={qcStd.max_moisture_percentage} 
                onChange={e => setQcStd({ ...qcStd, max_moisture_percentage: parseFloat(e.target.value) || 0 })} 
                style={{ marginTop: '4px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Jumlah Minimum Sampel QC (Bungkus)</label>
              <Input 
                type="number" value={qcStd.min_sample_size} 
                onChange={e => setQcStd({ ...qcStd, min_sample_size: parseInt(e.target.value) || 0 })} 
                style={{ marginTop: '4px' }}
              />
            </div>
          </div>
        </Card>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-4)' }}>
        <Button variant="secondary" onClick={onBack} disabled={loading}>Kembali</Button>
        <Button variant="primary" onClick={handleSave} loading={loading}>
          Simpan Standar & Lanjutkan
        </Button>
      </div>
    </div>
  );
}
