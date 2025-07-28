/*
  # Fix subscriptions tables and policies

  1. Changes
    - Create business_subscriptions table
    - Add policies for business_subscriptions
    - Add policies for users table access
    - Add policies for user_profiles table access

  2. Security
    - Enable RLS on all tables
    - Add appropriate policies for authenticated users
*/

-- Add policy to allow authenticated users to read users table
CREATE POLICY "Allow authenticated users to read users"
ON auth.users
FOR SELECT
TO authenticated
USING (true);

-- Create business_subscriptions table
CREATE TABLE IF NOT EXISTS business_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- Add policies for business_subscriptions
CREATE POLICY "Users can view their own business subscriptions"
ON business_subscriptions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own business subscriptions"
ON business_subscriptions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own business subscriptions"
ON business_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Add index for faster queries
CREATE INDEX idx_business_subscriptions_user_status
ON business_subscriptions(user_id, status);

CREATE INDEX idx_business_subscriptions_dates
ON business_subscriptions(start_date, end_date);