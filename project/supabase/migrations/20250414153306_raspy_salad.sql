/*
  # Add Airtel Money API Configuration

  1. New Tables
    - `airtel_money_config`: Stores Airtel Money API credentials
      - `id` (uuid, primary key)
      - `client_id` (text): Airtel Money client ID
      - `client_secret` (text): Airtel Money client secret
      - `is_active` (boolean): Whether this configuration is active
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

-- Create Airtel Money configuration table
CREATE TABLE IF NOT EXISTS airtel_money_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text NOT NULL,
  client_secret text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE airtel_money_config ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow read access to airtel money config"
  ON airtel_money_config
  FOR SELECT
  TO authenticated
  USING (true);

-- Insert initial configuration
INSERT INTO airtel_money_config (
  client_id,
  client_secret,
  is_active
) VALUES (
  '4e6cf8f4-5e0c-40b4-af8e-bb7c0742fd0e',
  '****************************',
  true
);