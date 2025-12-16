-- Restrict Storage access for invoice PDFs to only adwait@thelostproject.in
-- Scope: only objects under `project-files` bucket with path prefix `invoices/`

-- Ensure bucket exists and is private
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('project-files', 'project-files', false)
  ON CONFLICT (id) DO UPDATE SET public = false;
END $$;

-- Helper predicate to check email from JWT
CREATE OR REPLACE FUNCTION public.is_adwait()
RETURNS boolean
LANGUAGE sql
AS $$
  SELECT coalesce(auth.jwt() ->> 'email', '') = 'adwait@thelostproject.in';
$$;

-- Clean up any prior policies with these names
DROP POLICY IF EXISTS "Adwait can read invoice PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Adwait can upload invoice PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Adwait can update invoice PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Adwait can delete invoice PDFs" ON storage.objects;

-- Read
CREATE POLICY "Adwait can read invoice PDFs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'project-files'
    AND name LIKE 'invoices/%'
    AND (
      auth.role() = 'service_role' OR public.is_adwait()
    )
  );

-- Insert (upload)
CREATE POLICY "Adwait can upload invoice PDFs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'project-files'
    AND name LIKE 'invoices/%'
    AND (
      auth.role() = 'service_role' OR public.is_adwait()
    )
  );

-- Update (replace/metadata)
CREATE POLICY "Adwait can update invoice PDFs"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'project-files'
    AND name LIKE 'invoices/%'
    AND (
      auth.role() = 'service_role' OR public.is_adwait()
    )
  );

-- Delete
CREATE POLICY "Adwait can delete invoice PDFs"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'project-files'
    AND name LIKE 'invoices/%'
    AND (
      auth.role() = 'service_role' OR public.is_adwait()
    )
  );
