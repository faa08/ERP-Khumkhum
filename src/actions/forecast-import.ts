'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-guard';
import ExcelJS from 'exceljs';
import { revalidatePath } from 'next/cache';

export async function importHistoricalData(formData: FormData): Promise<{ success: boolean; error?: string; count?: number }> {
  try {
    const { user } = await requireAuth(['SUPER_ADMIN']);
    
    const file = formData.get('file') as File;
    if (!file) {
      throw new Error('File tidak ditemukan');
    }

    // Limit file size to max 5MB (DoS Protection against Zip Bomb/XML Bomb)
    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('Ukuran file maksimal adalah 5MB untuk mencegah overload sistem.');
    }

    const buffer = await file.arrayBuffer();
    if (buffer.byteLength > MAX_FILE_SIZE) {
      throw new Error('Ukuran file maksimal adalah 5MB.');
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    // Identify sheets
    const sheetProduksi = workbook.getWorksheet('2. Data Produksi');
    const sheetPenjualan = workbook.getWorksheet('3. Data Penjualan');

    if (!sheetProduksi && !sheetPenjualan) {
      throw new Error('Format file tidak sesuai. Pastikan Anda menggunakan file template terbaru yang memiliki 3 Sheet.');
    }

    let successCount = 0;
    const errors: string[] = [];

    // Helper to get dummy product
    const { data: productData } = await supabaseAdmin.from('products').select('id').limit(1).maybeSingle();
    const defaultProductId = productData?.id;

    if (!defaultProductId && sheetPenjualan) {
      throw new Error('Master Data Produk kosong. Harap buat minimal 1 produk terlebih dahulu sebelum mengimpor data penjualan historis.');
    }

    // ==========================================
    // 1. Process Produksi
    // ==========================================
    if (sheetProduksi) {
      const rowCount = sheetProduksi.rowCount;
      for (let i = 2; i <= rowCount; i++) {
        const row = sheetProduksi.getRow(i);
        const dateCell = row.getCell(1).value;
        const shiftCell = row.getCell(2).text?.toUpperCase();
        const volumeCell = row.getCell(3).value as number;
        const noteCell = row.getCell(4).text || '';

        if (!dateCell || !volumeCell) continue;

        let dateObj: Date;
        if (dateCell instanceof Date) {
          dateObj = dateCell;
        } else {
          dateObj = new Date(dateCell.toString());
        }

        const dateString = dateObj.toISOString();
        const batchPrefix = `HIST-PROD-${dateObj.getTime()}-${i}`;

        try {
          // Dummy yield logic: 80%
          await supabaseAdmin.from('production_orders').insert({
            batch_number: batchPrefix,
            status: 'COMPLETED',
            input_weight: volumeCell,
            output_weight: volumeCell * 0.8,
            is_yield_compliant: true,
            yield_percentage: 80,
            notes: `${shiftCell ? `[SHIFT ${shiftCell}] ` : ''}${noteCell}`,
            created_by: user.userId,
            created_at: dateString
          });
          successCount++;
        } catch (err: any) {
          errors.push(`Produksi Baris ${i}: ${err.message}`);
        }
      }
    }

    // ==========================================
    // 2. Process Penjualan
    // ==========================================
    if (sheetPenjualan) {
      const rowCount = sheetPenjualan.rowCount;
      // We will cache customer IDs to avoid hitting DB for the same customer name repeatedly
      const customerCache: Record<string, string> = {};

      for (let i = 2; i <= rowCount; i++) {
        const row = sheetPenjualan.getRow(i);
        const dateCell = row.getCell(1).value;
        const customerNameCell = row.getCell(2).text?.trim();
        const volumeCell = row.getCell(3).value as number;
        const noteCell = row.getCell(4).text || '';

        if (!dateCell || !volumeCell) continue;

        let dateObj: Date;
        if (dateCell instanceof Date) {
          dateObj = dateCell;
        } else {
          dateObj = new Date(dateCell.toString());
        }
        const dateString = dateObj.toISOString();

        try {
          let customerId = '';
          const cName = customerNameCell || 'Pelanggan Historis Anonim';
          
          if (customerCache[cName]) {
            customerId = customerCache[cName];
          } else {
            // Check if customer exists
            let { data: existingCustomer } = await supabaseAdmin
              .from('customers')
              .select('id')
              .ilike('name', cName)
              .limit(1)
              .single();
            
            if (existingCustomer) {
              customerId = existingCustomer.id;
            } else {
              // Create new customer
              const { data: newCust, error: custErr } = await supabaseAdmin
                .from('customers')
                .insert({ name: cName })
                .select('id')
                .single();
              if (newCust) customerId = newCust.id;
            }
            if (customerId) customerCache[cName] = customerId;
          }

          if (customerId && defaultProductId) {
            const { data: so, error: soErr } = await supabaseAdmin.from('sales_orders').insert({
              customer_id: customerId,
              status: 'COMPLETED',
              total_amount: volumeCell * 50000,
              order_date: dateObj.toISOString().split('T')[0],
              notes: noteCell,
              created_by: user.userId,
              created_at: dateString
            }).select('id').single();

            if (!soErr && so) {
              await supabaseAdmin.from('sales_order_items').insert({
                sales_order_id: so.id,
                product_id: defaultProductId,
                quantity: volumeCell,
                unit_price: 50000,
                subtotal: volumeCell * 50000
              });
              successCount++;
            }
          }
        } catch (err: any) {
          errors.push(`Penjualan Baris ${i}: ${err.message}`);
        }
      }
    }

    revalidatePath('/master/historical-import');
    
    return { success: true, count: successCount, error: errors.length > 0 ? `Beberapa baris gagal: ${errors[0]}` : undefined };
  } catch (err: any) {
    console.error('Import error:', err);
    return { success: false, error: err.message };
  }
}
