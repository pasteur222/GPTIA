/*
  # Fix Registration RLS Policies (version corrigée)

  1. Security Changes
    - Supprime les politiques existantes pour éviter les conflits
    - Réactive RLS si nécessaire
    - Recrée proprement les politiques
*/

-- Drop existing policies to avoid conflicts (user_profiles)
DROP POLICY IF EXISTS "Allow public registration" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

-- Drop existing policies to avoid conflicts (student_profiles)
DROP POLICY IF EXISTS "Allow public student registration" ON student_profiles;
DROP POLICY IF EXISTS "Students can read own profile" ON student_profiles;
DROP POLICY IF EXISTS "Students can update own profile" ON student_profiles;

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;

-- Recreate policies for user_profiles
CREATE POLICY "Allow public registration"
ON user_profiles
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Users can read own profile"
ON user_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
ON user_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Recreate policies for student_profiles
CREATE POLICY "Allow public student registration"
ON student_profiles
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Students can read own profile"
ON student_profiles
FOR SELECT
TO public
USING (true);

CREATE POLICY "Students can update own profile"
ON student_profiles
FOR UPDATE
TO authenticated
USING (phone_number = (auth.jwt() ->> 'phone')::text)
WITH CHECK (phone_number = (auth.jwt() ->> 'phone')::text);
