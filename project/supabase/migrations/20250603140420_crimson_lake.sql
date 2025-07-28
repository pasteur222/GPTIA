/*
  # Add App Settings Table
  
  1. New Table
    - `app_settings`: Stores application settings like contact info and footer text
      - `id` (uuid, primary key)
      - `app_name` (text): Application name
      - `contact_email` (text): Contact email address
      - `contact_phone` (text): Contact phone number
      - `contact_address` (text): Contact address
      - `footer_text` (text): Footer text
      - `company_name` (text): Company name
      - `social_links` (jsonb): Social media links
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

-- Create app_settings table
CREATE TABLE IF NOT EXISTS app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_name text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text,
  contact_address text,
  footer_text text,
  company_name text,
  social_links jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow read access to app settings"
  ON app_settings
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow insert and update to app settings"
  ON app_settings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert default settings
INSERT INTO app_settings (
  app_name,
  contact_email,
  contact_phone,
  contact_address,
  footer_text,
  company_name,
  social_links
) VALUES (
  'Airtel GPT',
  'contact@airtelgpt.com',
  '+221 XX XXX XX XX',
  'Brazzaville, République du Congo',
  'Fait avec ❤️ par la start-up Ecopa''n en République du Congo',
  'Ecopa''n',
  '{"facebook": "https://facebook.com/", "twitter": "https://twitter.com/", "instagram": "https://instagram.com/", "linkedin": "https://linkedin.com/"}'
)
ON CONFLICT DO NOTHING;