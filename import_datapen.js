const { createClient } = require('@supabase/supabase-js');
const ExcelJS = require('exceljs');
const path = require('path');
const { loadEnvConfig } = require('@next/env');
loadEnvConfig(process.cwd());

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function importData() {
  const filePath = path.resolve('datapen/penjualan_pelanggan_per_barang_cvkhairabuanama_260924184821.xlsx');
  console.log('Reading file:', filePath);
  
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.worksheets[0];
  const rowCount = sheet.rowCount;

  console.log(`Total Rows: ${rowCount}`);

  // Fetch products
  const { data: productsData } = await supabase.from('products').select('id, name, sku');
  const products = productsData || [];
  const productCache = new Map();
  for (const p of products) {
    productCache.set((p.sku || '').toLowerCase().trim(), p.id);
    productCache.set((p.name || '').toLowerCase().trim(), p.id);
  }
  const defaultProductId = products[0]?.id;

  // Fetch a valid user for created_by
  const { data: userData } = await supabase.from('users').select('id').limit(1).maybeSingle();
  const validUserId = userData?.id || '00000000-0000-0000-0000-000000000000';

  // Ensure default customer exists
  const { data: custData } = await supabase.from('customers').select('id').limit(1).maybeSingle();
  let defaultCustId = custData?.id;
  if (!defaultCustId) {
    const { data: newCust } = await supabase.from('customers').insert({ name: 'Pelanggan Default' }).select('id').single();
    defaultCustId = newCust?.id;
  }

  const ordersMap = new Map();
  let processedRows = 0;
  let lastDate = null;
  let lastCust = '';

  function extractText(cell) {
    if (!cell) return '';
    if (typeof cell.value === 'string') return cell.value.trim();
    if (cell.value && typeof cell.value === 'object' && cell.value.richText) {
      return cell.value.richText.map(rt => rt.text).join('').trim();
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
    if (skuNameRaw.toLowerCase().includes('total nama barang')) continue;

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

    const dateOnly = dateString.split('T')[0];
    const custCode = custRaw.substring(0, 5).toUpperCase().replace(/[^A-Z0-9]/g, '');
    const orderNo = `SO-${custCode}-${dateOnly}-${i}`; // add row index to ensure uniqueness if needed

    if (!ordersMap.has(orderNo)) {
      ordersMap.set(orderNo, {
        date: dateString,
        customerName: custRaw,
        location: 'Cabang Utama',
        items: []
      });
    }
    ordersMap.get(orderNo).items.push({
      product_id: matchedProductId,
      quantity: qty,
      unit_price: price > 0 ? (price / qty) : 0
    });
  }

  console.log(`Parsed ${processedRows} valid rows, creating ${ordersMap.size} unique sales orders.`);

  const uniqueCustomerNames = Array.from(new Set(Array.from(ordersMap.values()).map(o => o.customerName).filter(Boolean)));
  const customerIdMap = new Map();

  const { data: existingCustomers } = await supabase.from('customers').select('id, name');
  const missingCustomers = [];
  for (const name of uniqueCustomerNames) {
    const found = existingCustomers?.find(c => c.name.toLowerCase() === name.toLowerCase());
    if (found) {
      customerIdMap.set(name, found.id);
    } else {
      missingCustomers.push({ name, contact: 'Diimpor otomatis dari datapen' });
    }
  }
  
  if (missingCustomers.length > 0) {
    console.log(`Inserting ${missingCustomers.length} missing customers...`);
    const { data: insertedCustomers } = await supabase.from('customers').insert(missingCustomers).select('id, name');
    if (insertedCustomers) {
      insertedCustomers.forEach(c => customerIdMap.set(c.name, c.id));
    }
  }

  const salesOrdersPayload = Array.from(ordersMap.entries()).map(([orderNo, orderData]) => {
    let resolvedCustomerId = customerIdMap.get(orderData.customerName) || defaultCustId;
    const totalAmount = orderData.items.reduce((sum, it) => sum + (it.quantity * it.unit_price), 0);
    return {
      order_number: orderNo,
      customer_id: resolvedCustomerId,
      order_date: orderData.date,
      status: 'COMPLETED',
      total_amount: totalAmount,
      notes: 'Impor dari datapen',
      created_by: validUserId // Use valid user ID here
    };
  });

  let insertedOrders = [];
  const CHUNK_SIZE = 500;
  console.log(`Inserting ${salesOrdersPayload.length} sales orders in chunks...`);
  for (let i = 0; i < salesOrdersPayload.length; i += CHUNK_SIZE) {
    const chunk = salesOrdersPayload.slice(i, i + CHUNK_SIZE);
    const { data, error } = await supabase.from('sales_orders').insert(chunk).select('id, order_number');
    if (error) {
      console.error('SO insert chunk error', error);
    } else if (data) {
      insertedOrders = [...insertedOrders, ...data];
    }
    process.stdout.write(`.` );
  }
  console.log(`\nSuccessfully inserted ${insertedOrders.length} sales orders.`);

  const soIdMap = new Map();
  insertedOrders.forEach(o => soIdMap.set(o.order_number, o.id));

  let itemsPayload = [];
  for (const [orderNo, orderData] of ordersMap.entries()) {
    const soId = soIdMap.get(orderNo);
    if (!soId) continue;
    
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

  console.log(`Inserting ${itemsPayload.length} sales order items in chunks...`);
  let itemSuccessCount = 0;
  for (let i = 0; i < itemsPayload.length; i += CHUNK_SIZE) {
    const chunk = itemsPayload.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase.from('sales_order_items').insert(chunk);
    if (error) {
      console.error('Items chunk error', error);
    } else {
      itemSuccessCount += chunk.length;
    }
    process.stdout.write(`.`);
  }
  console.log(`\nSuccessfully inserted ${itemSuccessCount} sales order items.`);
  console.log('Import completed successfully!');
}

importData().catch(console.error);
