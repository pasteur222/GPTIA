/*
  # Add Scheduled Messages Table

  1. New Tables
    - `scheduled_messages`: Stores scheduled WhatsApp messages
      - `id` (uuid, primary key)
      - `message` (text): Message content
      - `recipients` (text[]): List of recipient phone numbers
      - `send_at` (timestamptz): When to send the message
      - `repeat_type` (text): Repeat frequency (none, daily, weekly, monthly)
      - `status` (text): Message status (scheduled, sent, failed)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

CREATE TABLE IF NOT EXISTS scheduled_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message text NOT NULL,
  recipients text[] NOT NULL,
  send_at timestamptz NOT NULL,
  repeat_type text NOT NULL CHECK (repeat_type IN ('none', 'daily', 'weekly', 'monthly')),
  status text NOT NULL CHECK (status IN ('scheduled', 'sent', 'failed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE scheduled_messages ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow read access to scheduled messages"
  ON scheduled_messages
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow insert to scheduled messages"
  ON scheduled_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update to scheduled messages"
  ON scheduled_messages
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow delete to scheduled messages"
  ON scheduled_messages
  FOR DELETE
  TO authenticated
  USING (true);

-- Create index for faster queries
CREATE INDEX idx_scheduled_messages_send_at ON scheduled_messages(send_at);
CREATE INDEX idx_scheduled_messages_status ON scheduled_messages(status);