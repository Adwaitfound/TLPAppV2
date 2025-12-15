-- Fix users table INSERT policy for signup
-- Drop the existing policy
DROP POLICY IF EXISTS "Users can insert own record" ON users;

-- Create a more permissive policy that allows signup
-- This allows inserting during signup when auth.uid() matches the id being inserted
CREATE POLICY "Allow user creation during signup" ON users 
  FOR INSERT 
  WITH CHECK (
    auth.uid() = id OR 
    auth.role() = 'authenticated'
  );
