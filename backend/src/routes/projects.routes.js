const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { ROLES } = require('../config/constants');
const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// GET /projects — list all projects for this tenant
router.get('/', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT p.*, u.name as pm_name, c.company_name as client_name,
              COUNT(pt.id) FILTER (WHERE pt.status != 'done') as open_tasks
       FROM projects p
       LEFT JOIN users u ON p.pm_id = u.id
       LEFT JOIN profiles c ON p.client_id = c.id
       LEFT JOIN project_tasks pt ON pt.project_id = p.id
       WHERE p.tenant_id = $1
       GROUP BY p.id, u.name, c.company_name
       ORDER BY p.created_at DESC`,
      [req.user.tenant_id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

// GET /projects/:id — single project with members & milestones
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const [project, members, milestones] = await Promise.all([
      query('SELECT p.*, u.name as pm_name FROM projects p LEFT JOIN users u ON p.pm_id = u.id WHERE p.id = $1 AND p.tenant_id = $2', [req.params.id, req.user.tenant_id]),
      query('SELECT u.id, u.name, u.role, pm.role_in_project FROM project_members pm JOIN users u ON pm.user_id = u.id WHERE pm.project_id = $1', [req.params.id]),
      query('SELECT * FROM project_milestones WHERE project_id = $1 ORDER BY due_date ASC', [req.params.id]),
    ]);
    if (project.rows.length === 0) return res.status(404).json({ error: 'Project not found.' });
    res.json({ ...project.rows[0], members: members.rows, milestones: milestones.rows });
  } catch (err) { next(err); }
});

// POST /projects — create project
router.post('/', authenticate, authorize(ROLES.DIRECTOR, ROLES.ADMIN, ROLES.PM), async (req, res, next) => {
  try {
    const { name, description, clientId, pmId, siteAddress, contractSum, startDate, endDate, retentionPercentage } = req.body;
    const id = uuidv4();
    const projectNumber = `PRJ-${Date.now().toString().slice(-6)}`;
    const result = await query(
      `INSERT INTO projects (id, tenant_id, project_number, name, description, client_id, pm_id, site_address, contract_sum, start_date, end_date, retention_percentage, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [id, req.user.tenant_id, projectNumber, name, description, clientId, pmId || req.user.id, siteAddress, contractSum, startDate, endDate, retentionPercentage || 10, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
});

// PATCH /projects/:id — update project
router.patch('/:id', authenticate, authorize(ROLES.DIRECTOR, ROLES.ADMIN, ROLES.PM), async (req, res, next) => {
  try {
    const { name, status, description, pmId, startDate, endDate, retentionPercentage } = req.body;
    const result = await query(
      `UPDATE projects SET name=COALESCE($1,name), status=COALESCE($2,status), description=COALESCE($3,description),
       pm_id=COALESCE($4,pm_id), start_date=COALESCE($5,start_date), end_date=COALESCE($6,end_date),
       retention_percentage=COALESCE($7,retention_percentage)
       WHERE id=$8 AND tenant_id=$9 RETURNING *`,
      [name, status, description, pmId, startDate, endDate, retentionPercentage, req.params.id, req.user.tenant_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Project not found.' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;
