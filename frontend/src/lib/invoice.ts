// Stylish PDF invoice for a completed consultation.
// jsPDF + autotable are dynamically imported so they're only fetched when a
// user actually downloads an invoice (same pattern as lib/export.ts).

import type { Consultation } from './types';
import { formatDate, formatDateTime } from './format';

type RGB = [number, number, number];

/**
 * PDF-safe currency. jsPDF's built-in Helvetica font uses WinAnsi encoding,
 * which has no glyph for the rupee sign (₹, U+20B9) — using it renders the
 * amount as blank/garbage. So invoices use a plain "Rs." prefix instead.
 */
const money = (n: number | string) =>
  `Rs. ${Number(n).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

const BRAND: RGB = [124, 78, 230]; // matches brand-600 / export theme
const BRAND_SOFT: RGB = [247, 245, 255];
const DARK: RGB = [33, 37, 41];
const MUTED: RGB = [120, 120, 120];
const GREEN: RGB = [22, 163, 74];
const AMBER: RGB = [217, 119, 6];

export interface InvoiceOptions {
  clinicName?: string;
}

/** Build and download a branded A4 invoice PDF for the given consultation. */
export async function generateInvoice(
  c: Consultation,
  opts: InvoiceOptions = {},
) {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 14; // page margin

  const fee = c.payment?.consultationFee ?? 0;
  const paid = c.payment?.amountPaid ?? 0;
  const due = Math.max(fee - paid, 0);
  const status = c.payment?.status ?? 'DUE';
  const invNo = `INV-${c.patient?.patientCode ?? '—'}-${c.id.slice(0, 6).toUpperCase()}`;

  // ---- Header band ---------------------------------------------------------
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, pageW, 36, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(opts.clinicName || 'Physiotherapy Clinic', M, 17);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Physiotherapy & Rehabilitation', M, 24);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.text('INVOICE', pageW - M, 19, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(invNo, pageW - M, 26, { align: 'right' });

  // ---- Status pill (top right, below band) --------------------------------
  const pillColor: RGB = status === 'PAID' ? GREEN : AMBER;
  const pillText = status === 'PAID' ? 'PAID' : 'PAYMENT DUE';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  const pillW = doc.getTextWidth(pillText) + 10;
  const pillX = pageW - M - pillW;
  doc.setFillColor(...pillColor);
  doc.roundedRect(pillX, 42, pillW, 8, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.text(pillText, pillX + pillW / 2, 47.5, { align: 'center' });

  // ---- Meta + Bill To ------------------------------------------------------
  const p = c.patient;
  const ageGender = [p?.age != null ? `${p.age} yrs` : null, p?.gender]
    .filter(Boolean)
    .join(' · ');

  doc.setTextColor(...MUTED);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('BILLED TO', M, 46);

  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(p?.fullName || '—', M, 52);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  let by = 57.5;
  const billLines = [
    p?.patientCode,
    ageGender || null,
    p?.phone,
    p?.address,
  ].filter(Boolean) as string[];
  billLines.forEach((line) => {
    doc.text(line, M, by);
    by += 4.5;
  });

  // Right-side meta block
  const metaX = pageW - M;
  const metaRows: [string, string][] = [
    ['Invoice Date', formatDate(new Date().toISOString())],
    ['Consultation', formatDateTime(c.consultationDate)],
    ['Physiotherapist', c.physiotherapist?.name || '—'],
  ];
  let my = 57;
  doc.setFontSize(9);
  metaRows.forEach(([label, value]) => {
    doc.setTextColor(...MUTED);
    doc.setFont('helvetica', 'normal');
    doc.text(label, metaX, my, { align: 'right' });
    doc.setTextColor(...DARK);
    doc.setFont('helvetica', 'bold');
    doc.text(value, metaX, my + 4.5, { align: 'right' });
    my += 11;
  });

  // ---- Line items ----------------------------------------------------------
  const startY = Math.max(by, my) + 6;

  const items: (string | number)[][] = [
    [
      'Physiotherapy Consultation',
      c.diagnosis || c.chiefComplaint || 'Consultation & assessment',
      money(fee),
    ],
  ];
  (c.machineUsages ?? []).forEach((m) => {
    items.push([
      `  • ${m.machineName}`,
      `${m.durationMinutes} min therapy`,
      'Included',
    ]);
  });

  autoTable(doc, {
    startY,
    head: [['Description', 'Details', 'Amount']],
    body: items,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3, lineColor: [230, 230, 230] },
    headStyles: {
      fillColor: BRAND,
      textColor: 255,
      fontStyle: 'bold',
      halign: 'left',
    },
    alternateRowStyles: { fillColor: BRAND_SOFT },
    columnStyles: {
      0: { cellWidth: 70, fontStyle: 'bold', textColor: DARK },
      1: { textColor: MUTED },
      2: { halign: 'right', cellWidth: 35 },
    },
    margin: { left: M, right: M },
  });

  // ---- Totals box ----------------------------------------------------------
  const afterTable = (doc as any).lastAutoTable.finalY as number;
  const boxW = 75;
  const boxX = pageW - M - boxW;
  let ty = afterTable + 8;

  const totalRow = (label: string, value: string, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(bold ? 11 : 9.5);
    doc.setTextColor(...(bold ? DARK : MUTED));
    doc.text(label, boxX, ty);
    doc.setTextColor(...DARK);
    doc.text(value, pageW - M, ty, { align: 'right' });
    ty += bold ? 7 : 6;
  };

  totalRow('Subtotal', money(fee));
  totalRow('Amount Paid', money(paid));

  // Divider
  doc.setDrawColor(220, 220, 220);
  doc.line(boxX, ty - 2, pageW - M, ty - 2);
  ty += 2;

  // Balance due — highlighted band
  doc.setFillColor(...(due > 0 ? AMBER : GREEN));
  doc.roundedRect(boxX, ty - 4.5, boxW, 9, 1.5, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Balance Due', boxX + 3, ty + 1.5);
  doc.text(money(due), pageW - M - 3, ty + 1.5, { align: 'right' });

  // Payment method note (left side, aligned with totals)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(
    `Payment method: ${c.payment?.method ?? '—'}`,
    M,
    afterTable + 10,
  );
  if (c.payment?.paidAt) {
    doc.text(`Paid on: ${formatDateTime(c.payment.paidAt)}`, M, afterTable + 15);
  }

  // ---- Footer --------------------------------------------------------------
  doc.setDrawColor(230, 230, 230);
  doc.line(M, pageH - 22, pageW - M, pageH - 22);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...BRAND);
  doc.text('Thank you for choosing us. Wishing you a speedy recovery!', M, pageH - 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(
    'This is a computer-generated invoice and does not require a signature.',
    M,
    pageH - 11,
  );

  doc.save(`${invNo}.pdf`);
}
