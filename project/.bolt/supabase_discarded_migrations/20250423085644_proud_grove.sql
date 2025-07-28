/*
  # Helper function to check if a policy exists before creating it
  
  This function helps avoid creating duplicate policies by checking if a policy
  with the same name already exists on the specified table.
*/

-- Create a function to check if a policy exists
CREATE OR REPLACE FUNCTION policy_exists(
  policy_name text,
  table_name text,
  schema_name text DEFAULT 'public'
) RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = schema_name
    AND tablename = table_name
    AND policyname = policy_name
  );
END;
$$ LANGUAGE plpgsql;

-- Example of how to use this function in migrations:
/*
DO $$ 
BEGIN
  -- Only create the policy if it doesn't already exist
  IF NOT policy_exists('Allow users to view own profile', 'user_profiles') THEN
    CREATE POLICY "Allow users to view own profile"
      ON user_profiles
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;
*/