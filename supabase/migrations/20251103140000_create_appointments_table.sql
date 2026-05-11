-- Create appointments table to store patient appointments with doctors
-- This table links patients to doctors and tracks appointment status

CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  appointment_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  notes TEXT,
  queue_position INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON public.appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_queue ON public.appointments(doctor_id, status, queue_position);

-- Update timestamp trigger for appointments table
CREATE OR REPLACE FUNCTION public.handle_appointments_updated_at()
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

CREATE TRIGGER set_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_appointments_updated_at();

-- Function to automatically assign queue position based on FCFS (First Come First Serve)
CREATE OR REPLACE FUNCTION public.assign_queue_position()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  max_position INTEGER;
BEGIN
  -- Assign queue position based on FCFS for pending and confirmed appointments
  IF NEW.status IN ('pending', 'confirmed') THEN
    -- Get the maximum queue position for this doctor's pending and confirmed appointments
    -- This ensures FCFS ordering
    SELECT COALESCE(MAX(queue_position), 0) INTO max_position
    FROM public.appointments
    WHERE doctor_id = NEW.doctor_id 
      AND status IN ('pending', 'confirmed')
      AND created_at < NEW.created_at;
    
    -- If no earlier appointments, check total count
    IF max_position = 0 THEN
      SELECT COALESCE(MAX(queue_position), 0) INTO max_position
      FROM public.appointments
      WHERE doctor_id = NEW.doctor_id 
        AND status IN ('pending', 'confirmed');
    END IF;
    
    -- Assign next position (FCFS)
    NEW.queue_position := max_position + 1;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER assign_appointment_queue_position
  BEFORE INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_queue_position();

-- Development mode: disable RLS to avoid client 406 errors during setup
ALTER TABLE public.appointments DISABLE ROW LEVEL SECURITY;

-- Note: Enable RLS and add policies before production
-- ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
-- Example policies (enable above first):
-- CREATE POLICY "Patients can view their own appointments"
--   ON public.appointments FOR SELECT
--   TO authenticated
--   USING (patient_id = auth.uid());
-- CREATE POLICY "Doctors can view their appointments"
--   ON public.appointments FOR SELECT
--   TO authenticated
--   USING (doctor_id = auth.uid());
-- CREATE POLICY "Patients can create appointments"
--   ON public.appointments FOR INSERT
--   TO authenticated
--   WITH CHECK (patient_id = auth.uid());

