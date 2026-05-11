-- Fix for Doctor Registration Failure
-- Run this in your Supabase SQL Editor

-- 1. Unlink doctors from the old 'profiles' (now admins) table
ALTER TABLE public.doctors
  DROP CONSTRAINT IF EXISTS doctors_id_fkey;

-- 2. Link doctors directly to auth.users (so new registrations work)
ALTER TABLE public.doctors
  ADD CONSTRAINT doctors_id_fkey 
  FOREIGN KEY (id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- 3. Ensure the experience_years column exists
ALTER TABLE public.doctors 
  ADD COLUMN IF NOT EXISTS experience_years TEXT;

-- 4. Temporarily disable RLS on doctors to rule out permission issues during signup
ALTER TABLE public.doctors DISABLE ROW LEVEL SECURITY;
