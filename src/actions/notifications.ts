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
      'PREMIX',
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
    // 3. INVENTORY & WAREHOUSE ALERTS (Stok Habis & Stok Kritis / Reorder)
    // ─────────────────────────────────────────────
    try {
      // Ambil seluruh data inventori (tidak menyertakan kolom 'uom' yang tidak ada di tabel inventory)
      const { data: invData, error: invQueryError } = await supabaseAdmin
        .from('inventory')
        .select(`
          id,
          item_id,
          item_type,
          quantity,
          reorder_point,
          last_updated_at,
          warehouse:warehouses(id, name)
        `);

      if (invQueryError) {
        console.error('Error fetching inventory for notifications:', invQueryError);
      } else if (invData && invData.length > 0) {
        const rmIds = invData.filter((i) => i.item_type === 'RAW_MATERIAL').map((i) => i.item_id);
        const prodIds = invData.filter((i) => i.item_type === 'PRODUCT').map((i) => i.item_id);

        const [rmRes, prodRes, settingsRes] = await Promise.all([
          rmIds.length > 0
            ? supabaseAdmin
                .from('raw_materials')
                .select('id, name, min_stock, rop, uom, material_category')
                .in('id', rmIds)
                .is('deleted_at', null)
            : Promise.resolve({ data: [] as any[] }),
          prodIds.length > 0
            ? supabaseAdmin
                .from('products')
                .select('id, name')
                .in('id', prodIds)
                .is('deleted_at', null)
            : Promise.resolve({ data: [] as any[] }),
          supabaseAdmin
            .from('settings')
            .select('value')
            .eq('key', 'product_rops')
            .maybeSingle(),
        ]);

        const rmMap = new Map((rmRes.data || []).map((r: any) => [r.id, r]));
        const prodMap = new Map((prodRes.data || []).map((p: any) => [p.id, p]));
        const productRops: Record<string, number> = (settingsRes.data as any)?.value || {};

        invData.forEach((inv) => {
          let itemName = '';
          let uom = 'kg';
          let rop = Number(inv.reorder_point) || 0;
          let link = '/warehouse';

          if (inv.item_type === 'RAW_MATERIAL') {
            const rm = rmMap.get(inv.item_id);
            if (!rm) return; // Item master terhapus
            itemName = rm.name || 'Bahan Baku';
            uom = rm.uom || 'kg';
            rop = rop || Number(rm.rop) || Number(rm.min_stock) || 0;
            link = '/warehouse';
          } else if (inv.item_type === 'PRODUCT') {
            const p = prodMap.get(inv.item_id);
            if (!p) return;
            itemName = p.name || 'Produk Jadi';
            uom = 'pcs';
            rop = rop || Number(productRops[inv.item_id]) || 0;
            link = '/inventory';
          } else {
            return;
          }

          const qty = Number(inv.quantity) || 0;
          const whName = (inv.warehouse as any)?.name || 'Gudang';

          // 1. OUT OF STOCK (Stok Habis / <= 0)
          if (qty <= 0) {
            notifications.push({
              id: `notif-inv-outofstock-${inv.id}`,
              title: `Stok Habis: ${itemName}`,
              message: `Stok ${itemName} di ${whName} telah HABIS (0 ${uom}). Segera lakukan order atau restock ulang.`,
              category: 'INVENTORY',
              severity: 'danger',
              link,
              timestamp: inv.last_updated_at || new Date().toISOString(),
              isActionable: true,
            });
          }
          // 2. LOW STOCK (Stok Menipis / Mencapai atau di Bawah Batas Reorder Point)
          else if (rop > 0 && qty <= rop) {
            notifications.push({
              id: `notif-inv-lowstock-${inv.id}`,
              title: `Stok Menipis: ${itemName}`,
              message: `Sisa stok ${qty.toLocaleString('id-ID')} ${uom} telah mencapai/di bawah batas aman ROP (${rop.toLocaleString('id-ID')} ${uom}) di ${whName}. Perlu di-restock.`,
              category: 'INVENTORY',
              severity: 'warning',
              link,
              timestamp: inv.last_updated_at || new Date().toISOString(),
              isActionable: true,
            });
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
      // Produksi wajib tahu status stok bahan baku, bumbu, dan kemasan selain SPK produksi
      filteredNotifications = notifications.filter(
        (n) => n.category === 'PRODUCTION' || (n.category === 'QC' && n.severity === 'danger') || n.category === 'INVENTORY'
      );
    } else if (userRole === 'WAREHOUSE') {
      filteredNotifications = notifications.filter(
        (n) => n.category === 'INVENTORY' || n.category === 'RECEIVING' || n.category === 'SYSTEM'
      );
    } else if (userRole === 'SALES') {
      filteredNotifications = notifications.filter((n) => n.category === 'SALES' || n.category === 'INVENTORY');
    } else if (userRole === 'PREMIX') {
      filteredNotifications = notifications.filter(
        (n) => n.category === 'INVENTORY' || n.category === 'PRODUCTION'
      );
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
