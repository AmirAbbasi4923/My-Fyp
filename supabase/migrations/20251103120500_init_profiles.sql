-- Clean init: single profiles table with role enum (patient/doctor/admin)

-- Safety: drop any previous objects from earlier attempts
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role);
DROP FUNCTION IF EXISTS public.get_user_role(uuid);
DROP TYPE IF EXISTS public.app_role;

-- Enum for roles
CREATE TYPE public.app_role AS ENUM ('patient', 'doctor', 'admin');

-- Profiles table: 1:1 with auth.users
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Helpful index for lookups by email
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Development mode: disable RLS to avoid client 406 errors during setup
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Note: Enable RLS and add policies before production
-- ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- Example policies (enable above first):
-- CREATE POLICY "Users can view their own profile"
--   ON public.profiles FOR SELECT
--   TO authenticated
--   USING (auth.uid() = id);
-- CREATE POLICY "Users can insert their own profile"
--   ON public.profiles FOR INSERT
--   TO authenticated
--   WITH CHECK (auth.uid() = id);
-- CREATE POLICY "Users can update their own profile"
--   ON public.profiles FOR UPDATE
--   TO authenticated
--   USING (auth.uid() = id);


