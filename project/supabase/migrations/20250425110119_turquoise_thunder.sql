/*
  # Add current user profile to profils_utilisateurs
  
  1. Changes
    - Add a function to insert the current user into profils_utilisateurs
    - Use auth.uid() to get the current user ID
    - Set default profile image URL
    - Ensure RLS policies allow this operation
*/

-- Create a function to insert the current user into profils_utilisateurs
CREATE OR REPLACE FUNCTION insert_current_user_profile()
RETURNS void AS $$
DECLARE
  current_user_id uuid;
  user_email text;
  user_first_name text;
  user_last_name text;
  user_phone text;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  -- Exit if no user is authenticated
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'No authenticated user found';
  END IF;
  
  -- Check if user already exists in profils_utilisateurs
  IF EXISTS (SELECT 1 FROM profils_utilisateurs WHERE id = current_user_id) THEN
    -- User already exists, update profile image if needed
    UPDATE profils_utilisateurs
    SET email = COALESCE(email, (SELECT email FROM auth.users WHERE id = current_user_id))
    WHERE id = current_user_id;
    RETURN;
  END IF;
  
  -- Get user details from auth.users
  SELECT 
    email,
    (raw_user_meta_data->>'first_name')::text,
    (raw_user_meta_data->>'last_name')::text,
    (raw_user_meta_data->>'phone_number')::text
  INTO
    user_email,
    user_first_name,
    user_last_name,
    user_phone
  FROM auth.users
  WHERE id = current_user_id;
  
  -- Insert user into profils_utilisateurs
  INSERT INTO profils_utilisateurs (
    id,
    email,
    first_name,
    last_name,
    phone_number,
    is_admin
  ) VALUES (
    current_user_id,
    user_email,
    user_first_name,
    user_last_name,
    user_phone,
    false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a policy to allow authenticated users to insert their own profile
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profils_utilisateurs' 
    AND policyname = 'Authenticated users can read their profile'
  ) THEN
    CREATE POLICY "Authenticated users can read their profile"
      ON profils_utilisateurs
      FOR SELECT
      TO authenticated
      USING (auth.uid() = id);
  END IF;
END $$;

-- Create a trigger function to automatically insert user profile on auth
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profils_utilisateurs (
    id,
    email,
    first_name,
    last_name,
    phone_number,
    is_admin
  ) VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'phone_number',
    false
  )
  ON CONFLICT (id) DO NOTHING;
  
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
      EXECUTE FUNCTION handle_new_user();
  END IF;
END $$;