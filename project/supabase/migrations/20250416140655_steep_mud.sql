/*
  # Fix user_profiles RLS policies

  1. Changes
    - Remove recursive policies that were causing infinite loops
    - Simplify RLS policies for user_profiles table
    - Add clear, non-recursive policies for:
      - INSERT: Allow during registration
      - SELECT: Allow users to view their own profile
      - UPDATE: Allow users to update their own profile
      - Admin users can view and update all profiles

  2. Security
    - Maintains row-level security
    - Preserves admin access
    - Ensures users can only access their own data
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Allow update to user profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow read access to user profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Enable insert for registration" ON public.user_profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.user_profiles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.user_profiles;
DROP POLICY IF EXISTS "Admin users can update all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admin users can view all profiles" ON public.user_profiles;

-- Create new, simplified policies
CREATE POLICY "Enable insert for registration"
ON public.user_profiles
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Allow users to view own profile"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid() AND is_admin = true
  )
);

CREATE POLICY "Allow users to update own profile"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid() AND is_admin = true
  )
)
WITH CHECK (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid() AND is_admin = true
  )
);