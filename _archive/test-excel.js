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

    for (let i = 6; i <= Math.min(25, worksheet.rowCount); i++) {
      const row = worksheet.getRow(i);
      
      let dateCell = row.getCell(3).value;
      if (!dateCell) dateCell = lastDate;
      else lastDate = dateCell;

      let custRaw = extractText(row.getCell(4));
      if (!custRaw || custRaw === '[object Object]') custRaw = lastCust;
      else lastCust = custRaw;

      const skuNameRaw = extractText(row.getCell(5));
      const qtyCell = row.getCell(7).value;
      const priceCell = row.getCell(8).value;

      console.log(`Row ${i}: custRaw="${custRaw}", skuNameRaw="${skuNameRaw}", qtyCell="${qtyCell}"`);

      if (!custRaw || !skuNameRaw || !qtyCell) {
        console.log(`Row ${i} SKIPPED due to missing data`);
        continue;
      }
      
      processedRows++;
    }
    console.log(`Processed rows: ${processedRows}`);
  });
}

main().catch(console.error);
