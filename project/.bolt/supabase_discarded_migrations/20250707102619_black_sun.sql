/*
  # Add user_id to student_profiles table
  
  1. Changes
    - Add user_id column to student_profiles table
    - This links student profiles to auth.users
    - Enables retrieving Groq API configuration for students
  
  2. Security
    - Maintain existing RLS policies
*/

-- Add user_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'student_profiles' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE student_profiles ADD COLUMN user_id uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_student_profiles_user_id ON student_profiles(user_id);

-- Update existing student profiles with user_id from user_profiles if possible
UPDATE student_profiles sp
SET user_id = up.user_id
FROM user_profiles up
WHERE sp.phone_number = up.phone_number
AND sp.user_id IS NULL
AND up.user_id IS NOT NULL;