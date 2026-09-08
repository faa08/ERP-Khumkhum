/**
 * KhumKhum ERP — Konfigurasi KPI Dashboard Eksekutif
 *
 * Modul ini sengaja tidak menyentuh database agar bisa diimpor baik dari
 * komponen client maupun Server Action. Nilai target yang boleh dikonfigurasi
 * admin (rendemen, defect rate) tetap dibaca dari tabel `settings` lewat
 * getKpiTrend(); yang tinggal di sini hanya hal yang memang statis:
 * arah "baik" tiap KPI, dan target yang belum punya tempat di settings.
 */

export type KpiKey =
  | 'supply'
  | 'yield'
  | 'defectRate'
  | 'stockAccuracy'
  | 'revenue'
  | 'batches';

/**
 * Arah yang dianggap membaik untuk tiap KPI.
 * 'neutral' berarti KPI volume — naik atau turun bukan kabar baik/buruk
 * dengan sendirinya, jadi tidak boleh diberi warna merah/hijau.
 */
export type KpiDirection = 'higher' | 'lower' | 'neutral';

export const KPI_DIRECTION: Record<KpiKey, KpiDirection> = {
  supply: 'neutral',
  yield: 'higher',
  defectRate: 'lower',
  stockAccuracy: 'higher',
  revenue: 'neutral',
  batches: 'neutral',
};

/**
 * Target akurasi stok (%). Berbeda dari rendemen dan defect rate, ambang ini
 * belum punya field di tabel `settings` — lihat PRD bab 13 butir 5.
 */
export const STOCK_ACCURACY_TARGET = 98;

export type KpiTone = 'positive' | 'negative' | 'neutral';

/**
 * Bentuk data tren. Ditaruh di sini — bukan di actions/management.ts — supaya
 * komponen client bisa mengimpornya tanpa menyentuh modul `'use server'`.
 */
export interface KpiTrendPoint {
  /** Kunci bucket (yyyy-MM-dd): awal hari, atau awal minggu bila unit 'week' */
  bucket: string;
  /** Label siap tampil, mis. "3 Sep" atau "Mgg 1 Sep" */
  label: string;
  /** null = tidak ada data di bucket ini; garis sparkline harus diputus, bukan digambar nol */
  value: number | null;
}

export interface KpiDelta {
  current: number | null;
  previous: number | null;
  /** Perubahan relatif (%) terhadap periode sebelumnya; null bila tak terhitung */
  deltaPct: number | null;
}

/**
 * Satu-satunya tempat yang memutuskan sebuah angka KPI berstatus baik,
 * buruk, atau netral. Dipakai bersama oleh kartu KPI dan bullet bar supaya
 * warna tidak lagi dipilih sendiri-sendiri per kartu.
 */
export function toneForValue(
  key: KpiKey,
  value: number | null,
  target: number | null
): KpiTone {
  const direction = KPI_DIRECTION[key];
  // Tanpa nilai, tanpa target, atau KPI volume: tidak ada status untuk diwarnai.
  if (value === null || target === null || direction === 'neutral') return 'neutral';

  const meetsTarget = direction === 'higher' ? value >= target : value <= target;
  return meetsTarget ? 'positive' : 'negative';
}

/**
 * Tone untuk arah perubahan antar periode — menilai naik/turunnya, bukan
 * posisinya terhadap target. Defect rate yang turun itu kabar baik meski
 * angkanya masih di atas ambang.
 */
export function toneForDelta(key: KpiKey, deltaPct: number | null): KpiTone {
  const direction = KPI_DIRECTION[key];
  if (deltaPct === null || deltaPct === 0 || direction === 'neutral') return 'neutral';

  const improving = direction === 'higher' ? deltaPct > 0 : deltaPct < 0;
  return improving ? 'positive' : 'negative';
}
