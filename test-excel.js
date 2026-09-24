const ExcelJS = require('exceljs');
const path = require('path');

async function main() {
  const filePath = path.resolve('prd/penjualan_pelanggan_per_barang_cvkhairabuanama_260924184821.xlsx');
  console.log('Reading file:', filePath);
  
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  
  workbook.worksheets.forEach(worksheet => {
    console.log(`\n--- Sheet: ${worksheet.name} ---`);
    console.log(`Total Rows: ${worksheet.rowCount}`);
    
    // Print first 25 rows
    for (let i = 1; i <= Math.min(25, worksheet.rowCount); i++) {
      const row = worksheet.getRow(i);
      const values = row.values.slice(1);
      console.log(`Row ${i}:`, JSON.stringify(values.map(v => typeof v === 'object' && v !== null && v.result !== undefined ? v.result : (typeof v === 'object' && v !== null && v.text !== undefined ? v.text : v))));
    }
  });
}

main().catch(console.error);
