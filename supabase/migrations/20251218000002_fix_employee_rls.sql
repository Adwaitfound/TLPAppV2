-- Complete fix for employee role and RLS policies
-- This ensures employees can see projects they're assigned to

-- Step 1: Add 'employee' role to enum (if not already present)
DO $$ 
BEGIN
    ALTER TYPE user_role ADD VALUE 'employee' BEFORE 'client';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END;
$$;

-- Step 2: Fix project_team RLS policies
DROP POLICY IF EXISTS "Allow authenticated users to view project team" ON project_team CASCADE;
DROP POLICY IF EXISTS "Allow all authenticated users to view project team" ON project_team CASCADE;
DROP POLICY IF EXISTS "Allow admins to manage project team" ON project_team CASCADE;

-- Admins and PMs can manage all
CREATE POLICY "Admins manage project team" ON project_team
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'project_manager')
        )
    );

-- Employees can see their own assignments
CREATE POLICY "Employees view own assignments" ON project_team
    FOR SELECT
    USING (auth.uid() = user_id);

-- Clients and other authenticated users can view
CREATE POLICY "Authenticated view project assignments" ON project_team
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Step 3: Fix projects RLS - allow employees to see projects they're assigned to
DROP POLICY IF EXISTS "Authenticated users can view projects" ON projects CASCADE;

CREATE POLICY "Users can view assigned projects" ON projects
    FOR SELECT
    USING (
        auth.role() = 'authenticated' AND (
            -- Admins and project managers see all
            EXISTS (
                SELECT 1 FROM users 
                WHERE users.id = auth.uid() 
                AND users.role IN ('admin', 'project_manager')
            ) OR
            -- Users see projects they created
            created_by = auth.uid() OR
            -- Employees and team members see projects assigned to them
            EXISTS (
                SELECT 1 FROM project_team 
                WHERE project_team.project_id = projects.id 
                AND project_team.user_id = auth.uid()
            ) OR
            -- Clients see projects linked to their client record
            EXISTS (
                SELECT 1 FROM clients 
                WHERE clients.id = projects.client_id 
                AND clients.user_id = auth.uid()
            )
        )
    );

-- Step 4: Fix milestones RLS
DROP POLICY IF EXISTS "Authenticated users can view milestones" ON milestones CASCADE;

CREATE POLICY "Users can view assigned project milestones" ON milestones
    FOR SELECT
    USING (
        auth.role() = 'authenticated' AND (
            -- Admins see all
            EXISTS (
                SELECT 1 FROM users 
                WHERE id = auth.uid() 
                AND role IN ('admin', 'project_manager')
            ) OR
            -- Users see milestones for projects they're assigned to
            EXISTS (
                SELECT 1 FROM project_team 
                WHERE project_team.user_id = auth.uid() 
                AND project_team.project_id = milestones.project_id
            ) OR
            -- Users see milestones for projects they created
            EXISTS (
                SELECT 1 FROM projects 
                WHERE projects.id = milestones.project_id 
                AND projects.created_by = auth.uid()
            )
        )
    );

-- Step 5: Fix project_files RLS
DROP POLICY IF EXISTS "Authenticated users can view project files" ON project_files CASCADE;

CREATE POLICY "Users can view project files" ON project_files
    FOR SELECT
    USING (
        auth.role() = 'authenticated' AND (
            EXISTS (
                SELECT 1 FROM users 
                WHERE id = auth.uid() 
                AND role IN ('admin', 'project_manager')
            ) OR
            EXISTS (
                SELECT 1 FROM project_team 
                WHERE project_team.user_id = auth.uid() 
                AND project_team.project_id = project_files.project_id
            ) OR
            EXISTS (
                SELECT 1 FROM projects 
                WHERE projects.id = project_files.project_id 
                AND projects.created_by = auth.uid()
            )
        )
    );

