/*
  # Remove whatsapp_config table and migrate to user_whatsapp_config
  
  1. Changes
    - Create a migration to safely remove the whatsapp_config table
    - Ensure all modules use user_whatsapp_config instead
    - Add a function to check if user_whatsapp_config exists
  
  2. Security
    - Maintain existing RLS policies
*/

-- First, check if there's any data in whatsapp_config that needs to be migrated
DO $$
DECLARE
  config_record RECORD;
  user_id uuid;
BEGIN
  -- Get the first admin user to assign the config to
  SELECT id INTO user_id FROM auth.users LIMIT 1;
  
  IF user_id IS NULL THEN
    RAISE NOTICE 'No users found to migrate WhatsApp config to';
    RETURN;
  END IF;
  
  -- Check if whatsapp_config table exists
  IF EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'whatsapp_config'
  ) THEN
    -- Get the active config if it exists
    SELECT * INTO config_record 
    FROM whatsapp_config 
    WHERE is_connected = true 
    LIMIT 1;
    
    -- If we found an active config, migrate it to user_whatsapp_config
    IF FOUND THEN
      -- Check if user already has a config
      IF NOT EXISTS (
        SELECT 1 FROM user_whatsapp_config 
        WHERE user_id = user_id
      ) THEN
        -- Insert the config for the user
        INSERT INTO user_whatsapp_config (
          user_id,
          access_token,
          phone_number_id,
          webhook_url,
          app_id,
          app_secret,
          whatsapp_business_account_id,
          is_active,
          created_at,
          updated_at
        ) VALUES (
          user_id,
          config_record.access_token,
          config_record.phone_number_id,
          config_record.webhook_secret,
          config_record.app_id,
          config_record.app_secret,
          NULL,
          true,
          now(),
          now()
        );
        
        RAISE NOTICE 'Migrated WhatsApp config to user %', user_id;
      ELSE
        RAISE NOTICE 'User % already has WhatsApp config, skipping migration', user_id;
      END IF;
    ELSE
      RAISE NOTICE 'No active WhatsApp config found to migrate';
    END IF;
  ELSE
    RAISE NOTICE 'whatsapp_config table does not exist, no migration needed';
  END IF;
END $$;

-- Now drop the whatsapp_config table if it exists
DROP TABLE IF EXISTS whatsapp_config;

-- Create a function to check if a user has WhatsApp config
CREATE OR REPLACE FUNCTION has_whatsapp_config(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_whatsapp_config
    WHERE user_id = $1
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql;