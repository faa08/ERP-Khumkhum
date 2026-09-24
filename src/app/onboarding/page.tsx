'use client';

import React from 'react';
import SetupWizardPage from '@/app/(shell)/master/setup-wizard/page';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { Package } from 'lucide-react';
import '@/app/globals.css';

export default function Onboarding() {
  return (
    <AuthGuard>
      <div style={{ 
        minHeight: '100vh', 
        background: 'var(--bg-subtle)', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center',
        padding: 'var(--space-6) var(--space-4)'
      }}>
        {/* Brand Header */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 'var(--space-3)', 
          marginBottom: 'var(--space-6)' 
        }}>
          <div style={{
            background: 'var(--color-primary-600)',
            color: '#fff',
            padding: '12px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(var(--color-primary-rgb), 0.3)'
          }}>
            <Package size={28} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
              ERP KhumKhum
            </h1>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Sistem Manajemen Produksi Cerdas
            </div>
          </div>
        </div>

        {/* Wizard Container */}
        <div style={{ 
          width: '100%', 
          maxWidth: '1100px', 
          background: 'var(--bg-default)', 
          borderRadius: 'var(--radius-xl)', 
          boxShadow: 'var(--shadow-lg)',
          padding: 'var(--space-6)',
          border: '1px solid var(--border-subtle)'
        }}>
          <SetupWizardPage />
        </div>
      </div>
    </AuthGuard>
  );
}
