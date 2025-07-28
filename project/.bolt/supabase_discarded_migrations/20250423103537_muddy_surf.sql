-- Create auto-reply rules table
CREATE TABLE IF NOT EXISTS whatsapp_auto_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  trigger_words text[] NOT NULL,
  response text NOT NULL,
  is_active boolean DEFAULT true,
  priority integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE whatsapp_auto_replies ENABLE ROW LEVEL SECURITY;

-- Supprimer les politiques si elles existent déjà pour éviter les erreurs 42710
DROP POLICY IF EXISTS "Utilisateur peut lire ses propres règles" ON whatsapp_auto_replies;
DROP POLICY IF EXISTS "Utilisateur peut ajouter ses propres règles" ON whatsapp_auto_replies;
DROP POLICY IF EXISTS "Utilisateur peut modifier ses propres règles" ON whatsapp_auto_replies;
DROP POLICY IF EXISTS "Utilisateur peut supprimer ses propres règles" ON whatsapp_auto_replies;

-- Recréer les politiques proprement
CREATE POLICY "Utilisateur peut lire ses propres règles"
  ON whatsapp_auto_replies
  FOR SELECT
  TO public
  USING (auth.uid() = user_id);

CREATE POLICY "Utilisateur peut ajouter ses propres règles"
  ON whatsapp_auto_replies
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Utilisateur peut modifier ses propres règles"
  ON whatsapp_auto_replies
  FOR UPDATE
  TO public
  USING (auth.uid() = user_id);

CREATE POLICY "Utilisateur peut supprimer ses propres règles"
  ON whatsapp_auto_replies
  FOR DELETE
  TO public
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_auto_replies_user ON whatsapp_auto_replies(user_id);
CREATE INDEX IF NOT EXISTS idx_auto_replies_active ON whatsapp_auto_replies(is_active);