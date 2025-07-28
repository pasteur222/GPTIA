/*
  # Update Webhook Configuration
  
  1. Changes
    - Populate the webhook_config table with current webhook information
    - Ensure the webhook_config table has the correct URL
    - Set the webhook as active
  
  2. Security
    - Maintain existing RLS policies
*/

-- Insert or update webhook configuration
INSERT INTO webhook_config (
  url,
  verify_token,
  is_active,
  created_at,
  updated_at
)
VALUES (
  'https://webhook-telecombusiness.onrender.com/webhook',
  'whatsapp-webhook-secret',
  true,
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING;