const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { ROLES } = require('../config/constants');
const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// POST /hr/clock-in
router.post('/clock-in', authenticate, async (req, res, next) => {
  try {
    const open = await query(
      'SELECT id FROM attendance WHERE user_id = $1 AND clock_out IS NULL ORDER BY clock_in DESC LIMIT 1',
      [req.user.id]
    );
    if (open.rows.length > 0) return res.status(400).json({ error: 'You are already clocked in. Please clock out first.' });

    const result = await query(
      'INSERT INTO attendance (id, tenant_id, user_id, clock_in, project_id, location) VALUES ($1,$2,$3,NOW(),$4,$5) RETURNING *',
      [uuidv4(), req.user.tenant_id, req.user.id, req.body.projectId || null, req.body.location || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
});

// POST /hr/clock-out
router.post('/clock-out', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      'UPDATE attendance SET clock_out = NOW(), notes = $1 WHERE user_id = $2 AND clock_out IS NULL AND tenant_id = $3 RETURNING *',
      [req.body.notes || null, req.user.id, req.user.tenant_id]
    );
    if (result.rows.length === 0) return res.status(400).json({ error: 'No active clock-in found.' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// GET /hr/attendance — my attendance or team (HR/Admin)
router.get('/attendance', authenticate, async (req, res, next) => {
  try {
    const isManager = [ROLES.DIRECTOR, ROLES.ADMIN, ROLES.HR].includes(req.user.role);
    const userId = isManager && req.query.userId ? req.query.userId : req.user.id;
    const result = await query(
      `SELECT a.*, u.name as user_name FROM attendance a JOIN users u ON a.user_id = u.id
       WHERE a.tenant_id = $1 ${!isManager ? 'AND a.user_id = $2' : req.query.userId ? 'AND a.user_id = $2' : ''}
       ORDER BY a.clock_in DESC LIMIT 100`,
      isManager && !req.query.userId ? [req.user.tenant_id] : [req.user.tenant_id, userId]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

// POST /hr/leave — submit leave request
router.post('/leave', authenticate, async (req, res, next) => {
  try {
    const { leaveType, startDate, endDate, daysRequested, reason } = req.body;
    const result = await query(
      'INSERT INTO leave_requests (id, tenant_id, user_id, leave_type, start_date, end_date, days_requested, reason) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [uuidv4(), req.user.tenant_id, req.user.id, leaveType, startDate, endDate, daysRequested, reason]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
});

// GET /hr/leave — my leave requests
router.get('/leave', authenticate, async (req, res, next) => {
  try {
    const isManager = [ROLES.DIRECTOR, ROLES.ADMIN, ROLES.HR].includes(req.user.role);
    const result = await query(
      `SELECT lr.*, u.name as user_name FROM leave_requests lr JOIN users u ON lr.user_id = u.id
       WHERE lr.tenant_id = $1 ${!isManager ? 'AND lr.user_id = $2' : ''}
       ORDER BY lr.created_at DESC`,
      isManager ? [req.user.tenant_id] : [req.user.tenant_id, req.user.id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

// PATCH /hr/leave/:id/review — approve or reject
router.patch('/leave/:id/review', authenticate, authorize(ROLES.DIRECTOR, ROLES.ADMIN, ROLES.HR), async (req, res, next) => {
  try {
    const { status, reviewNotes } = req.body;
    const result = await query(
      'UPDATE leave_requests SET status=$1, review_notes=$2, reviewed_by=$3, reviewed_at=NOW() WHERE id=$4 AND tenant_id=$5 RETURNING *',
      [status, reviewNotes, req.user.id, req.params.id, req.user.tenant_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Leave request not found.' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;
