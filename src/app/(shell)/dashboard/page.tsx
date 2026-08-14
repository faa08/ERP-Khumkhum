'use client';

import React from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Tabs } from '@/components/ui/Tabs';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Factory, Package, ShieldCheck, ShoppingCart, TrendingUp, AlertTriangle } from 'lucide-react';
import styles from './dashboard.module.css';

export default function DashboardPage() {
  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of KhumKhum manufacturing operations."
        breadcrumbs={[{ label: 'Dashboard' }]}
      />

      <Tabs 
        tabs={[
          { id: 'executive', label: 'Executive Overview', content: <ExecutiveDashboard /> },
          { id: 'operational', label: 'Daily Operations', content: <OperationalDashboard /> }
        ]} 
      />
    </div>
  );
}

// ─────────────────────────────────────────────
// EXECUTIVE DASHBOARD
// ─────────────────────────────────────────────
function ExecutiveDashboard() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', marginTop: 'var(--space-6)' }}>
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-4)' }}>
        <KpiCard title="Total Produksi" value="1,250 kg" icon={<Factory size={24} />} trend="+5.2%" trendPositive />
        <KpiCard title="Bahan Baku Diterima" value="3,400 kg" icon={<Package size={24} />} trend="+12%" trendPositive />
        <KpiCard title="Tingkat Kelulusan Kualitas" value="98.5%" icon={<ShieldCheck size={24} />} trend="-0.5%" trendPositive={false} />
        <KpiCard title="Ringkasan Penjualan" value="Rp 450M" icon={<TrendingUp size={24} />} trend="+8.4%" trendPositive />
      </div>

      {/* Charts / Summaries */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 'var(--space-4)' }}>
        <div style={{ minHeight: '300px', display: 'flex' }}>
          <Card header={<strong>Production Efficiency</strong>} className="flex-1">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-tertiary)' }}>
              [ Efficiency Graph Placeholder ]
            </div>
          </Card>
        </div>
        
        <div style={{ minHeight: '300px', display: 'flex' }}>
          <Card header={<strong>Warehouse Overview</strong>} className="flex-1">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>WH-Main (Raw Material)</span>
                <strong>75% Capacity</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>WH-Prod (WIP)</span>
                <strong>40% Capacity</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>WH-Out (Finished Goods)</span>
                <strong>85% Capacity</strong>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// OPERATIONAL DASHBOARD
// ─────────────────────────────────────────────
function OperationalDashboard() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 'var(--space-4)', marginTop: 'var(--space-6)' }}>
      
      <Card header={<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}><Factory size={18} /> <strong>Active Production Orders</strong></div>}>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <li style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ margin: 0, fontWeight: 500 }}>PRD-045 - Dried Mushrooms</p>
              <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Target: 500kg</p>
            </div>
            <StatusBadge status="in_progress" />
          </li>
          <li style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ margin: 0, fontWeight: 500 }}>PRD-046 - Mushroom Powder</p>
              <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Target: 200kg</p>
            </div>
            <StatusBadge status="planned" />
          </li>
        </ul>
      </Card>

      <Card header={<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}><AlertTriangle size={18} /> <strong>Pending Actions</strong></div>}>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <li style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>3 Batches waiting for Sorting</span>
            <StatusBadge status="pending" />
          </li>
          <li style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>5 Lots waiting for Quality Control</span>
            <StatusBadge status="pending" />
          </li>
        </ul>
      </Card>

      <Card header={<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}><Package size={18} /> <strong>Low Stock Alerts</strong></div>}>
         <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <li style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Packaging Box A</span>
            <StatusBadge status="low_stock" />
          </li>
          <li style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Silica Gel Packets</span>
            <StatusBadge status="low_stock" />
          </li>
        </ul>
      </Card>

      <Card header={<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}><ShoppingCart size={18} /> <strong>Today's Shipments</strong></div>}>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <li style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ margin: 0, fontWeight: 500 }}>SO-992 - Supermarket Jaya</p>
            </div>
            <StatusBadge status="shipped" />
          </li>
        </ul>
      </Card>
      
    </div>
  );
}

// ─────────────────────────────────────────────
// KPI WIDGET COMPONENT
// ─────────────────────────────────────────────
function KpiCard({ title, value, icon, trend, trendPositive }: { title: string, value: string, icon: React.ReactNode, trend: string, trendPositive: boolean }) {
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{title}</p>
          <p style={{ margin: 'var(--space-1) 0', fontSize: '1.5rem', fontWeight: 600 }}>{value}</p>
        </div>
        <div style={{ color: 'var(--color-primary-600)', backgroundColor: 'var(--color-primary-50)', padding: 'var(--space-2)', borderRadius: 'var(--radius-md)' }}>
          {icon}
        </div>
      </div>
      <div style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>
        <span style={{ color: trendPositive ? 'var(--color-success-600)' : 'var(--color-danger-600)', fontWeight: 500 }}>{trend}</span>
        <span style={{ color: 'var(--text-secondary)' }}> vs last month</span>
      </div>
    </Card>
  );
}
