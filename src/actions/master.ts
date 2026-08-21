'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-guard';
import { logAuditEvent } from '@/actions/audit';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import type {
  DbFarmer,
  DbProduct,
  DbRawMaterial,
  DbCustomer,
  DbWarehouse,
  DbWarehousePic,
} from '@/types/database';

// ─────────────────────────────────────────────
// FARMERS
// ─────────────────────────────────────────────

export async function getFarmers(): Promise<{ success: boolean; data?: DbFarmer[]; error?: string }> {
  try {
    await requireAuth(['WAREHOUSE', 'SUPER_ADMIN', 'QC', 'MANAGEMENT']);
    const { data, error } = await supabaseAdmin
      .from('farmers')
      .select('*')
      .order('name');
    if (error) throw error;
    return { success: true, data: data as DbFarmer[] };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createFarmer(input: Partial<DbFarmer>): Promise<{ success: boolean; data?: DbFarmer; error?: string }> {
  try {
    const { user } = await requireAuth(['WAREHOUSE', 'SUPER_ADMIN']);
    const { data, error } = await supabaseAdmin
      .from('farmers')
      .insert([input])
      .select()
      .single();
    if (error) throw error;
    
    await logAuditEvent({
      userId: user.userId,
      action: 'CREATE',
      entityType: 'farmer',
      entityId: data.id,
      details: { name: input.name },
    });
    return { success: true, data: data as DbFarmer };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateFarmer(id: string, input: Partial<DbFarmer>): Promise<{ success: boolean; data?: DbFarmer; error?: string }> {
  try {
    const { user } = await requireAuth(['WAREHOUSE', 'SUPER_ADMIN']);
    const { data, error } = await supabaseAdmin
      .from('farmers')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    await logAuditEvent({
      userId: user.userId,
      action: 'UPDATE',
      entityType: 'farmer',
      entityId: id,
    });
    return { success: true, data: data as DbFarmer };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteFarmer(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { user } = await requireAuth(['SUPER_ADMIN']); // Only admin can delete typically
    const { error } = await supabaseAdmin
      .from('farmers')
      .delete()
      .eq('id', id);
    if (error) throw error;

    await logAuditEvent({
      userId: user.userId,
      action: 'DELETE',
      entityType: 'farmer',
      entityId: id,
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────
// PRODUCTS
// ─────────────────────────────────────────────

export async function getProducts(): Promise<{ success: boolean; data?: DbProduct[]; error?: string }> {
  try {
    await requireAuth(['WAREHOUSE', 'SUPER_ADMIN', 'MANAGEMENT']);
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .order('name');
    if (error) throw error;
    return { success: true, data: data as DbProduct[] };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createProduct(input: Partial<DbProduct>): Promise<{ success: boolean; data?: DbProduct; error?: string }> {
  try {
    const { user } = await requireAuth(['WAREHOUSE', 'SUPER_ADMIN']);
    const { data, error } = await supabaseAdmin
      .from('products')
      .insert([input])
      .select()
      .single();
    if (error) throw error;
    
    await logAuditEvent({
      userId: user.userId,
      action: 'CREATE',
      entityType: 'product',
      entityId: data.id,
      details: { sku: input.sku, name: input.name },
    });
    return { success: true, data: data as DbProduct };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateProduct(id: string, input: Partial<DbProduct>): Promise<{ success: boolean; data?: DbProduct; error?: string }> {
  try {
    const { user } = await requireAuth(['WAREHOUSE', 'SUPER_ADMIN']);
    const { data, error } = await supabaseAdmin
      .from('products')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    await logAuditEvent({
      userId: user.userId,
      action: 'UPDATE',
      entityType: 'product',
      entityId: id,
    });
    return { success: true, data: data as DbProduct };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteProduct(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { user } = await requireAuth(['SUPER_ADMIN']);
    const { error } = await supabaseAdmin
      .from('products')
      .delete()
      .eq('id', id);
    if (error) throw error;

    await logAuditEvent({
      userId: user.userId,
      action: 'DELETE',
      entityType: 'product',
      entityId: id,
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────
// RAW MATERIALS
// ─────────────────────────────────────────────

export async function getRawMaterials(): Promise<{ success: boolean; data?: DbRawMaterial[]; error?: string }> {
  try {
    await requireAuth(['WAREHOUSE', 'SUPER_ADMIN', 'QC', 'MANAGEMENT']);
    const { data, error } = await supabaseAdmin
      .from('raw_materials')
      .select('*')
      .order('name');
    if (error) throw error;
    return { success: true, data: data as DbRawMaterial[] };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createRawMaterial(input: Partial<DbRawMaterial>): Promise<{ success: boolean; data?: DbRawMaterial; error?: string }> {
  try {
    const { user } = await requireAuth(['WAREHOUSE', 'SUPER_ADMIN']);
    const { data, error } = await supabaseAdmin
      .from('raw_materials')
      .insert([input])
      .select()
      .single();
    if (error) throw error;
    
    await logAuditEvent({
      userId: user.userId,
      action: 'CREATE',
      entityType: 'raw_material',
      entityId: data.id,
      details: { code: input.code, name: input.name },
    });
    return { success: true, data: data as DbRawMaterial };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateRawMaterial(id: string, input: Partial<DbRawMaterial>): Promise<{ success: boolean; data?: DbRawMaterial; error?: string }> {
  try {
    const { user } = await requireAuth(['WAREHOUSE', 'SUPER_ADMIN']);
    const { data, error } = await supabaseAdmin
      .from('raw_materials')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    await logAuditEvent({
      userId: user.userId,
      action: 'UPDATE',
      entityType: 'raw_material',
      entityId: id,
    });
    return { success: true, data: data as DbRawMaterial };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteRawMaterial(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { user } = await requireAuth(['SUPER_ADMIN']);
    const { error } = await supabaseAdmin
      .from('raw_materials')
      .delete()
      .eq('id', id);
    if (error) throw error;

    await logAuditEvent({
      userId: user.userId,
      action: 'DELETE',
      entityType: 'raw_material',
      entityId: id,
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────
// CUSTOMERS
// ─────────────────────────────────────────────

export async function getCustomers(): Promise<{ success: boolean; data?: DbCustomer[]; error?: string }> {
  try {
    await requireAuth(['SALES', 'SUPER_ADMIN', 'MANAGEMENT']);
    const { data, error } = await supabaseAdmin
      .from('customers')
      .select('*')
      .order('name');
    if (error) throw error;
    return { success: true, data: data as DbCustomer[] };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createCustomer(input: Partial<DbCustomer>): Promise<{ success: boolean; data?: DbCustomer; error?: string }> {
  try {
    const { user } = await requireAuth(['SALES', 'SUPER_ADMIN']);
    const { data, error } = await supabaseAdmin
      .from('customers')
      .insert([input])
      .select()
      .single();
    if (error) throw error;
    
    await logAuditEvent({
      userId: user.userId,
      action: 'CREATE',
      entityType: 'customer',
      entityId: data.id,
      details: { name: input.name },
    });
    return { success: true, data: data as DbCustomer };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateCustomer(id: string, input: Partial<DbCustomer>): Promise<{ success: boolean; data?: DbCustomer; error?: string }> {
  try {
    const { user } = await requireAuth(['SALES', 'SUPER_ADMIN']);
    const { data, error } = await supabaseAdmin
      .from('customers')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    await logAuditEvent({
      userId: user.userId,
      action: 'UPDATE',
      entityType: 'customer',
      entityId: id,
    });
    return { success: true, data: data as DbCustomer };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteCustomer(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { user } = await requireAuth(['SUPER_ADMIN']);
    const { error } = await supabaseAdmin
      .from('customers')
      .delete()
      .eq('id', id);
    if (error) throw error;

    await logAuditEvent({
      userId: user.userId,
      action: 'DELETE',
      entityType: 'customer',
      entityId: id,
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────
// WAREHOUSES
// ─────────────────────────────────────────────

export async function getWarehouses(): Promise<{ success: boolean; data?: DbWarehouse[]; error?: string }> {
  try {
    await requireAuth(['WAREHOUSE', 'SUPER_ADMIN', 'MANAGEMENT']);
    const { data, error } = await supabaseAdmin
      .from('warehouses')
      .select(`
        *,
        warehouse_pics (
          id, name, phone_number
        )
      `)
      .order('name');
    if (error) throw error;
    return { success: true, data: data as DbWarehouse[] };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createWarehouse(input: Partial<DbWarehouse>): Promise<{ success: boolean; data?: DbWarehouse; error?: string }> {
  try {
    const { user } = await requireAuth(['WAREHOUSE', 'SUPER_ADMIN']);
    const { data, error } = await supabaseAdmin
      .from('warehouses')
      .insert([input])
      .select()
      .single();
    if (error) throw error;
    
    await logAuditEvent({
      userId: user.userId,
      action: 'CREATE',
      entityType: 'warehouse',
      entityId: data.id,
      details: { name: input.name },
    });
    return { success: true, data: data as DbWarehouse };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateWarehouse(id: string, input: Partial<DbWarehouse>): Promise<{ success: boolean; data?: DbWarehouse; error?: string }> {
  try {
    const { user } = await requireAuth(['WAREHOUSE', 'SUPER_ADMIN']);
    const { data, error } = await supabaseAdmin
      .from('warehouses')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    await logAuditEvent({
      userId: user.userId,
      action: 'UPDATE',
      entityType: 'warehouse',
      entityId: id,
    });
    return { success: true, data: data as DbWarehouse };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteWarehouse(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { user } = await requireAuth(['SUPER_ADMIN']);
    const { error } = await supabaseAdmin
      .from('warehouses')
      .delete()
      .eq('id', id);
    if (error) throw error;

    await logAuditEvent({
      userId: user.userId,
      action: 'DELETE',
      entityType: 'warehouse',
      entityId: id,
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────
// WAREHOUSE PICS
// ─────────────────────────────────────────────

export async function getWarehousePics(): Promise<{ success: boolean; data?: DbWarehousePic[]; error?: string }> {
  try {
    await requireAuth(['WAREHOUSE', 'SUPER_ADMIN', 'MANAGEMENT']);
    const { data, error } = await supabaseAdmin
      .from('warehouse_pics')
      .select('*')
      .order('name');
    if (error) throw error;
    return { success: true, data: data as DbWarehousePic[] };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createWarehousePic(input: Partial<DbWarehousePic>): Promise<{ success: boolean; data?: DbWarehousePic; error?: string }> {
  try {
    const { user } = await requireAuth(['WAREHOUSE', 'SUPER_ADMIN']);
    const { data, error } = await supabaseAdmin
      .from('warehouse_pics')
      .insert([input])
      .select()
      .single();
    if (error) throw error;
    
    await logAuditEvent({
      userId: user.userId,
      action: 'CREATE',
      entityType: 'warehouse_pic',
      entityId: data.id,
      details: { name: input.name },
    });
    return { success: true, data: data as DbWarehousePic };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateWarehousePic(id: string, input: Partial<DbWarehousePic>): Promise<{ success: boolean; data?: DbWarehousePic; error?: string }> {
  try {
    const { user } = await requireAuth(['WAREHOUSE', 'SUPER_ADMIN']);
    const { data, error } = await supabaseAdmin
      .from('warehouse_pics')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    await logAuditEvent({
      userId: user.userId,
      action: 'UPDATE',
      entityType: 'warehouse_pic',
      entityId: id,
    });
    return { success: true, data: data as DbWarehousePic };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteWarehousePic(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { user } = await requireAuth(['SUPER_ADMIN']);
    const { error } = await supabaseAdmin
      .from('warehouse_pics')
      .delete()
      .eq('id', id);
    if (error) throw error;

    await logAuditEvent({
      userId: user.userId,
      action: 'DELETE',
      entityType: 'warehouse_pic',
      entityId: id,
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function testSendReminderAction(picId: string): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const { user } = await requireAuth(['SUPER_ADMIN']);
    
    const { data: pic, error: picErr } = await supabaseAdmin
      .from('warehouse_pics')
      .select('name, phone_number')
      .eq('id', picId)
      .single();
      
    if (picErr || !pic) throw new Error('PIC not found');
    if (!pic.phone_number) throw new Error('PIC phone number is empty');
    
    const { data: warehouses, error: whErr } = await supabaseAdmin
      .from('warehouses')
      .select('name')
      .eq('pic_id', picId);
      
    if (whErr) throw whErr;
    
    const warehouseNames = warehouses && warehouses.length > 0 
      ? warehouses.map(w => w.name).join(', ') 
      : 'Gudang Belum Ditugaskan';

    const message = `*[TEST]* REMINDER STOCK OPNAME\n\nHalo ${pic.name},\n\nIni adalah pengingat *TEST* untuk jadwal Stock Opname bulanan gudang *${warehouseNames}*.\n\n_Pesan otomatis dari KhumKhum ERP_`;
    
    const result = await sendWhatsAppMessage({
      target: pic.phone_number,
      message,
    });
    
    if (result.success) {
      await logAuditEvent({
        userId: user.userId,
        action: 'UPDATE',
        entityType: 'warehouse_pic',
        entityId: picId,
        details: { target: pic.phone_number }
      });
      return { success: true, message: 'Test reminder sent successfully' };
    } else {
      return { success: false, error: result.error || 'Failed to send WhatsApp message' };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
