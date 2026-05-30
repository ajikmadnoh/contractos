// Rollup helpers for PMO scope + site-diary progress.

const { query } = require('../config/database');

const num = (v) => {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// Recompute qty_done + pct_complete for a single scope line from all the diary
// entries that booked against it, then refresh the parent project's progress.
async function recomputeScope(scopeId, runner) {
  const run = runner || query;
  const scope = (await run('SELECT * FROM project_scope WHERE id=$1', [scopeId])).rows[0];
  if (!scope) return null;
  const sum = (await run(
    'SELECT COALESCE(SUM(qty_done),0) AS done FROM site_diary_entries WHERE project_scope_id=$1', [scopeId]
  )).rows[0];
  const done = Number(sum.done) || 0;
  const contract = Number(scope.contract_qty) || 0;
  const pct = contract > 0 ? Math.min(100, (done / contract) * 100) : 0;
  await run('UPDATE project_scope SET qty_done=$1, pct_complete=$2, updated_at=NOW() WHERE id=$3',
    [done, pct.toFixed(2), scopeId]);
  await recomputeProjectProgress(scope.project_id, run);
  return { qty_done: done, pct_complete: Number(pct.toFixed(2)) };
}

// Project progress = value-weighted average of scope-line completion.
async function recomputeProjectProgress(projectId, runner) {
  const run = runner || query;
  const r = (await run(
    `SELECT COALESCE(SUM(amount),0) AS total,
            COALESCE(SUM(amount * pct_complete / 100.0),0) AS earned
     FROM project_scope WHERE project_id=$1 AND amount > 0`, [projectId]
  )).rows[0];
  const total = Number(r.total) || 0;
  if (total <= 0) return;
  const pct = Math.min(100, (Number(r.earned) / total) * 100);
  await run('UPDATE projects SET progress_pct=$1, updated_at=NOW() WHERE id=$2', [pct.toFixed(2), projectId]);
}

module.exports = { num, recomputeScope, recomputeProjectProgress };
