'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-guard';
import type { AppNotification } from '@/types/notification';

export async function getAppNotifications(): Promise<{
  success: boolean;
  data: AppNotification[];
  error?: string;
}> {
  try {
    const session = await requireAuth([
      'SUPER_ADMIN',
      'MANAGEMENT',
      'QC',
      'PRODUCTION',
      'WAREHOUSE',
      'SALES',
      'SORTING',
      'FARMER',
    ]);

    const userRole = session.user.role;
    const notifications: AppNotification[] = [];

    // ─────────────────────────────────────────────
    // 1. QUALITY CONTROL (QC) ALERTS
    // ─────────────────────────────────────────────
    try {
      const { data: pendingOrders } = await supabaseAdmin
        .from('production_orders')
        .select('id, batch_number, status, product_variant, anomaly_reason, notes, updated_at, created_at')
        .in('status', ['QC_PENDING', 'REWORK'])
        .order('updated_at', { ascending: false })
        .limit(5);

      if (pendingOrders && pendingOrders.length > 0) {
        pendingOrders.forEach((order) => {
          if (order.status === 'QC_PENDING') {
            notifications.push({
              id: `notif-qc-pending-${order.id}`,
              title: `SPK ${order.batch_number} Menunggu Uji QC`,
              message: `Batch kemasan ${order.product_variant || 'Jamur Crispy'} siap untuk pengambilan sampling organoleptik & uji seal mutu.`,
              category: 'QC',
              severity: 'warning',
              link: '/quality-control',
              timestamp: order.updated_at || order.created_at || new Date().toISOString(),
              isActionable: true,
            });
          } else if (order.status === 'REWORK') {
            notifications.push({
              id: `notif-qc-rework-${order.id}`,
              title: `Instruksi REWORK: SPK ${order.batch_number}`,
              message: order.anomaly_reason || order.notes || 'Batch perlu diperbaiki sebelum dapat dirilis ke penjualan.',
              category: 'QC',
              severity: 'danger',
              link: '/quality-control',
              timestamp: order.updated_at || order.created_at || new Date().toISOString(),
              isActionable: true,
            });
          }
        });
      }
    } catch (qcErr) {
      console.warn('Gagal memuat QC notifications:', qcErr);
    }

    // ─────────────────────────────────────────────
    // 2. PRODUCTION ALERTS (Longsong Belum Packing)
    // ─────────────────────────────────────────────
    try {
      const [fryingRes, packingRes] = await Promise.all([
        supabaseAdmin
          .from('production_frying_batches')
          .select('longsong_count, finished_at, output_weight_gram')
          .gt('longsong_count', 0),
        supabaseAdmin
          .from('production_packing_entries')
          .select('id, is_packed')
          .eq('is_packed', true),
      ]);

      const totalProducedLongsong = (fryingRes.data || [])
        .filter((b: any) => b.finished_at || (b.output_weight_gram && b.output_weight_gram > 0))
        .reduce((sum: number, b: any) => sum + (Number(b.longsong_count) || 0), 0);

      const totalPackedLongsong = (packingRes.data || []).length;
      const unpackedCount = Math.max(0, totalProducedLongsong - totalPackedLongsong);

      if (unpackedCount > 0) {
        notifications.push({
          id: 'notif-production-unpacked-longsong',
          title: `${unpackedCount} Longsong Hasil Goreng Belum Dipacking`,
          message: 'Segera lakukan pembumbuan dan packing toples agar kerenyahan dan mutu jamur crispy tetap terjaga.',
          category: 'PRODUCTION',
          severity: 'warning',
          link: '/production',
          timestamp: new Date().toISOString(),
          isActionable: true,
        });
      }
    } catch (prodErr) {
      console.warn('Gagal memuat Production notifications:', prodErr);
    }

    // ─────────────────────────────────────────────
    // 3. INVENTORY & WAREHOUSE ALERTS (Stok Kritis)
    // ─────────────────────────────────────────────
    try {
      const { data: invData } = await supabaseAdmin
        .from('inventory')
        .select(`
          id,
          item_id,
          item_type,
          quantity,
          uom,
          last_updated_at,
          warehouse:warehouses(name)
        `)
        .order('quantity', { ascending: true })
        .limit(20);

      if (invData && invData.length > 0) {
        const rmIds = invData.filter((i) => i.item_type === 'RAW_MATERIAL').map((i) => i.item_id);
        const { data: rmData } = await supabaseAdmin
          .from('raw_materials')
          .select('id, name, min_stock, rop')
          .in('id', rmIds);

        const rmMap = new Map((rmData || []).map((r) => [r.id, r]));

        invData.forEach((inv) => {
          if (inv.item_type === 'RAW_MATERIAL') {
            const rm = rmMap.get(inv.item_id);
            const minStock = rm?.min_stock ?? 20; // default 20 kg threshold
            if (Number(inv.quantity) <= minStock) {
              const itemName = rm?.name || 'Bahan Baku';
              notifications.push({
                id: `notif-inv-critical-${inv.id}`,
                title: `Stok Kritis: ${itemName}`,
                message: `Sisa stok ${Number(inv.quantity).toLocaleString('id-ID')} ${inv.uom || 'kg'} di bawah batas minimum (${minStock} ${inv.uom || 'kg'}).`,
                category: 'INVENTORY',
                severity: 'danger',
                link: '/inventory',
                timestamp: inv.last_updated_at || new Date().toISOString(),
                isActionable: true,
              });
            }
          }
        });
      }
    } catch (invErr) {
      console.warn('Gagal memuat Inventory notifications:', invErr);
    }

    // ─────────────────────────────────────────────
    // 4. INBOUND RECEIVING ALERTS (Draft WA Inbound)
    // ─────────────────────────────────────────────
    try {
      const { data: inboundWa } = await supabaseAdmin
        .from('whatsapp_inbound_messages')
        .select('id, sender_phone, received_at, status')
        .eq('status', 'PENDING')
        .order('received_at', { ascending: false })
        .limit(3);

      if (inboundWa && inboundWa.length > 0) {
        notifications.push({
          id: 'notif-receiving-wa-pending',
          title: `${inboundWa.length} Draft Kiriman Petani Menunggu Verifikasi`,
          message: 'Terdapat pesan pemberitahuan kiriman jamur via WhatsApp yang siap diproses penimbangan di pos receiving.',
          category: 'RECEIVING',
          severity: 'info',
          link: '/receiving',
          timestamp: inboundWa[0].received_at || new Date().toISOString(),
          isActionable: true,
        });
      }
    } catch (recErr) {
      console.warn('Gagal memuat Receiving notifications:', recErr);
    }

    // ─────────────────────────────────────────────
    // 5. ROLE-BASED FILTERING
    // ─────────────────────────────────────────────
    let filteredNotifications: AppNotification[] = [];

    if (userRole === 'SUPER_ADMIN' || userRole === 'MANAGEMENT') {
      // Manajemen / Investor dan Super Admin menerima seluruh alert pabrik
      filteredNotifications = notifications;
    } else if (userRole === 'QC') {
      filteredNotifications = notifications.filter((n) => n.category === 'QC' || n.category === 'SYSTEM');
    } else if (userRole === 'PRODUCTION') {
      filteredNotifications = notifications.filter(
        (n) => n.category === 'PRODUCTION' || (n.category === 'QC' && n.severity === 'danger')
      );
    } else if (userRole === 'WAREHOUSE') {
      filteredNotifications = notifications.filter(
        (n) => n.category === 'INVENTORY' || n.category === 'RECEIVING'
      );
    } else if (userRole === 'SALES') {
      filteredNotifications = notifications.filter((n) => n.category === 'SALES' || n.category === 'INVENTORY');
    } else {
      filteredNotifications = notifications;
    }

    // Urutkan berdasarkan tingkat urgensi (danger -> warning -> info -> success) lalu waktu terbaru
    const severityWeight: Record<string, number> = {
      danger: 3,
      warning: 2,
      info: 1,
      success: 0,
    };

    filteredNotifications.sort((a, b) => {
      const weightDiff = (severityWeight[b.severity] || 0) - (severityWeight[a.severity] || 0);
      if (weightDiff !== 0) return weightDiff;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    return { success: true, data: filteredNotifications };
  } catch (err: any) {
    console.error('getAppNotifications error:', err);
    return { success: false, data: [], error: err.message || 'Gagal memuat notifikasi' };
  }
}
