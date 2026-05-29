const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

// ── VEHICLES ─────────────────────────────────────────────────────────────────

router.get('/vehicles', async (req, res, next) => {
  try {
    const { db } = req;
    const { rows } = await db.query(`
      SELECT fv.*, p.name AS assigned_project
      FROM fleet_vehicles fv
      LEFT JOIN projects p ON p.id = fv.project_id
      WHERE fv.tenant_id = $1
      ORDER BY fv.name ASC
    `, [req.tenant_id]);
    res.json({ vehicles: rows });
  } catch (err) { next(err); }
});

router.post('/vehicles', authorize('director','admin','pm'), async (req, res, next) => {
  try {
    const { name, vehicle_type, plate_number, make, model, year, status, road_tax_expiry, insurance_expiry, project_id } = req.body;
    const { db } = req;
    const { rows } = await db.query(`
      INSERT INTO fleet_vehicles
        (tenant_id, name, vehicle_type, plate_number, make, model, year, status, road_tax_expiry, insurance_expiry, project_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *
    `, [req.tenant_id, name, vehicle_type, plate_number, make, model, year || null,
        status || 'available', road_tax_expiry || null, insurance_expiry || null, project_id || null]);
    res.status(201).json({ vehicle: rows[0] });
  } catch (err) { next(err); }
});

router.patch('/vehicles/:id', authorize('director','admin','pm'), async (req, res, next) => {
  try {
    const { status, project_id } = req.body;
    const { db } = req;
    const { rows } = await db.query(`
      UPDATE fleet_vehicles SET
        status = COALESCE($1, status),
        project_id = COALESCE($2, project_id),
        updated_at = NOW()
      WHERE id = $3 AND tenant_id = $4
      RETURNING *
    `, [status, project_id, req.params.id, req.tenant_id]);
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
      SELECT fm.*, fv.name AS vehicle_name
      FROM fleet_maintenance fm
      JOIN fleet_vehicles fv ON fv.id = fm.vehicle_id
      WHERE fm.tenant_id = $1
    `;
    const params = [req.tenant_id];
    if (vehicle_id) { q += ` AND fm.vehicle_id = $2`; params.push(vehicle_id); }
    q += ` ORDER BY fm.maintenance_date DESC`;
    const { rows } = await db.query(q, params);
    res.json({ records: rows });
  } catch (err) { next(err); }
});

router.post('/maintenance', async (req, res, next) => {
  try {
    const { vehicle_id, maintenance_type, description, maintenance_date, cost, next_service_date } = req.body;
    const { db } = req;

    // Update vehicle status to maintenance if not already
    await db.query(`
      UPDATE fleet_vehicles SET status='maintenance', updated_at=NOW()
      WHERE id=$1 AND tenant_id=$2 AND status='available'
    `, [vehicle_id, req.tenant_id]);

    const { rows } = await db.query(`
      INSERT INTO fleet_maintenance
        (tenant_id, vehicle_id, maintenance_type, description, maintenance_date, cost, next_service_date, recorded_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *
    `, [req.tenant_id, vehicle_id, maintenance_type, description, maintenance_date,
        cost || 0, next_service_date || null, req.user.id]);
    res.status(201).json({ record: rows[0] });
  } catch (err) { next(err); }
});

module.exports = router;
