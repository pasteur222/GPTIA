/*
  # Check for existing policy before creating it
  
  This migration checks if the "Users can manage their own auto-replies" policy
  already exists on the whatsapp_auto_replies table before attempting to create it.
  This prevents duplicate policy errors when the application loads.
*/

-- First, make sure the policy_exists function is available
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'policy_exists'
  ) THEN
    -- Create the function if it doesn't exist
    CREATE FUNCTION policy_exists(
      policy_name text,
      table_name text,
      schema_name text DEFAULT 'public'
    ) RETURNS boolean AS $$
    BEGIN
      RETURN EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = schema_name
        AND tablename = table_name
        AND policyname = policy_name
      );
    END;
    $$ LANGUAGE plpgsql;
  END IF;
END $$;

-- Now safely create the policy only if it doesn't exist
DO $$ 
BEGIN
  -- Check if the table exists first
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'whatsapp_auto_replies'
  ) THEN
    -- Only create the policy if it doesn't already exist
    IF NOT policy_exists('Users can manage their own auto-replies', 'whatsapp_auto_replies') THEN
      CREATE POLICY "Users can manage their own auto-replies"
      ON whatsapp_auto_replies
      FOR ALL
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
    END IF;
  END IF;
END $$;