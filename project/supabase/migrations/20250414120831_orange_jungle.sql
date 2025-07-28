/*
  # Add Message Templates Table

  1. New Tables
    - `message_templates`: Stores WhatsApp message templates
      - `id` (uuid, primary key)
      - `name` (text): Template name
      - `content` (text): Template content
      - `category` (text): Template category
      - `variables` (text[]): List of variables used in template
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

CREATE TABLE IF NOT EXISTS message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  content text NOT NULL,
  category text NOT NULL,
  variables text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

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
  );