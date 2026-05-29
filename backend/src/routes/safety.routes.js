const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

// ── INCIDENTS ───────────────────────────────────────────────────────────────

router.get('/incidents', async (req, res, next) => {
  try {
    const { db } = req;
    const { rows } = await db.query(`
      SELECT si.*, u.name AS reported_by_name, p.name AS project_name
      FROM safety_incidents si
      LEFT JOIN users u ON u.id = si.reported_by
      LEFT JOIN projects p ON p.id = si.project_id
      WHERE si.tenant_id = $1
      ORDER BY si.incident_date DESC
    `, [req.tenant_id]);
    res.json({ incidents: rows });
  } catch (err) { next(err); }
});

router.post('/incidents', async (req, res, next) => {
  try {
    const { title, severity, incident_date, location, description, corrective_action, lost_time, project_id } = req.body;
    const { db } = req;
    const { rows } = await db.query(`
      INSERT INTO safety_incidents
        (tenant_id, project_id, title, severity, incident_date, location, description, corrective_action, lost_time, reported_by, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'open')
      RETURNING *
    `, [req.tenant_id, project_id || null, title, severity || 'near_miss', incident_date, location, description, corrective_action, !!lost_time, req.user.id]);
    res.status(201).json({ incident: rows[0] });
  } catch (err) { next(err); }
});

router.patch('/incidents/:id', authorize('director','admin','pm'), async (req, res, next) => {
  try {
    const { status, corrective_action } = req.body;
    const { db } = req;
    const { rows } = await db.query(`
      UPDATE safety_incidents SET status=$1, corrective_action=COALESCE($2, corrective_action), updated_at=NOW()
      WHERE id=$3 AND tenant_id=$4 RETURNING *
    `, [status, corrective_action, req.params.id, req.tenant_id]);
    if (!rows.length) return res.status(404).json({ error: 'Incident not found' });
    res.json({ incident: rows[0] });
  } catch (err) { next(err); }
});

// ── CERTIFICATIONS ──────────────────────────────────────────────────────────

router.get('/certifications', async (req, res, next) => {
  try {
    const { db } = req;
    const { rows } = await db.query(`
      SELECT sc.*, pr.company_name AS profile_name
      FROM safety_certifications sc
      LEFT JOIN profiles pr ON pr.id = sc.profile_id
      WHERE sc.tenant_id = $1
      ORDER BY sc.expiry_date ASC NULLS LAST
    `, [req.tenant_id]);
    res.json({ certifications: rows });
  } catch (err) { next(err); }
});

router.post('/certifications', async (req, res, next) => {
  try {
    const { cert_type, holder_name, cert_number, issue_date, expiry_date, profile_id } = req.body;
    const { db } = req;
    const { rows } = await db.query(`
      INSERT INTO safety_certifications
        (tenant_id, profile_id, cert_type, holder_name, cert_number, issue_date, expiry_date)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *
    `, [req.tenant_id, profile_id || null, cert_type, holder_name, cert_number, issue_date || null, expiry_date || null]);
    res.status(201).json({ certification: rows[0] });
  } catch (err) { next(err); }
});

// ── TOOLBOX TALKS ────────────────────────────────────────────────────────────

router.get('/toolbox', async (req, res, next) => {
  try {
    const { db } = req;
    const { rows } = await db.query(`
      SELECT tt.*, u.name AS conducted_by_name
      FROM toolbox_talks tt
      LEFT JOIN users u ON u.id = tt.conducted_by
      WHERE tt.tenant_id = $1
      ORDER BY tt.talk_date DESC
    `, [req.tenant_id]);
    res.json({ talks: rows });
  } catch (err) { next(err); }
});

router.post('/toolbox', async (req, res, next) => {
  try {
    const { topic, summary, talk_date, attendees_count, project_id } = req.body;
    const { db } = req;
    const { rows } = await db.query(`
      INSERT INTO toolbox_talks (tenant_id, project_id, topic, summary, talk_date, attendees_count, conducted_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *
    `, [req.tenant_id, project_id || null, topic, summary, talk_date, attendees_count || 0, req.user.id]);
    res.status(201).json({ talk: rows[0] });
  } catch (err) { next(err); }
});

module.exports = router;
