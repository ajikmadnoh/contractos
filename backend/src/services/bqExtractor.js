// BQ extraction service — pulls structured Bill-of-Quantities line items out of
// an uploaded tender PDF or Excel BQ tab. Heuristic, best-effort: it recognises
// the common Malaysian BQ layout of  [item code] description … unit qty rate amount.

const fs = require('fs');
const path = require('path');

// Units commonly seen in Malaysian construction BQs.
const UNIT_TOKENS = [
  'm3', 'm2', 'm', 'mm', 'km', 'lm', 'l.m', 'rm',
  'nr', 'no', 'no.', 'nos', 'unit', 'units', 'set', 'sets', 'each', 'ea',
  'pcs', 'pc', 'kg', 'mt', 'ton', 'tonne', 'tonnes', 't',
  'sum', 'l.sum', 'lsum', 'ls', 'item', 'items',
  'hr', 'hrs', 'day', 'days', 'week', 'month', 'mth',
  'sq.m', 'sqm', 'cu.m', 'cum', 'litre', 'ltr', 'l', 'bag', 'bags', 'roll', 'visit',
];
const UNIT_SET = new Set(UNIT_TOKENS.map(u => u.toLowerCase()));

// Matches a standalone "unit price" line (e.g. "m 6.00", "m2 12.50", "nr 100"),
// as used in JKR-style Schedule-of-Rates documents. Longest units first so "m2"
// wins over "m". Anchored, so it won't fire on prose that merely starts with a unit.
const UNIT_ALT = UNIT_TOKENS.slice().sort((a, b) => b.length - a.length)
  .map(u => u.replace(/\./g, '\\.')).join('|');
const NUM = '\\d{1,3}(?:,\\d{3})*(?:\\.\\d+)?|\\d+(?:\\.\\d+)?';
// `\\.?` after the unit absorbs abbreviation dots ("kg.", "no.") not in the token list.
const RATE_LINE_RE = new RegExp(`^(${UNIT_ALT})\\.?\\s+(${NUM})$`, 'i');
// Same, but anchored only at the end — for items where the unit+rate trail the
// description on the same line (e.g. "…siku no. 3.11", "…rod keluli lembut kg. 3.10").
const TRAIL_RATE_RE = new RegExp(`\\b(${UNIT_ALT})\\.?\\s+(${NUM})\\s*$`, 'i');
// Item code at the start of a line: AA0000, B12, 1.10, MS96.1, etc.
const CODE_RE = /^([A-Z]{1,4}\d{2,5}(?:\.\d+)?|\d{1,3}\.\d{1,3})\s+(.*)$/;

// Section / trade header keywords — a line that looks like one of these (and has
// no trailing money column) is treated as a section divider, not a priced item.
const SECTION_HINTS = [
  'preliminaries', 'preambles', 'demolition', 'earthwork', 'earthworks', 'excavation',
  'concrete', 'concrete work', 'reinforcement', 'formwork', 'brickwork', 'blockwork',
  'masonry', 'roofing', 'roof', 'carpentry', 'joinery', 'metalwork', 'steelwork',
  'structural steel', 'plastering', 'finishes', 'flooring', 'tiling', 'painting',
  'plumbing', 'sanitary', 'drainage', 'electrical', 'mechanical', 'm&e', 'hvac',
  'external works', 'landscaping', 'doors', 'windows', 'glazing', 'waterproofing',
  'ironmongery', 'ceiling', 'partition', 'substructure', 'superstructure', 'piling',
  'foundation', 'frame', 'upper floors', 'staircase', 'provisional sums', 'contingencies',
  'bill no', 'element', 'trade',
];

const cleanNum = (s) => {
  const str = String(s ?? '').replace(/[,\s]/g, '');
  if (str === '') return NaN;
  return Number(str);
};

// Pull all number-like tokens. The comma-grouped form must actually contain a
// comma group (the `+`), otherwise plain runs like "4625" get clipped to "462".
const NUM_RE = /\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?/g;

function looksLikeSection(line) {
  const lower = line.toLowerCase().replace(/[^a-z& ]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!lower) return false;
  // Has trailing money → it's a priced row, not a header.
  return SECTION_HINTS.some(h => lower === h || lower.startsWith(h + ' ') || lower.includes(' ' + h));
}

// Try to parse a single physical line into a BQ item. Returns null if it doesn't
// look priced. Expected tail shapes:
//   "<desc> <unit> <qty> <rate> <amount>"
//   "<desc> <unit> <qty> <rate>"            (amount derived)
function parseLine(rawLine) {
  const line = rawLine.replace(/\s+/g, ' ').trim();
  if (line.length < 4) return null;

  const tokens = line.split(' ');
  if (tokens.length < 3) return null;

  // Find the unit token — scan from the right so descriptions containing stray
  // words like "no escalation" don't false-match early.
  let unitIdx = -1;
  for (let i = tokens.length - 1; i >= 1; i--) {
    const t = tokens[i].toLowerCase().replace(/[.,;:]+$/, '');
    if (UNIT_SET.has(t)) { unitIdx = i; break; }
  }
  if (unitIdx === -1) return null;

  const unit = tokens[unitIdx].replace(/[.,;:]+$/, '');
  const descTokens = tokens.slice(0, unitIdx);
  const tailTokens = tokens.slice(unitIdx + 1);

  // Numeric values following the unit.
  const nums = tailTokens.join(' ').match(NUM_RE)?.map(cleanNum).filter(n => !Number.isNaN(n)) || [];

  // "sum" / "item" / "ls" rows often carry only a single lump-sum amount.
  const lumpUnit = ['sum', 'lsum', 'l.sum', 'ls', 'item', 'items'].includes(unit.toLowerCase());

  let quantity = null, unitRate = null, amount = null;
  if (lumpUnit) {
    if (nums.length >= 1) { amount = nums[nums.length - 1]; quantity = 1; unitRate = amount; }
  } else if (nums.length >= 3) {
    quantity = nums[0]; unitRate = nums[1]; amount = nums[2];
  } else if (nums.length === 2) {
    quantity = nums[0]; unitRate = nums[1]; amount = quantity * unitRate;
  } else if (nums.length === 1) {
    quantity = nums[0];
  } else {
    return null; // unit but no numbers → likely prose
  }

  // Pull a leading item code (e.g. "A", "1.1", "B.2", "D") off the description.
  let section = '';
  let descStart = 0;
  if (descTokens.length) {
    const code = descTokens[0];
    const isNumberedCode = /^[A-Za-z]?\.?\d+(?:\.\d+)?[A-Za-z]?$/.test(code); // 1.1, B.2, 12a
    const isLetterCode = /^[A-Za-z]$/.test(code);                      // standalone A, B, D
    if (isNumberedCode || isLetterCode) descStart = 1;
  }
  const description = descTokens.slice(descStart).join(' ').trim();
  if (!description || description.length < 3) return null;

  // Reconcile amount when all three present but inconsistent (OCR slips).
  if (quantity != null && unitRate != null && (amount == null || amount === 0)) {
    amount = quantity * unitRate;
  }

  return {
    section,
    description,
    unit,
    quantity: quantity ?? null,
    unitRate: unitRate ?? null,
    amount: amount ?? 0,
  };
}

// Repeating page furniture to ignore (titles, column headers, bare page numbers).
function isNoise(line) {
  if (/^\d{1,4}$/.test(line)) return true;                       // bare page number
  if (/\bKOD\b.*\bKETERANGAN\b/i.test(line)) return true;        // SoR column header
  if (/JADUAL\s+KADAR\s+HARGA/i.test(line)) return true;         // JKR running title
  return false;
}

// JKR / JKH "Jadual Kadar Harga" — Schedule of Rates. Layout:
//   AA0000 SECTION TITLE              ← code ending in 00, no price → section header
//   AA0101 multi-line description…
//   m 6.00                            ← standalone "unit rate" line closes the item
// These are rate catalogues: there is a unit and a rate, but no quantity/amount.
function parseScheduleOfRates(pages) {
  const items = [];
  const sections = new Set();
  let currentSection = '';
  let pending = null; // { code, descLines: [] }

  const emit = (code, description, unit, rate) => {
    const desc = description.replace(/\s+/g, ' ').trim();
    if (!desc) return;
    const u = String(unit || '').replace(/\.+$/, '').toLowerCase(); // "no." → "no"
    items.push({ itemCode: code, section: currentSection, description: desc, unit: u, quantity: null, unitRate: rate, amount: 0 });
    if (currentSection) sections.add(currentSection);
  };

  // A code that never received a rate is a section/category header.
  const flushAsHeader = () => {
    if (pending) {
      const title = (pending.descLines[0] || '').replace(/\s+/g, ' ').trim();
      if (title) { currentSection = title.slice(0, 120); sections.add(currentSection); }
      pending = null;
    }
  };

  for (const page of pages) {
    for (const raw of page.text.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || isNoise(line)) continue;

      // (a) A standalone "unit rate" line closes a multi-line item.
      const rate = line.match(RATE_LINE_RE);
      if (rate && pending) {
        emit(pending.code, pending.descLines.join(' '), rate[1], cleanNum(rate[2]));
        pending = null;
        continue;
      }

      // (b) A new item code begins the line.
      const code = line.match(CODE_RE);
      if (code) {
        flushAsHeader();
        const rest = code[2] || '';
        const trail = rest.match(TRAIL_RATE_RE);
        if (trail) {
          // Inline item: code + description + unit + rate all on one line.
          emit(code[1], rest.slice(0, trail.index), trail[1], cleanNum(trail[2]));
          pending = null;
        } else {
          pending = { code: code[1], descLines: rest ? [rest] : [] };
        }
        continue;
      }

      // (c) A continuation line whose tail carries the unit+rate closes the item.
      const trail = line.match(TRAIL_RATE_RE);
      if (trail && pending) {
        const tail = line.slice(0, trail.index).trim();
        if (tail) pending.descLines.push(tail);
        emit(pending.code, pending.descLines.join(' '), trail[1], cleanNum(trail[2]));
        pending = null;
        continue;
      }

      // (d) Otherwise it's a continuation of the current description.
      if (pending) pending.descLines.push(line);
    }
  }
  flushAsHeader();
  return { items, sections: [...sections] };
}

// Generic priced BQ: one line per item, "[code] desc unit qty rate amount".
function parseGenericLines(pages) {
  const items = [];
  const sections = new Set();
  let currentSection = '';

  for (const page of pages) {
    for (const raw of page.text.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || isNoise(line)) continue;

      if (looksLikeSection(line) && !NUM_RE.test(line.replace(/[a-z]/gi, ''))) {
        currentSection = line.replace(/\s+/g, ' ').slice(0, 120);
        sections.add(currentSection);
        continue;
      }
      const item = parseLine(line);
      if (item) {
        item.section = item.section || currentSection;
        if (item.section) sections.add(item.section);
        items.push(item);
      }
    }
  }
  return { items, sections: [...sections] };
}

// Dispatch to the right parser based on document shape.
function parseTextPages(pages) {
  const sample = pages.slice(0, 3).map(p => p.text).join('\n');
  const isScheduleOfRates =
    /\bKOD\b/i.test(sample) && /\bKETERANGAN\b/i.test(sample) && /\bHARGA\b/i.test(sample);
  return isScheduleOfRates ? parseScheduleOfRates(pages) : parseGenericLines(pages);
}

async function extractFromPdf(filePath) {
  const { PDFParse } = require('pdf-parse');
  const data = new Uint8Array(fs.readFileSync(filePath));
  const parser = new PDFParse({ data });

  try {
    const txt = await parser.getText();
    const pageCount = txt.total || txt.pages.length;
    const denseChars = (txt.text || '').replace(/\s/g, '').length;
    const avgPerPage = pageCount ? denseChars / pageCount : 0;

    // Scanned / image-only PDF (no extractable text) → OCR fallback.
    if (avgPerPage < 20) {
      const { ocrScreenshots } = require('./ocrTextract');
      const shots = await parser.getScreenshot({ scale: 2, imageBuffer: true, imageDataUrl: false });
      const ocrPages = await ocrScreenshots(shots.pages);
      const parsed = parseTextPages(ocrPages);
      return { ...parsed, pages: pageCount, lineCount: ocrPages.length, viaOcr: true };
    }

    const parsed = parseTextPages(txt.pages);
    return { ...parsed, pages: pageCount, lineCount: txt.pages.length, viaOcr: false };
  } finally {
    await parser.destroy().catch(() => {});
  }
}

function extractFromExcel(filePath) {
  const XLSX = require('xlsx');
  const wb = XLSX.readFile(filePath);
  const items = [];
  const sections = new Set();

  for (const sheetName of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '' });
    let currentSection = sheetName;

    // Try to detect which columns hold desc/unit/qty/rate/amount from a header row.
    let cols = null;
    for (const row of rows) {
      const cells = row.map(c => (c == null ? '' : c));
      const joined = cells.join(' ').trim();
      if (!joined) continue;

      // Header detection
      if (!cols) {
        const lower = cells.map(c => String(c).toLowerCase().trim());
        const find = (...names) => lower.findIndex(c => names.some(n => c.includes(n)));
        // Prefer an explicit "description"/"particular" column; fall back to
        // "item" only if none exists (since "item" often labels the code column).
        let di = find('description', 'particular', 'desc');
        if (di === -1) di = find('item');
        const ui = find('unit', 'uom');
        const qi = find('qty', 'quantity');
        const ri = find('rate', 'unit rate', 'unit price');
        const ai = find('amount', 'total');
        if (di !== -1 && (qi !== -1 || ri !== -1 || ai !== -1)) {
          cols = { di, ui, qi, ri, ai };
          continue;
        }
        // Pre-header: a row with a single populated cell is a bill/section title.
        const populated = cells.filter(c => String(c).trim()).length;
        if (populated <= 1) { currentSection = joined.slice(0, 120); sections.add(currentSection); }
        continue;
      }

      if (cols) {
        const desc = String(cells[cols.di] ?? '').trim();
        const unit = String(cells[cols.ui] ?? '').trim();
        const qty = cleanNum(cells[cols.qi]);
        const rate = cleanNum(cells[cols.ri]);
        let amt = cleanNum(cells[cols.ai]);

        // A row with a single text cell (in any column) is a section divider.
        const populated = cells.filter(c => String(c).trim()).length;
        const hasNumbers = ![qty, rate, amt].every(Number.isNaN);
        if (populated === 1 && !hasNumbers) {
          const label = cells.map(c => String(c).trim()).find(Boolean) || '';
          if (label && !/^[\d.,]+$/.test(label)) { currentSection = label.slice(0, 120); sections.add(currentSection); }
          continue;
        }
        if (!desc) continue;
        // Section row: text only, no numbers.
        if (!unit && !qty && !rate && !amt) {
          currentSection = desc.slice(0, 120);
          sections.add(currentSection);
          continue;
        }
        if (Number.isNaN(amt) || !amt) {
          amt = (Number.isNaN(qty) ? 0 : qty) * (Number.isNaN(rate) ? 0 : rate);
        }
        items.push({
          section: currentSection,
          description: desc,
          unit: unit || null,
          quantity: Number.isNaN(qty) ? null : qty,
          unitRate: Number.isNaN(rate) ? null : rate,
          amount: amt || 0,
        });
        sections.add(currentSection);
      }
    }
  }

  return { items, sections: [...sections], pages: wb.SheetNames.length, lineCount: items.length };
}

async function extract(filePath, originalName) {
  const ext = path.extname(originalName || filePath).toLowerCase();
  let result;
  if (ext === '.pdf') {
    result = await extractFromPdf(filePath);
  } else if (ext === '.xlsx' || ext === '.xls') {
    result = extractFromExcel(filePath);
  } else {
    return { items: [], sections: [], pages: 0, lineCount: 0, total: 0 };
  }
  result.total = result.items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  // Count distinct units priced — useful signal for rate-schedule imports.
  result.viaOcr = result.viaOcr || false;
  return result;
}

module.exports = { extract, parseLine, parseScheduleOfRates, parseGenericLines };
