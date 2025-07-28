/*
  # Airtel Money Integration Schema

  1. New Tables
    - `airtel_money_transactions`: Stores Airtel Money transaction details
      - `id` (uuid, primary key)
      - `transaction_id` (text): Airtel Money transaction ID
      - `student_id` (uuid): Reference to student profile
      - `amount` (integer): Amount in cents
      - `currency` (text): Currency code (e.g., XOF)
      - `status` (text): Transaction status
      - `phone_number` (text): Customer phone number
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Airtel Money Transactions Table
CREATE TABLE IF NOT EXISTS airtel_money_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id text UNIQUE,
  student_id uuid REFERENCES student_profiles(id),
  amount integer NOT NULL,
  currency text NOT NULL DEFAULT 'XOF',
  status text NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
  phone_number text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE airtel_money_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transactions"
  ON airtel_money_transactions
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM student_profiles sp
    WHERE sp.id = airtel_money_transactions.student_id
    AND sp.phone_number = auth.jwt() ->> 'phone'
  ));