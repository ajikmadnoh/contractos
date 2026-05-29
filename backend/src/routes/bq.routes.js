const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticate, authorize } = require('../middleware/auth');
const { ROLES } = require('../config/constants');
const { query, getClient } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const bqExtractor = require('../services/bqExtractor');

const uploadDir = path.join(__dirname, '../../uploads/tender');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${uuidv4()}-${file.originalname}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 80 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /pdf|excel|spreadsheet|xlsx|xls/.test(file.mimetype) || /\.(pdf|xlsx|xls)$/i.test(file.originalname);
    cb(ok ? null : new Error('Only PDF or Excel files are allowed.'), ok);
  },
});

// Upload tender PDF/Excel → extract BQ line items → auto-create BQ document
router.post('/upload', authenticate, authorize(ROLES.DIRECTOR, ROLES.ADMIN, ROLES.QS, ROLES.PM), upload.single('file'), async (req, res, next) => {
  let client;
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

    // Derive title from filename (strip extension)
    const title = req.file.originalname.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim() || 'Untitled tender';

    // ── Extraction (OCR / table parse) ──────────────────────────────────────
    let extracted = { items: [], sections: [], pages: 0, total: 0 };
    try {
      extracted = await bqExtractor.extract(req.file.path, req.file.originalname);
    } catch (exErr) {
      console.error('BQ extraction failed:', exErr.message);
      // Non-fatal — create an empty draft the user can fill manually.
    }

    const bqId = uuidv4();
    client = await getClient();
    await client.query('BEGIN');

    const bqRes = await client.query(
      `INSERT INTO bq_documents (id, tenant_id, project_id, title, total_amount, created_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [bqId, req.user.tenant_id, req.body.projectId || null, title, extracted.total || 0, req.user.id]
    );

    for (let i = 0; i < extracted.items.length; i++) {
      const it = extracted.items[i];
      await client.query(
        `INSERT INTO bq_items (id, bq_id, description, unit, quantity, unit_rate, amount, section, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [uuidv4(), bqId, it.description, it.unit, it.quantity, it.unitRate, it.amount, it.section, i]
      );
    }

    await client.query('COMMIT');

    const items = await query('SELECT * FROM bq_items WHERE bq_id=$1 ORDER BY sort_order', [bqId]);
    res.status(201).json({
      ...bqRes.rows[0],
      items: items.rows,
      extraction: {
        itemCount: extracted.items.length,
        sectionCount: extracted.sections.length,
        sections: extracted.sections,
        pages: extracted.pages,
        total: extracted.total || 0,
      },
    });
  } catch (err) {
    if (client) { try { await client.query('ROLLBACK'); } catch (_) {} }
    next(err);
  } finally {
    if (client) client.release();
  }
});

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
