import React from 'react';
import type { Metadata } from 'next';
import styles from './auth.module.css';
import '../globals.css';

export const metadata: Metadata = { title: 'Sign In' };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.layout}>
      <div className={styles.panel}>{children}</div>
    </div>
  );
}
