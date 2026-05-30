// Cross-module automation: notifications, scope auto-import, and status aging.
// Centralises the "glue" that connects BQ → project → claim → finance so the
// individual routes stay thin and the behaviour is consistent.

const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// ── Notifications ────────────────────────────────────────────────────────────

// Fan a notification out to a set of user ids (deduped). Never throws — a failed
// notification must not roll back the business action that triggered it.
async function notifyUsers(userIds, { tenantId, title, message, type = 'info', link = null }) {
  try {
    const ids = [...new Set((userIds || []).filter(Boolean))];
    for (const uid of ids) {
      await query(
        `INSERT INTO notifications (id, tenant_id, user_id, title, message, type, link)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [uuidv4(), tenantId, uid, title, message, type, link]
      );
    }
    return ids.length;
  } catch (e) {
    console.error('[automation] notifyUsers failed:', e.message);
    return 0;
  }
}

// Notify everyone in a tenant holding any of the given roles.
async function notifyRoles(roles, payload) {
  try {
    const r = await query(
      `SELECT id FROM users WHERE tenant_id=$1 AND role = ANY($2::text[]) AND is_active IS NOT FALSE`,
      [payload.tenantId, roles]
    );
    return notifyUsers(r.rows.map(x => x.id), payload);
  } catch (e) {
    console.error('[automation] notifyRoles failed:', e.message);
    return 0;
  }
}

// Notify the project's PM (if any) plus the given roles — the usual audience for
// a project-scoped event.
async function notifyProjectStakeholders(projectId, roles, payload) {
  let pmId = null;
  try {
    const p = await query('SELECT pm_id FROM projects WHERE id=$1', [projectId]);
    pmId = p.rows[0]?.pm_id || null;
  } catch (_) {}
  const sent = await notifyRoles(roles, payload);
  if (pmId) await notifyUsers([pmId], payload);
  return sent;
}

// ── Scope auto-import (shared by manual import + BQ-approve hook) ──────────────

// Materialise a BQ's items into project_scope. Idempotent via the
// uniq(project_id, bq_item_id) index. Accepts an optional pg client for txns.
async function importBqScope(bqId, projectId, tenantId, runner) {
  const run = runner || query;
  const result = await run(
    `INSERT INTO project_scope
       (id, tenant_id, project_id, bq_id, bq_item_id, item_code, section, description, unit, contract_qty, unit_rate, amount, sort_order)
     SELECT uuid_generate_v4(), $1, $2, $3, i.id, i.item_code, i.section, i.description, i.unit,
            i.quantity, i.unit_rate, COALESCE(i.amount,0), i.sort_order
     FROM bq_items i
     WHERE i.bq_id=$3
     ON CONFLICT (project_id, bq_item_id) WHERE bq_item_id IS NOT NULL DO NOTHING
     RETURNING id`,
    [tenantId, projectId, bqId]
  );
  return result.rowCount;
}

// ── Status aging ─────────────────────────────────────────────────────────────

// Sweep overdue payment certs & invoices, flag projects awaiting payment, and
// notify finance. Safe to run repeatedly (idempotent transitions only).
// Scoped to one tenant if tenantId given, otherwise all tenants.
async function runAging(tenantId = null) {
  const scope = tenantId ? 'AND tenant_id=$1' : '';
  const p = tenantId ? [tenantId] : [];

  // Certs: certified/pending past due_date → overdue.
  const certs = await query(
    `UPDATE payment_certificates
       SET status='overdue', updated_at=NOW()
     WHERE status IN ('pending','certified') AND due_date < CURRENT_DATE ${scope}
     RETURNING id, tenant_id, project_id, cert_number, certified_amount`,
    p
  );

  // Invoices: unpaid/partially_paid past due_date → overdue.
  const invs = await query(
    `UPDATE invoices
       SET status='overdue', updated_at=NOW()
     WHERE status IN ('unpaid','partially_paid') AND due_date < CURRENT_DATE ${scope}
     RETURNING id, tenant_id, project_id, invoice_number, total`,
    p
  );

  // Notify finance/admin per tenant about what just went overdue.
  const byTenant = {};
  for (const c of certs.rows) (byTenant[c.tenant_id] ||= { certs: 0, invs: 0 }).certs++;
  for (const i of invs.rows) (byTenant[i.tenant_id] ||= { certs: 0, invs: 0 }).invs++;
  for (const [tid, n] of Object.entries(byTenant)) {
    const parts = [];
    if (n.certs) parts.push(`${n.certs} payment cert(s)`);
    if (n.invs) parts.push(`${n.invs} invoice(s)`);
    await notifyRoles(['director', 'admin', 'finance'], {
      tenantId: tid,
      title: 'Overdue items need follow-up',
      message: `${parts.join(' and ')} passed the due date and are now overdue.`,
      type: 'warning',
      link: '/finance',
    });
  }

  return { certsOverdue: certs.rowCount, invoicesOverdue: invs.rowCount };
}

module.exports = {
  notifyUsers, notifyRoles, notifyProjectStakeholders,
  importBqScope, runAging,
};
