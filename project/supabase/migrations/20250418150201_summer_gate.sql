/*
  # Business Subscription System Schema

  1. New Tables
    - `business_subscriptions`: Stores business subscription information
      - `id` (uuid, primary key)
      - `user_id` (uuid): Reference to auth.users
      - `plan_id` (text): Type of subscription plan (basic, pro, enterprise)
      - `start_date` (timestamptz): When the subscription starts
      - `end_date` (timestamptz): When the subscription ends
      - `status` (text): Subscription status (active, expired, cancelled)
      - `phone_number` (text): Phone number associated with subscription
      - `messages_remaining` (integer): Number of messages remaining in quota (null for unlimited)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `business_transactions`: Stores business payment transactions
      - `id` (uuid, primary key)
      - `subscription_id` (uuid): Reference to business_subscription
      - `amount` (integer): Amount paid
      - `status` (text): Transaction status (pending, completed, failed)
      - `provider` (text): Payment provider used
      - `provider_transaction_id` (text): External transaction ID
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create business_subscriptions table
CREATE TABLE IF NOT EXISTS business_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  plan_id text NOT NULL CHECK (plan_id IN ('basic', 'pro', 'enterprise')),
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
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE business_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own business subscriptions"
  ON business_subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own business transactions"
  ON business_transactions
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM business_subscriptions bs
    WHERE bs.id = business_transactions.subscription_id
    AND bs.user_id = auth.uid()
  ));

-- Create function to check subscription status
CREATE OR REPLACE FUNCTION check_business_subscription_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update expired subscriptions
  UPDATE business_subscriptions
  SET status = 'expired'
  WHERE end_date < NOW()
  AND status = 'active';
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to run every hour
CREATE OR REPLACE FUNCTION create_business_subscription_check_trigger()
RETURNS void AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'check_business_subscription_status_trigger'
  ) THEN
    CREATE TRIGGER check_business_subscription_status_trigger
    AFTER INSERT OR UPDATE ON business_subscriptions
    EXECUTE FUNCTION check_business_subscription_status();
  END IF;
END;
$$ LANGUAGE plpgsql;

SELECT create_business_subscription_check_trigger();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_business_subscriptions_user ON business_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_business_subscriptions_status ON business_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_business_subscriptions_dates ON business_subscriptions(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_business_transactions_subscription ON business_transactions(subscription_id);