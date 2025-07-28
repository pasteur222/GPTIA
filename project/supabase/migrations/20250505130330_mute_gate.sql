/*
  # Update WhatsApp Phone Number ID
  
  1. Changes
    - Update existing WhatsApp configuration with new phone number ID
    - Keep all other configuration values unchanged
    - Ensure the configuration is marked as connected
*/

-- Update configuration with new phone number ID
UPDATE whatsapp_config
SET 
  phone_number_id = '571480576058954',
  updated_at = NOW()
WHERE is_connected = true;

-- If no active configuration exists, insert a new one
INSERT INTO whatsapp_config (
  access_token,
  phone_number_id,
  webhook_secret,
  app_id,
  app_secret,
  is_connected,
  created_at,
  updated_at
)
SELECT
  'EAAJ7KxsnbacBO9tkcbQpN9YRLln0HPbIw6DyBpYrEGsVsXZCtiHv0aQgI0p495X0zcX972Pvk6ZAIl3ZA9ZBbkB4Ly1AMBAtZB0kkAap8d7hIGAZCy6W00kbHxOyHr6GARdQ165YRVyxx4n4ovNYJqnNByFTTf8qm7gKGDkrt5pL0UjMkj18OpTKRZBZCNCpA7ACfPX0hwWuOPBdxvvyR3vtRIBo117dIHHMMTqBDveh',
  '571480576058954',
  'https://apiface-juj7.onrender.com/webhook',
  '698375022800295',
  'b37d4c8cdcbaddf4148dede726a1f4fd',
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM whatsapp_config WHERE is_connected = true
);