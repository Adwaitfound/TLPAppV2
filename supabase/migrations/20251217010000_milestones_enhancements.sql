-- Milestones enhancements: add blocked status, ordering, audit fields, and RLS

-- 1) Extend status enum
ALTER TYPE milestone_status ADD VALUE IF NOT EXISTS 'blocked';

-- 2) Add columns for ordering and audit
ALTER TABLE milestones
    ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS created_by_email TEXT,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3) Backfill position in case older rows exist
WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY created_at) - 1 AS rn
    FROM milestones
)
UPDATE milestones m
SET position = ranked.rn
FROM ranked
WHERE ranked.id = m.id;

-- 4) Backfill created_by_email to current admin (adjust if you onboard more users)
UPDATE milestones
SET created_by_email = 'adwait@thelostproject.in'
WHERE created_by_email IS NULL;

-- 5) Keep updated_at in sync
DROP TRIGGER IF EXISTS update_milestones_updated_at ON milestones;
CREATE TRIGGER update_milestones_updated_at
BEFORE UPDATE ON milestones
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 6) Enable and tighten RLS
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Milestones select" ON milestones;
DROP POLICY IF EXISTS "Milestones insert" ON milestones;
DROP POLICY IF EXISTS "Milestones update" ON milestones;
DROP POLICY IF EXISTS "Milestones delete" ON milestones;

CREATE POLICY "Milestones select" ON milestones
FOR SELECT
USING (
    auth.role() = 'service_role' OR auth.email() = 'adwait@thelostproject.in'
);

CREATE POLICY "Milestones insert" ON milestones
FOR INSERT
WITH CHECK (
    auth.role() = 'service_role' OR auth.email() = 'adwait@thelostproject.in'
);

CREATE POLICY "Milestones update" ON milestones
FOR UPDATE
USING (
    auth.role() = 'service_role' OR auth.email() = 'adwait@thelostproject.in'
)
WITH CHECK (
    auth.role() = 'service_role' OR auth.email() = 'adwait@thelostproject.in'
);

CREATE POLICY "Milestones delete" ON milestones
FOR DELETE
USING (
    auth.role() = 'service_role' OR auth.email() = 'adwait@thelostproject.in'
);
