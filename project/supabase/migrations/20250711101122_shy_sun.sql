/*
  # Fix customer_conversations RLS policies

  1. Security
     - Update RLS policies for customer_conversations table
     - Add policy for service role to bypass RLS
     - Ensure webhook and edge functions can insert data
*/

-- First, let's ensure the RLS is enabled
ALTER TABLE IF EXISTS customer_conversations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they conflict
DROP POLICY IF EXISTS "Allow insert to conversations" ON customer_conversations;
DROP POLICY IF EXISTS "Allow read access to conversations" ON customer_conversations;
DROP POLICY IF EXISTS "Insert conversations" ON customer_conversations;
DROP POLICY IF EXISTS "Read conversations" ON customer_conversations;

-- Create new policies that allow both authenticated users and the service role
CREATE POLICY "Allow insert to conversations" 
ON customer_conversations 
FOR INSERT 
TO authenticated, anon
WITH CHECK (true);

CREATE POLICY "Allow read access to conversations" 
ON customer_conversations 
FOR SELECT 
TO authenticated, anon
USING (true);

-- Add a specific policy for the service role to have full access
CREATE POLICY "Service role has full access to conversations"
ON customer_conversations
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);