'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-guard';
import { logAuditEvent } from '@/actions/audit';
import { getMemoryPackedStock, deductMemoryPackedStock } from '@/actions/production';
import { format } from 'date-fns';
import { revalidatePath } from 'next/cache';
import type { DbSalesOrder, DbSalesOrderItem } from '@/types/database';

function generateBatchNumber(prefix: string): string {
  const now = new Date();
  const date = format(now, 'yyyyMMdd');
  const rand = Math.floor(Math.random() * 900) + 100;
  return `${prefix}-${date}-${rand}`;
}

function getSuggestedUnitPrice(productName: string, weight?: string): number {
  const lower = (productName || '').toLowerCase();
  const w = (weight || '').toLowerCase();
  if (lower.includes('250g') || w.includes('250')) return 35000;
  if (lower.includes('150g') || w.includes('150')) return 25000;
  if (lower.includes('100g') || w.includes('100')) return 18000;
  if (lower.includes('75g') || w.includes('75')) return 15000;
  if (lower.includes('50g') || w.includes('50')) return 10000;
  return 15000;
}

// ─────────────────────────────────────────────
// MEMORY FALLBACK FOR SALES ORDERS
// ─────────────────────────────────────────────
let memorySalesOrders: DbSalesOrder[] = [];

// ─────────────────────────────────────────────
// REAL-TIME FINISHED GOODS & SALES TRACKING TYPES
// ─────────────────────────────────────────────

export interface FinishedGoodSalesStock {
  id: string;
  product_id: string;
  sku: string;
  name: string;
  flavor: string;
  weight: string;
  packaging_type: string;
  total_packed: number;        // Total pcs dihasilkan dari proses packing
  warehouse_stock: number;     // Stok fisik di gudang produk jadi saat ini
  reserved_stock: number;      // Kuantitas dalam SO aktif (PENDING & PROCESSING)
  available_stock: number;     // Sisa stok siap jual bebas
  sold_shipped_stock: number;  // Kuantitas yang sudah dikirim / selesai
  unit_price: number;          // Estimasi harga satuan per kemasan (Rp)
  status: 'READY' | 'LOW' | 'OUT';
}

export interface SalesRealtimeTrackingSummary {
  totalFinishedGoodsStock: number; // Total pcs stok fisik siap jual di gudang
  totalOrderedPending: number;     // Total pcs dalam pesanan aktif (belum dikirim)
  availableStock: number;          // Sisa stok bebas yang siap dipesan langsung
  totalSoldShipped: number;        // Total pcs yang telah terkirim / laku
  totalRevenue: number;            // Total nilai omzet pesanan terkirim / selesai (Rp)
  activeOrdersCount: number;       // Jumlah sales order aktif (PENDING / PROCESSING)
  totalOrdersCount: number;        // Total seluruh pesanan sales order
  fulfillmentRate: number;         // Persentase pemenuhan pesanan (%)
}

export interface SalesRealtimeTrackingData {
  summary: SalesRealtimeTrackingSummary;
  productsStock: FinishedGoodSalesStock[];
}

/**
 * Mengambil ringkasan pelacakan penjualan & ketersediaan stok produk jadi hasil packing secara real-time
 */
export async function getSalesRealtimeTracking(): Promise<{
  success: boolean;
  data?: SalesRealtimeTrackingData;
  error?: string;
}> {
  try {
    await requireAuth(['SALES', 'SUPER_ADMIN', 'MANAGEMENT', 'PRODUCTION', 'WAREHOUSE', 'QC']);

    // 1. Ambil produk dari Supabase (dan fallback default)
    let productsList: any[] = [];
    try {
      const { data: prods } = await supabaseAdmin.from('products').select('*').order('name');
      if (prods && prods.length > 0) {
        productsList = prods;
      }
    } catch (err) {
      console.warn('getSalesRealtimeTracking query products fallback:', err);
    }

    // 2. Ambil inventaris produk jadi (item_type: 'PRODUCT', tidak termasuk Gudang Karantina & Afkir)
    let inventoryMap = new Map<string, number>();
    try {
      const { data: invItems } = await supabaseAdmin
        .from('inventory')
        .select('item_id, quantity, warehouse_id')
        .eq('item_type', 'PRODUCT');

      if (invItems) {
        for (const item of invItems) {
          // Jangan hitung stok dari Gudang Karantina & Afkir ke etalase penjualan
          if (item.warehouse_id === '44444444-0000-0000-0000-000000000003') continue;
          const current = inventoryMap.get(item.item_id) || 0;
          inventoryMap.set(item.item_id, current + Number(item.quantity || 0));
        }
      }
    } catch (err) {
      console.warn('getSalesRealtimeTracking query inventory fallback:', err);
    }

    // 3. Ambil data Sales Orders untuk menghitung reservasi & pengiriman
    let allOrders: DbSalesOrder[] = [];
    try {
      const { data: soData } = await supabaseAdmin
        .from('sales_orders')
        .select(`
          id, status, total_amount,
          items:sales_order_items(product_id, quantity, unit_price)
        `);
      if (soData) allOrders = soData as any[];
    } catch (err) {
      console.warn('getSalesRealtimeTracking query sales orders fallback:', err);
    }

    // Gabungkan dengan memorySalesOrders jika ada
    if (memorySalesOrders.length > 0) {
      const existingIds = new Set(allOrders.map(o => o.id));
      for (const memSo of memorySalesOrders) {
        if (!existingIds.has(memSo.id)) {
          allOrders.push(memSo);
        }
      }
    }

    // Hitung reservasi (PENDING, PROCESSING) dan terkirim (SHIPPED, COMPLETED) per product_id
    const reservedMap = new Map<string, number>();
    const soldMap = new Map<string, number>();
    let totalRevenue = 0;
    let activeOrdersCount = 0;

    for (const so of allOrders) {
      const isPending = so.status === 'PENDING' || so.status === 'PROCESSING';
      const isShipped = so.status === 'SHIPPED' || so.status === 'COMPLETED';

      if (isPending) activeOrdersCount++;
      if (isShipped && so.total_amount) totalRevenue += Number(so.total_amount);

      if (so.items && Array.isArray(so.items)) {
        for (const item of so.items) {
          const pid = item.product_id;
          const qty = Number(item.quantity || 0);

          if (isPending) {
            reservedMap.set(pid, (reservedMap.get(pid) || 0) + qty);
          } else if (isShipped) {
            soldMap.set(pid, (soldMap.get(pid) || 0) + qty);
          }
        }
      }
    }

    // 4. Integrasikan juga dari in-memory packing session
    const memoryPacked = await getMemoryPackedStock();
    for (const memItem of memoryPacked) {
      // Jika product belum ada di productsList, tambahkan
      if (!productsList.some(p => p.id === memItem.product_id)) {
        productsList.push({
          id: memItem.product_id,
          sku: memItem.sku,
          name: memItem.product_name,
          description: `KhumKhum Jamur Crispy ${memItem.flavor} ${memItem.weight} (${memItem.packaging_type})`,
        });
      }
      // Tambah ke inventoryMap jika belum tercatat di database
      const cur = inventoryMap.get(memItem.product_id) || 0;
      if (cur < memItem.quantity) {
        inventoryMap.set(memItem.product_id, memItem.quantity);
      }
    }

    // 5. Bangun rincian per produk
    const productsStock: FinishedGoodSalesStock[] = productsList.map(prod => {
      const name = prod.name || '';
      const nameLower = name.toLowerCase();

      // Ekstraksi rasa
      let flavor = 'Original';
      if (nameLower.includes('balado')) flavor = 'Balado';
      else if (nameLower.includes('bbq') || nameLower.includes('barbeque')) flavor = 'BBQ';
      else if (nameLower.includes('pedas manis')) flavor = 'Pedas Manis';
      else if (nameLower.includes('pedas ekstra') || nameLower.includes('super pedas') || nameLower.includes('pedas')) flavor = 'Super Pedas';
      else if (nameLower.includes('jagung bakar')) flavor = 'Jagung Bakar';

      // Ekstraksi berat
      let weight = '100g';
      if (nameLower.includes('50g')) weight = '50g';
      else if (nameLower.includes('75g')) weight = '75g';
      else if (nameLower.includes('150g')) weight = '150g';
      else if (nameLower.includes('250g')) weight = '250g';

      // Ekstraksi kemasan
      let packagingType = 'Standing Pouch';
      if (nameLower.includes('toples')) packagingType = 'Toples';
      else if (nameLower.includes('plastik bantal')) packagingType = 'Plastik Bantal';
      else if (nameLower.includes('dus') || nameLower.includes('box')) packagingType = 'Box / Dus';

      const warehouse_stock = inventoryMap.get(prod.id) || 0;
      const reserved_stock = reservedMap.get(prod.id) || 0;
      const sold_shipped_stock = soldMap.get(prod.id) || 0;
      const available_stock = Math.max(0, warehouse_stock - reserved_stock);
      const total_packed = warehouse_stock + sold_shipped_stock;
      const unit_price = getSuggestedUnitPrice(name, weight);

      let status: 'READY' | 'LOW' | 'OUT' = 'OUT';
      if (available_stock >= 20) status = 'READY';
      else if (available_stock > 0) status = 'LOW';

      return {
        id: prod.id,
        product_id: prod.id,
        sku: prod.sku || 'SKU-KHK',
        name,
        flavor,
        weight,
        packaging_type: packagingType,
        total_packed,
        warehouse_stock,
        reserved_stock,
        available_stock,
        sold_shipped_stock,
        unit_price,
        status,
      };
    });

    // Urutkan: yang ada stok atau baru dipacking di atas
    productsStock.sort((a, b) => b.available_stock - a.available_stock);

    // 6. Hitung ringkasan total
    const totalFinishedGoodsStock = productsStock.reduce((acc, p) => acc + p.warehouse_stock, 0);
    const totalOrderedPending = productsStock.reduce((acc, p) => acc + p.reserved_stock, 0);
    const availableStock = Math.max(0, totalFinishedGoodsStock - totalOrderedPending);
    const totalSoldShipped = productsStock.reduce((acc, p) => acc + p.sold_shipped_stock, 0);

    const fulfillmentRate =
      totalOrderedPending + totalSoldShipped > 0
        ? Math.round((totalSoldShipped / (totalOrderedPending + totalSoldShipped)) * 100)
        : 100;

    const summary: SalesRealtimeTrackingSummary = {
      totalFinishedGoodsStock,
      totalOrderedPending,
      availableStock,
      totalSoldShipped,
      totalRevenue,
      activeOrdersCount,
      totalOrdersCount: allOrders.length,
      fulfillmentRate,
    };

    return {
      success: true,
      data: {
        summary,
        productsStock,
      },
    };
  } catch (err: any) {
    console.error('getSalesRealtimeTracking error:', err);
    return { success: false, error: err.message || 'Gagal memuat pelacakan penjualan real-time' };
  }
}

// ─────────────────────────────────────────────
// GET SALES ORDERS
// ─────────────────────────────────────────────

export async function getSalesOrders(): Promise<{
  success: boolean;
  data?: DbSalesOrder[];
  error?: string;
}> {
  try {
    await requireAuth(['SALES', 'SUPER_ADMIN', 'MANAGEMENT']);

    let result: DbSalesOrder[] = [];

    const { data, error } = await supabaseAdmin
      .from('sales_orders')
      .select(`
        *,
        customer:customers(id, name, contact),
        items:sales_order_items(
          id, sales_order_id, product_id, quantity, unit_price,
          product:products(id, sku, name)
        )
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.warn('Fallback memory for getSalesOrders:', error.message);
      result = [...memorySalesOrders];
    } else {
      result = (data || []) as DbSalesOrder[];
      // Gabungkan pesanan di memory yang belum tersimpan di Supabase
      const existingIds = new Set(result.map(o => o.id));
      for (const mSo of memorySalesOrders) {
        if (!existingIds.has(mSo.id)) {
          result.unshift(mSo);
        }
      }
    }

    return { success: true, data: result };
  } catch (err: any) {
    console.error('getSalesOrders error:', err);
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────
// CREATE SALES ORDER
// ─────────────────────────────────────────────

export interface CreateSalesOrderInput {
  customer_id: string;
  location?: string;
  notes?: string;
  items: { product_id: string; quantity: number; unit_price?: number }[];
}

export async function createSalesOrder(input: CreateSalesOrderInput): Promise<{
  success: boolean;
  data?: { id: string; order_number: string };
  error?: string;
}> {
  try {
    const { user } = await requireAuth(['SALES', 'SUPER_ADMIN']);

    if (!input.customer_id) {
      return { success: false, error: 'Customer wajib dipilih' };
    }
    if (!input.items || input.items.length === 0) {
      return { success: false, error: 'Minimal 1 item pesanan produk jadi wajib dipilih' };
    }

    const order_number = generateBatchNumber('SO');
    const total_amount = input.items.reduce(
      (sum, item) => sum + Number(item.quantity) * (Number(item.unit_price) || 0),
      0
    );

    const now = new Date().toISOString();

    const { data: soData, error: soError } = await supabaseAdmin
      .from('sales_orders')
      .insert([{
        customer_id: input.customer_id,
        order_number,
        order_date: now,
        status: 'PENDING',
        location: input.location || null,
        total_amount,
        notes: input.notes || null,
        created_by: user.userId,
      }])
      .select('id, order_number')
      .single();

    let createdId = soData?.id;

    if (soError || !createdId) {
      console.warn('Fallback memory for createSalesOrder:', soError?.message);
      createdId = 'so-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);

      // Cari customer name
      const { data: cData } = await supabaseAdmin
        .from('customers')
        .select('id, name, contact')
        .eq('id', input.customer_id)
        .maybeSingle();

      const fallbackSo: DbSalesOrder = {
        id: createdId,
        customer_id: input.customer_id,
        order_number,
        order_date: now,
        status: 'PENDING',
        location: input.location || null,
        total_amount,
        notes: input.notes || null,
        created_by: user.userId,
        created_at: now,
        updated_at: now,
        customer: cData || { id: input.customer_id, name: 'Distributor KhumKhum', contact: '-' },
        items: input.items.map(it => ({
          id: 'item-' + Math.random().toString(36).substr(2, 6),
          sales_order_id: createdId!,
          product_id: it.product_id,
          quantity: Number(it.quantity),
          unit_price: Number(it.unit_price) || 0,
          subtotal: Number(it.quantity) * (Number(it.unit_price) || 0),
          created_at: now,
        })),
      };

      memorySalesOrders.unshift(fallbackSo);
    } else {
      // Insert items ke Supabase
      const itemsPayload: Partial<DbSalesOrderItem>[] = input.items.map(item => ({
        sales_order_id: createdId!,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price || 0,
        subtotal: item.quantity * (item.unit_price || 0),
      }));

      const { error: itemsError } = await supabaseAdmin
        .from('sales_order_items')
        .insert(itemsPayload);

      if (itemsError) {
        console.warn('Error inserting sales_order_items:', itemsError);
      }
    }

    await logAuditEvent({
      userId: user.userId,
      action: 'CREATE',
      entityType: 'sales_order',
      entityId: createdId,
      details: { order_number, customer_id: input.customer_id, location: input.location, items_count: input.items.length, total_amount },
    });

    revalidatePath('/sales');
    revalidatePath('/inventory');
    return { success: true, data: { id: createdId, order_number } };
  } catch (err: any) {
    console.error('createSalesOrder error:', err);
    return { success: false, error: err.message || 'Gagal membuat Sales Order' };
  }
}

// ─────────────────────────────────────────────
// UPDATE SALES ORDER STATUS (WITH REAL-TIME INVENTORY DEDUCTION)
// ─────────────────────────────────────────────

export async function updateSalesOrderStatus(
  id: string,
  status: DbSalesOrder['status']
): Promise<{ success: boolean; error?: string }> {
  try {
    const { user } = await requireAuth(['SALES', 'SUPER_ADMIN']);
    const now = new Date().toISOString();

    // ── KETIKA STATUS BERUBAH MENJADI 'SHIPPED': POTONG STOK FISIK PRODUK JADI ──
    if (status === 'SHIPPED') {
      let orderItems: { id?: string; product_id: string; quantity: number }[] = [];

      // 1. Coba ambil item dari Supabase
      const { data: dbItems } = await supabaseAdmin
        .from('sales_order_items')
        .select('id, product_id, quantity')
        .eq('sales_order_id', id);

      if (dbItems && dbItems.length > 0) {
        orderItems = dbItems;
      } else {
        // Coba ambil dari memory
        const memSo = memorySalesOrders.find(o => o.id === id);
        if (memSo?.items) {
          orderItems = memSo.items.map(it => ({
            id: it.id,
            product_id: it.product_id,
            quantity: it.quantity,
          }));
        }
      }

      // 2. Potong stok di inventory dan catat mutasi OUT
      for (const item of orderItems) {
        try {
          const { data: invItems } = await supabaseAdmin
            .from('inventory')
            .select('*')
            .eq('item_type', 'PRODUCT')
            .eq('item_id', item.product_id)
            .order('quantity', { ascending: false })
            .limit(1);

          if (invItems && invItems.length > 0) {
            const inv = invItems[0];
            const newQty = Math.max(0, Number(inv.quantity) - Number(item.quantity));

            await supabaseAdmin
              .from('inventory')
              .update({ quantity: newQty, last_updated_at: now })
              .eq('id', inv.id);

            // Record stock movement OUT dengan referensi Sales Order
            await supabaseAdmin.from('stock_movements').insert([{
              inventory_id: inv.id,
              movement_type: 'OUT',
              quantity: item.quantity,
              reference_id: id,
              reference_type: 'SALES_ORDER_SHIPMENT',
              notes: `Pengiriman pesanan Sales Order #${id.slice(0, 8).toUpperCase()} (-${item.quantity} pcs)`,
              movement_date: now,
              created_by: user.userId,
            }]);
          }

          // Sinkronisasi pengurangan pada in-memory packed stock
          await deductMemoryPackedStock(item.product_id, item.quantity);
        } catch (itemDeductErr) {
          console.warn('Failed to deduct inventory for item:', itemDeductErr);
        }
      }
    }

    // 3. Update status di Supabase
    const { error } = await supabaseAdmin
      .from('sales_orders')
      .update({ status, updated_at: now })
      .eq('id', id);

    if (error) {
      console.warn('Fallback memory for updateSalesOrderStatus:', error.message);
      const idx = memorySalesOrders.findIndex(o => o.id === id);
      if (idx !== -1) {
        memorySalesOrders[idx] = {
          ...memorySalesOrders[idx],
          status,
          updated_at: now,
        };
      }
    } else {
      // Perbarui juga di memory jika ada
      const idx = memorySalesOrders.findIndex(o => o.id === id);
      if (idx !== -1) {
        memorySalesOrders[idx].status = status;
        memorySalesOrders[idx].updated_at = now;
      }
    }

    await logAuditEvent({
      userId: user.userId,
      action: 'UPDATE',
      entityType: 'sales_order',
      entityId: id,
      details: { new_status: status },
    });

    revalidatePath('/sales');
    revalidatePath('/inventory');
    return { success: true };
  } catch (err: any) {
    console.error('updateSalesOrderStatus error:', err);
    return { success: false, error: err.message || 'Gagal mengubah status pesanan' };
  }
}

// ─────────────────────────────────────────────
// RETURN SALES ORDER (RETUR / PENGEMBALIAN)
// ─────────────────────────────────────────────

export async function returnSalesOrder(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { user } = await requireAuth(['SALES', 'SUPER_ADMIN']);
    const now = new Date().toISOString();

    // 1. Update status to 'RETURNED' in Supabase
    const { error } = await supabaseAdmin
      .from('sales_orders')
      .update({ status: 'RETURNED', updated_at: now })
      .eq('id', id);

    if (error) {
      console.warn('Fallback memory for returnSalesOrder:', error.message);
      const idx = memorySalesOrders.findIndex(o => o.id === id);
      if (idx !== -1) {
        memorySalesOrders[idx].status = 'RETURNED';
        memorySalesOrders[idx].updated_at = now;
      }
    } else {
      // Update memory if exists
      const idx = memorySalesOrders.findIndex(o => o.id === id);
      if (idx !== -1) {
        memorySalesOrders[idx].status = 'RETURNED';
        memorySalesOrders[idx].updated_at = now;
      }
    }

    await logAuditEvent({
      userId: user.userId,
      action: 'UPDATE',
      entityType: 'sales_order',
      entityId: id,
      details: { new_status: 'RETURNED', notes: 'Pesanan diretur / dikembalikan' },
    });

    revalidatePath('/sales');
    return { success: true };
  } catch (err: any) {
    console.error('returnSalesOrder error:', err);
    return { success: false, error: err.message || 'Gagal melakukan retur pesanan' };
  }
}
