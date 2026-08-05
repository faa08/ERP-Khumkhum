/**
 * KhumKhum ERP — Utility Functions
 */

import { clsx, type ClassValue } from 'clsx';
import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

// ─────────────────────────────────────────────
// CLASS NAME MERGE
// ─────────────────────────────────────────────

/**
 * Merges class names conditionally.
 * Uses clsx — supports objects, arrays, conditionals.
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

// ─────────────────────────────────────────────
// DATE / TIME
// ─────────────────────────────────────────────

/**
 * Format a date string or Date object.
 * Default: DD/MM/YYYY (Indonesian standard)
 */
export function formatDate(
  date: string | Date | null | undefined,
  fmt = 'dd/MM/yyyy'
): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(d)) return 'Invalid date';
  return format(d, fmt, { locale: idLocale });
}

/**
 * Format a date with time.
 * Default: DD/MM/YYYY HH:mm
 */
export function formatDateTime(
  date: string | Date | null | undefined
): string {
  return formatDate(date, 'dd/MM/yyyy HH:mm');
}

/**
 * Format relative time (e.g., "2 minutes ago").
 */
export function formatRelativeTime(
  date: string | Date | null | undefined
): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(d)) return '—';
  return formatDistanceToNow(d, { addSuffix: true, locale: idLocale });
}

// ─────────────────────────────────────────────
// NUMBER / CURRENCY
// ─────────────────────────────────────────────

/**
 * Format a number with thousand separator.
 * Indonesian locale: 1.000.000
 */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('id-ID').format(value);
}

/**
 * Format currency (IDR)
 */
export function formatCurrency(
  value: number | null | undefined,
  currency = 'IDR'
): string {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format a weight value (kg)
 */
export function formatWeight(
  value: number | null | undefined,
  unit = 'kg'
): string {
  if (value === null || value === undefined) return '—';
  return `${formatNumber(value)} ${unit}`;
}

// ─────────────────────────────────────────────
// STRING
// ─────────────────────────────────────────────

/**
 * Get initials from a full name.
 * "John Doe" → "JD"
 */
export function getInitials(name: string, maxLength = 2): string {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, maxLength)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

/**
 * Capitalize the first letter of each word.
 */
export function toTitleCase(str: string): string {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Slugify a string.
 * "Hello World" → "hello-world"
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Truncate a string to a max length with ellipsis.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 1) + '…';
}

// ─────────────────────────────────────────────
// ID GENERATION
// ─────────────────────────────────────────────

/**
 * Generate a unique ID (non-cryptographic, for UI purposes).
 */
export function generateId(prefix = 'id'): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

// ─────────────────────────────────────────────
// ARRAY
// ─────────────────────────────────────────────

/**
 * Group an array of objects by a key.
 */
export function groupBy<T>(
  array: T[],
  key: keyof T
): Record<string, T[]> {
  return array.reduce((result, item) => {
    const groupKey = String(item[key]);
    if (!result[groupKey]) result[groupKey] = [];
    result[groupKey].push(item);
    return result;
  }, {} as Record<string, T[]>);
}

/**
 * Remove duplicates from an array by a key.
 */
export function uniqueBy<T>(array: T[], key: keyof T): T[] {
  const seen = new Set<unknown>();
  return array.filter((item) => {
    const k = item[key];
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// ─────────────────────────────────────────────
// MISC
// ─────────────────────────────────────────────

/**
 * Sleep for n milliseconds. For async operations.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if a value is empty (null, undefined, empty string, empty array).
 */
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value as object).length === 0;
  return false;
}
