-- COMPREHENSIVE FIX FOR INVOICES RLS AND UNIQUE CONSTRAINT
-- Run this in Supabase Dashboard SQL Editor

-- 1. Drop old problematic function
DROP FUNCTION IF EXISTS public.is_adwait() CASCADE;

-- 2. Drop old policies
DROP POLICY IF EXISTS "Adwait can view invoices" ON invoices;
DROP POLICY IF EXISTS "Adwait can insert invoices" ON invoices;
DROP POLICY IF EXISTS "Adwait can update invoices" ON invoices;
DROP POLICY IF EXISTS "Adwait can delete invoices" ON invoices;
DROP POLICY IF EXISTS "Authenticated users can view invoices" ON invoices;
DROP POLICY IF EXISTS "Authenticated users can insert invoices" ON invoices;

-- 3. Remove UNIQUE constraint from invoice_number
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_invoice_number_key;

-- 4. Recreate RLS policies using auth.email() - FIXED VERSION
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
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR auth.email() = 'adwait@thelostproject.in'
  );

CREATE POLICY "Adwait can delete invoices" ON invoices
  FOR DELETE
  USING (
    auth.role() = 'service_role'
    OR auth.email() = 'adwait@thelostproject.in'
  );

-- 5. Fix storage RLS policies
DROP POLICY IF EXISTS "Adwait can read invoice PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Adwait can upload invoice PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Adwait can update invoice PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Adwait can delete invoice PDFs" ON storage.objects;

CREATE POLICY "Adwait can read invoice PDFs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'project-files'
    AND name LIKE 'invoices/%'
    AND (
      auth.role() = 'service_role' OR auth.email() = 'adwait@thelostproject.in'
    )
  );

CREATE POLICY "Adwait can upload invoice PDFs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'project-files'
    AND name LIKE 'invoices/%'
    AND (
      auth.role() = 'service_role' OR auth.email() = 'adwait@thelostproject.in'
    )
  );

CREATE POLICY "Adwait can update invoice PDFs"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'project-files'
    AND name LIKE 'invoices/%'
    AND (
      auth.role() = 'service_role' OR auth.email() = 'adwait@thelostproject.in'
    )
  );

CREATE POLICY "Adwait can delete invoice PDFs"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'project-files'
    AND name LIKE 'invoices/%'
    AND (
      auth.role() = 'service_role' OR auth.email() = 'adwait@thelostproject.in'
    )
  );
