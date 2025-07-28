-- Create whatsapp_templates table if it doesn't exist
CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name text NOT NULL,
  category text,
  status text,
  header_type text,
  parameters jsonb,
  created_at timestamp without time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;

-- Create policy for read access without using role() function
DROP POLICY IF EXISTS "Allow read for authenticated users" ON whatsapp_templates;
CREATE POLICY "Allow read for authenticated users"
  ON whatsapp_templates
  FOR SELECT
  TO authenticated
  USING (true);

-- Update payment_receipt template with customizable footer
UPDATE whatsapp_templates 
SET parameters = '{
  "components": [
    {
      "type": "header",
      "format": "document",
      "example": {
        "header_handle": "https://example.com/receipt.pdf"
      }
    },
    {
      "type": "body",
      "text": "Bonjour {{1}}, voici votre reçu pour le paiement de {{2}} effectué le {{3}}.",
      "parameters": [
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
      "format": "image",
      "text": "Merci pour votre confiance! Votre satisfaction est notre priorité."
    }
  ]
}'::jsonb
WHERE template_name = 'payment_receipt';

-- Insert payment_receipt template if it doesn't exist
INSERT INTO whatsapp_templates (template_name, category, status, header_type, parameters)
SELECT 
  'payment_receipt',
  'UTILITY',
  'APPROVED',
  'document',
  '{
    "components": [
      {
        "type": "header",
        "format": "document",
        "example": {
          "header_handle": "https://example.com/receipt.pdf"
        }
      },
      {
        "type": "body",
        "text": "Bonjour {{1}}, voici votre reçu pour le paiement de {{2}} effectué le {{3}}.",
        "parameters": [
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
        "format": "image",
        "text": "Merci pour votre confiance! Votre satisfaction est notre priorité."
      }
    ]
  }'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM whatsapp_templates WHERE template_name = 'payment_receipt'
);