/*
  # Payment System Schema

  1. New Tables
    - `payment_plans`: Stores available subscription plans
      - `id` (uuid, primary key)
      - `name` (text): Plan name
      - `description` (text): Plan description
      - `price` (integer): Price in cents
      - `duration` (interval): Subscription duration
      - `features` (text[]): List of included features
      - `is_active` (boolean): Whether the plan is currently available
      
    - `transactions`: Stores payment transactions
      - `id` (uuid, primary key)
      - `student_id` (uuid): Reference to student profile
      - `plan_id` (uuid): Reference to payment plan
      - `amount` (integer): Amount in cents
      - `status` (text): Payment status (pending, completed, failed)
      - `provider` (text): Payment provider used
      - `provider_transaction_id` (text): External transaction ID
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `subscriptions`: Stores active subscriptions
      - `id` (uuid, primary key)
      - `student_id` (uuid): Reference to student profile
      - `plan_id` (uuid): Reference to payment plan
      - `start_date` (timestamp)
      - `end_date` (timestamp)
      - `status` (text): Subscription status
      - `auto_renew` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Payment Plans Table
CREATE TABLE IF NOT EXISTS payment_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price integer NOT NULL,
  duration interval NOT NULL,
  features text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE payment_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active payment plans"
  ON payment_plans
  FOR SELECT
  USING (is_active = true);

-- Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES student_profiles(id),
  plan_id uuid REFERENCES payment_plans(id),
  amount integer NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
  provider text NOT NULL,
  provider_transaction_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transactions"
  ON transactions
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM student_profiles sp
    WHERE sp.id = transactions.student_id
    AND sp.phone_number = auth.jwt() ->> 'phone'
  ));

-- Subscriptions Table
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES student_profiles(id),
  plan_id uuid REFERENCES payment_plans(id),
  start_date timestamptz NOT NULL DEFAULT now(),
  end_date timestamptz NOT NULL,
  status text NOT NULL CHECK (status IN ('active', 'expired', 'cancelled')),
  auto_renew boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscriptions"
  ON subscriptions
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM student_profiles sp
    WHERE sp.id = subscriptions.student_id
    AND sp.phone_number = auth.jwt() ->> 'phone'
  ));

-- Insert sample payment plans
INSERT INTO payment_plans (name, description, price, duration, features)
VALUES
  (
    'Basic',
    'Accès aux fonctionnalités essentielles',
    1000, -- 10 EUR
    INTERVAL '1 month',
    ARRAY['Quiz illimités', 'Service client basique']
  ),
  (
    'Premium',
    'Accès complet avec support prioritaire',
    2500, -- 25 EUR
    INTERVAL '1 month',
    ARRAY['Quiz illimités', 'Service client prioritaire', 'Sessions éducatives illimitées', 'Analyses détaillées']
  ),
  (
    'Annuel',
    'Accès premium avec réduction annuelle',
    25000, -- 250 EUR
    INTERVAL '1 year',
    ARRAY['Quiz illimités', 'Service client prioritaire', 'Sessions éducatives illimitées', 'Analyses détaillées', 'Réduction de 17%']
  );