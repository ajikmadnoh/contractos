// PMO scope tracking + site diaries. Mounted under /projects alongside the
// main projects router (Express falls through on non-matching paths).

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticate, authorize } = require('../middleware/auth');
const { ROLES } = require('../config/constants');
const { query, getClient } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const track = require('../services/siteTrackingService');

const canManage = authorize(ROLES.DIRECTOR, ROLES.ADMIN, ROLES.PM, ROLES.QS);

const photoDir = path.join(__dirname, '../../uploads/diary');
if (!fs.existsSync(photoDir)) fs.mkdirSync(photoDir, { recursive: true });
const photoUpload = multer({
  storage: multer.diskStorage({
    destination: (req, f, cb) => cb(null, photoDir),
    filename: (req, f, cb) => cb(null, `${uuidv4()}${path.extname(f.originalname)}`),
  }),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, f, cb) => cb(/^image\//.test(f.mimetype) ? null : new Error('Images only.'), /^image\//.test(f.mimetype)),
});

// Verify the project belongs to the tenant.
async function ownProject(id, tenantId) {
  const r = await query('SELECT id FROM projects WHERE id=$1 AND tenant_id=$2', [id, tenantId]);
  return r.rows.length > 0;
}

// ── BQs linked to a project (fixes the previously-dead project_id link) ──────
router.get('/:id/bq', authenticate, async (req, res, next) => {
  try {
    if (!(await ownProject(req.params.id, req.user.tenant_id))) return res.status(404).json({ error: 'Project not found.' });
    const r = await query(
      `SELECT b.id, b.title, b.status, b.version, b.total_amount,
              (SELECT count(*) FROM bq_items i WHERE i.bq_id=b.id)::int AS item_count
       FROM bq_documents b
       WHERE b.project_id=$1 AND b.tenant_id=$2 AND b.deleted_at IS NULL
       ORDER BY b.created_at DESC`,
      [req.params.id, req.user.tenant_id]
    );
    res.json(r.rows);
  } catch (err) { next(err); }
});

// ── Import a BQ's line items into the project as trackable scope ─────────────
router.post('/:id/import-bq/:bqId', authenticate, canManage, async (req, res, next) => {
  let client;
  try {
    if (!(await ownProject(req.params.id, req.user.tenant_id))) return res.status(404).json({ error: 'Project not found.' });
    const bq = (await query('SELECT * FROM bq_documents WHERE id=$1 AND tenant_id=$2 AND deleted_at IS NULL', [req.params.bqId, req.user.tenant_id])).rows[0];
    if (!bq) return res.status(404).json({ error: 'BQ not found.' });

    client = await getClient();
    await client.query('BEGIN');
    // Insert items not already imported (uniq index on project_id, bq_item_id).
    const result = await client.query(
      `INSERT INTO project_scope
         (id, tenant_id, project_id, bq_id, bq_item_id, item_code, section, description, unit, contract_qty, unit_rate, amount, sort_order)
       SELECT uuid_generate_v4(), $1, $2, $3, i.id, i.item_code, i.section, i.description, i.unit,
              i.quantity, i.unit_rate, COALESCE(i.amount,0), i.sort_order
       FROM bq_items i
       WHERE i.bq_id=$3
       ON CONFLICT (project_id, bq_item_id) WHERE bq_item_id IS NOT NULL DO NOTHING
       RETURNING id`,
      [req.user.tenant_id, req.params.id, req.params.bqId]
    );
    await client.query('COMMIT');
    await track.recomputeProjectProgress(req.params.id);
    const warn = bq.status !== 'approved'
      ? `Imported from a ${bq.status} BQ — values may still change.` : null;
    res.json({ imported: result.rowCount, warning: warn });
  } catch (err) {
    if (client) { try { await client.query('ROLLBACK'); } catch (_) {} }
    next(err);
  } finally {
    if (client) client.release();
  }
});

// ── Scope list + per-section rollup ──────────────────────────────────────────
router.get('/:id/scope', authenticate, async (req, res, next) => {
  try {
    if (!(await ownProject(req.params.id, req.user.tenant_id))) return res.status(404).json({ error: 'Project not found.' });
    const items = await query(
      'SELECT * FROM project_scope WHERE project_id=$1 ORDER BY sort_order, section, description', [req.params.id]);
    const summary = await query(
      `SELECT COALESCE(section,'(uncategorised)') AS section,
              count(*)::int AS line_count,
              COALESCE(SUM(amount),0) AS amount,
              CASE WHEN SUM(amount) > 0
                   THEN ROUND(SUM(amount * pct_complete / 100.0) / SUM(amount) * 100, 2)
                   ELSE 0 END AS pct_complete
       FROM project_scope WHERE project_id=$1
       GROUP BY COALESCE(section,'(uncategorised)') ORDER BY 1`, [req.params.id]);
    const totals = await query(
      `SELECT COALESCE(SUM(amount),0) AS total_amount,
              CASE WHEN SUM(amount) > 0
                   THEN ROUND(SUM(amount * pct_complete / 100.0) / SUM(amount) * 100, 2)
                   ELSE 0 END AS pct_complete,
              count(*)::int AS line_count
       FROM project_scope WHERE project_id=$1`, [req.params.id]);
    res.json({ items: items.rows, sections: summary.rows, ...totals.rows[0] });
  } catch (err) { next(err); }
});

// ── Edit / delete a scope line ───────────────────────────────────────────────
router.patch('/:id/scope/:scopeId', authenticate, canManage, async (req, res, next) => {
  try {
    if (!(await ownProject(req.params.id, req.user.tenant_id))) return res.status(404).json({ error: 'Project not found.' });
    const b = req.body || {};
    const cq = track.num(b.contractQty);
    const r = await query(
      `UPDATE project_scope SET
         contract_qty=COALESCE($1,contract_qty),
         unit_rate=COALESCE($2,unit_rate),
         description=COALESCE($3,description),
         amount = COALESCE($1,contract_qty) * COALESCE($2,unit_rate),
         updated_at=NOW()
       WHERE id=$4 AND project_id=$5 RETURNING *`,
      [cq, track.num(b.unitRate), b.description || null, req.params.scopeId, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Scope line not found.' });
    const roll = await track.recomputeScope(req.params.scopeId); // contract change shifts pct
    res.json({ scope: { ...r.rows[0], ...roll } });
  } catch (err) { next(err); }
});

router.delete('/:id/scope/:scopeId', authenticate, canManage, async (req, res, next) => {
  try {
    if (!(await ownProject(req.params.id, req.user.tenant_id))) return res.status(404).json({ error: 'Project not found.' });
    const del = await query('DELETE FROM project_scope WHERE id=$1 AND project_id=$2 RETURNING id', [req.params.scopeId, req.params.id]);
    if (!del.rows.length) return res.status(404).json({ error: 'Scope line not found.' });
    await track.recomputeProjectProgress(req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ── Site diaries ─────────────────────────────────────────────────────────────
router.get('/:id/diaries', authenticate, async (req, res, next) => {
  try {
    if (!(await ownProject(req.params.id, req.user.tenant_id))) return res.status(404).json({ error: 'Project not found.' });
    const r = await query(
      `SELECT d.*, u.name AS author_name,
              (SELECT count(*) FROM site_diary_entries e WHERE e.diary_id=d.id)::int AS entry_count,
              (SELECT count(*) FROM site_diary_photos p WHERE p.diary_id=d.id)::int AS photo_count
       FROM site_diaries d LEFT JOIN users u ON d.created_by=u.id
       WHERE d.project_id=$1 ORDER BY d.diary_date DESC, d.created_at DESC`,
      [req.params.id]
    );
    res.json(r.rows);
  } catch (err) { next(err); }
});

router.post('/:id/diaries', authenticate, canManage, async (req, res, next) => {
  try {
    if (!(await ownProject(req.params.id, req.user.tenant_id))) return res.status(404).json({ error: 'Project not found.' });
    const { diaryDate, weather, manpower, equipment, notes } = req.body;
    const r = await query(
      `INSERT INTO site_diaries (id, tenant_id, project_id, diary_date, weather, manpower, equipment, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [uuidv4(), req.user.tenant_id, req.params.id, diaryDate || new Date().toISOString().slice(0, 10),
       weather || null, track.num(manpower), equipment || null, notes || null, req.user.id]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { next(err); }
});

router.get('/:id/diaries/:diaryId', authenticate, async (req, res, next) => {
  try {
    if (!(await ownProject(req.params.id, req.user.tenant_id))) return res.status(404).json({ error: 'Project not found.' });
    const diary = (await query('SELECT * FROM site_diaries WHERE id=$1 AND project_id=$2', [req.params.diaryId, req.params.id])).rows[0];
    if (!diary) return res.status(404).json({ error: 'Diary not found.' });
    const entries = await query(
      `SELECT e.*, s.section, s.description AS scope_description, s.unit, s.contract_qty
       FROM site_diary_entries e LEFT JOIN project_scope s ON e.project_scope_id=s.id
       WHERE e.diary_id=$1 ORDER BY e.created_at`, [req.params.diaryId]);
    const photos = await query('SELECT id, entry_id, filename, caption FROM site_diary_photos WHERE diary_id=$1', [req.params.diaryId]);
    res.json({ ...diary, entries: entries.rows, photos: photos.rows.map(p => ({ ...p, url: `/uploads/diary/${p.filename}` })) });
  } catch (err) { next(err); }
});

router.patch('/:id/diaries/:diaryId', authenticate, canManage, async (req, res, next) => {
  try {
    if (!(await ownProject(req.params.id, req.user.tenant_id))) return res.status(404).json({ error: 'Project not found.' });
    const { weather, manpower, equipment, notes, diaryDate } = req.body;
    const r = await query(
      `UPDATE site_diaries SET diary_date=COALESCE($1,diary_date), weather=COALESCE($2,weather),
         manpower=COALESCE($3,manpower), equipment=COALESCE($4,equipment), notes=COALESCE($5,notes), updated_at=NOW()
       WHERE id=$6 AND project_id=$7 RETURNING *`,
      [diaryDate || null, weather || null, track.num(manpower), equipment || null, notes || null, req.params.diaryId, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Diary not found.' });
    res.json(r.rows[0]);
  } catch (err) { next(err); }
});

router.delete('/:id/diaries/:diaryId', authenticate, canManage, async (req, res, next) => {
  try {
    if (!(await ownProject(req.params.id, req.user.tenant_id))) return res.status(404).json({ error: 'Project not found.' });
    // Capture affected scope lines so we can recompute after the cascade delete.
    const scopes = await query(
      'SELECT DISTINCT project_scope_id FROM site_diary_entries WHERE diary_id=$1 AND project_scope_id IS NOT NULL', [req.params.diaryId]);
    const del = await query('DELETE FROM site_diaries WHERE id=$1 AND project_id=$2 RETURNING id', [req.params.diaryId, req.params.id]);
    if (!del.rows.length) return res.status(404).json({ error: 'Diary not found.' });
    for (const s of scopes.rows) await track.recomputeScope(s.project_scope_id);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ── Diary entries (progress booked against a scope category) ─────────────────
router.post('/:id/diaries/:diaryId/entries', authenticate, canManage, async (req, res, next) => {
  try {
    if (!(await ownProject(req.params.id, req.user.tenant_id))) return res.status(404).json({ error: 'Project not found.' });
    const diary = (await query('SELECT id FROM site_diaries WHERE id=$1 AND project_id=$2', [req.params.diaryId, req.params.id])).rows[0];
    if (!diary) return res.status(404).json({ error: 'Diary not found.' });
    const { scopeId, qtyDone, remarks } = req.body;
    const id = uuidv4();
    await query(
      `INSERT INTO site_diary_entries (id, diary_id, project_scope_id, qty_done, remarks)
       VALUES ($1,$2,$3,$4,$5)`,
      [id, req.params.diaryId, scopeId || null, track.num(qtyDone) || 0, remarks || null]
    );
    let roll = null;
    if (scopeId) roll = await track.recomputeScope(scopeId);
    const row = (await query('SELECT * FROM site_diary_entries WHERE id=$1', [id])).rows[0];
    res.status(201).json({ entry: row, scopeRollup: roll });
  } catch (err) { next(err); }
});

router.patch('/:id/diaries/:diaryId/entries/:entryId', authenticate, canManage, async (req, res, next) => {
  try {
    if (!(await ownProject(req.params.id, req.user.tenant_id))) return res.status(404).json({ error: 'Project not found.' });
    const { qtyDone, remarks } = req.body;
    const r = await query(
      `UPDATE site_diary_entries SET qty_done=COALESCE($1,qty_done), remarks=COALESCE($2,remarks)
       WHERE id=$3 AND diary_id=$4 RETURNING *`,
      [track.num(qtyDone), remarks || null, req.params.entryId, req.params.diaryId]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Entry not found.' });
    let roll = null;
    if (r.rows[0].project_scope_id) roll = await track.recomputeScope(r.rows[0].project_scope_id);
    res.json({ entry: r.rows[0], scopeRollup: roll });
  } catch (err) { next(err); }
});

router.delete('/:id/diaries/:diaryId/entries/:entryId', authenticate, canManage, async (req, res, next) => {
  try {
    if (!(await ownProject(req.params.id, req.user.tenant_id))) return res.status(404).json({ error: 'Project not found.' });
    const del = await query('DELETE FROM site_diary_entries WHERE id=$1 AND diary_id=$2 RETURNING project_scope_id', [req.params.entryId, req.params.diaryId]);
    if (!del.rows.length) return res.status(404).json({ error: 'Entry not found.' });
    if (del.rows[0].project_scope_id) await track.recomputeScope(del.rows[0].project_scope_id);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ── Diary photos (work proofs) ───────────────────────────────────────────────
router.post('/:id/diaries/:diaryId/photos', authenticate, canManage, photoUpload.array('photos', 10), async (req, res, next) => {
  try {
    if (!(await ownProject(req.params.id, req.user.tenant_id))) return res.status(404).json({ error: 'Project not found.' });
    const diary = (await query('SELECT id FROM site_diaries WHERE id=$1 AND project_id=$2', [req.params.diaryId, req.params.id])).rows[0];
    if (!diary) return res.status(404).json({ error: 'Diary not found.' });
    const files = req.files || [];
    if (!files.length) return res.status(400).json({ error: 'No photos uploaded.' });
    const saved = [];
    for (const f of files) {
      const id = uuidv4();
      await query(
        `INSERT INTO site_diary_photos (id, entry_id, diary_id, filename, caption, uploaded_by)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [id, req.body.entryId || null, req.params.diaryId, f.filename, req.body.caption || null, req.user.id]
      );
      saved.push({ id, filename: f.filename, url: `/uploads/diary/${f.filename}` });
    }
    res.status(201).json({ photos: saved });
  } catch (err) { next(err); }
});

router.delete('/:id/diaries/:diaryId/photos/:photoId', authenticate, canManage, async (req, res, next) => {
  try {
    if (!(await ownProject(req.params.id, req.user.tenant_id))) return res.status(404).json({ error: 'Project not found.' });
    const del = await query('DELETE FROM site_diary_photos WHERE id=$1 AND diary_id=$2 RETURNING filename', [req.params.photoId, req.params.diaryId]);
    if (del.rows.length) {
      const fp = path.join(photoDir, del.rows[0].filename);
      fs.promises.unlink(fp).catch(() => {});
    }
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
