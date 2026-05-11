-- Improve slot locking to prevent double booking
-- Add unique constraint to prevent multiple appointments for same slot

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_slot_on_appointment_insert ON public.appointments;
DROP TRIGGER IF EXISTS update_slot_on_appointment_delete ON public.appointments;

-- First, ensure we can't have duplicate appointments for the same slot
-- Drop index if exists first
DROP INDEX IF EXISTS unique_appointment_slot;
CREATE UNIQUE INDEX unique_appointment_slot 
ON public.appointments(doctor_id, DATE(appointment_date), CAST(appointment_date AS TIME))
WHERE status IN ('pending', 'confirmed');

-- Improve the trigger to handle slot locking more reliably
CREATE OR REPLACE FUNCTION public.update_slot_on_appointment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  slot_date_val DATE;
  slot_time_val TIME;
  updated_count INTEGER;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Extract date and time from appointment
    slot_date_val := DATE(NEW.appointment_date);
    slot_time_val := CAST(NEW.appointment_date AS TIME);
    
    -- Mark the slot as unavailable atomically
    UPDATE public.time_slots
    SET is_available = false,
        appointment_id = NEW.id,
        updated_at = now()
    WHERE doctor_id = NEW.doctor_id
      AND slot_date = slot_date_val
      AND slot_time = slot_time_val
      AND is_available = true
      AND appointment_id IS NULL;
    
    -- Check if update was successful
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    -- If no slot was updated, it means slot was already taken
    IF updated_count = 0 THEN
      RAISE EXCEPTION 'Time slot is already booked by another patient';
    END IF;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- Mark the slot as available when appointment is cancelled/deleted
    UPDATE public.time_slots
    SET is_available = true,
        appointment_id = NULL,
        updated_at = now()
    WHERE appointment_id = OLD.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add a function to check slot availability before booking
CREATE OR REPLACE FUNCTION public.check_slot_availability(
  p_doctor_id UUID,
  p_slot_date DATE,
  p_slot_time TIME
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  slot_exists BOOLEAN;
  is_available BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.time_slots
    WHERE doctor_id = p_doctor_id
      AND slot_date = p_slot_date
      AND slot_time = p_slot_time
      AND is_available = true
      AND appointment_id IS NULL
  ) INTO slot_exists;
  
  RETURN slot_exists;
END;
$$;

-- Recreate triggers with improved function
CREATE TRIGGER update_slot_on_appointment_insert
  AFTER INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_slot_on_appointment();

CREATE TRIGGER update_slot_on_appointment_delete
  AFTER DELETE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_slot_on_appointment();

