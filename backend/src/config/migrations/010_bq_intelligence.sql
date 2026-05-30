-- ============================================================
-- MIGRATION 010 — BQ pricing-intelligence provenance
-- Records HOW a line item's rate was set so the UI can badge
-- AI-priced rows and the audit story stays honest.
--   'manual'      — typed by a person
--   'extracted'   — read off an uploaded tender (OCR/parse)
--   'ai_history'  — auto-filled from this firm's past BQs
--   'ai_market'   — auto-filled from the market-rate library
-- Idempotent: safe to re-run.
-- ============================================================

ALTER TABLE bq_items ADD COLUMN IF NOT EXISTS rate_source     VARCHAR(20);
ALTER TABLE bq_items ADD COLUMN IF NOT EXISTS rate_confidence NUMERIC(4,3);
