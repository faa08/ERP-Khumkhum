/**
 * WhatsApp Gateway Helper via Fonnte API
 */

const FONNTE_API_URL = 'https://api.fonnte.com/send';
const FONNTE_TOKEN = process.env.FONNTE_TOKEN || process.env.NEXT_PUBLIC_FONNTE_TOKEN || '';

export interface SendWhatsAppParams {
  target: string; // Phone number e.g. "08123456789" or "628123456789"
  message: string;
}

/**
 * Send WhatsApp text message using Fonnte API
 */
export async function sendWhatsAppMessage({
  target,
  message,
}: SendWhatsAppParams): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    if (!FONNTE_TOKEN) {
      console.warn('⚠️ FONNTE_TOKEN not configured in environment. WhatsApp message not sent real-time.');
      return { success: true, data: { simulated: true, target, message } };
    }

    // Format phone number to clean digits
    let formattedPhone = target.replace(/[^0-9]/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '62' + formattedPhone.slice(1);
    }

    const response = await fetch(FONNTE_API_URL, {
      method: 'POST',
      headers: {
        Authorization: FONNTE_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target: formattedPhone,
        message: message,
      }),
    });

    const result = await response.json();
    return { success: result.status === true, data: result };
  } catch (err: any) {
    console.error('WhatsApp send error:', err);
    return { success: false, error: err.message || 'Gagal mengirim pesan WhatsApp' };
  }
}

/**
 * Format Nota Penerimaan Bahan Baku untuk Petani
 */
export function formatReceivingReceiptMessage(params: {
  farmerName: string;
  batchNumber: string;
  weight: number;
  date: string;
}): string {
  return (
    `*NOTA PENERIMAAN JAMUR — KHUMKHUM ERP*\n` +
    `---------------------------------------\n` +
    `Halo *${params.farmerName}*,\n` +
    `Setoran jamur segar Anda telah kami terima dengan rincian:\n\n` +
    `📦 *No. Batch:* ${params.batchNumber}\n` +
    `⚖️ *Berat Timbang Bersih:* ${params.weight.toLocaleString('id-ID')} kg\n` +
    `📅 *Tanggal Terima:* ${params.date}\n` +
    `🏢 *Lokasi:* Pabrik KhumKhum Jamur Crispy (Kulon Progo)\n\n` +
    `_Data telah terverifikasi dan masuk ke antrean sortasi/grading pabrik. Terima kasih atas kerja samanya!_`
  );
}

/**
 * Format Informasi Hasil Sortasi & Grading Jamur untuk Petani
 */
export function formatSortationSummaryMessage(params: {
  farmerName: string;
  batchNumber: string;
  gradeA: number;
  gradeB: number;
  waste: number;
}): string {
  return (
    `*INFORMASI HASIL SORTASI & MUTU JAMUR*\n` +
    `---------------------------------------\n` +
    `Halo *${params.farmerName}*,\n` +
    `Berikut hasil sortasi untuk batch *${params.batchNumber}*:\n\n` +
    `✅ *Grade A (Jamur Bersih Pilihan):* ${params.gradeA.toLocaleString('id-ID')} kg\n` +
    `⚠️ *Grade B (Cacat Ringan):* ${params.gradeB.toLocaleString('id-ID')} kg\n` +
    `❌ *Afkir / Susut Batang:* ${params.waste.toLocaleString('id-ID')} kg\n\n` +
    `_Nota pembayaran akan diproses berdasarkan bobot Grade A yang disetujui. Terima kasih!_`
  );
}
