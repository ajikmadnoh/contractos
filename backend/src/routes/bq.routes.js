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
const bqExport = require('../services/bqExport');
const svc = require('../services/bqService');

const EDIT_ROLES = [ROLES.DIRECTOR, ROLES.ADMIN, ROLES.QS, ROLES.PM];
const APPROVE_ROLES = [ROLES.DIRECTOR, ROLES.ADMIN];

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

// ── Upload tender PDF/Excel → extract line items → create BQ draft ───────────
router.post('/upload', authenticate, authorize(...EDIT_ROLES), upload.single('file'), async (req, res, next) => {
  let client;
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
    const title = req.file.originalname.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim() || 'Untitled tender';

    let extracted = { items: [], sections: [], pages: 0, total: 0, viaOcr: false };
    let warning = null;
    try {
      extracted = await bqExtractor.extract(req.file.path, req.file.originalname);
    } catch (exErr) {
      console.error('BQ extraction failed:', exErr.message);
      warning = exErr.code === 'OCR_NOT_CONFIGURED'
        ? exErr.message
        : 'Could not read line items from this file automatically — add them manually.';
    }

    const bqId = uuidv4();
    client = await getClient();
    await client.query('BEGIN');

    const bqRes = await client.query(
      `INSERT INTO bq_documents (id, tenant_id, project_id, title, total_amount, source_file, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [bqId, req.user.tenant_id, req.body.projectId || null, title, extracted.total || 0, req.file.filename, req.user.id]
    );

    for (let i = 0; i < extracted.items.length; i++) {
      const it = extracted.items[i];
      await client.query(
        `INSERT INTO bq_items (id, bq_id, item_code, description, unit, quantity, unit_rate, amount, section, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [uuidv4(), bqId, it.itemCode || null, it.description, it.unit, it.quantity, it.unitRate, it.amount, it.section, i]
      );
    }
    await svc.audit({
      bqId, tenantId: req.user.tenant_id, userId: req.user.id, action: 'uploaded',
      detail: { file: req.file.originalname, items: extracted.items.length, viaOcr: extracted.viaOcr },
    }, client);
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
        viaOcr: extracted.viaOcr || false,
        warning,
      },
    });
  } catch (err) {
    if (client) { try { await client.query('ROLLBACK'); } catch (_) {} }
    next(err);
  } finally {
    if (client) client.release();
  }
});

// ── List (excludes soft-deleted; supports ?status= & ?search=) ───────────────
router.get('/', authenticate, async (req, res, next) => {
  try {
    const params = [req.user.tenant_id];
    let where = 'b.tenant_id=$1 AND b.deleted_at IS NULL';
    if (req.query.status) { params.push(req.query.status); where += ` AND b.status=$${params.length}`; }
    if (req.query.search) { params.push(`%${req.query.search}%`); where += ` AND b.title ILIKE $${params.length}`; }
    const result = await query(
      `SELECT b.*, p.name as project_name,
              (SELECT count(*) FROM bq_items i WHERE i.bq_id = b.id)::int AS item_count,
              (SELECT COALESCE(SUM(i.unit_rate), 0) FROM bq_items i WHERE i.bq_id = b.id) AS rate_total
       FROM bq_documents b LEFT JOIN projects p ON b.project_id = p.id
       WHERE ${where} ORDER BY b.created_at DESC`,
      params
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

// ── Create empty BQ ──────────────────────────────────────────────────────────
router.post('/', authenticate, authorize(...EDIT_ROLES), async (req, res, next) => {
  try {
    const { title, projectId } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required.' });
    const id = uuidv4();
    const result = await query(
      'INSERT INTO bq_documents (id, tenant_id, project_id, title, created_by) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [id, req.user.tenant_id, projectId || null, title.trim(), req.user.id]
    );
    await svc.audit({ bqId: id, tenantId: req.user.tenant_id, userId: req.user.id, action: 'created' });
    res.status(201).json({ ...result.rows[0], items: [] });
  } catch (err) { next(err); }
});

// ── Detail (items; ?include=audit attaches the trail) ────────────────────────
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const bq = await svc.getBq(req.params.id, req.user.tenant_id);
    if (!bq) return res.status(404).json({ error: 'BQ not found.' });
    const proj = bq.project_id
      ? (await query('SELECT name FROM projects WHERE id=$1', [bq.project_id])).rows[0]
      : null;
    const items = await query('SELECT * FROM bq_items WHERE bq_id=$1 ORDER BY sort_order, section', [req.params.id]);
    const payload = { ...bq, project_name: proj?.name || null, items: items.rows };
    if (req.query.include === 'audit') {
      const a = await query('SELECT * FROM bq_audit WHERE bq_id=$1 ORDER BY created_at DESC LIMIT 100', [req.params.id]);
      payload.audit = a.rows;
    }
    res.json(payload);
  } catch (err) { next(err); }
});

// ── Full replace (editor "Save BQ") ──────────────────────────────────────────
router.patch('/:id', authenticate, authorize(...EDIT_ROLES), async (req, res, next) => {
  let client;
  try {
    const { items, status } = req.body;
    const existing = await svc.getBq(req.params.id, req.user.tenant_id);
    if (!existing) return res.status(404).json({ error: 'BQ not found.' });
    if (!svc.EDITABLE_STATUSES.includes(existing.status)) {
      return res.status(409).json({ error: `Cannot edit a ${existing.status} BQ.` });
    }

    client = await getClient();
    await client.query('BEGIN');
    await client.query('DELETE FROM bq_items WHERE bq_id=$1', [req.params.id]);
    for (let i = 0; i < (items || []).length; i++) {
      const item = items[i];
      const q = svc.num(item.quantity), r = svc.num(item.unitRate ?? item.unit_rate);
      const amt = svc.num(item.amount) ?? ((q || 0) * (r || 0));
      await client.query(
        `INSERT INTO bq_items (id, bq_id, item_code, description, unit, quantity, unit_rate, amount, section, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [uuidv4(), req.params.id, item.itemCode || item.item_code || null, item.description, item.unit || null, q, r, amt, item.section || null, i]
      );
    }
    const total = await svc.recomputeTotal(req.params.id, client);
    const bq = await client.query(
      'UPDATE bq_documents SET status=COALESCE($1,status), version=version+1 WHERE id=$2 RETURNING *',
      [status || null, req.params.id]
    );
    await svc.audit({ bqId: req.params.id, tenantId: req.user.tenant_id, userId: req.user.id, action: 'items_replaced', detail: { count: (items || []).length, total } }, client);
    await client.query('COMMIT');
    res.json(bq.rows[0]);
  } catch (err) {
    if (client) { try { await client.query('ROLLBACK'); } catch (_) {} }
    next(err);
  } finally {
    if (client) client.release();
  }
});

// ── Soft delete ──────────────────────────────────────────────────────────────
router.delete('/:id', authenticate, authorize(...APPROVE_ROLES), async (req, res, next) => {
  try {
    const bq = await svc.getBq(req.params.id, req.user.tenant_id);
    if (!bq) return res.status(404).json({ error: 'BQ not found.' });
    await query('UPDATE bq_documents SET deleted_at=NOW() WHERE id=$1', [req.params.id]);
    await svc.audit({ bqId: req.params.id, tenantId: req.user.tenant_id, userId: req.user.id, action: 'deleted' });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ── Duplicate (clone doc + items as a fresh draft) ───────────────────────────
router.post('/:id/duplicate', authenticate, authorize(...EDIT_ROLES), async (req, res, next) => {
  let client;
  try {
    const src = await svc.getBq(req.params.id, req.user.tenant_id);
    if (!src) return res.status(404).json({ error: 'BQ not found.' });
    const newId = uuidv4();
    client = await getClient();
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO bq_documents (id, tenant_id, project_id, title, total_amount, status, created_by)
       VALUES ($1,$2,$3,$4,$5,'draft',$6)`,
      [newId, req.user.tenant_id, src.project_id, `${src.title} (copy)`, src.total_amount, req.user.id]
    );
    await client.query(
      `INSERT INTO bq_items (id, bq_id, item_code, description, unit, quantity, unit_rate, amount, section, sort_order)
       SELECT uuid_generate_v4(), $1, item_code, description, unit, quantity, unit_rate, amount, section, sort_order
       FROM bq_items WHERE bq_id=$2`,
      [newId, req.params.id]
    );
    await svc.audit({ bqId: newId, tenantId: req.user.tenant_id, userId: req.user.id, action: 'duplicated', detail: { from: req.params.id } }, client);
    await client.query('COMMIT');
    const out = await svc.getBq(newId, req.user.tenant_id);
    res.status(201).json(out);
  } catch (err) {
    if (client) { try { await client.query('ROLLBACK'); } catch (_) {} }
    next(err);
  } finally {
    if (client) client.release();
  }
});

// ── Status workflow transition ───────────────────────────────────────────────
router.post('/:id/transition', authenticate, authorize(...EDIT_ROLES), async (req, res, next) => {
  try {
    const { to, note } = req.body;
    const bq = await svc.getBq(req.params.id, req.user.tenant_id);
    if (!bq) return res.status(404).json({ error: 'BQ not found.' });
    if (!svc.canTransition(bq.status, to)) {
      return res.status(409).json({ error: `Cannot move from ${bq.status} to ${to}.`, allowed: svc.TRANSITIONS[bq.status] || [] });
    }
    if (to === 'approved' && !APPROVE_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Only a director or admin can approve a BQ.' });
    }
    // Stamp workflow timestamps as appropriate.
    const sets = ['status=$1'];
    const params = [to];
    if (to === 'submitted') sets.push('submitted_at=NOW()');
    if (to === 'approved') { sets.push('approved_at=NOW()'); params.push(req.user.id); sets.push(`approved_by=$${params.length}`); }
    params.push(req.params.id);
    const updated = await query(`UPDATE bq_documents SET ${sets.join(', ')} WHERE id=$${params.length} RETURNING *`, params);
    await svc.audit({ bqId: req.params.id, tenantId: req.user.tenant_id, userId: req.user.id, action: 'status_changed', fromStatus: bq.status, toStatus: to, detail: note ? { note } : null });
    res.json(updated.rows[0]);
  } catch (err) { next(err); }
});

// ── Audit trail ────────────────────────────────────────────────────────────--
router.get('/:id/audit', authenticate, async (req, res, next) => {
  try {
    const bq = await svc.getBq(req.params.id, req.user.tenant_id);
    if (!bq) return res.status(404).json({ error: 'BQ not found.' });
    const a = await query(
      `SELECT a.*, u.name AS user_name FROM bq_audit a
       LEFT JOIN users u ON a.user_id=u.id
       WHERE a.bq_id=$1 ORDER BY a.created_at DESC LIMIT 200`, [req.params.id]);
    res.json(a.rows);
  } catch (err) { next(err); }
});

// ── Per-section summary + grand total ────────────────────────────────────────
router.get('/:id/summary', authenticate, async (req, res, next) => {
  try {
    const bq = await svc.getBq(req.params.id, req.user.tenant_id);
    if (!bq) return res.status(404).json({ error: 'BQ not found.' });
    const rows = await query(
      `SELECT COALESCE(section,'(uncategorised)') AS section,
              count(*)::int AS item_count,
              COALESCE(SUM(amount),0) AS amount,
              COALESCE(SUM(unit_rate),0) AS rate_total
       FROM bq_items WHERE bq_id=$1
       GROUP BY COALESCE(section,'(uncategorised)') ORDER BY 1`, [req.params.id]);
    const grand = rows.rows.reduce((s, r) => s + Number(r.amount), 0);
    res.json({ sections: rows.rows, total_amount: grand, section_count: rows.rows.length });
  } catch (err) { next(err); }
});

// ── Export (xlsx | pdf) — call via axios as a blob (auth header required) ─────
router.get('/:id/export', authenticate, async (req, res, next) => {
  try {
    const format = (req.query.format || 'xlsx').toLowerCase();
    const bq = await svc.getBq(req.params.id, req.user.tenant_id);
    if (!bq) return res.status(404).json({ error: 'BQ not found.' });
    const items = (await query('SELECT * FROM bq_items WHERE bq_id=$1 ORDER BY sort_order, section', [req.params.id])).rows;
    const safe = (bq.title || 'bq').replace(/[^a-z0-9]+/gi, '_').slice(0, 60);
    svc.audit({ bqId: req.params.id, tenantId: req.user.tenant_id, userId: req.user.id, action: 'exported', detail: { format } });

    if (format === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${safe}.pdf"`);
      return bqExport.toPdf(bq, items, res);
    }
    const buf = bqExport.toExcel(bq, items);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${safe}.xlsx"`);
    res.send(buf);
  } catch (err) { next(err); }
});

// ── Item-level CRUD (only while draft/submitted) ─────────────────────────────
async function assertEditable(id, tenantId) {
  const bq = await svc.getBq(id, tenantId);
  if (!bq) return { error: 404 };
  if (!svc.EDITABLE_STATUSES.includes(bq.status)) return { error: 409, status: bq.status };
  return { bq };
}

router.post('/:id/items', authenticate, authorize(...EDIT_ROLES), async (req, res, next) => {
  try {
    const chk = await assertEditable(req.params.id, req.user.tenant_id);
    if (chk.error === 404) return res.status(404).json({ error: 'BQ not found.' });
    if (chk.error === 409) return res.status(409).json({ error: `Cannot edit a ${chk.status} BQ.` });

    const it = req.body || {};
    if (!it.description) return res.status(400).json({ error: 'Description is required.' });
    const q = svc.num(it.quantity), r = svc.num(it.unitRate ?? it.unit_rate);
    const amt = svc.num(it.amount) ?? ((q || 0) * (r || 0));
    const ord = (await query('SELECT COALESCE(MAX(sort_order),-1)+1 AS n FROM bq_items WHERE bq_id=$1', [req.params.id])).rows[0].n;
    const id = uuidv4();
    await query(
      `INSERT INTO bq_items (id, bq_id, item_code, description, unit, quantity, unit_rate, amount, section, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [id, req.params.id, it.itemCode || it.item_code || null, it.description, it.unit || null, q, r, amt, it.section || null, ord]
    );
    const total = await svc.recomputeTotal(req.params.id);
    await svc.audit({ bqId: req.params.id, tenantId: req.user.tenant_id, userId: req.user.id, action: 'item_added' });
    const row = (await query('SELECT * FROM bq_items WHERE id=$1', [id])).rows[0];
    res.status(201).json({ item: row, total });
  } catch (err) { next(err); }
});

router.patch('/:id/items/:itemId', authenticate, authorize(...EDIT_ROLES), async (req, res, next) => {
  try {
    const chk = await assertEditable(req.params.id, req.user.tenant_id);
    if (chk.error === 404) return res.status(404).json({ error: 'BQ not found.' });
    if (chk.error === 409) return res.status(409).json({ error: `Cannot edit a ${chk.status} BQ.` });

    const it = req.body || {};
    const q = svc.num(it.quantity), r = svc.num(it.unitRate ?? it.unit_rate);
    const amt = svc.num(it.amount) ?? ((q || 0) * (r || 0));
    const upd = await query(
      `UPDATE bq_items SET
         item_code=COALESCE($1,item_code), description=COALESCE($2,description),
         unit=COALESCE($3,unit), quantity=$4, unit_rate=$5, amount=$6, section=COALESCE($7,section)
       WHERE id=$8 AND bq_id=$9 RETURNING *`,
      [it.itemCode || it.item_code || null, it.description || null, it.unit || null, q, r, amt, it.section || null, req.params.itemId, req.params.id]
    );
    if (!upd.rows.length) return res.status(404).json({ error: 'Item not found.' });
    const total = await svc.recomputeTotal(req.params.id);
    await svc.audit({ bqId: req.params.id, tenantId: req.user.tenant_id, userId: req.user.id, action: 'item_updated' });
    res.json({ item: upd.rows[0], total });
  } catch (err) { next(err); }
});

router.delete('/:id/items/:itemId', authenticate, authorize(...EDIT_ROLES), async (req, res, next) => {
  try {
    const chk = await assertEditable(req.params.id, req.user.tenant_id);
    if (chk.error === 404) return res.status(404).json({ error: 'BQ not found.' });
    if (chk.error === 409) return res.status(409).json({ error: `Cannot edit a ${chk.status} BQ.` });

    const del = await query('DELETE FROM bq_items WHERE id=$1 AND bq_id=$2 RETURNING id', [req.params.itemId, req.params.id]);
    if (!del.rows.length) return res.status(404).json({ error: 'Item not found.' });
    const total = await svc.recomputeTotal(req.params.id);
    await svc.audit({ bqId: req.params.id, tenantId: req.user.tenant_id, userId: req.user.id, action: 'item_deleted' });
    res.json({ success: true, total });
  } catch (err) { next(err); }
});

// Reorder: body { order: [itemId, itemId, ...] }
router.put('/:id/items/reorder', authenticate, authorize(...EDIT_ROLES), async (req, res, next) => {
  let client;
  try {
    const chk = await assertEditable(req.params.id, req.user.tenant_id);
    if (chk.error === 404) return res.status(404).json({ error: 'BQ not found.' });
    if (chk.error === 409) return res.status(409).json({ error: `Cannot edit a ${chk.status} BQ.` });
    const order = Array.isArray(req.body.order) ? req.body.order : [];
    client = await getClient();
    await client.query('BEGIN');
    for (let i = 0; i < order.length; i++) {
      await client.query('UPDATE bq_items SET sort_order=$1 WHERE id=$2 AND bq_id=$3', [i, order[i], req.params.id]);
    }
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    if (client) { try { await client.query('ROLLBACK'); } catch (_) {} }
    next(err);
  } finally {
    if (client) client.release();
  }
});

// ── Rate library: push this BQ's items into market_rates ─────────────────────
router.post('/:id/import-rates', authenticate, authorize(...EDIT_ROLES), async (req, res, next) => {
  try {
    const bq = await svc.getBq(req.params.id, req.user.tenant_id);
    if (!bq) return res.status(404).json({ error: 'BQ not found.' });
    const result = await query(
      `INSERT INTO market_rates (id, tenant_id, category, item_code, item_name, unit, rate, our_rate, source, effective_date)
       SELECT uuid_generate_v4(), $1, LEFT(COALESCE(section,'General'),100), item_code, LEFT(description,255), unit,
              COALESCE(unit_rate,0), COALESCE(unit_rate,0), $2, CURRENT_DATE
       FROM bq_items WHERE bq_id=$3 AND unit_rate IS NOT NULL
       ON CONFLICT (tenant_id, COALESCE(item_code,''), item_name, COALESCE(unit,''))
       DO UPDATE SET rate=EXCLUDED.rate, our_rate=EXCLUDED.our_rate, updated_at=NOW()
       RETURNING id`,
      [req.user.tenant_id, `bq:${req.params.id}`, req.params.id]
    );
    await svc.audit({ bqId: req.params.id, tenantId: req.user.tenant_id, userId: req.user.id, action: 'rates_imported', detail: { count: result.rowCount } });
    res.json({ imported: result.rowCount });
  } catch (err) { next(err); }
});

// ── Rate library: apply a market rate as a new line item ─────────────────────
router.post('/:id/apply-rate', authenticate, authorize(...EDIT_ROLES), async (req, res, next) => {
  try {
    const chk = await assertEditable(req.params.id, req.user.tenant_id);
    if (chk.error === 404) return res.status(404).json({ error: 'BQ not found.' });
    if (chk.error === 409) return res.status(409).json({ error: `Cannot edit a ${chk.status} BQ.` });

    const { rateId, quantity, section } = req.body;
    const rate = (await query('SELECT * FROM market_rates WHERE id=$1 AND tenant_id=$2', [rateId, req.user.tenant_id])).rows[0];
    if (!rate) return res.status(404).json({ error: 'Rate not found.' });
    const r = Number(rate.our_rate ?? rate.rate) || 0;
    const q = svc.num(quantity) || 0;
    const ord = (await query('SELECT COALESCE(MAX(sort_order),-1)+1 AS n FROM bq_items WHERE bq_id=$1', [req.params.id])).rows[0].n;
    const id = uuidv4();
    await query(
      `INSERT INTO bq_items (id, bq_id, item_code, description, unit, quantity, unit_rate, amount, section, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [id, req.params.id, rate.item_code || null, rate.item_name, rate.unit || null, q, r, q * r, section || rate.category || null, ord]
    );
    const total = await svc.recomputeTotal(req.params.id);
    await svc.audit({ bqId: req.params.id, tenantId: req.user.tenant_id, userId: req.user.id, action: 'rate_applied', detail: { rateId } });
    const row = (await query('SELECT * FROM bq_items WHERE id=$1', [id])).rows[0];
    res.status(201).json({ item: row, total });
  } catch (err) { next(err); }
});

module.exports = router;
