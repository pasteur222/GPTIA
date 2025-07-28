/*
  # Add test data for dashboard testing
  
  1. Test Data
    - Add sample conversations
    - Add sample education sessions
    - Add sample quiz games and participants
    - Add sample student profiles
    - Add sample analytics data
  
  2. Changes
    - Insert test data into all relevant tables
    - Use realistic timestamps and data patterns
*/

-- Add test WhatsApp conversations
INSERT INTO customer_conversations (phone_number, content, sender, intent, response_time, created_at)
VALUES
  ('+33612345678', 'Bonjour, j''ai une question sur mon abonnement', 'user', 'subscription', 2.5, NOW() - INTERVAL '2 hours'),
  ('+33612345678', 'Je peux vous aider avec votre abonnement', 'bot', 'subscription', NULL, NOW() - INTERVAL '2 hours'),
  ('+33687654321', 'Comment puis-je recharger mon crédit?', 'user', 'credit', 1.8, NOW() - INTERVAL '1 hour'),
  ('+33687654321', 'Voici les options de recharge disponibles', 'bot', 'credit', NULL, NOW() - INTERVAL '1 hour');

-- Add test student profiles
INSERT INTO student_profiles (phone_number, first_name, last_name, level, subjects, preferred_language, created_at, last_active_at)
VALUES
  ('+33612345678', 'Jean', 'Dupont', '3ème', ARRAY['math', 'physics'], 'french', NOW() - INTERVAL '7 days', NOW() - INTERVAL '1 hour'),
  ('+33687654321', 'Marie', 'Martin', 'Terminale', ARRAY['biology', 'chemistry'], 'french', NOW() - INTERVAL '5 days', NOW() - INTERVAL '2 hours');

-- Add test education sessions
INSERT INTO education_sessions (
  student_id,
  subject,
  topic,
  start_time,
  end_time,
  duration,
  messages_count,
  questions_asked,
  correct_answers,
  comprehension_score
)
SELECT 
  sp.id,
  'math',
  'Algèbre',
  NOW() - INTERVAL '2 hours',
  NOW() - INTERVAL '1 hour',
  INTERVAL '1 hour',
  10,
  5,
  4,
  0.8
FROM student_profiles sp
WHERE sp.first_name = 'Jean'
UNION ALL
SELECT 
  sp.id,
  'biology',
  'Génétique',
  NOW() - INTERVAL '3 hours',
  NOW() - INTERVAL '2 hours',
  INTERVAL '1 hour',
  8,
  4,
  3,
  0.75
FROM student_profiles sp
WHERE sp.first_name = 'Marie';

-- Add test quiz questions
INSERT INTO quiz_questions (text, correct_answer, explanation, category, difficulty_level)
VALUES
  ('La Terre est plate', false, 'La Terre est une sphère', 'Science', 1),
  ('2 + 2 = 4', true, 'Addition basique', 'Mathématiques', 1);

-- Add test quiz game
INSERT INTO quiz_games (
  name,
  start_date,
  end_date,
  questions_per_day,
  time_interval,
  status
)
VALUES
  (
    'Quiz Science Février',
    NOW(),
    NOW() + INTERVAL '7 days',
    5,
    '{"type": "hours", "value": 1}'::jsonb,
    'active'
  );

-- Add test quiz participants
WITH game AS (
  SELECT id FROM quiz_games WHERE name = 'Quiz Science Février' LIMIT 1
)
INSERT INTO quiz_participants (
  game_id,
  phone_number,
  score,
  correct_answers,
  total_answers
)
SELECT 
  game.id,
  sp.phone_number,
  80,
  8,
  10
FROM game, student_profiles sp
WHERE sp.first_name = 'Jean'
UNION ALL
SELECT 
  game.id,
  sp.phone_number,
  70,
  7,
  10
FROM game, student_profiles sp
WHERE sp.first_name = 'Marie';

-- Add test education analytics
INSERT INTO education_analytics (
  student_id,
  message_type,
  subject,
  topic,
  sentiment,
  complexity_level,
  understanding_score
)
SELECT 
  sp.id,
  'question',
  'math',
  'Algèbre',
  0.8,
  0.6,
  0.75
FROM student_profiles sp
WHERE sp.first_name = 'Jean'
UNION ALL
SELECT 
  sp.id,
  'answer',
  'biology',
  'Génétique',
  0.7,
  0.5,
  0.8
FROM student_profiles sp
WHERE sp.first_name = 'Marie';