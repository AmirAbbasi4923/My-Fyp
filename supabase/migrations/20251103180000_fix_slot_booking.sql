-- Fix slot booking issues after table recreation
-- This migration ensures all triggers and functions work correctly

-- Drop and recreate triggers to ensure they're properly set up
DROP TRIGGER IF EXISTS update_slot_on_appointment_insert ON public.appointments;
DROP TRIGGER IF EXISTS update_slot_on_appointment_delete ON public.appointments;

-- Ensure the update function handles missing slots gracefully
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
  slot_id_val UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Extract date and time from appointment
    slot_date_val := DATE(NEW.appointment_date);
    slot_time_val := CAST(NEW.appointment_date AS TIME);
    
    -- First, ensure the slot exists (create if it doesn't)
    INSERT INTO public.time_slots (doctor_id, slot_date, slot_time, is_available)
    VALUES (NEW.doctor_id, slot_date_val, slot_time_val, true)
    ON CONFLICT ON CONSTRAINT unique_doctor_slot DO NOTHING
    RETURNING id INTO slot_id_val;
    
    -- Get slot ID if it was created or already exists
    IF slot_id_val IS NULL THEN
      SELECT id INTO slot_id_val
      FROM public.time_slots
      WHERE doctor_id = NEW.doctor_id
        AND slot_date = slot_date_val
        AND slot_time = slot_time_val;
    END IF;
    
    -- Mark the slot as unavailable atomically
    UPDATE public.time_slots
    SET is_available = false,
        appointment_id = NEW.id,
        updated_at = now()
    WHERE id = slot_id_val
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

-- Recreate triggers
CREATE TRIGGER update_slot_on_appointment_insert
  AFTER INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_slot_on_appointment();

CREATE TRIGGER update_slot_on_appointment_delete
  AFTER DELETE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_slot_on_appointment();

-- Update check_slot_availability to create slot if it doesn't exist
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
BEGIN
  -- Ensure slot exists (create if it doesn't)
  INSERT INTO public.time_slots (doctor_id, slot_date, slot_time, is_available)
  VALUES (p_doctor_id, p_slot_date, p_slot_time, true)
  ON CONFLICT ON CONSTRAINT unique_doctor_slot DO NOTHING;
  
  -- Check if slot is available
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

