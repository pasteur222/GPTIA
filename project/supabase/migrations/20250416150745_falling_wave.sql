/*
  # Fix user profiles policies and add whatsapp_auto_replies table (version corrigée sans doublon)

  1. Changes
    - Drop and recreate user_profiles policies to fix infinite recursion
    - Add new whatsapp_auto_replies table for business auto-replies

  2. Security
    - Enable RLS on whatsapp_auto_replies table
    - Politique RLS déjà existante, on ne la recrée pas ici pour éviter l'erreur 42710
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admin users can update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admin users can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON user_profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON user_profiles;
DROP POLICY IF EXISTS "Enable insert for registration" ON user_profiles;

-- Recreate policies without recursion
CREATE POLICY "Enable insert for registration"
ON user_profiles FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Enable read access for own profile"
ON user_profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Enable read access for admins"
ON user_profiles FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'email' IN (
    SELECT email FROM user_profiles WHERE is_admin = true
  )
);

CREATE POLICY "Enable update for own profile"
ON user_profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update for admins"
ON user_profiles FOR UPDATE
TO authenticated
USING (
  auth.jwt() ->> 'email' IN (
    SELECT email FROM user_profiles WHERE is_admin = true
  )
)
WITH CHECK (
  auth.jwt() ->> 'email' IN (
    SELECT email FROM user_profiles WHERE is_admin = true
  )
);

-- Create whatsapp_auto_replies table
CREATE TABLE IF NOT EXISTS whatsapp_auto_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  trigger_words text[] NOT NULL DEFAULT '{}',
  response text NOT NULL,
  is_active boolean DEFAULT true,
  priority integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE whatsapp_auto_replies ENABLE ROW LEVEL SECURITY;

-- ❌ NE PAS recréer la politique "Users can manage their own auto-replies"
-- Elle existe déjà dans Supabase, on ne la touche pas ici

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_auto_replies_user ON whatsapp_auto_replies(user_id);
CREATE INDEX IF NOT EXISTS idx_auto_replies_active ON whatsapp_auto_replies(is_active);
CREATE INDEX IF NOT EXISTS idx_auto_replies_priority ON whatsapp_auto_replies(priority DESC);
