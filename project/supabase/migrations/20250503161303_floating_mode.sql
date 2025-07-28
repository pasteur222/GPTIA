/*
  # Update WhatsApp configuration with new API details
  
  1. Changes
    - Update existing WhatsApp configuration with new access token and phone number ID
    - Add new app_id and app_secret values
    - Update webhook secret
    - Ensure the configuration is marked as connected
*/

-- Update configuration with new API details
UPDATE whatsapp_config
SET 
  access_token = 'EAAJ7KxsnbacBO9tkcbQpN9YRLln0HPbIw6DyBpYrEGsVsXZCtiHv0aQgI0p495X0zcX972Pvk6ZAIl3ZA9ZBbkB4Ly1AMBAtZB0kkAap8d7hIGAZCy6W00kbHxOyHr6GARdQ165YRVyxx4n4ovNYJqnNByFTTf8qm7gKGDkrt5pL0UjMkj18OpTKRZBZCNCpA7ACfPX0hwWuOPBdxvvyR3vtRIBo117dIHHMMTqBDveh',
  phone_number_id = '658220764041628',
  app_id = '698375022800295',
  app_secret = 'b37d4c8cdcbaddf4148dede726a1f4fd',
  webhook_secret = 'https://apiface-juj7.onrender.com/webhook',
  is_connected = true,
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
  '658220764041628',
  'https://apiface-juj7.onrender.com/webhook',
  '698375022800295',
  'b37d4c8cdcbaddf4148dede726a1f4fd',
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM whatsapp_config WHERE is_connected = true
);