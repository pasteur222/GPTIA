/*
  # Add Appearance Settings Table
  
  1. New Table
    - `appearance_settings`: Stores application appearance settings
      - `id` (uuid, primary key)
      - `theme_color` (text): Primary theme color (yellow, blue, green, red, purple)
      - `font_size` (text): Font size setting (small, normal, large)
      - `dark_mode` (boolean): Whether dark mode is enabled
      - `reduced_motion` (boolean): Whether reduced motion is enabled
      - `custom_css` (text): Custom CSS for advanced customization
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

-- Create appearance_settings table
CREATE TABLE IF NOT EXISTS appearance_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_color text NOT NULL DEFAULT 'yellow',
  font_size text NOT NULL DEFAULT 'normal',
  dark_mode boolean DEFAULT false,
  reduced_motion boolean DEFAULT false,
  custom_css text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE appearance_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can manage appearance settings"
  ON appearance_settings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert default settings
INSERT INTO appearance_settings (
  theme_color,
  font_size,
  dark_mode,
  reduced_motion,
  custom_css
) VALUES (
  'yellow',
  'normal',
  false,
  false,
  '/* Custom CSS for MTN theme */
:root {
  --primary-color: #ffcc00;
  --primary-hover: #e6b800;
}
'
)
ON CONFLICT DO NOTHING;