// Export helpers. The heavy libraries (xlsx, jspdf) are dynamically imported
// so they're only downloaded the first time a user actually exports.

export interface ExportColumn<T> {
  header: string;
  value: (row: T) => string | number | null | undefined;
}

export type ExportFormat = 'pdf' | 'excel' | 'csv';

function matrix<T>(columns: ExportColumn<T>[], rows: T[]) {
  const headers = columns.map((c) => c.header);
  const body = rows.map((r) =>
    columns.map((c) => {
      const v = c.value(r);
      return v === null || v === undefined ? '' : v;
    }),
  );
  return { headers, body };
}

async function exportExcel<T>(
  filename: string,
  columns: ExportColumn<T>[],
  rows: T[],
  asCsv = false,
) {
  const XLSX = await import('xlsx');
  const { headers, body } = matrix(columns, rows);
  const ws = XLSX.utils.aoa_to_sheet([headers, ...body]);
  if (asCsv) {
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob(['﻿' + csv], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

async function exportPdf<T>(
  filename: string,
  title: string,
  columns: ExportColumn<T>[],
  rows: T[],
) {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  const { headers, body } = matrix(columns, rows);
  const doc = new jsPDF({
    orientation: headers.length > 5 ? 'landscape' : 'portrait',
  });
  doc.setFontSize(14);
  doc.text(title, 14, 16);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(
    `${rows.length} record(s) · exported ${new Date().toLocaleString()}`,
    14,
    22,
  );
  autoTable(doc, {
    head: [headers],
    body: body as (string | number)[][],
    startY: 27,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [124, 78, 230], textColor: 255 },
    alternateRowStyles: { fillColor: [247, 245, 255] },
  });
  doc.save(`${filename}.pdf`);
}

export async function runExport<T>(
  format: ExportFormat,
  filename: string,
  title: string,
  columns: ExportColumn<T>[],
  rows: T[],
) {
  if (format === 'pdf') return exportPdf(filename, title, columns, rows);
  return exportExcel(filename, columns, rows, format === 'csv');
}
