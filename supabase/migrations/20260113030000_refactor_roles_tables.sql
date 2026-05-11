-- 1. Create Patients Table
CREATE TABLE IF NOT EXISTS public.patients (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT NOT NULL UNIQUE,
  phone_number TEXT,
  patient_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Migrate existing patients from profiles to patients table
INSERT INTO public.patients (id, full_name, email, created_at, updated_at)
SELECT id, full_name, email, created_at, updated_at
FROM public.profiles
WHERE role = 'patient'
ON CONFLICT (id) DO NOTHING;

-- 3. Sync Doctors (Ensure all doctors in profiles are in doctors table if missing)
-- (Doctors table already exists, but we make sure data is consistent)
INSERT INTO public.doctors (id, name, email, speciality, phone_number, created_at, updated_at)
SELECT id, full_name, email, 'General Physician', '', created_at, updated_at
FROM public.profiles
WHERE role = 'doctor'
AND NOT EXISTS (SELECT 1 FROM public.doctors WHERE doctors.id = public.profiles.id)
ON CONFLICT (id) DO NOTHING;

-- 4. Update Appointments FK to point to patients table
ALTER TABLE public.appointments 
  DROP CONSTRAINT IF EXISTS appointments_patient_id_fkey;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_patient_id_fkey 
  FOREIGN KEY (patient_id) 
  REFERENCES public.patients(id) 
  ON DELETE CASCADE;

-- 5. Rename Profiles to Admins (and clean up non-admins)
-- First delete non-admins
DELETE FROM public.profiles WHERE role != 'admin';

-- Rename table (and enum types if strictly necessary, but we can verify later)
ALTER TABLE public.profiles RENAME TO admins;

-- Update RLS and Triggers for new tables if needed
ALTER TABLE public.patients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins DISABLE ROW LEVEL SECURITY;

-- Add updated_at trigger for patients
CREATE TRIGGER set_patients_updated_at
  BEFORE UPDATE ON public.patients
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at(); 
  -- Assuming handle_updated_at exists from previous migrations (it was generic)
