/*
  # Create profile images storage bucket

  1. New Storage Bucket
    - Creates a new storage bucket named 'profile-images' for storing user profile pictures
    - Sets appropriate security policies for authenticated users
  
  2. Security
    - Enables row level security
    - Adds policies for:
      - Authenticated users can upload their own profile images
      - Authenticated users can read any profile image
      - Users can only update/delete their own profile images
*/

-- Create the storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-images', 'profile-images', true)
ON CONFLICT (id) DO NOTHING;

-- Set up security policies
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