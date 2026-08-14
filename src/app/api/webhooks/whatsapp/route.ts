import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { logAuditEvent } from '@/actions/audit';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sender = body.sender || body.from || '';
    const message = (body.message || body.text || '').trim();

    console.log(`📩 Incoming WhatsApp Webhook from ${sender}: ${message}`);

    // PRD 3.6: Check if message is a farmer harvest notification format: SETOR [KG] or LIBUR
    const upperMsg = message.toUpperCase();
    let isHarvestEstimation = false;
    let estimatedWeight = 0;
    const farmerName = 'Petani Mitra'; // In real app, query farmer name from DB by sender phone
    const harvestDate = new Date();
    harvestDate.setDate(harvestDate.getDate() + 1); // Besok
    const harvestDateStr = harvestDate.toISOString().slice(0, 10);

    const setorMatch = upperMsg.match(/^SETOR\s+(\d+(\.\d+)?)/);
    
    if (setorMatch) {
      isHarvestEstimation = true;
      estimatedWeight = parseFloat(setorMatch[1]);
    } else if (upperMsg.includes('LIBUR') || upperMsg.includes('TIDAK ADA') || upperMsg.includes('TIDAK PANEN')) {
      isHarvestEstimation = true;
      estimatedWeight = 0;
    }

    if (isHarvestEstimation) {
      // Log into audit trail
      await logAuditEvent({
        action: 'CREATE',
        entityType: 'whatsapp_harvest_bot',
        details: {
          senderPhone: sender,
          estimatedWeightKg: estimatedWeight,
          harvestDate: harvestDateStr,
        },
      });

      // Auto-reply to farmer
      let replyMessage = '';
      if (estimatedWeight > 0) {
        replyMessage = `Terima kasih Pak/Bu! Estimasi setoran *${estimatedWeight} kg* untuk jadwal besok (${harvestDateStr}) telah berhasil dicatat oleh sistem pabrik KhumKhum. 👍`;
      } else {
        replyMessage = `Baik Pak/Bu, kami telah mencatat bahwa Anda libur panen untuk jadwal besok (${harvestDateStr}). Selamat beristirahat! 🌾`;
      }

      await sendWhatsAppMessage({
        target: sender,
        message: replyMessage,
      });

      return NextResponse.json({
        success: true,
        message: 'Panen notification recorded and auto-reply sent',
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook received',
    });
  } catch (err: any) {
    console.error('WhatsApp webhook error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
