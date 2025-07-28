/*
  # Configuration du module Quiz

  1. Tables
    - quiz_questions: Questions du quiz
    - quiz_games: Jeux de quiz
    - quiz_participants: Participants aux quiz
    - quiz_responses: Réponses des participants
  
  2. Données de test
    - Questions de test
    - Jeu de quiz test
    - Participants test
*/

-- Table des questions de quiz
CREATE TABLE IF NOT EXISTS quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text text NOT NULL,
  correct_answer boolean NOT NULL,
  explanation text NOT NULL,
  category text NOT NULL,
  difficulty_level int DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des jeux de quiz
CREATE TABLE IF NOT EXISTS quiz_games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  questions_per_day int NOT NULL,
  time_interval jsonb NOT NULL,
  status text DEFAULT 'scheduled',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des participants
CREATE TABLE IF NOT EXISTS quiz_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid REFERENCES quiz_games(id),
  phone_number text NOT NULL,
  joined_at timestamptz DEFAULT now(),
  last_answer_at timestamptz,
  score int DEFAULT 0,
  correct_answers int DEFAULT 0,
  total_answers int DEFAULT 0
);

-- Table des réponses
CREATE TABLE IF NOT EXISTS quiz_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid REFERENCES quiz_participants(id),
  question_id uuid REFERENCES quiz_questions(id),
  answer boolean NOT NULL,
  is_correct boolean NOT NULL,
  response_time float,
  created_at timestamptz DEFAULT now()
);

-- Activer RLS
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_responses ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow read access to quiz questions"
  ON quiz_questions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow insert to quiz questions"
  ON quiz_questions FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow read access to quiz games"
  ON quiz_games FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow insert to quiz games"
  ON quiz_games FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow update to quiz games"
  ON quiz_games FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow read access to quiz participants"
  ON quiz_participants FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow insert to quiz participants"
  ON quiz_participants FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow update to quiz participants"
  ON quiz_participants FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow read access to quiz responses"
  ON quiz_responses FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow insert to quiz responses"
  ON quiz_responses FOR INSERT TO authenticated WITH CHECK (true);

-- Insérer des questions de test
INSERT INTO quiz_questions (text, correct_answer, explanation, category) VALUES
  (
    'Le Soleil tourne autour de la Terre.',
    false,
    'C''est la Terre qui tourne autour du Soleil, pas l''inverse. Cette découverte a été faite par Copernic au 16e siècle.',
    'Science'
  ),
  (
    'L''eau bout toujours à 100 degrés Celsius.',
    false,
    'La température d''ébullition de l''eau varie en fonction de la pression atmosphérique. À haute altitude, l''eau bout à une température plus basse.',
    'Science'
  ),
  (
    'Le plus grand océan du monde est l''océan Pacifique.',
    true,
    'L''océan Pacifique est effectivement le plus grand océan, couvrant environ 46% de la surface d''eau de la Terre.',
    'Géographie'
  ),
  (
    'La Grande Muraille de Chine est visible depuis l''espace.',
    false,
    'Contrairement à la croyance populaire, la Grande Muraille n''est pas visible à l''œil nu depuis l''espace ou même depuis l''orbite terrestre basse.',
    'Histoire'
  ),
  (
    'Le corps humain contient plus de bactéries que de cellules humaines.',
    true,
    'Le corps humain contient environ 10 fois plus de bactéries que de cellules humaines, principalement dans le système digestif.',
    'Biologie'
  );

-- Créer un jeu de quiz test
INSERT INTO quiz_games (
  name,
  start_date,
  end_date,
  questions_per_day,
  time_interval,
  status
) VALUES (
  'Quiz Culture Générale',
  NOW(),
  NOW() + INTERVAL '7 days',
  5,
  '{"type": "hours", "value": 1}',
  'active'
);

-- Ajouter des participants test
WITH game AS (SELECT id FROM quiz_games LIMIT 1)
INSERT INTO quiz_participants (game_id, phone_number) VALUES
  ((SELECT id FROM game), '+243123456789'),
  ((SELECT id FROM game), '+243987654321'),
  ((SELECT id FROM game), '+243555666777');