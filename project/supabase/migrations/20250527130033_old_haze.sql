/*
  # Add Message Logs Table
  
  1. New Table
    - `message_logs`: Stores WhatsApp message delivery status
      - `id` (uuid, primary key)
      - `status` (text): Message status (pending, sent, delivered, failed)
      - `phone_number` (text): Recipient phone number
      - `message_preview` (text): Preview of the message content
      - `message_id` (text): WhatsApp message ID for tracking
      - `error` (text): Error message if delivery failed
      - `created_at` (timestamptz): When the log was created
      - `updated_at` (timestamptz): When the log was last updated
  
  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

-- Create message_logs table
CREATE TABLE IF NOT EXISTS message_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL,
  phone_number text,
  message_preview text,
  message_id text,
  error text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE message_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Read message logs"
  ON message_logs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Insert message logs"
  ON message_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Update message logs"
  ON message_logs
  FOR UPDATE
  TO authenticated
  USING (true);

-- Create indexes
CREATE INDEX idx_message_logs_status ON message_logs(status);
CREATE INDEX idx_message_logs_message_id ON message_logs(message_id);
CREATE INDEX idx_message_logs_created_at ON message_logs(created_at);

-- Create updated_at function
CREATE OR REPLACE FUNCTION update_message_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_message_logs_updated_at
  BEFORE UPDATE ON message_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_message_logs_updated_at();