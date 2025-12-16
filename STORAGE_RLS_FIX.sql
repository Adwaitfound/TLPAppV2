-- QUICK FIX: Simplify storage RLS to allow service role access
-- Run this in Supabase SQL Editor if migrations don't work

DROP POLICY IF EXISTS "Adwait can read invoice PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Adwait can upload invoice PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Adwait can update invoice PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Adwait can delete invoice PDFs" ON storage.objects;

CREATE POLICY "Allow uploads" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'project-files'
    AND (auth.role() = 'service_role' OR auth.role() = 'authenticated')
  );

CREATE POLICY "Allow reads" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'project-files'
    AND (auth.role() = 'service_role' OR auth.role() = 'authenticated')
  );

CREATE POLICY "Allow deletes" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'project-files'
    AND (auth.role() = 'service_role' OR auth.role() = 'authenticated')
  );
