const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { ROLES } = require('../config/constants');
const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

router.get('/', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT b.*, p.name as project_name FROM bq_documents b LEFT JOIN projects p ON b.project_id = p.id WHERE b.tenant_id=$1 ORDER BY b.created_at DESC`,
      [req.user.tenant_id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const [bq, items] = await Promise.all([
      query('SELECT b.*, p.name as project_name FROM bq_documents b LEFT JOIN projects p ON b.project_id=p.id WHERE b.id=$1 AND b.tenant_id=$2', [req.params.id, req.user.tenant_id]),
      query('SELECT * FROM bq_items WHERE bq_id=$1 ORDER BY sort_order, section', [req.params.id]),
    ]);
    if (bq.rows.length === 0) return res.status(404).json({ error: 'BQ not found.' });
    res.json({ ...bq.rows[0], items: items.rows });
  } catch (err) { next(err); }
});

router.post('/', authenticate, authorize(ROLES.DIRECTOR, ROLES.ADMIN, ROLES.QS, ROLES.PM), async (req, res, next) => {
  try {
    const { title, projectId } = req.body;
    const result = await query(
      'INSERT INTO bq_documents (id, tenant_id, project_id, title, created_by) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [uuidv4(), req.user.tenant_id, projectId || null, title, req.user.id]
    );
    res.status(201).json({ ...result.rows[0], items: [] });
  } catch (err) { next(err); }
});

router.patch('/:id', authenticate, authorize(ROLES.DIRECTOR, ROLES.ADMIN, ROLES.QS, ROLES.PM), async (req, res, next) => {
  try {
    const { items, totalAmount, status } = req.body;
    const client = await (await require('../config/database').getClient())

    try {
      await client.query('BEGIN');

      // Increment version on save
      const bq = await client.query(
        'UPDATE bq_documents SET total_amount=$1, status=COALESCE($2,status), version=version+1 WHERE id=$3 AND tenant_id=$4 RETURNING *',
        [totalAmount || 0, status, req.params.id, req.user.tenant_id]
      );
      if (bq.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'BQ not found.' }); }

      // Replace all items
      await client.query('DELETE FROM bq_items WHERE bq_id=$1', [req.params.id]);
      for (let i = 0; i < (items||[]).length; i++) {
        const item = items[i];
        await client.query(
          'INSERT INTO bq_items (id, bq_id, description, unit, quantity, unit_rate, amount, section, sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
          [uuidv4(), req.params.id, item.description, item.unit, item.quantity, item.unitRate, item.amount, item.section, i]
        );
      }
      await client.query('COMMIT');
      res.json(bq.rows[0]);
    } catch (err) { await client.query('ROLLBACK'); throw err; }
    finally { client.release(); }
  } catch (err) { next(err); }
});

module.exports = router;
