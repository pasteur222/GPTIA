-- Create message_logs table if it doesn't exist
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

-- Enable RLS if not already enabled
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'message_logs' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE message_logs ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Create policies if they don't exist
DO $$ 
BEGIN
  -- Read policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'message_logs' 
    AND policyname = 'Read message logs'
  ) THEN
    CREATE POLICY "Read message logs"
      ON message_logs
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  -- Insert policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'message_logs' 
    AND policyname = 'Insert message logs'
  ) THEN
    CREATE POLICY "Insert message logs"
      ON message_logs
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;

  -- Update policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'message_logs' 
    AND policyname = 'Update message logs'
  ) THEN
    CREATE POLICY "Update message logs"
      ON message_logs
      FOR UPDATE
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Create indexes if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'message_logs' 
    AND indexname = 'idx_message_logs_status'
  ) THEN
    CREATE INDEX idx_message_logs_status ON message_logs(status);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'message_logs' 
    AND indexname = 'idx_message_logs_message_id'
  ) THEN
    CREATE INDEX idx_message_logs_message_id ON message_logs(message_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'message_logs' 
    AND indexname = 'idx_message_logs_created_at'
  ) THEN
    CREATE INDEX idx_message_logs_created_at ON message_logs(created_at);
  END IF;
END $$;

-- Create or replace function for updated_at timestamp
CREATE OR REPLACE FUNCTION update_message_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_message_logs_updated_at'
  ) THEN
    CREATE TRIGGER update_message_logs_updated_at
      BEFORE UPDATE ON message_logs
      FOR EACH ROW
      EXECUTE FUNCTION update_message_logs_updated_at();
  END IF;
END $$;