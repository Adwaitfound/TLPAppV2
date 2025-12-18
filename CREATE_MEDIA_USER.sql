-- Create employee user: media@thelostproject.in
-- Password: tlp1234

-- First, create the auth user (run this via Supabase Dashboard SQL Editor or supabase CLI)
-- Note: This uses the auth.users table which requires service_role access

-- Step 1: Create auth user
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'media@thelostproject.in',
    crypt('tlp1234', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Media Team"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
);

-- Step 2: Create corresponding user record in public.users table
-- This will be created by trigger automatically when auth user is created

-- Step 3: Update the user role to project_manager (employee)
UPDATE public.users
SET 
    role = 'project_manager',
    full_name = 'Media Team',
    updated_at = NOW()
WHERE email = 'media@thelostproject.in';

-- Verify the user was created
SELECT id, email, role, full_name, created_at
FROM public.users
WHERE email = 'media@thelostproject.in';
