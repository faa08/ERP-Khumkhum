/**
 * KhumKhum ERP — Formatting Helpers
 * Standardisasi format angka, satuan berat (kg), mata uang, dan persentase.
 * Sesuai PRD Revisi Developer 1: presisi minimal 2 desimal / 0,01 kg.
 */

/**
 * Format berat ke standar Kilogram (kg) dengan pemisah desimal Indonesia.
 * Contoh: 0.2 -> "0,20 kg", 15.5 -> "15,50 kg"
 */
export function formatWeightKg(
  value: number | string | null | undefined,
  options?: { withUnit?: boolean; decimals?: number; fallback?: string }
): string {
  const { withUnit = true, decimals = 2, fallback = '-' } = options || {};

  if (value === null || value === undefined || value === '') return fallback;

  const num = typeof value === 'string' ? parseWeightInput(value) : Number(value);
  if (isNaN(num)) return fallback;

  const formatted = num.toLocaleString('id-ID', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return withUnit ? `${formatted} kg` : formatted;
}

/**
 * Parse input string bobot menjadi number presisi 2 desimal.
 * Mendukung input koma maupun titik: "0,2" -> 0.2, "0.25" -> 0.25
 */
export function parseWeightInput(input: string | number | null | undefined): number {
  if (input === null || input === undefined || input === '') return 0;
  if (typeof input === 'number') return Math.round(input * 100) / 100;

  const sanitized = input.toString().trim().replace(/,/g, '.');
  const parsed = parseFloat(sanitized);
  if (isNaN(parsed)) return 0;

  return Math.round(parsed * 100) / 100;
}

/**
 * Format nominal Rupiah. Contoh: 25000 -> "Rp 25.000"
 */
export function formatRupiah(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return 'Rp 0';
  return `Rp ${Math.round(amount).toLocaleString('id-ID')}`;
}

/**
 * Format persentase. Contoh: 78.45 -> "78,5%"
 */
export function formatPercentage(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined || isNaN(value)) return '-';
  return `${value.toLocaleString('id-ID', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}%`;
}
