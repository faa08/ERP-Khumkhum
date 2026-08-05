/**
 * KhumKhum ERP — Shared Types
 * Core type definitions shared across the entire application.
 */

// ─────────────────────────────────────────────
// UTILITY TYPES
// ─────────────────────────────────────────────

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type Dict<T = unknown> = Record<string, T>;
export type ID = string | number;

// ─────────────────────────────────────────────
// API RESPONSE TYPES
// ─────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T = unknown> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

// ─────────────────────────────────────────────
// COMMON UI STATE TYPES
// ─────────────────────────────────────────────

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export type Variant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger'
  | 'success'
  | 'warning'
  | 'info'
  | 'link';

export type SemanticColor = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export type Placement = 'top' | 'bottom' | 'left' | 'right';

export type Alignment = 'start' | 'center' | 'end';

// ─────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────

export type ToastType = 'success' | 'warning' | 'danger' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number; // ms, default 4000. 0 = persistent
}

// ─────────────────────────────────────────────
// DROPDOWN / MENU
// ─────────────────────────────────────────────

export interface MenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
  dividerAfter?: boolean;
}

// ─────────────────────────────────────────────
// BREADCRUMB
// ─────────────────────────────────────────────

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

// ─────────────────────────────────────────────
// SELECT OPTIONS
// ─────────────────────────────────────────────

export interface SelectOption<T = string> {
  value: T;
  label: string;
  disabled?: boolean;
  description?: string;
  group?: string;
}
