/*
  # Admin User Setup
  
  1. Changes
    - Create admin user in user_profiles if not exists
    - Set is_admin flag to true for admin user
    - Add policies to allow admin access to all features
    - Fix permissions for admin user
*/

-- Create admin user in user_profiles if not exists
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Check if admin user exists in auth.users
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'admin@airtelgpt.com';
  
  IF admin_user_id IS NOT NULL THEN
    -- Check if admin profile exists
    IF NOT EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = admin_user_id
    ) THEN
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
    ELSE
      -- Update existing profile to ensure admin flag is set
      UPDATE user_profiles
      SET is_admin = true
      WHERE user_id = admin_user_id;
    END IF;
  END IF;
END $$;

-- Create admin-specific policies for all relevant tables

-- For user_profiles
DROP POLICY IF EXISTS "Admin can access all profiles" ON user_profiles;
CREATE POLICY "Admin can access all profiles"
ON user_profiles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND is_admin = true
  )
);

-- For student_profiles
DROP POLICY IF EXISTS "Admin can access all student profiles" ON student_profiles;
CREATE POLICY "Admin can access all student profiles"
ON student_profiles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND is_admin = true
  )
);

-- For whatsapp_config
DROP POLICY IF EXISTS "Admin can manage whatsapp config" ON whatsapp_config;
CREATE POLICY "Admin can manage whatsapp config"
ON whatsapp_config
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND is_admin = true
  )
);

-- For business_subscriptions
DROP POLICY IF EXISTS "Admin can manage all business subscriptions" ON business_subscriptions;
CREATE POLICY "Admin can manage all business subscriptions"
ON business_subscriptions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND is_admin = true
  )
);

-- For subscriptions
DROP POLICY IF EXISTS "Admin can manage all subscriptions" ON subscriptions;
CREATE POLICY "Admin can manage all subscriptions"
ON subscriptions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND is_admin = true
  )
);