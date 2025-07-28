/*
  # Add WhatsApp Sessions Table (Fixed Version)
  
  1. New Table
    - `whatsapp_sessions`: Stores WhatsApp Web session information
      - `id` (uuid, primary key)
      - `user_id` (uuid): Reference to auth.users
      - `qr_code` (text): QR code for WhatsApp Web connection
      - `status` (text): Connection status
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

-- Create whatsapp_sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  qr_code text,
  status text NOT NULL CHECK (status IN ('pending', 'connected', 'disconnected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE whatsapp_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies if they don't exist
DO $$ 
BEGIN
  -- Select policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'whatsapp_sessions' 
    AND policyname = 'View own WhatsApp session'
  ) THEN
    CREATE POLICY "View own WhatsApp session"
      ON whatsapp_sessions
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  -- Insert policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'whatsapp_sessions' 
    AND policyname = 'Create own WhatsApp session'
  ) THEN
    CREATE POLICY "Create own WhatsApp session"
      ON whatsapp_sessions
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  -- Update policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'whatsapp_sessions' 
    AND policyname = 'Update own WhatsApp session'
  ) THEN
    CREATE POLICY "Update own WhatsApp session"
      ON whatsapp_sessions
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_user ON whatsapp_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_status ON whatsapp_sessions(status);