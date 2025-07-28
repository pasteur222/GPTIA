/*
  # Fix Admin Access to All Modules
  
  1. Changes
    - Update admin user metadata to ensure is_admin flag is set
    - Create active business subscription for admin user
    - Create active education subscription for admin user
    - Update user_profiles to ensure admin flag is set
    - Add policies to allow admin access to all modules
*/

-- Step 1: Ensure admin user has is_admin flag in user_profiles
UPDATE user_profiles
SET is_admin = true
WHERE email = 'admin@airtelgpt.com';

-- Step 2: Create active business subscription for admin user if it doesn't exist
DO $$
DECLARE
  admin_user_id uuid;
  subscription_exists boolean;
  end_date timestamptz;
BEGIN
  -- Get admin user ID
  SELECT user_id INTO admin_user_id
  FROM user_profiles
  WHERE email = 'admin@airtelgpt.com';
  
  IF admin_user_id IS NOT NULL THEN
    -- Check if subscription already exists
    SELECT EXISTS (
      SELECT 1 FROM business_subscriptions
      WHERE user_id = admin_user_id
      AND status = 'active'
    ) INTO subscription_exists;
    
    -- Set end date far in the future
    end_date := '2099-12-31 23:59:59'::timestamptz;
    
    -- Create subscription if it doesn't exist
    IF NOT subscription_exists THEN
      INSERT INTO business_subscriptions (
        user_id,
        plan_id,
        start_date,
        end_date,
        status,
        phone_number,
        messages_remaining
      ) VALUES (
        admin_user_id,
        'enterprise',
        NOW(),
        end_date,
        'active',
        '+221000000000',
        NULL  -- NULL means unlimited messages
      );
    END IF;
  END IF;
END $$;

-- Step 3: Create active education subscription for admin user
DO $$
DECLARE
  admin_user_id uuid;
  admin_phone text;
  student_id uuid;
  subscription_exists boolean;
  end_date timestamptz;
BEGIN
  -- Get admin user ID and phone
  SELECT user_id, phone_number INTO admin_user_id, admin_phone
  FROM user_profiles
  WHERE email = 'admin@airtelgpt.com';
  
  IF admin_phone IS NULL THEN
    admin_phone := '+221000000000';
    
    -- Update admin profile with phone number
    UPDATE user_profiles
    SET phone_number = admin_phone
    WHERE user_id = admin_user_id;
  END IF;
  
  -- Check if student profile exists
  SELECT id INTO student_id
  FROM student_profiles
  WHERE phone_number = admin_phone;
  
  -- Create student profile if it doesn't exist
  IF student_id IS NULL THEN
    INSERT INTO student_profiles (
      phone_number,
      first_name,
      last_name,
      level,
      subjects,
      preferred_language
    ) VALUES (
      admin_phone,
      'Admin',
      'User',
      'Terminale',
      ARRAY['math', 'physics', 'chemistry', 'biology', 'french', 'english', 'history', 'geography'],
      'french'
    )
    RETURNING id INTO student_id;
  END IF;
  
  -- Set end date far in the future
  end_date := '2099-12-31 23:59:59'::timestamptz;
  
  -- Check if subscription already exists
  IF student_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM subscriptions
      WHERE student_id = student_id
      AND status = 'active'
    ) INTO subscription_exists;
    
    -- Create subscription if it doesn't exist
    IF NOT subscription_exists THEN
      INSERT INTO subscriptions (
        student_id,
        plan_id,
        start_date,
        end_date,
        status,
        auto_renew,
        messages_remaining
      ) VALUES (
        student_id,
        'monthly',
        NOW(),
        end_date,
        'active',
        true,
        NULL  -- NULL means unlimited messages
      );
    END IF;
  END IF;
END $$;

-- Step 4: Add admin-specific policies to all tables
DO $$
DECLARE
  table_name text;
  policy_name text;
BEGIN
  FOR table_name IN 
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public'
    AND tablename NOT IN ('schema_migrations')
  LOOP
    policy_name := 'Admin can access all ' || table_name;
    
    -- Check if policy already exists
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = table_name 
      AND policyname = policy_name
    ) THEN
      -- Create policy for this table
      EXECUTE format('
        CREATE POLICY "%s" 
        ON %I 
        FOR ALL 
        TO authenticated 
        USING (
          EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND is_admin = true
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND is_admin = true
          )
        )
      ', policy_name, table_name);
    END IF;
  END LOOP;
END $$;