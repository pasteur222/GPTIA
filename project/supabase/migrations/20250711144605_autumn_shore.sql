/*
# Add Default Groq Configuration

1. New Tables
  - None (using existing tables)

2. Changes
  - Add RLS policy to allow service role to access user_groq_config
  - Add RLS policy to allow anon role to access user_groq_config for reading only

3. Security
  - Enable RLS on user_groq_config table
  - Add policies for service_role to have full access
*/

-- Add RLS policy for service_role to have full access to user_groq_config
CREATE POLICY "Service role has full access to user_groq_config"
  ON user_groq_config
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add RLS policy for anon to read user_groq_config
CREATE POLICY "Anon can read user_groq_config"
  ON user_groq_config
  FOR SELECT
  TO anon
  USING (true);

-- Add comment to explain the purpose of these policies
COMMENT ON TABLE user_groq_config IS 'Stores Groq API configurations for users. Edge functions need access to these configurations.';