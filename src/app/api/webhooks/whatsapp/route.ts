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
      // 1. Find the farmer based on sender phone
      const cleanPhone = sender.replace(/[^0-9]/g, '');
      const phoneSuffix = cleanPhone.length > 8 ? cleanPhone.slice(-8) : cleanPhone;
      
      const { data: farmers } = await supabaseAdmin
        .from('farmers')
        .select('id, name')
        .ilike('phone_number', `%${phoneSuffix}%`)
        .limit(1);

      const farmer = farmers?.[0];
      let replyMessage = '';

      if (farmer) {
        // 2. Insert actual data into the PPIC schedule table!
        await supabaseAdmin.from('farmer_harvest_estimates').insert([{
           farmer_id: farmer.id,
           expected_date: harvestDateStr,
           estimated_kg: estimatedWeight,
           source: 'WA_BOT'
        }]);

        // 3. Log into audit trail
        await logAuditEvent({
          action: 'CREATE',
          entityType: 'whatsapp_harvest_bot',
          details: {
            senderPhone: sender,
            farmerName: farmer.name,
            estimatedWeightKg: estimatedWeight,
            harvestDate: harvestDateStr,
          },
        });

        // 4. Set Success auto-reply
        if (estimatedWeight > 0) {
          replyMessage = `Terima kasih Pak/Bu ${farmer.name}! Estimasi setoran *${estimatedWeight} kg* untuk jadwal besok (${harvestDateStr}) telah berhasil dicatat oleh sistem PPIC pabrik KhumKhum. 👍`;
        } else {
          replyMessage = `Baik Pak/Bu ${farmer.name}, kami telah mencatat bahwa Anda libur panen untuk jadwal besok (${harvestDateStr}). Selamat beristirahat! 🌾`;
        }
      } else {
        // Farmer not found in database
        replyMessage = `Maaf, nomor WhatsApp ini belum terdaftar sebagai Petani Mitra di sistem pabrik KhumKhum. Mohon hubungi staf Gudang untuk pendaftaran.`;
        
        await logAuditEvent({
          action: 'REJECT',
          entityType: 'whatsapp_harvest_bot',
          details: { senderPhone: sender, reason: 'Unregistered number' },
        });
      }

      await sendWhatsAppMessage({
        target: sender,
        message: replyMessage,
      });

      return NextResponse.json({
        success: true,
        message: 'Panen notification processed',
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
