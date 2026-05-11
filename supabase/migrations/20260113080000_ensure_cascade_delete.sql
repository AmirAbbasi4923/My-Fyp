-- Ensure database integrity when deleting users

-- 1. Appointments should be deleted if the Doctor is deleted
ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_doctor_id_fkey;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_doctor_id_fkey
  FOREIGN KEY (doctor_id)
  REFERENCES public.doctors(id)
  ON DELETE CASCADE;

-- 2. Appointments should be deleted if the Patient is deleted (Re-confirming)
ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_patient_id_fkey;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_patient_id_fkey
  FOREIGN KEY (patient_id)
  REFERENCES public.patients(id)
  ON DELETE CASCADE;

-- Now if you DELETE a Doctor from the dashboard, 
-- Postgres will automatically delete all their appointments instantly.
