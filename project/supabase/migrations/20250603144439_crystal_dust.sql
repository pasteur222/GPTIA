-- Create translations table
CREATE TABLE IF NOT EXISTS translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  fr text NOT NULL,
  en text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE translations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow read access to translations"
  ON translations
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow insert and update to translations"
  ON translations
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert some initial translations
INSERT INTO translations (key, fr, en)
VALUES
  ('app.title', 'Airtel GPT', 'Airtel GPT'),
  ('app.description', 'Plateforme d''intelligence artificielle pour l''éducation et la communication', 'Artificial intelligence platform for education and communication'),
  ('app.welcome', 'Bienvenue sur Airtel GPT', 'Welcome to Airtel GPT')
ON CONFLICT (key) DO UPDATE
SET 
  fr = EXCLUDED.fr,
  en = EXCLUDED.en,
  updated_at = now();