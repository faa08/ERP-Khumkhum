'use client';

import React from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { PremixMixingForm } from '@/components/production/PremixMixingForm';

export default function PremixProductionPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <PageHeader
        title="Stasiun Peracikan Tepung Premix (Level 1)"
        description="Pencatatan produksi tepung pelapis krispi KhumKhum dengan takaran bahan baku mentah fleksibel dan sinkronisasi stok gudang real-time."
        breadcrumbs={[{ label: 'Manufaktur' }, { label: 'Produksi' }, { label: 'Peracikan Premix' }]}
      />

      <PremixMixingForm />
    </div>
  );
}
