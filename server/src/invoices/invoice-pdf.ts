import PDFDocument from 'pdfkit';

type TemplateKey = 'classic' | 'modern' | 'minimal';

export type InvoicePdfInput = {
  templateKey: TemplateKey;
  business: {
    name: string;
    invoiceDisplayName?: string | null;
    invoiceLogoUrl?: string | null;
    invoiceAddressLine1?: string | null;
    invoiceAddressLine2?: string | null;
    invoiceCity?: string | null;
    invoiceState?: string | null;
    invoiceCountry?: string | null;
    invoicePostalCode?: string | null;
    invoiceFooterNote?: string | null;
    paymentBankName?: string | null;
    paymentAccountName?: string | null;
    paymentAccountNumber?: string | null;
    paymentInstructionsNote?: string | null;
  };
  invoice: {
    invoiceNumber: string;
    issueDate: Date;
    dueDate?: Date | null;
    currency: string;
    notes?: string | null;
    subtotalAmount: number;
    taxType?: string | null;
    taxLabel?: string | null;
    taxRate?: number | null;
    taxAmount?: number | null;
    totalAmount: number;
  };
  client: { name: string; email?: string | null; phone?: string | null } | null;
  items: Array<{ description: string; quantity: number; unitPrice: number; amount: number }>;
  job?: { title: string } | null;
};

function toMoney(n: number, currency: string) {
  const prefix = currency === 'NGN' ? '₦' : `${currency} `;
  const safe = Number.isFinite(n) ? n : 0;
  return `${prefix}${safe.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function fmtDate(d?: Date | null) {
  if (!d) return '—';
  try {
    return d.toISOString().slice(0, 10);
  } catch {
    return '—';
  }
}

async function fetchLogo(url: string): Promise<Buffer | null> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(url, { signal: controller.signal } as any).finally(() => clearTimeout(t));
    if (!res.ok) return null;
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    if (!ct.includes('image/png') && !ct.includes('image/jpeg') && !ct.includes('image/jpg')) return null;
    const len = Number(res.headers.get('content-length') || '0');
    if (len && len > 2_000_000) return null;
    const ab = await res.arrayBuffer();
    if (ab.byteLength > 2_000_000) return null;
    return Buffer.from(ab);
  } catch {
    return null;
  }
}

function styleForTemplate(key: TemplateKey) {
  if (key === 'modern') return { accent: '#059669', titleSize: 20, headerBar: true };
  if (key === 'minimal') return { accent: '#0f172a', titleSize: 18, headerBar: false };
  return { accent: '#111827', titleSize: 18, headerBar: true };
}

export async function renderInvoicePdf(input: InvoicePdfInput): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: 48 });
  const chunks: Buffer[] = [];
  doc.on('data', (c) => chunks.push(c));

  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  const s = styleForTemplate(input.templateKey);
  const title = input.business.invoiceDisplayName || input.business.name;
  const currency = input.invoice.currency || 'NGN';
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  // Header
  if (s.headerBar) {
    doc.save();
    doc.rect(doc.page.margins.left, doc.page.margins.top - 20, pageWidth, 12).fill(s.accent);
    doc.restore();
  }

  const logoUrl = input.business.invoiceLogoUrl || '';
  const logoBuf = logoUrl ? await fetchLogo(logoUrl) : null;
  const headerTop = doc.y;

  if (logoBuf) {
    try {
      doc.image(logoBuf, doc.page.margins.left, headerTop, { fit: [70, 40] });
    } catch {
      // ignore
    }
  }

  doc
    .fontSize(s.titleSize)
    .fillColor('#111827')
    .text(title, doc.page.margins.left + (logoBuf ? 80 : 0), headerTop, { width: pageWidth - (logoBuf ? 80 : 0) });

  doc
    .fontSize(10)
    .fillColor('#334155')
    .text('INVOICE', { align: 'right' });

  doc.moveDown(0.7);

  // Address block (left)
  const addrLines = [
    input.business.invoiceAddressLine1,
    input.business.invoiceAddressLine2,
    [input.business.invoiceCity, input.business.invoiceState].filter(Boolean).join(', ') || null,
    [input.business.invoiceCountry || 'Nigeria', input.business.invoicePostalCode].filter(Boolean).join(' ') || null,
  ].filter((x) => !!x) as string[];

  const leftX = doc.page.margins.left;
  const rightX = doc.page.margins.left + pageWidth * 0.55;
  const blockTop = doc.y;

  if (addrLines.length) {
    doc.fontSize(9).fillColor('#475569').text(addrLines.join('\n'), leftX, blockTop, { width: pageWidth * 0.5 });
  }

  // Meta block (right)
  doc.fontSize(9).fillColor('#0f172a');
  doc.text(`Invoice #: ${input.invoice.invoiceNumber}`, rightX, blockTop, { width: pageWidth * 0.45 });
  doc.text(`Issue date: ${fmtDate(input.invoice.issueDate)}`, rightX, doc.y);
  doc.text(`Due date: ${fmtDate(input.invoice.dueDate)}`, rightX, doc.y);

  doc.moveDown(1.2);

  // Client block
  doc.fontSize(10).fillColor('#0f172a').text('Bill to', { continued: false });
  doc.fontSize(10).fillColor('#111827').text(input.client?.name || '—');
  const clientInfo = [input.client?.email, input.client?.phone].filter(Boolean).join(' • ');
  if (clientInfo) doc.fontSize(9).fillColor('#475569').text(clientInfo);
  if (input.job?.title) doc.fontSize(9).fillColor('#475569').text(`Job: ${input.job.title}`);

  doc.moveDown(1);

  // Items table
  const colDesc = leftX;
  const colQty = leftX + pageWidth * 0.62;
  const colUnit = leftX + pageWidth * 0.72;
  const colAmt = leftX + pageWidth * 0.84;

  doc.fontSize(9).fillColor('#475569');
  doc.text('Description', colDesc, doc.y, { width: pageWidth * 0.6 });
  doc.text('Qty', colQty, doc.y, { width: pageWidth * 0.08, align: 'right' });
  doc.text('Unit', colUnit, doc.y, { width: pageWidth * 0.12, align: 'right' });
  doc.text('Amount', colAmt, doc.y, { width: pageWidth * 0.16, align: 'right' });

  doc.moveDown(0.4);
  doc.moveTo(leftX, doc.y).lineTo(leftX + pageWidth, doc.y).strokeColor('#e2e8f0').stroke();
  doc.moveDown(0.5);

  doc.fontSize(9).fillColor('#111827');
  for (const it of input.items) {
    const startY = doc.y;
    doc.text(it.description || '—', colDesc, startY, { width: pageWidth * 0.6 });
    doc.text(String(it.quantity), colQty, startY, { width: pageWidth * 0.08, align: 'right' });
    doc.text(toMoney(it.unitPrice, currency), colUnit, startY, { width: pageWidth * 0.12, align: 'right' });
    doc.text(toMoney(it.amount, currency), colAmt, startY, { width: pageWidth * 0.16, align: 'right' });
    doc.moveDown(0.8);
  }

  doc.moveDown(0.2);
  doc.moveTo(leftX, doc.y).lineTo(leftX + pageWidth, doc.y).strokeColor('#e2e8f0').stroke();
  doc.moveDown(0.8);

  // Totals
  const totalsX = leftX + pageWidth * 0.55;
  const labelW = pageWidth * 0.25;
  const valueW = pageWidth * 0.2;

  const writeTotalRow = (label: string, value: string, bold = false) => {
    doc.fontSize(9).fillColor('#475569').text(label, totalsX, doc.y, { width: labelW, align: 'left' });
    doc.fontSize(9).fillColor('#111827');
    if (bold) doc.font('Helvetica-Bold');
    doc.text(value, totalsX + labelW, doc.y, { width: valueW, align: 'right' });
    doc.font('Helvetica');
    doc.moveDown(0.4);
  };

  writeTotalRow('Subtotal', toMoney(input.invoice.subtotalAmount, currency));

  const taxType = (input.invoice.taxType || 'none').toLowerCase();
  if (taxType !== 'none') {
    const pct = input.invoice.taxRate ? `${Number(input.invoice.taxRate) * 100}%` : '';
    const label = (input.invoice.taxLabel || 'Tax') + (pct ? ` (${pct})` : '');
    writeTotalRow(label, toMoney(input.invoice.taxAmount || 0, currency));
  }

  doc.moveDown(0.1);
  doc.moveTo(totalsX, doc.y).lineTo(totalsX + labelW + valueW, doc.y).strokeColor('#cbd5e1').stroke();
  doc.moveDown(0.4);
  writeTotalRow('Total', toMoney(input.invoice.totalAmount, currency), true);

  doc.moveDown(0.8);

  // Notes
  if (input.invoice.notes) {
    doc.fontSize(9).fillColor('#0f172a').text('Notes', { continued: false });
    doc.fontSize(9).fillColor('#475569').text(input.invoice.notes);
    doc.moveDown(0.8);
  }

  // Payment instructions
  const paymentLines = [
    input.business.paymentBankName ? `Bank: ${input.business.paymentBankName}` : null,
    input.business.paymentAccountName ? `Account name: ${input.business.paymentAccountName}` : null,
    input.business.paymentAccountNumber ? `Account number: ${input.business.paymentAccountNumber}` : null,
    input.business.paymentInstructionsNote || null,
  ].filter(Boolean) as string[];
  if (paymentLines.length) {
    doc.fontSize(9).fillColor('#0f172a').text('Payment', { continued: false });
    doc.fontSize(9).fillColor('#475569').text(paymentLines.join('\n'));
    doc.moveDown(0.8);
  }

  // Footer
  if (input.business.invoiceFooterNote) {
    doc.fontSize(8).fillColor('#64748b').text(input.business.invoiceFooterNote, { align: 'center' });
  }

  doc.end();
  return await done;
}


