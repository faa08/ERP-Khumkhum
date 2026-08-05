'use client';

import React from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Brain, TrendingUp, Package, Factory, AlertCircle } from 'lucide-react';
import styles from './ai-forecast.module.css';

export default function AiForecastPage() {
  return (
    <div>
      <PageHeader
        title="AI Operational Insights"
        description="Machine learning powered decision support for manufacturing planning."
        breadcrumbs={[{ label: 'Management' }, { label: 'AI Forecast' }]}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--text-secondary)' }}>
            <Brain size={18} />
            <span style={{ fontSize: 'var(--text-sm)' }}>Model: ERP-Predictive v1.2</span>
          </div>
        }
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        
        {/* 1. Demand Forecast */}
        <Card header={<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}><TrendingUp size={18} /> <strong>Demand Forecasting (Next 30 Days)</strong></div>}>
          <p style={{ margin: 0, marginBottom: 'var(--space-4)', color: 'var(--text-secondary)' }}>
            Based on historical sales data and seasonal trends, expected demand for premium dried mushrooms is projected to increase.
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-4)', backgroundColor: 'var(--color-neutral-50)', borderRadius: 'var(--radius-md)' }}>
            <div>
              <span style={{ display: 'block', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Predicted Volume</span>
              <strong style={{ fontSize: '1.25rem' }}>1,250 kg</strong>
            </div>
            <div>
              <span style={{ display: 'block', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Confidence Score</span>
              <StatusBadge status="success" label="High (89%)" />
            </div>
          </div>
        </Card>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 'var(--space-4)' }}>
          {/* 2. Production Recommendation */}
          <Card header={<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}><Factory size={18} /> <strong>Production Recommendation</strong></div>}>
             <p style={{ margin: 0, marginBottom: 'var(--space-4)', color: 'var(--text-secondary)' }}>
              To meet the forecasted demand while maintaining safety stock levels, the following production targets are recommended for this week:
            </p>
            <ul style={{ paddingLeft: 'var(--space-4)', margin: 0, color: 'var(--text-primary)' }}>
              <li>Increase daily output by <strong>15%</strong>.</li>
              <li>Schedule 2 additional batches of Premium Grade.</li>
            </ul>
          </Card>

          {/* 3. Material Requirement */}
          <Card header={<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}><Package size={18} /> <strong>Material Requirement</strong></div>}>
             <p style={{ margin: 0, marginBottom: 'var(--space-4)', color: 'var(--text-secondary)' }}>
              Procurement needs to support the recommended production increase:
            </p>
            <ul style={{ paddingLeft: 'var(--space-4)', margin: 0, color: 'var(--text-primary)' }}>
              <li>Procure <strong>5,000 kg</strong> of raw fresh mushrooms by Friday.</li>
              <li>Order <strong>2,000 pcs</strong> of standard packaging boxes.</li>
            </ul>
          </Card>
        </div>

        {/* 4. Operational Insight */}
        <Card header={<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}><AlertCircle size={18} /> <strong>Operational Insights</strong></div>}>
          <div style={{ display: 'flex', gap: 'var(--space-3)', padding: 'var(--space-3)', backgroundColor: 'var(--color-warning-50)', color: 'var(--color-warning-700)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-warning-200)' }}>
            <AlertCircle size={20} />
            <div>
              <strong style={{ display: 'block', marginBottom: 'var(--space-1)' }}>Yield Drop Detected</strong>
              <span style={{ fontSize: 'var(--text-sm)' }}>
                Production yield from Farmer Group A has dropped by 4% in the last 3 batches. Recommendation: Initiate a QC review for incoming raw materials from this supplier.
              </span>
            </div>
          </div>
        </Card>

      </div>
    </div>
  );
}
