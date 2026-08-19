import React from 'react';
import type { Metadata } from 'next';
import styles from './auth.module.css';
import '../globals.css';

export const metadata: Metadata = {
  title: 'Masuk — KhumKhum ERP Agroindustri Jamur',
  description: 'Sistem ERP Terintegrasi KhumKhum: Manajemen Rantai Pasok, Produksi, & Pengendalian Mutu Jamur Crispy',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.layout}>
      {/* Left Login Form Panel */}
      <main className={styles.panel}>
        {children}
      </main>

      {/* Right Visual Hero Showcase (Clean & Simple Landing Theme) */}
      <aside className={styles.visual} aria-label="KhumKhum Agroindustry Showcase">
        <div className={styles.visualPattern} />
        <div className={styles.visualCard}>
          {/* Eyebrow */}
          <span className={styles.eyebrow}>Oleh-oleh Khas Kulon Progo</span>

          {/* Headline */}
          <h2 className={styles.heroTitle}>
            Kriuk yang bikin <span className={styles.heroHighlight}>nagih</span>, dari jamur tiram pilihan.
          </h2>

          <p className={styles.heroDesc}>
            KhumKhum Jamur Crispy diracik dari jamur tiram segar petani lokal, digoreng kering tanpa MSG, dan terintegrasi dari hulu hingga hilir.
          </p>

          {/* Product Line Showcase */}
          <div className={styles.productImgWrap}>
            <img
              src="/No-Background-KhumKhum-1536x864.webp"
              alt="KhumKhum Jamur Crispy 5 Varian Rasa"
              className={styles.productImg}
            />
          </div>

          {/* Trust markers */}
          <div className={styles.trustPills}>
            <span className={styles.trustPill}>Halal LPPOM MUI</span>
            <span className={styles.trustPill}>P-IRT Terdaftar</span>
            <span className={styles.trustPill}>Tanpa MSG</span>
            <span className={styles.trustPill}>Merek Terdaftar</span>
          </div>
        </div>
      </aside>
    </div>
  );
}
