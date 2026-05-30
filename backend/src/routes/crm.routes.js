const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const automation = require('../services/automationService');

router.use(authenticate);

// ── LEADS / TENDER PIPELINE ─────────────────────────────────────────────────

router.get('/leads', async (req, res, next) => {
  try {
    const { stage } = req.query;
    const { db } = req;
    let q = `
      SELECT cl.*, u.name AS created_by_name
      FROM crm_leads cl
      LEFT JOIN users u ON u.id = cl.created_by
      WHERE cl.tenant_id = $1
    `;
    const params = [req.tenant_id];
    if (stage) { q += ` AND cl.stage = $2`; params.push(stage); }
    q += ` ORDER BY cl.created_at DESC`;
    const { rows } = await db.query(q, params);
    res.json({ leads: rows });
  } catch (err) { next(err); }
});

router.post('/leads', async (req, res, next) => {
  try {
    const { title, client_name, estimated_value, stage, tender_deadline, project_type, notes } = req.body;
    const { db } = req;
    const { rows } = await db.query(`
      INSERT INTO crm_leads
        (tenant_id, title, client_name, estimated_value, stage, tender_deadline, project_type, notes, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
    `, [req.tenant_id, title, client_name, estimated_value || null, stage || 'prospecting',
        tender_deadline || null, project_type, notes, req.user.id]);
    res.status(201).json({ lead: rows[0] });
  } catch (err) { next(err); }
});

router.patch('/leads/:id', async (req, res, next) => {
  try {
    const { stage, title, client_name, estimated_value, tender_deadline, notes } = req.body;
    const { db } = req;
    const { rows } = await db.query(`
      UPDATE crm_leads SET
        stage = COALESCE($1, stage),
        title = COALESCE($2, title),
        client_name = COALESCE($3, client_name),
        estimated_value = COALESCE($4, estimated_value),
        tender_deadline = COALESCE($5, tender_deadline),
        notes = COALESCE($6, notes),
        updated_at = NOW()
      WHERE id = $7 AND tenant_id = $8
      RETURNING *
    `, [stage, title, client_name, estimated_value, tender_deadline, notes, req.params.id, req.tenant_id]);
    if (!rows.length) return res.status(404).json({ error: 'Lead not found' });
    const lead = rows[0];
    if (stage === 'won' && lead.stage === 'won') {
      automation.notifyLeadWon(lead, req.tenant_id).catch(e => console.error('[automation] lead won notify failed:', e.message));
    }
    res.json({ lead });
  } catch (err) { next(err); }
});

router.delete('/leads/:id', authorize('director','admin'), async (req, res, next) => {
  try {
    const { db } = req;
    await db.query(`DELETE FROM crm_leads WHERE id=$1 AND tenant_id=$2`, [req.params.id, req.tenant_id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
