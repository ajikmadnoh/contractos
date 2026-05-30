-- ============================================================
-- MIGRATION 005 — Tender / BQ pipeline
-- Status workflow + audit trail, item-level editing support,
-- rate-library columns, soft delete, and source metadata.
-- Idempotent: safe to re-run.
-- ============================================================

-- ── BQ documents: workflow timestamps, soft delete, source meta ─────────────
ALTER TABLE bq_documents
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by  UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS source_file  VARCHAR(255),
  ADD COLUMN IF NOT EXISTS deleted_at   TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_bq_documents_status ON bq_documents(tenant_id, status) WHERE deleted_at IS NULL;

-- ── BQ audit trail: who changed what, when ──────────────────────────────────
CREATE TABLE IF NOT EXISTS bq_audit (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bq_id       UUID NOT NULL REFERENCES bq_documents(id) ON DELETE CASCADE,
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id),
  action      VARCHAR(40) NOT NULL,
  from_status VARCHAR(20),
  to_status   VARCHAR(20),
  detail      JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bq_audit_bq     ON bq_audit(bq_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bq_audit_tenant ON bq_audit(tenant_id);

-- ── Market rates: columns the rates routes + rate library expect ────────────
-- (Migration 004's market_rates patch never applied on this DB; reconcile here.)
ALTER TABLE market_rates
  ADD COLUMN IF NOT EXISTS our_rate   NUMERIC(15,4),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS notes      TEXT,
  ADD COLUMN IF NOT EXISTS item_code  VARCHAR(50);

UPDATE market_rates SET our_rate = rate WHERE our_rate IS NULL;

-- De-dupe guard for rate-library imports: one rate per (tenant, code, item, unit).
CREATE UNIQUE INDEX IF NOT EXISTS uniq_market_rate_key
  ON market_rates(tenant_id, COALESCE(item_code, ''), item_name, COALESCE(unit, ''));
