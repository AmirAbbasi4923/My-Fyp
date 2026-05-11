-- 1. Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES auth.users(id),
    action_type TEXT NOT NULL, -- 'DELETE_USER', 'CANCEL_APPOINTMENT', 'APPROVE_APPOINTMENT'
    target_id UUID, -- ID of the user or appointment impacted
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable Access for Admins
ALTER TABLE public.audit_logs DISABLE ROW LEVEL SECURITY;
-- (Or strictly: ENABLE RLS and allow INSERT/SELECT for role='admin')

-- 3. Trigger for Appointment Cancellation (Optional auto-log, but we'll do it manually in app for custom descriptions)
-- But ensuring cascading deletion happens for Appointments if a Patient/Doctor is deleted:
-- We already have ON DELETE CASCADE on the appointments foreign keys (patient_id, doctor_id).
-- So deleting a row in public.patients or public.doctors will wipe their appointments.

-- 4. Function to delete auth user (Mock/Structure for potential RPC usage if extensions allowed, otherwise handling via Edge Function)
-- Since we can't easily delete from auth.users from client, we'll rely on the Edge Function logic.
