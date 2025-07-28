/*
  # Données de test pour le module éducation

  1. Création des données de test
    - Profils d'étudiants test
    - Sessions éducatives test
    - Messages et analyses test
  
  2. Configuration des matières
    - Mathématiques
    - Physique-Chimie
    - Biologie
    - Français
    - Anglais
*/

-- Insérer des profils d'étudiants test
INSERT INTO student_profiles (phone_number, first_name, last_name, level, subjects, preferred_language)
VALUES
  ('+243123456789', 'Jean', 'Dupont', '3ème', ARRAY['math', 'physics'], 'french'),
  ('+243987654321', 'Marie', 'Martin', 'Terminale', ARRAY['biology', 'french'], 'french'),
  ('+243555666777', 'Pierre', 'Dubois', '3ème', ARRAY['english', 'french'], 'french')
ON CONFLICT (phone_number) DO NOTHING;

-- Insérer des conversations test
INSERT INTO customer_conversations (phone_number, content, sender, intent)
VALUES
  ('+243123456789', 'Je ne comprends pas les équations du second degré', 'user', 'question'),
  ('+243123456789', 'Pour résoudre une équation du second degré ax² + bx + c = 0, nous utilisons le discriminant Δ = b² - 4ac...', 'bot', 'explanation'),
  ('+243987654321', 'Pouvez-vous m''expliquer la photosynthèse?', 'user', 'question'),
  ('+243987654321', 'La photosynthèse est le processus par lequel les plantes convertissent la lumière solaire en énergie...', 'bot', 'explanation')
ON CONFLICT DO NOTHING;

-- Insérer des sessions éducatives test
INSERT INTO education_sessions (
  student_id,
  subject,
  topic,
  start_time,
  end_time,
  messages_count,
  questions_asked,
  correct_answers,
  comprehension_score
)
SELECT 
  sp.id,
  'math',
  'Équations du second degré',
  NOW() - INTERVAL '2 hours',
  NOW() - INTERVAL '1 hour',
  5,
  3,
  2,
  0.8
FROM student_profiles sp
WHERE sp.phone_number = '+243123456789'
ON CONFLICT DO NOTHING;

-- Insérer des analyses éducatives test
INSERT INTO education_analytics (
  student_id,
  message_id,
  message_type,
  subject,
  topic,
  sentiment,
  complexity_level,
  understanding_score
)
SELECT 
  sp.id,
  cc.id,
  'question',
  'math',
  'Équations du second degré',
  -0.2,
  0.7,
  0.6
FROM student_profiles sp
JOIN customer_conversations cc ON cc.phone_number = sp.phone_number
WHERE sp.phone_number = '+243123456789'
  AND cc.sender = 'user'
ON CONFLICT DO NOTHING;