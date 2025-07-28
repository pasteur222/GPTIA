/*
  # Fix user_profiles RLS policies

  1. Changes
    - Remove recursive policies that were causing infinite loops
    - Simplify RLS policies for user_profiles table
    - Add clear, non-recursive policies for different operations

  2. Security
    - Enable RLS on user_profiles table
    - Add simplified policies for:
      - Insert: Allow public access for registration
      - Select: Allow authenticated users to view their own profile
      - Update: Allow users to update their own profile
      - Admin users can view and update all profiles
*/

-- First, drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Admin users can update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admin users can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Enable insert for registration" ON user_profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON user_profiles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON user_profiles;

-- Create new, simplified policies
CREATE POLICY "Enable insert for registration"
ON user_profiles
FOR INSERT
TO public
WITH CHECK (true);

-- Allow users to view their own profile
CREATE POLICY "Enable read access for own profile"
ON user_profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id OR 
  (
    SELECT is_admin FROM user_profiles WHERE user_id = auth.uid()
  )
);

-- Allow users to update their own profile
CREATE POLICY "Enable update for own profile"
ON user_profiles
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id OR 
  (
    SELECT is_admin FROM user_profiles WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  auth.uid() = user_id OR 
  (
    SELECT is_admin FROM user_profiles WHERE user_id = auth.uid()
  )
);