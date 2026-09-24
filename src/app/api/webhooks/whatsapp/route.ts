import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { logAuditEvent } from '@/actions/audit';

import { parseFarmerMessage } from '@/lib/ai-parser';

/**
 * WhatsApp Webhook — Fonnte Inbound
 *
 * Revisi Hybrid AI-Human:
 * - Menggunakan AI NLP (Gemini) untuk memparsing teks bebas / foto dari petani
 * - Membuat draf estimasi kedatangan secara otomatis
 * - Membalas luwes menggunakan response dari AI
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sender = body.sender || body.from || '';
    const message = (body.message || body.text || '').trim();

    console.log(`Incoming WhatsApp Webhook from ${sender}: ${message}`);

    // Bersihkan nomor pengirim untuk dicocokkan ke database
    const cleanPhone = sender.replace(/[^0-9]/g, '');
    const phoneSuffix = cleanPhone.length > 8 ? cleanPhone.slice(-8) : cleanPhone;

    // Cari petani berdasarkan nomor HP
    const { data: farmers } = await supabaseAdmin
      .from('farmers')
      .select('id, name, farmer_type')
      .ilike('phone_number', `%${phoneSuffix}%`)
      .limit(1);

    const farmer = farmers?.[0];

    // Log pesan masuk ke audit trail
    await logAuditEvent({
      action: 'CREATE',
      entityType: 'whatsapp_inbound',
      details: {
        senderPhone: sender,
        farmerName: farmer?.name || null,
        farmerId: farmer?.id || null,
        messagePreview: message.slice(0, 200),
      },
    });

    // Simpan pesan INBOUND ke tabel whatsapp_messages
    await supabaseAdmin.from('whatsapp_messages').insert({
      farmer_id: farmer?.id || null,
      phone_number: sender,
      message: message,
      direction: 'INBOUND',
      status: 'UNREAD'
    });

    let replyMessage: string;

    if (farmer) {
      // Parse pesan dengan AI
      const aiResult = await parseFarmerMessage(message);
      
      // Jika AI mendeteksi ini adalah estimasi kirim, buat draft di DB
      if (aiResult.intent === 'ESTIMATE') {
        const todayStr = new Date().toISOString().split('T')[0];
        
        await supabaseAdmin.from('farmer_harvest_estimates').insert({
          farmer_id: farmer.id,
          expected_date: todayStr,
          estimated_kg: aiResult.weight_kg || 0, // 0 jika AI tidak nemu angka/hanya foto
          source: 'WA_BOT',
        });
        
        console.log(`Created draft estimate for ${farmer.name}: ${aiResult.weight_kg} kg`);
      }
      
      replyMessage = aiResult.suggested_reply;
    } else {
      // Nomor tidak dikenal — balas ramah
      replyMessage =
        `Halo, terima kasih telah menghubungi KhumKhum Jamur Crispy. ` +
        `Nomor Anda belum terdaftar di sistem kami. Silakan hubungi staf gudang untuk pendaftaran. Terima kasih!`;
    }

    // Kirim balasan WhatsApp
    await sendWhatsAppMessage({
      target: sender,
      message: replyMessage,
    });

    // Simpan pesan OUTBOUND (balasan sistem) ke tabel whatsapp_messages
    await supabaseAdmin.from('whatsapp_messages').insert({
      farmer_id: farmer?.id || null,
      phone_number: sender,
      message: replyMessage,
      direction: 'OUTBOUND',
      status: 'PROCESSED'
    });

    return NextResponse.json({
      success: true,
      message: 'Webhook processed',
    });
  } catch (err: any) {
    console.error('WhatsApp webhook error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
