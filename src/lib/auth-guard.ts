import { getSession, type SessionPayload } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase';
import type { UserRole } from '@/types/database';

export interface AuthGuardResult {
  user: SessionPayload;
}

interface CachedUserStatus {
  role: UserRole;
  is_active: boolean;
  expiresAt: number;
}

const userAuthCache = new Map<string, CachedUserStatus>();

export function invalidateUserAuthCache(userId?: string) {
  if (userId) {
    userAuthCache.delete(userId);
  } else {
    userAuthCache.clear();
  }
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

  const now = Date.now();
  let dbUserRole = session.role;
  let isActive = true;

  const cached = userAuthCache.get(session.userId);
  if (cached && cached.expiresAt > now) {
    dbUserRole = cached.role;
    isActive = cached.is_active;
  } else {
    // Check active status in database
    const { data: dbUser, error } = await supabaseAdmin
      .from('users')
      .select('id, role, is_active')
      .eq('id', session.userId)
      .single();

    if (error || !dbUser || !dbUser.is_active) {
      userAuthCache.delete(session.userId);
      throw new Error('UNAUTHORIZED: Akun Anda tidak aktif atau tidak ditemukan');
    }

    dbUserRole = dbUser.role as UserRole;
    isActive = dbUser.is_active;

    // Cache valid user status for 60 seconds
    userAuthCache.set(session.userId, {
      role: dbUserRole,
      is_active: isActive,
      expiresAt: now + 60_000,
    });
  }

  if (!isActive) {
    throw new Error('UNAUTHORIZED: Akun Anda tidak aktif atau tidak ditemukan');
  }

  // Check role authorization (SUPER_ADMIN always has access)
  if (allowedRoles && allowedRoles.length > 0) {
    if (dbUserRole !== 'SUPER_ADMIN' && !allowedRoles.includes(dbUserRole as UserRole)) {
      throw new Error(`FORBIDDEN: Peran ${dbUserRole} tidak memiliki hak akses ke modul ini`);
    }
  }

  return {
    user: {
      ...session,
      role: dbUserRole as UserRole,
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
