-- ============================================================
-- MIGRATION 012 — Finance: bonds/insurance + statutory ledger
-- Turns the redesigned Finance UI's bonds and statutory modules into
-- real, tenant-scoped data. Idempotent: safe to re-run.
-- ============================================================

-- Performance bonds, CAR insurance, DLP bonds held per project/contract.
CREATE TABLE IF NOT EXISTS bonds (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id    UUID REFERENCES projects(id) ON DELETE SET NULL,
  code          VARCHAR(40),                 -- short project/contract tag, e.g. PVDH-T3
  kind          VARCHAR(60) NOT NULL,        -- 'Performance Bond' | 'CAR Insurance' | 'DLP Bond'
  issuer        VARCHAR(120),                -- bank / insurer
  amount        NUMERIC(16,2) NOT NULL DEFAULT 0,
  cover         VARCHAR(60),                 -- e.g. '5% contract'
  expires_date  DATE,
  state         VARCHAR(20) NOT NULL DEFAULT 'ok'   -- 'ok' | 'expiring' | 'expired'
    CHECK (state IN ('ok','expiring','expired')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bonds_tenant  ON bonds(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bonds_expires ON bonds(expires_date);

-- Statutory filings ledger (SST, CIDB, EPF, SOCSO, EIS, PCB, HRDF, …).
CREATE TABLE IF NOT EXISTS statutory_filings (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code          VARCHAR(30) NOT NULL,        -- 'SST' | 'EPF' | 'SOCSO' | ...
  label         VARCHAR(120) NOT NULL,
  period        VARCHAR(40),                 -- 'Apr 2026' | 'Q1 2026'
  due_date      DATE,
  amount        NUMERIC(16,2) NOT NULL DEFAULT 0,
  status        VARCHAR(20) NOT NULL DEFAULT 'due'   -- 'due' | 'paid'
    CHECK (status IN ('due','paid')),
  reference     VARCHAR(80),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_statutory_tenant ON statutory_filings(tenant_id, due_date);
