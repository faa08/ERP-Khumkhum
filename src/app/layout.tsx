import React from 'react';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/contexts/AuthContext';
import { SidebarProvider } from '@/contexts/SidebarContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { ToastContainer } from '@/components/ui/Toast';
import { APP_NAME, COMPANY_NAME } from '@/lib/constants';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    template: `%s | ${APP_NAME}`,
    default: APP_NAME,
  },
  description: `${COMPANY_NAME} Enterprise Resource Planning System`,
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" className={inter.variable}>
      <body>
        <AuthProvider>
          <SidebarProvider>
            <ToastProvider>
              {children}
              <ToastContainer />
            </ToastProvider>
          </SidebarProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
