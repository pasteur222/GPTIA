/*
  # Create business subscription tables and fix user profile policies

  1. New Tables
    - `business_subscriptions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `plan_id` (text)
      - `start_date` (timestamptz)
      - `end_date` (timestamptz)
      - `status` (text)
      - `phone_number` (text)
      - `messages_remaining` (integer)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `business_transactions`
      - `id` (uuid, primary key)
      - `subscription_id` (uuid, references business_subscriptions)
      - `amount` (integer)
      - `status` (text)
      - `provider` (text)
      - `provider_transaction_id` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to read their own data
    - Add policies for authenticated users to create new subscriptions and transactions
    - Fix user_profiles policies to allow proper access

  3. Changes
    - Update user_profiles policies to fix permission issues
    - Add unique constraint on user_id in user_profiles
*/

-- Create business_subscriptions table
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

-- Create business_transactions table
CREATE TABLE IF NOT EXISTS business_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid REFERENCES business_subscriptions(id),
  amount integer NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
  provider text NOT NULL,
  provider_transaction_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE business_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_transactions ENABLE ROW LEVEL SECURITY;

-- Business subscriptions policies
CREATE POLICY "Users can read own subscriptions"
  ON business_subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create subscriptions"
  ON business_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Business transactions policies
CREATE POLICY "Users can read own transactions"
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

CREATE POLICY "Users can create transactions"
  ON business_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM business_subscriptions bs
      WHERE bs.id = subscription_id
      AND bs.user_id = auth.uid()
    )
  );

-- Fix user_profiles policies
DROP POLICY IF EXISTS "Enable read access for own profile" ON user_profiles;
DROP POLICY IF EXISTS "Enable update for own profile" ON user_profiles;
DROP POLICY IF EXISTS "Allow users to manage their own profiles" ON user_profiles;
DROP POLICY IF EXISTS "Allow public registration" ON user_profiles;
DROP POLICY IF EXISTS "Public registration insert" ON user_profiles;
DROP POLICY IF EXISTS "Read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Delete own profile" ON user_profiles;

-- Create new user_profiles policies
CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid()
      AND up.is_admin = true
    )
  );

CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own profile"
  ON user_profiles
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add unique constraint to user_profiles if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_profiles_user_id_unique'
  ) THEN
    ALTER TABLE user_profiles
    ADD CONSTRAINT user_profiles_user_id_unique
    UNIQUE (user_id);
  END IF;
END $$;