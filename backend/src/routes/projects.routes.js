const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { ROLES } = require('../config/constants');
const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const automation = require('../services/automationService');

// ── helpers ─────────────────────────────────────────────────────────────────
const canManage = authorize(ROLES.DIRECTOR, ROLES.ADMIN, ROLES.PM);
const canView   = authenticate;

// ── Projects ─────────────────────────────────────────────────────────────────
router.get('/', canView, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT p.*,
              u.name AS pm_name,
              c.company_name AS client_name,
              COUNT(DISTINCT pt.id) FILTER (WHERE pt.status != 'done') AS open_tasks,
              COUNT(DISTINCT pm2.id) AS member_count
       FROM projects p
       LEFT JOIN users u ON p.pm_id = u.id
       LEFT JOIN profiles c ON p.client_id = c.id
       LEFT JOIN project_tasks pt ON pt.project_id = p.id
       LEFT JOIN project_members pm2 ON pm2.project_id = p.id
       WHERE p.tenant_id = $1
       GROUP BY p.id, u.name, c.company_name
       ORDER BY p.created_at DESC`,
      [req.user.tenant_id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

router.get('/:id', canView, async (req, res, next) => {
  try {
    const [project, members, milestones, tasks] = await Promise.all([
      query(
        `SELECT p.*, u.name AS pm_name, c.company_name AS client_name
         FROM projects p
         LEFT JOIN users u ON p.pm_id = u.id
         LEFT JOIN profiles c ON p.client_id = c.id
         WHERE p.id = $1 AND p.tenant_id = $2`,
        [req.params.id, req.user.tenant_id]
      ),
      query(
        `SELECT u.id, u.name, u.role, pm.role_in_project
         FROM project_members pm JOIN users u ON pm.user_id = u.id
         WHERE pm.project_id = $1`,
        [req.params.id]
      ),
      query(
        `SELECT * FROM project_milestones WHERE project_id = $1 ORDER BY due_date ASC`,
        [req.params.id]
      ),
      query(
        `SELECT pt.*, u.name AS assignee_name
         FROM project_tasks pt
         LEFT JOIN users u ON COALESCE(pt.assignee_id, pt.assigned_to) = u.id
         WHERE pt.project_id = $1
         ORDER BY pt.created_at DESC`,
        [req.params.id]
      ),
    ]);
    if (!project.rows.length) return res.status(404).json({ error: 'Project not found.' });
    res.json({ ...project.rows[0], members: members.rows, milestones: milestones.rows, tasks: tasks.rows });
  } catch (err) { next(err); }
});

router.post('/', canView, canManage, async (req, res, next) => {
  try {
    const {
      name, description, clientId, pmId, siteAddress,
      contractSum, startDate, endDate, retentionPercentage,
      projectType, projectPhase
    } = req.body;
    const id = uuidv4();
    const projectNumber = `PRJ-${Date.now().toString().slice(-6)}`;
    const result = await query(
      `INSERT INTO projects
         (id, tenant_id, project_number, name, description, client_id, pm_id,
          site_address, contract_sum, start_date, end_date, retention_percentage,
          project_type, current_phase, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING *`,
      [id, req.user.tenant_id, projectNumber, name, description, clientId,
       pmId || req.user.id, siteAddress, contractSum, startDate, endDate,
       retentionPercentage || 10, projectType, projectPhase || 'pre_construction', req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
});

router.patch('/:id', canView, canManage, async (req, res, next) => {
  try {
    const {
      name, status, description, pmId, startDate, endDate,
      retentionPercentage, contractSum, siteAddress, currentPhase, progressPct
    } = req.body;
    const result = await query(
      `UPDATE projects SET
         name=COALESCE($1,name), status=COALESCE($2,status),
         description=COALESCE($3,description), pm_id=COALESCE($4,pm_id),
         start_date=COALESCE($5,start_date), end_date=COALESCE($6,end_date),
         retention_percentage=COALESCE($7,retention_percentage),
         contract_sum=COALESCE($8,contract_sum),
         site_address=COALESCE($9,site_address),
         current_phase=COALESCE($10,current_phase),
         progress_pct=COALESCE($11,progress_pct),
         updated_at=NOW()
       WHERE id=$12 AND tenant_id=$13 RETURNING *`,
      [name, status, description, pmId, startDate, endDate,
       retentionPercentage, contractSum, siteAddress, currentPhase, progressPct,
       req.params.id, req.user.tenant_id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Project not found.' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// ── Milestones ───────────────────────────────────────────────────────────────
router.get('/:id/milestones', canView, async (req, res, next) => {
  try {
    const r = await query(
      `SELECT * FROM project_milestones WHERE project_id = $1 ORDER BY due_date ASC`,
      [req.params.id]
    );
    res.json(r.rows);
  } catch (err) { next(err); }
});

router.post('/:id/milestones', canView, canManage, async (req, res, next) => {
  try {
    const { title, dueDate, description, isCritical } = req.body;
    const r = await query(
      `INSERT INTO project_milestones (id, project_id, title, due_date, description, is_critical)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [uuidv4(), req.params.id, title, dueDate, description, isCritical || false]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { next(err); }
});

router.patch('/:id/milestones/:milestoneId', canView, canManage, async (req, res, next) => {
  try {
    const { title, dueDate, status, description, completedAt } = req.body;
    const isDone = status === 'done';
    const r = await query(
      `UPDATE project_milestones SET
         title=COALESCE($1,title), due_date=COALESCE($2,due_date),
         status=COALESCE($3,status), description=COALESCE($4,description),
         completed_at=COALESCE($5,completed_at),
         is_completed=CASE WHEN $3='done' THEN true ELSE is_completed END,
         completed_date=CASE WHEN $3='done' THEN CURRENT_DATE ELSE completed_date END
       WHERE id=$6 AND project_id=$7 RETURNING *`,
      [title, dueDate, status, description, completedAt, req.params.milestoneId, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Milestone not found.' });
    res.json(r.rows[0]);
  } catch (err) { next(err); }
});

router.delete('/:id/milestones/:milestoneId', canView, canManage, async (req, res, next) => {
  try {
    await query(
      `DELETE FROM project_milestones WHERE id=$1 AND project_id=$2`,
      [req.params.milestoneId, req.params.id]
    );
    res.status(204).end();
  } catch (err) { next(err); }
});

// ── Tasks ────────────────────────────────────────────────────────────────────
router.get('/:id/tasks', canView, async (req, res, next) => {
  try {
    const r = await query(
      `SELECT pt.*, u.name AS assignee_name
       FROM project_tasks pt
       LEFT JOIN users u ON COALESCE(pt.assignee_id, pt.assigned_to) = u.id
       WHERE pt.project_id = $1
       ORDER BY pt.created_at DESC`,
      [req.params.id]
    );
    res.json(r.rows);
  } catch (err) { next(err); }
});

router.post('/:id/tasks', canView, async (req, res, next) => {
  try {
    const { title, description, assigneeId, dueDate, priority, milestoneId, wbs } = req.body;
    const r = await query(
      `INSERT INTO project_tasks
         (id, project_id, title, description, assigned_to, due_date, priority, milestone_id, wbs, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [uuidv4(), req.params.id, title, description, assigneeId || null, dueDate || null,
       priority || 'medium', milestoneId || null, wbs || null, req.user.id]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { next(err); }
});

router.patch('/:id/tasks/:taskId', canView, async (req, res, next) => {
  try {
    const { title, status, description, assigneeId, dueDate, priority, progressPct } = req.body;
    const r = await query(
      `UPDATE project_tasks SET
         title=COALESCE($1,title), status=COALESCE($2,status),
         description=COALESCE($3,description), assigned_to=COALESCE($4,assigned_to),
         due_date=COALESCE($5,due_date), priority=COALESCE($6,priority),
         progress_pct=COALESCE($7,progress_pct), updated_at=NOW()
       WHERE id=$8 AND project_id=$9 RETURNING *`,
      [title, status, description, assigneeId, dueDate, priority, progressPct,
       req.params.taskId, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Task not found.' });
    res.json(r.rows[0]);
  } catch (err) { next(err); }
});

router.delete('/:id/tasks/:taskId', canView, canManage, async (req, res, next) => {
  try {
    await query(`DELETE FROM project_tasks WHERE id=$1 AND project_id=$2`, [req.params.taskId, req.params.id]);
    res.status(204).end();
  } catch (err) { next(err); }
});

// ── RFIs ─────────────────────────────────────────────────────────────────────
router.get('/:id/rfis', canView, async (req, res, next) => {
  try {
    const r = await query(
      `SELECT ri.*, u.name AS raised_by_name
       FROM project_rfis ri
       LEFT JOIN users u ON ri.raised_by = u.id
       WHERE ri.project_id = $1
       ORDER BY ri.created_at DESC`,
      [req.params.id]
    );
    res.json(r.rows);
  } catch (err) { next(err); }
});

router.post('/:id/rfis', canView, async (req, res, next) => {
  try {
    const { subject, description, directedTo, urgency, referenceDrawings, dueDate } = req.body;
    const rfiNumber = `RFI-${Date.now().toString().slice(-5)}`;
    const r = await query(
      `INSERT INTO project_rfis
         (id, project_id, rfi_number, subject, description, directed_to, urgency,
          reference_drawings, due_date, raised_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [uuidv4(), req.params.id, rfiNumber, subject, description, directedTo,
       urgency || 'normal', referenceDrawings, dueDate, req.user.id]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { next(err); }
});

router.patch('/:id/rfis/:rfiId', canView, async (req, res, next) => {
  try {
    const { status, response, closedAt } = req.body;
    const r = await query(
      `UPDATE project_rfis SET
         status=COALESCE($1,status), response=COALESCE($2,response),
         closed_at=COALESCE($3,closed_at), updated_at=NOW()
       WHERE id=$4 AND project_id=$5 RETURNING *`,
      [status, response, closedAt, req.params.rfiId, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'RFI not found.' });
    res.json(r.rows[0]);
  } catch (err) { next(err); }
});

// ── Submittals ───────────────────────────────────────────────────────────────
router.get('/:id/submittals', canView, async (req, res, next) => {
  try {
    const r = await query(
      `SELECT s.*, u.name AS submitted_by_name
       FROM project_submittals s
       LEFT JOIN users u ON s.submitted_by = u.id
       WHERE s.project_id = $1
       ORDER BY s.created_at DESC`,
      [req.params.id]
    );
    res.json(r.rows);
  } catch (err) { next(err); }
});

router.post('/:id/submittals', canView, async (req, res, next) => {
  try {
    const { title, submittalType, description, revisionNumber, dueDate } = req.body;
    const submittalNumber = `SUB-${Date.now().toString().slice(-5)}`;
    const r = await query(
      `INSERT INTO project_submittals
         (id, project_id, submittal_number, title, submittal_type, description,
          revision_number, due_date, submitted_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [uuidv4(), req.params.id, submittalNumber, title, submittalType || 'shop_drawing',
       description, revisionNumber || 'Rev 0', dueDate, req.user.id]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { next(err); }
});

router.patch('/:id/submittals/:submittalId', canView, async (req, res, next) => {
  try {
    const { status, reviewComments, approvedAt } = req.body;
    const r = await query(
      `UPDATE project_submittals SET
         status=COALESCE($1,status), review_comments=COALESCE($2,review_comments),
         approved_at=COALESCE($3,approved_at), updated_at=NOW()
       WHERE id=$4 AND project_id=$5 RETURNING *`,
      [status, reviewComments, approvedAt, req.params.submittalId, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Submittal not found.' });
    res.json(r.rows[0]);
  } catch (err) { next(err); }
});

// ── Change Orders / Variations ────────────────────────────────────────────────
router.get('/:id/change-orders', canView, async (req, res, next) => {
  try {
    const r = await query(
      `SELECT co.*, u.name AS raised_by_name, a.name AS approved_by_name
       FROM project_change_orders co
       LEFT JOIN users u ON co.raised_by = u.id
       LEFT JOIN users a ON co.approved_by = a.id
       WHERE co.project_id = $1
       ORDER BY co.created_at DESC`,
      [req.params.id]
    );
    res.json(r.rows);
  } catch (err) { next(err); }
});

router.post('/:id/change-orders', canView, async (req, res, next) => {
  try {
    const { title, description, reason, scopeChange, costChange, timeChange, origin } = req.body;
    const coNumber = `CO-${Date.now().toString().slice(-5)}`;
    const costVal = parseFloat(costChange || 0);
    // Auto-approve small changes (< RM 50,000); large ones go to Director/Admin
    const autoApprove = Math.abs(costVal) < 50000;
    const r = await query(
      `INSERT INTO project_change_orders
         (id, project_id, co_number, title, description, reason, scope_change,
          cost_change, time_change, origin, status, raised_by,
          approved_by, approved_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [uuidv4(), req.params.id, coNumber, title, description, reason, scopeChange,
       costVal, timeChange || 0, origin || 'Internal',
       autoApprove ? 'approved' : 'pending_approval',
       req.user.id,
       autoApprove ? req.user.id : null,
       autoApprove ? new Date().toISOString() : null]
    );
    if (!autoApprove) {
      automation.notifyChangeOrderPending(req.params.id, r.rows[0], req.user.tenant_id)
        .catch(e => console.error('[automation] CO notify failed:', e.message));
    }
    res.status(201).json(r.rows[0]);
  } catch (err) { next(err); }
});

router.patch('/:id/change-orders/:coId', canView, async (req, res, next) => {
  try {
    const { status, approvedBy, implementedAt } = req.body;
    const r = await query(
      `UPDATE project_change_orders SET
         status=COALESCE($1,status),
         approved_by=COALESCE($2,approved_by),
         approved_at=CASE WHEN $1='approved' THEN NOW() ELSE approved_at END,
         implemented_at=COALESCE($3,implemented_at),
         updated_at=NOW()
       WHERE id=$4 AND project_id=$5 RETURNING *`,
      [status, approvedBy, implementedAt, req.params.coId, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Change order not found.' });
    res.json(r.rows[0]);
  } catch (err) { next(err); }
});

// ── Risks ────────────────────────────────────────────────────────────────────
router.get('/:id/risks', canView, async (req, res, next) => {
  try {
    const r = await query(
      `SELECT * FROM project_risks WHERE project_id = $1 ORDER BY (likelihood * impact) DESC`,
      [req.params.id]
    );
    res.json(r.rows);
  } catch (err) { next(err); }
});

router.post('/:id/risks', canView, canManage, async (req, res, next) => {
  try {
    const { title, category, likelihood, impact, owner, mitigation, trend } = req.body;
    const r = await query(
      `INSERT INTO project_risks
         (id, project_id, title, category, likelihood, impact, owner, mitigation, trend)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [uuidv4(), req.params.id, title, category, likelihood || 3, impact || 3,
       owner, mitigation, trend || 'flat']
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { next(err); }
});

router.patch('/:id/risks/:riskId', canView, canManage, async (req, res, next) => {
  try {
    const { status, likelihood, impact, mitigation, trend } = req.body;
    const r = await query(
      `UPDATE project_risks SET
         status=COALESCE($1,status), likelihood=COALESCE($2,likelihood),
         impact=COALESCE($3,impact), mitigation=COALESCE($4,mitigation),
         trend=COALESCE($5,trend), updated_at=NOW()
       WHERE id=$6 AND project_id=$7 RETURNING *`,
      [status, likelihood, impact, mitigation, trend, req.params.riskId, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Risk not found.' });
    res.json(r.rows[0]);
  } catch (err) { next(err); }
});

// ── Members ──────────────────────────────────────────────────────────────────
router.get('/:id/members', canView, async (req, res, next) => {
  try {
    const r = await query(
      `SELECT u.id, u.name, u.email, u.role, pm.role_in_project, pm.created_at AS joined_at
       FROM project_members pm
       JOIN users u ON pm.user_id = u.id
       WHERE pm.project_id = $1`,
      [req.params.id]
    );
    res.json(r.rows);
  } catch (err) { next(err); }
});

router.post('/:id/members', canView, canManage, async (req, res, next) => {
  try {
    const { userId, roleInProject } = req.body;
    const r = await query(
      `INSERT INTO project_members (id, project_id, user_id, role_in_project)
       VALUES ($1,$2,$3,$4) ON CONFLICT (project_id, user_id) DO UPDATE SET role_in_project=$4
       RETURNING *`,
      [uuidv4(), req.params.id, userId, roleInProject]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { next(err); }
});

router.delete('/:id/members/:userId', canView, canManage, async (req, res, next) => {
  try {
    await query(`DELETE FROM project_members WHERE project_id=$1 AND user_id=$2`, [req.params.id, req.params.userId]);
    res.status(204).end();
  } catch (err) { next(err); }
});

// ── Portfolio aggregates ──────────────────────────────────────────────────────
router.get('/portfolio/risks', canView, async (req, res, next) => {
  try {
    const r = await query(
      `SELECT pr.*, p.name AS project_name, p.project_number
       FROM project_risks pr
       JOIN projects p ON pr.project_id = p.id
       WHERE p.tenant_id = $1 AND pr.status != 'closed'
       ORDER BY (pr.likelihood * pr.impact) DESC`,
      [req.user.tenant_id]
    );
    res.json(r.rows);
  } catch (err) { next(err); }
});

router.get('/portfolio/change-orders', canView, async (req, res, next) => {
  try {
    const r = await query(
      `SELECT co.*, p.name AS project_name, p.project_number
       FROM project_change_orders co
       JOIN projects p ON co.project_id = p.id
       WHERE p.tenant_id = $1
       ORDER BY co.created_at DESC`,
      [req.user.tenant_id]
    );
    res.json(r.rows);
  } catch (err) { next(err); }
});

module.exports = router;
