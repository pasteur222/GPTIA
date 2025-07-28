/*
  # Safe Policy Creation Migration
  
  This migration adds a function to safely create policies without duplicates.
  It will check if a policy exists before attempting to create it.
*/

-- Create a function to safely create a policy
CREATE OR REPLACE FUNCTION create_policy_if_not_exists(
  policy_name text,
  table_name text,
  operation text, -- 'ALL', 'SELECT', 'INSERT', 'UPDATE', 'DELETE'
  role_name text, -- 'public', 'authenticated', etc.
  using_expr text,
  with_check_expr text DEFAULT NULL,
  schema_name text DEFAULT 'public'
) RETURNS void AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = schema_name
    AND tablename = table_name
    AND policyname = policy_name
  ) THEN
    IF with_check_expr IS NULL THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I.%I FOR %s TO %I USING (%s)',
        policy_name, schema_name, table_name, operation, role_name, using_expr
      );
    ELSE
      EXECUTE format(
        'CREATE POLICY %I ON %I.%I FOR %s TO %I USING (%s) WITH CHECK (%s)',
        policy_name, schema_name, table_name, operation, role_name, using_expr, with_check_expr
      );
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Example usage:
/*
SELECT create_policy_if_not_exists(
  'Allow users to view own profile',
  'user_profiles',
  'SELECT',
  'authenticated',
  'auth.uid() = user_id'
);

SELECT create_policy_if_not_exists(
  'Allow users to update own profile',
  'user_profiles',
  'UPDATE',
  'authenticated',
  'auth.uid() = user_id',
  'auth.uid() = user_id'
);
*/