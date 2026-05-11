-- Create time_slots table to manage available appointment slots
-- Each slot is 10 minutes within a 2-hour window for a specific doctor and date

CREATE TABLE IF NOT EXISTS public.time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  slot_date DATE NOT NULL,
  slot_time TIME NOT NULL,
  duration_minutes INTEGER DEFAULT 10,
  is_available BOOLEAN DEFAULT true,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_doctor_slot UNIQUE(doctor_id, slot_date, slot_time)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_time_slots_doctor_date ON public.time_slots(doctor_id, slot_date);
CREATE INDEX IF NOT EXISTS idx_time_slots_available ON public.time_slots(doctor_id, slot_date, is_available);
CREATE INDEX IF NOT EXISTS idx_time_slots_appointment ON public.time_slots(appointment_id);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.handle_time_slots_updated_at()
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

DROP TRIGGER IF EXISTS set_time_slots_updated_at ON public.time_slots;
CREATE TRIGGER set_time_slots_updated_at
  BEFORE UPDATE ON public.time_slots
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_time_slots_updated_at();

-- Function to automatically create time slots for a doctor on a given date
-- Creates slots from 9 AM to 5 PM (2-hour windows with 10-minute intervals)
CREATE OR REPLACE FUNCTION public.generate_time_slots(
  p_doctor_id UUID,
  p_slot_date DATE
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  start_time TIME := '09:00:00';
  end_time TIME := '17:00:00';
  slot_time_var TIME;
BEGIN
  -- Generate 10-minute slots from 9 AM to 5 PM
  slot_time_var := start_time;
  
  WHILE slot_time_var < end_time LOOP
    -- Insert slot if it doesn't exist
    INSERT INTO public.time_slots (doctor_id, slot_date, slot_time, is_available)
    VALUES (p_doctor_id, p_slot_date, slot_time_var, true)
    ON CONFLICT ON CONSTRAINT unique_doctor_slot DO NOTHING;
    
    -- Move to next 10-minute slot
    slot_time_var := slot_time_var + INTERVAL '10 minutes';
  END LOOP;
END;
$$;

-- Trigger to mark slot as unavailable when appointment is created
CREATE OR REPLACE FUNCTION public.update_slot_on_appointment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Mark the slot as unavailable
    UPDATE public.time_slots
    SET is_available = false,
        appointment_id = NEW.id
    WHERE doctor_id = NEW.doctor_id
      AND slot_date = DATE(NEW.appointment_date)
      AND slot_time = CAST(NEW.appointment_date AS TIME)
      AND is_available = true;
  ELSIF TG_OP = 'DELETE' THEN
    -- Mark the slot as available when appointment is cancelled/deleted
    UPDATE public.time_slots
    SET is_available = true,
        appointment_id = NULL
    WHERE appointment_id = OLD.id;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_slot_on_appointment_insert ON public.appointments;
CREATE TRIGGER update_slot_on_appointment_insert
  AFTER INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_slot_on_appointment();

DROP TRIGGER IF EXISTS update_slot_on_appointment_delete ON public.appointments;
CREATE TRIGGER update_slot_on_appointment_delete
  AFTER DELETE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_slot_on_appointment();

-- Development mode: disable RLS
ALTER TABLE public.time_slots DISABLE ROW LEVEL SECURITY;

