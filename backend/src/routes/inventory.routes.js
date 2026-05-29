const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

// ── ITEMS ─────────────────────────────────────────────────────────────────────

router.get('/items', async (req, res, next) => {
  try {
    const { category, search } = req.query;
    const { db } = req;
    let q = `SELECT * FROM inventory_items WHERE tenant_id = $1 AND is_active = true`;
    const params = [req.tenant_id];
    if (category) { q += ` AND category = $${params.length + 1}`; params.push(category); }
    if (search) { q += ` AND (name ILIKE $${params.length + 1} OR item_code ILIKE $${params.length + 1})`; params.push(`%${search}%`); }
    q += ` ORDER BY category ASC, name ASC`;
    const { rows } = await db.query(q, params);
    res.json({ items: rows });
  } catch (err) { next(err); }
});

router.post('/items', authorize('director','admin','pm','officer'), async (req, res, next) => {
  try {
    const { name, item_code, category, unit, quantity, reorder_level, unit_cost, location } = req.body;
    const { db } = req;
    const { rows } = await db.query(`
      INSERT INTO inventory_items
        (tenant_id, name, item_code, category, unit, quantity, reorder_level, unit_cost, location)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
    `, [req.tenant_id, name, item_code, category, unit, quantity || 0,
        reorder_level || 0, unit_cost || 0, location]);
    res.status(201).json({ item: rows[0] });
  } catch (err) { next(err); }
});

router.patch('/items/:id', authorize('director','admin','pm','officer'), async (req, res, next) => {
  try {
    const { name, category, unit, reorder_level, unit_cost, location } = req.body;
    const { db } = req;
    const { rows } = await db.query(`
      UPDATE inventory_items SET
        name = COALESCE($1, name),
        category = COALESCE($2, category),
        unit = COALESCE($3, unit),
        reorder_level = COALESCE($4, reorder_level),
        unit_cost = COALESCE($5, unit_cost),
        location = COALESCE($6, location),
        updated_at = NOW()
      WHERE id = $7 AND tenant_id = $8
      RETURNING *
    `, [name, category, unit, reorder_level, unit_cost, location, req.params.id, req.tenant_id]);
    if (!rows.length) return res.status(404).json({ error: 'Item not found' });
    res.json({ item: rows[0] });
  } catch (err) { next(err); }
});

// ── TRANSACTIONS ──────────────────────────────────────────────────────────────

router.get('/transactions', async (req, res, next) => {
  try {
    const { item_id } = req.query;
    const { db } = req;
    let q = `
      SELECT it.*, ii.name AS item_name, u.name AS created_by_name
      FROM inventory_transactions it
      JOIN inventory_items ii ON ii.id = it.inventory_item_id
      LEFT JOIN users u ON u.id = it.created_by
      WHERE it.tenant_id = $1
    `;
    const params = [req.tenant_id];
    if (item_id) { q += ` AND it.inventory_item_id = $2`; params.push(item_id); }
    q += ` ORDER BY it.created_at DESC LIMIT 200`;
    const { rows } = await db.query(q, params);
    res.json({ transactions: rows });
  } catch (err) { next(err); }
});

router.post('/transactions', async (req, res, next) => {
  try {
    const { inventory_item_id, transaction_type, quantity, reference, project_id } = req.body;
    const { db } = req;
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      // Adjust quantity
      const delta = transaction_type === 'in' ? parseFloat(quantity) : -parseFloat(quantity);
      const { rows: itemRows } = await client.query(`
        UPDATE inventory_items
        SET quantity = quantity + $1, updated_at = NOW()
        WHERE id = $2 AND tenant_id = $3
        RETURNING quantity
      `, [delta, inventory_item_id, req.tenant_id]);

      if (!itemRows.length) throw new Error('Item not found');
      if (itemRows[0].quantity < 0) throw new Error('Insufficient stock for this transaction');

      // Record transaction
      const { rows } = await client.query(`
        INSERT INTO inventory_transactions
          (tenant_id, inventory_item_id, transaction_type, quantity, reference, project_id, created_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        RETURNING *
      `, [req.tenant_id, inventory_item_id, transaction_type, parseFloat(quantity),
          reference, project_id || null, req.user.id]);

      await client.query('COMMIT');
      res.status(201).json({ transaction: rows[0] });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally { client.release(); }
  } catch (err) { next(err); }
});

module.exports = router;
