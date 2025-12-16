-- CLEANUP_USERS_START_FRESH.sql
-- Deletes all users except adwait@thelostproject.in
-- This gives you a clean slate to assign roles properly through the app

-- First, backup/view what we're about to delete
SELECT 'Users to be deleted:' as info;
SELECT id, email, role FROM public.users 
WHERE email != 'adwait@thelostproject.in';

-- Delete all users except adwait from public.users
DELETE FROM public.users
WHERE email != 'adwait@thelostproject.in';

-- Verify only adwait remains
SELECT 'Remaining users:' as info;
SELECT id, email, role FROM public.users;

-- Count
SELECT COUNT(*) as total_users FROM public.users;
