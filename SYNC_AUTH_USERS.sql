-- SYNC_AUTH_USERS.sql
-- Syncs existing Supabase Auth users into public.users table with proper roles
-- This ensures all auth users have corresponding app user records

-- First, let's see which auth users don't have public.users records
SELECT 'Auth users without public.users records:' as info;
SELECT 
  id, 
  email,
  raw_user_meta_data->>'full_name' as full_name
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.users);

-- Now insert missing users with their appropriate roles
-- All three are admins
INSERT INTO public.users (id, email, full_name, role, created_at)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email) as full_name,
  'admin' as role,
  NOW()
FROM auth.users au
WHERE au.id NOT IN (SELECT id FROM public.users)
ON CONFLICT (id) DO NOTHING;

-- Verify the sync
SELECT 'Users synced to public.users:' as info;
SELECT 
  id,
  email, 
  role,
  created_at
FROM public.users
ORDER BY created_at DESC;

-- Count by role
SELECT 'Users by role:' as info;
SELECT 
  role,
  COUNT(*) as count
FROM public.users
GROUP BY role
ORDER BY count DESC;
