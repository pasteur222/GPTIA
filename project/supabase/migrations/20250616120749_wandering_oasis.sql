/*
  # Add WhatsApp Business Account ID to user_whatsapp_config
  
  1. Changes
    - Add whatsapp_business_account_id column to user_whatsapp_config table
    - This field will be used to retrieve message templates from the user's Meta account
  
  2. Benefits
    - More accurate template retrieval
    - Better support for users with multiple phone numbers under the same business account
    - Improved template management
*/

-- Add whatsapp_business_account_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_whatsapp_config' 
    AND column_name = 'whatsapp_business_account_id'
  ) THEN
    ALTER TABLE user_whatsapp_config ADD COLUMN whatsapp_business_account_id text;
  END IF;
END $$;