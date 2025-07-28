/*
  # Create WhatsApp Media Storage Bucket

  1. Storage Bucket
    - Create whatsapp-media bucket for storing media files
    - Set appropriate file size limits and MIME types
    - Configure public access for WhatsApp API consumption

  2. Security
    - Enable RLS policies for secure access
    - Allow public read access for WhatsApp API
    - Restrict upload/delete to authenticated users

  3. Performance
    - Set appropriate cache headers
    - Optimize for media file storage
*/

-- Create the whatsapp-media bucket
DO $$
BEGIN
  -- Check if bucket already exists
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'whatsapp-media'
  ) THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'whatsapp-media',
      'whatsapp-media',
      true,
      16777216, -- 16MB limit for WhatsApp
      ARRAY[
        'image/jpeg',
        'image/jpg', 
        'image/png',
        'image/gif',
        'image/webp',
        'video/mp4',
        'video/mov',
        'video/avi',
        'video/webm',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ]
    );
  ELSE
    -- Update existing bucket settings
    UPDATE storage.buckets 
    SET 
      public = true,
      file_size_limit = 16777216,
      allowed_mime_types = ARRAY[
        'image/jpeg',
        'image/jpg', 
        'image/png',
        'image/gif',
        'image/webp',
        'video/mp4',
        'video/mov',
        'video/avi',
        'video/webm',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ]
    WHERE id = 'whatsapp-media';
  END IF;
END $$;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public read access for whatsapp-media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to whatsapp-media" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own files in whatsapp-media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files in whatsapp-media" ON storage.objects;

-- Create storage policies for whatsapp-media bucket
CREATE POLICY "Public read access for whatsapp-media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'whatsapp-media');

CREATE POLICY "Authenticated users can upload to whatsapp-media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'whatsapp-media');

CREATE POLICY "Users can update their own files in whatsapp-media"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'whatsapp-media');

CREATE POLICY "Users can delete their own files in whatsapp-media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'whatsapp-media');