/*
  # Add default_language column to user_whatsapp_config table
  
  1. Changes
    - Add default_language column to user_whatsapp_config table
    - Add message_delay and max_retries columns for message sending configuration
    - Add notification_email column for error notifications
    - Add rate_limit configuration for controlling message sending rates
  
  2. Benefits
    - Support for multiple languages in WhatsApp messages
    - Better control over message sending behavior
    - Improved error handling and notification
*/

-- Add default_language column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_whatsapp_config' 
    AND column_name = 'default_language'
  ) THEN
    ALTER TABLE user_whatsapp_config ADD COLUMN default_language text DEFAULT 'fr';
  END IF;
END $$;

-- Add message_delay column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_whatsapp_config' 
    AND column_name = 'message_delay'
  ) THEN
    ALTER TABLE user_whatsapp_config ADD COLUMN message_delay integer DEFAULT 1000;
  END IF;
END $$;

-- Add max_retries column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_whatsapp_config' 
    AND column_name = 'max_retries'
  ) THEN
    ALTER TABLE user_whatsapp_config ADD COLUMN max_retries integer DEFAULT 3;
  END IF;
END $$;

-- Add notification_email column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_whatsapp_config' 
    AND column_name = 'notification_email'
  ) THEN
    ALTER TABLE user_whatsapp_config ADD COLUMN notification_email text;
  END IF;
END $$;

-- Add rate_limit column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_whatsapp_config' 
    AND column_name = 'rate_limit'
  ) THEN
    ALTER TABLE user_whatsapp_config ADD COLUMN rate_limit jsonb DEFAULT '{"enabled": true, "max_per_hour": 60, "cooldown_minutes": 15}'::jsonb;
  END IF;
END $$;