// Cross-module automation: notifications, scope auto-import, status aging, and
// scheduled sweeps.  Centralises the "glue" so individual routes stay thin.

const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// ── Notifications ─────────────────────────────────────────────────────────────

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

// ── Automation log ────────────────────────────────────────────────────────────

// Persist an automation run to the DB. Never throws — logging must not block jobs.
async function logRun(event, { tenantId = null, affectedCount = 0, durationMs = null, detail = null } = {}) {
  try {
    await query(
      `INSERT INTO automation_logs (id, tenant_id, event, affected_count, duration_ms, detail)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [uuidv4(), tenantId || null, event, affectedCount, durationMs || null, detail ? JSON.stringify(detail) : null]
    );
  } catch (e) {
    console.error('[automation] logRun failed:', e.message);
  }
}

// Return the last run time for each known event (system-wide).
async function getAutomationStatus() {
  const r = await query(
    `SELECT DISTINCT ON (event) event, created_at, affected_count, duration_ms, detail
     FROM automation_logs ORDER BY event, created_at DESC`
  );
  return r.rows;
}

// ── Scope auto-import ─────────────────────────────────────────────────────────

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

// ── Status aging ──────────────────────────────────────────────────────────────

async function runAging(tenantId = null) {
  const t0 = Date.now();
  const scope = tenantId ? 'AND tenant_id=$1' : '';
  const p = tenantId ? [tenantId] : [];

  const certs = await query(
    `UPDATE payment_certificates SET status='overdue', updated_at=NOW()
     WHERE status IN ('pending','certified') AND due_date < CURRENT_DATE ${scope}
     RETURNING id, tenant_id, project_id, cert_number, certified_amount`,
    p
  );

  const invs = await query(
    `UPDATE invoices SET status='overdue', updated_at=NOW()
     WHERE status IN ('unpaid','partially_paid') AND due_date < CURRENT_DATE ${scope}
     RETURNING id, tenant_id, project_id, invoice_number, total`,
    p
  );

  // Notify per-tenant
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

  const total = certs.rowCount + invs.rowCount;
  await logRun('aging', {
    tenantId,
    affectedCount: total,
    durationMs: Date.now() - t0,
    detail: { certsOverdue: certs.rowCount, invoicesOverdue: invs.rowCount },
  });

  return { certsOverdue: certs.rowCount, invoicesOverdue: invs.rowCount };
}

// ── Weekly cert escalation ────────────────────────────────────────────────────

// Re-alert on every overdue payment cert that hasn't been reminded in ≥7 days.
// Safe to call daily — the WHERE clause is the real gate.
async function runWeeklyEscalation(tenantId = null) {
  const t0 = Date.now();
  const scope = tenantId ? 'AND pc.tenant_id=$1' : '';
  const p = tenantId ? [tenantId] : [];

  const overdue = await query(
    `SELECT pc.id, pc.tenant_id, pc.project_id, pc.cert_number, pc.certified_amount, pc.due_date, p.pm_id
     FROM payment_certificates pc
     LEFT JOIN projects p ON pc.project_id = p.id
     WHERE pc.status = 'overdue'
       AND (pc.last_reminder_sent IS NULL OR pc.last_reminder_sent < NOW() - INTERVAL '7 days')
       ${scope}`,
    p
  );

  for (const cert of overdue.rows) {
    const daysOverdue = Math.floor((Date.now() - new Date(cert.due_date).getTime()) / 86400000);
    await notifyProjectStakeholders(cert.project_id, ['director', 'finance'], {
      tenantId: cert.tenant_id,
      title: `Overdue cert — ${cert.cert_number} (${daysOverdue}d)`,
      message: `Payment cert ${cert.cert_number} is ${daysOverdue} day(s) overdue (RM ${Number(cert.certified_amount).toLocaleString('en-MY', { minimumFractionDigits: 2 })}). Please follow up immediately.`,
      type: 'warning',
      link: '/finance',
    });
    await query('UPDATE payment_certificates SET last_reminder_sent=NOW() WHERE id=$1', [cert.id]);
  }

  await logRun('cert_escalation', { tenantId, affectedCount: overdue.rowCount, durationMs: Date.now() - t0 });
  return { escalated: overdue.rowCount };
}

// ── Weekly invoice escalation ─────────────────────────────────────────────────

// Re-alert on overdue invoices that haven't been reminded in ≥7 days.
async function runWeeklyInvoiceEscalation(tenantId = null) {
  const t0 = Date.now();
  const scope = tenantId ? 'AND i.tenant_id=$1' : '';
  const p = tenantId ? [tenantId] : [];

  const overdue = await query(
    `SELECT i.id, i.tenant_id, i.project_id, i.invoice_number, i.total, i.due_date,
            i.last_reminder_sent, p.pm_id
     FROM invoices i
     LEFT JOIN projects p ON i.project_id = p.id
     WHERE i.status = 'overdue'
       AND (i.last_reminder_sent IS NULL OR i.last_reminder_sent < NOW() - INTERVAL '7 days')
       ${scope}`,
    p
  );

  for (const inv of overdue.rows) {
    const daysOverdue = Math.floor((Date.now() - new Date(inv.due_date).getTime()) / 86400000);
    await notifyProjectStakeholders(inv.project_id, ['director', 'finance'], {
      tenantId: inv.tenant_id,
      title: `Overdue invoice — ${inv.invoice_number} (${daysOverdue}d)`,
      message: `Invoice ${inv.invoice_number} is ${daysOverdue} day(s) overdue (RM ${Number(inv.total).toLocaleString('en-MY', { minimumFractionDigits: 2 })}). Please follow up with the client.`,
      type: 'warning',
      link: '/invoicing',
    });
    await query('UPDATE invoices SET last_reminder_sent=NOW() WHERE id=$1', [inv.id]);
  }

  await logRun('invoice_escalation', { tenantId, affectedCount: overdue.rowCount, durationMs: Date.now() - t0 });
  return { escalated: overdue.rowCount };
}

// ── Milestone overdue check ───────────────────────────────────────────────────

// Flag milestones past their due_date that haven't been completed.
// Sends one notification per milestone per day (guarded by overdue_alerted_at).
async function runMilestoneOverdueCheck(tenantId = null) {
  const t0 = Date.now();
  const scope = tenantId ? 'AND p.tenant_id=$1' : '';
  const p = tenantId ? [tenantId] : [];

  const overdue = await query(
    `SELECT pm.id, pm.title, pm.due_date, pm.is_critical, pm.project_id,
            p.tenant_id, p.name AS project_name, p.pm_id
     FROM project_milestones pm
     JOIN projects p ON pm.project_id = p.id
     WHERE pm.due_date < CURRENT_DATE
       AND pm.is_completed IS NOT TRUE
       AND pm.status != 'done'
       AND (pm.overdue_alerted_at IS NULL OR pm.overdue_alerted_at < CURRENT_DATE)
       ${scope}`,
    p
  );

  for (const ms of overdue.rows) {
    const daysOverdue = Math.floor((Date.now() - new Date(ms.due_date).getTime()) / 86400000);
    const urgency = ms.is_critical ? '⚠ CRITICAL — ' : '';
    await notifyProjectStakeholders(ms.project_id, ['director', 'pm', 'admin'], {
      tenantId: ms.tenant_id,
      title: `${urgency}Milestone overdue — ${ms.project_name}`,
      message: `Milestone "${ms.title}" in project "${ms.project_name}" is ${daysOverdue} day(s) past its due date.`,
      type: ms.is_critical ? 'danger' : 'warning',
      link: `/projects/${ms.project_id}`,
    });
    await query('UPDATE project_milestones SET overdue_alerted_at=NOW() WHERE id=$1', [ms.id]);
  }

  await logRun('milestone_overdue', { tenantId, affectedCount: overdue.rowCount, durationMs: Date.now() - t0 });
  return { overdue: overdue.rowCount };
}

// ── Change order needs-approval notification ──────────────────────────────────

// Call this after creating a large CO that requires manual approval.
async function notifyChangeOrderPending(projectId, co, tenantId) {
  await notifyProjectStakeholders(projectId, ['director', 'admin'], {
    tenantId,
    title: `Change Order approval needed — ${co.co_number}`,
    message: `CO "${co.title}" (${co.co_number}) requires approval — value: RM ${Number(co.cost_change || 0).toLocaleString('en-MY', { minimumFractionDigits: 2 })}. Review it in the project change orders board.`,
    type: 'warning',
    link: `/projects/${projectId}`,
  });
}

// ── Claim event notifications ─────────────────────────────────────────────────

const fmtRM = (v) => `RM ${Number(v || 0).toLocaleString('en-MY', { minimumFractionDigits: 2 })}`;

async function notifyClaimStatus(claim, tenantId) {
  const { status, claim_number, amount, project_id } = claim;
  const base = { tenantId, link: '/finance' };

  if (status === 'submitted') {
    await notifyProjectStakeholders(project_id, ['director', 'admin', 'finance'], {
      ...base,
      title: `Claim submitted — ${claim_number}`,
      message: `Claim ${claim_number} (${fmtRM(amount)}) has been submitted and is awaiting review.`,
      type: 'info',
    });
  } else if (status === 'under_review') {
    await notifyRoles(['finance'], {
      ...base,
      title: `Claim under review — ${claim_number}`,
      message: `Claim ${claim_number} is now under review. Finance team please check and advise.`,
      type: 'info',
    });
  } else if (status === 'certified') {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    await notifyProjectStakeholders(project_id, ['director', 'finance'], {
      ...base,
      title: 'Claim certified',
      message: `Claim ${claim_number} certified — payment cert raised for ${fmtRM(claim.net_amount)} (due in 30 days).`,
      type: 'success',
    });
  } else if (status === 'paid') {
    await notifyRoles(['director', 'finance'], {
      ...base,
      title: 'Claim paid',
      message: `Claim ${claim_number} marked paid (${fmtRM(amount)}).`,
      type: 'success',
    });
  } else if (status === 'rejected') {
    await notifyProjectStakeholders(project_id, ['director', 'finance', 'qs'], {
      ...base,
      title: `Claim rejected — ${claim_number}`,
      message: `Claim ${claim_number} (${fmtRM(amount)}) has been rejected. Please review and resubmit.`,
      type: 'danger',
    });
  }
}

// ── BQ event notifications ────────────────────────────────────────────────────

async function notifyBqStatus(bq, tenantId) {
  const { status, title, project_id, id } = bq;

  if (status === 'submitted') {
    await notifyRoles(['director', 'admin'], {
      tenantId,
      title: `BQ awaiting approval — ${title}`,
      message: `Bill of Quantities "${title}" has been submitted and is awaiting your approval.`,
      type: 'info',
      link: `/bq/${id}`,
    });
  } else if (status === 'approved') {
    const link = project_id ? `/projects/${project_id}` : '/bq';
    await notifyProjectStakeholders(project_id, ['qs', 'finance'], {
      tenantId,
      title: `BQ approved — ${title}`,
      message: `Bill of Quantities "${title}" has been approved.`,
      type: 'success',
      link,
    });
  } else if (status === 'rejected') {
    await notifyRoles(['qs', 'pm'], {
      tenantId,
      title: `BQ rejected — ${title}`,
      message: `Bill of Quantities "${title}" was rejected. Please revise and resubmit.`,
      type: 'danger',
      link: `/bq/${id}`,
    });
  }
}

// ── Full daily sweep (aging + escalations + milestone check) ──────────────────

// Run everything that should fire daily. Safe to call repeatedly — each sub-job
// has its own idempotency guard (date/interval checks in SQL).
async function runDailySweep() {
  const [aging, certEsc, invEsc, milestones] = await Promise.all([
    runAging().catch(e => { console.error('[sweep] aging failed:', e.message); return {}; }),
    runWeeklyEscalation().catch(e => { console.error('[sweep] cert escalation failed:', e.message); return {}; }),
    runWeeklyInvoiceEscalation().catch(e => { console.error('[sweep] invoice escalation failed:', e.message); return {}; }),
    runMilestoneOverdueCheck().catch(e => { console.error('[sweep] milestone check failed:', e.message); return {}; }),
  ]);

  const summary = { aging, certEsc, invEsc, milestones };
  const anyWork = [aging.certsOverdue, aging.invoicesOverdue, certEsc.escalated, invEsc.escalated, milestones.overdue].some(n => n > 0);
  if (anyWork) console.log('[sweep] daily sweep complete:', JSON.stringify(summary));
  return summary;
}

module.exports = {
  notifyUsers,
  notifyRoles,
  notifyProjectStakeholders,
  importBqScope,
  runAging,
  runWeeklyEscalation,
  runWeeklyInvoiceEscalation,
  runMilestoneOverdueCheck,
  runDailySweep,
  notifyClaimStatus,
  notifyBqStatus,
  notifyChangeOrderPending,
  logRun,
  getAutomationStatus,
};
