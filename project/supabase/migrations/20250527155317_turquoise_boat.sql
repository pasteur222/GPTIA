/*
  # Add WhatsApp Valid Numbers Table
  
  1. New Table
    - `whatsapp_valid_numbers`: Stores validated WhatsApp numbers
      - `id` (uuid, primary key)
      - `phone_number` (text): The phone number in E.164 format
      - `wa_id` (text): WhatsApp ID returned by the API
      - `validated_at` (timestamptz): When the number was validated
      - `created_at` (timestamptz): When the record was created
  
  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

-- Create whatsapp_valid_numbers table
CREATE TABLE IF NOT EXISTS whatsapp_valid_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text UNIQUE NOT NULL,
  wa_id text,
  validated_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE whatsapp_valid_numbers ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Read whatsapp valid numbers"
  ON whatsapp_valid_numbers
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Insert whatsapp valid numbers"
  ON whatsapp_valid_numbers
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_whatsapp_valid_numbers_phone ON whatsapp_valid_numbers(phone_number);