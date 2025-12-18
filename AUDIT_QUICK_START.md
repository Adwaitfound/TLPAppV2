# 🚀 Audit Logging - Quick Reference

## ✅ Already Deployed & Working

Your app is **automatically logging** these 5 actions:
- ✅ Task creation
- ✅ Task deletion  
- ✅ Project proposal approval/rejection
- ✅ File uploads
- ✅ File deletions

**No manual setup needed!** Logging happens automatically in the background.

---

## 📊 View Logs (Admin Only)

### In Browser Console
```javascript
// Get your own logs (everyone can do this)
const { logAuditEvent, getAuditLogs } = await import("@/app/actions/audit-log")
const logs = await getAuditLogs()
console.log(logs.data)
```

### In SQL (Supabase)
```sql
-- See what you did today
SELECT * FROM audit_logs 
WHERE user_email = 'your@email.com'
AND DATE(created_at) = CURRENT_DATE
ORDER BY created_at DESC;

-- Admin: See errors
SELECT * FROM audit_logs 
WHERE status = 'error'
ORDER BY created_at DESC LIMIT 10;
```

---

## 🔧 Add Logging to New Actions

### Step 1: Import
```typescript
import { logAuditEvent } from "@/app/actions/audit-log"
```

### Step 2: Log After Your Operation
```typescript
// When client is created:
await logAuditEvent({
    action: 'create',
    entityType: 'client',
    entityId: client.id,
    entityName: client.name,
    status: 'success',
    newValues: { name: client.name, email: client.email }
}).catch(e => console.warn('Logging failed:', e))

// When something fails:
await logAuditEvent({
    action: 'delete',
    entityType: 'client',
    entityId: clientId,
    status: 'error',
    errorMessage: error.message
}).catch(e => console.warn('Logging failed:', e))
```

---

## 📈 Analytics Queries

### Who did what today?
```sql
SELECT user_email, COUNT(*) as actions
FROM audit_logs
WHERE DATE(created_at) = CURRENT_DATE
GROUP BY user_email ORDER BY actions DESC;
```

### How many files uploaded?
```sql
SELECT COUNT(*) FROM audit_logs 
WHERE action = 'upload' AND DATE(created_at) = CURRENT_DATE;
```

### Any errors in the last hour?
```sql
SELECT * FROM audit_logs
WHERE status = 'error'
AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

---

## 🌐 Export to Google Sheets

1. Create a Google Sheet
2. Get Sheet ID from URL
3. Add to `.env.local`:
```bash
GOOGLE_SHEETS_ID="your-sheet-id"
GOOGLE_SHEETS_API_KEY="your-api-key"
```
4. **Done!** Logs auto-sync to sheets

---

## 📁 Files

- `app/actions/audit-log.ts` - Logging functions
- `supabase/migrations/20251219000000_create_audit_logs.sql` - Database table
- `AUDIT_LOGGING_COMPLETE.md` - Full documentation

---

## ❓ FAQ

**Q: Can I view other users' logs?**  
A: Only if you're admin (RLS security)

**Q: Does logging slow the app?**  
A: No, it's async and failure-safe

**Q: How far back do logs go?**  
A: Forever (you can manually delete old ones)

**Q: How do I log a new action?**  
A: Import `logAuditEvent`, call it after your operation (see examples above)

---

**Status**: ✅ Deployed & Operational  
**Actions Logged**: 5 (auto)  
**Data Security**: RLS Protected  
**Ready for**: Google Sheets export
