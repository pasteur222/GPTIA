/*
  # Fix WhatsApp Configuration Table
  
  1. Changes
    - Create whatsapp_config table if it doesn't exist
    - Add necessary columns for WhatsApp API configuration
    - Set up RLS policies for security
    - Insert default configuration values
  
  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

-- Create whatsapp_config table if it doesn't exist
CREATE TABLE IF NOT EXISTS whatsapp_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token text NOT NULL,
  phone_number_id text NOT NULL,
  webhook_secret text NOT NULL,
  app_id text,
  app_secret text,
  is_connected boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE whatsapp_config ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow read access to whatsapp config"
  ON whatsapp_config
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow update to whatsapp config"
  ON whatsapp_config
  FOR UPDATE
  TO authenticated
  USING (true);

-- Insert default configuration
INSERT INTO whatsapp_config (
  access_token,
  phone_number_id,
  webhook_secret,
  app_id,
  app_secret,
  is_connected,
  created_at,
  updated_at
)
SELECT
  'EAAJ7KxsnbacBO9tkcbQpN9YRLln0HPbIw6DyBpYrEGsVsXZCtiHv0aQgI0p495X0zcX972Pvk6ZAIl3ZA9ZBbkB4Ly1AMBAtZB0kkAap8d7hIGAZCy6W00kbHxOyHr6GARdQ165YRVyxx4n4ovNYJqnNByFTTf8qm7gKGDkrt5pL0UjMkj18OpTKRZBZCNCpA7ACfPX0hwWuOPBdxvvyR3vtRIBo117dIHHMMTqBDveh',
  '571480576058954',
  'https://apiface-juj7.onrender.com/webhook',
  '698375022800295',
  'b37d4c8cdcbaddf4148dede726a1f4fd',
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM whatsapp_config
);