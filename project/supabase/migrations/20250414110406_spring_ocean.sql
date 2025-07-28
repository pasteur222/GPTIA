/*
  # Update WhatsApp configuration with new API details
  
  1. Changes
    - Add new columns for API credentials
    - Update existing configuration
*/

-- Add new columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'whatsapp_config' AND column_name = 'app_id') THEN
    ALTER TABLE whatsapp_config ADD COLUMN app_id text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'whatsapp_config' AND column_name = 'app_secret') THEN
    ALTER TABLE whatsapp_config ADD COLUMN app_secret text;
  END IF;
END $$;

-- Update configuration with new API details
UPDATE whatsapp_config
SET 
  app_id = '1700090227531351',
  app_secret = 'bd5a192f5503b2f68ed9e9621e2e9304',
  updated_at = NOW()
WHERE is_connected = true;