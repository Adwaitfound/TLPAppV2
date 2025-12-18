-- Allow admins to update any user (for approvals)
DROP POLICY IF EXISTS "Admins can update users" ON users;

CREATE POLICY "Admins can update users"
    ON users FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
        )
    );
