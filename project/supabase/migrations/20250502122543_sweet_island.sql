/*
  # Update WhatsApp configuration with new API details
  
  1. Changes
    - Update existing WhatsApp configuration with new access token and phone number ID
    - Add new app_id and app_secret values
    - Ensure the configuration is marked as connected
*/

-- Update configuration with new API details
UPDATE whatsapp_config
SET 
  access_token = 'EAAJ7KxsnbacBO1d4QkSnYmb48hYFmKT8EBxmaPJZAMYobsYhgb8ZAIhjtYor9U5tn2EG2NNbjLc0ptsC58oazg3PMsEADlBeTJGrUUqd3rXhLM4KW1bSfsK4ZCj6jYIJQctDFUelZAAd9YoFXoAuwe8bg7s38AWBUulGL482Kv1E3B4OaZCubq8A47Ma3PSOaHMZC9WkkZCmM5iQiNZBNdUJ7sJCYvfsMS78ot2vIlAZD',
  phone_number_id = '573880335818739',
  app_id = '698375022800295',
  app_secret = 'b37d4c8cdcbaddf4148dede726a1f4fd',
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
  'EAAJ7KxsnbacBO1d4QkSnYmb48hYFmKT8EBxmaPJZAMYobsYhgb8ZAIhjtYor9U5tn2EG2NNbjLc0ptsC58oazg3PMsEADlBeTJGrUUqd3rXhLM4KW1bSfsK4ZCj6jYIJQctDFUelZAAd9YoFXoAuwe8bg7s38AWBUulGL482Kv1E3B4OaZCubq8A47Ma3PSOaHMZC9WkkZCmM5iQiNZBNdUJ7sJCYvfsMS78ot2vIlAZD',
  '573880335818739',
  'b37d4c8cdcbaddf4148dede726a1f4fd',
  '698375022800295',
  'b37d4c8cdcbaddf4148dede726a1f4fd',
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM whatsapp_config WHERE is_connected = true
);