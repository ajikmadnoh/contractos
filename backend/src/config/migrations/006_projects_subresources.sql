-- Migration 006: Projects sub-resources
-- Adds: project columns, RFIs, Submittals, Change Orders, Risks tables

-- ── Add missing columns to projects ────────────────────────────────────────
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS project_type     VARCHAR(50),
  ADD COLUMN IF NOT EXISTS current_phase    VARCHAR(50) DEFAULT 'pre_construction',
  ADD COLUMN IF NOT EXISTS progress_pct     NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS crew_count       INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS closing          BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Add 'closing' and 'delayed' to projects status check
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;
ALTER TABLE projects ADD CONSTRAINT projects_status_check
  CHECK (status IN ('active','on_hold','completed','cancelled','pending_customer',
                    'pending_vendor','pending_payment','delayed','closing','live'));

-- ── Add missing columns to project_tasks ───────────────────────────────────
ALTER TABLE project_tasks
  ADD COLUMN IF NOT EXISTS assignee_id  UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS priority     VARCHAR(10) NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low','medium','high')),
  ADD COLUMN IF NOT EXISTS progress_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wbs          VARCHAR(20);

-- ── Add missing columns to project_milestones ──────────────────────────────
ALTER TABLE project_milestones
  ADD COLUMN IF NOT EXISTS status       VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','in_progress','done','overdue')),
  ADD COLUMN IF NOT EXISTS is_critical  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- ── RFIs ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_rfis (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id        UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  rfi_number        VARCHAR(30) NOT NULL,
  subject           VARCHAR(255) NOT NULL,
  description       TEXT,
  directed_to       VARCHAR(100),
  urgency           VARCHAR(20) NOT NULL DEFAULT 'normal'
    CHECK (urgency IN ('low','normal','high','urgent')),
  reference_drawings TEXT,
  due_date          DATE,
  status            VARCHAR(30) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','submitted','under_review','responded','closed')),
  response          TEXT,
  raised_by         UUID REFERENCES users(id),
  closed_at         TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_project_rfis_project ON project_rfis(project_id);

-- ── Submittals ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_submittals (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id       UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  submittal_number VARCHAR(30) NOT NULL,
  title            VARCHAR(255) NOT NULL,
  submittal_type   VARCHAR(50) NOT NULL DEFAULT 'shop_drawing'
    CHECK (submittal_type IN ('shop_drawing','material_sample','method_statement','technical_data')),
  description      TEXT,
  revision_number  VARCHAR(20) NOT NULL DEFAULT 'Rev 0',
  due_date         DATE,
  status           VARCHAR(30) NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted','under_review','approved','rejected','resubmit')),
  review_comments  TEXT,
  approved_at      TIMESTAMPTZ,
  submitted_by     UUID REFERENCES users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_project_submittals_project ON project_submittals(project_id);

-- ── Change Orders ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_change_orders (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id     UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  co_number      VARCHAR(30) NOT NULL,
  title          VARCHAR(255) NOT NULL,
  description    TEXT,
  reason         TEXT,
  scope_change   TEXT,
  cost_change    NUMERIC(15,2) NOT NULL DEFAULT 0,
  time_change    INTEGER NOT NULL DEFAULT 0,
  origin         VARCHAR(100),
  status         VARCHAR(30) NOT NULL DEFAULT 'pending_approval'
    CHECK (status IN ('draft','pending_approval','submitted','negotiating','approved','rejected','implemented')),
  raised_by      UUID REFERENCES users(id),
  approved_by    UUID REFERENCES users(id),
  approved_at    TIMESTAMPTZ,
  implemented_at TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_project_cos_project ON project_change_orders(project_id);

-- ── Risk Register ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_risks (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title       VARCHAR(255) NOT NULL,
  category    VARCHAR(50),
  likelihood  INTEGER NOT NULL DEFAULT 3 CHECK (likelihood BETWEEN 1 AND 5),
  impact      INTEGER NOT NULL DEFAULT 3 CHECK (impact BETWEEN 1 AND 5),
  owner       VARCHAR(100),
  mitigation  TEXT,
  trend       VARCHAR(10) NOT NULL DEFAULT 'flat' CHECK (trend IN ('up','flat','down')),
  status      VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','monitor','closed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_project_risks_project ON project_risks(project_id);
