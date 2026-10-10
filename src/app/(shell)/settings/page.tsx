'use client';

import React, { useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Tabs } from '@/components/ui/Tabs';
import { Card } from '@/components/ui/Card';
import { FormField } from '@/components/form/FormField';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { Save, ShieldAlert } from 'lucide-react';
import { getSettingAction, saveSettingAction } from '@/actions/settings';
import { useAuth } from '@/hooks/useAuth';

export default function SettingsPage() {
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [companyData, setCompanyData] = useState({
    companyName: '',
    taxId: '',
    companyAddress: '',
    contactEmail: '',
    contactPhone: '',
    fonnteApiKey: ''
  });

  const [maintenanceData, setMaintenanceData] = useState({
    isActive: false,
    message: ''
  });

  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const canManageMaintenance = isSuperAdmin || user?.role === 'IT_MAINTENANCE';

  // Load real data from Supabase on mount
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      const [companyRes, maintenanceRes] = await Promise.all([
        getSettingAction('company_profile'),
        getSettingAction('maintenance_mode')
      ]);
      
      if (companyRes.success && companyRes.value) {
        setCompanyData(companyRes.value);
      }
      if (maintenanceRes.success && maintenanceRes.value) {
        setMaintenanceData({
          isActive: !!maintenanceRes.value.isActive,
          message: maintenanceRes.value.message || ''
        });
      }
      setIsLoading(false);
    }
    loadData();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    let isSuccess = true;
    let errorMessage = '';

    // Menyimpan pengaturan profil perusahaan ke Supabase tabel 'settings'
    if (isSuperAdmin) {
      const res = await saveSettingAction('company_profile', companyData);
      if (!res.success) {
        isSuccess = false;
        errorMessage = res.error || 'Gagal menyimpan profil';
      }
    }
    
    if (canManageMaintenance) {
      const maintRes = await saveSettingAction('maintenance_mode', maintenanceData);
      if (!maintRes.success) {
        isSuccess = false;
        errorMessage = maintRes.error || 'Gagal menyimpan pengaturan maintenance';
      }
    }

    if (isSuccess) {
      toast.success('Pengaturan berhasil disimpan ke Database');
    } else {
      toast.error(errorMessage || 'Gagal menyimpan sebagian pengaturan');
    }
    setIsSaving(false);
  };

  const handleCompanyChange = (field: string, value: string) => {
    setCompanyData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div style={{ paddingBottom: 'var(--space-8)' }}>
      <PageHeader
        title="Pengaturan Sistem"
        description="Kelola konfigurasi sistem dan profil IKM KhumKhum Jamur Crispy."
        breadcrumbs={[{ label: 'System' }, { label: 'Settings' }]}
        actions={
          <Button variant="primary" onClick={handleSave} disabled={isSaving || isLoading} leftIcon={<Save size={16} />}>
            {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </Button>
        }
      />

      {isLoading ? (
        <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-secondary)' }}>Memuat pengaturan dari database...</div>
      ) : (
        <Tabs 
          tabs={[
            { 
              id: 'company', 
              label: 'Profil Perusahaan & API', 
              content: (
                <Card>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxWidth: '600px' }}>
                    <FormField label="Nama IKM">
                      <Input value={companyData.companyName || ''} onChange={(e) => handleCompanyChange('companyName', e.target.value)} fullWidth />
                    </FormField>
                    <FormField label="NPWP">
                      <Input value={companyData.taxId || ''} onChange={(e) => handleCompanyChange('taxId', e.target.value)} fullWidth />
                    </FormField>
                    <FormField label="Alamat Produksi">
                      <Input value={companyData.companyAddress || ''} onChange={(e) => handleCompanyChange('companyAddress', e.target.value)} fullWidth />
                    </FormField>
                    <FormField label="Email Kontak">
                      <Input value={companyData.contactEmail || ''} onChange={(e) => handleCompanyChange('contactEmail', e.target.value)} fullWidth />
                    </FormField>
                    <FormField label="Nomor Telepon">
                      <Input value={companyData.contactPhone || ''} onChange={(e) => handleCompanyChange('contactPhone', e.target.value)} fullWidth />
                    </FormField>
                    <FormField label="Fonnte API Key (WhatsApp Gateway)">
                      <Input type="password" value={companyData.fonnteApiKey || ''} onChange={(e) => handleCompanyChange('fonnteApiKey', e.target.value)} fullWidth placeholder="Token dari api.fonnte.com" />
                    </FormField>
                  </div>
                </Card>
              )
            },
            {
              id: 'units',
              label: 'Satuan & Presisi Operasional',
              content: (
                <Card>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxWidth: '600px' }}>
                    <div style={{
                      padding: 'var(--space-3)', borderRadius: 'var(--radius-md)',
                      background: 'var(--color-info-50)', border: '1px solid var(--color-info-200)',
                      fontSize: 'var(--text-sm)', color: 'var(--color-info-700)',
                    }}>
                      Seluruh pencatatan kuantitas bahan baku dan hasil produksi KhumKhum menggunakan satuan <strong>Kilogram (kg)</strong> dengan presisi minimal 2 digit desimal (akomodasi setoran mikro 2 ons / 0,20 kg).
                    </div>
                    <FormField label="Satuan Berat Standar">
                      <Input value="Kilogram (kg)" disabled fullWidth />
                    </FormField>
                    <FormField label="Presisi Desimal">
                      <Input value="2 digit (0,01 kg)" disabled fullWidth />
                    </FormField>
                    <FormField label="Berat Minimum Input">
                      <Input value="0,01 kg" disabled fullWidth />
                    </FormField>
                    <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                      Konfigurasi ini bersifat tetap sesuai standar operasional pabrik KhumKhum dan tidak dapat diubah melalui antarmuka ini.
                    </p>
                  </div>
                </Card>
              )
            },
            ...(canManageMaintenance ? [{
              id: 'maintenance',
              label: 'Maintenance Mode',
              content: (
                <Card>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxWidth: '600px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-danger-600)', marginBottom: 'var(--space-2)' }}>
                      <ShieldAlert size={20} />
                      <strong style={{ fontSize: 'var(--text-md)' }}>Akses Super Admin & IT</strong>
                    </div>
                    <div style={{
                      padding: 'var(--space-3)', borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-subtle)', border: '1px solid var(--border-color)',
                      fontSize: 'var(--text-sm)'
                    }}>
                      Aktifkan Maintenance Mode untuk mengunci akses seluruh pengguna (kecuali Super Admin). Cocok digunakan saat sedang proses perbaikan atau Stock Opname besar-besaran.
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3) 0' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={maintenanceData.isActive}
                          onChange={(e) => setMaintenanceData(prev => ({ ...prev, isActive: e.target.checked }))}
                          style={{ width: '1.25rem', height: '1.25rem', accentColor: 'var(--color-danger-600)' }}
                        />
                        <span style={{ fontWeight: 600 }}>Aktifkan Mode Maintenance</span>
                      </label>
                    </div>

                    <FormField label="Pesan Maintenance (Tampil di layar user)">
                      <Input 
                        value={maintenanceData.message} 
                        onChange={(e) => setMaintenanceData(prev => ({ ...prev, message: e.target.value }))}
                        fullWidth 
                        placeholder="Contoh: Sistem sedang dalam perbaikan rutin."
                        disabled={!maintenanceData.isActive}
                      />
                    </FormField>
                  </div>
                </Card>
              )
            }] : [])
          ]}
        />
      )}
    </div>
  );
}
