import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const now = new Date();

    // 1. Ambil data Gudang yang memiliki pic terhubung
    const { data: warehouses, error: warehouseError } = await supabaseAdmin
      .from('warehouses')
      .select(`
        id,
        name,
        pic_id,
        warehouse_pics (
          id,
          name,
          phone_number,
          next_reminder_datetime
        )
      `)
      .not('pic_id', 'is', null);

    if (warehouseError) {
      console.error('Error fetching warehouses:', warehouseError);
      return NextResponse.json({ success: false, error: 'Failed to fetch warehouses' }, { status: 500 });
    }

    if (!warehouses || warehouses.length === 0) {
      return NextResponse.json({ success: true, message: 'No warehouses with valid PIC found.' });
    }

    // 2. Kirim pesan WA dan jadwalkan ulang ke bulan depan
    const sendResults = [];
    for (const warehouse of warehouses) {
      const pic = warehouse.warehouse_pics as any;
      if (pic && pic.phone_number && pic.next_reminder_datetime) {
        const reminderTime = new Date(pic.next_reminder_datetime);
        
        // Jika waktu pengingat sudah lewat atau tepat sekarang
        if (reminderTime.getTime() <= now.getTime()) {
          const formattedDate = new Intl.DateTimeFormat('id-ID', { dateStyle: 'full' }).format(now);
          const message = `*REMINDER STOCK OPNAME*\n\nHalo ${pic.name || 'PIC'},\n\nIni adalah pengingat otomatis bahwa jadwal *Stock Opname bulanan* untuk gudang *${warehouse.name}* telah tiba (${formattedDate}). Mohon segera persiapkan pengecekan stok fisik di gudang.\n\n_Pesan otomatis dari KhumKhum ERP_`;
          
          const result = await sendWhatsAppMessage({
            target: pic.phone_number,
            message,
          });
          
          sendResults.push({ warehouse: warehouse.name, success: result.success });
          
          // Setelah dikirim (berhasil/gagal), majukan jadwal ke bulan berikutnya
          const nextMonth = new Date(reminderTime);
          nextMonth.setMonth(nextMonth.getMonth() + 1);
          
          await supabaseAdmin
            .from('warehouse_pics')
            .update({ next_reminder_datetime: nextMonth.toISOString() })
            .eq('id', pic.id);
        }
      }
    }

    return NextResponse.json({ success: true, processed: sendResults.length, results: sendResults });

  } catch (error: any) {
    console.error('Cron stock reminder error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
