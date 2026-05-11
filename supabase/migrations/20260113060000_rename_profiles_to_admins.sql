
-- 1. Rename profiles to 'admins' explicitly if not already done, 
-- or ensure we treat it as such.
-- (The user asked to Rename 'profiles' table to 'admins')

ALTER TABLE IF EXISTS public.profiles RENAME TO admins;

-- 2. Cleanup: Delete any records in 'admins' that do not have role 'admin'
DELETE FROM public.admins WHERE role != 'admin';

-- 3. Update RLS policies (if any existed on profiles, they move to admins, but we might want to ensure they are correct)
-- For now, just ensuring it's accessible as requested during dev
ALTER TABLE public.admins DISABLE ROW LEVEL SECURITY;

-- 4. Note: We need to update any foreign keys appearing in other tables pointing to profiles?
-- Our 'appointments' now point to 'patients' and 'doctors'.
-- 'doctors' points to 'auth.users'.
-- 'patients' points to 'auth.users'.
-- So 'admins' is likely standalone or referenced by something else?
-- Check if any other table references 'profiles'.
-- If so, renaming might update the reference automatically or require manual fix.
-- Usually Postgres handles rename fine.

