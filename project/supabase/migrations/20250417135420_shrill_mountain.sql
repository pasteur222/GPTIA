/*
  # Fix user_profiles permissions
  
  1. Changes
    - Drop existing policies
    - Create new policies with correct permissions
    - Add public access for registration
    - Fix permission denied errors
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable insert for registration" ON user_profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON user_profiles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON user_profiles;
DROP POLICY IF EXISTS "Enable read access for own profile" ON user_profiles;
DROP POLICY IF EXISTS "Enable update for own profile" ON user_profiles;
DROP POLICY IF EXISTS "Enable profile access" ON user_profiles;
DROP POLICY IF EXISTS "Enable profile updates" ON user_profiles;
DROP POLICY IF EXISTS "Allow users to view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Allow users to update own profile" ON user_profiles;

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create new policies
CREATE POLICY "Public registration insert"
ON user_profiles
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Read own profile"
ON user_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Update own profile"
ON user_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON user_profiles TO authenticated;

-- Add admin policies
CREATE POLICY "Admin read access"
ON user_profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND raw_user_meta_data->>'is_admin' = 'true'
  )
);

CREATE POLICY "Admin write access"
ON user_profiles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND raw_user_meta_data->>'is_admin' = 'true'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND raw_user_meta_data->>'is_admin' = 'true'
  )
);