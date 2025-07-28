/*
  # Fix Admin Access and Database Permissions
  
  1. Changes
    - Create business_subscriptions table if it doesn't exist
    - Create business_transactions table if it doesn't exist
    - Fix user_profiles policies to allow admin access
    - Create admin user with proper permissions
    - Add admin subscriptions for both business and education
    
  2. Security
    - Enable RLS on all tables
    - Add policies for admin access
*/

-- Create business_subscriptions table if it doesn't exist
CREATE TABLE IF NOT EXISTS business_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  plan_id text NOT NULL,
  start_date timestamptz NOT NULL DEFAULT now(),
  end_date timestamptz NOT NULL,
  status text NOT NULL CHECK (status IN ('active', 'expired', 'cancelled')),
  phone_number text NOT NULL,
  messages_remaining integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create business_transactions table if it doesn't exist
CREATE TABLE IF NOT EXISTS business_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid REFERENCES business_subscriptions(id),
  amount integer NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
  provider text NOT NULL,
  provider_transaction_id text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE business_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own business subscriptions" ON business_subscriptions;
DROP POLICY IF EXISTS "Users can view their own business transactions" ON business_transactions;

-- Create policies for business_subscriptions
CREATE POLICY "Users can view their own business subscriptions"
  ON business_subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own business subscriptions"
  ON business_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own business subscriptions"
  ON business_subscriptions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policies for business_transactions
CREATE POLICY "Users can view their own business transactions"
  ON business_transactions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM business_subscriptions bs
      WHERE bs.id = business_transactions.subscription_id
      AND bs.user_id = auth.uid()
    )
  );

-- Fix user_profiles policies
DROP POLICY IF EXISTS "Enable read access for own profile" ON user_profiles;
DROP POLICY IF EXISTS "Enable update for own profile" ON user_profiles;
DROP POLICY IF EXISTS "Enable insert for registration" ON user_profiles;

-- Create new policies for user_profiles
CREATE POLICY "Allow public registration"
  ON user_profiles
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow users to manage their own profiles"
  ON user_profiles
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow read access to own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

-- Create admin-specific policies for all tables
DO $$
DECLARE
  table_name text;
BEGIN
  FOR table_name IN 
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public'
    AND tablename NOT IN ('schema_migrations')
  LOOP
    EXECUTE format('
      DROP POLICY IF EXISTS "Admin can access all %1$s" ON %1$s;
      CREATE POLICY "Admin can access all %1$s" 
      ON %1$s 
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
      );
    ', table_name);
  END LOOP;
END $$;

-- Create active business subscription for admin user
DO $$
DECLARE
  admin_user_id uuid;
  admin_email text := 'admin@airtelgpt.com';
  end_date timestamptz := '2099-12-31 23:59:59'::timestamptz;
BEGIN
  -- Get admin user ID
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = admin_email;
  
  IF admin_user_id IS NOT NULL THEN
    -- Ensure admin profile exists and has is_admin flag
    INSERT INTO user_profiles (
      user_id,
      email,
      first_name,
      last_name,
      is_admin
    ) VALUES (
      admin_user_id,
      admin_email,
      'Administrator',
      'User',
      true
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET
      is_admin = true,
      updated_at = now();
    
    -- Create business subscription if it doesn't exist
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
      now(),
      end_date,
      'active',
      '+221000000000',
      NULL  -- NULL means unlimited messages
    )
    ON CONFLICT DO NOTHING;
    
    -- Create student profile if it doesn't exist
    INSERT INTO student_profiles (
      phone_number,
      first_name,
      last_name,
      level,
      subjects,
      preferred_language
    ) VALUES (
      '+221000000000',
      'Administrator',
      'User',
      'Terminale',
      ARRAY['math', 'physics', 'chemistry', 'biology', 'french', 'english', 'history', 'geography'],
      'french'
    )
    ON CONFLICT (phone_number) DO NOTHING;
    
    -- Get student ID
    WITH student AS (
      SELECT id FROM student_profiles WHERE phone_number = '+221000000000'
    )
    -- Create education subscription
    INSERT INTO subscriptions (
      student_id,
      plan_id,
      start_date,
      end_date,
      status,
      auto_renew,
      whatsapp_number,
      messages_remaining
    )
    SELECT 
      s.id,
      'monthly',
      now(),
      end_date,
      'active',
      true,
      '+221000000000',
      NULL  -- NULL means unlimited messages
    FROM student s
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_business_subscriptions_user_id ON business_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_business_subscriptions_status ON business_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_business_transactions_subscription ON business_transactions(subscription_id);