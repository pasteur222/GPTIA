/*
  # Add Admin Role and Initial Admin User
  
  1. Changes
    - Add is_admin column to user_profiles
    - Add admin-specific policies
    - Create initial admin user safely
    - Handle existing admin cases
*/

-- Add is_admin column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN is_admin boolean DEFAULT false;
  END IF;
END $$;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Admin users can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admin users can update all profiles" ON user_profiles;

-- Create admin-specific policies
CREATE POLICY "Admin users can view all profiles"
ON user_profiles
FOR SELECT
TO authenticated
USING (
  (EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND is_admin = true
  ))
  OR user_id = auth.uid()
);

CREATE POLICY "Admin users can update all profiles"
ON user_profiles
FOR UPDATE
TO authenticated
USING (
  (EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND is_admin = true
  ))
  OR user_id = auth.uid()
);

-- Function to safely create admin user
CREATE OR REPLACE FUNCTION create_admin_user()
RETURNS void AS $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Check if admin already exists
  IF NOT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE email = 'admin@airtelgpt.com'
  ) THEN
    -- Create admin user in auth.users
    INSERT INTO auth.users (
      email,
      encrypted_password,
      email_confirmed_at,
      raw_user_meta_data,
      created_at,
      updated_at
    ) VALUES (
      'admin@airtelgpt.com',
      crypt('Admin123!', gen_salt('bf')),
      now(),
      jsonb_build_object(
        'is_admin', true,
        'first_name', 'Admin',
        'last_name', 'User'
      ),
      now(),
      now()
    )
    RETURNING id INTO admin_user_id;

    -- Create admin profile
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
      'admin@airtelgpt.com',
      true,
      now(),
      now()
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Execute the function
SELECT create_admin_user();

-- Drop the function after use
DROP FUNCTION IF EXISTS create_admin_user();