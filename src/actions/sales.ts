'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-guard';
import { logAuditEvent } from '@/actions/audit';
import { format } from 'date-fns';
import type { DbSalesOrder, DbSalesOrderItem } from '@/types/database';

function generateBatchNumber(prefix: string): string {
  const now = new Date();
  const date = format(now, 'yyyyMMdd');
  const rand = Math.floor(Math.random() * 900) + 100;
  return `${prefix}-${date}-${rand}`;
}

export async function getSalesOrders(): Promise<{
  success: boolean;
  data?: DbSalesOrder[];
  error?: string;
}> {
  try {
    await requireAuth(['SALES', 'SUPER_ADMIN', 'MANAGEMENT']);

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

    if (error) throw error;

    return { success: true, data: (data || []) as DbSalesOrder[] };
  } catch (err: any) {
    console.error('getSalesOrders error:', err);
    return { success: false, error: err.message };
  }
}

export interface CreateSalesOrderInput {
  customer_id: string;
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

    const order_number = generateBatchNumber('SO');
    const total_amount = input.items.reduce(
      (sum, item) => sum + item.quantity * (item.unit_price || 0),
      0
    );

    const { data: soData, error: soError } = await supabaseAdmin
      .from('sales_orders')
      .insert([{
        customer_id: input.customer_id,
        order_number,
        order_date: new Date().toISOString(),
        status: 'PENDING',
        total_amount,
        notes: input.notes || null,
        created_by: user.userId,
      }])
      .select('id, order_number')
      .single();

    if (soError) throw soError;

    // Insert items
    if (input.items.length > 0) {
      const itemsPayload: Partial<DbSalesOrderItem>[] = input.items.map(item => ({
        sales_order_id: soData.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price || 0,
        subtotal: item.quantity * (item.unit_price || 0),
      }));

      const { error: itemsError } = await supabaseAdmin
        .from('sales_order_items')
        .insert(itemsPayload);

      if (itemsError) throw itemsError;
    }

    await logAuditEvent({
      userId: user.userId,
      action: 'CREATE',
      entityType: 'sales_order',
      entityId: soData.id,
      details: { order_number, customer_id: input.customer_id, items_count: input.items.length },
    });

    return { success: true, data: { id: soData.id, order_number: soData.order_number } };
  } catch (err: any) {
    console.error('createSalesOrder error:', err);
    return { success: false, error: err.message };
  }
}

export async function updateSalesOrderStatus(
  id: string,
  status: DbSalesOrder['status']
): Promise<{ success: boolean; error?: string }> {
  try {
    const { user } = await requireAuth(['SALES', 'SUPER_ADMIN']);

    // If marking as SHIPPED, deduct stock from inventory
    if (status === 'SHIPPED') {
      const { data: orderItems } = await supabaseAdmin
        .from('sales_order_items')
        .select('id, product_id, quantity')
        .eq('sales_order_id', id);

      const now = new Date().toISOString();

      for (const item of (orderItems || [])) {
        // Find inventory for this product
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

          // Record stock movement OUT
          await supabaseAdmin.from('stock_movements').insert([{
            inventory_id: inv.id,
            movement_type: 'OUT',
            quantity: item.quantity,
            reference_id: id,
            reference_type: 'SALES_ORDER_SHIPMENT',
            notes: `Pengiriman sales order`,
            movement_date: now,
            created_by: user.userId,
          }]);
        }
      }
    }

    const { error } = await supabaseAdmin
      .from('sales_orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;

    await logAuditEvent({
      userId: user.userId,
      action: 'UPDATE',
      entityType: 'sales_order',
      entityId: id,
      details: { new_status: status },
    });

    const { revalidatePath } = await import('next/cache');
    revalidatePath('/sales');
    revalidatePath('/inventory');

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
