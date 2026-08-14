'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-guard';
import { logAuditEvent } from '@/actions/audit';
import { revalidatePath } from 'next/cache';

/**
 * Get setting value by key
 */
export async function getSettingAction(key: string): Promise<{
  success: boolean;
  value?: any;
  error?: string;
}> {
  try {
    const { data, error } = await supabaseAdmin
      .from('settings')
      .select('key, value, updated_at')
      .eq('key', key)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, value: data?.value };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Save / update setting value (Protected: SUPER_ADMIN)
 */
export async function saveSettingAction(
  key: string,
  value: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  try {
    const { user: currentUser } = await requireAuth(['SUPER_ADMIN']);

    const { error } = await supabaseAdmin.from('settings').upsert(
      {
        key,
        value,
        updated_by: currentUser.userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    );

    if (error) {
      return { success: false, error: error.message };
    }

    await logAuditEvent({
      userId: currentUser.userId,
      action: 'UPDATE',
      entityType: 'settings',
      entityId: key,
      details: value,
    });

    revalidatePath('/settings');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal menyimpan pengaturan' };
  }
}
