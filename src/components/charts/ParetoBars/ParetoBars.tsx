import React from 'react';
import { cn } from '@/lib/utils';
import type { QcParetoItem } from '@/types/database';
import styles from './ParetoBars.module.css';

export interface ParetoBarsProps {
  /** Sudah terurut menurun dari getQcParetoData(). */
  items: QcParetoItem[];
  /**
   * Batas (%) yang membuat dua kategori teratas disebut "terkonsentrasi".
   * Di bawah ini, kalimat insight justru melaporkan bahwa defect tersebar merata.
   */
  concentrationThreshold?: number;
  /** Ditampilkan saat items kosong — jangan pernah mengarang angka pengganti. */
  emptyMessage?: string;
  className?: string;
}

/** Kalimat insight hanya menyebut segelintir teratas — lebih dari ini tidak lagi bisa ditindaklanjuti. */
const TOP_N = 2;

/**
 * Menyusun kalimat temuan dari datanya sendiri: berapa persen yang ditutup oleh
 * dua kategori teratas, dan apakah itu cukup terkonsentrasi untuk diprioritaskan.
 *
 * Sengaja TIDAK mencari "berapa kategori untuk mencapai 80%": dengan lima
 * kategori defect, ambang itu hampir selalu butuh empat di antaranya, dan
 * "empat dari lima kategori teratas" bukan temuan yang bisa dikerjakan siapa pun.
 */
function buildInsight(items: QcParetoItem[], concentrationThreshold: number): string | null {
  if (items.length === 0) return null;

  if (items.length === 1) {
    return `Seluruh defect berasal dari satu kategori: ${items[0].category}.`;
  }

  const n = Math.min(TOP_N, items.length);
  const covered = items[n - 1].cumulativePercentage;
  const names = items
    .slice(0, n)
    .map((i) => i.category)
    .join(' + ');

  if (covered >= concentrationThreshold) {
    return `${n} kategori teratas (${names}) menyumbang ${covered.toFixed(0)}% dari seluruh defect — perbaikan di situ dulu akan paling terasa.`;
  }

  return `Defect tersebar cukup merata: ${n} kategori teratas hanya menutup ${covered.toFixed(0)}%, jadi tidak ada satu penyebab dominan untuk diprioritaskan.`;
}

/**
 * Diagram Pareto batang horizontal untuk kategori defect QC.
 *
 * Judulnya sengaja berupa temuan, bukan nama data: "Defect per Kategori" hanya
 * menamai isi tabel, sedangkan kalimat di atas batang langsung menjawab
 * pertanyaan yang dibawa manajemen ke layar ini — bagian mana yang dibenahi dulu.
 */
export function ParetoBars({
  items,
  concentrationThreshold = 60,
  emptyMessage = 'Belum ada data inspeksi QC pada periode ini.',
  className,
}: ParetoBarsProps) {
  if (items.length === 0) {
    return <p className={cn(styles.empty, className)}>{emptyMessage}</p>;
  }

  const insight = buildInsight(items, concentrationThreshold);
  const largest = Math.max(...items.map((i) => i.percentage), 1);

  return (
    <div className={cn(styles.wrapper, className)}>
      {insight && <p className={styles.insight}>{insight}</p>}

      <ul className={styles.list}>
        {items.map((item, idx) => (
          <li key={item.category} className={styles.row}>
            <span className={styles.label} title={item.category}>
              {item.category}
            </span>
            <div
              className={styles.track}
              role="img"
              aria-label={`${item.category}: ${item.count} temuan, ${item.percentage}% dari total`}
            >
              <div
                className={styles.fill}
                /* Batang teratas paling pekat; urutan warna ikut urutan besaran */
                style={{
                  width: `${(item.percentage / largest) * 100}%`,
                  opacity: Math.max(0.4, 1 - idx * 0.15),
                }}
              />
            </div>
            <span className={styles.value}>{item.percentage.toFixed(0)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
