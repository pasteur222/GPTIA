/*
  # Add Chatbot Routing Improvements
  
  1. Changes
    - Add new columns to knowledge_base table for better routing
    - Add chatbot_type field to knowledge_base entries
    - Create indexes for faster pattern matching
    - Add sample entries for each chatbot type
  
  2. Security
    - Maintain existing RLS policies
*/

-- Add chatbot_type column to knowledge_base if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'knowledge_base' 
    AND column_name = 'chatbot_type'
  ) THEN
    ALTER TABLE knowledge_base ADD COLUMN chatbot_type text DEFAULT 'education';
  END IF;
END $$;

-- Create index for faster pattern matching
CREATE INDEX IF NOT EXISTS idx_knowledge_base_patterns ON knowledge_base USING gin (patterns);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_intent ON knowledge_base(intent);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_chatbot_type ON knowledge_base(chatbot_type);

-- Insert sample entries for client service chatbot
INSERT INTO knowledge_base (intent, patterns, responses, chatbot_type)
VALUES
  (
    'billing_inquiry',
    ARRAY['facture', 'paiement', 'solde', 'recharge', 'crédit', 'billing', 'payment', 'balance', 'recharge', 'credit'],
    ARRAY['Je peux vous aider avec vos questions de facturation. Que souhaitez-vous savoir?'],
    'client'
  ),
  (
    'technical_support',
    ARRAY['problème', 'connexion', 'internet', 'réseau', 'signal', 'problem', 'connection', 'internet', 'network', 'signal'],
    ARRAY['Je comprends que vous rencontrez un problème technique. Pouvez-vous me donner plus de détails?'],
    'client'
  )
ON CONFLICT (intent) DO UPDATE
SET 
  patterns = EXCLUDED.patterns,
  responses = EXCLUDED.responses,
  chatbot_type = EXCLUDED.chatbot_type;

-- Insert sample entries for quiz chatbot
INSERT INTO knowledge_base (intent, patterns, responses, chatbot_type)
VALUES
  (
    'quiz_start',
    ARRAY['commencer quiz', 'démarrer jeu', 'jouer quiz', 'start quiz', 'play game', 'begin quiz'],
    ARRAY['Bienvenue au quiz! Êtes-vous prêt à tester vos connaissances?'],
    'quiz'
  ),
  (
    'quiz_rules',
    ARRAY['règles', 'comment jouer', 'instructions', 'rules', 'how to play', 'instructions'],
    ARRAY['Voici les règles du quiz: je vais vous poser des questions et vous devez répondre par Vrai ou Faux. Chaque bonne réponse vous rapporte des points!'],
    'quiz'
  )
ON CONFLICT (intent) DO UPDATE
SET 
  patterns = EXCLUDED.patterns,
  responses = EXCLUDED.responses,
  chatbot_type = EXCLUDED.chatbot_type;

-- Insert sample entries for education chatbot
INSERT INTO knowledge_base (intent, patterns, responses, chatbot_type)
VALUES
  (
    'math_help',
    ARRAY['mathématiques', 'algèbre', 'géométrie', 'équation', 'mathematics', 'algebra', 'geometry', 'equation'],
    ARRAY['Je peux vous aider avec vos questions de mathématiques. Quel sujet spécifique vous intéresse?'],
    'education'
  ),
  (
    'physics_help',
    ARRAY['physique', 'mécanique', 'électricité', 'physics', 'mechanics', 'electricity'],
    ARRAY['La physique est un sujet fascinant! Quelle partie de la physique souhaitez-vous explorer?'],
    'education'
  )
ON CONFLICT (intent) DO UPDATE
SET 
  patterns = EXCLUDED.patterns,
  responses = EXCLUDED.responses,
  chatbot_type = EXCLUDED.chatbot_type;