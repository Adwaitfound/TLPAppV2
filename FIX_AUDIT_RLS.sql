-- Run this in Supabase SQL Editor to fix the RLS policy
-- The current policy requires service_role but we're using server actions with auth users

-- Drop the restrictive insert policy
DROP POLICY IF EXISTS "Only service role can insert audit logs" ON audit_logs;

-- Create a new policy that allows authenticated users to insert their own logs
CREATE POLICY "Authenticated users can insert their own audit logs"
    ON audit_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);
