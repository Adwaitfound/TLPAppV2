-- Add 'employee' role to user_role enum
-- This must be a separate migration to avoid "unsafe use of new enum value" error
DO $$ 
BEGIN
    ALTER TYPE user_role ADD VALUE 'employee' BEFORE 'client';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END;
$$;
