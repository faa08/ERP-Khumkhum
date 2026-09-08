import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { logAuditEvent } from '@/actions/audit';

/**
 * WhatsApp Webhook — Fonnte Inbound
 *
 * Revisi Developer 1:
 * - Tidak memaksakan format kaku (SETOR [KG], LIBUR).
 * - Tidak membuat antrean forecast palsu ke PPIC.
 * - Cukup log pesan masuk dan balas santai jika nomor petani terdaftar.
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
      // Petani terdaftar — balas santai informatif
      replyMessage =
        `Halo Pak/Bu ${farmer.name}, chat/info setoran jamur Anda telah kami terima. ` +
        `Tim gudang KhumKhum akan memproses penimbangan saat jamur fisik tiba di pabrik. Terima kasih!`;
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
