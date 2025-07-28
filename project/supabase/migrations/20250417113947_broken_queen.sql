/*
  # Add Auto-Reply Improvements
  
  1. Changes
    - Add support for variables in responses
    - Add analytics tracking
    - Add regex pattern matching
    - Add rate limiting
    
  2. New Tables
    - auto_reply_analytics: Track usage statistics
    - auto_reply_rate_limits: Track rate limiting
*/

-- Add variable support and regex to auto replies
ALTER TABLE whatsapp_auto_replies
ADD COLUMN IF NOT EXISTS variables jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS use_regex boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS pattern_flags text DEFAULT '';

-- Create analytics table
CREATE TABLE IF NOT EXISTS auto_reply_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid REFERENCES whatsapp_auto_replies(id) ON DELETE CASCADE,
  phone_number text NOT NULL,
  triggered_at timestamptz DEFAULT now(),
  response_time double precision,
  variables_used jsonb DEFAULT '{}',
  successful boolean DEFAULT true
);

-- Create rate limiting table
CREATE TABLE IF NOT EXISTS auto_reply_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid REFERENCES whatsapp_auto_replies(id) ON DELETE CASCADE,
  phone_number text NOT NULL,
  count integer DEFAULT 1,
  first_trigger timestamptz DEFAULT now(),
  last_trigger timestamptz DEFAULT now(),
  cooldown_until timestamptz
);

-- Enable RLS
ALTER TABLE auto_reply_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_reply_rate_limits ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own analytics"
ON auto_reply_analytics
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM whatsapp_auto_replies ar
    WHERE ar.id = auto_reply_analytics.rule_id
    AND ar.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view their own rate limits"
ON auto_reply_rate_limits
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM whatsapp_auto_replies ar
    WHERE ar.id = auto_reply_rate_limits.rule_id
    AND ar.user_id = auth.uid()
  )
);

-- Create indexes
CREATE INDEX idx_analytics_rule ON auto_reply_analytics(rule_id);
CREATE INDEX idx_analytics_phone ON auto_reply_analytics(phone_number);
CREATE INDEX idx_rate_limits_rule ON auto_reply_rate_limits(rule_id);
CREATE INDEX idx_rate_limits_phone ON auto_reply_rate_limits(phone_number);

-- Add function to check rate limits
CREATE OR REPLACE FUNCTION check_auto_reply_rate_limit(
  p_rule_id uuid,
  p_phone_number text,
  p_max_per_hour integer,
  p_cooldown_minutes integer
) RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_limit_record auto_reply_rate_limits%ROWTYPE;
  v_hour_count integer;
BEGIN
  -- Get or create rate limit record
  SELECT * INTO v_limit_record
  FROM auto_reply_rate_limits
  WHERE rule_id = p_rule_id AND phone_number = p_phone_number;
  
  IF NOT FOUND THEN
    INSERT INTO auto_reply_rate_limits (rule_id, phone_number)
    VALUES (p_rule_id, p_phone_number)
    RETURNING * INTO v_limit_record;
  END IF;
  
  -- Check if in cooldown
  IF v_limit_record.cooldown_until IS NOT NULL AND v_limit_record.cooldown_until > now() THEN
    RETURN false;
  END IF;
  
  -- Count messages in last hour
  SELECT count(*) INTO v_hour_count
  FROM auto_reply_analytics
  WHERE rule_id = p_rule_id 
    AND phone_number = p_phone_number
    AND triggered_at > now() - interval '1 hour';
    
  -- Apply rate limiting
  IF v_hour_count >= p_max_per_hour THEN
    UPDATE auto_reply_rate_limits
    SET cooldown_until = now() + (p_cooldown_minutes || ' minutes')::interval
    WHERE id = v_limit_record.id;
    RETURN false;
  END IF;
  
  -- Update last trigger time
  UPDATE auto_reply_rate_limits
  SET 
    count = count + 1,
    last_trigger = now()
  WHERE id = v_limit_record.id;
  
  RETURN true;
END;
$$;

-- Add function to track analytics
CREATE OR REPLACE FUNCTION track_auto_reply_analytics(
  p_rule_id uuid,
  p_phone_number text,
  p_response_time double precision,
  p_variables_used jsonb,
  p_successful boolean
) RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO auto_reply_analytics (
    rule_id,
    phone_number,
    response_time,
    variables_used,
    successful
  ) VALUES (
    p_rule_id,
    p_phone_number,
    p_response_time,
    p_variables_used,
    p_successful
  );
END;
$$;