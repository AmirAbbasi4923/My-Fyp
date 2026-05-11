-- Remove dependence on profiles table since we split the architecture
ALTER TABLE public.doctors
  DROP CONSTRAINT IF EXISTS doctors_id_fkey;

-- Re-add constraint to auth.users (the true source of truth) instead of profiles
ALTER TABLE public.doctors
  ADD CONSTRAINT doctors_id_fkey 
  FOREIGN KEY (id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- Now retry the insertion of missing doctors
INSERT INTO public.doctors (id, name, email, speciality, phone_number)
SELECT 
    au.id, 
    -- Try to get name from metadata, fallback to email
    COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)) as name, 
    au.email, 
    'General Physician' as speciality,
    COALESCE(au.raw_user_meta_data->>'phone_number', '') as phone_number
FROM auth.users au
LEFT JOIN public.patients p ON au.id = p.id
LEFT JOIN public.profiles adm ON au.id = adm.id
WHERE p.id IS NULL 
AND adm.id IS NULL
AND NOT EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = au.id)
ON CONFLICT (id) DO NOTHING;
