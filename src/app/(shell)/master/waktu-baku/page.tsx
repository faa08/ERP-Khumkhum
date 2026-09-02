import React from 'react';
import { getStandardTimes, getMasterOperations, getTimeStudyBatches } from '@/actions/timeStudy';
import StandardTimesTable from './StandardTimesTable';
import { PageHeader } from '@/components/layout/PageHeader';

export const metadata = {
  title: 'Master Waktu Baku | KhumKhum ERP',
};

export default async function WaktuBakuPage() {
  const [masterOperations, standardTimes] = await Promise.all([
    getMasterOperations(),
    getStandardTimes()
  ]);

  // Cari operasi Produksi (Penggorengan)
  const penggorenganOp = (masterOperations.data || []).find((op: any) => 
    op.operation_name.toLowerCase().includes('penggorengan')
  );

  let batches = [];
  let summary = null;

  if (penggorenganOp) {
    const batchesRes = await getTimeStudyBatches(penggorenganOp.id);
    batches = batchesRes.data || [];
    
    summary = (standardTimes.data || []).find((d: any) => d.operation_id === penggorenganOp.id);
  }

  return (
    <main>
      <PageHeader 
        title="Time Study Produksi" 
        description="Pencatatan sampel batch produksi (Penggorengan) untuk menghitung Waktu Baku (Wb) secara otomatis."
      />
      <div className="page-content">
        <StandardTimesTable 
          operation={penggorenganOp}
          batches={batches}
          summary={summary}
        />
      </div>
    </main>
  );
}
