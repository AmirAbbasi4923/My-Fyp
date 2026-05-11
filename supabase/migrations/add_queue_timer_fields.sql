-- ============================================================
-- Migration: Add Live Queue Timer Support
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 1. Add consultation_started_at timestamp column
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS consultation_started_at TIMESTAMPTZ NULL;

-- 2. Allow 'in_consultation' as a valid status value
--    (If the status column is a CHECK constraint, update it)
--    If you have an enum type, add the value there instead.
--    For a plain text/varchar column with a CHECK constraint, run:
ALTER TABLE appointments
  DROP CONSTRAINT IF EXISTS appointments_status_check;

ALTER TABLE appointments
  ADD CONSTRAINT appointments_status_check
  CHECK (status IN ('pending', 'pending_approval', 'confirmed', 'in_consultation', 'completed', 'cancelled'));

-- ============================================================
-- Verification queries (run after migration)
-- ============================================================
-- SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'appointments' AND column_name = 'consultation_started_at';
