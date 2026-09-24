'use client';

import React from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/PageHeader';
import { Users, Tractor, Box, Package, Warehouse, Contact, Settings, FileCheck, ClipboardList, Clock, Activity } from 'lucide-react';
import { Card } from '@/components/ui/Card';

const MASTER_DATA_GROUPS = [
  {
    title: 'Entitas & Mitra',
    description: 'Kelola data individu atau perusahaan yang bekerja sama dengan pabrik.',
    items: [
      { id: 'farmers', label: 'Petani Mitra', icon: <Tractor size={24} />, href: '/master/farmers', color: 'var(--color-primary-600)', desc: 'Supplier jamur mentah' },
      { id: 'customers', label: 'Pelanggan', icon: <Users size={24} />, href: '/master/customers', color: 'var(--color-success-600)', desc: 'Pembeli produk jadi' },
    ]
  },
  {
    title: 'Gudang & Item',
    description: 'Kelola fisik barang dan tempat penyimpanannya.',
    items: [
      { id: 'raw-materials', label: 'Bahan Baku', icon: <Box size={24} />, href: '/master/raw-materials', color: 'var(--color-warning-600)', desc: 'Material dasar produksi' },
      { id: 'products', label: 'Produk Jadi', icon: <Package size={24} />, href: '/master/products', color: 'var(--color-danger-600)', desc: 'Barang siap jual' },
      { id: 'warehouses', label: 'Gudang', icon: <Warehouse size={24} />, href: '/master/warehouses', color: 'var(--color-neutral-600)', desc: 'Lokasi penyimpanan' },
      { id: 'warehouse-pics', label: 'PIC Gudang', icon: <Contact size={24} />, href: '/master/warehouse-pics', color: 'var(--color-neutral-500)', desc: 'Penanggung jawab' },
    ]
  },
  {
    title: 'Standar Mutu (HACCP) & Produksi',
    description: 'Parameter, resep, dan kriteria kualitas operasional.',
    items: [
      { id: 'prod-stds', label: 'Standar Produksi', icon: <Settings size={24} />, href: '/master/production-standards', color: 'var(--color-primary-500)', desc: 'Suhu, Waktu, & Resep (BOM)' },
      { id: 'sort-stds', label: 'Standar Sortasi', icon: <Activity size={24} />, href: '/master/sorting-standards', color: 'var(--color-primary-500)', desc: 'Grade & Waste' },
      { id: 'qc-stds', label: 'Standar QC', icon: <FileCheck size={24} />, href: '/master/qc-standards', color: 'var(--color-danger-500)', desc: 'Kriteria Reject & Cacat' },
      { id: 'waktu-baku', label: 'Waktu Baku', icon: <Clock size={24} />, href: '/master/waktu-baku', color: 'var(--color-warning-500)', desc: 'Target OEE & Waktu Kerja' },
      { id: 'terminal-pekerja', label: 'Sesi Pekerja', icon: <ClipboardList size={24} />, href: '/master/terminal-pekerja', color: 'var(--color-success-500)', desc: 'Terminal pencatatan absen' },
    ]
  }
];

export default function MasterDataHubPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <PageHeader
        title="Pusat Master Data"
        description="Pilih salah satu kartu di bawah ini untuk mengelola data satuan secara spesifik."
        breadcrumbs={[{ label: 'Data Induk' }, { label: 'Pusat Master Data' }]}
      />

      {MASTER_DATA_GROUPS.map((group, idx) => (
        <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{group.title}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>{group.description}</p>
          </div>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', 
            gap: 'var(--space-4)' 
          }}>
            {group.items.map((item) => (
              <Link key={item.id} href={item.href} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ height: '100%', cursor: 'pointer', transition: 'all 0.2s ease-in-out' }}>
                  <Card className="hover:shadow-md hover:border-primary-300">
                    <div style={{ padding: 'var(--space-4)', display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
                    <div style={{ 
                      padding: 'var(--space-3)', 
                      borderRadius: 'var(--radius-md)', 
                      background: 'var(--bg-subtle)',
                      color: item.color
                    }}>
                      {item.icon}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>{item.label}</div>
                      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        {item.desc}
                      </div>
                    </div>
                  </div>
                </Card>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}

      <div style={{ 
        marginTop: 'var(--space-4)', 
        padding: 'var(--space-4)', 
        background: 'var(--color-primary-50)', 
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-primary-200)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div>
          <h4 style={{ fontWeight: 600, color: 'var(--color-primary-900)' }}>Pabrik Baru Buka?</h4>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-primary-700)', marginTop: '4px' }}>
            Jangan isi data satu per satu dari sini. Gunakan Setup Wizard untuk inisialisasi massal yang lebih cepat.
          </p>
        </div>
        <Link href="/master/setup-wizard" style={{ textDecoration: 'none' }}>
          <button style={{
            padding: '8px 16px',
            background: 'var(--color-primary-600)',
            color: 'white',
            borderRadius: 'var(--radius-md)',
            fontWeight: 500,
            cursor: 'pointer',
            border: 'none'
          }}>
            Buka Setup Wizard
          </button>
        </Link>
      </div>
    </div>
  );
}
