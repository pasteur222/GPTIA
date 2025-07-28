/*
  # Add User Groq API Configuration Table
  
  1. New Table
    - `user_groq_config`: Stores user-specific Groq API configuration
      - `id` (uuid, primary key)
      - `user_id` (uuid): Reference to auth.users
      - `api_key` (text): Groq API key
      - `model` (text): Default Groq model to use
      - `updated_at` (timestamptz): When the config was last updated
  
  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

-- Create user_groq_config table
CREATE TABLE IF NOT EXISTS user_groq_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  api_key text NOT NULL,
  model text NOT NULL DEFAULT 'mixtral-8x7b-32768',
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_groq_config ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own Groq config"
  ON user_groq_config
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Groq config"
  ON user_groq_config
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Groq config"
  ON user_groq_config
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_user_groq_config_user_id ON user_groq_config(user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_groq_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_user_groq_config_updated_at
  BEFORE UPDATE ON user_groq_config
  FOR EACH ROW
  EXECUTE FUNCTION update_user_groq_config_updated_at();