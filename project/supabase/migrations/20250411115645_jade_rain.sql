/*
  # Add WhatsApp configuration table

  1. New Tables
    - `whatsapp_config`
      - `id` (uuid, primary key)
      - `access_token` (text, required) - WhatsApp Business API access token
      - `phone_number_id` (text, required) - WhatsApp Business phone number ID
      - `webhook_secret` (text, required) - Secret for webhook verification
      - `is_connected` (boolean) - Connection status
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `whatsapp_config` table
    - Add policy for authenticated users to read config
*/

CREATE TABLE IF NOT EXISTS whatsapp_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token text NOT NULL,
  phone_number_id text NOT NULL,
  webhook_secret text NOT NULL,
  is_connected boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE whatsapp_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to whatsapp config"
  ON whatsapp_config
  FOR SELECT
  TO authenticated
  USING (true);

-- Insert default configuration
INSERT INTO whatsapp_config (access_token, phone_number_id, webhook_secret)
VALUES (
  'default_access_token',
  'default_phone_number_id',
  'default_webhook_secret'
) ON CONFLICT DO NOTHING;