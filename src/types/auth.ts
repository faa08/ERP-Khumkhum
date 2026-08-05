/**
 * KhumKhum ERP — Auth Types
 */

export type UserRole =
  | 'super_admin'
  | 'admin_operasional'
  | 'petugas_penerimaan'
  | 'petugas_produksi'
  | 'petugas_qc'
  | 'staff_gudang'
  | 'staff_sales'
  | 'management_viewer';

export interface User {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
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

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: User;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin:          'Super Admin',
  admin_operasional:    'Admin Operasional',
  petugas_penerimaan:   'Petugas Penerimaan',
  petugas_produksi:     'Petugas Produksi',
  petugas_qc:           'Petugas QC',
  staff_gudang:         'Staff Gudang / PPIC',
  staff_sales:          'Staff Sales',
  management_viewer:    'Management Viewer',
};

// Simple permission map for UI routing protection
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  super_admin:          ['*'],
  admin_operasional:    ['dashboard', 'master', 'production', 'inventory', 'qc', 'sales', 'reports', 'settings'],
  petugas_penerimaan:   ['dashboard', 'inventory', 'qc'], // simplified
  petugas_produksi:     ['dashboard', 'production'],
  petugas_qc:           ['dashboard', 'qc'],
  staff_gudang:         ['dashboard', 'inventory', 'master'], // usually can view master
  staff_sales:          ['dashboard', 'sales', 'customers'],
  management_viewer:    ['dashboard', 'reports', 'master', 'production', 'inventory', 'qc', 'sales'], // read-only
};
