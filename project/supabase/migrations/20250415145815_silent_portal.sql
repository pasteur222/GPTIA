/*
  # Add Campaigns Management Tables

  1. New Tables
    - `campaigns`: Stores marketing campaign information
      - `id` (uuid, primary key)
      - `name` (text): Campaign name
      - `description` (text): Campaign description
      - `target_audience` (text[]): List of target phone numbers
      - `start_date` (timestamptz): Campaign start date
      - `end_date` (timestamptz): Campaign end date
      - `status` (text): Campaign status
      - `message_template` (text): Message template to use
      - `metrics` (jsonb): Campaign metrics
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

-- Create campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  target_audience text[] NOT NULL DEFAULT '{}',
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  status text NOT NULL CHECK (status IN ('draft', 'scheduled', 'active', 'completed', 'cancelled')),
  message_template text NOT NULL,
  metrics jsonb NOT NULL DEFAULT '{"sent": 0, "delivered": 0, "opened": 0, "clicked": 0}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow read access to campaigns"
  ON campaigns
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow insert to campaigns"
  ON campaigns
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update to campaigns"
  ON campaigns
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow delete to campaigns"
  ON campaigns
  FOR DELETE
  TO authenticated
  USING (true);

-- Insert sample campaigns
INSERT INTO campaigns (
  name,
  description,
  target_audience,
  start_date,
  end_date,
  status,
  message_template,
  metrics
) VALUES
  (
    'Campagne de Rentrée',
    'Promotion spéciale pour la rentrée scolaire',
    ARRAY['+221123456789', '+221987654321'],
    NOW(),
    NOW() + INTERVAL '7 days',
    'active',
    'Profitez de notre offre spéciale rentrée ! {{discount}}% de réduction sur tous nos services jusqu''au {{end_date}}.',
    '{"sent": 150, "delivered": 142, "opened": 98, "clicked": 45}'
  ),
  (
    'Préparation BAC',
    'Programme de révision intensif pour le BAC',
    ARRAY['+221234567890', '+221876543210'],
    NOW() + INTERVAL '1 day',
    NOW() + INTERVAL '30 days',
    'scheduled',
    'Préparez-vous pour le BAC avec notre programme intensif ! Commencez dès maintenant avec {{subject}}.',
    '{"sent": 0, "delivered": 0, "opened": 0, "clicked": 0}'
  );

-- Create index for better performance
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_dates ON campaigns(start_date, end_date);