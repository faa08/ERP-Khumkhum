import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/form/FormField';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/hooks/useToast';
import { createWarehousePic, createWarehouse } from '@/actions/master';
import { getSettingAction, saveSettingAction } from '@/actions/settings';

interface Step1Props {
  onComplete: () => void;
}

export function Step1Warehouse({ onComplete }: Step1Props) {
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const [picName, setPicName] = useState('');
  const [picPhone, setPicPhone] = useState('');
  const [warehouseName, setWarehouseName] = useState('');
  const [warehouseLocation, setWarehouseLocation] = useState('');

  // Default IKM settings
  const defaultUom = 'kg';
  const defaultPrecision = '2';

  const handleSave = async () => {
    if (!picName || !picPhone || !warehouseName || !warehouseLocation) {
      toast.error('Harap lengkapi semua data wajib (PIC dan Gudang).');
      return;
    }
    
    setLoading(true);
    try {
      // 1. Save Settings
      await saveSettingAction('general_settings', {
        default_weight_uom: defaultUom,
        decimal_precision: parseInt(defaultPrecision),
        min_weight_step: 0.01
      });

      // 2. Create PIC
      const picRes = await createWarehousePic({
        name: picName,
        phone_number: picPhone
      });
      
      if (!picRes.success || !picRes.data) {
        throw new Error(picRes.error || 'Gagal menyimpan PIC');
      }

      // 3. Create Warehouse
      const whRes = await createWarehouse({
        name: warehouseName,
        location: warehouseLocation,
        pic_id: picRes.data.id
      });

      if (!whRes.success) {
        throw new Error(whRes.error || 'Gagal menyimpan Gudang');
      }

      toast.success('Pengaturan dasar dan gudang berhasil disimpan!');
      onComplete();
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 'var(--space-2)' }}>
        Langkah 1: Setup Dasar & Gudang Utama
      </h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-4)' }}>
        Pabrik IKM membutuhkan minimal satu titik lokasi (Gudang) untuk menampung bahan baku jamur dan produk akhir. Siapa yang bertanggung jawab di sana?
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }}>
        <Card header={<div style={{ fontWeight: 600 }}>1. Penanggung Jawab (PIC)</div>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginTop: 'var(--space-2)' }}>
            <FormField label="Nama Lengkap PIC" required>
              <Input 
                placeholder="Contoh: Pak Budi" 
                value={picName} 
                onChange={(e) => setPicName(e.target.value)} 
              />
            </FormField>
            <FormField label="No. WhatsApp (Untuk Notifikasi)" required>
              <Input 
                placeholder="Contoh: 08123456789" 
                value={picPhone} 
                onChange={(e) => setPicPhone(e.target.value)} 
              />
            </FormField>
          </div>
        </Card>

        <Card header={<div style={{ fontWeight: 600 }}>2. Informasi Gudang</div>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginTop: 'var(--space-2)' }}>
            <FormField label="Nama Gudang" required>
              <Input 
                placeholder="Contoh: Gudang Utama KhumKhum" 
                value={warehouseName} 
                onChange={(e) => setWarehouseName(e.target.value)} 
              />
            </FormField>
            <FormField label="Alamat / Lokasi" required>
              <Input 
                placeholder="Contoh: Area Produksi Lantai 1" 
                value={warehouseLocation} 
                onChange={(e) => setWarehouseLocation(e.target.value)} 
              />
            </FormField>
          </div>
        </Card>
      </div>

      <div style={{ padding: 'var(--space-3)', background: 'var(--color-primary-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-primary-200)', marginTop: 'var(--space-2)' }}>
        <strong>Sistem Otomatis:</strong> Satuan berat standar sistem telah disetel ke <strong>Kilogram (Kg)</strong> dengan presisi 2 desimal (0.00 kg) sesuai standar Food Safety/HACCP untuk akurasi resep.
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-4)' }}>
        <Button variant="primary" onClick={handleSave} loading={loading}>
          Simpan & Lanjutkan
        </Button>
      </div>
    </div>
  );
}
