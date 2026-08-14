'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-guard';
import type { DbAuditLog } from '@/types/database';

export interface LogAuditParams {
  userId?: string | null;
  action: 'LOGIN' | 'LOGOUT' | 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT';
  entityType?: string;
  entityId?: string;
  details?: Record<string, any>;
}

/**
 * Record an audit event into audit_logs table
 */
export async function logAuditEvent(params: LogAuditParams): Promise<void> {
  try {
    await supabaseAdmin.from('audit_logs').insert([
      {
        user_id: params.userId || null,
        action: params.action,
        entity_type: params.entityType || null,
        entity_id: params.entityId || null,
        details: params.details || {},
      },
    ]);
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

/**
 * Query audit logs (Protected: SUPER_ADMIN, MANAGEMENT)
 */
export async function getAuditLogsAction(filters?: {
  action?: string;
  entityType?: string;
  limit?: number;
}): Promise<{ success: boolean; data?: DbAuditLog[]; error?: string }> {
  try {
    await requireAuth(['SUPER_ADMIN', 'MANAGEMENT', 'QC']);

    let query = supabaseAdmin
      .from('audit_logs')
      .select('id, user_id, action, entity_type, entity_id, details, created_at, users:user_id(name, email, role)')
      .order('created_at', { ascending: false })
      .limit(filters?.limit || 100);

    if (filters?.action && filters.action !== 'ALL') {
      query = query.eq('action', filters.action);
    }
    if (filters?.entityType && filters.entityType !== 'ALL') {
      query = query.eq('entity_type', filters.entityType);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    // Map nested user relation
    const mappedLogs: DbAuditLog[] = (data || []).map((item: any) => ({
      id: item.id,
      user_id: item.user_id,
      action: item.action,
      entity_type: item.entity_type,
      entity_id: item.entity_id,
      details: item.details,
      created_at: item.created_at,
      user: item.users ? {
        name: item.users.name,
        email: item.users.email,
        role: item.users.role,
      } : null,
    }));

    return { success: true, data: mappedLogs };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal memuat log audit' };
  }
}
