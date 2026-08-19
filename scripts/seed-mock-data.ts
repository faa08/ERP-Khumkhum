import { createClient } from '@supabase/supabase-js';
import { subDays, format } from 'date-fns';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('⚠️ Supabase credentials missing! Check your .env.local file.');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

async function runSeed() {
  console.log('🌱 Starting Mock Data Seeding...');

  // 1. Create a Warehouse if not exists
  console.log('Checking Warehouses...');
  const { data: whs } = await supabaseAdmin.from('warehouses').select('*').limit(1);
  let warehouseId = whs?.[0]?.id;

  if (!warehouseId) {
    console.log('Creating Default Warehouse...');
    const { data: newWh, error } = await supabaseAdmin.from('warehouses').insert({
      name: 'Gudang Utama KhumKhum',
      location: 'Cimahi'
    }).select().single();
    if (error) throw error;
    warehouseId = newWh.id;
  }

  // 2. Create Products
  console.log('Creating Mock Products...');
  const mockProducts = [
    { sku: 'JC-ORIG-50G', name: 'Jamur Crispy Original 50g' },
    { sku: 'JC-SPICY-50G', name: 'Jamur Crispy Pedas 50g' },
  ];

  let productIds: Record<string, string> = {};
  for (const p of mockProducts) {
    const { data: existing } = await supabaseAdmin.from('products').select('*').eq('sku', p.sku).single();
    if (existing) {
      productIds[p.sku] = existing.id;
    } else {
      const { data: newP, error } = await supabaseAdmin.from('products').insert(p).select().single();
      if (error) throw error;
      productIds[p.sku] = newP.id;
    }
  }

  // 3. Create Inventory Items for the Products
  console.log('Creating Inventory Items...');
  let inventoryIds: Record<string, string> = {};
  for (const p of mockProducts) {
    const pId = productIds[p.sku];
    const { data: existing } = await supabaseAdmin.from('inventory')
      .select('*')
      .eq('warehouse_id', warehouseId)
      .eq('item_type', 'PRODUCT')
      .eq('item_id', pId)
      .single();
    
    if (existing) {
      inventoryIds[p.sku] = existing.id;
    } else {
      const { data: newInv, error } = await supabaseAdmin.from('inventory').insert({
        warehouse_id: warehouseId,
        item_type: 'PRODUCT',
        item_id: pId,
        quantity: Math.floor(Math.random() * 200) + 50, // Initial stock 50-250
        reorder_point: 100,
        last_updated_at: new Date().toISOString()
      }).select().single();
      if (error) throw error;
      inventoryIds[p.sku] = newInv.id;
    }
  }

  // 4. Create Historical Stock Movements (OUT) for Forecasting
  console.log('Creating Historical Sales Data (OUT movements) for the last 30 days...');
  for (const sku in inventoryIds) {
    const invId = inventoryIds[sku];
    
    // Clear old mock movements for this inventory just in case we re-run
    await supabaseAdmin.from('stock_movements').delete().eq('inventory_id', invId);

    const movements = [];
    // Generate data for the last 30 days
    for (let i = 30; i >= 0; i--) {
      // Simulate random sales per day (e.g., between 5kg to 15kg OUT)
      // We'll use kg logic here assuming product quantity is tracked in KG for forecast demo
      const randomQty = Math.floor(Math.random() * 10) + 5; 
      
      const moveDate = subDays(new Date(), i);
      
      movements.push({
        inventory_id: invId,
        movement_type: 'OUT',
        quantity: randomQty,
        notes: `Penjualan harian mock (Day -${i})`,
        movement_date: moveDate.toISOString()
      });
    }

    const { error } = await supabaseAdmin.from('stock_movements').insert(movements);
    if (error) throw error;
  }

  // 5. Create Farmers and Mock Harvest Estimates
  console.log('Creating Mock Farmer Estimates...');
  const { data: farmers } = await supabaseAdmin.from('farmers').select('*').limit(3);
  let farmerId = farmers?.[0]?.id;

  if (!farmerId) {
    const { data: newF, error } = await supabaseAdmin.from('farmers').insert({
      name: 'Bapak Sugeng (Mock)',
      phone_number: '08123456789'
    }).select().single();
    if (error) throw error;
    farmerId = newF.id;
  }

  // Delete old mock estimates
  await supabaseAdmin.from('farmer_harvest_estimates').delete().eq('farmer_id', farmerId);

  const estimates = [];
  // Next 5 days
  for (let i = 1; i <= 5; i++) {
    estimates.push({
      farmer_id: farmerId,
      expected_date: addDays(new Date(), i).toISOString(),
      estimated_kg: Math.floor(Math.random() * 20) + 10,
      source: i % 2 === 0 ? 'WA_BOT' : 'MANUAL'
    });
  }
  await supabaseAdmin.from('farmer_harvest_estimates').insert(estimates);

  console.log('✅ Mock Data Seeding Completed Successfully!');
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

runSeed().catch(console.error);
