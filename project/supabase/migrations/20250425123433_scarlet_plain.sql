/*
  # Update WhatsApp configuration with new API details
  
  1. Changes
    - Update existing WhatsApp configuration with new access token and phone number ID
    - Ensure the configuration is marked as connected
*/

-- Update configuration with new API details
UPDATE whatsapp_config
SET 
  access_token = 'EAATBkD8Lr48BO6OOJySMParbSilwjp4s25j7I13ckOzIWHIFBirTBX3mxnpXz61KupHWDbbA7m28a2beEKwKuVHtTC6odQREv12bw22SdlwmWn2oc6kUZAajwTEfZCoS3Mh4BL71RuxNJu2mZAwGOzcyghwb8XAgpdorqqwFtQZBWixaV2ZAV2bKiKm6zQqTWzqvLGu1xUV8ZBMEp10o2ixQqyTABX8ijOIkFP',
  phone_number_id = '607734842430270',
  is_connected = true,
  updated_at = NOW()
WHERE is_connected = true;

-- If no active configuration exists, insert a new one
INSERT INTO whatsapp_config (
  access_token,
  phone_number_id,
  webhook_secret,
  is_connected,
  created_at,
  updated_at
)
SELECT
  'EAATBkD8Lr48BO6OOJySMParbSilwjp4s25j7I13ckOzIWHIFBirTBX3mxnpXz61KupHWDbbA7m28a2beEKwKuVHtTC6odQREv12bw22SdlwmWn2oc6kUZAajwTEfZCoS3Mh4BL71RuxNJu2mZAwGOzcyghwb8XAgpdorqqwFtQZBWixaV2ZAV2bKiKm6zQqTWzqvLGu1xUV8ZBMEp10o2ixQqyTABX8ijOIkFP',
  '607734842430270',
  'whatsapp-webhook-secret',
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM whatsapp_config WHERE is_connected = true
);