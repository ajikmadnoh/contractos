-- ============================================================
-- MIGRATION 008 — Claim ↔ Scope ↔ Invoice pipeline
-- Bridges the commercial chain:
--   project_scope (work done) → claim + claim_items (progress claim)
--                             → payment_certificate (certified)
--                             → invoice (billed)
-- Idempotent: safe to re-run.
-- ============================================================

-- Per-line breakdown of a progress claim, sourced from project_scope.
CREATE TABLE IF NOT EXISTS claim_items (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_id         UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  project_scope_id UUID REFERENCES project_scope(id) ON DELETE SET NULL,
  item_code        VARCHAR(50),
  section          VARCHAR(255),
  description      TEXT NOT NULL,
  unit             VARCHAR(50),
  contract_qty     NUMERIC(14,3),
  unit_rate        NUMERIC(14,2),
  contract_amount  NUMERIC(16,2) DEFAULT 0,
  cumulative_qty   NUMERIC(14,3) DEFAULT 0,   -- qty done to date
  cumulative_pct   NUMERIC(6,2)  DEFAULT 0,
  cumulative_value NUMERIC(16,2) DEFAULT 0,   -- value done to date
  previous_value   NUMERIC(16,2) DEFAULT 0,   -- claimed in prior claims
  this_value       NUMERIC(16,2) DEFAULT 0,   -- amount on THIS claim
  sort_order       INTEGER DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_claim_items_claim ON claim_items(claim_id);
CREATE INDEX IF NOT EXISTS idx_claim_items_scope ON claim_items(project_scope_id);

-- Claim provenance + cumulative figures for progress-claim maths.
ALTER TABLE claims ADD COLUMN IF NOT EXISTS source        VARCHAR(20) DEFAULT 'manual'; -- 'manual' | 'scope'
ALTER TABLE claims ADD COLUMN IF NOT EXISTS work_done_value NUMERIC(16,2);  -- cumulative value to date
ALTER TABLE claims ADD COLUMN IF NOT EXISTS previous_value  NUMERIC(16,2);  -- claimed before this one

-- Invoice → claim chain links so finance can trace billing back to a cert.
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS claim_id UUID REFERENCES claims(id) ON DELETE SET NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_cert_id UUID REFERENCES payment_certificates(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_claim ON invoices(claim_id);

-- Track which cert a claim produced (reverse of payment_certificates.claim_id, for convenience).
ALTER TABLE payment_certificates ADD COLUMN IF NOT EXISTS invoiced BOOLEAN NOT NULL DEFAULT FALSE;
