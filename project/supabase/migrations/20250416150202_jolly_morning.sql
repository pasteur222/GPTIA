/*
  # Fix user profiles policy and add WhatsApp auto-replies table (définitif sans recréer la politique RLS)

  1. Changes
    - Fix infinite recursion in user_profiles policies
    - Remove problematic policies causing recursion
    - Add new, simplified policies for user_profiles

  2. New Tables
    - `whatsapp_auto_replies`

  3. Security
    - Enable RLS on whatsapp_auto_replies (sans créer de politique déjà existante)
*/

-- Drop existing problematic policies on user_profiles
DROP POLICY IF EXISTS "Enable insert for registration" ON public.user_profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.user_profiles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.user_profiles;
DROP POLICY IF EXISTS "Admin users can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admin users can update all profiles" ON public.user_profiles;

-- Create new, simplified policies for user_profiles
CREATE POLICY "Allow users to manage their own profiles"
ON public.user_profiles
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow public registration"
ON public.user_profiles
FOR INSERT
TO public
WITH CHECK (true);

-- Create WhatsApp auto-replies table
CREATE TABLE IF NOT EXISTS public.whatsapp_auto_replies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users NOT NULL,
    trigger_words text[] NOT NULL DEFAULT '{}',
    response text NOT NULL,
    priority integer NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS on whatsapp_auto_replies
ALTER TABLE public.whatsapp_auto_replies ENABLE ROW LEVEL SECURITY;

-- ❌ (Supprimé) Ne crée plus la politique "Users can manage their own auto-replies"
-- Cette politique existe déjà, inutile de la recréer

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_whatsapp_auto_replies_user_id ON public.whatsapp_auto_replies(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_auto_replies_priority ON public.whatsapp_auto_replies(priority DESC);

-- Trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.whatsapp_auto_replies
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
