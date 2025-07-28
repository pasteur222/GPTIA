/*
  # Fix RLS Policies and Add WhatsApp Auto-Replies (corrigé pour éviter les doublons)

  1. Changes
    - Drop all existing user_profiles policies to avoid recursion
    - Create new non-recursive policies for user_profiles
    - Create whatsapp_auto_replies table with proper structure
    - Ne pas recréer de politique RLS déjà existante
*/

-- Drop all existing policies on user_profiles
DROP POLICY IF EXISTS "Enable insert for registration" ON user_profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON user_profiles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON user_profiles;
DROP POLICY IF EXISTS "Admin users can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admin users can update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Enable read access for own profile" ON user_profiles;
DROP POLICY IF EXISTS "Enable update for own profile" ON user_profiles;
DROP POLICY IF EXISTS "Enable read access for admins" ON user_profiles;
DROP POLICY IF EXISTS "Enable update for admins" ON user_profiles;
DROP POLICY IF EXISTS "Allow users to manage their own profiles" ON user_profiles;
DROP POLICY IF EXISTS "Allow public registration" ON user_profiles;

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create new non-recursive policies for user_profiles
CREATE POLICY "Enable insert for registration"
ON user_profiles
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Enable read access for own profile"
ON user_profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND (raw_user_meta_data->>'is_admin')::boolean = true
  )
);

CREATE POLICY "Enable update for own profile"
ON user_profiles
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND (raw_user_meta_data->>'is_admin')::boolean = true
  )
)
WITH CHECK (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND (raw_user_meta_data->>'is_admin')::boolean = true
  )
);

-- Drop existing whatsapp_auto_replies table if it exists
DROP TABLE IF EXISTS whatsapp_auto_replies;

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

-- ❌ Politique RLS déjà existante — ne pas la recréer ici
-- CREATE POLICY "Users can manage their own auto-replies" ...

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_auto_replies_user ON whatsapp_auto_replies(user_id);
CREATE INDEX IF NOT EXISTS idx_auto_replies_active ON whatsapp_auto_replies(is_active);
CREATE INDEX IF NOT EXISTS idx_auto_replies_priority ON whatsapp_auto_replies(priority DESC);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_whatsapp_auto_replies_updated_at
  BEFORE UPDATE
  ON whatsapp_auto_replies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
