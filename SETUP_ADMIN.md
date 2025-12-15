# Supabase Setup Script

This script creates the admin user in your Supabase database.

## Run this SQL in your Supabase SQL Editor:

```sql
-- 1. First, create the auth user (this must be done via Supabase Auth)
-- You can do this in two ways:

-- METHOD 1: Via Supabase Dashboard
-- Go to Authentication > Users > Add User
-- Email: adwait@thelostproject.in
-- Password: [Choose a secure password]
-- Email Confirm: Yes

-- METHOD 2: Via SQL (run this first to create auth user)
-- Note: Replace 'your-secure-password' with an actual password

-- 2. Then run this to create the user in the users table:
-- IMPORTANT: Replace the UUID below with the actual UUID from the auth.users table
-- You can get it by running: SELECT id FROM auth.users WHERE email = 'adwait@thelostproject.in';

INSERT INTO public.users (id, email, full_name, role, company_name)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'adwait@thelostproject.in'),
  'adwait@thelostproject.in',
  'Adwait Parchure',
  'admin',
  'The Lost Project'
)
ON CONFLICT (id) DO UPDATE
SET 
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  company_name = EXCLUDED.company_name;
```

## Step-by-Step Instructions:

### Step 1: Create Auth User
1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Users**
3. Click **Add User** (top right)
4. Fill in:
   - Email: `adwait@thelostproject.in`
   - Password: [Create a secure password]
   - Auto Confirm User: **Yes** ✓
5. Click **Create User**

### Step 2: Create Database User Record
1. Go to **SQL Editor**
2. Click **New Query**
3. Paste the SQL above
4. Click **Run** or press `Cmd/Ctrl + Enter`

### Step 3: Verify Setup
Run this query to verify:
```sql
SELECT u.*, au.email as auth_email
FROM public.users u
JOIN auth.users au ON u.id = au.id
WHERE u.email = 'adwait@thelostproject.in';
```

You should see your admin user with role = 'admin'.

### Step 4: Test Login
1. Go to your app: http://localhost:3000
2. Click "Get Started"
3. Login with:
   - Email: adwait@thelostproject.in
   - Password: [the password you set]
4. You should be redirected to the admin dashboard

## Troubleshooting

### If login fails:
1. Check if the auth user exists:
   ```sql
   SELECT * FROM auth.users WHERE email = 'adwait@thelostproject.in';
   ```

2. Check if the users table record exists:
   ```sql
   SELECT * FROM public.users WHERE email = 'adwait@thelostproject.in';
   ```

3. Make sure the IDs match between auth.users and public.users

### If you need to reset:
```sql
-- Delete from public.users first
DELETE FROM public.users WHERE email = 'adwait@thelostproject.in';

-- Then delete from auth.users (or use the Supabase dashboard)
-- Go to Authentication > Users > find the user > Delete
```
