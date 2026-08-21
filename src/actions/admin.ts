'use server';

import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-guard';
import { logAuditEvent } from '@/actions/audit';
import { revalidatePath } from 'next/cache';
import type { DbUser, UserRole } from '@/types/database';

export interface CreateUserInput {
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  whatsapp_number?: string;
  is_active?: boolean;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  role?: UserRole;
  whatsapp_number?: string;
  is_active?: boolean;
}

/**
 * Get all registered users (Protected: SUPER_ADMIN)
 */
export async function getUsersAction(): Promise<{
  success: boolean;
  data?: DbUser[];
  error?: string;
}> {
  try {
    await requireAuth(['SUPER_ADMIN']);

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, email, name, role, whatsapp_number, is_active, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as DbUser[] };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal memuat data pengguna' };
  }
}

/**
 * Create a new user with hashed password (Protected: SUPER_ADMIN)
 */
export async function createUserAction(input: CreateUserInput): Promise<{
  success: boolean;
  data?: DbUser;
  error?: string;
}> {
  try {
    const { user: currentUser } = await requireAuth(['SUPER_ADMIN']);

    const rawPassword = input.password?.trim() || 'password123';
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    const { data, error } = await supabaseAdmin
      .from('users')
      .insert([
        {
          name: input.name.trim(),
          email: input.email.trim().toLowerCase(),
          password: hashedPassword,
          role: input.role,
          whatsapp_number: input.whatsapp_number,
          is_active: input.is_active !== undefined ? input.is_active : true,
        },
      ])
      .select('id, email, name, role, whatsapp_number, is_active, created_at, updated_at')
      .single();

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'Email sudah terdaftar di sistem' };
      }
      return { success: false, error: error.message };
    }

    await logAuditEvent({
      userId: currentUser.userId,
      action: 'CREATE',
      entityType: 'users',
      entityId: data.id,
      details: { email: data.email, name: data.name, role: data.role },
    });

    revalidatePath('/settings/users');
    return { success: true, data: data as DbUser };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal menambahkan pengguna' };
  }
}

/**
 * Update user details (Protected: SUPER_ADMIN)
 */
export async function updateUserAction(
  id: string,
  input: UpdateUserInput
): Promise<{ success: boolean; data?: DbUser; error?: string }> {
  try {
    const { user: currentUser } = await requireAuth(['SUPER_ADMIN']);

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (input.name !== undefined) updatePayload.name = input.name.trim();
    if (input.email !== undefined) updatePayload.email = input.email.trim().toLowerCase();
    if (input.role !== undefined) updatePayload.role = input.role;
    if (input.whatsapp_number !== undefined) updatePayload.whatsapp_number = input.whatsapp_number;
    if (input.is_active !== undefined) updatePayload.is_active = input.is_active;

    const { data, error } = await supabaseAdmin
      .from('users')
      .update(updatePayload)
      .eq('id', id)
      .select('id, email, name, role, whatsapp_number, is_active, created_at, updated_at')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    await logAuditEvent({
      userId: currentUser.userId,
      action: 'UPDATE',
      entityType: 'users',
      entityId: id,
      details: updatePayload,
    });

    revalidatePath('/settings/users');
    return { success: true, data: data as DbUser };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal mengubah data pengguna' };
  }
}

/**
 * Toggle user active status (Protected: SUPER_ADMIN)
 */
export async function toggleUserStatusAction(
  id: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const { user: currentUser } = await requireAuth(['SUPER_ADMIN']);

    const { error } = await supabaseAdmin
      .from('users')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    await logAuditEvent({
      userId: currentUser.userId,
      action: 'UPDATE',
      entityType: 'users',
      entityId: id,
      details: { status_change: isActive ? 'ACTIVATED' : 'DEACTIVATED' },
    });

    revalidatePath('/settings/users');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal mengubah status pengguna' };
  }
}

/**
 * Reset user password (Protected: SUPER_ADMIN)
 */
export async function resetUserPasswordAction(
  id: string,
  newPassword?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { user: currentUser } = await requireAuth(['SUPER_ADMIN']);

    const rawPassword = newPassword?.trim() || 'password123';
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    const { error } = await supabaseAdmin
      .from('users')
      .update({ password: hashedPassword, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    await logAuditEvent({
      userId: currentUser.userId,
      action: 'UPDATE',
      entityType: 'users',
      entityId: id,
      details: { action: 'PASSWORD_RESET' },
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal mereset kata sandi' };
  }
}

/**
 * Delete user (Protected: SUPER_ADMIN)
 */
export async function deleteUserAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { user: currentUser } = await requireAuth(['SUPER_ADMIN']);

    const { error } = await supabaseAdmin.from('users').delete().eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    await logAuditEvent({
      userId: currentUser.userId,
      action: 'DELETE',
      entityType: 'users',
      entityId: id,
    });

    revalidatePath('/settings/users');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal menghapus pengguna' };
  }
}
