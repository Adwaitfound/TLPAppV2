-- Fix RLS policies for employee_tasks table to allow employees to read/write their own tasks

-- Drop existing policies if any
DROP POLICY IF EXISTS "employee_tasks_select" ON employee_tasks;
DROP POLICY IF EXISTS "employee_tasks_insert" ON employee_tasks;
DROP POLICY IF EXISTS "employee_tasks_update" ON employee_tasks;
DROP POLICY IF EXISTS "employee_tasks_delete" ON employee_tasks;

-- Enable RLS
ALTER TABLE employee_tasks ENABLE ROW LEVEL SECURITY;

-- Employees can read their own tasks
CREATE POLICY "employee_tasks_select" ON employee_tasks
    FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'project_manager')
        )
    );

-- Employees can insert their own tasks
CREATE POLICY "employee_tasks_insert" ON employee_tasks
    FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'project_manager')
        )
    );

-- Employees can update their own tasks (or admin/PM can update any)
CREATE POLICY "employee_tasks_update" ON employee_tasks
    FOR UPDATE
    TO authenticated
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'project_manager')
        )
    )
    WITH CHECK (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'project_manager')
        )
    );

-- Employees can delete their own tasks (or admin/PM can delete any)
CREATE POLICY "employee_tasks_delete" ON employee_tasks
    FOR DELETE
    TO authenticated
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'project_manager')
        )
    );
