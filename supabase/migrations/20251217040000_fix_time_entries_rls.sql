-- Loosen time_entries insert/update to avoid RLS failures for authenticated users
-- while still binding rows to the current user.

ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert entries tied to themselves
CREATE POLICY "Authenticated can insert time entries" ON time_entries
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to update their own entries (any status)
CREATE POLICY "Authenticated can update own time entries" ON time_entries
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);