import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { BulletBar } from '@/components/charts/BulletBar';
import { Sparkline } from '@/components/charts/Sparkline';
import {
  toneForValue,
  toneForDelta,
  type KpiKey,
  type KpiTrendPoint,
  type KpiDelta,
} from '@/lib/kpi-config';
import styles from './KpiCard.module.css';

export interface KpiCardProps {
  kpiKey: KpiKey;
  label: string;
  /** null = belum terukur. Kartu menampilkan emptyReason, bukan angka 0. */
  value: number | null;
  /** Pemformat nilai jadi teks tampil, mis. (v) => `${v.toFixed(1)}%`. */
  formatValue: (value: number) => string;
  /** Satuan untuk skala bullet bar & pembacaan screen reader. */
  unit?: string;
  /** Target aktif dari settings. null = KPI volume, tidak punya ambang. */
  target?: number | null;
  /** Batas kanan bullet bar. Untuk defect rate isi kecil (mis. 10) agar target 5% terlihat. */
  max?: number;
  series?: KpiTrendPoint[];
  delta?: KpiDelta | null;
  /** Alasan yang ditampilkan saat value null, mis. "Belum ada stock opname periode ini". */
  emptyReason?: string;
  /** Dekoratif saja — ikon sengaja tidak membawa warna status. */
  icon?: React.ReactNode;
  trendCaption?: string;
  className?: string;
}

function formatDelta(deltaPct: number): string {
  const sign = deltaPct > 0 ? '+' : '';
  return `${sign}${deltaPct.toFixed(1)}%`;
}

/**
 * Satu kartu KPI: angka, posisinya terhadap target, dan tren periodenya.
 *
 * Semua keputusan warna di kartu ini berasal dari toneForValue/toneForDelta
 * (lib/kpi-config) — bukan dipilih per kartu seperti sebelumnya. Konsekuensinya
 * merah selalu berarti "di luar standar" di seluruh dashboard, dan KPI volume
 * (pasokan, omset, jumlah batch) tidak pernah diberi merah/hijau karena naik
 * atau turunnya bukan kabar baik maupun buruk dengan sendirinya.
 */
export function KpiCard({
  kpiKey,
  label,
  value,
  formatValue,
  unit = '',
  target = null,
  max,
  series,
  delta,
  emptyReason,
  icon,
  trendCaption,
  className,
}: KpiCardProps) {
  const valueTone = toneForValue(kpiKey, value, target);
  const deltaPct = delta?.deltaPct ?? null;
  const deltaTone = toneForDelta(kpiKey, deltaPct);

  const points = series?.map((p) => p.value) ?? [];
  const hasTrend = points.filter((p) => p !== null).length >= 2;

  const DeltaIcon =
    deltaPct === null || deltaPct === 0 ? Minus : deltaPct > 0 ? TrendingUp : TrendingDown;

  return (
    <Card className={cn(styles.card, className)}>
      <div className={styles.head}>
        <div className={styles.headText}>
          <p className={styles.label}>{label}</p>
          <p className={cn(styles.value, styles[`value--${valueTone}`])}>
            {value === null ? '—' : formatValue(value)}
          </p>
        </div>

        {deltaPct !== null ? (
          <span
            className={cn(styles.delta, styles[`delta--${deltaTone}`])}
            title="Dibanding periode sebelumnya"
          >
            <DeltaIcon size={12} aria-hidden="true" />
            {formatDelta(deltaPct)}
          </span>
        ) : (
          icon && (
            <span className={styles.icon} aria-hidden="true">
              {icon}
            </span>
          )
        )}
      </div>

      {value === null && emptyReason && <p className={styles.empty}>{emptyReason}</p>}

      {value !== null && target !== null && (
        <BulletBar
          className={styles.bullet}
          value={value}
          target={target}
          max={max}
          tone={valueTone}
          unit={unit}
        />
      )}

      {hasTrend && (
        <div className={styles.trend}>
          <Sparkline
            points={points}
            tone={valueTone}
            ariaLabel={`Tren ${label} selama ${points.length} periode terakhir`}
          />
          {trendCaption && <span className={styles.trendCaption}>{trendCaption}</span>}
        </div>
      )}
    </Card>
  );
}
