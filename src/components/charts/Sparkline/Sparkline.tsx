import React from 'react';
import { cn } from '@/lib/utils';
import type { KpiTone } from '@/lib/kpi-config';
import styles from './Sparkline.module.css';

export interface SparklineProps {
  /** Deret nilai per bucket. null = tidak ada data — garis diputus, bukan digambar nol. */
  points: (number | null)[];
  tone?: KpiTone;
  width?: number;
  height?: number;
  /** Wajib diisi bila grafik membawa informasi; dibaca screen reader. */
  ariaLabel?: string;
  className?: string;
}

interface Pt {
  x: number;
  y: number;
}

const PAD = 3;

/**
 * Garis tren mungil tanpa sumbu, tanpa tooltip — konteks periode untuk satu angka KPI.
 *
 * Digambar sebagai SVG langsung, bukan lewat recharts: di proyek ini recharts hanya
 * di-shim sebagai `any` (types/declarations.d.ts), dan enam ResponsiveContainer dalam
 * satu layar berarti enam observer resize untuk grafik yang tak butuh keduanya.
 * recharts tetap dipakai untuk grafik besar di halaman PPIC & AI Forecast.
 */
export function Sparkline({
  points,
  tone = 'neutral',
  width = 120,
  height = 34,
  ariaLabel,
  className,
}: SparklineProps) {
  const valid = points.filter((p): p is number => p !== null && Number.isFinite(p));

  // Satu titik tidak membentuk tren — lebih baik tidak menggambar apa pun.
  if (valid.length < 2) return null;

  const min = Math.min(...valid);
  const max = Math.max(...valid);
  // Deret yang datar sempurna tetap harus tergambar: taruh di tengah.
  const span = max - min || 1;
  const flat = max === min;

  const innerW = width - PAD * 2;
  const innerH = height - PAD * 2;
  const stepX = points.length > 1 ? innerW / (points.length - 1) : 0;

  const xAt = (i: number) => PAD + i * stepX;
  const yAt = (v: number) => (flat ? PAD + innerH / 2 : PAD + (1 - (v - min) / span) * innerH);

  // Pecah jadi segmen-segmen kontinu; setiap null memutus garis.
  const segments: Pt[][] = [];
  let current: Pt[] = [];
  points.forEach((p, i) => {
    if (p === null || !Number.isFinite(p)) {
      if (current.length > 0) segments.push(current);
      current = [];
      return;
    }
    current.push({ x: xAt(i), y: yAt(p) });
  });
  if (current.length > 0) segments.push(current);

  const lastIndex = points.reduce<number>((acc, p, i) => (p !== null ? i : acc), -1);
  const lastValue = lastIndex >= 0 ? points[lastIndex] : null;
  const baseline = height - PAD;

  return (
    <svg
      className={cn(styles.spark, styles[`spark--${tone}`], className)}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={ariaLabel ?? 'Tren periode terakhir'}
    >
      {segments.map((seg, idx) => {
        const line = seg.map((p) => `${p.x},${p.y}`).join(' ');
        return (
          <g key={idx}>
            {seg.length > 1 && (
              <>
                <polygon
                  className={styles.area}
                  points={`${line} ${seg[seg.length - 1].x},${baseline} ${seg[0].x},${baseline}`}
                />
                <polyline className={styles.line} points={line} />
              </>
            )}
            {/* Segmen sepanjang satu titik tetap ditandai agar datanya tidak hilang */}
            {seg.length === 1 && <circle className={styles.dot} cx={seg[0].x} cy={seg[0].y} r={1.8} />}
          </g>
        );
      })}

      {lastValue !== null && (
        <circle className={styles.endpoint} cx={xAt(lastIndex)} cy={yAt(lastValue)} r={2.6} />
      )}
    </svg>
  );
}
