'use server';

import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '@/lib/supabase';
import { createSession, clearSession, getSession } from '@/lib/session';
import { logAuditEvent } from '@/actions/audit';
import type { UserRole } from '@/types/database';

export interface LoginResult {
  success: boolean;
  user?: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
  error?: string;
}

/**
 * Ensures initial Super Admin exists if users table is empty.
 */
async function ensureSuperAdminExists(): Promise<void> {
  try {
    const { count, error } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (!error && count === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await supabaseAdmin.from('users').insert([
        {
          email: 'admin@khumkhum.id',
          password: hashedPassword,
          name: 'Super Administrator',
          role: 'SUPER_ADMIN',
          is_active: true,
        },
      ]);
      console.log('✅ Seeded default Super Admin (admin@khumkhum.id / admin123)');
    }
  } catch (err) {
    console.error('Failed to check/seed default super admin:', err);
  }
}

/**
 * Authenticate user with Email/Username & Password against Supabase users table
 */
export async function loginAction(credentials: {
  username: string;
  password: string;
}): Promise<LoginResult> {
  try {
    await ensureSuperAdminExists();

    const normalizedInput = credentials.username.trim().toLowerCase();
    const isEmail = normalizedInput.includes('@');

    // Query user by email (or default alias if 'admin' entered)
    let query = supabaseAdmin.from('users').select('*');
    if (isEmail) {
      query = query.ilike('email', normalizedInput);
    } else if (normalizedInput === 'admin') {
      query = query.or('email.ilike.admin@khumkhum.id,email.ilike.admin');
    } else {
      query = query.or(`email.ilike.${normalizedInput},email.ilike.${normalizedInput}@khumkhum.id`);
    }

    const { data: users, error } = await query;

    if (error || !users || users.length === 0) {
      return { success: false, error: 'Email atau username tidak terdaftar' };
    }

    const user = users[0];

    if (!user.is_active) {
      return {
        success: false,
        error: 'Akun Anda dinonaktifkan. Hubungi administrator sistem.',
      };
    }

    // Compare password (support both bcrypt hash and plain for flexibility)
    let isPasswordValid = false;
    if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
      isPasswordValid = await bcrypt.compare(credentials.password, user.password);
    } else {
      isPasswordValid = credentials.password === user.password;
    }

    if (!isPasswordValid) {
      return { success: false, error: 'Kata sandi tidak sesuai' };
    }

    // Set signed JWT Session Cookie
    await createSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
    });

    // Record login audit
    await logAuditEvent({
      userId: user.id,
      action: 'LOGIN',
      entityType: 'auth',
      entityId: user.id,
      details: { email: user.email, role: user.role },
    });

    return {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role as UserRole,
      },
    };
  } catch (err: any) {
    console.error('Login action error:', err);
    return { success: false, error: err.message || 'Terjadi kesalahan saat masuk' };
  }
}

/**
 * Terminate session & clear cookies
 */
export async function logoutAction(): Promise<{ success: boolean }> {
  try {
    const session = await getSession();
    if (session?.userId) {
      await logAuditEvent({
        userId: session.userId,
        action: 'LOGOUT',
        entityType: 'auth',
        entityId: session.userId,
      });
    }
    await clearSession();
    return { success: true };
  } catch {
    await clearSession();
    return { success: true };
  }
}

/**
 * Get current authenticated user session
 */
export async function getAuthSessionAction(): Promise<{
  success: boolean;
  user?: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
}> {
  const session = await getSession();
  if (!session) return { success: false };

  return {
    success: true,
    user: {
      id: session.userId,
      name: session.name,
      email: session.email,
      role: session.role,
    },
  };
}
