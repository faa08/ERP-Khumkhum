import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

export async function GET() {
  try {
    const workbook = new ExcelJS.Workbook();
    
    // Sheet: Template Pesanan Penjualan (Sales Orders)
    const sheet = workbook.addWorksheet('Data Pesanan Penjualan');
    
    // Headers
    sheet.columns = [
      { header: 'No. Pesanan (Resi)', key: 'order_no', width: 20 },
      { header: 'Tanggal', key: 'date', width: 15 },
      { header: 'Nama Produk / SKU', key: 'product', width: 35 },
      { header: 'Qty (Pcs)', key: 'qty', width: 10 },
      { header: 'Harga Satuan (Opsional)', key: 'price', width: 22 },
      { header: 'Lokasi / Info Tambahan', key: 'location', width: 30 }
    ];

    // Style the header
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0ea5e9' } // Sky blue
    };

    // Add some sample data
    sheet.addRow({
      order_no: 'INV/2026/09/SHP01',
      date: new Date(),
      product: 'Jamur Crispy Balado 100g',
      qty: 5,
      price: 18000,
      location: 'Jakarta Selatan'
    });
    
    sheet.addRow({
      order_no: 'INV/2026/09/SHP01',
      date: new Date(),
      product: 'Jamur Crispy Original 100g',
      qty: 2,
      price: 18000,
      location: 'Jakarta Selatan'
    });

    sheet.addRow({
      order_no: 'INV/2026/09/TK02',
      date: new Date(),
      product: 'Jamur Crispy Pedas Manis 50g',
      qty: 10,
      price: 10000,
      location: 'Bandung'
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Template_Import_SalesOrder.xlsx"'
      }
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
