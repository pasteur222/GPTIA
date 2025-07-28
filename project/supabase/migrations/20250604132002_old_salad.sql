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

-- Create public profile-images bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-images', 'profile-images', true)
ON CONFLICT (id) DO NOTHING;

-- Set up security policies for profile-images bucket
DO $$
BEGIN
  -- Policy for uploading images
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Authenticated users can upload their own profile images'
    AND tablename = 'objects'
    AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Authenticated users can upload their own profile images"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'profile-images' AND
      (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;

  -- Policy for viewing images
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Anyone can view profile images'
    AND tablename = 'objects'
    AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Anyone can view profile images"
    ON storage.objects FOR SELECT TO public
    USING (bucket_id = 'profile-images');
  END IF;

  -- Policy for updating images
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can update their own profile images'
    AND tablename = 'objects'
    AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Users can update their own profile images"
    ON storage.objects FOR UPDATE TO authenticated
    USING (
      bucket_id = 'profile-images' AND
      (storage.foldername(name))[1] = auth.uid()::text
    )
    WITH CHECK (
      bucket_id = 'profile-images' AND
      (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;

  -- Policy for deleting images
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can delete their own profile images'
    AND tablename = 'objects'
    AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Users can delete their own profile images"
    ON storage.objects FOR DELETE TO authenticated
    USING (
      bucket_id = 'profile-images' AND
      (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;
END $$;