# Supabase Authentication Integration - Complete Guide

## ✅ What's Been Done

### 1. **Installed Required Packages**
- `@supabase/auth-helpers-nextjs`
- `@supabase/ssr`

### 2. **Updated Supabase Client Configuration**
- **Client-side** (`lib/supabase/client.ts`): Uses `createBrowserClient` from `@supabase/ssr`
- **Server-side** (`lib/supabase/server.ts`): Uses `createServerClient` with cookie handling

### 3. **Created Authentication System**

#### **Auth Context** (`contexts/auth-context.tsx`)
- Manages user authentication state
- Fetches user data from `users` table after Supabase auth
- Provides `logout()` function
- Includes loading states

#### **Login Page** (`app/login/page.tsx`)
- Email/password login form
- Automatic role-based redirection:
  - Admin → `/dashboard`
  - Client → `/dashboard/client`
  - Employee → `/dashboard/employee`

#### **Middleware** (`middleware.ts`)
- Protects `/dashboard` routes - requires authentication
- Refreshes auth tokens automatically
- Redirects logged-in users from login/role-selection pages

### 4. **Updated All Dashboards**
- Admin, Client, and Employee dashboards now use:
  - Real Supabase authentication
  - `createClient()` function for queries
  - Loading states from auth context
  - Proper user data from database

### 5. **Updated Landing Page**
- "Get Started" button now routes to `/login` instead of `/auth/select-role`

---

## 🚀 Setup Instructions

### Step 1: Create Admin User in Supabase

#### Option A: Using Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard** → Your Project
2. **Navigate to**: Authentication → Users
3. **Click**: "Add User" (top right)
4. **Fill in**:
   ```
   Email: adwait@thelostproject.in
   Password: [Create a strong password]
   Auto Confirm User: ✓ YES (important!)
   ```
5. **Click**: "Create User"

#### Option B: Using SQL

```sql
-- This creates an auth user - may require additional setup
-- It's easier to use the Dashboard method above
```

### Step 2: Link Auth User to Database User

After creating the auth user, run this SQL in Supabase SQL Editor:

```sql
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

### Step 3: Verify Setup

Run this query to verify everything is connected:

```sql
SELECT 
  u.id,
  u.email,
  u.full_name,
  u.role,
  u.company_name,
  au.email as auth_email,
  au.email_confirmed_at
FROM public.users u
JOIN auth.users au ON u.id = au.id
WHERE u.email = 'adwait@thelostproject.in';
```

You should see:
- ✓ Matching IDs
- ✓ Role = 'admin'
- ✓ email_confirmed_at has a timestamp

---

## 🧪 Testing

### Test Login Flow

1. **Start dev server**:
   ```bash
   npm run dev
   ```

2. **Open**: http://localhost:3000

3. **Click**: "Get Started"

4. **Login with**:
   ```
   Email: adwait@thelostproject.in
   Password: [your password]
   ```

5. **Verify**:
   - ✓ Redirects to `/dashboard` (admin view)
   - ✓ Shows your name in header ("Adwait Parchure")
   - ✓ Displays data from Supabase
   - ✓ Can logout successfully

### Test Protection

Try accessing `/dashboard` without logging in:
```
http://localhost:3000/dashboard
```
Should redirect to `/login`

---

## 🔒 Current Authentication Flow

```
1. User visits homepage → Clicks "Get Started"
                        ↓
2. Redirected to /login → Enters credentials
                        ↓
3. Supabase Auth validates → Creates session
                        ↓
4. Fetches user from users table → Gets role
                        ↓
5. Redirects based on role:
   - admin → /dashboard
   - client → /dashboard/client
   - employee → /dashboard/employee
                        ↓
6. Dashboard loads data from Supabase using authenticated user
```

---

## 🗑️ Removed Components

### What Was Removed:
- ❌ `/app/auth/select-role/page.tsx` - No longer used (can be deleted)
- ❌ localStorage-based auth - Replaced with Supabase sessions
- ❌ Mock user creation on role selection
- ❌ Hardcoded user data in headers

### What Replaced It:
- ✅ Real Supabase Authentication
- ✅ Cookie-based sessions (managed by middleware)
- ✅ Database-driven user data
- ✅ Role-based access control

---

## 📊 Database Schema Requirements

Your `users` table must have:

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,  -- Must match auth.users.id
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    role user_role NOT NULL,  -- 'admin', 'client', 'project_manager', or 'employee'
    company_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Important**: The `id` in `users` table MUST match the `id` from `auth.users`.

---

## 🔧 Troubleshooting

### Problem: "Failed to log in"
**Solutions**:
1. Check if user exists in auth.users:
   ```sql
   SELECT * FROM auth.users WHERE email = 'adwait@thelostproject.in';
   ```
2. Verify email is confirmed (email_confirmed_at is not null)
3. Check password is correct

### Problem: "Redirects to login after logging in"
**Solutions**:
1. Check if user exists in public.users:
   ```sql
   SELECT * FROM public.users WHERE email = 'adwait@thelostproject.in';
   ```
2. Verify IDs match between auth.users and public.users
3. Check browser console for errors

### Problem: "Dashboard shows no data"
**Solutions**:
1. Check Supabase RLS policies allow authenticated users to read
2. Verify environment variables are set:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```
3. Check browser network tab for failed API calls

### Problem: "Can't logout"
**Solution**: Clear browser cookies and localStorage, then try again

---

## 🎯 Next Steps

### Immediate:
1. ✅ Create your admin user (follow steps above)
2. ✅ Test login/logout flow
3. ✅ Verify data loading

### Future Enhancements:
1. **Add Password Reset**: Implement forgot password flow
2. **Add User Registration**: Allow new users to sign up (with approval)
3. **Enhance RLS**: Add stricter Row Level Security policies
4. **Add Profile Management**: Let users update their profiles
5. **Add Team Management**: Allow admins to invite/manage users
6. **Add Activity Logging**: Track user actions for security

---

## 📁 Key Files Modified

```
app/
  ├── login/page.tsx          # NEW - Login page
  ├── page.tsx                # Updated - Routes to /login
  ├── dashboard/
  │   ├── page.tsx            # Updated - Uses real auth
  │   ├── client/page.tsx     # Updated - Uses real auth
  │   └── employee/page.tsx   # Updated - Uses real auth
contexts/
  └── auth-context.tsx        # Updated - Real Supabase auth
lib/supabase/
  ├── client.ts              # Updated - New auth helpers
  └── server.ts              # Updated - Cookie handling
middleware.ts                 # NEW - Route protection
components/dashboard/
  ├── header.tsx             # Updated - Uses auth context
  ├── client-header.tsx      # Updated - Uses auth context
  └── employee-header.tsx    # Updated - Uses auth context
```

---

## ✨ Benefits of New System

1. **Secure**: Industry-standard authentication with Supabase
2. **Persistent**: Sessions survive page refreshes
3. **Protected**: Middleware guards all routes
4. **Scalable**: Easy to add new auth features
5. **Maintainable**: No localStorage hacks or mock data
6. **Professional**: Real auth flow with proper session management

---

## 🆘 Need Help?

If you encounter issues:

1. Check Supabase logs (Dashboard → Logs)
2. Check browser console for errors
3. Verify all environment variables
4. Test SQL queries manually in Supabase
5. Clear browser cache/cookies and retry
