-- Update queue positions to ensure FCFS (First Come First Serve) ordering
-- This function recalculates queue positions based on created_at timestamp

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
  -- Update queue positions for pending and confirmed appointments
  -- Ordered by created_at (FCFS)
  FOR appointment_record IN
    SELECT id
    FROM public.appointments
    WHERE doctor_id = p_doctor_id
      AND status IN ('pending', 'confirmed')
    ORDER BY created_at ASC
  LOOP
    UPDATE public.appointments
    SET queue_position = position_counter
    WHERE id = appointment_record.id;
    
    position_counter := position_counter + 1;
  END LOOP;
END;
$$;

-- Trigger to recalculate queue positions when appointment status changes
CREATE OR REPLACE FUNCTION public.update_queue_on_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Recalculate queue positions when status changes to/from pending/confirmed
  IF (OLD.status IN ('pending', 'confirmed') AND NEW.status NOT IN ('pending', 'confirmed'))
     OR (OLD.status NOT IN ('pending', 'confirmed') AND NEW.status IN ('pending', 'confirmed'))
     OR (OLD.status != NEW.status AND NEW.status IN ('pending', 'confirmed')) THEN
    PERFORM public.recalculate_queue_positions(NEW.doctor_id);
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_queue_on_status_change_trigger
  AFTER UPDATE OF status ON public.appointments
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.update_queue_on_status_change();

-- Also recalculate when new appointment is inserted
CREATE OR REPLACE FUNCTION public.recalculate_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Recalculate all queue positions for this doctor after insert
  PERFORM public.recalculate_queue_positions(NEW.doctor_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER recalculate_queue_on_insert
  AFTER INSERT ON public.appointments
  FOR EACH ROW
  WHEN (NEW.status IN ('pending', 'confirmed'))
  EXECUTE FUNCTION public.recalculate_on_insert();

