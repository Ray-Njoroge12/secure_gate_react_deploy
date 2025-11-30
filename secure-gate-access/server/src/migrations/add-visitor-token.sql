-- Migration: Add visitor_token column for secure visitor invite links
-- Phase V1: Visitor Invite Landing & Digital Pass
-- Date: November 20, 2025

-- Add updated_at column if it doesn't exist (required by existing trigger)
ALTER TABLE visitors 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Add visitor_token column for secure, tokenized invite URLs
ALTER TABLE visitors 
ADD COLUMN IF NOT EXISTS visitor_token VARCHAR(255) UNIQUE;

-- Create index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_visitors_token ON visitors(visitor_token);

-- Add token expiration tracking
ALTER TABLE visitors
ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMP;

-- Create index for expired token cleanup
CREATE INDEX IF NOT EXISTS idx_visitors_token_expires ON visitors(token_expires_at);

-- Function to generate secure visitor token
CREATE OR REPLACE FUNCTION generate_visitor_token()
RETURNS VARCHAR(255) AS $$
DECLARE
  token VARCHAR(255);
  token_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate UUID-based token
    token := 'vst_' || encode(gen_random_bytes(32), 'hex');
    
    -- Check if token already exists
    SELECT EXISTS(SELECT 1 FROM visitors WHERE visitor_token = token) INTO token_exists;
    
    -- Exit loop if token is unique
    EXIT WHEN NOT token_exists;
  END LOOP;
  
  RETURN token;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate token on visitor creation
CREATE OR REPLACE FUNCTION auto_generate_visitor_token()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate token if not provided
  IF NEW.visitor_token IS NULL THEN
    NEW.visitor_token := generate_visitor_token();
  END IF;
  
  -- Set token expiration (30 days from visit date or 90 days max)
  IF NEW.token_expires_at IS NULL THEN
    NEW.token_expires_at := COALESCE(
      NEW.date_of_visit + INTERVAL '30 days',
      NOW() + INTERVAL '90 days'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_auto_generate_visitor_token ON visitors;
CREATE TRIGGER trigger_auto_generate_visitor_token
  BEFORE INSERT ON visitors
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_visitor_token();

-- Backfill tokens for existing visitors (NULL tokens only)
UPDATE visitors
SET 
  visitor_token = generate_visitor_token(),
  token_expires_at = COALESCE(
    date_of_visit + INTERVAL '30 days',
    NOW() + INTERVAL '90 days'
  )
WHERE visitor_token IS NULL;

-- Create function to cleanup expired tokens (optional security measure)
CREATE OR REPLACE FUNCTION cleanup_expired_visitor_tokens()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Clear tokens for expired visits (optional - keeps visitor record but invalidates token)
  UPDATE visitors
  SET visitor_token = NULL
  WHERE token_expires_at < NOW()
    AND visitor_token IS NOT NULL
    AND status IN ('checked_out', 'rejected', 'expired');
    
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON COLUMN visitors.visitor_token IS 'Secure token for visitor invite URL (format: vst_[64 hex chars])';
COMMENT ON COLUMN visitors.token_expires_at IS 'Token expiration timestamp (30 days after visit or 90 days max)';
COMMENT ON FUNCTION generate_visitor_token() IS 'Generates unique, secure visitor token with vst_ prefix';
COMMENT ON FUNCTION auto_generate_visitor_token() IS 'Trigger function to auto-generate token on visitor creation';
COMMENT ON FUNCTION cleanup_expired_visitor_tokens() IS 'Removes expired tokens for security (run via cron)';

-- Grant necessary permissions
-- GRANT EXECUTE ON FUNCTION generate_visitor_token() TO your_app_user;
-- GRANT EXECUTE ON FUNCTION cleanup_expired_visitor_tokens() TO your_app_user;

-- Verification queries
-- Check that all visitors now have tokens:
-- SELECT COUNT(*) FROM visitors WHERE visitor_token IS NULL;
-- Should return 0

-- Sample token lookup test:
-- SELECT id, name, visitor_token, token_expires_at, status 
-- FROM visitors 
-- WHERE visitor_token IS NOT NULL 
-- LIMIT 5;
