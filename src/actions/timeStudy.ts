'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-guard';
import { logAuditEvent } from '@/actions/audit';
import { revalidatePath } from 'next/cache';

// ==========================================
// 1. MASTER OPERATIONS
// ==========================================

export async function getMasterOperations() {
  try {
    const { data, error } = await supabaseAdmin
      .from('master_operations')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return { success: true, data };
  } catch (err: any) {
    console.error('getMasterOperations error:', err);
    return { success: false, error: err.message };
  }
}

// ==========================================
// 2. CLOCK IN / CLOCK OUT & SESI
// ==========================================

export async function getActiveWorkerSession() {
  try {
    const { user } = await requireAuth();

    const { data, error } = await supabaseAdmin
      .from('worker_sessions')
      .select(`
        *,
        operation:master_operations(operation_name)
      `)
      .eq('worker_id', user.userId)
      .in('status', ['ACTIVE', 'PAUSED'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is not found
    return { success: true, data: data || null };
  } catch (err: any) {
    console.error('getActiveWorkerSession error:', err);
    return { success: false, error: err.message };
  }
}

export async function clockIn(operation_id: string, worker_name: string) {
  try {
    const { user } = await requireAuth();

    // Pastikan tidak ada sesi yang masih aktif
    const active = await getActiveWorkerSession();
    if (active.data) {
      throw new Error('Terminal ini masih memiliki sesi kerja yang aktif. Harap Clock Out terlebih dahulu.');
    }

    const { data, error } = await supabaseAdmin
      .from('worker_sessions')
      .insert({
        worker_id: user.userId,
        worker_name,
        operation_id,
        clock_in_time: new Date().toISOString(),
        status: 'ACTIVE'
      })
      .select()
      .single();

    if (error) throw error;
    
    await logAuditEvent({
      userId: user.userId,
      action: 'CREATE',
      entityType: 'worker_sessions',
      entityId: data.id,
      details: { operation_id }
    });

    revalidatePath('/production');
    return { success: true, data };
  } catch (err: any) {
    console.error('clockIn error:', err);
    return { success: false, error: err.message };
  }
}

export async function pauseSession(session_id: string, reason: string = 'ISTIRAHAT') {
  try {
    const { user } = await requireAuth();

    const { data: session } = await supabaseAdmin.from('worker_sessions').select('*').eq('id', session_id).single();
    if (!session || session.status !== 'ACTIVE' || session.worker_id !== user.userId) {
      throw new Error('Sesi tidak valid untuk dijeda.');
    }

    // Ubah status jadi PAUSED
    await supabaseAdmin.from('worker_sessions').update({ status: 'PAUSED' }).eq('id', session_id);

    // Catat ke session_breaks
    const { error } = await supabaseAdmin.from('session_breaks').insert({
      session_id,
      pause_start_time: new Date().toISOString(),
      reason
    });

    if (error) throw error;
    revalidatePath('/production');
    return { success: true };
  } catch (err: any) {
    console.error('pauseSession error:', err);
    return { success: false, error: err.message };
  }
}

export async function resumeSession(session_id: string) {
  try {
    const { user } = await requireAuth();

    const { data: session } = await supabaseAdmin.from('worker_sessions').select('*').eq('id', session_id).single();
    if (!session || session.status !== 'PAUSED' || session.worker_id !== user.userId) {
      throw new Error('Sesi tidak dalam status PAUSED.');
    }

    // Cari break yang belum selesai (pause_end_time IS NULL)
    const { data: activeBreak } = await supabaseAdmin
      .from('session_breaks')
      .select('*')
      .eq('session_id', session_id)
      .is('pause_end_time', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (activeBreak) {
      const endTime = new Date();
      const startTime = new Date(activeBreak.pause_start_time);
      const diffMs = endTime.getTime() - startTime.getTime();
      const durationMinutes = diffMs / (1000 * 60);

      await supabaseAdmin.from('session_breaks').update({
        pause_end_time: endTime.toISOString(),
        duration_minutes: durationMinutes
      }).eq('id', activeBreak.id);
    }

    // Ubah status ke ACTIVE
    await supabaseAdmin.from('worker_sessions').update({ status: 'ACTIVE' }).eq('id', session_id);

    revalidatePath('/production');
    return { success: true };
  } catch (err: any) {
    console.error('resumeSession error:', err);
    return { success: false, error: err.message };
  }
}

export async function clockOut(session_id: string) {
  try {
    const { user } = await requireAuth();

    const { data: session } = await supabaseAdmin.from('worker_sessions').select('*').eq('id', session_id).single();
    if (!session || session.worker_id !== user.userId) {
      throw new Error('Sesi tidak valid.');
    }

    // Jika statusnya PAUSED, resume dulu untuk menyelesaikan perhitungan jeda
    if (session.status === 'PAUSED') {
      await resumeSession(session_id);
    }

    // Hitung total paused minutes
    const { data: breaks } = await supabaseAdmin.from('session_breaks').select('duration_minutes').eq('session_id', session_id);
    const totalPausedMinutes = breaks?.reduce((acc, b) => acc + (b.duration_minutes || 0), 0) || 0;

    const endTime = new Date();
    const startTime = new Date(session.clock_in_time);
    const grossMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
    const netMinutes = grossMinutes - totalPausedMinutes;

    const { error } = await supabaseAdmin.from('worker_sessions').update({
      clock_out_time: endTime.toISOString(),
      total_paused_minutes: totalPausedMinutes,
      total_working_minutes: netMinutes,
      status: 'COMPLETED'
    }).eq('id', session_id);

    if (error) throw error;

    await logAuditEvent({
      userId: user.userId,
      action: 'UPDATE',
      entityType: 'worker_sessions',
      entityId: session_id,
      details: { netMinutes }
    });

    revalidatePath('/production');
    return { success: true };
  } catch (err: any) {
    console.error('clockOut error:', err);
    return { success: false, error: err.message };
  }
}

// ==========================================
// 3. TIME STUDY BATCH & VW_STANDARD_TIMES
// ==========================================

export async function createTimeStudyBatch({
  operation_id,
  batch_quantity,
  defect_quantity = 0,
  duration_minutes,
  temperature,
  notes
}: {
  operation_id: string;
  batch_quantity: number;
  defect_quantity?: number;
  duration_minutes: number;
  temperature?: number;
  notes?: string;
}) {
  try {
    const { user } = await requireAuth();
    
    const { data, error } = await supabaseAdmin.from('time_study_batches').insert([{
      operation_id,
      batch_quantity,
      defect_quantity,
      duration_minutes,
      temperature,
      notes,
      recorded_by: user.userId
    }]).select().single();

    if (error) throw error;
    revalidatePath('/production');
    return { success: true };
  } catch (err: any) {
    console.error('createTimeStudyBatch error:', err);
    return { success: false, error: err.message };
  }
}

export async function getStandardTimes() {
  try {
    await requireAuth(['PRODUCTION', 'QC', 'SUPER_ADMIN', 'MANAGEMENT']);

    const { data, error } = await supabaseAdmin
      .from('vw_standard_times')
      .select('*');

    if (error) throw error;
    return { success: true, data };
  } catch (err: any) {
    console.error('getStandardTimes error:', err);
    return { success: false, error: err.message };
  }
}

export async function getTimeStudyBatches(operation_id: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('time_study_batches')
      .select('*')
      .eq('operation_id', operation_id)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getHistoricalWorkerSessions() {
  try {
    const { user } = await requireAuth();
    const { data, error } = await supabaseAdmin
      .from('worker_sessions')
      .select('*, operation:master_operations(operation_name)')
      .eq('worker_id', user.userId)
      .eq('status', 'COMPLETED')
      .order('created_at', { ascending: false })
      .limit(20);
      
    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
