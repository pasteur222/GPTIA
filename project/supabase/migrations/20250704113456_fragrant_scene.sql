/*
  # Centralize Webhook Configuration in user_whatsapp_config
  
  1. Changes
    - Migrate any existing webhook_config data to user_whatsapp_config
    - Add webhook_url column to user_whatsapp_config if it doesn't exist
    - Remove webhook_config table as it's no longer needed
  
  2. Security
    - Maintain existing RLS policies
*/

-- First, check if webhook_url column exists in user_whatsapp_config
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_whatsapp_config' 
    AND column_name = 'webhook_url'
  ) THEN
    -- Add webhook_url column if it doesn't exist
    ALTER TABLE user_whatsapp_config ADD COLUMN webhook_url text;
  END IF;
END $$;

-- Migrate data from webhook_config to user_whatsapp_config
DO $$
DECLARE
  webhook_record RECORD;
  user_record RECORD;
BEGIN
  -- Check if webhook_config table exists and has data
  IF EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'webhook_config'
  ) THEN
    -- Get the active webhook config if it exists
    SELECT * INTO webhook_record 
    FROM webhook_config 
    WHERE is_active = true 
    LIMIT 1;
    
    -- If we found an active webhook config
    IF FOUND THEN
      -- Update all active user_whatsapp_config records with this webhook URL
      FOR user_record IN 
        SELECT * FROM user_whatsapp_config 
        WHERE is_active = true
      LOOP
        UPDATE user_whatsapp_config
        SET webhook_url = webhook_record.url,
            updated_at = NOW()
        WHERE id = user_record.id;
      END LOOP;
      
      RAISE NOTICE 'Migrated webhook URL to user_whatsapp_config records';
    END IF;
  END IF;
END $$;

-- Drop the webhook_config table if it exists
DROP TABLE IF EXISTS webhook_config;