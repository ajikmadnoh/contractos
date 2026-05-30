const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { ROLES } = require('../config/constants');
const { query, withTransaction } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// GET /invoices
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { status, projectId } = req.query;
    let sql = `SELECT i.*, p.name as project_name, c.company_name as client_name
               FROM invoices i
               LEFT JOIN projects p ON i.project_id = p.id
               LEFT JOIN profiles c ON i.client_id = c.id
               WHERE i.tenant_id = $1`;
    const params = [req.user.tenant_id];
    if (status) { params.push(status); sql += ` AND i.status = $${params.length}`; }
    if (projectId) { params.push(projectId); sql += ` AND i.project_id = $${params.length}`; }
    sql += ' ORDER BY i.created_at DESC';
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) { next(err); }
});

// GET /invoices/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const [invoice, items] = await Promise.all([
      query('SELECT i.*, p.name as project_name, c.company_name as client_name FROM invoices i LEFT JOIN projects p ON i.project_id = p.id LEFT JOIN profiles c ON i.client_id = c.id WHERE i.id = $1 AND i.tenant_id = $2', [req.params.id, req.user.tenant_id]),
      query('SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY sort_order', [req.params.id]),
    ]);
    if (invoice.rows.length === 0) return res.status(404).json({ error: 'Invoice not found.' });
    res.json({ ...invoice.rows[0], items: items.rows });
  } catch (err) { next(err); }
});

// POST /invoices
router.post('/', authenticate, authorize(ROLES.DIRECTOR, ROLES.ADMIN, ROLES.FINANCE), async (req, res, next) => {
  try {
    const { projectId, clientId, invoiceDate, dueDate, currency, taxRate, notes, items } = req.body;
    const id = uuidv4();
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;

    const subtotal = (items || []).reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const taxAmount = subtotal * ((taxRate || 0) / 100);
    const total = subtotal + taxAmount;

    const invoice = await withTransaction(async (q) => {
      const inv = await q(
        `INSERT INTO invoices (id, tenant_id, project_id, client_id, invoice_number, invoice_date, due_date, currency, subtotal, tax_rate, tax_amount, total, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
        [id, req.user.tenant_id, projectId, clientId, invoiceNumber, invoiceDate, dueDate, currency || 'MYR', subtotal, taxRate || 0, taxAmount, total, req.user.id]
      );
      for (let i = 0; i < (items || []).length; i++) {
        const item = items[i];
        await q(
          'INSERT INTO invoice_items (id, invoice_id, description, quantity, unit_price, amount, sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7)',
          [uuidv4(), id, item.description, item.quantity, item.unitPrice, item.quantity * item.unitPrice, i]
        );
      }
      return inv.rows[0];
    });
    res.status(201).json(invoice);
  } catch (err) {
    next(err);
  }
});

// PATCH /invoices/:id/status
router.patch('/:id/status', authenticate, authorize(ROLES.DIRECTOR, ROLES.ADMIN, ROLES.FINANCE), async (req, res, next) => {
  try {
    const { status, amountPaid } = req.body;
    const result = await query(
      'UPDATE invoices SET status=$1, amount_paid=COALESCE($2, amount_paid) WHERE id=$3 AND tenant_id=$4 RETURNING *',
      [status, amountPaid, req.params.id, req.user.tenant_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Invoice not found.' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;
