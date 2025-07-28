/*
  # Create Admin User
  
  1. Changes
    - Create admin user in auth.users if not exists
    - Set admin metadata
    - Create admin profile in user_profiles
    
  2. Security
    - Set admin flag to true
    - Ensure proper permissions
*/

-- Create admin user function
CREATE OR REPLACE FUNCTION create_admin_user()
RETURNS void AS $$
DECLARE
  admin_user_id uuid;
  admin_email text := 'admin@airtelgpt.com';
  admin_password text := 'Admin123!'; -- This should be changed after first login
BEGIN
  -- Check if admin user already exists
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = admin_email;
  
  -- Create admin user if not exists
  IF admin_user_id IS NULL THEN
    INSERT INTO auth.users (
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      admin_email,
      crypt(admin_password, gen_salt('bf')),
      now(),
      '{"provider": "email", "providers": ["email"]}',
      '{"is_admin": true, "first_name": "Admin", "last_name": "User"}',
      now(),
      now()
    )
    RETURNING id INTO admin_user_id;
  END IF;
  
  -- Create or update admin profile
  IF admin_user_id IS NOT NULL THEN
    INSERT INTO user_profiles (
      user_id,
      first_name,
      last_name,
      email,
      is_admin,
      created_at,
      updated_at
    ) VALUES (
      admin_user_id,
      'Admin',
      'User',
      admin_email,
      true,
      now(),
      now()
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET
      is_admin = true,
      updated_at = now();
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute the function
SELECT create_admin_user();

-- Drop the function after use
DROP FUNCTION IF EXISTS create_admin_user();

-- Ensure admin has access to all tables
DO $$
DECLARE
  table_name text;
BEGIN
  FOR table_name IN 
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('
      DROP POLICY IF EXISTS "Admin has full access to %1$s" ON %1$s;
      CREATE POLICY "Admin has full access to %1$s" 
      ON %1$s 
      FOR ALL 
      TO authenticated 
      USING (
        EXISTS (
          SELECT 1 FROM user_profiles 
          WHERE user_id = auth.uid() 
          AND is_admin = true
        )
      );
    ', table_name);
  END LOOP;
END $$;