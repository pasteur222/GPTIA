/*
  # Fix Message Templates Table

  1. Changes
    - Drop existing table if exists to avoid conflicts
    - Recreate table with proper structure
    - Add proper indexes for performance
    - Add sample templates
*/

-- Drop existing table if it exists
DROP TABLE IF EXISTS message_templates;

-- Create message templates table
CREATE TABLE IF NOT EXISTS message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  content text NOT NULL,
  category text NOT NULL,
  variables text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for faster searches
CREATE INDEX IF NOT EXISTS idx_templates_category ON message_templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_name ON message_templates(name);

-- Enable RLS
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow read access to message templates"
  ON message_templates
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow insert to message templates"
  ON message_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update to message templates"
  ON message_templates
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow delete to message templates"
  ON message_templates
  FOR DELETE
  TO authenticated
  USING (true);

-- Insert sample templates
INSERT INTO message_templates (name, content, category, variables, created_at, updated_at)
VALUES
  (
    'Welcome Message',
    'Bonjour {{name}}, bienvenue sur notre plateforme! Nous sommes ravis de vous avoir parmi nous.',
    'Onboarding',
    ARRAY['name'],
    NOW(),
    NOW()
  ),
  (
    'Payment Confirmation',
    'Votre paiement de {{amount}} a été reçu avec succès. Merci de votre confiance!',
    'Billing',
    ARRAY['amount'],
    NOW(),
    NOW()
  ),
  (
    'Course Reminder',
    'Rappel: Votre cours de {{subject}} commence le {{date}} à {{time}}. N''oubliez pas de vous préparer!',
    'Education',
    ARRAY['subject', 'date', 'time'],
    NOW(),
    NOW()
  ),
  (
    'Support Response',
    'Cher(e) {{name}}, notre équipe a bien reçu votre demande concernant {{issue}}. Nous vous répondrons dans les plus brefs délais.',
    'Support',
    ARRAY['name', 'issue'],
    NOW(),
    NOW()
  ),
  (
    'Marketing Campaign',
    'Découvrez nos nouvelles offres {{offer_name}}! Profitez de {{discount}}% de réduction jusqu''au {{end_date}}.',
    'Marketing',
    ARRAY['offer_name', 'discount', 'end_date'],
    NOW(),
    NOW()
  );