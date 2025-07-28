/*
  # Configuration des tables du Service Client

  1. Nouvelles Tables
    - `customer_conversations`
      - `id` (uuid, primary key)
      - `phone_number` (text)
      - `content` (text)
      - `sender` (text)
      - `created_at` (timestamp)
      - `intent` (text)
      - `response_time` (float)
    
    - `knowledge_base`
      - `id` (uuid, primary key)
      - `intent` (text)
      - `patterns` (text[])
      - `responses` (text[])
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
*/

-- Table des conversations
CREATE TABLE IF NOT EXISTS customer_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL,
  content text NOT NULL,
  sender text NOT NULL,
  created_at timestamptz DEFAULT now(),
  intent text,
  response_time float
);

-- Table de la base de connaissances
CREATE TABLE IF NOT EXISTS knowledge_base (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intent text NOT NULL,
  patterns text[] NOT NULL,
  responses text[] NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Activer RLS
ALTER TABLE customer_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;

-- Policies pour customer_conversations
CREATE POLICY "Allow read access to conversations"
  ON customer_conversations
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow insert to conversations"
  ON customer_conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policies pour knowledge_base
CREATE POLICY "Allow read access to knowledge base"
  ON knowledge_base
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow insert to knowledge base"
  ON knowledge_base
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update to knowledge base"
  ON knowledge_base
  FOR UPDATE
  TO authenticated
  USING (true);

-- Insérer des données initiales dans la base de connaissances
INSERT INTO knowledge_base (intent, patterns, responses) VALUES
  (
    'greeting',
    ARRAY['bonjour', 'salut', 'bonsoir', 'hey', 'hello'],
    ARRAY['Bonjour! Comment puis-je vous aider?', 'Salut! Je suis là pour vous assister.']
  ),
  (
    'billing',
    ARRAY['facture', 'paiement', 'recharge', 'solde', 'crédit'],
    ARRAY['Je peux vous aider avec vos questions de facturation. Que souhaitez-vous savoir?']
  ),
  (
    'technical_support',
    ARRAY['problème', 'connexion', 'internet', 'réseau', 'signal'],
    ARRAY['Je comprends que vous rencontrez un problème technique. Pouvez-vous me donner plus de détails?']
  );