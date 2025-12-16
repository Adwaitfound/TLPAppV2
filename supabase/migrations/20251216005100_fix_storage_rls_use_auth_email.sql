-- Fix storage RLS policies to use auth.email() instead of custom JWT extraction

-- Drop old function and policies
DROP FUNCTION IF EXISTS public.is_adwait() CASCADE;

DROP POLICY IF EXISTS "Adwait can read invoice PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Adwait can upload invoice PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Adwait can update invoice PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Adwait can delete invoice PDFs" ON storage.objects;

-- Recreate policies using auth.email()
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
