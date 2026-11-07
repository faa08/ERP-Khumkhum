import React from 'react';
import type { Metadata } from 'next';
import { Baloo_2, Plus_Jakarta_Sans } from 'next/font/google';

const baloo2 = Baloo_2({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-baloo2',
  display: 'swap',
});

const jakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-jakarta',
  display: 'swap',
});


import { AuthProvider } from '@/contexts/AuthContext';
import { SidebarProvider } from '@/contexts/SidebarContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { ToastContainer } from '@/components/ui/Toast';
import { APP_NAME, COMPANY_NAME } from '@/lib/constants';



export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: {
    template: `%s | ${APP_NAME}`,
    default: APP_NAME,
  },
  description: `${COMPANY_NAME} Enterprise Resource Planning System`,
  robots: { index: false, follow: false },
  icons: {
    icon: [
      { url: '/khumkhum-logo.jpg' },
      { url: '/khumkhum-logo.jpg', sizes: '32x32' },
      { url: '/khumkhum-logo.jpg', sizes: '16x16' },
    ],
    shortcut: '/khumkhum-logo.jpg',
    apple: [
      { url: '/khumkhum-logo.jpg', sizes: '180x180' },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" className={`${baloo2.variable} ${jakartaSans.variable}`}>
      <head>
        <link rel="icon" href="/khumkhum-logo.jpg" type="image/jpeg" />
        <link rel="apple-touch-icon" href="/khumkhum-logo.jpg" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&display=swap" rel="stylesheet" />
      </head>
      <body suppressHydrationWarning>
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
