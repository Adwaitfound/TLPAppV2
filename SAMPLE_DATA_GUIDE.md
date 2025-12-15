# Sample Data Guide

This guide explains how to populate your database with sample data to see the admin dashboard in action.

## Prerequisites

- Supabase project set up and connected
- Database schema migrated (run `npm run setup:db` if not done)

## Adding Sample Data

### Method 1: Using Supabase SQL Editor (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the contents of `/scripts/add-sample-data.sql`
5. Paste into the SQL editor
6. Click **Run** or press `Cmd/Ctrl + Enter`

### Method 2: Using psql (Command Line)

If you have direct database access:

```bash
psql YOUR_DATABASE_CONNECTION_STRING < scripts/add-sample-data.sql
```

## What's Included

The sample data includes:

### Clients (6 companies)
- Tech Innovations Inc
- Creative Studios LLC
- Global Marketing Group
- StartUp Ventures
- Enterprise Solutions
- Digital Media Co

### Projects (18 projects)
- Various statuses: planning, in_progress, in_review, completed
- Different budget ranges
- Realistic timelines and deadlines
- Progress tracking

### Invoices (13 invoices)
- **Paid** (7): Historical revenue data
- **Sent** (3): Pending invoices
- **Draft** (2): Invoices being prepared
- **Overdue** (1): Past due invoice

### Milestones (25+ milestones)
- Completed, in-progress, and pending statuses
- Upcoming deadlines for dashboard visibility
- Connected to active projects

### Invoice Items
- Detailed line items for select invoices
- Realistic service descriptions and pricing

## Expected Dashboard Metrics

After adding sample data, you should see approximately:

- **Total Revenue**: ~$400,000+ (from paid invoices)
- **Active Projects**: 6-8 projects
- **Total Clients**: 6 clients
- **Pending Invoices**: ~$130,000
- **Monthly Revenue**: Varies based on when you run it
- **Projects On Track**: Varies
- **Delayed Projects**: 0-2 (depends on current date)

## Viewing the Dashboard

1. Make sure your development server is running: `npm run dev`
2. Log in as an admin user
3. Navigate to the Admin Dashboard
4. Explore the different tabs:
   - **Overview**: Recent activity, upcoming milestones, project status breakdown
   - **Projects**: All 18 projects with detailed information
   - **Invoices**: All 13 invoices with payment status
   - **Clients**: All 6 clients with project counts and revenue

## Customizing Sample Data

To modify the sample data:

1. Edit `/scripts/add-sample-data.sql`
2. Change company names, project details, amounts, etc.
3. Re-run the SQL script
4. Note: The script uses `ON CONFLICT DO NOTHING`, so existing data won't be overwritten
5. To start fresh, you may need to delete existing data first

## Clearing Sample Data

To remove all sample data and start over:

```sql
-- Delete in reverse order of dependencies
DELETE FROM invoice_items;
DELETE FROM milestones;
DELETE FROM invoices;
DELETE FROM projects;
DELETE FROM clients;
```

Then re-run the sample data script.

## Notes

- All UUIDs in the sample data are hardcoded for consistency
- Dates are relative to when the script is run (using PostgreSQL intervals)
- Client total_projects and total_revenue are automatically calculated at the end
- The script is idempotent (safe to run multiple times)

## Troubleshooting

### Data Not Showing Up

1. Check that you're logged in as an admin user
2. Verify the SQL script ran without errors
3. Check browser console for any API errors
4. Ensure RLS policies allow reading the data

### Permission Errors

If you get permission errors:
- Make sure your user has the correct role
- Verify RLS policies are set up correctly
- Check that you're authenticated

### Foreign Key Errors

If you get foreign key constraint errors:
- Ensure the database schema is properly set up
- Run migrations in order: `npm run setup:db`
- Check that referenced IDs exist
