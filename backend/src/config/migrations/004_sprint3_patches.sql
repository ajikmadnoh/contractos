-- ============================================================
-- MIGRATION 004 — Sprint 3 patches
-- Extends existing tables and adds new ones to match
-- the Sprint 3 module screens (Safety, CRM, Fleet, Inventory,
-- Documents, Market Rates).
-- ============================================================

-- ============================================================
-- DOCUMENTS — extend existing table
-- ============================================================
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS title       VARCHAR(255),
  ADD COLUMN IF NOT EXISTS filename    VARCHAR(255),
  ADD COLUMN IF NOT EXISTS file_size   BIGINT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS status      VARCHAR(30) NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS parent_id   UUID REFERENCES documents(id);

-- Backfill title from existing name column
UPDATE documents SET title = name WHERE title IS NULL;
UPDATE documents SET filename = name WHERE filename IS NULL;

-- ============================================================
-- SAFETY INCIDENTS — extend existing table
-- ============================================================
ALTER TABLE safety_incidents
  ADD COLUMN IF NOT EXISTS title            VARCHAR(255),
  ADD COLUMN IF NOT EXISTS lost_time        BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS corrective_action TEXT;

-- Map existing corrective_actions -> corrective_action
UPDATE safety_incidents SET corrective_action = corrective_actions WHERE corrective_action IS NULL;

-- ============================================================
-- SAFETY CERTIFICATIONS — extend existing table
-- ============================================================
ALTER TABLE safety_certifications
  ADD COLUMN IF NOT EXISTS cert_type   VARCHAR(255),
  ADD COLUMN IF NOT EXISTS holder_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS issue_date  DATE,
  ADD COLUMN IF NOT EXISTS profile_id  UUID REFERENCES profiles(id);

-- Backfill cert_type from cert_name
UPDATE safety_certifications SET cert_type = cert_name WHERE cert_type IS NULL;

-- ============================================================
-- TOOLBOX TALKS — new table
-- ============================================================
CREATE TABLE IF NOT EXISTS toolbox_talks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id      UUID REFERENCES projects(id),
  topic           VARCHAR(255) NOT NULL,
  summary         TEXT,
  talk_date       DATE NOT NULL,
  attendees_count INTEGER NOT NULL DEFAULT 0,
  conducted_by    UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_toolbox_tenant ON toolbox_talks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_toolbox_date   ON toolbox_talks(talk_date);

-- ============================================================
-- CRM LEADS — extend existing table
-- ============================================================
ALTER TABLE crm_leads
  ADD COLUMN IF NOT EXISTS title           VARCHAR(255),
  ADD COLUMN IF NOT EXISTS client_name     VARCHAR(255),
  ADD COLUMN IF NOT EXISTS stage           VARCHAR(30) NOT NULL DEFAULT 'prospecting',
  ADD COLUMN IF NOT EXISTS tender_deadline DATE,
  ADD COLUMN IF NOT EXISTS created_by      UUID REFERENCES users(id);

-- Backfill title/client_name from existing columns
UPDATE crm_leads SET title = company_name WHERE title IS NULL;
UPDATE crm_leads SET client_name = company_name WHERE client_name IS NULL;
-- Map existing status to stage (status -> stage migration)
UPDATE crm_leads SET stage = CASE status
  WHEN 'new'              THEN 'prospecting'
  WHEN 'contacted'        THEN 'qualified'
  WHEN 'qualified'        THEN 'qualified'
  WHEN 'tender_submitted' THEN 'tender_submitted'
  WHEN 'won'              THEN 'won'
  WHEN 'lost'             THEN 'lost'
  ELSE 'prospecting'
END WHERE stage = 'prospecting';

-- ============================================================
-- FLEET VEHICLES — extend existing table
-- ============================================================
ALTER TABLE fleet_vehicles
  ADD COLUMN IF NOT EXISTS name             VARCHAR(255),
  ADD COLUMN IF NOT EXISTS road_tax_expiry  DATE,
  ADD COLUMN IF NOT EXISTS insurance_expiry DATE;

-- Backfill name from plate_number or make/model
UPDATE fleet_vehicles
  SET name = COALESCE(make || ' ' || model, plate_number, 'Vehicle')
  WHERE name IS NULL;

-- ============================================================
-- FLEET MAINTENANCE — extend existing table
-- ============================================================
ALTER TABLE fleet_maintenance
  ADD COLUMN IF NOT EXISTS recorded_by UUID REFERENCES users(id);

-- ============================================================
-- INVENTORY ITEMS — add is_active flag
-- ============================================================
ALTER TABLE inventory_items
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- ============================================================
-- INVENTORY TRANSACTIONS — add created_by
-- ============================================================
ALTER TABLE inventory_transactions
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);

-- ============================================================
-- MARKET RATES — add our_rate column
-- ============================================================
ALTER TABLE market_rates
  ADD COLUMN IF NOT EXISTS our_rate NUMERIC(15,4);

-- Backfill our_rate from min_rate
UPDATE market_rates SET our_rate = min_rate WHERE our_rate IS NULL;
