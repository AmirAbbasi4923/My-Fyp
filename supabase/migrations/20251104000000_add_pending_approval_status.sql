-- Add pending_approval status to appointments table
-- This allows doctors to confirm appointments, which then require admin approval

-- First, drop the existing CHECK constraint
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_status_check;

-- Add the new CHECK constraint with pending_approval status
ALTER TABLE public.appointments 
  ADD CONSTRAINT appointments_status_check 
  CHECK (status IN ('pending', 'pending_approval', 'confirmed', 'completed', 'cancelled'));

-- Update the assign_queue_position function to include pending_approval
CREATE OR REPLACE FUNCTION public.assign_queue_position()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  max_position INTEGER;
BEGIN
  -- Assign queue position based on FCFS for pending, pending_approval, and confirmed appointments
  IF NEW.status IN ('pending', 'pending_approval', 'confirmed') THEN
    -- Get the maximum queue position for this doctor's pending, pending_approval, and confirmed appointments
    -- This ensures FCFS ordering
    SELECT COALESCE(MAX(queue_position), 0) INTO max_position
    FROM public.appointments
    WHERE doctor_id = NEW.doctor_id 
      AND status IN ('pending', 'pending_approval', 'confirmed')
      AND created_at < NEW.created_at;
    
    -- If no earlier appointments, check total count
    IF max_position = 0 THEN
      SELECT COALESCE(MAX(queue_position), 0) INTO max_position
      FROM public.appointments
      WHERE doctor_id = NEW.doctor_id 
        AND status IN ('pending', 'pending_approval', 'confirmed');
    END IF;
    
    -- Assign next position (FCFS)
    NEW.queue_position := max_position + 1;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update the recalculate_queue_positions function to include pending_approval
CREATE OR REPLACE FUNCTION public.recalculate_queue_positions(p_doctor_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  appointment_record RECORD;
  position_counter INTEGER := 1;
BEGIN
  -- Update queue positions for pending, pending_approval, and confirmed appointments
  FOR appointment_record IN
    SELECT id
    FROM public.appointments
    WHERE doctor_id = p_doctor_id
      AND status IN ('pending', 'pending_approval', 'confirmed')
    ORDER BY created_at ASC
  LOOP
    UPDATE public.appointments
    SET queue_position = position_counter
    WHERE id = appointment_record.id;
    
    position_counter := position_counter + 1;
  END LOOP;
END;
$$;

-- Update the trigger function to handle pending_approval status changes
CREATE OR REPLACE FUNCTION public.update_queue_on_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Recalculate queue positions when status changes to/from pending/pending_approval/confirmed
  IF (OLD.status IN ('pending', 'pending_approval', 'confirmed') AND NEW.status NOT IN ('pending', 'pending_approval', 'confirmed'))
     OR (OLD.status NOT IN ('pending', 'pending_approval', 'confirmed') AND NEW.status IN ('pending', 'pending_approval', 'confirmed'))
     OR (OLD.status != NEW.status AND NEW.status IN ('pending', 'pending_approval', 'confirmed')) THEN
    PERFORM public.recalculate_queue_positions(NEW.doctor_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update the insert trigger to include pending_approval
CREATE OR REPLACE FUNCTION public.recalculate_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Recalculate all queue positions for this doctor after insert
  IF NEW.status IN ('pending', 'pending_approval', 'confirmed') THEN
    PERFORM public.recalculate_queue_positions(NEW.doctor_id);
  END IF;
  RETURN NEW;
END;
$$;

-- Update the trigger condition
DROP TRIGGER IF EXISTS recalculate_queue_on_insert ON public.appointments;
CREATE TRIGGER recalculate_queue_on_insert
  AFTER INSERT ON public.appointments
  FOR EACH ROW
  WHEN (NEW.status IN ('pending', 'pending_approval', 'confirmed'))
  EXECUTE FUNCTION public.recalculate_on_insert();

-- Update the unique_appointment_slot index to include pending_approval
-- Create immutable functions for date and time extraction
CREATE OR REPLACE FUNCTION public.get_appointment_date(ts TIMESTAMPTZ)
RETURNS DATE
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT DATE(ts);
$$;

CREATE OR REPLACE FUNCTION public.get_appointment_time(ts TIMESTAMPTZ)
RETURNS TIME
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CAST(ts AS TIME);
$$;

-- Drop and recreate the index using the immutable functions
DROP INDEX IF EXISTS public.unique_appointment_slot;
CREATE UNIQUE INDEX unique_appointment_slot 
ON public.appointments(
  doctor_id, 
  public.get_appointment_date(appointment_date),
  public.get_appointment_time(appointment_date)
)
WHERE status IN ('pending', 'pending_approval', 'confirmed');

