-- ============================================================
-- MIGRATION 010 — Finance module gap-fill
--   1. Invoice claim type
--   2. Notes on claims + payment_certificates
--   3. last_reminder_sent for weekly escalation
--   4. Allow editing certified_amount on certs
-- ============================================================

-- 1. Invoice claim type: drop & recreate the CHECK constraint
ALTER TABLE claims DROP CONSTRAINT IF EXISTS claims_claim_type_check;
ALTER TABLE claims
  ADD CONSTRAINT claims_claim_type_check
  CHECK (claim_type IN ('progress','full','invoice'));

-- 2. Notes fields
ALTER TABLE claims ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE payment_certificates ADD COLUMN IF NOT EXISTS notes TEXT;

-- 3. Weekly-escalation tracker (already referenced in automationService.runWeeklyEscalation)
ALTER TABLE payment_certificates ADD COLUMN IF NOT EXISTS last_reminder_sent TIMESTAMPTZ;
