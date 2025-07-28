/*
  # Add Student Subscription System
  
  1. New Tables
    - `student_subscriptions`: Stores student subscription details
      - `id` (uuid, primary key)
      - `student_id` (uuid): Reference to student profile
      - `plan_type` (text): daily, weekly, monthly
      - `start_date` (timestamptz)
      - `end_date` (timestamptz)
      - `status` (text): active, expired, cancelled
      - `whatsapp_number` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `subscription_transactions`: Stores Airtel Money transactions
      - `id` (uuid, primary key)
      - `subscription_id` (uuid): Reference to subscription
      - `amount` (integer)
      - `status` (text): pending, completed, failed
      - `provider_transaction_id` (text)
      - `created_at` (timestamptz)
*/

-- Create student_subscriptions table
CREATE TABLE IF NOT EXISTS student_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES student_profiles(id),
  plan_type text NOT NULL CHECK (plan_type IN ('daily', 'weekly', 'monthly')),
  start_date timestamptz NOT NULL DEFAULT now(),
  end_date timestamptz NOT NULL,
  status text NOT NULL CHECK (status IN ('active', 'expired', 'cancelled')),
  whatsapp_number text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create subscription_transactions table
CREATE TABLE IF NOT EXISTS subscription_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid REFERENCES student_subscriptions(id),
  amount integer NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
  provider_transaction_id text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE student_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies
-- COMMENTED OUT to prevent recreation of this policy
/* 
CREATE POLICY "Users can view their own subscriptions"
  ON student_subscriptions
  FOR SELECT
  TO public
  USING (EXISTS (
    SELECT 1 FROM student_profiles sp
    WHERE sp.id = student_subscriptions.student_id
    AND sp.phone_number = auth.jwt() ->> 'phone'
  ));
*/

CREATE POLICY "Users can view their own transactions"
  ON subscription_transactions
  FOR SELECT
  TO public
  USING (EXISTS (
    SELECT 1 FROM student_subscriptions ss
    JOIN student_profiles sp ON sp.id = ss.student_id
    WHERE ss.id = subscription_transactions.subscription_id
    AND sp.phone_number = auth.jwt() ->> 'phone'
  ));

-- Create function to check subscription status
CREATE OR REPLACE FUNCTION check_subscription_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update expired subscriptions
  UPDATE student_subscriptions
  SET status = 'expired'
  WHERE end_date < NOW()
  AND status = 'active';
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to run every hour
CREATE OR REPLACE FUNCTION create_subscription_check_trigger()
RETURNS void AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'check_subscription_status_trigger'
  ) THEN
    CREATE TRIGGER check_subscription_status_trigger
    AFTER INSERT OR UPDATE ON student_subscriptions
    EXECUTE FUNCTION check_subscription_status();
  END IF;
END;
$$ LANGUAGE plpgsql;

SELECT create_subscription_check_trigger();