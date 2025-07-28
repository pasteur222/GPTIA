-- Create policy for insert access without using role() function
DROP POLICY IF EXISTS "Allow insert access to authenticated users" ON whatsapp_templates;
CREATE POLICY "Allow insert access to authenticated users"
  ON whatsapp_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- First, ensure template_name has a unique constraint
DO $$ 
BEGIN
  -- Check if the unique constraint already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'whatsapp_templates_template_name_key' 
    AND conrelid = 'whatsapp_templates'::regclass
  ) THEN
    -- Add unique constraint if it doesn't exist
    ALTER TABLE whatsapp_templates ADD CONSTRAINT whatsapp_templates_template_name_key UNIQUE (template_name);
  END IF;
END $$;

-- Insert or update payment_receipt template with customizable footer
INSERT INTO whatsapp_templates (template_name, category, status, header_type, parameters)
VALUES (
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
        "text": "Bonjour {{1}},\n\nVoici votre reçu pour le paiement de {{2}} effectué le {{3}}.\n\nMerci pour votre confiance!",
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
        "format": "text",
        "text": "Merci pour votre confiance! Votre satisfaction est notre priorité."
      }
    ]
  }'::jsonb
)
ON CONFLICT (template_name) DO UPDATE
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
      "text": "Bonjour {{1}},\n\nVoici votre reçu pour le paiement de {{2}} effectué le {{3}}.\n\nMerci pour votre confiance!",
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
      "format": "text",
      "text": "Merci pour votre confiance! Votre satisfaction est notre priorité."
    }
  ]
}'::jsonb;

-- Insert appointment_reminder template with customizable footer if it doesn't exist
INSERT INTO whatsapp_templates (template_name, category, status, header_type, parameters)
VALUES (
  'appointment_reminder',
  'UTILITY',
  'APPROVED',
  'image',
  '{
    "components": [
      {
        "type": "header",
        "format": "image",
        "example": {
          "header_handle": "https://images.pexels.com/photos/3845456/pexels-photo-3845456.jpeg"
        }
      },
      {
        "type": "body",
        "text": "Bonjour {{1}},\n\nCeci est un rappel pour votre rendez-vous {{2}} le {{3}} à {{4}}.\n\nVeuillez confirmer votre présence en répondant à ce message.",
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
        "text": "Merci de votre confiance. N''hésitez pas à nous contacter pour toute question."
      }
    ]
  }'::jsonb
)
ON CONFLICT (template_name) DO UPDATE
SET parameters = '{
  "components": [
    {
      "type": "header",
      "format": "image",
      "example": {
        "header_handle": "https://images.pexels.com/photos/3845456/pexels-photo-3845456.jpeg"
      }
    },
    {
      "type": "body",
      "text": "Bonjour {{1}},\n\nCeci est un rappel pour votre rendez-vous {{2}} le {{3}} à {{4}}.\n\nVeuillez confirmer votre présence en répondant à ce message.",
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
      "text": "Merci de votre confiance. N''hésitez pas à nous contacter pour toute question."
    }
  ]
}'::jsonb;