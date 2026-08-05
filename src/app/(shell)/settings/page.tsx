'use client';

import React from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Tabs } from '@/components/ui/Tabs';
import { Card } from '@/components/ui/Card';
import { FormField } from '@/components/form/FormField';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/hooks/useToast';
import { Save } from 'lucide-react';

export default function SettingsPage() {
  const toast = useToast();

  const handleSave = () => {
    toast.success('Settings saved successfully');
  };

  return (
    <div style={{ paddingBottom: 'var(--space-8)' }}>
      <PageHeader
        title="General Settings"
        description="Manage system configurations and application preferences."
        breadcrumbs={[{ label: 'System' }, { label: 'Settings' }]}
        actions={<Button variant="primary" onClick={handleSave} leftIcon={<Save size={16} />}>Save Changes</Button>}
      />

      <Tabs 
        tabs={[
          { id: 'company', label: 'Company Profile', content: <CompanyProfile /> },
          { id: 'general', label: 'General Config', content: <GeneralConfig /> },
          { id: 'production', label: 'Production Config', content: <ProductionConfig /> },
          { id: 'qc', label: 'QC Config', content: <QcConfig /> },
          { id: 'warehouse', label: 'Warehouse Config', content: <WarehouseConfig /> },
          { id: 'preferences', label: 'App Preferences', content: <AppPreferences /> },
        ]}
      />
    </div>
  );
}

function CompanyProfile() {
  return (
    <Card><div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxWidth: '600px' }}>
      <FormField label="Company Name"><Input defaultValue="KhumKhum Manufacturing" fullWidth /></FormField>
      <FormField label="Tax ID (NPWP)"><Input defaultValue="12.345.678.9-000.000" fullWidth /></FormField>
      <FormField label="Company Address"><Input defaultValue="Jl. Raya Industri No. 1, Bandung" fullWidth /></FormField>
      <FormField label="Contact Email"><Input defaultValue="info@khumkhum.co.id" fullWidth /></FormField>
      <FormField label="Contact Phone"><Input defaultValue="+62 22 1234567" fullWidth /></FormField>
    </div></Card>
  );
}

function GeneralConfig() {
  return (
    <Card><div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxWidth: '600px' }}>
      <FormField label="System Timezone">
        <Select value="asia_jakarta" onChange={() => {}} options={[{ value: 'asia_jakarta', label: 'Asia/Jakarta (GMT+7)' }]} fullWidth />
      </FormField>
      <FormField label="Currency Symbol"><Input defaultValue="Rp" fullWidth /></FormField>
      <FormField label="Date Format">
        <Select value="ddmmyyyy" onChange={() => {}} options={[{ value: 'ddmmyyyy', label: 'DD/MM/YYYY' }]} fullWidth />
      </FormField>
    </div></Card>
  );
}

function ProductionConfig() {
  return (
    <Card><div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxWidth: '600px' }}>
      <FormField label="Default Shift Hours"><Input type="number" defaultValue="8" fullWidth /></FormField>
      <FormField label="Auto-generate Batch Numbers">
        <Select value="yes" onChange={() => {}} options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No (Manual entry)' }]} fullWidth />
      </FormField>
      <FormField label="Production Target Alert Threshold (%)"><Input type="number" defaultValue="10" fullWidth /></FormField>
    </div></Card>
  );
}

function QcConfig() {
  return (
    <Card><div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxWidth: '600px' }}>
      <FormField label="Strict QC Mode (Block production on fail)">
        <Select value="yes" onChange={() => {}} options={[{ value: 'yes', label: 'Enabled' }, { value: 'no', label: 'Disabled' }]} fullWidth />
      </FormField>
      <FormField label="Default Sampling Rate (%)"><Input type="number" defaultValue="5" fullWidth /></FormField>
    </div></Card>
  );
}

function WarehouseConfig() {
  return (
    <Card><div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxWidth: '600px' }}>
      <FormField label="Default Receiving Warehouse">
        <Select value="wh_main" onChange={() => {}} options={[{ value: 'wh_main', label: 'WH-Main (Raw Material)' }]} fullWidth />
      </FormField>
      <FormField label="Low Stock Alert Threshold">
        <Select value="20" onChange={() => {}} options={[{ value: '20', label: '20% of Capacity' }, { value: '10', label: '10% of Capacity' }]} fullWidth />
      </FormField>
    </div></Card>
  );
}

function AppPreferences() {
  return (
    <Card><div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxWidth: '600px' }}>
      <FormField label="Theme">
        <Select value="light" onChange={() => {}} options={[{ value: 'light', label: 'Light Mode' }, { value: 'dark', label: 'Dark Mode' }, { value: 'system', label: 'System Default' }]} fullWidth />
      </FormField>
      <FormField label="Sidebar Default State">
        <Select value="expanded" onChange={() => {}} options={[{ value: 'expanded', label: 'Expanded' }, { value: 'collapsed', label: 'Collapsed' }]} fullWidth />
      </FormField>
      <FormField label="Notification Sound">
        <Select value="on" onChange={() => {}} options={[{ value: 'on', label: 'On' }, { value: 'off', label: 'Off' }]} fullWidth />
      </FormField>
    </div></Card>
  );
}
