// Shared helpers for the BQ / tender pipeline: ownership checks, total
// recomputation, status-transition rules, and audit logging.

const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');

// Allowed status transitions for the tender workflow.
const TRANSITIONS = {
  draft:     ['submitted', 'archived'],
  submitted: ['approved', 'draft', 'archived'], // draft = reject back to author
  approved:  ['archived', 'submitted'],          // submitted = reopen for changes
  archived:  ['draft'],                          // restore
};

// Statuses in which line items may still be edited.
const EDITABLE_STATUSES = ['draft', 'submitted'];

function canTransition(from, to) {
  return (TRANSITIONS[from] || []).includes(to);
}

// Coerce empty strings / junk to null or a number — protects numeric columns.
function num(v) {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// Fetch a non-deleted BQ scoped to the tenant. Returns the row or null.
// Accepts an optional client for use inside a transaction.
async function getBq(id, tenantId, client) {
  const run = client ? client.query.bind(client) : query;
  const r = await run(
    'SELECT * FROM bq_documents WHERE id=$1 AND tenant_id=$2 AND deleted_at IS NULL',
    [id, tenantId]
  );
  return r.rows[0] || null;
}

// Recompute and persist total_amount from line items. Returns the new total.
async function recomputeTotal(bqId, client) {
  const run = client ? client.query.bind(client) : query;
  const r = await run('SELECT COALESCE(SUM(amount),0) AS total FROM bq_items WHERE bq_id=$1', [bqId]);
  const total = Number(r.rows[0].total) || 0;
  await run('UPDATE bq_documents SET total_amount=$1 WHERE id=$2', [total, bqId]);
  return total;
}

// Append an audit entry. Best-effort: never throws into the caller.
async function audit({ bqId, tenantId, userId, action, fromStatus = null, toStatus = null, detail = null }, client) {
  const run = client ? client.query.bind(client) : query;
  try {
    await run(
      `INSERT INTO bq_audit (id, bq_id, tenant_id, user_id, action, from_status, to_status, detail)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [uuidv4(), bqId, tenantId, userId || null, action, fromStatus, toStatus, detail ? JSON.stringify(detail) : null]
    );
  } catch (err) {
    console.error('bq audit failed:', err.message);
  }
}

module.exports = {
  TRANSITIONS,
  EDITABLE_STATUSES,
  canTransition,
  num,
  getBq,
  recomputeTotal,
  audit,
};
