import React from 'react';
import type { Metadata } from 'next';
import styles from './auth.module.css';
import '../globals.css';
import { ShieldCheck, Sprout, TrendingUp, CheckCircle2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Masuk — KhumKhum ERP Agroindustri Jamur',
  description: 'Sistem ERP Terintegrasi KhumKhum: Manajemen Rantai Pasok, Produksi, & Pengendalian Mutu Jamur Crispy',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.layout} data-theme="dark">
      {/* Left Login Form Panel */}
      <main className={styles.panel}>
        <div className={styles.panelGlow} aria-hidden="true" />
        {children}
      </main>

      {/* Right Visual Hero Agroindustry Showcase */}
      <aside className={styles.visual} aria-label="KhumKhum Agroindustry Showcase">
        <div className={styles.visualOverlay} />
        <div className={styles.visualContent}>
          {/* Top Brand Tag */}
          <div>
            <div className={styles.tagBadge}>
              <Sprout size={16} className={styles.tagIcon} />
              <span>Agroindustri Jamur Tiram Modern</span>
            </div>

            {/* Hero Headline */}
            <h2 className={styles.heroTitle}>
              Dari Kumbung Petani <br />
              Hingga <span className={styles.highlightText}>Snack Jamur Crispy</span> Berkualitas
            </h2>

            <p className={styles.heroDesc}>
              Platform ERP cerdas yang mengintegrasikan rantai pasok jamur tiram: pencatatan panen petani binaan, sortasi otomatis, rendemen wajan produksi, hingga kepatuhan standar mutu pangan.
            </p>
          </div>

          {/* Product Line Cutout Banner */}
          <div className={styles.productShowcase}>
            <div className={styles.productGlow} />
            <img
              src="/No-Background-KhumKhum-1536x864.webp"
              alt="Lini Produk KhumKhum Jamur Crispy"
              className={styles.productImg}
            />
          </div>

          {/* Bottom Floating Stats & Certifications */}
          <div>
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statIconWrap}>
                  <ShieldCheck size={20} className={styles.statIcon} />
                </div>
                <div>
                  <div className={styles.statVal}>100% Terlacak</div>
                  <div className={styles.statLabel}>Silsilah Batch Panen ke QC</div>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIconWrap}>
                  <TrendingUp size={20} className={styles.statIcon} />
                </div>
                <div>
                  <div className={styles.statVal}>&ge; 80% Rendemen</div>
                  <div className={styles.statLabel}>Standar Penggorengan Presisi</div>
                </div>
              </div>
            </div>

            {/* Quality Standard Badges */}
            <div className={styles.visualFooter}>
              <div className={styles.certPills}>
                <span className={styles.certPill}><CheckCircle2 size={13} /> Sertifikasi Halal</span>
                <span className={styles.certPill}><CheckCircle2 size={13} /> P-IRT Resmi BPOM</span>
                <span className={styles.certPill}><CheckCircle2 size={13} /> Jogja Mark Certified</span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
