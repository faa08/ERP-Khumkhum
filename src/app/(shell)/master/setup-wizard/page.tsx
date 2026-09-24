'use client';

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { CheckCircle, ChevronRight, Settings, Users, Box, Factory, ClipboardCheck, PackageCheck } from 'lucide-react';
import { Step1Warehouse } from './steps/Step1Warehouse';
import { Step2Entities } from './steps/Step2Entities';
import { Step3Items } from './steps/Step3Items';
import { Step4Bom } from './steps/Step4Bom';
import { Step5Standards } from './steps/Step5Standards';
import { Step6Inventory } from './steps/Step6Inventory';
import { useToast } from '@/hooks/useToast';

const STEPS = [
  { id: 1, title: 'Gudang & Lokasi', icon: <Settings size={20} />, description: 'Atur pabrik dan penanggung jawab' },
  { id: 2, title: 'Mitra & Pelanggan', icon: <Users size={20} />, description: 'Petani jamur dan pembeli' },
  { id: 3, title: 'Bahan & Produk', icon: <Box size={20} />, description: 'Daftar bahan baku dan produk jadi' },
  { id: 4, title: 'Resep Produksi', icon: <Factory size={20} />, description: 'Racik Bill of Materials (BOM)' },
  { id: 5, title: 'Standar Mutu (QC)', icon: <ClipboardCheck size={20} />, description: 'Suhu, Waktu, & Kriteria HACCP' },
  { id: 6, title: 'Saldo Awal', icon: <PackageCheck size={20} />, description: 'Input stok fisik saat ini' },
];

export default function SetupWizardPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const toast = useToast();

  const handleNext = () => {
    if (!completedSteps.includes(currentStep)) {
      setCompletedSteps(prev => [...prev, currentStep]);
    }
    if (currentStep < STEPS.length) {
      setCurrentStep(prev => prev + 1);
    } else {
      toast.success('Setup Master Data Selesai! Sistem ERP siap digunakan secara penuh.');
    }
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(prev => prev - 1);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <PageHeader
        title="Setup Master Data & Standar HACCP"
        description="Ikuti panduan langkah demi langkah ini untuk mengatur dasar sistem ERP Pabrik Anda. Data harus diisi berurutan."
        breadcrumbs={[{ label: 'Master Data' }, { label: 'Setup Wizard' }]}
      />

      {/* Stepper Header */}
      <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px' }}>
        {STEPS.map((step, index) => {
          const isActive = step.id === currentStep;
          const isCompleted = completedSteps.includes(step.id);
          const isLocked = !isCompleted && step.id > Math.max(1, ...completedSteps) + 1 && step.id !== 1;
          
          return (
            <div key={step.id} style={{ display: 'flex', alignItems: 'center', minWidth: 'max-content' }}>
              <div 
                onClick={() => !isLocked && setCurrentStep(step.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  padding: 'var(--space-3) var(--space-4)',
                  borderRadius: 'var(--radius-full)',
                  background: isActive ? 'var(--color-primary-600)' : isCompleted ? 'var(--color-success-50)' : 'var(--bg-subtle)',
                  color: isActive ? '#fff' : isCompleted ? 'var(--color-success-700)' : isLocked ? 'var(--text-tertiary)' : 'var(--text-primary)',
                  border: `1px solid ${isActive ? 'var(--color-primary-600)' : isCompleted ? 'var(--color-success-200)' : 'var(--border-subtle)'}`,
                  cursor: isLocked ? 'not-allowed' : 'pointer',
                  opacity: isLocked ? 0.6 : 1,
                  transition: 'all 0.2s',
                  boxShadow: isActive ? '0 4px 12px rgba(var(--color-primary-rgb), 0.2)' : 'none'
                }}
              >
                {isCompleted && !isActive ? <CheckCircle size={20} /> : step.icon}
                <div>
                  <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>Step {step.id}: {step.title}</div>
                </div>
              </div>
              {index < STEPS.length - 1 && (
                <ChevronRight size={16} color="var(--border-strong)" style={{ margin: '0 8px' }} />
              )}
            </div>
          );
        })}
      </div>

      <Card>
        <div style={{ padding: 'var(--space-2)' }}>
          {currentStep === 1 && <Step1Warehouse onComplete={handleNext} />}
          {currentStep === 2 && <Step2Entities onComplete={handleNext} onBack={handleBack} />}
          {currentStep === 3 && <Step3Items onComplete={handleNext} onBack={handleBack} />}
          {currentStep === 4 && <Step4Bom onComplete={handleNext} onBack={handleBack} />}
          {currentStep === 5 && <Step5Standards onComplete={handleNext} onBack={handleBack} />}
          {currentStep === 6 && <Step6Inventory onComplete={handleNext} onBack={handleBack} />}
        </div>
      </Card>
    </div>
  );
}
