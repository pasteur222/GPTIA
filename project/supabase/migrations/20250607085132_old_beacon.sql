/*
  # Add app_icon_url to app_settings table
  
  1. Changes
    - Add app_icon_url column to app_settings table
    - This column will store the URL to the app icon image
    - The app icon will be displayed next to the app name in the navigation bar
*/

-- Add app_icon_url column to app_settings table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'app_settings' 
    AND column_name = 'app_icon_url'
  ) THEN
    ALTER TABLE app_settings ADD COLUMN app_icon_url text;
  END IF;
END $$;