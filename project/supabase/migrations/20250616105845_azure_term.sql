/*
  # Add Customizable Footers to All Templates
  
  1. Changes
    - Ensure all templates have customizable footers
    - Update template structure to match Meta API format
    - Fix policy to use authenticated instead of role()
  
  2. Security
    - Use authenticated directly in policies
*/

-- Create policy for read access without using role() function
DROP POLICY IF EXISTS "Allow read access to authenticated users" ON whatsapp_templates;
CREATE POLICY "Allow read access to authenticated users"
  ON whatsapp_templates
  FOR SELECT
  TO authenticated
  USING (true);

-- Insert welcome_message template if it doesn't exist
INSERT INTO whatsapp_templates (template_name, category, status, header_type, parameters)
SELECT 
  'welcome_message',
  'MARKETING',
  'APPROVED',
  'text',
  '{
    "components": [
      {
        "type": "header",
        "format": "text",
        "text": "Bienvenue {{1}}!"
      },
      {
        "type": "body",
        "text": "Merci de vous être inscrit à notre service. Nous sommes ravis de vous avoir parmi nous.\n\nVotre compte est maintenant actif et vous pouvez commencer à utiliser nos services.",
        "parameters": [
          {
            "type": "text"
          }
        ]
      },
      {
        "type": "footer",
        "format": "text",
        "text": "Envoyé par Airtel GPT"
      }
    ]
  }'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM whatsapp_templates WHERE template_name = 'welcome_message'
);

-- Insert order_confirmation template if it doesn't exist
INSERT INTO whatsapp_templates (template_name, category, status, header_type, parameters)
SELECT 
  'order_confirmation',
  'UTILITY',
  'APPROVED',
  'text',
  '{
    "components": [
      {
        "type": "header",
        "format": "text",
        "text": "Confirmation de commande #{{1}}"
      },
      {
        "type": "body",
        "text": "Bonjour {{1}},\n\nVotre commande #{{2}} a été confirmée et est en cours de traitement.\n\nMontant total: {{3}}\nDate de livraison estimée: {{4}}",
        "parameters": [
          {
            "type": "text"
          },
          {
            "type": "text"
          },
          {
            "type": "text"
          },
          {
            "type": "text"
          }
        ]
      },
      {
        "type": "footer",
        "format": "text",
        "text": "Merci pour votre achat!"
      }
    ]
  }'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM whatsapp_templates WHERE template_name = 'order_confirmation'
);

-- Insert promotional_offer template if it doesn't exist
INSERT INTO whatsapp_templates (template_name, category, status, header_type, parameters)
SELECT 
  'promotional_offer',
  'MARKETING',
  'APPROVED',
  'video',
  '{
    "components": [
      {
        "type": "header",
        "format": "video",
        "example": {
          "header_handle": "https://example.com/promo.mp4"
        }
      },
      {
        "type": "body",
        "text": "Bonjour {{1}},\n\nNous avons une offre spéciale pour vous! Profitez de {{2}}% de réduction sur tous nos produits jusqu''au {{3}}.\n\nUtilisez le code promo: {{4}}",
        "parameters": [
          {
            "type": "text"
          },
          {
            "type": "text"
          },
          {
            "type": "text"
          },
          {
            "type": "text"
          }
        ]
      },
      {
        "type": "footer",
        "format": "document",
        "text": "Offre soumise à conditions"
      }
    ]
  }'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM whatsapp_templates WHERE template_name = 'promotional_offer'
);