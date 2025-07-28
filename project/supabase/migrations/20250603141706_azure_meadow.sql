-- Add logo_url column to app_settings table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'app_settings' 
    AND column_name = 'logo_url'
  ) THEN
    ALTER TABLE app_settings ADD COLUMN logo_url text;
  END IF;
END $$;

-- Create public storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('public', 'public', true)
ON CONFLICT (id) DO NOTHING;

-- Set up security policies for public bucket
DO $$
BEGIN
  -- Policy for uploading files
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Anyone can upload to public bucket'
    AND tablename = 'objects'
    AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Anyone can upload to public bucket"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'public');
  END IF;

  -- Policy for viewing files
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Anyone can view files in public bucket'
    AND tablename = 'objects'
    AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Anyone can view files in public bucket"
    ON storage.objects FOR SELECT TO public
    USING (bucket_id = 'public');
  END IF;

  -- Policy for updating files
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Authenticated users can update files in public bucket'
    AND tablename = 'objects'
    AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Authenticated users can update files in public bucket"
    ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'public')
    WITH CHECK (bucket_id = 'public');
  END IF;

  -- Policy for deleting files
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Authenticated users can delete files in public bucket'
    AND tablename = 'objects'
    AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Authenticated users can delete files in public bucket"
    ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'public');
  END IF;
END $$;