/*
  # Add WhatsApp Sessions Table
  
  1. New Tables
    - `whatsapp_sessions`: Stores WhatsApp Web session information
      - `id` (uuid, primary key)
      - `user_id` (uuid): Reference to auth.users
      - `qr_code` (text): Base64 encoded QR code
      - `status` (text): Connection status
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

-- Create WhatsApp sessions table
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

-- Create policies
CREATE POLICY "Users can view their own sessions"
  ON whatsapp_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sessions"
  ON whatsapp_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
  ON whatsapp_sessions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_whatsapp_sessions_user ON whatsapp_sessions(user_id);
CREATE INDEX idx_whatsapp_sessions_status ON whatsapp_sessions(status);