-- Allow employees who are team members to upload, view, update, and delete project files

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Allow employees to view team project files" ON project_files;
DROP POLICY IF EXISTS "Allow employees to insert team project files" ON project_files;
DROP POLICY IF EXISTS "Allow employees to update team project files" ON project_files;
DROP POLICY IF EXISTS "Allow employees to delete team project files" ON project_files;

-- Allow employees to view files from projects they are team members of
CREATE POLICY "Allow employees to view team project files"
    ON project_files FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM project_team pt
            WHERE pt.project_id = project_files.project_id
            AND pt.user_id = auth.uid()
        )
    );

-- Allow employees to insert files to projects they are team members of
CREATE POLICY "Allow employees to insert team project files"
    ON project_files FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM project_team pt
            WHERE pt.project_id = project_files.project_id
            AND pt.user_id = auth.uid()
        )
    );

-- Allow employees to update files in projects they are team members of
CREATE POLICY "Allow employees to update team project files"
    ON project_files FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM project_team pt
            WHERE pt.project_id = project_files.project_id
            AND pt.user_id = auth.uid()
        )
    );

-- Allow employees to delete files they uploaded in their team projects
CREATE POLICY "Allow employees to delete team project files"
    ON project_files FOR DELETE
    USING (
        uploaded_by = auth.uid()
        AND EXISTS (
            SELECT 1 FROM project_team pt
            WHERE pt.project_id = project_files.project_id
            AND pt.user_id = auth.uid()
        )
    );
