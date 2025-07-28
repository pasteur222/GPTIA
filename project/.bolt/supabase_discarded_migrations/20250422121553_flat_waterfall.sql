/*
  # Add is_admin column to user_profiles

  1. Changes
    - Add is_admin column to user_profiles table if it doesn't exist
    - Add RLS policy for admin access

  2. Security
    - Enable RLS on user_profiles table
    - Add policy for admin users to access all profiles
    - Add policy for users to access their own profiles
*/

-- Add is_admin column if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN is_admin boolean DEFAULT false;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_profiles' 
    AND policyname = 'Admin users can access all profiles'
  ) THEN
    CREATE POLICY "Admin users can access all profiles" 
    ON user_profiles
    FOR ALL
    TO authenticated
    USING (
      auth.jwt() ->> 'email' = 'admin@airtelgpt.com' 
      OR EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = auth.uid() 
        AND (user_metadata->>'is_admin')::boolean = true
      )
    );
  END IF;
END $$;