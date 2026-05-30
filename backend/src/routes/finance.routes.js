const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { ROLES } = require('../config/constants');
const { query, withTransaction } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const automation = require('../services/automationService');
const { buildClaimPdf, buildCertPdf } = require('../services/pdfService');

const n = (v) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const fmtRM = (v) => `RM ${n(v).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
                   : contractAmount * (n(s.pct_complete) / 100);
    const billed = billedMap[s.id] || 0;
    const thisValue = Math.max(0, cumValue - billed);
    cumulativeValue += cumValue;
    previousValue += billed;
    if (cumValue <= 0 && billed <= 0) continue;
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
    const { projectId, status } = req.query;
    let sql = `SELECT c.*, p.name as project_name, u.name as submitted_by_name
               FROM claims c
               LEFT JOIN projects p ON c.project_id = p.id
               LEFT JOIN users u ON c.submitted_by = u.id
               WHERE c.tenant_id = $1`;
    const params = [req.user.tenant_id];
    if (projectId) { params.push(projectId); sql += ` AND c.project_id = $${params.length}`; }
    if (status)    { params.push(status);    sql += ` AND c.status = $${params.length}`; }
    sql += ' ORDER BY c.created_at DESC';
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) { next(err); }
});

router.post('/claims', authenticate, authorize(ROLES.DIRECTOR, ROLES.ADMIN, ROLES.QS, ROLES.FINANCE), async (req, res, next) => {
  try {
    const { projectId, claimType, claimDate, amount, description, taxRate = 0, notes } = req.body;

    const proj = await query('SELECT retention_percentage FROM projects WHERE id=$1 AND tenant_id=$2', [projectId, req.user.tenant_id]);
    if (proj.rows.length === 0) return res.status(404).json({ error: 'Project not found.' });

    const retentionPct = Number(proj.rows[0].retention_percentage) / 100;
    const retentionAmount = Number(amount) * retentionPct;
    const taxAmount = Number(amount) * (Number(taxRate) / 100);
    const netAmount = Number(amount) - retentionAmount + taxAmount;
    const claimNumber = `CLM-${Date.now().toString().slice(-6)}`;

    const result = await query(
      `INSERT INTO claims (id, tenant_id, project_id, claim_number, claim_type, claim_date, amount, retention_amount, net_amount, tax_rate, tax_amount, description, notes, submitted_by, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'manual') RETURNING *`,
      [uuidv4(), req.user.tenant_id, projectId, claimNumber, claimType, claimDate, amount, retentionAmount, netAmount, taxRate, taxAmount, description, notes || null, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
});

// GET /finance/claims/preview/:projectId
router.get('/claims/preview/:projectId', authenticate, async (req, res, next) => {
  try {
    const data = await buildScopeClaim(req.params.projectId, req.user.tenant_id);
    if (!data) return res.status(404).json({ error: 'Project not found.' });
    res.json(data);
  } catch (err) { next(err); }
});

// POST /finance/claims/generate  { projectId, claimDate, taxRate }
router.post('/claims/generate', authenticate, authorize(ROLES.DIRECTOR, ROLES.ADMIN, ROLES.QS, ROLES.FINANCE), async (req, res, next) => {
  try {
    const { projectId, claimDate, description, taxRate = 0 } = req.body;
    const data = await buildScopeClaim(projectId, req.user.tenant_id);
    if (!data) return res.status(404).json({ error: 'Project not found.' });
    if (data.lines.length === 0) return res.status(400).json({ error: 'No scope items to claim. Import a BQ and record progress first.' });
    if (Number(data.thisClaim) <= 0) return res.status(400).json({ error: 'Nothing new to claim — all work done to date has already been claimed.' });

    const taxAmount = data.thisClaim * (Number(taxRate) / 100);
    const netAmount = data.netAmount + taxAmount;

    const claimNumber = `CLM-${Date.now().toString().slice(-6)}`;
    const id = uuidv4();
    await withTransaction(async (q) => {
      await q(
        `INSERT INTO claims (id, tenant_id, project_id, claim_number, claim_type, claim_date, amount, retention_amount, net_amount, tax_rate, tax_amount, description, submitted_by, source, work_done_value, previous_value)
         VALUES ($1,$2,$3,$4,'progress',$5,$6,$7,$8,$9,$10,$11,$12,'scope',$13,$14)`,
        [id, req.user.tenant_id, projectId, claimNumber,
         claimDate || new Date().toISOString().split('T')[0],
         data.thisClaim, data.retentionAmount, netAmount,
         Number(taxRate), taxAmount,
         description || `Progress claim — work done to ${claimDate || 'date'}`,
         req.user.id, data.cumulativeValue, data.previousValue]
      );
      for (let i = 0; i < data.lines.length; i++) {
        const l = data.lines[i];
        await q(
          `INSERT INTO claim_items (id, claim_id, project_scope_id, item_code, section, description, unit, contract_qty, unit_rate, contract_amount, cumulative_qty, cumulative_pct, cumulative_value, previous_value, this_value, sort_order)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
          [uuidv4(), id, l.scopeId, l.itemCode, l.section, l.description, l.unit, l.contractQty, l.unitRate, l.contractAmount, l.cumulativeQty, l.cumulativePct, l.cumulativeValue, l.previousValue, l.thisValue, i]
        );
      }
    });

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
    const claim = await withTransaction(async (q) => {
      const result = await q(
        'UPDATE claims SET status=$1 WHERE id=$2 AND tenant_id=$3 RETURNING *',
        [status, req.params.id, req.user.tenant_id]
      );
      if (result.rows.length === 0) return null;
      const c = result.rows[0];
      if (status === 'certified') {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);
        // Idempotent: never raise a second cert for a claim that already has one
        // (re-certify, or rejected→certified round-trips).
        await q(
          `INSERT INTO payment_certificates (id, tenant_id, project_id, claim_id, cert_number, cert_date, certified_amount, due_date)
           SELECT $1,$2,$3,$4,$5,NOW(),$6,$7
           WHERE NOT EXISTS (SELECT 1 FROM payment_certificates WHERE claim_id=$4)`,
          [uuidv4(), req.user.tenant_id, c.project_id, c.id, `CERT-${Date.now().toString().slice(-6)}`, c.net_amount, dueDate.toISOString().split('T')[0]]
        );
      }
      return c;
    });
    if (!claim) return res.status(404).json({ error: 'Claim not found.' });

    await automation.notifyClaimStatus(claim, req.user.tenant_id);
    res.json(claim);
  } catch (err) { next(err); }
});

// PATCH /finance/claims/:id/notes
router.patch('/claims/:id/notes', authenticate, authorize(ROLES.DIRECTOR, ROLES.ADMIN, ROLES.FINANCE, ROLES.QS), async (req, res, next) => {
  try {
    const { notes } = req.body;
    const result = await query(
      'UPDATE claims SET notes=$1, updated_at=NOW() WHERE id=$2 AND tenant_id=$3 RETURNING *',
      [notes || null, req.params.id, req.user.tenant_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Claim not found.' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// GET /finance/claims/:id/pdf
router.get('/claims/:id/pdf', authenticate, async (req, res, next) => {
  try {
    const [claimRes, itemsRes, tenantRes] = await Promise.all([
      query(`SELECT c.*, p.name as project_name, u.name as submitted_by_name
             FROM claims c LEFT JOIN projects p ON c.project_id=p.id LEFT JOIN users u ON c.submitted_by=u.id
             WHERE c.id=$1 AND c.tenant_id=$2`, [req.params.id, req.user.tenant_id]),
      query('SELECT * FROM claim_items WHERE claim_id=$1 ORDER BY sort_order', [req.params.id]),
      query('SELECT company_name, address, phone, ssm_number FROM tenants WHERE id=$1', [req.user.tenant_id]),
    ]);
    if (claimRes.rows.length === 0) return res.status(404).json({ error: 'Claim not found.' });
    buildClaimPdf(res, { claim: claimRes.rows[0], items: itemsRes.rows, tenant: tenantRes.rows[0] || {} });
  } catch (err) { next(err); }
});

// ── PAYMENT CERTIFICATES ─────────────────────────────────────

router.get('/payment-certs', authenticate, async (req, res, next) => {
  try {
    const { projectId, status } = req.query;
    let sql = `SELECT pc.*, p.name as project_name, pr.company_name AS client_name,
                      cl.amount AS claim_amount, cl.retention_amount AS claim_retention
               FROM payment_certificates pc
               LEFT JOIN projects p ON pc.project_id = p.id
               LEFT JOIN profiles pr ON p.client_id = pr.id
               LEFT JOIN claims cl ON pc.claim_id = cl.id
               WHERE pc.tenant_id = $1`;
    const params = [req.user.tenant_id];
    if (projectId) { params.push(projectId); sql += ` AND pc.project_id = $${params.length}`; }
    if (status)    { params.push(status);    sql += ` AND pc.status = $${params.length}`; }
    sql += ' ORDER BY pc.created_at DESC';
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) { next(err); }
});

router.patch('/payment-certs/:id', authenticate, authorize(ROLES.DIRECTOR, ROLES.ADMIN, ROLES.FINANCE), async (req, res, next) => {
  try {
    const { status, paidDate, certifiedAmount, notes } = req.body;
    const fields = [], params = [];
    if (status !== undefined)          { params.push(status);          fields.push(`status=$${params.length}`); }
    if (paidDate !== undefined)        { params.push(paidDate || null); fields.push(`paid_date=$${params.length}`); }
    if (certifiedAmount !== undefined) { params.push(certifiedAmount); fields.push(`certified_amount=$${params.length}`); }
    if (notes !== undefined)           { params.push(notes || null);   fields.push(`notes=$${params.length}`); }
    if (fields.length === 0) return res.status(400).json({ error: 'Nothing to update.' });
    // Marking a cert paid outright should settle it in full, mirroring the
    // partial-payment endpoint which maintains amount_paid.
    if (status === 'paid') fields.push('amount_paid = certified_amount');
    fields.push('updated_at=NOW()');
    params.push(req.params.id, req.user.tenant_id);
    const result = await query(
      `UPDATE payment_certificates SET ${fields.join(', ')} WHERE id=$${params.length - 1} AND tenant_id=$${params.length} RETURNING *`,
      params
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Certificate not found.' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// POST /finance/payment-certs/:id/partial
router.post('/payment-certs/:id/partial', authenticate, authorize(ROLES.DIRECTOR, ROLES.ADMIN, ROLES.FINANCE), async (req, res, next) => {
  try {
    const { amountPaid } = req.body;
    if (!amountPaid || Number(amountPaid) <= 0) return res.status(400).json({ error: 'amountPaid must be positive.' });

    const certRes = await query(
      'SELECT * FROM payment_certificates WHERE id=$1 AND tenant_id=$2',
      [req.params.id, req.user.tenant_id]
    );
    if (certRes.rows.length === 0) return res.status(404).json({ error: 'Certificate not found.' });
    const cert = certRes.rows[0];
    if (cert.status === 'paid') return res.status(409).json({ error: 'Certificate is already fully paid.' });

    const newAmountPaid = n(cert.amount_paid) + n(amountPaid);
    const isFullyPaid = newAmountPaid >= n(cert.certified_amount);
    const newStatus = isFullyPaid ? 'paid' : 'partially_paid';
    const paidDate = isFullyPaid ? new Date().toISOString().split('T')[0] : null;

    const result = await query(
      `UPDATE payment_certificates
         SET amount_paid=$1, status=$2, paid_date=COALESCE($3, paid_date), updated_at=NOW()
       WHERE id=$4 AND tenant_id=$5 RETURNING *`,
      [newAmountPaid, newStatus, paidDate, req.params.id, req.user.tenant_id]
    );

    if (isFullyPaid) {
      await automation.notifyProjectStakeholders(cert.project_id, [ROLES.DIRECTOR, ROLES.FINANCE], {
        tenantId: req.user.tenant_id,
        title: 'Payment cert fully paid',
        message: `Cert ${cert.cert_number} is now fully paid (${fmtRM(cert.certified_amount)}).`,
        type: 'success', link: '/finance',
      });
    }
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// POST /finance/payment-certs/:id/invoice
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

    const invoice = await withTransaction(async (q) => {
      const inv = await q(
        `INSERT INTO invoices (id, tenant_id, project_id, client_id, invoice_number, invoice_date, due_date, currency, subtotal, tax_rate, tax_amount, total, status, notes, claim_id, payment_cert_id, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'MYR',$8,0,0,$8,'unpaid',$9,$10,$11,$12) RETURNING *`,
        [id, req.user.tenant_id, cert.project_id, cert.client_id, invoiceNumber, invoiceDate, cert.due_date,
         subtotal, `Payment certificate ${cert.cert_number} — ${cert.project_name || ''}`.trim(), cert.claim_id, cert.id, req.user.id]
      );
      await q(
        'INSERT INTO invoice_items (id, invoice_id, description, quantity, unit_price, amount, sort_order) VALUES ($1,$2,$3,1,$4,$4,0)',
        [uuidv4(), id, `Certified work — ${cert.cert_number}`, subtotal]
      );
      await q('UPDATE payment_certificates SET invoiced=TRUE WHERE id=$1', [cert.id]);
      return inv.rows[0];
    });
    await automation.notifyRoles([ROLES.DIRECTOR, ROLES.FINANCE], {
      tenantId: req.user.tenant_id, title: 'Invoice raised',
      message: `${invoiceNumber} (${fmtRM(subtotal)}) raised from cert ${cert.cert_number}.`,
      type: 'info', link: '/invoicing',
    });
    res.status(201).json(invoice);
  } catch (err) { next(err); }
});

// GET /finance/payment-certs/:id/pdf
router.get('/payment-certs/:id/pdf', authenticate, async (req, res, next) => {
  try {
    const [certRes, tenantRes] = await Promise.all([
      query(`SELECT pc.*, p.name as project_name FROM payment_certificates pc
             LEFT JOIN projects p ON pc.project_id=p.id
             WHERE pc.id=$1 AND pc.tenant_id=$2`, [req.params.id, req.user.tenant_id]),
      query('SELECT company_name, address, phone, ssm_number FROM tenants WHERE id=$1', [req.user.tenant_id]),
    ]);
    if (certRes.rows.length === 0) return res.status(404).json({ error: 'Certificate not found.' });
    const cert = certRes.rows[0];
    let claim = null;
    if (cert.claim_id) {
      const cr = await query('SELECT claim_number FROM claims WHERE id=$1', [cert.claim_id]);
      claim = cr.rows[0] || null;
    }
    buildCertPdf(res, { cert, claim, tenant: tenantRes.rows[0] || {} });
  } catch (err) { next(err); }
});

// GET /finance/retention — per-project retention held
router.get('/retention', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT p.id AS project_id, p.name AS project_name, p.retention_percentage,
              COALESCE(SUM(c.retention_amount) FILTER (WHERE c.status NOT IN ('rejected','draft')), 0) AS retention_held,
              COUNT(c.id) FILTER (WHERE c.status NOT IN ('rejected','draft')) AS claim_count
       FROM projects p
       LEFT JOIN claims c ON c.project_id = p.id AND c.tenant_id = p.tenant_id
       WHERE p.tenant_id = $1 AND p.status NOT IN ('cancelled')
       GROUP BY p.id, p.name, p.retention_percentage
       ORDER BY retention_held DESC`,
      [req.user.tenant_id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

// POST /finance/run-aging
router.post('/run-aging', authenticate, authorize(ROLES.DIRECTOR, ROLES.ADMIN, ROLES.FINANCE), async (req, res, next) => {
  try {
    const result = await automation.runAging(req.user.tenant_id);
    res.json(result);
  } catch (err) { next(err); }
});

// ── COCKPIT & ANALYTICS (feeds the redesigned Finance UI) ────────────────────

const fmtShort = (v) => {
  v = n(v);
  if (v >= 1e9) return `RM ${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `RM ${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `RM ${(v / 1e3).toFixed(1)}k`;
  return `RM ${v}`;
};

// GET /finance/cockpit — KPI rail + action queue, derived from live invoices,
// claims, payment certs and projects. Anything we can't derive is omitted so the
// UI falls back to its representative defaults.
router.get('/cockpit', authenticate, async (req, res, next) => {
  try {
    const t = req.user.tenant_id;
    const [ar, retention, payCerts, overdueInv] = await Promise.all([
      query(
        `SELECT COALESCE(SUM(total - COALESCE(amount_paid,0)),0) AS outstanding,
                COUNT(*) AS cnt,
                COALESCE(AVG(CURRENT_DATE - invoice_date),0) AS avg_age
         FROM invoices
         WHERE tenant_id=$1 AND status IN ('unpaid','partially_paid','overdue')`, [t]),
      query(
        `SELECT COALESCE(SUM(retention_amount),0) AS held,
                COUNT(DISTINCT project_id) AS contracts
         FROM claims WHERE tenant_id=$1 AND status NOT IN ('rejected','draft')`, [t]),
      query(
        `SELECT COALESCE(SUM(certified_amount),0) AS certified, COUNT(*) AS cnt
         FROM payment_certificates WHERE tenant_id=$1 AND status NOT IN ('paid')`, [t]),
      query(
        `SELECT invoice_number, total FROM invoices
         WHERE tenant_id=$1 AND status='overdue' ORDER BY due_date ASC LIMIT 1`, [t]),
    ]);

    const recv = ar.rows[0];
    const ret = retention.rows[0];
    const kpis = {
      receivables: fmtShort(recv.outstanding),
      receivablesFoot: `${recv.cnt} invoice(s) · DSO ${Math.round(n(recv.avg_age))}d`,
      retention: fmtShort(ret.held),
      retentionFoot: `On ${ret.contracts} contract(s)`,
    };

    const actions = [];
    const oi = overdueInv.rows[0];
    if (oi) actions.push({ icon: 'money', tone: 'warn', title: `${oi.invoice_number} overdue`, sub: `${fmtRM(oi.total)} — reminder due`, cta: 'Send' });
    const overduePc = await query(
      `SELECT cert_number, certified_amount FROM payment_certificates
       WHERE tenant_id=$1 AND status='overdue' ORDER BY due_date ASC LIMIT 1`, [t]);
    if (overduePc.rows[0]) actions.push({ icon: 'alert', tone: 'danger', title: `${overduePc.rows[0].cert_number} overdue`, sub: `Certified ${fmtRM(overduePc.rows[0].certified_amount)} — follow up`, cta: 'Review' });
    actions.push({ icon: 'doc', tone: 'info', title: 'SST return Apr 2026', sub: 'Due 30 May', cta: 'File' });

    res.json({ kpis, actions, certified: fmtShort(payCerts.rows[0].certified) });
  } catch (err) { next(err); }
});

// GET /finance/aging-matrix — AR aging by project × bucket, from outstanding
// invoices. Returns [] when there's nothing so the UI shows its sample matrix.
router.get('/aging-matrix', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT p.name AS project, COALESCE(pr.company_name, '—') AS client,
              SUM(CASE WHEN i.due_date >= CURRENT_DATE THEN out ELSE 0 END)                                  AS current,
              SUM(CASE WHEN CURRENT_DATE - i.due_date BETWEEN 1  AND 30 THEN out ELSE 0 END)                 AS b1_30,
              SUM(CASE WHEN CURRENT_DATE - i.due_date BETWEEN 31 AND 60 THEN out ELSE 0 END)                 AS b31_60,
              SUM(CASE WHEN CURRENT_DATE - i.due_date BETWEEN 61 AND 90 THEN out ELSE 0 END)                 AS b61_90,
              SUM(CASE WHEN CURRENT_DATE - i.due_date > 90 THEN out ELSE 0 END)                              AS b90,
              ROUND(AVG(GREATEST(CURRENT_DATE - i.invoice_date, 0)))                                         AS dso
       FROM (
         SELECT *, (total - COALESCE(amount_paid,0)) AS out FROM invoices
         WHERE tenant_id=$1 AND status IN ('unpaid','partially_paid','overdue')
       ) i
       LEFT JOIN projects p ON i.project_id = p.id
       LEFT JOIN profiles pr ON i.client_id = pr.id
       GROUP BY p.name, pr.company_name
       ORDER BY (SUM(i.out)) DESC`,
      [req.user.tenant_id]
    );

    const rows = result.rows.map(r => {
      const dso = n(r.dso);
      const overdue = n(r.b1_30) + n(r.b31_60) + n(r.b61_90) + n(r.b90);
      const total = n(r.current) + overdue;
      // crude risk score: lower DSO + lower overdue share → higher score
      const riskScore = Math.max(10, Math.min(99, Math.round(100 - dso - (total ? (overdue / total) * 40 : 0))));
      return {
        code: (r.project || 'PROJ').split(/[\s—-]/)[0].slice(0, 7).toUpperCase(),
        client: r.client,
        current: n(r.current), b1_30: n(r.b1_30), b31_60: n(r.b31_60), b61_90: n(r.b61_90), b90: n(r.b90),
        dso, terms: 30, riskScore,
      };
    });
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
