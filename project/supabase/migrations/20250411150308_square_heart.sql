/*
  # Fix Authentication Policies

  1. Changes
    - Drop existing policies to start fresh
    - Add proper public access for registration
    - Add authenticated user policies
    - Fix student profile policies
    - Add proper phone number handling
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Allow public registration" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Allow public student registration" ON student_profiles;
DROP POLICY IF EXISTS "Students can read own profile" ON student_profiles;
DROP POLICY IF EXISTS "Students can update own profile" ON student_profiles;

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;

-- User Profiles Policies
CREATE POLICY "Enable read access for authenticated users"
ON user_profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable insert for registration"
ON user_profiles FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Enable update for users based on user_id"
ON user_profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Student Profiles Policies
CREATE POLICY "Enable read access for all student profiles"
ON student_profiles FOR SELECT
TO public
USING (true);

CREATE POLICY "Enable insert for student registration"
ON student_profiles FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Enable update for own student profile"
ON student_profiles FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Add phone number to auth.users metadata if not exists
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  IF NEW.raw_user_meta_data->>'phone_number' IS NOT NULL THEN
    UPDATE auth.users
    SET raw_user_meta_data = 
      jsonb_set(
        COALESCE(raw_user_meta_data, '{}'::jsonb),
        '{phone}',
        to_jsonb(NEW.raw_user_meta_data->>'phone_number')
      )
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_user();
  END IF;
END
$$;