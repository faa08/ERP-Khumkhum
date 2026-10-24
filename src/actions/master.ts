'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-guard';
import { logAuditEvent } from '@/actions/audit';
import { sendWhatsAppMessage, formatStockInquiryMessage, getWhatsAppDirectUrl } from '@/lib/whatsapp';
import { revalidatePath } from 'next/cache';
import type {
  DbFarmer,
  DbProduct,
  DbRawMaterial,
  DbCustomer,
  DbWarehouse,
  DbWarehousePic,
} from '@/types/database';

async function getMainWarehouseId(): Promise<string | null> {
  const { data: whList } = await supabaseAdmin
    .from('warehouses')
    .select('id, name')
    .is('deleted_at', null);

  if (!whList || whList.length === 0) return null;
  const main = whList.find(w => w.name.toLowerCase().includes('utama') || w.name.toLowerCase().includes('pabrik'))
    || whList[0];
  return main?.id || null;
}

// ─────────────────────────────────────────────
// FARMERS
// ─────────────────────────────────────────────

export async function getFarmers(): Promise<{ success: boolean; data?: DbFarmer[]; error?: string }> {
  try {
    await requireAuth(['WAREHOUSE', 'SUPER_ADMIN', 'QC', 'MANAGEMENT']);
    const { data, error } = await supabaseAdmin
      .from('farmers')
      .select('*')
      .is('deleted_at', null)
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
      .update({ deleted_at: new Date().toISOString() })
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

/**
 * Kirim pesan WA tanya ketersediaan stok jamur ke petani mitra.
 * Jika Fonnte tidak aktif, kembalikan link direct WA sebagai fallback.
 */
export async function inquireFarmerStockAction(params: {
  farmerId: string;
  targetDate?: string;
}): Promise<{ success: boolean; directUrl?: string; error?: string }> {
  try {
    const { user } = await requireAuth(['WAREHOUSE', 'SUPER_ADMIN']);

    const { data: farmer, error: fetchErr } = await supabaseAdmin
      .from('farmers')
      .select('id, name, phone_number, farmer_type')
      .eq('id', params.farmerId)
      .single();

    if (fetchErr || !farmer) throw new Error('Data petani tidak ditemukan');
    if (!farmer.phone_number) throw new Error('Petani ini belum memiliki nomor HP');

    const message = formatStockInquiryMessage({
      farmerName: farmer.name,
      farmerType: farmer.farmer_type,
      targetDate: params.targetDate,
    });

    const directUrl = getWhatsAppDirectUrl(farmer.phone_number, message);

    const result = await sendWhatsAppMessage({
      target: farmer.phone_number,
      message,
    });

    await logAuditEvent({
      userId: user.userId,
      action: 'CREATE',
      entityType: 'whatsapp_stock_inquiry',
      entityId: farmer.id,
      details: {
        farmerName: farmer.name,
        farmerType: farmer.farmer_type,
        targetDate: params.targetDate,
        sentViaFonnte: result.success && !result.data?.simulated,
      },
    });

    return { success: true, directUrl };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────
// PRODUCTS
// ─────────────────────────────────────────────

export async function getProducts(): Promise<{ success: boolean; data?: DbProduct[]; error?: string }> {
  try {
    await requireAuth(['WAREHOUSE', 'SUPER_ADMIN', 'MANAGEMENT', 'SALES', 'PRODUCTION']);
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .is('deleted_at', null)
      .order('name');
    if (error) throw error;
    
    // Fetch ROP settings
    const { data: settingsData } = await supabaseAdmin.from('settings').select('value').eq('key', 'product_rops').single();
    const rops = settingsData?.value || {};
    
    const enriched = data.map(p => ({ ...p, rop: rops[p.id] || 0 }));
    
    return { success: true, data: enriched as DbProduct[] };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createProduct(input: Partial<DbProduct> & { rop?: number }): Promise<{ success: boolean; data?: DbProduct; error?: string }> {
  try {
    const { user } = await requireAuth(['WAREHOUSE', 'SUPER_ADMIN']);
    const { rop, ...productInput } = input;
    
    let { data, error } = await supabaseAdmin
      .from('products')
      .insert([productInput])
      .select()
      .single();

    if (error && (error.message?.includes('column') || error.code === '42703')) {
      const standardInput = {
        sku: productInput.sku,
        name: productInput.name,
        description: productInput.description || null,
        category: productInput.category || 'Barang Jadi',
        uom: productInput.uom || 'pcs',
        unit_price: productInput.unit_price || null,
      };
      const retry = await supabaseAdmin
        .from('products')
        .insert([standardInput])
        .select()
        .single();
      if (retry.error) throw retry.error;
      data = retry.data;
    } else if (error) {
      throw error;
    }
    
    if (rop !== undefined && data?.id) {
      const { data: settingsData } = await supabaseAdmin.from('settings').select('value').eq('key', 'product_rops').single();
      const currentRops = settingsData?.value || {};
      await supabaseAdmin.from('settings').upsert({ key: 'product_rops', value: { ...currentRops, [data.id]: rop }, updated_by: user.userId, updated_at: new Date().toISOString() });
    }

    // Auto-create kartu stok di inventory untuk produk jadi baru
    if (data?.id) {
      try {
        const whId = await getMainWarehouseId();
        if (whId) {
          await supabaseAdmin.from('inventory').insert({
            warehouse_id: whId,
            item_type: 'PRODUCT',
            item_id: data.id,
            quantity: 0,
            reorder_point: rop || 0,
            lead_time_days: 3,
            last_updated_at: new Date().toISOString(),
          });
        }
      } catch (invErr) {
        console.warn('Auto create inventory product warning:', invErr);
      }
    }
    
    await logAuditEvent({
      userId: user.userId,
      action: 'CREATE',
      entityType: 'product',
      entityId: data.id,
      details: { sku: input.sku, name: input.name },
    });
    
    revalidatePath('/master/products');
    revalidatePath('/inventory');
    revalidatePath('/warehouse');
    revalidatePath('/sales');
    
    return { success: true, data: data as DbProduct };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateProduct(id: string, input: Partial<DbProduct> & { rop?: number }): Promise<{ success: boolean; data?: DbProduct; error?: string }> {
  try {
    const { user } = await requireAuth(['WAREHOUSE', 'SUPER_ADMIN']);
    const { rop, ...productInput } = input;

    let { data, error } = await supabaseAdmin
      .from('products')
      .update({ ...productInput, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error && (error.message?.includes('column') || error.code === '42703')) {
      const standardInput = {
        sku: productInput.sku,
        name: productInput.name,
        description: productInput.description || null,
        category: productInput.category || 'Barang Jadi',
        uom: productInput.uom || 'pcs',
        unit_price: productInput.unit_price || null,
        updated_at: new Date().toISOString(),
      };
      const retry = await supabaseAdmin
        .from('products')
        .update(standardInput)
        .eq('id', id)
        .select()
        .single();
      if (retry.error) throw retry.error;
      data = retry.data;
    } else if (error) {
      throw error;
    }

    if (rop !== undefined) {
      const { data: settingsData } = await supabaseAdmin.from('settings').select('value').eq('key', 'product_rops').single();
      const currentRops = settingsData?.value || {};
      await supabaseAdmin.from('settings').upsert({ key: 'product_rops', value: { ...currentRops, [id]: rop }, updated_by: user.userId, updated_at: new Date().toISOString() });
    }

    await logAuditEvent({
      userId: user.userId,
      action: 'UPDATE',
      entityType: 'product',
      entityId: id,
    });
    
    revalidatePath('/master/products');
    revalidatePath('/inventory');
    revalidatePath('/sales');

    return { success: true, data: data as DbProduct };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createBatchProducts(
  inputs: (Partial<DbProduct> & { rop?: number })[]
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const { user } = await requireAuth(['WAREHOUSE', 'SUPER_ADMIN', 'PRODUCTION']);
    if (!inputs || inputs.length === 0) {
      return { success: true, count: 0 };
    }

    // Ambil SKU yang sudah ada untuk mencegah bentrok unique constraint
    const { data: existingRows } = await supabaseAdmin
      .from('products')
      .select('sku');
    const existingSkus = new Set((existingRows || []).map((r: any) => (r.sku || '').toLowerCase().trim()));

    const newItems = inputs.filter(item => {
      const s = (item.sku || '').toLowerCase().trim();
      return s && !existingSkus.has(s);
    });

    if (newItems.length === 0) {
      return { success: true, count: 0 };
    }

    const payload = newItems.map(({ rop, ...p }) => ({
      ...p,
      category: p.category || 'Barang Jadi',
      uom: p.uom || 'pcs',
    }));

    let { data, error } = await supabaseAdmin
      .from('products')
      .insert(payload)
      .select();

    if (error && (error.message?.includes('column') || error.code === '42703')) {
      const standardPayload = payload.map(item => ({
        sku: item.sku,
        name: item.name,
        description: item.description || null,
        category: item.category || 'Barang Jadi',
        uom: item.uom || 'pcs',
        unit_price: item.unit_price || null,
      }));
      const retry = await supabaseAdmin
        .from('products')
        .insert(standardPayload)
        .select();
      if (retry.error) throw retry.error;
      data = retry.data;
    } else if (error) {
      throw error;
    }

    // Simpan ROP jika ada
    const itemsWithRop = newItems.filter(item => item.rop !== undefined && item.rop > 0);
    if (itemsWithRop.length > 0 && data) {
      const { data: settingsData } = await supabaseAdmin.from('settings').select('value').eq('key', 'product_rops').single();
      const currentRops = settingsData?.value || {};
      const newRops = { ...currentRops };
      data.forEach((p: any) => {
        const matchingInput = newItems.find(inp => inp.sku?.toLowerCase().trim() === p.sku?.toLowerCase().trim());
        if (matchingInput?.rop) {
          newRops[p.id] = matchingInput.rop;
        }
      });
      await supabaseAdmin.from('settings').upsert({
        key: 'product_rops',
        value: newRops,
        updated_by: user.userId,
        updated_at: new Date().toISOString()
      });
    }

    // Auto-create kartu stok di inventory untuk seluruh batch produk jadi baru
    if (data && data.length > 0) {
      try {
        const whId = await getMainWarehouseId();
        if (whId) {
          const invRows = data.map((item: any) => {
            const matchingInput = newItems.find(inp => inp.sku?.toLowerCase().trim() === item.sku?.toLowerCase().trim());
            return {
              warehouse_id: whId,
              item_type: 'PRODUCT',
              item_id: item.id,
              quantity: 0,
              reorder_point: matchingInput?.rop || 0,
              lead_time_days: 3,
              last_updated_at: new Date().toISOString(),
            };
          });
          await supabaseAdmin.from('inventory').insert(invRows);
        }
      } catch (invErr) {
        console.warn('Auto create batch inventory products warning:', invErr);
      }
    }

    await logAuditEvent({
      userId: user.userId,
      action: 'CREATE',
      entityType: 'product_batch',
      entityId: user.userId,
      details: { count: data?.length || 0 },
    });

    revalidatePath('/master/products');
    revalidatePath('/inventory');
    revalidatePath('/warehouse');
    revalidatePath('/sales');
    revalidatePath('/production');

    return { success: true, count: data?.length || 0 };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteProduct(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { user } = await requireAuth(['SUPER_ADMIN', 'WAREHOUSE']);
    const { error } = await supabaseAdmin
      .from('products')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;

    await logAuditEvent({
      userId: user.userId,
      action: 'DELETE',
      entityType: 'product',
      entityId: id,
    });

    try {
      await supabaseAdmin.from('inventory').delete().eq('item_id', id).eq('item_type', 'PRODUCT');
    } catch (e) {
      console.warn('Delete product inventory warning:', e);
    }
    
    revalidatePath('/master/products');
    revalidatePath('/inventory');
    revalidatePath('/warehouse');
    revalidatePath('/sales');

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────
// RAW MATERIALS
// ─────────────────────────────────────────────

export async function getRawMaterials(): Promise<{ success: boolean; data?: (DbRawMaterial & { available_stock?: number })[]; error?: string }> {
  try {
    await requireAuth(['WAREHOUSE', 'SUPER_ADMIN', 'QC', 'MANAGEMENT', 'PRODUCTION', 'PREMIX', 'SALES']);
    const { data, error } = await supabaseAdmin
      .from('raw_materials')
      .select('*')
      .is('deleted_at', null)
      .order('name');
    if (error) throw error;

    // Ambil stok aktual real-time dari tabel inventory warehouse
    const { data: invData } = await supabaseAdmin
      .from('inventory')
      .select('item_id, quantity')
      .eq('item_type', 'RAW_MATERIAL');

    const stockMap = new Map<string, number>();
    (invData || []).forEach(inv => {
      const cur = stockMap.get(inv.item_id) || 0;
      stockMap.set(inv.item_id, cur + (Number(inv.quantity) || 0));
    });

    const enriched = (data || []).map(rm => ({
      ...rm,
      available_stock: stockMap.has(rm.id) ? stockMap.get(rm.id) : (rm.stock_quantity || 0),
    }));

    return { success: true, data: enriched as (DbRawMaterial & { available_stock?: number })[] };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createRawMaterial(input: Partial<DbRawMaterial>): Promise<{ success: boolean; data?: DbRawMaterial; error?: string }> {
  try {
    const { user } = await requireAuth(['WAREHOUSE', 'SUPER_ADMIN', 'PREMIX']);
    let { data, error } = await supabaseAdmin
      .from('raw_materials')
      .insert([input])
      .select()
      .single();

    if (error && (error.message?.includes('column') || error.code === '42703')) {
      const { packaging_type, flavor_variant, package_weight, ...cleanInput } = input;
      const retry = await supabaseAdmin
        .from('raw_materials')
        .insert([cleanInput])
        .select()
        .single();
      if (retry.error) throw retry.error;
      data = retry.data;
    } else if (error) {
      throw error;
    }
    
    // Auto-create kartu stok di inventory untuk bahan baku baru
    if (data?.id) {
      try {
        const whId = await getMainWarehouseId();
        if (whId) {
          await supabaseAdmin.from('inventory').insert({
            warehouse_id: whId,
            item_type: 'RAW_MATERIAL',
            item_id: data.id,
            quantity: 0,
            reorder_point: input.rop || 0,
            lead_time_days: 3,
            last_updated_at: new Date().toISOString(),
          });
        }
      } catch (invErr) {
        console.warn('Auto create inventory raw material warning:', invErr);
      }
    }

    await logAuditEvent({
      userId: user.userId,
      action: 'CREATE',
      entityType: 'raw_material',
      entityId: data.id,
      details: { code: input.code, name: input.name },
    });
    
    revalidatePath('/master/raw-materials');
    revalidatePath('/inventory');
    revalidatePath('/warehouse');

    return { success: true, data: data as DbRawMaterial };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createBatchRawMaterials(inputs: Partial<DbRawMaterial>[]): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const { user } = await requireAuth(['WAREHOUSE', 'SUPER_ADMIN', 'PREMIX', 'PRODUCTION']);
    if (!inputs || inputs.length === 0) {
      return { success: true, count: 0 };
    }

    // Ambil kode yang sudah ada untuk mencegah bentrok unique constraint
    const { data: existingRows } = await supabaseAdmin
      .from('raw_materials')
      .select('code');
    const existingCodes = new Set((existingRows || []).map((r: any) => (r.code || '').toLowerCase().trim()));

    const newItems = inputs.filter(item => {
      const c = (item.code || '').toLowerCase().trim();
      return c && !existingCodes.has(c);
    });

    if (newItems.length === 0) {
      return { success: true, count: 0 };
    }

    let { data, error } = await supabaseAdmin
      .from('raw_materials')
      .insert(newItems)
      .select();

    if (error && (error.message?.includes('column') || error.code === '42703')) {
      const cleanInputs = newItems.map(({ packaging_type, flavor_variant, package_weight, ...clean }) => clean);
      const retry = await supabaseAdmin
        .from('raw_materials')
        .insert(cleanInputs)
        .select();
      if (retry.error) throw retry.error;
      data = retry.data;
    } else if (error) {
      throw error;
    }

    // Auto-create kartu stok di inventory untuk seluruh batch kemasan baru secara instan
    if (data && data.length > 0) {
      try {
        const whId = await getMainWarehouseId();
        if (whId) {
          const invRows = data.map((item: any) => ({
            warehouse_id: whId,
            item_type: 'RAW_MATERIAL',
            item_id: item.id,
            quantity: 0,
            reorder_point: item.rop || 0,
            lead_time_days: 3,
            last_updated_at: new Date().toISOString(),
          }));
          await supabaseAdmin.from('inventory').insert(invRows);
        }
      } catch (invErr) {
        console.warn('Auto create batch inventory raw materials warning:', invErr);
      }
    }

    await logAuditEvent({
      userId: user.userId,
      action: 'CREATE',
      entityType: 'raw_material',
      entityId: 'BATCH_PACKAGING',
      details: { count: data?.length || 0, sample: newItems[0]?.name },
    });

    revalidatePath('/master/raw-materials');
    revalidatePath('/inventory');
    revalidatePath('/warehouse');
    revalidatePath('/master/production-standards');

    return { success: true, count: data?.length || 0 };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateRawMaterial(id: string, input: Partial<DbRawMaterial>): Promise<{ success: boolean; data?: DbRawMaterial; error?: string }> {
  try {
    const { user } = await requireAuth(['WAREHOUSE', 'SUPER_ADMIN', 'PREMIX']);
    let { data, error } = await supabaseAdmin
      .from('raw_materials')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error && (error.message?.includes('column') || error.code === '42703')) {
      const { packaging_type, flavor_variant, package_weight, ...cleanInput } = input;
      const retry = await supabaseAdmin
        .from('raw_materials')
        .update({ ...cleanInput, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (retry.error) throw retry.error;
      data = retry.data;
    } else if (error) {
      throw error;
    }

    // Sinkronkan ROP ke tabel inventory jika ROP diubah di Master Data
    if (input.rop !== undefined) {
      await supabaseAdmin
        .from('inventory')
        .update({ reorder_point: input.rop, last_updated_at: new Date().toISOString() })
        .eq('item_id', id)
        .eq('item_type', 'RAW_MATERIAL');
    }

    await logAuditEvent({
      userId: user.userId,
      action: 'UPDATE',
      entityType: 'raw_material',
      entityId: id,
    });
    
    revalidatePath('/master/raw-materials');
    revalidatePath('/inventory');
    revalidatePath('/warehouse');

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
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;

    // Bersihkan juga baris inventory agar tidak menjadi data sampah / ghost item
    try {
      const { data: invs } = await supabaseAdmin.from('inventory').select('id').eq('item_id', id).eq('item_type', 'RAW_MATERIAL');
      if (invs && invs.length > 0) {
        const invIds = invs.map(i => i.id);
        await supabaseAdmin.from('stock_movements').delete().in('inventory_id', invIds);
        await supabaseAdmin.from('inventory').delete().in('id', invIds);
      }
    } catch (e) {
      console.warn('Delete raw material inventory warning:', e);
    }

    await logAuditEvent({
      userId: user.userId,
      action: 'DELETE',
      entityType: 'raw_material',
      entityId: id,
    });
    
    revalidatePath('/master/raw-materials');
    revalidatePath('/inventory');
    revalidatePath('/warehouse');

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
      .is('deleted_at', null)
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
      .update({ deleted_at: new Date().toISOString() })
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
      .is('deleted_at', null)
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
    const { user } = await requireAuth(['SUPER_ADMIN', 'WAREHOUSE']);
    const { error } = await supabaseAdmin
      .from('warehouses')
      .update({ deleted_at: new Date().toISOString() })
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
      .is('deleted_at', null)
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
      .update({ deleted_at: new Date().toISOString() })
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

// ─────────────────────────────────────────────
// WIZARD INIT INVENTORY
// ─────────────────────────────────────────────

export async function initializeInventory(items: { item_id: string; item_type: 'RAW_MATERIAL' | 'PRODUCT'; quantity: number }[]): Promise<{ success: boolean; error?: string }> {
  try {
    const { user } = await requireAuth(['SUPER_ADMIN']);
    
    // Get the first warehouse
    const { data: wh, error: whErr } = await supabaseAdmin.from('warehouses').select('id').limit(1).single();
    if (whErr || !wh) throw new Error('Gudang belum tersedia');

    for (const item of items) {
      if (item.quantity <= 0) continue;

      // Cegah duplikasi dengan mengecek apakah baris inventory sudah ada
      const { data: existingInv } = await supabaseAdmin
        .from('inventory')
        .select('id, quantity')
        .eq('warehouse_id', wh.id)
        .eq('item_id', item.item_id)
        .eq('item_type', item.item_type)
        .maybeSingle();

      let inv;
      if (existingInv) {
        // Update stok jika sudah ada
        const { data: updatedInv, error: updateErr } = await supabaseAdmin
          .from('inventory')
          .update({
            quantity: existingInv.quantity + item.quantity,
            last_updated_at: new Date().toISOString()
          })
          .eq('id', existingInv.id)
          .select()
          .single();
        if (updateErr) throw updateErr;
        inv = updatedInv;
      } else {
        // Insert jika belum ada
        const { data: newInv, error: insertErr } = await supabaseAdmin
          .from('inventory')
          .insert({
            warehouse_id: wh.id,
            item_id: item.item_id,
            item_type: item.item_type,
            quantity: item.quantity,
            batch_number: 'INIT-' + new Date().getTime()
          })
          .select()
          .single();
        if (insertErr) throw insertErr;
        inv = newInv;
      }

      await supabaseAdmin.from('stock_movements').insert({
        inventory_id: inv.id,
        movement_type: 'IN',
        quantity: item.quantity,
        reference_type: 'MANUAL_INBOUND',
        notes: 'Saldo Awal via Setup Wizard',
        created_by: user.userId
      });
    }

    await logAuditEvent({
      userId: user.userId,
      action: 'CREATE',
      entityType: 'inventory_initialization',
      details: {
        item_count: items.length,
      },
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
