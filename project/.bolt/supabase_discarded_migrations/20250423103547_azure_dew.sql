/*
  # Fix Registration RLS Policies (version corrigée)

  1. Security Changes
    - Supprimer les politiques existantes
    - Activer RLS
    - Créer les politiques en évitant les doublons
*/

-- USER_PROFILES ---

DROP POLICY IF EXISTS "Allow public registration" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

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

-- STUDENT_PROFILES ---

DROP POLICY IF EXISTS "Allow public student registration" ON student_profiles;
DROP POLICY IF EXISTS "Students can read own profile" ON student_profiles;
DROP POLICY IF EXISTS "Students can update own profile" ON student_profiles;

ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;

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

-- STUDENT_SUBSCRIPTIONS ---

DROP POLICY IF EXISTS "Users can view their own subscriptions" ON student_subscriptions;

ALTER TABLE student_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscriptions"
ON student_subscriptions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM student_profiles sp
    WHERE sp.id = student_subscriptions.student_id
    AND sp.phone_number = auth.jwt() ->> 'phone'
  )
);
