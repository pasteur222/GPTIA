/*
  # Add RPC Functions for Admin Creation
  
  1. New Functions
    - check_column_exists: Check if a column exists in a table
    - add_is_admin_column: Add is_admin column to user_profiles if it doesn't exist
*/

-- Function to check if a column exists in a table
CREATE OR REPLACE FUNCTION check_column_exists(table_name text, column_name text)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  column_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = check_column_exists.table_name
      AND column_name = check_column_exists.column_name
  ) INTO column_exists;
  
  RETURN column_exists;
END;
$$;

-- Function to add is_admin column to user_profiles if it doesn't exist
CREATE OR REPLACE FUNCTION add_is_admin_column()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_profiles'
      AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN is_admin boolean DEFAULT false;
  END IF;
END;
$$;