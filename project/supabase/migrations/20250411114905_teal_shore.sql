-- Create WhatsApp configuration table
CREATE TABLE IF NOT EXISTS whatsapp_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token text NOT NULL,
  phone_number_id text NOT NULL,
  webhook_url text,
  webhook_token text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create message logs table
CREATE TABLE IF NOT EXISTS message_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid,
  status text NOT NULL,
  phone_number text,
  message_preview text,
  error text,
  message_id text,
  created_at timestamptz DEFAULT now()
);

-- Create WhatsApp status table
CREATE TABLE IF NOT EXISTS whatsapp_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_connected boolean DEFAULT false,
  last_check timestamptz DEFAULT now(),
  error_message text,
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE whatsapp_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_status ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow read access to whatsapp config"
  ON whatsapp_config
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow update to whatsapp config"
  ON whatsapp_config
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow read access to message logs"
  ON message_logs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow insert to message logs"
  ON message_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow read access to whatsapp status"
  ON whatsapp_status
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow update to whatsapp status"
  ON whatsapp_status
  FOR UPDATE
  TO authenticated
  USING (true);