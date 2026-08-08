import React from 'react';
import type { Metadata } from 'next';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import styles from './shell.module.css';

import { AuthGuard } from '@/components/auth/AuthGuard';
import '../globals.css';

export const metadata: Metadata = { title: 'Dashboard' };

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className={styles.layout}>
        <Sidebar />
        <div className={styles.main}>
          <Topbar />
          <main className={styles.content} id="main-content" tabIndex={-1}>
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
