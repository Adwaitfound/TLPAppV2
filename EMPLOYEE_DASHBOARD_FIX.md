# HARD RESET FIX - Employee Dashboard Projects Not Showing

## Problem
Employees can't see shared projects on their dashboard, even when assigned via project_team table.

## Root Cause
1. `employee` role wasn't added to the user_role enum
2. RLS (Row Level Security) policies were blocking access to:
   - `project_team` table
   - `projects` table
   - `milestones` table
   - `project_files` table

## Solution - DO THIS IN SUPABASE SQL EDITOR

Go to: https://frinqtylwgzquoxvqhxb.supabase.co/project/default/sql/new

Run the migration file: **20251218_fix_employee_rls.sql**

### Or manually run these SQL commands in order:

```sql
-- 1. Add employee role
DO $$ 
BEGIN
    ALTER TYPE user_role ADD VALUE 'employee' BEFORE 'client';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END;
$$;
```

Then copy-paste the rest from: `/supabase/migrations/20251218_fix_employee_rls.sql`

## After Applying Fix

1. Restart the dev server:
   ```bash
   npm run dev
   ```

2. Clear browser cache: `Cmd+Shift+R` or `Ctrl+Shift+R`

3. Test:
   - Login as admin
   - Create/assign a project/task to employee (media@thelostproject.in)
   - Login as employee
   - Employee dashboard should now show:
     - Shared projects in "My Projects"
     - Assigned tasks in "Today's Tasks" 

## Files Modified
- `app/actions/employee-tasks.ts` - Added assignTaskToEmployee function
- `app/actions/create-team-member.ts` - Added 'employee' role support
- `app/dashboard/projects/page.tsx` - Auto-sync sub_projects to employee_tasks
- `app/dashboard/team/page.tsx` - Support employee role in team management
- `app/dashboard/employee/employee-view.tsx` - Added debug logging
- `components/dashboard/employee-header.tsx` - Show real user avatar
- `supabase/migrations/20251218_fix_employee_rls.sql` - All RLS policy fixes
