/*
  # Fix User Profiles RLS Policy

  1. Security Changes
    - Enable RLS on user_profiles table if not already enabled
    - Add policies for user_profiles table if they don't exist
*/

-- Enable RLS if not already enabled
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'user_profiles' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Create policies if they don't exist
DO $$ 
BEGIN
  -- Insert policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_profiles' 
    AND policyname = 'Users can insert own profile'
  ) THEN
    CREATE POLICY "Users can insert own profile"
    ON user_profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
  END IF;

  -- Select policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_profiles' 
    AND policyname = 'Users can read own profile'
  ) THEN
    CREATE POLICY "Users can read own profile"
    ON user_profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;

  -- Update policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_profiles' 
    AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile"
    ON user_profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;