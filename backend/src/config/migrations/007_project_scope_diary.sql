-- ============================================================
-- MIGRATION 007 — PMO scope tracking + site diaries
-- Bridges BQ (commercial scope) into project execution:
--   project_scope     — BQ items materialised into a project, with
--                       contract_qty / qty_done / pct_complete tracking
--   site_diaries      — daily site record per project
--   site_diary_entries — progress booked against a scope category
--   site_diary_photos  — work-proof photos per entry
-- Idempotent: safe to re-run.
-- ============================================================

CREATE TABLE IF NOT EXISTS project_scope (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  bq_id         UUID REFERENCES bq_documents(id) ON DELETE SET NULL,
  bq_item_id    UUID,                       -- source bq_items.id (soft link; no FK so item edits don't cascade)
  item_code     VARCHAR(50),
  section       VARCHAR(255),
  description   TEXT NOT NULL,
  unit          VARCHAR(50),
  contract_qty  NUMERIC(14,3),
  unit_rate     NUMERIC(14,2),
  amount        NUMERIC(16,2) DEFAULT 0,
  qty_done      NUMERIC(14,3) NOT NULL DEFAULT 0,
  pct_complete  NUMERIC(6,2)  NOT NULL DEFAULT 0,
  sort_order    INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_project_scope_project ON project_scope(project_id);
CREATE INDEX IF NOT EXISTS idx_project_scope_section ON project_scope(project_id, section);
-- Prevent importing the same BQ line twice into one project.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_project_scope_src
  ON project_scope(project_id, bq_item_id) WHERE bq_item_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS site_diaries (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  diary_date  DATE NOT NULL,
  weather     VARCHAR(50),
  manpower    INTEGER,
  equipment   TEXT,
  notes       TEXT,
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_site_diaries_project ON site_diaries(project_id, diary_date DESC);

CREATE TABLE IF NOT EXISTS site_diary_entries (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  diary_id         UUID NOT NULL REFERENCES site_diaries(id) ON DELETE CASCADE,
  project_scope_id UUID REFERENCES project_scope(id) ON DELETE SET NULL,
  qty_done         NUMERIC(14,3) NOT NULL DEFAULT 0,
  remarks          TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_diary_entries_diary ON site_diary_entries(diary_id);
CREATE INDEX IF NOT EXISTS idx_diary_entries_scope ON site_diary_entries(project_scope_id);

CREATE TABLE IF NOT EXISTS site_diary_photos (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_id    UUID REFERENCES site_diary_entries(id) ON DELETE CASCADE,
  diary_id    UUID NOT NULL REFERENCES site_diaries(id) ON DELETE CASCADE,
  filename    VARCHAR(255) NOT NULL,
  caption     VARCHAR(255),
  uploaded_by UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_diary_photos_diary ON site_diary_photos(diary_id);
