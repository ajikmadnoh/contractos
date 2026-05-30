const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

// ── VEHICLES ─────────────────────────────────────────────────────────────────

router.get('/vehicles', async (req, res, next) => {
  try {
    const { db } = req;
    const { project_id } = req.query;
    const params = [req.tenant_id];
    let where = 'fv.tenant_id = $1';
    if (project_id) { params.push(project_id); where += ` AND fv.assigned_project_id = $${params.length}`; }
    const { rows } = await db.query(`
      SELECT fv.*,
        fv.registration_number AS plate_number,
        fv.roadtax_expiry      AS road_tax_expiry,
        fv.assigned_project_id AS project_id,
        p.name                 AS assigned_project
      FROM fleet_vehicles fv
      LEFT JOIN projects p ON p.id = fv.assigned_project_id
      WHERE ${where}
      ORDER BY fv.name ASC NULLS LAST
    `, params);
    res.json({ vehicles: rows });
  } catch (err) { next(err); }
});

router.post('/vehicles', authorize('director','admin','pm'), async (req, res, next) => {
  try {
    const { name, vehicle_type, plate_number, make, model, year, status, road_tax_expiry, insurance_expiry, project_id } = req.body;
    const { db } = req;
    // Map frontend-friendly status to DB CHECK values
    const dbStatus = { available: 'active', in_use: 'active', maintenance: 'maintenance', decommissioned: 'inactive' }[status] || 'active';
    const { rows } = await db.query(`
      INSERT INTO fleet_vehicles
        (tenant_id, name, vehicle_type, registration_number, make, model, year,
         status, road_tax_expiry, roadtax_expiry, insurance_expiry, assigned_project_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9,$10,$11)
      RETURNING *
    `, [req.tenant_id, name, vehicle_type || 'other', plate_number, make, model,
        year || null, dbStatus, road_tax_expiry || null, insurance_expiry || null, project_id || null]);
    res.status(201).json({ vehicle: { ...rows[0], plate_number: rows[0].registration_number, status: status || 'available' } });
  } catch (err) { next(err); }
});

router.patch('/vehicles/:id', authorize('director','admin','pm'), async (req, res, next) => {
  try {
    const { status, project_id } = req.body;
    const { db } = req;
    const dbStatus = status ? ({ available: 'active', in_use: 'active', maintenance: 'maintenance', decommissioned: 'inactive' }[status] || 'active') : null;
    const { rows } = await db.query(`
      UPDATE fleet_vehicles SET
        status             = COALESCE($1, status),
        assigned_project_id = COALESCE($2, assigned_project_id),
        updated_at         = NOW()
      WHERE id = $3 AND tenant_id = $4
      RETURNING *
    `, [dbStatus, project_id, req.params.id, req.tenant_id]);
    if (!rows.length) return res.status(404).json({ error: 'Vehicle not found' });
    res.json({ vehicle: rows[0] });
  } catch (err) { next(err); }
});

// ── MAINTENANCE ───────────────────────────────────────────────────────────────

router.get('/maintenance', async (req, res, next) => {
  try {
    const { vehicle_id } = req.query;
    const { db } = req;
    let q = `
      SELECT fm.*,
        COALESCE(fm.maintenance_date, fm.scheduled_date, fm.completed_date) AS maintenance_date,
        COALESCE(fm.description, fm.notes) AS description,
        fv.name AS vehicle_name
      FROM fleet_maintenance fm
      JOIN fleet_vehicles fv ON fv.id = fm.vehicle_id
      WHERE fv.tenant_id = $1
    `;
    const params = [req.tenant_id];
    if (vehicle_id) { q += ` AND fm.vehicle_id = $2`; params.push(vehicle_id); }
    q += ` ORDER BY COALESCE(fm.maintenance_date, fm.scheduled_date, fm.completed_date) DESC NULLS LAST`;
    const { rows } = await db.query(q, params);
    res.json({ records: rows });
  } catch (err) { next(err); }
});

router.post('/maintenance', async (req, res, next) => {
  try {
    const { vehicle_id, maintenance_type, description, maintenance_date, cost, next_service_date } = req.body;
    const { db } = req;

    // Verify vehicle belongs to this tenant
    const { rows: veh } = await db.query(
      `SELECT id FROM fleet_vehicles WHERE id=$1 AND tenant_id=$2`, [vehicle_id, req.tenant_id]
    );
    if (!veh.length) return res.status(404).json({ error: 'Vehicle not found' });

    // Update vehicle status to maintenance
    await db.query(`
      UPDATE fleet_vehicles SET status='maintenance', updated_at=NOW()
      WHERE id=$1 AND status='active'
    `, [vehicle_id]);

    const { rows } = await db.query(`
      INSERT INTO fleet_maintenance
        (tenant_id, vehicle_id, maintenance_type, description, notes, maintenance_date, scheduled_date, cost, next_service_date, recorded_by, status)
      VALUES ($1,$2,$3,$4,$4,$5,$5,$6,$7,$8,'completed')
      RETURNING *
    `, [req.tenant_id, vehicle_id, maintenance_type, description, maintenance_date || null,
        cost || 0, next_service_date || null, req.user.id]);
    res.status(201).json({ record: rows[0] });
  } catch (err) { next(err); }
});

module.exports = router;
