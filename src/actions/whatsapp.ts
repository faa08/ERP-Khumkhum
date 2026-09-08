'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { DbWhatsAppMessage } from '@/types/database';

export async function getRecentFarmerMessages(limit: number = 20) {
  try {
    const { data, error } = await supabaseAdmin
      .from('whatsapp_messages')
      .select('*, farmer:farmers(id, name)')
      .eq('direction', 'INBOUND')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    
    // Group messages by farmer
    const grouped = (data as DbWhatsAppMessage[]).reduce((acc, msg) => {
      const farmerId = msg.farmer_id || msg.phone_number;
      if (!acc[farmerId]) {
        acc[farmerId] = [];
      }
      acc[farmerId].push(msg);
      return acc;
    }, {} as Record<string, DbWhatsAppMessage[]>);

    // Get only the most recent message per farmer
    const recentMessages = Object.values(grouped).map(msgs => msgs[0]);

    return { success: true, data: recentMessages };
  } catch (err: any) {
    console.error('getRecentFarmerMessages error:', err);
    return { success: false, error: err.message };
  }
}

export async function getUnreadMessagesCount() {
  try {
    const { count, error } = await supabaseAdmin
      .from('whatsapp_messages')
      .select('*', { count: 'exact', head: true })
      .eq('direction', 'INBOUND')
      .eq('status', 'UNREAD');

    if (error) throw error;
    return { success: true, data: count || 0 };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function markMessagesAsRead(farmerIdOrPhone: string) {
  try {
    // We update based on farmer_id if it's a UUID, else by phone
    const query = supabaseAdmin.from('whatsapp_messages').update({ status: 'READ' }).eq('status', 'UNREAD');
    
    if (farmerIdOrPhone.includes('-')) {
      query.eq('farmer_id', farmerIdOrPhone);
    } else {
      query.eq('phone_number', farmerIdOrPhone);
    }

    const { error } = await query;
    if (error) throw error;

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getChatHistory(farmerIdOrPhone: string, limit: number = 50) {
  try {
    const query = supabaseAdmin
      .from('whatsapp_messages')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(limit);
      
    if (farmerIdOrPhone.includes('-')) {
      query.eq('farmer_id', farmerIdOrPhone);
    } else {
      query.eq('phone_number', farmerIdOrPhone);
    }

    const { data, error } = await query;
    if (error) throw error;

    return { success: true, data: data as DbWhatsAppMessage[] };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
