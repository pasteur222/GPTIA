/*
  # Add Payment API Configuration Table
  
  1. New Table
    - `payment_api_config`: Stores payment provider API credentials
      - `id` (uuid, primary key)
      - `provider` (text): Payment provider name
      - `client_id` (text): API client ID or key
      - `client_secret` (text): API client secret
      - `is_active` (boolean): Whether this provider is active
      - `updated_at` (timestamptz): When the config was last updated
  
  2. Security
    - Enable RLS
*/

-- Create payment_api_config table
CREATE TABLE IF NOT EXISTS payment_api_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  client_id text,
  client_secret text,
  is_active boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

-- Add unique constraint on provider
ALTER TABLE payment_api_config ADD CONSTRAINT payment_api_config_provider_key UNIQUE (provider);

-- Enable RLS
ALTER TABLE payment_api_config ENABLE ROW LEVEL SECURITY;

-- Insert initial configurations for each provider
INSERT INTO payment_api_config (provider, client_id, client_secret, is_active)
VALUES
  ('airtel', '', '', true),
  ('mtn', '', '', false),
  ('vodacom', '', '', false),
  ('orange', '', '', false),
  ('africell', '', '', false),
  ('moov', '', '', false),
  ('stripe', '', '', false),
  ('paypal', '', '', false)
ON CONFLICT (provider) DO NOTHING;