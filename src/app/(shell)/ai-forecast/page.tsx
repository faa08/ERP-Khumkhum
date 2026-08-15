'use client';

import React from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Brain, TrendingUp, Package, Factory, AlertCircle, Sparkles } from 'lucide-react';

export default function AiForecastPage() {
  return (
    <div>
      <PageHeader
        title="Wawasan Operasional AI"
        description="Dukungan keputusan berbasis machine learning untuk perencanaan manufaktur."
        breadcrumbs={[{ label: 'Manajemen' }, { label: 'Prakiraan AI' }]}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--text-secondary)' }}>
            <Brain size={18} />
            <span style={{ fontSize: 'var(--text-sm)' }}>Model: ERP-Predictive v1.2</span>
          </div>
        }
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        
        {/* 1. Demand Forecast */}
        <Card header={<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}><TrendingUp size={18} color="var(--color-primary-600)" /> <strong style={{ color: 'var(--color-primary-700)' }}>Prakiraan Permintaan (30 Hari Kedepan)</strong></div>}>
          <p style={{ margin: 0, marginBottom: 'var(--space-4)', color: 'var(--text-secondary)' }}>
            Berdasarkan data penjualan historis dan tren musiman, ekspektasi permintaan untuk jamur kering premium diproyeksikan meningkat.
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-4)', backgroundColor: 'var(--color-neutral-50)', borderRadius: 'var(--radius-md)' }}>
            <div>
              <span style={{ display: 'block', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Prediksi Volume</span>
              <strong style={{ fontSize: '1.25rem' }}>1.250 kg</strong>
            </div>
            <div>
              <span style={{ display: 'block', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Tingkat Keyakinan</span>
              <StatusBadge status="success" label="Tinggi (89%)" />
            </div>
          </div>
        </Card>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 'var(--space-4)' }}>
          {/* 2. Production Recommendation */}
          <Card header={<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}><Factory size={18} color="var(--color-success-600)" /> <strong style={{ color: 'var(--color-success-700)' }}>Rekomendasi Produksi</strong></div>}>
             <p style={{ margin: 0, marginBottom: 'var(--space-4)', color: 'var(--text-secondary)' }}>
              Untuk memenuhi prakiraan permintaan sekaligus menjaga tingkat stok aman, target produksi berikut direkomendasikan untuk minggu ini:
            </p>
            <ul style={{ paddingLeft: 'var(--space-4)', margin: 0, color: 'var(--text-primary)' }}>
              <li>Tingkatkan hasil harian sebesar <strong>15%</strong>.</li>
              <li>Jadwalkan 2 tambahan gelombang (batch) untuk Grade Premium.</li>
            </ul>
          </Card>

          {/* 3. Material Requirement */}
          <Card header={<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}><Package size={18} color="var(--color-info-600)" /> <strong style={{ color: 'var(--color-info-700)' }}>Kebutuhan Material</strong></div>}>
             <p style={{ margin: 0, marginBottom: 'var(--space-4)', color: 'var(--text-secondary)' }}>
              Kebutuhan pengadaan untuk mendukung rekomendasi peningkatan produksi:
            </p>
            <ul style={{ paddingLeft: 'var(--space-4)', margin: 0, color: 'var(--text-primary)' }}>
              <li>Beli <strong>5.000 kg</strong> bahan baku jamur segar sebelum hari Jumat.</li>
              <li>Pesan <strong>2.000 pcs</strong> kotak kemasan standar.</li>
            </ul>
          </Card>
        </div>

        {/* 4. Operational Insight */}
        <Card header={<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}><Sparkles size={18} color="var(--color-warning-600)" /> <strong style={{ color: 'var(--color-warning-700)' }}>Wawasan Operasional</strong></div>}>
          <div style={{ display: 'flex', gap: 'var(--space-3)', padding: 'var(--space-3)', backgroundColor: 'var(--color-warning-50)', color: 'var(--color-warning-700)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-warning-200)' }}>
            <AlertCircle size={20} />
            <div>
              <strong style={{ display: 'block', marginBottom: 'var(--space-1)' }}>Terdeteksi Penurunan Rendemen</strong>
              <span style={{ fontSize: 'var(--text-sm)' }}>
                Hasil produksi dari Kelompok Tani A telah turun sebesar 4% dalam 3 gelombang terakhir. Rekomendasi: Mulai tinjauan QC untuk bahan baku yang masuk dari pemasok ini.
              </span>
            </div>
          </div>
        </Card>

      </div>
    </div>
  );
}
