const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { ROLES } = require('../config/constants');
const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const n = (v) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };

// Build a progress claim from project_scope: value done to date per line, net of
// what prior non-rejected claims already billed against that scope line.
async function buildScopeClaim(projectId, tenantId) {
  const proj = await query('SELECT retention_percentage FROM projects WHERE id=$1 AND tenant_id=$2', [projectId, tenantId]);
  if (proj.rows.length === 0) return null;

  const scope = await query(
    `SELECT id, item_code, section, description, unit, contract_qty, unit_rate, amount, qty_done, pct_complete
     FROM project_scope WHERE project_id=$1 AND tenant_id=$2 ORDER BY sort_order, created_at`,
    [projectId, tenantId]
  );

  // Previously claimed value per scope line (claims not rejected).
  const prev = await query(
    `SELECT ci.project_scope_id, COALESCE(SUM(ci.this_value),0) AS billed
     FROM claim_items ci JOIN claims c ON ci.claim_id=c.id
     WHERE c.project_id=$1 AND c.tenant_id=$2 AND c.status <> 'rejected'
     GROUP BY ci.project_scope_id`,
    [projectId, tenantId]
  );
  const billedMap = {};
  prev.rows.forEach(r => { billedMap[r.project_scope_id] = n(r.billed); });

  const lines = [];
  let cumulativeValue = 0, previousValue = 0;
  for (const s of scope.rows) {
    const rate = n(s.unit_rate);
    const contractAmount = n(s.amount) || (n(s.contract_qty) * rate);
    const qtyDone = n(s.qty_done);
    const cumValue = rate > 0 ? qtyDone * rate
                   : contractAmount * (n(s.pct_complete) / 100);   // fallback: pct of value
    const billed = billedMap[s.id] || 0;
    const thisValue = Math.max(0, cumValue - billed);
    cumulativeValue += cumValue;
    previousValue += billed;
    if (cumValue <= 0 && billed <= 0) continue; // skip untouched lines
    lines.push({
      scopeId: s.id, itemCode: s.item_code, section: s.section, description: s.description,
      unit: s.unit, contractQty: n(s.contract_qty), unitRate: rate, contractAmount,
      cumulativeQty: qtyDone, cumulativePct: n(s.pct_complete),
      cumulativeValue: cumValue, previousValue: billed, thisValue,
    });
  }

  const thisClaim = lines.reduce((a, l) => a + l.thisValue, 0);
  const retentionPct = n(proj.rows[0].retention_percentage) / 100;
  const retentionAmount = thisClaim * retentionPct;
  return {
    projectId,
    cumulativeValue: +cumulativeValue.toFixed(2),
    previousValue: +previousValue.toFixed(2),
    thisClaim: +thisClaim.toFixed(2),
    retentionAmount: +retentionAmount.toFixed(2),
    netAmount: +(thisClaim - retentionAmount).toFixed(2),
    lines,
  };
}

// ── CLAIMS ──────────────────────────────────────────────────

router.get('/claims', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT c.*, p.name as project_name, u.name as submitted_by_name
       FROM claims c
       LEFT JOIN projects p ON c.project_id = p.id
       LEFT JOIN users u ON c.submitted_by = u.id
       WHERE c.tenant_id = $1 ORDER BY c.created_at DESC`,
      [req.user.tenant_id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

router.post('/claims', authenticate, authorize(ROLES.DIRECTOR, ROLES.ADMIN, ROLES.QS, ROLES.FINANCE), async (req, res, next) => {
  try {
    const { projectId, claimType, claimDate, amount, description } = req.body;

    // Get project retention %
    const proj = await query('SELECT retention_percentage FROM projects WHERE id=$1 AND tenant_id=$2', [projectId, req.user.tenant_id]);
    if (proj.rows.length === 0) return res.status(404).json({ error: 'Project not found.' });

    const retentionPct = Number(proj.rows[0].retention_percentage) / 100;
    const retentionAmount = Number(amount) * retentionPct;
    const netAmount = Number(amount) - retentionAmount;
    const claimNumber = `CLM-${Date.now().toString().slice(-6)}`;

    const result = await query(
      `INSERT INTO claims (id, tenant_id, project_id, claim_number, claim_type, claim_date, amount, retention_amount, net_amount, description, submitted_by, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'manual') RETURNING *`,
      [uuidv4(), req.user.tenant_id, projectId, claimNumber, claimType, claimDate, amount, retentionAmount, netAmount, description, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
});

// GET /finance/claims/preview/:projectId
// Preview a progress claim built from project_scope work-done-to-date,
// net of what prior (non-rejected) claims already billed per scope line.
router.get('/claims/preview/:projectId', authenticate, async (req, res, next) => {
  try {
    const data = await buildScopeClaim(req.params.projectId, req.user.tenant_id);
    if (!data) return res.status(404).json({ error: 'Project not found.' });
    res.json(data);
  } catch (err) { next(err); }
});

// POST /finance/claims/generate  { projectId, claimDate }
// Materialise the scope-based progress claim + per-line claim_items.
router.post('/claims/generate', authenticate, authorize(ROLES.DIRECTOR, ROLES.ADMIN, ROLES.QS, ROLES.FINANCE), async (req, res, next) => {
  try {
    const { projectId, claimDate, description } = req.body;
    const data = await buildScopeClaim(projectId, req.user.tenant_id);
    if (!data) return res.status(404).json({ error: 'Project not found.' });
    if (data.lines.length === 0) return res.status(400).json({ error: 'No scope items to claim. Import a BQ and record progress first.' });
    if (Number(data.thisClaim) <= 0) return res.status(400).json({ error: 'Nothing new to claim — all work done to date has already been claimed.' });

    const claimNumber = `CLM-${Date.now().toString().slice(-6)}`;
    const id = uuidv4();
    await query('BEGIN');
    try {
      await query(
        `INSERT INTO claims (id, tenant_id, project_id, claim_number, claim_type, claim_date, amount, retention_amount, net_amount, description, submitted_by, source, work_done_value, previous_value)
         VALUES ($1,$2,$3,$4,'progress',$5,$6,$7,$8,$9,$10,'scope',$11,$12)`,
        [id, req.user.tenant_id, projectId, claimNumber, claimDate || new Date().toISOString().split('T')[0],
         data.thisClaim, data.retentionAmount, data.netAmount,
         description || `Progress claim — work done to ${claimDate || 'date'}`,
         req.user.id, data.cumulativeValue, data.previousValue]
      );
      for (let i = 0; i < data.lines.length; i++) {
        const l = data.lines[i];
        await query(
          `INSERT INTO claim_items (id, claim_id, project_scope_id, item_code, section, description, unit, contract_qty, unit_rate, contract_amount, cumulative_qty, cumulative_pct, cumulative_value, previous_value, this_value, sort_order)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
          [uuidv4(), id, l.scopeId, l.itemCode, l.section, l.description, l.unit, l.contractQty, l.unitRate, l.contractAmount, l.cumulativeQty, l.cumulativePct, l.cumulativeValue, l.previousValue, l.thisValue, i]
        );
      }
      await query('COMMIT');
    } catch (e) { await query('ROLLBACK'); throw e; }

    const created = await query('SELECT * FROM claims WHERE id=$1', [id]);
    res.status(201).json(created.rows[0]);
  } catch (err) { next(err); }
});

// GET /finance/claims/:id — claim with its line items
router.get('/claims/:id', authenticate, async (req, res, next) => {
  try {
    const [claim, items] = await Promise.all([
      query(`SELECT c.*, p.name as project_name, u.name as submitted_by_name
             FROM claims c LEFT JOIN projects p ON c.project_id=p.id LEFT JOIN users u ON c.submitted_by=u.id
             WHERE c.id=$1 AND c.tenant_id=$2`, [req.params.id, req.user.tenant_id]),
      query('SELECT * FROM claim_items WHERE claim_id=$1 ORDER BY sort_order', [req.params.id]),
    ]);
    if (claim.rows.length === 0) return res.status(404).json({ error: 'Claim not found.' });
    res.json({ ...claim.rows[0], items: items.rows });
  } catch (err) { next(err); }
});

router.patch('/claims/:id/status', authenticate, authorize(ROLES.DIRECTOR, ROLES.ADMIN, ROLES.FINANCE), async (req, res, next) => {
  try {
    const { status } = req.body;
    const result = await query(
      'UPDATE claims SET status=$1 WHERE id=$2 AND tenant_id=$3 RETURNING *',
      [status, req.params.id, req.user.tenant_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Claim not found.' });

    // Auto-create payment cert when claim is certified
    if (status === 'certified') {
      const claim = result.rows[0];
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);
      await query(
        `INSERT INTO payment_certificates (id, tenant_id, project_id, claim_id, cert_number, cert_date, certified_amount, due_date)
         VALUES ($1,$2,$3,$4,$5,NOW(),$6,$7)`,
        [uuidv4(), req.user.tenant_id, claim.project_id, claim.id, `CERT-${Date.now().toString().slice(-6)}`, claim.net_amount, dueDate.toISOString().split('T')[0]]
      );
    }
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// ── PAYMENT CERTIFICATES ─────────────────────────────────────

router.get('/payment-certs', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT pc.*, p.name as project_name
       FROM payment_certificates pc
       LEFT JOIN projects p ON pc.project_id = p.id
       WHERE pc.tenant_id = $1 ORDER BY pc.created_at DESC`,
      [req.user.tenant_id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

router.patch('/payment-certs/:id', authenticate, authorize(ROLES.DIRECTOR, ROLES.ADMIN, ROLES.FINANCE), async (req, res, next) => {
  try {
    const { status, paidDate } = req.body;
    const result = await query(
      'UPDATE payment_certificates SET status=$1, paid_date=$2 WHERE id=$3 AND tenant_id=$4 RETURNING *',
      [status, paidDate || null, req.params.id, req.user.tenant_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Certificate not found.' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// POST /finance/payment-certs/:id/invoice
// One-click bill: create an invoice pre-filled from a certified payment cert,
// linked back to the cert + claim. Idempotent-ish: blocks double billing.
router.post('/payment-certs/:id/invoice', authenticate, authorize(ROLES.DIRECTOR, ROLES.ADMIN, ROLES.FINANCE), async (req, res, next) => {
  try {
    const cert = (await query(
      `SELECT pc.*, p.name AS project_name, p.client_id
       FROM payment_certificates pc LEFT JOIN projects p ON pc.project_id=p.id
       WHERE pc.id=$1 AND pc.tenant_id=$2`, [req.params.id, req.user.tenant_id]
    )).rows[0];
    if (!cert) return res.status(404).json({ error: 'Certificate not found.' });
    if (cert.invoiced) return res.status(409).json({ error: 'This certificate has already been invoiced.' });

    const id = uuidv4();
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
    const subtotal = n(cert.certified_amount);
    const invoiceDate = new Date().toISOString().split('T')[0];

    await query('BEGIN');
    try {
      const inv = await query(
        `INSERT INTO invoices (id, tenant_id, project_id, client_id, invoice_number, invoice_date, due_date, currency, subtotal, tax_rate, tax_amount, total, status, notes, claim_id, payment_cert_id, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'MYR',$8,0,0,$8,'unpaid',$9,$10,$11,$12) RETURNING *`,
        [id, req.user.tenant_id, cert.project_id, cert.client_id, invoiceNumber, invoiceDate, cert.due_date,
         subtotal, `Payment certificate ${cert.cert_number} — ${cert.project_name || ''}`.trim(), cert.claim_id, cert.id, req.user.id]
      );
      await query(
        'INSERT INTO invoice_items (id, invoice_id, description, quantity, unit_price, amount, sort_order) VALUES ($1,$2,$3,1,$4,$4,0)',
        [uuidv4(), id, `Certified work — ${cert.cert_number}`, subtotal]
      );
      await query('UPDATE payment_certificates SET invoiced=TRUE WHERE id=$1', [cert.id]);
      await query('COMMIT');
      res.status(201).json(inv.rows[0]);
    } catch (e) { await query('ROLLBACK'); throw e; }
  } catch (err) { next(err); }
});

module.exports = router;
