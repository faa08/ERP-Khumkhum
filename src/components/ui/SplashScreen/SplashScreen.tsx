'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import styles from './SplashScreen.module.css';

export function SplashScreen() {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    // Cek apakah user sudah melihat splash screen di sesi tab saat ini
    const hasSeen = sessionStorage.getItem('khumkhum_splash_seen');
    if (!hasSeen) {
      setIsVisible(true);

      // Loading bar berjalan selama 2.5 detik sebelum tirai naik
      const liftTimer = setTimeout(() => {
        setIsClosing(true);
      }, 2500);

      // Hapus sepenuhnya dari DOM setelah animasi transisi tirai 0.65 detik selesai
      const removeTimer = setTimeout(() => {
        setIsVisible(false);
        sessionStorage.setItem('khumkhum_splash_seen', 'true');
      }, 3150);

      return () => {
        clearTimeout(liftTimer);
        clearTimeout(removeTimer);
      };
    }
  }, []);

  if (!isVisible) return null;

  // Izinkan klik cepat untuk langsung membuka jika user ingin segera masuk
  const handleFastDismiss = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsVisible(false);
      sessionStorage.setItem('khumkhum_splash_seen', 'true');
    }, 450);
  };

  return (
    <div
      className={`${styles.overlay} ${isClosing ? styles.closing : ''}`}
      onClick={handleFastDismiss}
      aria-label="KhumKhum ERP Splash Screen"
      role="dialog"
      aria-modal="true"
    >
      {/* Background Ambient Glow Effect */}
      <div className={styles.ambientGlow} />

      {/* Main Content */}
      <div className={styles.content}>
        <div className={styles.logoWrapper}>
          <Image
            src="/Khumkhum-01-1536x486.webp"
            alt="KhumKhum Jamur Crispy"
            width={320}
            height={101}
            priority
            className={styles.logoImg}
          />
          <span className={styles.badge}>ERP AGROINDUSTRI</span>
        </div>

        <h1 className={styles.title}>KhumKhum ERP</h1>
        <p className={styles.subtitle}>
          Sistem Terintegrasi Manajemen Rantai Pasok, Produksi, & Mutu Jamur Crispy
        </p>

        {/* Minimalist Progress Track (2.5s) */}
        <div className={styles.progressTrack} aria-hidden="true">
          <div className={styles.progressBar} />
        </div>
      </div>

      <div className={styles.footerNote}>
        Oleh-oleh Khas Kulon Progo, DI Yogyakarta
      </div>
    </div>
  );
}
