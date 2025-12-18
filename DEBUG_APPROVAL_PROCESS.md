# Debug Guide: Project Proposal Approval Process

## What Was Added

Comprehensive logging has been added to trace the entire approval flow:

### 1. **Employee Task Approval (`app/actions/employee-tasks.ts`)**
- `[reviewProjectProposal]` logs track:
  - ✅ Auth verification
  - ✅ Role check 
  - ✅ Task fetch from database
  - ✅ Project creation attempt
  - ✅ Team member insertion (both admin and employee)
  - ✅ Final task update

### 2. **Projects Dashboard (`app/dashboard/projects/page.tsx`)**
- `[ProjectsPage]` logs track:
  - ✅ User info and role
  - ✅ Project fetch by creator
  - ✅ Project fetch by team membership
  - ✅ Count of projects found in each query
  - ✅ Final project list displayed

## Step-by-Step Testing

### Step 1: Open Browser Console
1. Open your app in browser
2. Open Developer Tools (F12)
3. Go to **Console** tab
4. Filter for `[reviewProjectProposal]` and `[ProjectsPage]`

### Step 2: Create a Test Proposal (As Employee)
1. Go to Dashboard → Tasks
2. Create a new task with:
   - Title: "TEST PROPOSAL [DATE]"
   - Enable "Propose new project"
   - Project Name: "Test Project [DATE]"
   - Select a vertical (e.g., Video Production)
3. **Watch Console** - You should see:
   ```
   [createTask] Creating task for user: [ID]
   [createTask] Setting proposed project status to pending
   [createTask] Result: {task: {...}, error: null}
   ```

### Step 3: Approve the Proposal (As Admin)
1. Go to Dashboard → (Admin View or Proposals)
2. Find your test proposal
3. Click Approve or "Create New Project"
4. **Watch Console** - You should see ALL these logs:
   ```
   [reviewProjectProposal] 🔵 START - Decision: approved
   [reviewProjectProposal] ✅ Auth user: [ID]
   [reviewProjectProposal] ✅ Role check passed: project_manager
   [reviewProjectProposal] 🔷 CREATING NEW PROJECT FROM PROPOSAL
   [reviewProjectProposal] Task fetch: {error: null, task: {...}}
   [reviewProjectProposal] ✅ Task fetched - Name: Test Project...
   [reviewProjectProposal] 🔶 Attempting to create project with: {name, service_type, ...}
   [reviewProjectProposal] Project insert result: {error: null, newProject: {id: "...", ...}}
   [reviewProjectProposal] ✅ Project created successfully! ID: [PROJECT_ID]
   [reviewProjectProposal] Updated updateData.project_id = [PROJECT_ID]
   [reviewProjectProposal] 🔷 Adding team members to project: [PROJECT_ID]
   [reviewProjectProposal] Team members to add: [admin entry, employee entry]
   [reviewProjectProposal] Team insert result: {error: null, data: [{...}, {...}]}
   [reviewProjectProposal] ✅ Team members added successfully! Rows: 2
   ```

### Step 4: Check Projects Dashboard
1. **Do NOT refresh yet** - keep console open
2. Go to Dashboard → Projects
3. **Watch Console** - You should see:
   ```
   [ProjectsPage] 🔵 FETCH START - User: [ID], Role: project_manager
   [ProjectsPage] 🔷 Employee/PM fetch mode
   [ProjectsPage] Fetching projects created by: [ID]
   [ProjectsPage] Created projects result: {count: X, error: null}
   [ProjectsPage] Fetching project_team entries for user: [ID]
   [ProjectsPage] Team projects result: {count: X, error: null}
   [ProjectsPage] Before dedup - created: X, from team: Y
   [ProjectsPage] After dedup - total projects: Z
   [ProjectsPage] Project: [ID] Test Project
   [ProjectsPage] ✅ Total projects to display: Z
   ```

## Interpretation Guide

### If Everything Works ✅
- All logs appear with ✅ marks
- `[ProjectsPage] Project: [ID] Test Project` appears in console
- Your new project appears in the Projects dashboard for both admin and employee
- **NO ERROR MESSAGES**

### If Something Fails ❌

**Issue: "Project creation failed"**
- Check if `projects` table has RLS policies
- Verify admin has write permission to `projects` table
- Check if columns in insert match table schema

**Issue: "Failed to add team members"**
- Check if `project_team` table exists and has correct schema
- Verify RLS policies allow inserts
- Check if `project_id` foreign key constraint passes

**Issue: "Project fetch returns 0 count"**
- New project not created (see above)
- OR project_team entries not created
- Check direct database query: `SELECT * FROM projects WHERE name LIKE '%Test%'`
- Check: `SELECT * FROM project_team WHERE project_id = '[PROJECT_ID]'`

**Issue: "Projects dashboard shows 0 projects"**
- Project exists in DB but:
  - User not linked in project_team
  - Query filter is too strict
  - RLS policy blocking read
- Check: `SELECT * FROM project_team WHERE user_id = '[USER_ID]'`

## Database Validation Queries

Run these in Supabase SQL Editor:

```sql
-- Check if new project was created
SELECT id, name, created_by, status FROM projects 
WHERE name LIKE '%Test%' 
ORDER BY created_at DESC LIMIT 5;

-- Check if team members were added
SELECT * FROM project_team 
WHERE project_id = '[PROJECT_ID]';

-- Check task was updated with project_id
SELECT id, title, proposed_project_status, project_id 
FROM employee_tasks 
WHERE title LIKE '%TEST%' 
ORDER BY created_at DESC LIMIT 5;

-- Check if admin can read the project
SELECT COUNT(*) as admin_can_see FROM projects WHERE status = 'planning';

-- Check if employee can see project_team entry
SELECT COUNT(*) as employee_team_count FROM project_team 
WHERE user_id = '[EMPLOYEE_ID]';
```

## Next Steps if Still Failing

1. **Note ALL console logs** (take screenshot or copy them)
2. **Run the database queries above** in Supabase SQL Editor
3. **Check RLS policies** in Supabase dashboard:
   - Projects table RLS
   - Project_team table RLS
   - Employee_tasks table RLS
4. **Verify user IDs** are correct and not null

---

**🎯 Goal**: See green ✅ logs, new project in database, new project visible in dashboard
