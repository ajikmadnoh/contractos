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

async function extractFromPdf(filePath) {
  const pdfParse = require('pdf-parse');
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);
  const pages = data.numpages || 0;
  const lines = data.text.split(/\r?\n/);

  const items = [];
  const sections = new Set();
  let currentSection = '';

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

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

  return { items, sections: [...sections], pages, lineCount: lines.length };
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
  return result;
}

module.exports = { extract, parseLine };
