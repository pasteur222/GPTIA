/*
  # Create webhook_config table

  1. New Tables
    - `webhook_config`
      - `id` (uuid, primary key)
      - `url` (text) - The webhook URL
      - `verify_token` (text) - Token for webhook verification
      - `is_active` (boolean) - Whether the webhook is active
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `webhook_config` table
    - Add policy for authenticated users to manage webhook config
*/

CREATE TABLE IF NOT EXISTS webhook_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text,
  verify_token text,
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE webhook_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage webhook config"
  ON webhook_config
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);