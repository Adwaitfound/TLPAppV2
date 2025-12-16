-- Restrict invoices access to a single admin email (adwait@thelostproject.in)
-- and keep service_role access for backend tasks.

-- Clean up prior broad policies
DROP POLICY IF EXISTS "Authenticated users can view invoices" ON invoices;
DROP POLICY IF EXISTS "Authenticated users can insert invoices" ON invoices;
DROP POLICY IF EXISTS "Adwait can view invoices" ON invoices;
DROP POLICY IF EXISTS "Adwait can insert invoices" ON invoices;
DROP POLICY IF EXISTS "Adwait can delete invoices" ON invoices;
DROP POLICY IF EXISTS "Adwait can update invoices" ON invoices;

-- Helper predicate
CREATE OR REPLACE FUNCTION public.is_adwait()
RETURNS boolean
LANGUAGE sql
AS $$
  SELECT coalesce(auth.jwt() ->> 'email', '') = 'adwait@thelostproject.in';
$$;

-- Select
CREATE POLICY "Adwait can view invoices" ON invoices
  FOR SELECT
  USING (
    auth.role() = 'service_role'
    OR public.is_adwait()
  );

-- Insert
CREATE POLICY "Adwait can insert invoices" ON invoices
  FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role'
    OR public.is_adwait()
  );

-- Update
CREATE POLICY "Adwait can update invoices" ON invoices
  FOR UPDATE
  USING (
    auth.role() = 'service_role'
    OR public.is_adwait()
  );

-- Delete
CREATE POLICY "Adwait can delete invoices" ON invoices
  FOR DELETE
  USING (
    auth.role() = 'service_role'
    OR public.is_adwait()
  );

-- Note: storage access for invoice PDFs (project-files bucket) is not enforced here.
-- If the bucket is private, add storage policies to restrict to this email as well.
