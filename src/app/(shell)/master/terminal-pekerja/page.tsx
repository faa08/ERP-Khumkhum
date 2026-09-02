import React from 'react';
import { getMasterOperations, getActiveWorkerSession, getHistoricalWorkerSessions } from '@/actions/timeStudy';
import WorkerTerminal from './WorkerTerminal';
import { PageHeader } from '@/components/layout/PageHeader';

export const metadata = {
  title: 'Terminal Sesi Kerja | KhumKhum ERP',
};

export default async function TerminalPekerjaPage() {
  const [masterOperations, activeSession, historyRes] = await Promise.all([
    getMasterOperations(),
    getActiveWorkerSession(),
    getHistoricalWorkerSessions()
  ]);

  return (
    <main>
      <PageHeader 
        title="Terminal Sesi Kerja" 
        description="Sistem pencatatan waktu kehadiran dan pengerjaan (Clock In/Out) untuk semua divisi."
      />
      <div className="page-content">
        <WorkerTerminal 
          masterOperations={masterOperations.data || []} 
          initialSession={activeSession.data || null} 
          historySessions={historyRes.data || []}
        />
      </div>
    </main>
  );
}
