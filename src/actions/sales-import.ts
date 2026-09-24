'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-guard';
import ExcelJS from 'exceljs';
import { revalidatePath } from 'next/cache';
import { getProducts } from '@/actions/master';

export async function importSalesOrderBulk(
  formData: FormData,
  customerId: string
): Promise<{ success: boolean; error?: string; count?: number }> {
  try {
    const { user } = await requireAuth(['SUPER_ADMIN', 'SALES']);
    
    if (!customerId) throw new Error('Customer (Platform) wajib dipilih');

    const file = formData.get('file') as File;
    if (!file) throw new Error('File tidak ditemukan');

    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) throw new Error('Ukuran file maksimal adalah 5MB.');

    const buffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const sheet = workbook.worksheets[0];
    if (!sheet) throw new Error('Excel tidak memiliki Sheet data');

    const rowCount = sheet.rowCount;
    if (rowCount < 2) throw new Error('Data Excel kosong (hanya header)');

    // Preload products for fast matching
    const { data: productsData } = await getProducts();
    const products = productsData || [];
    const productCache = new Map<string, string>(); // name/sku -> id

    for (const p of products) {
      productCache.set((p.sku || '').toLowerCase().trim(), p.id);
      productCache.set((p.name || '').toLowerCase().trim(), p.id);
    }

    // Default product if mismatch (first product in db)
    const defaultProductId = products[0]?.id;

    // Grouping rows by Order Number
    const ordersMap = new Map<string, {
      date: string;
      location: string;
      items: { product_id: string; quantity: number; unit_price: number }[];
    }>();

    const errors: string[] = [];
    let processedRows = 0;

    for (let i = 2; i <= rowCount; i++) {
      const row = sheet.getRow(i);
      
      const orderNoRaw = row.getCell(1).text?.trim();
      const orderNo = orderNoRaw || `SO-BULK-${Date.now()}-${i}`; // Default if empty
      
      const dateCell = row.getCell(2).value;
      const skuNameRaw = row.getCell(3).text?.trim();
      const qtyCell = row.getCell(4).value;
      const priceCell = row.getCell(5).value;
      const locCell = row.getCell(6).text?.trim() || '';

      if (!skuNameRaw || !qtyCell) continue; // Skip empty crucial columns

      // Parse Date
      let dateString = new Date().toISOString();
      if (dateCell) {
        if (dateCell instanceof Date) {
          dateString = dateCell.toISOString();
        } else {
          const d = new Date(dateCell.toString());
          if (!isNaN(d.getTime())) dateString = d.toISOString();
        }
      }

      const qty = parseFloat(qtyCell.toString()) || 0;
      const price = parseFloat((priceCell || 0).toString()) || 0;

      if (qty <= 0) continue;

      // Match product
      let matchedProductId = productCache.get(skuNameRaw.toLowerCase());
      
      // Try fuzzy match if exact fails
      if (!matchedProductId) {
        const found = products.find(p => p.name.toLowerCase().includes(skuNameRaw.toLowerCase()));
        if (found) matchedProductId = found.id;
      }

      if (!matchedProductId) {
        if (defaultProductId) {
          matchedProductId = defaultProductId;
        } else {
          errors.push(`Baris ${i}: Produk '${skuNameRaw}' tidak dikenali dan master produk kosong.`);
          continue;
        }
      }

      processedRows++;

      if (!ordersMap.has(orderNo)) {
        ordersMap.set(orderNo, {
          date: dateString,
          location: locCell,
          items: []
        });
      }

      ordersMap.get(orderNo)!.items.push({
        product_id: matchedProductId,
        quantity: qty,
        unit_price: price
      });
    }

    if (processedRows === 0) {
      throw new Error('Tidak ada baris data valid yang bisa diproses.');
    }

    // Insert grouped orders to DB
    let successCount = 0;
    
    for (const [orderNumber, orderData] of ordersMap.entries()) {
      try {
        const totalAmount = orderData.items.reduce((sum, it) => sum + (it.quantity * it.unit_price), 0);

        const { data: so, error: soErr } = await supabaseAdmin.from('sales_orders').insert({
          customer_id: customerId,
          order_number: orderNumber,
          order_date: orderData.date,
          status: 'PENDING',
          location: orderData.location,
          total_amount: totalAmount,
          notes: 'Diimpor via Bulk Upload Excel',
          created_by: user.userId
        }).select('id').single();

        if (soErr || !so) throw new Error(soErr?.message || 'Gagal membuat SO');

        const itemsPayload = orderData.items.map(it => ({
          sales_order_id: so.id,
          product_id: it.product_id,
          quantity: it.quantity,
          unit_price: it.unit_price,
          subtotal: it.quantity * it.unit_price
        }));

        await supabaseAdmin.from('sales_order_items').insert(itemsPayload);
        successCount++;
      } catch (err: any) {
        errors.push(`Order ${orderNumber}: ${err.message}`);
      }
    }

    revalidatePath('/sales');
    revalidatePath('/inventory');

    return { 
      success: true, 
      count: successCount, 
      error: errors.length > 0 ? `Berhasil mengimpor ${successCount} pesanan, namun ada masalah: ${errors[0]}` : undefined 
    };

  } catch (err: any) {
    console.error('Bulk Import error:', err);
    return { success: false, error: err.message };
  }
}
