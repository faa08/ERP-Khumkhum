'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/form/FormField';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Search, ArrowDown } from 'lucide-react';

// Mock Traceability Data linking all steps
const TRACE_MOCK_DATA = {
  batchNo: 'BATCH-2026-0805',
  farmer: {
    name: 'Petani Jamur Makmur',
    location: 'Bandung',
    date: '01 Aug 2026'
  },
  receiving: {
    id: 'RCV-001',
    grossWeight: '500 kg',
    netWeight: '480 kg',
    status: 'completed'
  },
  sorting: {
    id: 'SRT-012',
    accepted: '450 kg',
    rejected: '30 kg',
    status: 'completed'
  },
  production: {
    id: 'PRD-045',
    product: 'Dried Mushrooms Premium',
    yield: '15%',
    finishedGoods: '67.5 kg',
    status: 'completed'
  },
  qc: {
    id: 'QC-102',
    result: 'Passed',
    notes: 'Premium grade confirmed',
    status: 'passed'
  },
  inventory: {
    warehouse: 'WH-Main',
    currentStock: '67.5 kg',
    status: 'in_stock'
  },
  sales: {
    id: 'SO-992',
    customer: 'Supermarket Jaya',
    quantity: '50 kg',
    deliveryStatus: 'shipped'
  }
};

export default function TraceabilityPage() {
  const [search, setSearch] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim()) return;
    
    setIsLoading(true);
    setHasSearched(false);
    
    // Simulate API delay
    setTimeout(() => {
      setIsLoading(false);
      setHasSearched(true);
    }, 800);
  };

  return (
    <div style={{ paddingBottom: 'var(--space-8)' }}>
      <PageHeader
        title="Batch Traceability"
        description="Track a specific batch from farmer receiving to customer delivery."
        breadcrumbs={[{ label: 'Operations' }, { label: 'Traceability' }]}
      />
      
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <Card>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <FormField label="Enter Batch Number to trace (Try 'BATCH-2026-0805')">
                <Input 
                  value={search} 
                  onChange={(e) => setSearch(e.target.value)} 
                  placeholder="e.g. BATCH-2026-0805" 
                  fullWidth
                />
              </FormField>
            </div>
            <Button type="submit" variant="primary" leftIcon={<Search size={16} />} loading={isLoading}>
              Trace Batch
            </Button>
          </form>
        </Card>
      </div>

      {!hasSearched ? (
        <EmptyState 
          title="Ready to Trace"
          description="Enter a batch number above to see its complete lifecycle."
          icon={<Search size={40} />}
        />
      ) : search !== TRACE_MOCK_DATA.batchNo ? (
        <EmptyState 
          title="Batch Not Found"
          description={`No records found for batch "${search}". Please check the number and try again.`}
        />
      ) : (
        <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {/* 1. Farmer */}
          <Card header={<strong>1. Source (Farmer)</strong>}>
            <p><strong>Name:</strong> {TRACE_MOCK_DATA.farmer.name}</p>
            <p><strong>Location:</strong> {TRACE_MOCK_DATA.farmer.location}</p>
            <p><strong>Date:</strong> {TRACE_MOCK_DATA.farmer.date}</p>
          </Card>
          
          <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--text-tertiary)' }}><ArrowDown size={20} /></div>
          
          {/* 2. Receiving */}
          <Card header={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>2. Receiving</strong>
              <StatusBadge status={TRACE_MOCK_DATA.receiving.status} />
            </div>
          }>
            <p><strong>ID:</strong> {TRACE_MOCK_DATA.receiving.id}</p>
            <p><strong>Gross Weight:</strong> {TRACE_MOCK_DATA.receiving.grossWeight}</p>
            <p><strong>Net Weight:</strong> {TRACE_MOCK_DATA.receiving.netWeight}</p>
          </Card>

          <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--text-tertiary)' }}><ArrowDown size={20} /></div>

          {/* 3. Sorting */}
          <Card header={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>3. Sorting & Grading</strong>
              <StatusBadge status={TRACE_MOCK_DATA.sorting.status} />
            </div>
          }>
            <p><strong>ID:</strong> {TRACE_MOCK_DATA.sorting.id}</p>
            <p><strong>Accepted:</strong> {TRACE_MOCK_DATA.sorting.accepted}</p>
            <p><strong>Rejected:</strong> {TRACE_MOCK_DATA.sorting.rejected}</p>
          </Card>

          <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--text-tertiary)' }}><ArrowDown size={20} /></div>

          {/* 4. Production */}
          <Card header={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>4. Production</strong>
              <StatusBadge status={TRACE_MOCK_DATA.production.status} />
            </div>
          }>
            <p><strong>ID:</strong> {TRACE_MOCK_DATA.production.id}</p>
            <p><strong>Product:</strong> {TRACE_MOCK_DATA.production.product}</p>
            <p><strong>Yield:</strong> {TRACE_MOCK_DATA.production.yield}</p>
            <p><strong>Finished Goods:</strong> {TRACE_MOCK_DATA.production.finishedGoods}</p>
          </Card>

          <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--text-tertiary)' }}><ArrowDown size={20} /></div>

          {/* 5. QC */}
          <Card header={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>5. Quality Control</strong>
              <StatusBadge status={TRACE_MOCK_DATA.qc.status} />
            </div>
          }>
            <p><strong>ID:</strong> {TRACE_MOCK_DATA.qc.id}</p>
            <p><strong>Result:</strong> {TRACE_MOCK_DATA.qc.result}</p>
            <p><strong>Notes:</strong> {TRACE_MOCK_DATA.qc.notes}</p>
          </Card>

          <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--text-tertiary)' }}><ArrowDown size={20} /></div>

          {/* 6. Inventory */}
          <Card header={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>6. Inventory</strong>
              <StatusBadge status={TRACE_MOCK_DATA.inventory.status} />
            </div>
          }>
            <p><strong>Warehouse:</strong> {TRACE_MOCK_DATA.inventory.warehouse}</p>
            <p><strong>Current Stock:</strong> {TRACE_MOCK_DATA.inventory.currentStock}</p>
          </Card>

          <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--text-tertiary)' }}><ArrowDown size={20} /></div>

          {/* 7. Sales */}
          <Card header={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>7. Sales Order</strong>
              <StatusBadge status={TRACE_MOCK_DATA.sales.deliveryStatus} />
            </div>
          }>
            <p><strong>ID:</strong> {TRACE_MOCK_DATA.sales.id}</p>
            <p><strong>Customer:</strong> {TRACE_MOCK_DATA.sales.customer}</p>
            <p><strong>Quantity Ordered:</strong> {TRACE_MOCK_DATA.sales.quantity}</p>
          </Card>
        </div>
      )}
    </div>
  );
}
