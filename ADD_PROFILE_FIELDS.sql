-- This script adds missing profile fields to the users table
-- Run this in the Supabase SQL Editor

BEGIN;

-- Add missing columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS industry TEXT,
ADD COLUMN IF NOT EXISTS tax_id TEXT,
ADD COLUMN IF NOT EXISTS company_size TEXT;

-- Add RLS policies if needed
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Allow users to update their own profile
CREATE POLICY IF NOT EXISTS "Users can update own profile" 
  ON users FOR UPDATE 
  USING (auth.uid()::text = id::text)
  WITH CHECK (auth.uid()::text = id::text);

-- Allow admins to update any profile
CREATE POLICY IF NOT EXISTS "Admins can update any profile" 
  ON users FOR UPDATE 
  USING (role = 'admin')
  WITH CHECK (role = 'admin');

COMMIT;
