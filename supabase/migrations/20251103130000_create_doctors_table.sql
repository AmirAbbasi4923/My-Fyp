-- Create doctors table to store doctor-specific information
-- This table extends the profiles table with doctor-specific fields

CREATE TABLE IF NOT EXISTS public.doctors (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  speciality TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_doctors_speciality ON public.doctors(speciality);
CREATE INDEX IF NOT EXISTS idx_doctors_email ON public.doctors(email);

-- Update timestamp trigger for doctors table
CREATE OR REPLACE FUNCTION public.handle_doctors_updated_at()
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

CREATE TRIGGER set_doctors_updated_at
  BEFORE UPDATE ON public.doctors
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_doctors_updated_at();

-- Development mode: disable RLS to avoid client 406 errors during setup
ALTER TABLE public.doctors DISABLE ROW LEVEL SECURITY;

-- Note: Enable RLS and add policies before production
-- ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
-- Example policies (enable above first):
-- CREATE POLICY "Doctors can view their own profile"
--   ON public.doctors FOR SELECT
--   TO authenticated
--   USING (auth.uid() = id);
-- CREATE POLICY "Doctors can update their own profile"
--   ON public.doctors FOR UPDATE
--   TO authenticated
--   USING (auth.uid() = id);
-- CREATE POLICY "Patients can view all doctors"
--   ON public.doctors FOR SELECT
--   TO authenticated
--   USING (true);
-- CREATE POLICY "Admins can view all doctors"
--   ON public.doctors FOR SELECT
--   TO authenticated
--   USING (
--     EXISTS (
--       SELECT 1 FROM public.profiles
--       WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
--     )
--   );

