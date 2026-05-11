-- ============================================================
-- Migration: Single Active Session Enforcement
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Add active_session_token to patients
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS active_session_token TEXT NULL;

-- Add active_session_token to doctors
ALTER TABLE doctors
  ADD COLUMN IF NOT EXISTS active_session_token TEXT NULL;

-- Add active_session_token to admins
ALTER TABLE admins
  ADD COLUMN IF NOT EXISTS active_session_token TEXT NULL;

-- ============================================================
-- Verification
-- ============================================================
-- SELECT column_name, table_name FROM information_schema.columns
--   WHERE column_name = 'active_session_token'
--   AND table_name IN ('patients', 'doctors', 'admins');
