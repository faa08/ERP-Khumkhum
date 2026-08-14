import { getSession, type SessionPayload } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase';
import type { UserRole } from '@/types/database';

export interface AuthGuardResult {
  user: SessionPayload;
}

/**
 * Strict role-based guard for Server Actions & Route Handlers.
 * Throws Error if unauthorized or forbidden.
 * 
 * @param allowedRoles - Array of roles allowed to perform the action. If omitted, any authenticated active user is allowed.
 */
export async function requireAuth(allowedRoles?: UserRole[]): Promise<AuthGuardResult> {
  const session = await getSession();

  if (!session || !session.userId) {
    throw new Error('UNAUTHORIZED: Silakan masuk terlebih dahulu');
  }

  // Double check active status in database
  const { data: dbUser, error } = await supabaseAdmin
    .from('users')
    .select('id, role, is_active')
    .eq('id', session.userId)
    .single();

  if (error || !dbUser || !dbUser.is_active) {
    throw new Error('UNAUTHORIZED: Akun Anda tidak aktif atau tidak ditemukan');
  }

  // Check role authorization (SUPER_ADMIN always has access)
  if (allowedRoles && allowedRoles.length > 0) {
    if (dbUser.role !== 'SUPER_ADMIN' && !allowedRoles.includes(dbUser.role as UserRole)) {
      throw new Error(`FORBIDDEN: Peran ${dbUser.role} tidak memiliki hak akses ke modul ini`);
    }
  }

  return {
    user: {
      ...session,
      role: dbUser.role as UserRole,
    },
  };
}

/**
 * Safe version that returns null instead of throwing an error
 */
export async function getAuthUser(): Promise<SessionPayload | null> {
  const session = await getSession();
  if (!session) return null;
  return session;
}
