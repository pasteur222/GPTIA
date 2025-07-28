/*
  # Enhanced Customer Conversations for Web Support

  1. Schema Updates
    - Add `source` column to distinguish between 'whatsapp' and 'web' conversations
    - Add `web_user_id` column for web user identification
    - Add `session_id` column for session tracking
    - Add `user_agent` column for debugging and analytics

  2. Security
    - Update RLS policies to handle both WhatsApp and web users
    - Add indexes for performance optimization

  3. Data Migration
    - Set default source to 'whatsapp' for existing records
*/

-- Add new columns to customer_conversations table
DO $$
BEGIN
  -- Add source column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customer_conversations' AND column_name = 'source'
  ) THEN
    ALTER TABLE customer_conversations ADD COLUMN source text DEFAULT 'whatsapp';
  END IF;

  -- Add web_user_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customer_conversations' AND column_name = 'web_user_id'
  ) THEN
    ALTER TABLE customer_conversations ADD COLUMN web_user_id text;
  END IF;

  -- Add session_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customer_conversations' AND column_name = 'session_id'
  ) THEN
    ALTER TABLE customer_conversations ADD COLUMN session_id text;
  END IF;

  -- Add user_agent column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customer_conversations' AND column_name = 'user_agent'
  ) THEN
    ALTER TABLE customer_conversations ADD COLUMN user_agent text;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_conversations_source 
ON customer_conversations(source);

CREATE INDEX IF NOT EXISTS idx_customer_conversations_web_user_id 
ON customer_conversations(web_user_id);

CREATE INDEX IF NOT EXISTS idx_customer_conversations_session_id 
ON customer_conversations(session_id);

-- Update RLS policies to handle web users
DROP POLICY IF EXISTS "Allow read access to conversations" ON customer_conversations;
DROP POLICY IF EXISTS "Allow insert to conversations" ON customer_conversations;

CREATE POLICY "Allow read access to conversations"
ON customer_conversations FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow insert to conversations"
ON customer_conversations FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Service role has full access to conversations"
ON customer_conversations FOR ALL
TO service_role
USING (true)
WITH CHECK (true);