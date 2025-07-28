-- Add education subscription plans to pricing table if they don't exist
INSERT INTO pricing ("plan tarifaire", price)
VALUES
  ('daily', 500),
  ('weekly', 2500),
  ('monthly', 5000)
ON CONFLICT ("plan tarifaire") DO UPDATE
SET price = EXCLUDED.price;