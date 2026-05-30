// BQ pricing intelligence — the "AI auto-fill from past BQs & market rates"
// capability from the spec. No external LLM required: it learns from the
// tenant's own priced history plus their market-rate library, scores each
// candidate against the line being priced with token similarity, and returns
// a robust (median) rate with a confidence and provenance.
//
// Exposed:
//   suggestRate(tenantId, description, unit)      → ranked suggestions (live add-row)
//   suggestBatch(tenantId, items)                 → top suggestion per item (auto-price/insights)
//   autoSection(description)                       → keyword section classifier
//
// The corpus is loaded once per call/batch so pricing a whole BQ is a single
// round-trip to the DB, not one per line.

const { query } = require('../config/database');

// ── Text normalisation ────────────────────────────────────────────────────────
// Construction descriptions ("Supply & lay 100mm thick concrete grade 25") carry
// meaning in their numbers/units (100mm, grade 25, m3), so we KEEP digits and
// drop only boilerplate verbs that add no discriminating signal.
const STOPWORDS = new Set([
  'and', 'the', 'to', 'of', 'for', 'with', 'in', 'on', 'as', 'at', 'by', 'a', 'an',
  'or', 'per', 'all', 'any', 'is', 'are', 'be', 'including', 'incl', 'etc',
  'supply', 'lay', 'laying', 'install', 'installation', 'provide', 'providing',
  'fix', 'fixing', 'fixed', 'complete', 'completed', 'works', 'work', 'item',
]);

function tokenize(text) {
  if (!text) return new Set();
  const raw = String(text)
    .toLowerCase()
    .replace(/[^a-z0-9.\s]/g, ' ')   // keep letters, digits, dots
    .split(/\s+/)
    .filter(Boolean);
  const out = new Set();
  for (let t of raw) {
    t = t.replace(/^\.+|\.+$/g, '');         // trim stray dots
    if (t.length < 2 && !/[0-9]/.test(t)) continue; // drop 1-char non-numbers
    if (STOPWORDS.has(t)) continue;
    out.add(t);
  }
  return out;
}

const normUnit = (u) => String(u || '').toLowerCase().replace(/[^a-z0-9]/g, '');

// Blended similarity: Jaccard rewards overall overlap, containment rewards the
// query being a subset of a longer historical description (common when staff
// type a short line that matches a verbose past entry). Unit agreement nudges up.
function similarity(aTokens, bTokens, aUnit, bUnit) {
  if (aTokens.size === 0 || bTokens.size === 0) return 0;
  let inter = 0;
  for (const t of aTokens) if (bTokens.has(t)) inter++;
  if (inter === 0) return 0;
  const union = aTokens.size + bTokens.size - inter;
  const jaccard = inter / union;
  const containment = inter / Math.min(aTokens.size, bTokens.size);
  let score = 0.55 * jaccard + 0.45 * containment;
  const au = normUnit(aUnit), bu = normUnit(bUnit);
  if (au && bu) score += au === bu ? 0.08 : -0.05; // agree → up, disagree → down
  return Math.max(0, Math.min(1, score));
}

const median = (nums) => {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

// ── Corpus ─────────────────────────────────────────────────────────────────────
// Pull the tenant's priced history (grouped by identical description → median
// rate, robust to a stray typo'd line) and their market-rate library.
async function loadCorpus(tenantId) {
  const [hist, market] = await Promise.all([
    query(
      `SELECT i.description, i.unit, i.unit_rate
       FROM bq_items i JOIN bq_documents d ON i.bq_id = d.id
       WHERE d.tenant_id = $1 AND d.deleted_at IS NULL
         AND i.unit_rate IS NOT NULL AND i.unit_rate > 0 AND i.description IS NOT NULL`,
      [tenantId]
    ),
    query(
      `SELECT item_name AS description, unit, COALESCE(our_rate, rate) AS unit_rate
       FROM market_rates
       WHERE tenant_id = $1 AND COALESCE(our_rate, rate) > 0 AND is_active IS NOT FALSE`,
      [tenantId]
    ),
  ]);

  // Group history by normalised description so repeated lines vote together.
  const groups = new Map();
  for (const r of hist.rows) {
    const key = String(r.description).toLowerCase().replace(/\s+/g, ' ').trim();
    if (!groups.has(key)) groups.set(key, { description: r.description, unit: r.unit, rates: [] });
    groups.get(key).rates.push(Number(r.unit_rate));
  }
  const history = [...groups.values()].map(g => ({
    description: g.description,
    unit: g.unit,
    tokens: tokenize(g.description),
    rate: median(g.rates),
    sampleCount: g.rates.length,
  }));

  const marketRates = market.rows.map(r => ({
    description: r.description,
    unit: r.unit,
    tokens: tokenize(r.description),
    rate: Number(r.unit_rate),
    sampleCount: 1,
  }));

  return { history, market: marketRates };
}

// ── Scoring against a loaded corpus ─────────────────────────────────────────────
const THRESHOLD = 0.22; // below this we don't trust the match enough to surface it

function suggestFromCorpus(corpus, description, unit, { limit = 3 } = {}) {
  const qTokens = tokenize(description);
  if (qTokens.size === 0) return [];

  const scored = [];
  for (const h of corpus.history) {
    const sim = similarity(qTokens, h.tokens, unit, h.unit);
    if (sim >= THRESHOLD) scored.push({ rate: +h.rate.toFixed(2), unit: h.unit, source: 'history', confidence: +sim.toFixed(3), sampleCount: h.sampleCount, matched: h.description });
  }
  for (const m of corpus.market) {
    const sim = similarity(qTokens, m.tokens, unit, m.unit);
    // History is preferred when scores tie: it reflects what this firm actually charges.
    if (sim >= THRESHOLD) scored.push({ rate: +m.rate.toFixed(2), unit: m.unit, source: 'market', confidence: +(sim * 0.97).toFixed(3), sampleCount: 1, matched: m.description });
  }

  scored.sort((a, b) => b.confidence - a.confidence || b.sampleCount - a.sampleCount);
  return scored.slice(0, limit);
}

async function suggestRate(tenantId, description, unit, opts) {
  const corpus = await loadCorpus(tenantId);
  return suggestFromCorpus(corpus, description, unit, opts);
}

// Top suggestion per item, aligned by index (null where nothing confident found).
async function suggestBatch(tenantId, items, opts) {
  const corpus = await loadCorpus(tenantId);
  return (items || []).map(it => suggestFromCorpus(corpus, it.description, it.unit, { ...opts, limit: 1 })[0] || null);
}

// ── Section classifier ──────────────────────────────────────────────────────────
// Maps a description to a standard Malaysian-BQ trade section by keyword. Used to
// auto-suggest a section when the user leaves it blank.
const SECTION_RULES = [
  ['Preliminaries', /\b(prelim|insurance|bond|site office|hoarding|mobilis|mobiliz|setting out)\b/i],
  ['Earthworks', /\b(excavat|earth|backfill|disposal|cut and fill|levelling|grading|hardcore)\b/i],
  ['Piling & Foundation', /\b(pile|piling|pilecap|pile cap|foundation|footing|raft)\b/i],
  ['Concrete', /\b(concrete|grade \d|rc |reinforced|screed|blinding)\b/i],
  ['Reinforcement', /\b(rebar|reinforcement|bar|brc|mesh|steel bar|high tensile)\b/i],
  ['Formwork', /\b(formwork|shutter|falsework|plywood form)\b/i],
  ['Masonry', /\b(brick|block|masonry|wall.*\d+mm|cement sand)\b/i],
  ['Roofing', /\b(roof|truss|purlin|gutter|fascia|ridge|metal deck)\b/i],
  ['Finishes', /\b(plaster|render|paint|tile|tiling|skirting|ceiling|cornice|finish)\b/i],
  ['Doors & Windows', /\b(door|window|ironmongery|glazing|louvre|grille)\b/i],
  ['Plumbing & Sanitary', /\b(plumb|sanitary|pipe|water closet|wc|basin|drainage|sewer|manhole)\b/i],
  ['Electrical', /\b(electric|cable|conduit|wiring|lighting|socket|db board|distribution board|earthing)\b/i],
  ['Mechanical & ACMV', /\b(acmv|air cond|ductwork|hvac|ventilation|chiller|fan coil)\b/i],
  ['External Works', /\b(road|kerb|drain|pavement|interlocking|landscape|fencing|turfing)\b/i],
];

function autoSection(description) {
  if (!description) return null;
  for (const [name, rx] of SECTION_RULES) if (rx.test(description)) return name;
  return null;
}

module.exports = { suggestRate, suggestBatch, autoSection, loadCorpus, suggestFromCorpus, tokenize, similarity };
