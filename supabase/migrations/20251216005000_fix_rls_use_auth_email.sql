-- Update RLS policies to use auth.email() instead of custom JWT extraction
-- This is more reliable for client-side operations

-- Drop old function and policies
DROP FUNCTION IF EXISTS public.is_adwait() CASCADE;

DROP POLICY IF EXISTS "Adwait can view invoices" ON invoices;
DROP POLICY IF EXISTS "Adwait can insert invoices" ON invoices;
DROP POLICY IF EXISTS "Adwait can update invoices" ON invoices;
DROP POLICY IF EXISTS "Adwait can delete invoices" ON invoices;

-- Recreate policies using auth.email() which is built-in and more reliable
CREATE POLICY "Adwait can view invoices" ON invoices
  FOR SELECT
  USING (
    auth.role() = 'service_role'
    OR auth.email() = 'adwait@thelostproject.in'
  );

CREATE POLICY "Adwait can insert invoices" ON invoices
  FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role'
    OR auth.email() = 'adwait@thelostproject.in'
  );

CREATE POLICY "Adwait can update invoices" ON invoices
  FOR UPDATE
  USING (
    auth.role() = 'service_role'
    OR auth.email() = 'adwait@thelostproject.in'
  );

CREATE POLICY "Adwait can delete invoices" ON invoices
  FOR DELETE
  USING (
    auth.role() = 'service_role'
    OR auth.email() = 'adwait@thelostproject.in'
  );
