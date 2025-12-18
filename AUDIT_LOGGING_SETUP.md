# 🔍 Audit Logging System Setup Guide

## Overview

Comprehensive audit logging system that tracks **all user actions** in the TLP App. Logs are stored in:
- ✅ **Supabase PostgreSQL** (primary storage with RLS)
- ✅ **Google Sheets** (optional, for non-technical visibility)

## 📋 What Gets Logged

### Actions Tracked
- `create`: Task, project, or file creation
- `update`: Any data modification
- `delete`: Task, project, or file deletion
- `upload`: File uploads
- `download`: File downloads
- `login`: User authentication
- `logout`: User session end
- `approve`: Project proposal approval
- `reject`: Project proposal rejection

### Entity Types
- `task`: Employee tasks
- `project`: Projects
- `file`: Project files
- `user`: User accounts
- `proposal`: Project proposals
- `team_member`: Team assignments

### Logged Data
```
- User ID & Email
- Action performed
- Entity type & ID
- Old values (for updates)
- New values (for updates)
- Request context (IP, user agent)
- Execution time
- Success/error status
```

## 🚀 Phase 1: Database Setup (COMPLETED)

### Migration Applied
✅ Created: `supabase/migrations/20251219000000_create_audit_logs.sql`

**Table: `audit_logs`**
```sql
- id (UUID, PK)
- user_id (UUID, FK users)
- user_email (TEXT, indexed)
- action (TEXT, indexed)
- entity_type (TEXT, indexed)
- entity_id (UUID, indexed)
- entity_name (TEXT)
- old_values (JSONB)
- new_values (JSONB)
- details (JSONB)
- ip_address (TEXT)
- user_agent (TEXT)
- status ('success' | 'error' | 'pending')
- error_message (TEXT)
- duration_ms (INTEGER)
- created_at (TIMESTAMP, indexed)
- updated_at (TIMESTAMP)
```

**Performance Indexes**
- `idx_audit_logs_user_id`: Fast queries by user
- `idx_audit_logs_email`: Search by email
- `idx_audit_logs_action`: Filter by action type
- `idx_audit_logs_entity_type`: Filter by entity type
- `idx_audit_logs_entity_id`: Find logs for specific entity
- `idx_audit_logs_created_at`: Sort by time
- `idx_audit_logs_user_created`: Composite for common queries

**RLS Policies**
1. ✅ Admins/project_managers can VIEW ALL logs
2. ✅ Users can VIEW ONLY their own logs
3. ✅ Service role ONLY for INSERT (enforces server-side logging)

### Apply Migration to Database
```bash
cd "/Users/adwaitparchure/Adwait Work/TLP APP/AppV2/TLPAppV2"
npx supabase db push
```

## 🔧 Phase 2: Server Action for Logging (COMPLETED)

### Created: `app/actions/audit-log.ts`

**Key Functions:**

#### `logAuditEvent(data: AuditLogData)`
Logs any user action to the database.

```typescript
await logAuditEvent({
    action: 'create',
    entityType: 'task',
    entityId: task.id,
    entityName: task.title,
    status: 'success',
    newValues: { title, project_id, priority },
    details: { description, due_date },
})
```

#### `getAuditLogs(filters?)`
Retrieve audit logs (admin only).

```typescript
const { data, count } = await getAuditLogs({
    userId: 'user-123',
    action: 'upload',
    entityType: 'file',
    fromDate: '2024-12-19T00:00:00Z',
    limit: 100
})
```

## 📝 Phase 3: Integration in Codebase (COMPLETED)

### Files Updated with Logging

#### 1. `app/actions/employee-tasks.ts`
- ✅ `createTask()`: Logs task creation
- ✅ `deleteTask()`: Logs task deletion
- ✅ `reviewProjectProposal()`: Logs approval/rejection

```typescript
await logAuditEvent({
    action: 'create',
    entityType: 'task',
    entityId: task.id,
    entityName: task.title,
    status: 'success',
    newValues: { title, project_id, proposed_project_name },
})
```

#### 2. `components/projects/file-manager.tsx`
- ✅ `handleFileUpload()`: Logs file uploads
- ✅ `handleDeleteFile()`: Logs file deletions

```typescript
await logAuditEvent({
    action: 'upload',
    entityType: 'file',
    entityId: file.id,
    entityName: file.file_name,
    status: 'success',
    newValues: { file_name, file_size, file_category },
})
```

#### 3. Ready for Integration
- `app/actions/create-client.ts`: Log client creation
- `app/actions/create-team-member.ts`: Log team member assignment
- `app/auth/login`: Log user login
- `app/auth/logout`: Log user logout

## 📊 Phase 4: Google Sheets Integration (READY TO SETUP)

### Option A: Using Google Sheets API (Recommended)

#### Step 1: Create Google Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project: "TLP App Audit Logging"
3. Enable APIs:
   - Google Sheets API
   - Google Drive API
4. Create Service Account (IAM & Admin → Service Accounts)
5. Generate JSON key file
6. Share your Google Sheet with the service account email

#### Step 2: Set Environment Variables

```bash
# Add to .env.local
GOOGLE_SHEETS_ID="1A2B3C4D5E6F7G8H9I0J"  # From URL: /spreadsheets/d/{ID}/edit
GOOGLE_SHEETS_API_KEY="YOUR_API_KEY"
GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL="sa@project.iam.gserviceaccount.com"
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
```

#### Step 3: Update `logAuditEvent()` Function

The `syncToGoogleSheets()` function in `audit-log.ts` is ready. Just uncomment and configure:

```typescript
// In app/actions/audit-log.ts, the function already:
// 1. Checks for GOOGLE_SHEETS_ID and API key
// 2. Formats log data for sheets
// 3. Appends rows to sheet
// 4. Handles errors gracefully
```

### Option B: Using Zapier/Make.com

1. Create Zap that triggers on Supabase webhook
2. Format audit log data
3. Append to Google Sheet
4. **No code required** - manages permissions & sheets automatically

## 📈 Phase 5: Admin Dashboard for Logs (TODO)

### Create Audit Log Viewer
- Location: `app/dashboard/admin/audit-logs/page.tsx`
- Features:
  - Filter by user, action, entity type, date range
  - Real-time log updates
  - Export to CSV/JSON
  - Search across all fields

### Create Component: `components/audit/audit-log-viewer.tsx`
- Display logs in table format
- Sorting & pagination
- Detailed view of old/new values
- Status indicator (success/error)

## 🧪 Testing

### Manual Test: Log a Task Creation
```bash
# 1. Create task in employee dashboard
# 2. Check database:
SELECT * FROM audit_logs 
WHERE entity_type = 'task' 
ORDER BY created_at DESC 
LIMIT 1;

# 3. Verify fields:
# - action: 'create'
# - status: 'success'
# - new_values: contains task data
# - user_email: logged in user
```

### Manual Test: View User's Own Logs
```typescript
// In browser console:
const logs = await fetch('/api/audit-logs?userId=USER_ID');
const data = await logs.json();
console.log(data); // Should show only this user's logs
```

## 🔒 Security Notes

### RLS Protects Data
- Users **cannot** query other users' logs
- Admins **can** query all logs
- Service role **only** inserts (prevents tampering)

### Best Practices
- ✅ Always use server actions for logging (not client-side)
- ✅ Log both success AND errors
- ✅ Include context (entity ID, old values)
- ✅ Never log sensitive data (passwords, tokens)
- ✅ Catch logging failures to prevent main operations from failing

## 📞 Support

### Common Issues

**Q: Logs not showing in database?**
A: 
1. Verify migration applied: `npx supabase db push`
2. Check RLS policies: `SELECT * FROM pg_policies WHERE tablename = 'audit_logs'`
3. Ensure you're logged in as admin when querying

**Q: How to export logs?**
A:
```typescript
const { data } = await getAuditLogs({ limit: 1000 });
// Convert to CSV and download
```

**Q: Can I sync to Google Sheets?**
A: Yes! Set up Google Sheets API credentials in `.env.local` and logs will auto-sync

## 📊 Sample Queries

### All tasks created by a user
```sql
SELECT * FROM audit_logs
WHERE action = 'create'
  AND entity_type = 'task'
  AND user_email = 'user@example.com'
ORDER BY created_at DESC;
```

### All file uploads today
```sql
SELECT * FROM audit_logs
WHERE action = 'upload'
  AND entity_type = 'file'
  AND DATE(created_at) = CURRENT_DATE
ORDER BY created_at DESC;
```

### Failed operations (errors)
```sql
SELECT * FROM audit_logs
WHERE status = 'error'
ORDER BY created_at DESC
LIMIT 50;
```

### Most active users
```sql
SELECT user_email, COUNT(*) as actions
FROM audit_logs
WHERE DATE(created_at) = CURRENT_DATE
GROUP BY user_email
ORDER BY actions DESC;
```

## 🎯 Next Steps

1. ✅ Apply migration to database: `npx supabase db push`
2. ✅ Test logging with task creation/deletion
3. ⏭️ Set up Google Sheets integration (optional)
4. ⏭️ Create admin audit log dashboard
5. ⏭️ Add logging to remaining actions (login, file download, etc.)

---

**Status:** Phase 1-3 Complete ✅ | Phase 4-5 Ready to Start 🚀
