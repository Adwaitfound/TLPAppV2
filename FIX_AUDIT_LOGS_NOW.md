# Fix Audit Logs Table - Quick Steps

## The Problem
The audit_logs table migration was listed but never actually created in the database. This is why:
1. No logs appear in Google Sheets
2. You see 404 errors when creating tasks
3. The audit system isn't working

## The Solution

### Step 1: Run SQL to Create Table
1. Go to: https://supabase.com/dashboard/project/frinqtylwgzquoxvqhxb/sql/new
2. Copy all the SQL from `CREATE_AUDIT_LOGS_TABLE.sql`
3. Paste into the SQL Editor
4. Click "Run" button

### Step 2: Share Google Sheet with Service Account
Make sure your Google Sheet is shared with:
```
tlp-audit-logger@video-production-app-b19b7.iam.gserviceaccount.com
```

To share:
1. Open: https://docs.google.com/spreadsheets/d/1Gh0YqCA6SoLGvGN1vkTFzEtM2yLeiVE_jjJPZnYUMQE/edit
2. Click "Share" button (top right)
3. Add the email above
4. Give it "Editor" access
5. Click "Send"

### Step 3: Add Column Headers to Google Sheet
1. Open the sheet: https://docs.google.com/spreadsheets/d/1Gh0YqCA6SoLGvGN1vkTFzEtM2yLeiVE_jjJPZnYUMQE/edit
2. In Row 1, add these headers:
   - A1: Timestamp
   - B1: User ID
   - C1: User Email
   - D1: Action
   - E1: Entity Type
   - F1: Entity Name
   - G1: Details
   - H1: Status
   - I1: Error

### Step 4: Test It
1. Restart your dev server (Ctrl+C, then `npm run dev`)
2. Create a new task in the app
3. Check your Google Sheet - you should see a new row with the task creation logged!

## What Gets Logged
Every time you:
- Create a task ✓
- Delete a task ✓
- Review a project proposal ✓
- Upload a file ✓
- Delete a file ✓

A row is automatically added to your Google Sheet with:
- When it happened
- Who did it
- What they did
- What entity (task/file/proposal)
- Additional details
- Success/error status

## Troubleshooting

**Still no logs in Google Sheet?**
1. Check dev server console for errors
2. Verify service account email is added to sheet
3. Make sure sheet ID is correct in .env.local: `1Gh0YqCA6SoLGvGN1vkTFzEtM2yLeiVE_jjJPZnYUMQE`

**Getting errors when creating tasks?**
1. Make sure you ran the SQL in Step 1
2. Check that table exists: Go to Supabase → Table Editor → Should see `audit_logs` table
