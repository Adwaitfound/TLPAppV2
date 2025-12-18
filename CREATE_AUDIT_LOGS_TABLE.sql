-- Run this in Supabase SQL Editor to create the audit_logs table
-- Navigate to: https://supabase.com/dashboard/project/frinqtylwgzquoxvqhxb/sql

-- Create audit logs table to track all user actions
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email TEXT,
    action TEXT NOT NULL, -- 'create', 'update', 'delete', 'view', 'upload', 'download', 'login', 'logout', 'approve', 'reject'
    entity_type TEXT NOT NULL, -- 'task', 'project', 'file', 'user', 'proposal', 'team_member'
    entity_id UUID,
    entity_name TEXT,
    old_values JSONB, -- Previous values for updates
    new_values JSONB, -- New values for creates/updates
    details JSONB, -- Additional context
    ip_address TEXT,
    user_agent TEXT,
    status TEXT DEFAULT 'success', -- 'success', 'error', 'pending'
    error_message TEXT,
    duration_ms INTEGER, -- How long the action took
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_email ON audit_logs(user_email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created ON audit_logs(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view all audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Users can view their own audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Only service role can insert audit logs" ON audit_logs;

-- Allow admins to view all logs
CREATE POLICY "Admins can view all audit logs"
    ON audit_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role IN ('admin', 'project_manager')
        )
    );

-- Allow users to view their own logs
CREATE POLICY "Users can view their own audit logs"
    ON audit_logs FOR SELECT
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role IN ('admin', 'project_manager')
        )
    );

-- Only service role can insert logs (via server action)
CREATE POLICY "Only service role can insert audit logs"
    ON audit_logs FOR INSERT
    WITH CHECK (auth.role() = 'service_role');
