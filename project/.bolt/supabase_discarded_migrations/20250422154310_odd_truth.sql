/*
  # Fix business subscriptions and permissions

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

  2. Security
    - Enable RLS on `business_subscriptions` table
    - Add policies for authenticated users to manage their own subscriptions
    - Update user_profiles policies to allow authenticated users to read profiles

  3. Changes
    - Add business_transactions table for payment tracking
    - Update user_profiles policies
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

-- Enable RLS
ALTER TABLE business_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies for business_subscriptions
CREATE POLICY "Users can view their own subscriptions"
  ON business_subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscriptions"
  ON business_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions"
  ON business_subscriptions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

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
ALTER TABLE business_transactions ENABLE ROW LEVEL SECURITY;

-- Policies for business_transactions
CREATE POLICY "Users can view their own transactions"
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

-- Update user_profiles policies to allow authenticated users to read profiles
DROP POLICY IF EXISTS "Enable read access for own profile" ON user_profiles;
CREATE POLICY "Enable read access for own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_business_subscriptions_user_id ON business_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_business_subscriptions_status ON business_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_business_transactions_subscription ON business_transactions(subscription_id);