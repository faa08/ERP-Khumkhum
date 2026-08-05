/**
 * KhumKhum ERP — Application Constants
 */

// ─────────────────────────────────────────────
// COMPANY INFO
// ─────────────────────────────────────────────

export const APP_NAME = 'KhumKhum ERP';
export const COMPANY_NAME = 'KhumKhum';
export const APP_VERSION = '1.0.0';

// ─────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────

export const ROUTES = {
  // Auth
  LOGIN:           '/login',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD:  '/reset-password',

  // App Shell
  DASHBOARD:       '/dashboard',

  // Master Data
  MASTER_FARMERS:      '/master/farmers',
  MASTER_PRODUCTS:     '/master/products',
  MASTER_RAW_MATS:     '/master/raw-materials',
  MASTER_CUSTOMERS:    '/master/customers',
  MASTER_WAREHOUSES:   '/master/warehouses',
  MASTER_PROD_STDS:    '/master/production-standards',
  MASTER_SORT_STDS:    '/master/sorting-standards',
  MASTER_QC_STDS:      '/master/qc-standards',

  // Operations
  RECEIVING:       '/receiving',
  SORTING:         '/sorting',
  PPIC:            '/ppic',
  PRODUCTION:      '/production',
  QC:              '/quality-control',
  INVENTORY:       '/inventory',
  SALES:           '/sales',
  TRACEABILITY:    '/traceability',
  PURCHASING:      '/purchasing',
  FINANCE:         '/finance',
  HR:              '/hr',
  // Management
  REPORTS:         '/reports',
  AI_FORECAST:     '/ai-forecast',
  
  // Settings & System
  SETTINGS:        '/settings',
  USERS:           '/settings/users',
  AUDIT_LOG:       '/settings/audit-log',
} as const;

// ─────────────────────────────────────────────
// PAGINATION
// ─────────────────────────────────────────────

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 25;

// ─────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────

export const TOAST_DEFAULT_DURATION = 4000; // ms
export const TOAST_MAX_VISIBLE = 5;

// ─────────────────────────────────────────────
// LOCAL STORAGE KEYS
// ─────────────────────────────────────────────

export const STORAGE_KEYS = {
  SIDEBAR_COLLAPSED: 'erp:sidebar:collapsed',
  THEME:             'erp:theme',
  AUTH_TOKEN:        'erp:auth:token',
  REMEMBER_ME:       'erp:auth:remember',
} as const;

// ─────────────────────────────────────────────
// DATE FORMATS
// ─────────────────────────────────────────────

export const DATE_FORMATS = {
  DISPLAY:       'dd/MM/yyyy',
  DISPLAY_TIME:  'dd/MM/yyyy HH:mm',
  DISPLAY_FULL:  'EEEE, dd MMMM yyyy',
  ISO:           "yyyy-MM-dd'T'HH:mm:ss",
  INPUT:         'yyyy-MM-dd',
} as const;

// ─────────────────────────────────────────────
// STATUS COLORS
// Mapping operational statuses to semantic colors.
// Used by StatusBadge component.
// ─────────────────────────────────────────────

export const STATUS_COLOR_MAP: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  // Production & General Operations
  active:       'success',
  completed:    'success',
  in_progress:  'info',
  sorting:      'info',
  planned:      'info',
  pending:      'warning',
  on_hold:      'warning',
  cancelled:    'danger',
  rejected:     'danger',
  draft:        'neutral',

  // Inventory & Sales
  in_stock:     'success',
  low_stock:    'warning',
  out_of_stock: 'danger',
  shipped:      'success',
  delivered:    'success',

  // QC statuses
  passed:       'success',
  failed:       'danger',
  under_review: 'info',

  // General
  enabled:      'success',
  disabled:     'danger',
  archived:     'neutral',
} as const;
