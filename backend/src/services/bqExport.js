// Render a BQ document (with its line items) to a downloadable Excel or PDF.

const XLSX = require('xlsx');

const fmtRM = (n) => 'RM ' + Number(n || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Build an .xlsx buffer. Rows are grouped under section header rows, with a
// grand-total row at the bottom.
function toExcel(bq, items) {
  const aoa = [];
  aoa.push([bq.title]);
  aoa.push([`Status: ${bq.status}   Version: ${bq.version}`]);
  aoa.push([]);
  aoa.push(['Code', 'Description', 'Unit', 'Qty', 'Rate (RM)', 'Amount (RM)']);

  let lastSection = null;
  for (const it of items) {
    const section = it.section || '';
    if (section && section !== lastSection) {
      aoa.push([section]);
      lastSection = section;
    }
    aoa.push([
      it.item_code || '',
      it.description || '',
      it.unit || '',
      it.quantity == null ? '' : Number(it.quantity),
      it.unit_rate == null ? '' : Number(it.unit_rate),
      it.amount == null ? '' : Number(it.amount),
    ]);
  }
  aoa.push([]);
  aoa.push(['', '', '', '', 'TOTAL', Number(bq.total_amount) || 0]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [{ wch: 10 }, { wch: 60 }, { wch: 8 }, { wch: 10 }, { wch: 14 }, { wch: 16 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'BQ');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

// Stream a PDF to the given writable response. Paginated table layout.
function toPdf(bq, items, res) {
  const PDFDocument = require('pdfkit');
  const doc = new PDFDocument({ size: 'A4', margin: 40, layout: 'landscape' });
  doc.pipe(res);

  const left = 40;
  const cols = [
    { key: 'item_code', label: 'Code', w: 60 },
    { key: 'description', label: 'Description', w: 360 },
    { key: 'unit', label: 'Unit', w: 50 },
    { key: 'quantity', label: 'Qty', w: 60, num: true },
    { key: 'unit_rate', label: 'Rate', w: 80, num: true },
    { key: 'amount', label: 'Amount', w: 90, num: true },
  ];
  const tableWidth = cols.reduce((s, c) => s + c.w, 0);

  doc.fontSize(16).font('Helvetica-Bold').text(bq.title, left);
  doc.fontSize(9).font('Helvetica').fillColor('#555')
    .text(`Status: ${bq.status}    Version: ${bq.version}    Generated: ${new Date().toLocaleString('en-MY')}`, left);
  doc.moveDown(0.5).fillColor('#000');

  let y = doc.y;
  const rowH = 16;
  const bottom = doc.page.height - 50;

  const drawHeader = () => {
    doc.font('Helvetica-Bold').fontSize(8);
    let x = left;
    doc.rect(left, y, tableWidth, rowH).fill('#11305a');
    doc.fillColor('#fff');
    for (const c of cols) {
      doc.text(c.label, x + 3, y + 4, { width: c.w - 6, align: c.num ? 'right' : 'left' });
      x += c.w;
    }
    doc.fillColor('#000');
    y += rowH;
  };

  const ensureSpace = () => {
    if (y + rowH > bottom) { doc.addPage(); y = 40; drawHeader(); }
  };

  drawHeader();
  doc.font('Helvetica').fontSize(8);
  let lastSection = null;
  for (const it of items) {
    const section = it.section || '';
    if (section && section !== lastSection) {
      ensureSpace();
      doc.font('Helvetica-Bold').fillColor('#11305a').text(section, left + 2, y + 4, { width: tableWidth - 4 });
      doc.fillColor('#000').font('Helvetica');
      y += rowH;
      lastSection = section;
    }
    // Wrap-aware row height for long descriptions.
    const descH = doc.heightOfString(it.description || '', { width: cols[1].w - 6 });
    const thisH = Math.max(rowH, descH + 6);
    if (y + thisH > bottom) { doc.addPage(); y = 40; drawHeader(); }
    let x = left;
    for (const c of cols) {
      let v = it[c.key];
      if (c.num) v = v == null ? '' : Number(v).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      doc.text(String(v ?? ''), x + 3, y + 3, { width: c.w - 6, align: c.num ? 'right' : 'left' });
      x += c.w;
    }
    y += thisH;
  }

  // Grand total
  ensureSpace();
  doc.font('Helvetica-Bold');
  doc.rect(left, y, tableWidth, rowH).fill('#eef2f8').fillColor('#000');
  doc.text('TOTAL', left + 3, y + 4, { width: tableWidth - cols[5].w - 6, align: 'right' });
  doc.text(fmtRM(bq.total_amount), left + tableWidth - cols[5].w + 3, y + 4, { width: cols[5].w - 6, align: 'right' });

  doc.end();
}

module.exports = { toExcel, toPdf };
