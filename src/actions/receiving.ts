'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-guard';
import { logAuditEvent } from '@/actions/audit';
import { sendWhatsAppMessage, formatReceivingReceiptMessage } from '@/lib/whatsapp';
import { format } from 'date-fns';
import type { DbReceiving } from '@/types/database';

function generateBatchNumber(prefix: string): string {
  const now = new Date();
  const date = format(now, 'yyyyMMdd');
  const rand = Math.floor(Math.random() * 900) + 100;
  return `${prefix}-${date}-${rand}`;
}

export async function getReceivings(): Promise<{
  success: boolean;
  data?: DbReceiving[];
  error?: string;
}> {
  try {
    await requireAuth(['WAREHOUSE', 'SUPER_ADMIN', 'MANAGEMENT', 'QC']);

    const { data, error } = await supabaseAdmin
      .from('receivings')
      .select(`
        *,
        farmer:farmers(id, name, contact, phone_number),
        received_by_user:users!receivings_received_by_fkey(id, name)
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    return { success: true, data: (data || []) as DbReceiving[] };
  } catch (err: any) {
    console.error('getReceivings error:', err);
    return { success: false, error: err.message };
  }
}

export interface CreateReceivingInput {
  farmer_id: string;
  raw_material_id: string;
  weight_sent: number;
  weight: number;
  notes?: string;
  scale_photo_url?: string;
}

export async function createReceiving(input: CreateReceivingInput): Promise<{
  success: boolean;
  data?: DbReceiving;
  error?: string;
}> {
  try {
    const { user } = await requireAuth(['WAREHOUSE', 'SUPER_ADMIN']);

    const batch_number = generateBatchNumber('RM');
    const weight_difference = input.weight - input.weight_sent;
    const diff_percentage = input.weight_sent > 0
      ? ((input.weight - input.weight_sent) / input.weight_sent) * 100
      : 0;

    const payload = {
      batch_number,
      farmer_id: input.farmer_id,
      raw_material_id: input.raw_material_id,
      weight: input.weight,
      weight_sent: input.weight_sent,
      weight_difference: parseFloat(weight_difference.toFixed(2)),
      diff_percentage: parseFloat(diff_percentage.toFixed(2)),
      scale_photo_url: input.scale_photo_url || null,
      notes: input.notes || null,
      received_by: user.userId,
      received_date: new Date().toISOString(),
      status: 'PENDING_SORTING',
    };

    const { data, error } = await supabaseAdmin
      .from('receivings')
      .insert([payload])
      .select(`
        *,
        farmer:farmers(id, name, contact, phone_number)
      `)
      .single();

    if (error) throw error;

    // Send WhatsApp notification
    if (data?.farmer?.phone_number) {
      const message = formatReceivingReceiptMessage({
        farmerName: data.farmer.name,
        batchNumber: batch_number,
        weight: input.weight,
        date: format(new Date(), 'dd/MM/yyyy HH:mm'),
      });
      await sendWhatsAppMessage({ target: data.farmer.phone_number, message });
    }

    await logAuditEvent({
      userId: user.userId,
      action: 'CREATE',
      entityType: 'receiving',
      entityId: data.id,
      details: { batch_number, weight: input.weight },
    });

    return { success: true, data: data as DbReceiving };
  } catch (err: any) {
    console.error('createReceiving error:', err);
    return { success: false, error: err.message };
  }
}
