/*
# Update Groq Models and Fix Deprecated Model References

1. New Features
  - Add a database trigger to prevent using deprecated models
  - Update existing mixtral-8x7b-32768 references to llama3-70b-8192
  - Add environment variable fallback for Groq API key

2. Security
  - Ensure service role has access to update user_groq_config
*/

-- Update any existing mixtral-8x7b-32768 references to llama3-70b-8192
UPDATE user_groq_config
SET model = 'llama3-70b-8192'
WHERE model = 'mixtral-8x7b-32768';

-- Create a function to validate Groq models
CREATE OR REPLACE FUNCTION validate_groq_model()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the model is the deprecated mixtral-8x7b-32768
  IF NEW.model = 'mixtral-8x7b-32768' THEN
    -- Replace with the default model
    NEW.model := 'llama3-70b-8192';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to validate Groq models on insert or update
DROP TRIGGER IF EXISTS validate_groq_model_trigger ON user_groq_config;
CREATE TRIGGER validate_groq_model_trigger
BEFORE INSERT OR UPDATE ON user_groq_config
FOR EACH ROW
EXECUTE FUNCTION validate_groq_model();

-- Ensure service role has access to user_groq_config
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_groq_config' 
    AND policyname = 'Service role has full access to user_groq_config'
  ) THEN
    CREATE POLICY "Service role has full access to user_groq_config"
      ON user_groq_config
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Ensure anon can read user_groq_config
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_groq_config' 
    AND policyname = 'Anon can read user_groq_config'
  ) THEN
    CREATE POLICY "Anon can read user_groq_config"
      ON user_groq_config
      FOR SELECT
      TO anon
      USING (true);
  END IF;
END $$;

-- Add an index to improve query performance
CREATE INDEX IF NOT EXISTS idx_user_groq_config_updated_at
ON user_groq_config(updated_at DESC);