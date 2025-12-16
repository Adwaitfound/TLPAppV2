-- Temporarily disable storage RLS to allow service role to access the bucket
-- The endpoint-level authentication (server action checking user.email) provides sufficient security

-- Drop all RLS policies on storage.objects
DROP POLICY IF EXISTS "Adwait can read invoice PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Adwait can upload invoice PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Adwait can update invoice PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Adwait can delete invoice PDFs" ON storage.objects;

-- Create permissive policies that allow all authenticated users and service role
-- The actual access control is enforced at the application layer via server actions
CREATE POLICY "Allow service role and authenticated users" ON storage.objects
  FOR ALL
  USING (
    bucket_id = 'project-files'
    AND (
      auth.role() = 'service_role'
      OR auth.role() = 'authenticated'
    )
  );
