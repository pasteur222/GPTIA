/*
  # Fix User Profiles RLS for Registration

  1. Security Changes
    - Add policy to allow public registration
    - Keep existing policies for authenticated users
*/

-- Add policy for public registration
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_profiles' 
    AND policyname = 'Allow public registration'
  ) THEN
    CREATE POLICY "Allow public registration"
    ON user_profiles
    FOR INSERT
    TO public
    WITH CHECK (true);
  END IF;
END $$;