const fs = require('fs');
const xlsx = require('xlsx');

const wb = xlsx.readFile('prd/Buku1.xlsx');
const sheet = wb.Sheets[wb.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(sheet);

let sqlRawMaterials = '-- Raw Materials & Packaging\n';
let sqlProducts = '-- Finished Goods\n';

for (const row of data) {
  const name = (row['Nama Barang'] || '').replace(/'/g, "''");
  if (!name) continue;

  const uom = row['Satuan'] || 'pcs';
  const price = row['Harga Beli'] || 0;
  let stock = 0;
  if (row['Kuantitas']) stock = row['Kuantitas'];

  const isFinishedGood = name.toLowerCase().includes('ahaii') || 
                         name.toLowerCase().includes('khumkhum') || 
                         name.toLowerCase().includes('masnum') || 
                         name.toLowerCase().includes('maklon') ||
                         row['Kategori Barang']?.toLowerCase() === 'barang jadi';
  
  if (isFinishedGood) {
    sqlProducts += `INSERT INTO products (id, sku, name, category, uom, unit_price, stock_quantity) VALUES (gen_random_uuid(), 'SKU-' || upper(substr('${name}', 1, 4)), '${name}', 'Barang Jadi', '${uom}', ${price}, ${stock}) ON CONFLICT DO NOTHING;\n`;
  } else {
    sqlRawMaterials += `INSERT INTO raw_materials (id, code, name, uom, material_category, unit_price, stock_quantity) VALUES (gen_random_uuid(), 'RM-' || upper(substr('${name}', 1, 4)), '${name}', '${uom}', 'Bahan Baku', ${price}, ${stock}) ON CONFLICT DO NOTHING;\n`;
  }
}

const alterTables = `
-- Alter tables
ALTER TABLE products ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS uom TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS unit_price NUMERIC;
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity NUMERIC;

ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS unit_price NUMERIC;
ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS stock_quantity NUMERIC;

`;

fs.writeFileSync('database/migration_master_data.sql', alterTables + sqlRawMaterials + '\n' + sqlProducts);
console.log('Generated database/migration_master_data.sql');
