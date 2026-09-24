'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-guard';
import ExcelJS from 'exceljs';
import { revalidatePath } from 'next/cache';
import { getProducts } from '@/actions/master';

export async function importSalesOrderBulk(
  formData: FormData,
  defaultCustomerId: string // fallback if format is standard
): Promise<{ success: boolean; error?: string; count?: number }> {
  try {
    const { user } = await requireAuth(['SUPER_ADMIN', 'SALES']);
    
    const file = formData.get('file') as File;
    if (!file) throw new Error('File tidak ditemukan');

    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
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
    const defaultProductId = products[0]?.id;

    // Detect format
    const isKhumkhumLegacy = sheet.getCell('B2').text?.includes('Penjualan Pelanggan per Barang');

    // Orders map grouping
    const ordersMap = new Map<string, {
      date: string;
      customerName?: string;
      location: string;
      items: { product_id: string; quantity: number; unit_price: number }[];
    }>();

    const errors: string[] = [];
    let processedRows = 0;

    if (isKhumkhumLegacy) {
      // --- LEGACY KHUMKHUM EXPORT FORMAT ---
      // Row 5: Headers
      // Data starts Row 6
      let lastDate: any = null;
      let lastCust: string = '';

      function extractText(cell: ExcelJS.Cell): string {
        if (!cell) return '';
        if (typeof cell.value === 'string') return cell.value.trim();
        if (cell.value && typeof cell.value === 'object' && (cell.value as any).richText) {
          return (cell.value as any).richText.map((rt: any) => rt.text).join('').trim();
        }
        return cell.text ? cell.text.trim() : '';
      }

      for (let i = 6; i <= rowCount; i++) {
        const row = sheet.getRow(i);
        
        let dateCell = row.getCell(3).value;
        if (!dateCell) dateCell = lastDate;
        else lastDate = dateCell;

        let custRaw = extractText(row.getCell(4));
        if (!custRaw || custRaw === '[object Object]') custRaw = lastCust;
        else lastCust = custRaw;

        const skuNameRaw = extractText(row.getCell(5));
        const qtyCell = row.getCell(7).value;
        const priceCell = row.getCell(8).value;

        if (!custRaw || !skuNameRaw || !qtyCell) continue;
        if (skuNameRaw.toLowerCase().includes('total nama barang')) continue; // Skip subtotal rows

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

        // Match product (Fuzzy)
        let matchedProductId = productCache.get(skuNameRaw.toLowerCase());
        if (!matchedProductId) {
          const found = products.find(p => p.name.toLowerCase().includes(skuNameRaw.toLowerCase()));
          if (found) matchedProductId = found.id;
        }
        if (!matchedProductId) {
          if (defaultProductId) matchedProductId = defaultProductId;
          else continue;
        }

        processedRows++;

        // Group by Customer + Date to form an Order
        const dateOnly = dateString.split('T')[0];
        const custCode = custRaw.substring(0, 5).toUpperCase().replace(/[^A-Z0-9]/g, '');
        const orderNo = `SO-${custCode}-${dateOnly}`;

        if (!ordersMap.has(orderNo)) {
          ordersMap.set(orderNo, {
            date: dateString,
            customerName: custRaw,
            location: 'Cabang Utama',
            items: []
          });
        }
        ordersMap.get(orderNo)!.items.push({
          product_id: matchedProductId,
          quantity: qty,
          unit_price: price > 0 ? (price / qty) : 0 // The report gives Total Penjualan, so we divide by qty
        });
      }
    } else {
      // --- STANDARD TEMPLATE FORMAT ---
      if (!defaultCustomerId) throw new Error('Customer wajib dipilih untuk template standar');
      for (let i = 2; i <= rowCount; i++) {
        const row = sheet.getRow(i);
        const orderNoRaw = row.getCell(1).text?.trim();
        const orderNo = orderNoRaw || `SO-BULK-${Date.now()}-${i}`;
        const dateCell = row.getCell(2).value;
        const skuNameRaw = row.getCell(3).text?.trim();
        const qtyCell = row.getCell(4).value;
        const priceCell = row.getCell(5).value;
        const locCell = row.getCell(6).text?.trim() || '';

        if (!skuNameRaw || !qtyCell) continue;

        let dateString = new Date().toISOString();
        if (dateCell) {
          if (dateCell instanceof Date) dateString = dateCell.toISOString();
          else {
            const d = new Date(dateCell.toString());
            if (!isNaN(d.getTime())) dateString = d.toISOString();
          }
        }

        const qty = parseFloat(qtyCell.toString()) || 0;
        const price = parseFloat((priceCell || 0).toString()) || 0;
        if (qty <= 0) continue;

        let matchedProductId = productCache.get(skuNameRaw.toLowerCase());
        if (!matchedProductId) {
          const found = products.find(p => p.name.toLowerCase().includes(skuNameRaw.toLowerCase()));
          if (found) matchedProductId = found.id;
        }
        if (!matchedProductId) {
          if (defaultProductId) matchedProductId = defaultProductId;
          else continue;
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
    }

    if (processedRows === 0) {
      throw new Error('Tidak ada baris data valid yang bisa diproses.');
    }

    // --- BULK INSERT LOGIC (Optimized for large 13000 row datasets) ---
    // 1. Resolve Customers
    const uniqueCustomerNames = Array.from(new Set(Array.from(ordersMap.values()).map(o => o.customerName).filter(Boolean))) as string[];
    const customerIdMap = new Map<string, string>();

    if (isKhumkhumLegacy && uniqueCustomerNames.length > 0) {
      const { data: existingCustomers } = await supabaseAdmin.from('customers').select('id, name');
      const missingCustomers = [];
      for (const name of uniqueCustomerNames) {
        const found = existingCustomers?.find(c => c.name.toLowerCase() === name.toLowerCase());
        if (found) {
          customerIdMap.set(name, found.id);
        } else {
          missingCustomers.push({ name, contact: 'Diimpor otomatis' });
        }
      }
      
      if (missingCustomers.length > 0) {
        // Bulk insert missing customers
        const { data: insertedCustomers } = await supabaseAdmin.from('customers').insert(missingCustomers).select('id, name');
        if (insertedCustomers) {
          insertedCustomers.forEach(c => customerIdMap.set(c.name, c.id));
        }
      }
    }

    // 2. Prepare and Bulk Insert Sales Orders
    const salesOrdersPayload = Array.from(ordersMap.entries()).map(([orderNo, orderData]) => {
      let resolvedCustomerId = defaultCustomerId;
      if (isKhumkhumLegacy && orderData.customerName) {
        resolvedCustomerId = customerIdMap.get(orderData.customerName) || defaultCustomerId;
      }
      const totalAmount = orderData.items.reduce((sum, it) => sum + (it.quantity * it.unit_price), 0);
      return {
        order_number: orderNo,
        customer_id: resolvedCustomerId,
        order_date: orderData.date,
        status: 'COMPLETED' as any, // Historical data is treated as completed
        location: orderData.location,
        total_amount: totalAmount,
        notes: isKhumkhumLegacy ? 'Impor Histori Khumkhum' : 'Bulk Upload',
        created_by: user.userId
      };
    });

    // Chunk insert for SOs to avoid payload limits
    let insertedOrders: any[] = [];
    const CHUNK_SIZE = 500;
    for (let i = 0; i < salesOrdersPayload.length; i += CHUNK_SIZE) {
      const chunk = salesOrdersPayload.slice(i, i + CHUNK_SIZE);
      const { data, error } = await supabaseAdmin.from('sales_orders').insert(chunk).select('id, order_number');
      if (error) {
        console.error('SO insert chunk error', error);
        throw new Error(`Gagal menyimpan data: ${error.message}`);
      } else if (data) {
        insertedOrders = [...insertedOrders, ...data];
      }
    }

    // Map order_number -> SO id
    const soIdMap = new Map<string, string>();
    insertedOrders.forEach(o => soIdMap.set(o.order_number, o.id));

    // 3. Prepare and Bulk Insert Sales Order Items
    let itemsPayload: any[] = [];
    for (const [orderNo, orderData] of ordersMap.entries()) {
      const soId = soIdMap.get(orderNo);
      if (!soId) continue; // skip if SO failed to insert
      
      orderData.items.forEach(it => {
        itemsPayload.push({
          sales_order_id: soId,
          product_id: it.product_id,
          quantity: it.quantity,
          unit_price: it.unit_price,
          subtotal: it.quantity * it.unit_price
        });
      });
    }

    // Chunk insert for SO items
    for (let i = 0; i < itemsPayload.length; i += CHUNK_SIZE) {
      const chunk = itemsPayload.slice(i, i + CHUNK_SIZE);
      const { error } = await supabaseAdmin.from('sales_order_items').insert(chunk);
      if (error) {
        throw new Error(`Gagal menyimpan item pesanan: ${error.message}`);
      }
    }

    revalidatePath('/sales');
    revalidatePath('/inventory');
    revalidatePath('/ai-forecast');

    return { 
      success: true, 
      count: insertedOrders.length, 
      error: errors.length > 0 ? `Berhasil mengimpor ${insertedOrders.length} grup pesanan, namun ada masalah: ${errors[0]}` : undefined 
    };

  } catch (err: any) {
    console.error('Bulk Import error:', err);
    return { success: false, error: err.message };
  }
}
