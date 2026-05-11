-- Migration to enhance Doctor Portal functionality
-- 1. Add doctor_remarks to appointments
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS doctor_remarks TEXT;

-- 2. Add is_online to doctors
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT true;

-- 3. Add audit_logs entry for session completion (captured in app logic, but ensures table exists)
-- (We already checked audit_logs exists in previous steps)
