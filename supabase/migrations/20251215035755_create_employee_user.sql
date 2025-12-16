-- No-op migration: employee seed removed intentionally
DO $$
BEGIN
    RAISE NOTICE 'Skipping employee seed; user not created.';
END $$;
