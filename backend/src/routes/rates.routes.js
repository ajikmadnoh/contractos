const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const { category, search } = req.query;
    const { db } = req;
    let q = `SELECT * FROM market_rates WHERE tenant_id = $1`;
    const params = [req.tenant_id];
    if (category) { q += ` AND category = $${params.length + 1}`; params.push(category); }
    if (search) { q += ` AND description ILIKE $${params.length + 1}`; params.push(`%${search}%`); }
    q += ` ORDER BY category ASC, description ASC`;
    const { rows } = await db.query(q, params);
    res.json({ rates: rows });
  } catch (err) { next(err); }
});

router.post('/', authorize('director','admin','qs'), async (req, res, next) => {
  try {
    const { description, category, unit, min_rate, max_rate, our_rate, notes } = req.body;
    const { db } = req;
    const { rows } = await db.query(`
      INSERT INTO market_rates (tenant_id, description, category, unit, min_rate, max_rate, our_rate, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *
    `, [req.tenant_id, description, category, unit, min_rate || null, max_rate || null, our_rate || null, notes]);
    res.status(201).json({ rate: rows[0] });
  } catch (err) { next(err); }
});

router.patch('/:id', authorize('director','admin','qs'), async (req, res, next) => {
  try {
    const { description, category, unit, min_rate, max_rate, our_rate, notes } = req.body;
    const { db } = req;
    const { rows } = await db.query(`
      UPDATE market_rates SET
        description = COALESCE($1, description),
        category = COALESCE($2, category),
        unit = COALESCE($3, unit),
        min_rate = COALESCE($4, min_rate),
        max_rate = COALESCE($5, max_rate),
        our_rate = COALESCE($6, our_rate),
        notes = COALESCE($7, notes),
        updated_at = NOW()
      WHERE id = $8 AND tenant_id = $9
      RETURNING *
    `, [description, category, unit, min_rate, max_rate, our_rate, notes, req.params.id, req.tenant_id]);
    if (!rows.length) return res.status(404).json({ error: 'Rate not found' });
    res.json({ rate: rows[0] });
  } catch (err) { next(err); }
});

router.delete('/:id', authorize('director','admin','qs'), async (req, res, next) => {
  try {
    const { db } = req;
    await db.query(`DELETE FROM market_rates WHERE id=$1 AND tenant_id=$2`, [req.params.id, req.tenant_id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
