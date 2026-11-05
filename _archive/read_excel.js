const fs = require('fs');
const path = require('path');

try {
  const xlsx = require('xlsx');
  const wb = xlsx.readFile('prd/Buku1.xlsx');
  const sheetName = wb.SheetNames[0];
  const data = xlsx.utils.sheet_to_json(wb.Sheets[sheetName]);
  console.log("Found " + data.length + " rows. First 5 rows:");
  console.log(JSON.stringify(data.slice(0, 5), null, 2));
} catch (e) {
  console.log("Failed with xlsx:", e.message);
  try {
    const ExcelJS = require('exceljs');
    async function run() {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile('prd/Buku1.xlsx');
      const worksheet = workbook.worksheets[0];
      const data = [];
      worksheet.eachRow((row, rowNumber) => {
        if(rowNumber <= 6) data.push(row.values);
      });
      console.log("First few rows using exceljs:", data);
    }
    run();
  } catch (err) {
    console.log("Failed with exceljs too:", err.message);
  }
}
