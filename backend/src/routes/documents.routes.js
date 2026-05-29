const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

// ── LIST DOCUMENTS ────────────────────────────────────────────────────────────

router.get('/', async (req, res, next) => {
  try {
    const { category, search, project_id } = req.query;
    const { db } = req;
    let q = `
      SELECT d.*, u.name AS uploaded_by_name, p.name AS project_name
      FROM documents d
      LEFT JOIN users u ON u.id = d.uploaded_by
      LEFT JOIN projects p ON p.id = d.project_id
      WHERE d.tenant_id = $1
    `;
    const params = [req.tenant_id];
    if (category) { q += ` AND d.category = $${params.length + 1}`; params.push(category); }
    if (search) { q += ` AND (d.title ILIKE $${params.length + 1} OR d.filename ILIKE $${params.length + 1})`; params.push(`%${search}%`); }
    if (project_id) { q += ` AND d.project_id = $${params.length + 1}`; params.push(project_id); }
    q += ` ORDER BY d.created_at DESC LIMIT 500`;
    const { rows } = await db.query(q, params);
    res.json({ documents: rows });
  } catch (err) { next(err); }
});

// ── UPLOAD (metadata — S3 integration in next sprint) ─────────────────────────

router.post('/upload', async (req, res, next) => {
  try {
    // Note: Actual file bytes handled by multer + S3 in the next sprint.
    // For now we store metadata and a placeholder file_url.
    const { title, category, description, project_id, send_for_approval } = req.body;

    // multer will attach req.file when S3 is wired up
    const filename = req.file?.originalname || req.body.filename || 'pending_upload';
    const fileSize = req.file?.size || null;
    const status = send_for_approval === 'true' || send_for_approval === true ? 'pending_approval' : 'active';

    const { db } = req;
    const { rows } = await db.query(`
      INSERT INTO documents
        (tenant_id, project_id, title, filename, file_url, file_size, category, description, status, version, uploaded_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,1,$10)
      RETURNING *
    `, [req.tenant_id, project_id || null, title || filename,
        filename, null, fileSize, category || 'Other', description,
        status, req.user.id]);

    res.status(201).json({ document: rows[0] });
  } catch (err) { next(err); }
});

// ── UPDATE DOCUMENT (status, approval) ───────────────────────────────────────

router.patch('/:id', async (req, res, next) => {
  try {
    const { status, title, description } = req.body;
    const { db } = req;

    // Only directors/admins can approve documents
    if (status === 'approved' && !['director','admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only directors and admins can approve documents.' });
    }

    const { rows } = await db.query(`
      UPDATE documents SET
        status = COALESCE($1, status),
        title = COALESCE($2, title),
        description = COALESCE($3, description),
        updated_at = NOW()
      WHERE id = $4 AND tenant_id = $5
      RETURNING *
    `, [status, title, description, req.params.id, req.tenant_id]);
    if (!rows.length) return res.status(404).json({ error: 'Document not found' });
    res.json({ document: rows[0] });
  } catch (err) { next(err); }
});

// ── RE-UPLOAD / NEW VERSION ────────────────────────────────────────────────────

router.post('/:id/version', async (req, res, next) => {
  try {
    const { db } = req;
    const { rows: existing } = await db.query(
      `SELECT * FROM documents WHERE id=$1 AND tenant_id=$2`, [req.params.id, req.tenant_id]
    );
    if (!existing.length) return res.status(404).json({ error: 'Document not found' });
    const doc = existing[0];

    const filename = req.file?.originalname || req.body.filename || doc.filename;
    const fileSize = req.file?.size || null;

    const { rows } = await db.query(`
      INSERT INTO documents
        (tenant_id, project_id, title, filename, file_url, file_size, category, description, status, version, uploaded_by, parent_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'active',$9,$10,$11)
      RETURNING *
    `, [req.tenant_id, doc.project_id, doc.title, filename, null, fileSize,
        doc.category, doc.description, doc.version + 1, req.user.id, doc.id]);

    res.status(201).json({ document: rows[0] });
  } catch (err) { next(err); }
});

// ── DELETE ────────────────────────────────────────────────────────────────────

router.delete('/:id', authorize('director','admin'), async (req, res, next) => {
  try {
    const { db } = req;
    await db.query(`UPDATE documents SET status='deleted', updated_at=NOW() WHERE id=$1 AND tenant_id=$2`, [req.params.id, req.tenant_id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
