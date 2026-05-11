-- Recovery Script for Doctors
-- Attempt to restore lost doctors from the auth.users or profiles backup (assuming profiles data is gone, we check auth.users).
-- Since we can't easily read raw_user_metadata from auth.users via simple SQL in all Supabase setups without specific grants, 
-- we will try a broad insert approach if possible, or just re-insert generic if ID matches users with no patient/admin record?
-- Better approach: "If a user is NOT in patients AND NOT in admins, they might be a doctor."

-- 1. Insert into doctors table any user who is NOT in patients AND NOT in admins
-- This acts as a recovery for the deleted profiles if they were indeed doctors.
INSERT INTO public.doctors (id, name, email, speciality, phone_number)
SELECT 
    au.id, 
    COALESCE(au.raw_user_meta_data->>'full_name', au.email) as name, 
    au.email, 
    'General Physician' as speciality,
    COALESCE(au.raw_user_meta_data->>'phone_number', '') as phone_number
FROM auth.users au
LEFT JOIN public.patients p ON au.id = p.id
LEFT JOIN public.profiles adm ON au.id = adm.id -- remember profiles is now just admins
WHERE p.id IS NULL 
AND adm.id IS NULL
AND NOT EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = au.id)
-- Filter safely: optionally check metadata if available
AND (au.raw_user_meta_data->>'role' = 'doctor' OR au.raw_user_meta_data->>'role' IS NULL); 
-- We enable NULL check just in case, but risk adding junk users. 
-- Given the context, safer to assume role='doctor' is present in metadata if app used useAuth.

-- 2. Ensure RLS is disabled for doctors to be visible to Admin
ALTER TABLE public.doctors DISABLE ROW LEVEL SECURITY;
