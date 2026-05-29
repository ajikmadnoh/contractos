const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const { category, search } = req.query;
    const { db } = req;
    // Alias item_name -> description, rate -> min_rate for frontend compatibility
    let q = `
      SELECT *, item_name AS description, rate AS min_rate, rate AS max_rate
      FROM market_rates WHERE tenant_id = $1 AND is_active = true
    `;
    const params = [req.tenant_id];
    if (category) { q += ` AND category = $${params.length + 1}`; params.push(category); }
    if (search) { q += ` AND item_name ILIKE $${params.length + 1}`; params.push(`%${search}%`); }
    q += ` ORDER BY category ASC, item_name ASC`;
    const { rows } = await db.query(q, params);
    res.json({ rates: rows });
  } catch (err) { next(err); }
});

router.post('/', authorize('director','admin','qs'), async (req, res, next) => {
  try {
    const { description, category, unit, min_rate, our_rate, notes } = req.body;
    const { db } = req;
    const { rows } = await db.query(`
      INSERT INTO market_rates (tenant_id, item_name, category, unit, rate, our_rate, source, effective_date)
      VALUES ($1,$2,$3,$4,$5,$6,'user',CURRENT_DATE)
      RETURNING *, item_name AS description, rate AS min_rate
    `, [req.tenant_id, description, category, unit,
        min_rate || our_rate || 0, our_rate || min_rate || 0]);
    res.status(201).json({ rate: rows[0] });
  } catch (err) { next(err); }
});

router.patch('/:id', authorize('director','admin','qs'), async (req, res, next) => {
  try {
    const { description, category, unit, min_rate, our_rate, notes } = req.body;
    const { db } = req;
    const { rows } = await db.query(`
      UPDATE market_rates SET
        item_name = COALESCE($1, item_name),
        category  = COALESCE($2, category),
        unit      = COALESCE($3, unit),
        rate      = COALESCE($4, rate),
        our_rate  = COALESCE($5, our_rate),
        updated_at = NOW()
      WHERE id = $6 AND tenant_id = $7
      RETURNING *, item_name AS description, rate AS min_rate
    `, [description, category, unit, min_rate, our_rate, req.params.id, req.tenant_id]);
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
