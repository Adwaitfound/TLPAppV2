# Database Schema Fix

## Issue
The following errors were appearing when trying to save profile and company information:
- "Failed to save company information: Could not find the 'address' column of 'users' in the schema cache"
- "Failed to save profile: Could not find the 'bio' column of 'users' in the schema cache"

## Solution
Added missing columns to the `users` table.

## How to Apply

### Option 1: Using Supabase SQL Editor (Recommended)
1. Go to https://supabase.com/dashboard/project/frinqtylwgzquoxvqhxb/sql
2. Create a new query
3. Copy and paste the contents of `ADD_PROFILE_FIELDS.sql`
4. Click "Run"

### Option 2: Using Migration
The migration file `supabase/migrations/010_add_user_profile_fields.sql` has been created and can be pushed using:
```bash
supabase push
```

## Columns Added
- `phone` (TEXT)
- `bio` (TEXT)
- `address` (TEXT)
- `website` (TEXT)
- `industry` (TEXT)
- `tax_id` (TEXT)
- `company_size` (TEXT)

## Testing
After applying the migration:
1. Go to Settings page
2. Try updating Profile (with bio)
3. Try updating Company Information (with address, website, etc.)
4. Both should save without errors
