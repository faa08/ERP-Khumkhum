/**
 * WhatsApp Gateway Helper via Fonnte API & Direct WhatsApp URL
 *
 * Revisi Developer 1:
 * - Outbound inquiry ketersediaan stok dari KhumKhum ke petani
 * - Nota timbang penerimaan tetap dikirim
 * - Auto-blast sortasi/grading di-deprecate (tidak dipakai lagi)
 */

import type { FarmerType } from '@/types/database';

const FONNTE_API_URL = 'https://api.fonnte.com/send';
const FONNTE_TOKEN = process.env.FONNTE_TOKEN || process.env.NEXT_PUBLIC_FONNTE_TOKEN || '';

export interface SendWhatsAppParams {
  target: string; // Phone number e.g. "08123456789" or "628123456789"
  message: string;
}

// ─────────────────────────────────────────────
// PHONE FORMATTING
// ─────────────────────────────────────────────

/**
 * Format nomor telepon ke standar internasional 62...
 */
export function formatPhoneNumberTo62(target: string): string {
  let formatted = target.replace(/[^0-9]/g, '');
  if (formatted.startsWith('0')) {
    formatted = '62' + formatted.slice(1);
  }
  return formatted;
}

/**
 * Generate link direct WhatsApp (wa.me/...).
 * Fallback 1-klik jika API Fonnte tidak aktif / habis kuota.
 */
export function getWhatsAppDirectUrl(target: string, message: string): string {
  const phone = formatPhoneNumberTo62(target);
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

// ─────────────────────────────────────────────
// SEND MESSAGE VIA FONNTE
// ─────────────────────────────────────────────

/**
 * Send WhatsApp text message using Fonnte API
 */
export async function sendWhatsAppMessage({
  target,
  message,
}: SendWhatsAppParams): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    if (!FONNTE_TOKEN) {
      console.warn('FONNTE_TOKEN not configured. WhatsApp message not sent.');
      return { success: true, data: { simulated: true, target, message } };
    }

    const formattedPhone = formatPhoneNumberTo62(target);

    const response = await fetch(FONNTE_API_URL, {
      method: 'POST',
      headers: {
        Authorization: FONNTE_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target: formattedPhone,
        message,
      }),
    });

    const result = await response.json();
    return { success: result.status === true, data: result };
  } catch (err: any) {
    console.error('WhatsApp send error:', err);
    return { success: false, error: err.message || 'Gagal mengirim pesan WhatsApp' };
  }
}

// ─────────────────────────────────────────────
// MESSAGE TEMPLATES
// ─────────────────────────────────────────────

/**
 * Pesan Tanya Ketersediaan Panen dari KhumKhum ke Petani.
 * Dibedakan antara Petani Sekitar (harian, kecil) dan Mitra Besar (terjadwal, besar).
 */
export function formatStockInquiryMessage(params: {
  farmerName: string;
  farmerType?: FarmerType;
  targetDate?: string;
}): string {
  const dateStr = params.targetDate || 'hari ini';

  if (params.farmerType === 'MITRA_BESAR') {
    return (
      `*INFORMASI RENCANA PASOKAN JAMUR — KHUMKHUM*\n` +
      `-------------------------------------------\n` +
      `Selamat pagi/siang Bapak/Ibu *${params.farmerName}*,\n\n` +
      `Sehubungan dengan target produksi pabrik KhumKhum untuk jadwal *${dateStr}*, kami ingin menanyakan alokasi dan ketersediaan stok jamur tiram segar dari kebun kemitraan Anda.\n\n` +
      `Mohon informasikan estimasi kuantitas (kg) dan kesiapan jadwal pengiriman/penjemputan. Terima kasih atas kerja samanya!`
    );
  }

  return (
    `*TANYA KETERSEDIAAN JAMUR — KHUMKHUM*\n` +
    `---------------------------------------\n` +
    `Halo Bapak/Ibu *${params.farmerName}*,\n\n` +
    `Kami dari pabrik KhumKhum ingin menanyakan, apakah ada panen jamur tiram segar untuk jadwal *${dateStr}*?\n\n` +
    `Kira-kira ada perkiraan berapa kg yang siap disetor ke pabrik? Terima kasih!`
  );
}

/**
 * Nota Penerimaan Bahan Baku untuk Petani (tetap aktif).
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
    `*No. Batch:* ${params.batchNumber}\n` +
    `*Berat Timbang Bersih:* ${params.weight.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg\n` +
    `*Tanggal Terima:* ${params.date}\n` +
    `*Lokasi:* Pabrik KhumKhum Jamur Crispy (Kulon Progo)\n\n` +
    `_Data telah terverifikasi dan masuk ke antrean sortasi pabrik. Terima kasih!_`
  );
}

/**
 * @deprecated Sesuai PRD Revisi Developer 1 — pesan rincian sortasi/grading ke petani dinonaktifkan.
 * Fungsi ini dipertahankan agar kode lama yang belum dibersihkan tidak error,
 * tetapi TIDAK BOLEH dipanggil lagi dari fitur manapun.
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
    `*Grade A (Jamur Bersih Pilihan):* ${params.gradeA.toLocaleString('id-ID')} kg\n` +
    `*Grade B (Cacat Ringan):* ${params.gradeB.toLocaleString('id-ID')} kg\n` +
    `*Afkir / Susut Batang:* ${params.waste.toLocaleString('id-ID')} kg\n\n` +
    `_Nota pembayaran akan diproses berdasarkan bobot Grade A yang disetujui. Terima kasih!_`
  );
}
