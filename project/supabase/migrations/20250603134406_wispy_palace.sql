/*
  # Add Analytics Scripts Table
  
  1. New Table
    - `analytics_scripts`: Stores external analytics tracking scripts
      - `id` (uuid, primary key)
      - `name` (text): Name of the analytics script
      - `script_code` (text): The actual script code to be injected
      - `platform` (text): The analytics platform (google_analytics, facebook_pixel, etc.)
      - `is_active` (boolean): Whether the script is currently active
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

-- Create analytics_scripts table
CREATE TABLE IF NOT EXISTS analytics_scripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  script_code text NOT NULL,
  platform text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE analytics_scripts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow read access to analytics scripts"
  ON analytics_scripts
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow insert to analytics scripts"
  ON analytics_scripts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update to analytics scripts"
  ON analytics_scripts
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow delete to analytics scripts"
  ON analytics_scripts
  FOR DELETE
  TO authenticated
  USING (true);

-- Insert sample analytics scripts
INSERT INTO analytics_scripts (name, script_code, platform, is_active)
VALUES
  (
    'Google Analytics',
    '<!-- Google tag (gtag.js) -->\n<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>\n<script>\n  window.dataLayer = window.dataLayer || [];\n  function gtag(){dataLayer.push(arguments);}\n  gtag(''js'', new Date());\n\n  gtag(''config'', ''G-XXXXXXXXXX'');\n</script>',
    'google_analytics',
    false
  ),
  (
    'Facebook Pixel',
    '<!-- Meta Pixel Code -->\n<script>\n  !function(f,b,e,v,n,t,s)\n  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?\n  n.callMethod.apply(n,arguments):n.queue.push(arguments)};\n  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version=''2.0'';\n  n.queue=[];t=b.createElement(e);t.async=!0;\n  t.src=v;s=b.getElementsByTagName(e)[0];\n  s.parentNode.insertBefore(t,s)}(window, document,''script'',\n  ''https://connect.facebook.net/en_US/fbevents.js'');\n  fbq(''init'', ''XXXXXXXXXXXXXXX'');\n  fbq(''track'', ''PageView'');\n</script>\n<noscript><img height="1" width="1" style="display:none"\n  src="https://www.facebook.com/tr?id=XXXXXXXXXXXXXXX&ev=PageView&noscript=1"\n/></noscript>\n<!-- End Meta Pixel Code -->',
    'facebook_pixel',
    false
  );