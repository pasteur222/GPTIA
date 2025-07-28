/*
  # Add RLS policies for payment_api_config table

  1. Changes
    - Enable RLS on payment_api_config table
    - Add policies for authenticated users to:
      - Insert new payment configurations
      - Update existing configurations
      - Read payment configurations
    
  2. Security
    - Only authenticated users can access payment configurations
    - All authenticated users can manage payment configurations
*/

-- Enable RLS
ALTER TABLE payment_api_config ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to insert payment configurations
CREATE POLICY "Users can insert payment configurations"
ON payment_api_config
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy to allow authenticated users to update payment configurations
CREATE POLICY "Users can update payment configurations"
ON payment_api_config
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Policy to allow authenticated users to read payment configurations
CREATE POLICY "Users can read payment configurations"
ON payment_api_config
FOR SELECT
TO authenticated
USING (true);