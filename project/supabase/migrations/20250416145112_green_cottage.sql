-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Allow users to view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Allow users to update own profile" ON user_profiles;
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

-- Allow users to read their own profile or if they are an admin
CREATE POLICY "Enable read access for own profile"
ON user_profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND (raw_user_meta_data->>'is_admin')::boolean = true
  )
);

-- Allow users to update their own profile or if they are an admin
CREATE POLICY "Enable update for own profile"
ON user_profiles
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND (raw_user_meta_data->>'is_admin')::boolean = true
  )
)
WITH CHECK (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND (raw_user_meta_data->>'is_admin')::boolean = true
  )
);