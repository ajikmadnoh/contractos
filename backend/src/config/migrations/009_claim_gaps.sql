-- ============================================================
-- MIGRATION 009 — Claims module gap-fill
--   1. SST/GST on claims
--   2. Partial payment on payment_certificates
-- ============================================================

-- 1. SST/GST fields on claims
ALTER TABLE claims ADD COLUMN IF NOT EXISTS tax_rate   NUMERIC(5,2)  DEFAULT 0;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(16,2) DEFAULT 0;

-- 2. Partial payment tracking on payment certs
ALTER TABLE payment_certificates ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(15,2) DEFAULT 0;

-- Extend the status CHECK to include partially_paid.
-- PostgreSQL requires dropping and re-adding the constraint.
ALTER TABLE payment_certificates DROP CONSTRAINT IF EXISTS payment_certificates_status_check;
ALTER TABLE payment_certificates
  ADD CONSTRAINT payment_certificates_status_check
  CHECK (status IN ('pending','certified','paid','overdue','partially_paid'));
