/*
  # Fix RLS Policies for user_profiles
  
  1. Changes
    - Drop existing policies that cause recursion
    - Create new non-recursive policies
    - Maintain security while avoiding infinite loops
*/

-- Drop all existing policies on user_profiles
DROP POLICY IF EXISTS "Enable insert for registration" ON user_profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON user_profiles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON user_profiles;
DROP POLICY IF EXISTS "Admin users can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admin users can update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admin full access" ON user_profiles;

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create new non-recursive policies
CREATE POLICY "Enable insert for registration"
ON user_profiles
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Enable read access for own profile"
ON user_profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR 
  EXISTS (
    SELECT 1 FROM auth.users u 
    WHERE u.id = auth.uid() 
    AND (u.raw_user_meta_data->>'is_admin')::boolean = true
  )
);

CREATE POLICY "Enable update for own profile"
ON user_profiles
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  OR 
  EXISTS (
    SELECT 1 FROM auth.users u 
    WHERE u.id = auth.uid() 
    AND (u.raw_user_meta_data->>'is_admin')::boolean = true
  )
)
WITH CHECK (
  auth.uid() = user_id
  OR 
  EXISTS (
    SELECT 1 FROM auth.users u 
    WHERE u.id = auth.uid() 
    AND (u.raw_user_meta_data->>'is_admin')::boolean = true
  )
);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;