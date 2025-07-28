-- Create pricing table if it doesn't exist
CREATE TABLE IF NOT EXISTS pricing (
  id SERIAL PRIMARY KEY,
  "plan tarifaire" text UNIQUE NOT NULL,
  price integer NOT NULL
);

-- Enable RLS
ALTER TABLE pricing ENABLE ROW LEVEL SECURITY;

-- Create policy if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'pricing' 
    AND policyname = 'Allow all'
  ) THEN
    CREATE POLICY "Allow all"
      ON pricing
      FOR ALL
      TO public
      USING (true);
  END IF;
END $$;

-- Insert default pricing
INSERT INTO pricing ("plan tarifaire", price)
VALUES
  ('basic', 70000),
  ('pro', 200000),
  ('enterprise', 300000)
ON CONFLICT ("plan tarifaire") DO UPDATE
SET price = EXCLUDED.price;

-- Create unique index if it doesn't exist
CREATE UNIQUE INDEX IF NOT EXISTS pricing_plan_key ON pricing ("plan tarifaire");