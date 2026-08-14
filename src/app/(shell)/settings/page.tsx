'use client';

import React, { useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Tabs } from '@/components/ui/Tabs';
import { Card } from '@/components/ui/Card';
import { FormField } from '@/components/form/FormField';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { Save } from 'lucide-react';
import { getSettingAction, saveSettingAction } from '@/actions/settings';

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

  // Load real data from Supabase on mount
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      const res = await getSettingAction('company_profile');
      if (res.success && res.value) {
        setCompanyData(res.value);
      }
      setIsLoading(false);
    }
    loadData();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    // Menyimpan pengaturan profil perusahaan ke Supabase tabel 'settings'
    const res = await saveSettingAction('company_profile', companyData);
    if (res.success) {
      toast.success('Pengaturan berhasil disimpan ke Database');
    } else {
      toast.error(res.error || 'Gagal menyimpan pengaturan');
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
            }
          ]}
        />
      )}
    </div>
  );
}
