-- Add user_status for admin approval gate
DO $$
BEGIN
    CREATE TYPE user_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS status user_status DEFAULT 'pending';

-- Approve existing users to avoid locking out current accounts
UPDATE users
SET status = 'approved'
WHERE status IS NULL;

CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
