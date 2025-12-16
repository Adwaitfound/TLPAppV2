-- Ensure the column exists on remote (idempotent)
ALTER TABLE milestones
  ADD COLUMN IF NOT EXISTS created_by_email TEXT;

-- Also refresh PostgREST schema cache in case it’s stale
NOTIFY pgrst, 'reload schema';
