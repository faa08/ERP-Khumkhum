/**
 * KhumKhum ERP — Auth Types & RBAC Definitions
 * 
 * 6 Core User Roles sesuai PRD:
 * 1. SUPER_ADMIN   — Kontrol penuh sistem
 * 2. QC            — Quality Control & Ops
 * 3. WAREHOUSE     — Gudang, Logistik, Sales & PPIC  
 * 4. PRODUCTION    — Operator Lini Produksi
 * 5. MANAGEMENT    — Eksekutif & Viewer
 * 6. FARMER        — Petani Mitra (via WhatsApp)
 */

export type UserRole =
  | 'SUPER_ADMIN'
  | 'QC'
  | 'WAREHOUSE'
  | 'PRODUCTION'
  | 'MANAGEMENT'
  | 'SALES'
  | 'FARMER';

export interface User {
  id: string;
  employeeId?: string;
  name: string;
  email: string;
  role: UserRole;
  whatsappNumber?: string;
  department?: string;
  avatarUrl?: string;
  isActive: boolean;
  lastLogin?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  QC:          'Quality Control & Ops',
  WAREHOUSE:   'Warehouse, Logistik & PPIC',
  PRODUCTION:  'Petugas Produksi',
  MANAGEMENT:  'Manajemen (Viewer)',
  SALES:       'Sales & Pengiriman',
  FARMER:      'Petani Mitra',
};

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  SUPER_ADMIN: ['*'],
  QC:          ['dashboard', 'qc', 'standards', 'production', 'inventory', 'master', 'traceability', 'reports', 'forecast'],
  WAREHOUSE:   ['dashboard', 'master', 'receiving', 'sorting', 'inventory', 'warehouse', 'ppic', 'traceability', 'reports', 'forecast'],
  PRODUCTION:  ['dashboard', 'production', 'ppic', 'inventory', 'traceability'],
  MANAGEMENT:  ['dashboard', 'reports', 'traceability', 'master', 'production', 'inventory', 'warehouse', 'qc', 'sales', 'audit', 'forecast'],
  SALES:       ['dashboard', 'master', 'sales', 'inventory', 'traceability'],
  FARMER:      [], // Petani tidak login ke web — interaksi via WhatsApp
};
