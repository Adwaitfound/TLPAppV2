-- Refresh PostgREST schema cache after schema changes
-- This addresses errors like: "Could not find the 'created_by_email' column of 'milestones' in the schema cache"

-- Trigger PostgREST to reload its cached schema
NOTIFY pgrst, 'reload schema';
