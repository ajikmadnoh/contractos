const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { ROLES } = require('../config/constants');
const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

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
      `INSERT INTO claims (id, tenant_id, project_id, claim_number, claim_type, claim_date, amount, retention_amount, net_amount, description, submitted_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [uuidv4(), req.user.tenant_id, projectId, claimNumber, claimType, claimDate, amount, retentionAmount, netAmount, description, req.user.id]
    );
    res.status(201).json(result.rows[0]);
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

module.exports = router;
