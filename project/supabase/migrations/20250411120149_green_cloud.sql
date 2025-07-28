/*
  # Education WhatsApp Integration

  1. New Tables
    - `education_sessions`
      - Tracks student learning sessions
      - Stores subject, level, and progress
    - `student_profiles`
      - Stores student information and preferences
      - Links WhatsApp numbers to student accounts
    - `education_analytics`
      - Tracks student performance and engagement
      - Stores message analysis and learning patterns

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated access
*/

-- Student profiles table
CREATE TABLE IF NOT EXISTS student_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL UNIQUE,
  first_name text,
  last_name text,
  level text NOT NULL,
  subjects text[] DEFAULT '{}',
  preferred_language text DEFAULT 'french',
  created_at timestamptz DEFAULT now(),
  last_active_at timestamptz DEFAULT now()
);

-- Education sessions table
CREATE TABLE IF NOT EXISTS education_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES student_profiles(id),
  subject text NOT NULL,
  topic text,
  start_time timestamptz DEFAULT now(),
  end_time timestamptz,
  duration interval,
  messages_count int DEFAULT 0,
  questions_asked int DEFAULT 0,
  correct_answers int DEFAULT 0,
  comprehension_score float DEFAULT 0
);

-- Education analytics table
CREATE TABLE IF NOT EXISTS education_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES student_profiles(id),
  message_id uuid REFERENCES customer_conversations(id),
  message_type text NOT NULL,
  subject text,
  topic text,
  sentiment float,
  complexity_level float,
  understanding_score float,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE education_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE education_analytics ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow read access to student profiles"
  ON student_profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow insert to student profiles"
  ON student_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update to student profiles"
  ON student_profiles
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow read access to education sessions"
  ON education_sessions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow insert to education sessions"
  ON education_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update to education sessions"
  ON education_sessions
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow read access to education analytics"
  ON education_analytics
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow insert to education analytics"
  ON education_analytics
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_student_phone ON student_profiles(phone_number);
CREATE INDEX IF NOT EXISTS idx_session_student ON education_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_analytics_student ON education_analytics(student_id);
CREATE INDEX IF NOT EXISTS idx_analytics_message ON education_analytics(message_id);