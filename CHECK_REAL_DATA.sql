-- CHECK_REAL_DATA.sql
-- Verify what real user-created data exists in the database
-- Run this to see your actual data after cleanup

-- Step 1: Check what user roles actually exist
SELECT '--- AVAILABLE USER ROLES ---' as info;
SELECT DISTINCT role, COUNT(*) as count
FROM public.users
GROUP BY role
ORDER BY count DESC;

-- Step 2: List all users with details
SELECT '--- USER DETAILS ---' as info;
SELECT id, email, role, created_at 
FROM public.users 
ORDER BY created_at DESC;

-- Step 3: Check clients (real clients only)
SELECT '--- CLIENT COUNT ---' as info;
SELECT COUNT(*) as total_clients
FROM public.clients;

-- Step 4: List all clients
SELECT '--- CLIENT DETAILS ---' as info;
SELECT id, email, phone, status, created_at 
FROM public.clients 
ORDER BY created_at DESC;

-- Step 5: Check projects (real projects only)
SELECT '--- PROJECT COUNT ---' as info;
SELECT COUNT(*) as total_projects
FROM public.projects;

-- Step 6: List all projects
SELECT '--- PROJECT DETAILS ---' as info;
SELECT id, client_id, status, start_date, end_date, created_at 
FROM public.projects 
ORDER BY created_at DESC;

-- Step 7: Check invoices (real invoices only)
SELECT '--- INVOICE COUNT ---' as info;
SELECT COUNT(*) as total_invoices,
       COALESCE(SUM(amount), 0) as total_amount
FROM public.invoices;

-- Step 8: List all invoices
SELECT '--- INVOICE DETAILS ---' as info;
SELECT id, invoice_number, client_id, amount, status, issue_date, due_date, created_at 
FROM public.invoices 
ORDER BY created_at DESC;

-- Step 9: Check project team assignments
SELECT '--- PROJECT TEAM COUNT ---' as info;
SELECT COUNT(*) as total_assignments
FROM public.project_team;

-- Step 10: List all project team assignments
SELECT '--- PROJECT TEAM DETAILS ---' as info;
SELECT pt.id, pt.project_id, pt.assigned_by, pt.created_at
FROM public.project_team pt
ORDER BY pt.created_at DESC;

-- Step 11: Check milestones
SELECT '--- MILESTONE COUNT ---' as info;
SELECT COUNT(*) as total_milestones
FROM public.milestones;

-- Step 12: List all milestones
SELECT '--- MILESTONE DETAILS ---' as info;
SELECT id, project_id, title, status, due_date, created_at 
FROM public.milestones 
ORDER BY created_at DESC;

-- Step 13: Check project files
SELECT '--- PROJECT FILE COUNT ---' as info;
SELECT COUNT(*) as total_files
FROM public.project_files;

-- Step 14: List all project files
SELECT '--- PROJECT FILE DETAILS ---' as info;
SELECT id, project_id, file_name, file_path, uploaded_by, created_at 
FROM public.project_files 
ORDER BY created_at DESC
LIMIT 50;

-- Step 15: Summary
SELECT '--- DATA SUMMARY ---' as info;
SELECT 
  (SELECT COUNT(*) FROM public.users) as total_users,
  (SELECT COUNT(*) FROM public.clients) as total_clients,
  (SELECT COUNT(*) FROM public.projects) as total_projects,
  (SELECT COUNT(*) FROM public.invoices) as total_invoices,
  (SELECT COUNT(*) FROM public.milestones) as total_milestones,
  (SELECT COUNT(*) FROM public.project_files) as total_files,
  (SELECT COUNT(*) FROM public.project_team) as total_team_assignments;
