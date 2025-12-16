-- Make the project-files bucket public for simpler access
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('project-files', 'project-files', true)
  ON CONFLICT (id) DO UPDATE SET public = true;
END $$;

-- Optional: allow public SELECTs via REST (not needed for public URL access)
-- Keeps write actions protected.
DROP POLICY IF EXISTS "Public read project files" ON storage.objects;
CREATE POLICY "Public read project files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'project-files');
