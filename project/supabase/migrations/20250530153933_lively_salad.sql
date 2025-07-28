/*
  # Add User-Specific WhatsApp API Configuration
  
  1. New Table
    - `user_whatsapp_config`: Stores user-specific WhatsApp API configuration
      - `id` (uuid, primary key)
      - `user_id` (uuid): Reference to auth.users
      - `access_token` (text): WhatsApp API access token
      - `phone_number_id` (text): WhatsApp phone number ID
      - `app_id` (text): WhatsApp app ID
      - `app_secret` (text): WhatsApp app secret
      - `webhook_url` (text): Webhook URL for receiving WhatsApp notifications
      - `is_active` (boolean): Whether this configuration is active
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

-- Create user_whatsapp_config table
CREATE TABLE IF NOT EXISTS user_whatsapp_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  access_token text NOT NULL,
  phone_number_id text NOT NULL,
  app_id text,
  app_secret text,
  webhook_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_whatsapp_config ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own WhatsApp config"
  ON user_whatsapp_config
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own WhatsApp config"
  ON user_whatsapp_config
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own WhatsApp config"
  ON user_whatsapp_config
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_user_whatsapp_config_user_id ON user_whatsapp_config(user_id);
CREATE INDEX idx_user_whatsapp_config_is_active ON user_whatsapp_config(is_active);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_whatsapp_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_user_whatsapp_config_updated_at
  BEFORE UPDATE ON user_whatsapp_config
  FOR EACH ROW
  EXECUTE FUNCTION update_user_whatsapp_config_updated_at();