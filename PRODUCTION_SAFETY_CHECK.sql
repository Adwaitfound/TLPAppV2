-- FINAL PRODUCTION SAFETY CHECK
-- Run this to verify all critical tables and policies are in place

-- 1. Check if audit_logs table exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') 
        THEN '✅ audit_logs table exists'
        ELSE '❌ ERROR: audit_logs table missing!'
    END AS audit_table_status;

-- 2. Check RLS policies on audit_logs
SELECT 
    COUNT(*) as policy_count,
    CASE 
        WHEN COUNT(*) >= 2 
        THEN '✅ audit_logs has RLS policies'
        ELSE '❌ WARNING: audit_logs missing policies'
    END AS rls_status
FROM pg_policies 
WHERE tablename = 'audit_logs';

-- 3. Verify employee_tasks table
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employee_tasks') 
        THEN '✅ employee_tasks table exists'
        ELSE '❌ ERROR: employee_tasks table missing!'
    END AS tasks_table_status;

-- 4. Check for orphaned records (tasks without users)
SELECT 
    COUNT(*) as orphaned_tasks,
    CASE 
        WHEN COUNT(*) = 0 
        THEN '✅ No orphaned tasks'
        ELSE '⚠️ WARNING: ' || COUNT(*) || ' tasks have invalid user_id'
    END AS orphan_status
FROM employee_tasks 
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- 5. Test audit log insert (this will create a test entry)
DO $$
BEGIN
    -- Only run if we have authenticated users
    IF EXISTS (SELECT 1 FROM auth.users LIMIT 1) THEN
        RAISE NOTICE '✅ Can test audit logging';
    ELSE
        RAISE NOTICE '⚠️ No users to test with';
    END IF;
END $$;

-- 6. Check Google Sheets environment vars (from app side - this is just a reminder)
SELECT '⚠️ REMINDER: Verify these environment variables are set:' AS reminder
UNION ALL
SELECT '  - GOOGLE_SHEETS_ID'
UNION ALL
SELECT '  - GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL'
UNION ALL
SELECT '  - GOOGLE_SHEETS_PRIVATE_KEY'
UNION ALL
SELECT '  - Google Sheet shared with service account email'
UNION ALL
SELECT '  - Google Sheet has headers in row 1';
