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

-- Create logos storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', false)
ON CONFLICT (id) DO NOTHING;

-- Set up security policies for logos bucket
DO $$
BEGIN
  -- Policy for uploading files
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Authenticated users can upload logos'
    AND tablename = 'objects'
    AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Authenticated users can upload logos"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'logos');
  END IF;

  -- Policy for viewing files
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Authenticated users can view logos'
    AND tablename = 'objects'
    AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Authenticated users can view logos"
    ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'logos');
  END IF;

  -- Policy for updating files
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Authenticated users can update logos'
    AND tablename = 'objects'
    AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Authenticated users can update logos"
    ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'logos')
    WITH CHECK (bucket_id = 'logos');
  END IF;

  -- Policy for deleting files
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Authenticated users can delete logos'
    AND tablename = 'objects'
    AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Authenticated users can delete logos"
    ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'logos');
  END IF;
END $$;