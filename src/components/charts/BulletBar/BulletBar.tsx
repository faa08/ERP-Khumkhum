import React from 'react';
import { cn } from '@/lib/utils';
import type { KpiTone } from '@/lib/kpi-config';
import styles from './BulletBar.module.css';

export interface BulletBarProps {
  /** Nilai aktual. null = belum terukur; bar digambar kosong. */
  value: number | null;
  /** Ambang target; penanda tidak digambar bila null. */
  target?: number | null;
  /** Batas kanan skala. Untuk defect rate pakai nilai kecil (mis. 10) agar target 5% terlihat. */
  max?: number;
  /**
   * Status baik/buruk/netral. Sengaja diterima sebagai prop, bukan dihitung di sini,
   * supaya keputusan warna tetap terpusat di toneForValue() pada lib/kpi-config.
   */
  tone?: KpiTone;
  /** Satuan untuk label skala & pembacaan screen reader, mis. "%" atau "kg". */
  unit?: string;
  /** Ditampilkan di bawah penanda target, mis. "target 80%". */
  targetLabel?: string;
  showScale?: boolean;
  className?: string;
}

function clampPercent(n: number): number {
  return Math.min(100, Math.max(0, n));
}

/**
 * Bar tunggal yang menunjukkan posisi sebuah nilai terhadap targetnya.
 *
 * Dipakai di kartu KPI agar "di bawah target" terbaca dari panjang batang,
 * bukan hanya dari teks — posisi dan panjang adalah kanal yang paling akurat
 * dibaca mata dibanding warna atau angka semata.
 */
export function BulletBar({
  value,
  target = null,
  max = 100,
  tone = 'neutral',
  unit = '',
  targetLabel,
  showScale = true,
  className,
}: BulletBarProps) {
  const safeMax = max > 0 ? max : 100;
  const fillPercent = value === null ? 0 : clampPercent((value / safeMax) * 100);
  const targetPercent = target === null ? null : clampPercent((target / safeMax) * 100);

  const ariaLabel =
    value === null
      ? 'Nilai belum terukur'
      : target === null
        ? `Nilai ${value}${unit}`
        : `Nilai ${value}${unit}, target ${target}${unit}, ${
            tone === 'positive' ? 'memenuhi target' : tone === 'negative' ? 'belum memenuhi target' : 'tanpa status'
          }`;

  return (
    <div className={cn(styles.wrapper, className)}>
      <div className={styles.track} role="img" aria-label={ariaLabel}>
        <div
          className={cn(styles.fill, styles[`fill--${tone}`])}
          style={{ width: `${fillPercent}%` }}
        />
        {targetPercent !== null && (
          <span className={styles.tick} style={{ left: `${targetPercent}%` }} aria-hidden="true" />
        )}
      </div>

      {showScale && (
        <div className={styles.scale} aria-hidden="true">
          <span>0{unit}</span>
          {targetPercent !== null && <span>{targetLabel ?? `target ${target}${unit}`}</span>}
          <span>
            {safeMax}
            {unit}
          </span>
        </div>
      )}
    </div>
  );
}
