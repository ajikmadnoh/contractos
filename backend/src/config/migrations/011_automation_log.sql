-- ============================================================
-- MIGRATION 011 — Automation infrastructure
--   1. Persistent automation log for audit + status dashboard
--   2. Milestone overdue alert tracker
-- ============================================================

CREATE TABLE IF NOT EXISTS automation_logs (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id      UUID REFERENCES tenants(id) ON DELETE CASCADE,
  event          VARCHAR(100) NOT NULL,
  affected_count INTEGER NOT NULL DEFAULT 0,
  duration_ms    INTEGER,
  detail         JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_automation_logs_tenant  ON automation_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_logs_event   ON automation_logs(event, created_at DESC);

-- Track when a milestone was last alerted as overdue (mirrors last_reminder_sent on payment_certs)
ALTER TABLE project_milestones ADD COLUMN IF NOT EXISTS overdue_alerted_at TIMESTAMPTZ;

-- Weekly invoice escalation tracker (mirrors payment_certificates.last_reminder_sent)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS last_reminder_sent TIMESTAMPTZ;
