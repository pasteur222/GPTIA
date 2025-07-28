-- Create whatsapp_auto_replies table
CREATE TABLE IF NOT EXISTS whatsapp_auto_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  trigger_words text[] NOT NULL DEFAULT '{}',
  response text NOT NULL,
  is_active boolean DEFAULT true,
  priority integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE whatsapp_auto_replies ENABLE ROW LEVEL SECURITY;

-- Supprimer la politique si elle existe déjà
DROP POLICY IF EXISTS "Users can manage their own auto-replies" ON whatsapp_auto_replies;

-- Recréer la politique proprement
CREATE POLICY "Users can manage their own auto-replies"
ON whatsapp_auto_replies
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_auto_replies_user ON whatsapp_auto_replies(user_id);
CREATE INDEX IF NOT EXISTS idx_auto_replies_active ON whatsapp_auto_replies(is_active);
CREATE INDEX IF NOT EXISTS idx_auto_replies_priority ON whatsapp_auto_replies(priority DESC);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_whatsapp_auto_replies_updated_at
  BEFORE UPDATE
  ON whatsapp_auto_replies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ❌ Ne pas insérer de données avec auth.uid() ici
-- ⚠️ Insérer les données depuis l'application (via le code client authentifié)
-- INSERT ... doit être retiré de ce script SQL
