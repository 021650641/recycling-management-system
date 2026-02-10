import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { PassThrough } from 'stream';

interface ReportData {
  title: string;
  subtitle?: string;
  columns: { header: string; key: string; width?: number }[];
  rows: Record<string, any>[];
  summary?: Record<string, string | number>;
}

export async function generatePDF(data: ReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.fontSize(20).font('Helvetica-Bold').text('CIVICycle', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(14).font('Helvetica-Bold').text(data.title, { align: 'center' });
    if (data.subtitle) {
      doc.fontSize(10).font('Helvetica').text(data.subtitle, { align: 'center' });
    }
    doc.moveDown(0.5);
    doc.fontSize(8).font('Helvetica').text(`Generated: ${new Date().toLocaleString()}`, { align: 'right' });
    doc.moveDown(1);

    // Summary section
    if (data.summary) {
      doc.fontSize(10).font('Helvetica-Bold').text('Summary');
      doc.moveDown(0.3);
      for (const [key, value] of Object.entries(data.summary)) {
        doc.fontSize(9).font('Helvetica').text(`${key}: ${value}`);
      }
      doc.moveDown(1);
    }

    // Table
    const tableTop = doc.y;
    const pageWidth = doc.page.width - 80;
    const colCount = data.columns.length;
    const defaultColWidth = pageWidth / colCount;

    // Table header
    doc.font('Helvetica-Bold').fontSize(8);
    let x = 40;
    data.columns.forEach((col) => {
      const w = col.width || defaultColWidth;
      doc.text(col.header, x, tableTop, { width: w, align: 'left' });
      x += w;
    });

    // Header underline
    doc.moveTo(40, tableTop + 14).lineTo(40 + pageWidth, tableTop + 14).stroke('#cccccc');

    // Table rows
    doc.font('Helvetica').fontSize(8);
    let y = tableTop + 20;

    for (const row of data.rows) {
      if (y > doc.page.height - 60) {
        doc.addPage();
        y = 40;
      }

      x = 40;
      data.columns.forEach((col) => {
        const w = col.width || defaultColWidth;
        const val = row[col.key] != null ? String(row[col.key]) : '-';
        doc.text(val, x, y, { width: w, align: 'left' });
        x += w;
      });
      y += 16;
    }

    // Footer
    doc.fontSize(8).font('Helvetica').text(
      `Total rows: ${data.rows.length}`,
      40, y + 10
    );

    doc.end();
  });
}

export async function generateExcel(data: ReportData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'CIVICycle';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(data.title.substring(0, 31));

  // Title rows
  sheet.mergeCells(1, 1, 1, data.columns.length);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = `CIVICycle - ${data.title}`;
  titleCell.font = { bold: true, size: 14 };
  titleCell.alignment = { horizontal: 'center' };

  if (data.subtitle) {
    sheet.mergeCells(2, 1, 2, data.columns.length);
    const subtitleCell = sheet.getCell(2, 1);
    subtitleCell.value = data.subtitle;
    subtitleCell.font = { size: 10, italic: true };
    subtitleCell.alignment = { horizontal: 'center' };
  }

  // Summary section
  let startRow = data.subtitle ? 4 : 3;
  if (data.summary) {
    for (const [key, value] of Object.entries(data.summary)) {
      const row = sheet.getRow(startRow);
      row.getCell(1).value = key;
      row.getCell(1).font = { bold: true };
      row.getCell(2).value = value;
      startRow++;
    }
    startRow++;
  }

  // Column headers
  const headerRow = sheet.getRow(startRow);
  data.columns.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = col.header;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } };
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
    };
    sheet.getColumn(i + 1).width = col.width ? col.width / 5 : 18;
  });

  // Data rows
  data.rows.forEach((row) => {
    const values = data.columns.map((col) => {
      const val = row[col.key];
      if (val == null) return '';
      const num = parseFloat(val);
      if (!isNaN(num) && typeof val !== 'boolean') return num;
      return String(val);
    });
    sheet.addRow(values);
  });

  // Auto-filter
  sheet.autoFilter = {
    from: { row: startRow, column: 1 },
    to: { row: startRow + data.rows.length, column: data.columns.length },
  };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function generateCSV(data: ReportData): string {
  const escape = (val: any): string => {
    if (val == null) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const header = data.columns.map((col) => escape(col.header)).join(',');
  const rows = data.rows.map((row) =>
    data.columns.map((col) => escape(row[col.key])).join(',')
  );

  return [header, ...rows].join('\n');
}
