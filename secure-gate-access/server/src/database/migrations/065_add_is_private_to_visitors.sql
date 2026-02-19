-- Add is_private column to visitors table
ALTER TABLE visitors
ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE;
-- Create index for faster filtering if needed (optional but good practice)
CREATE INDEX IF NOT EXISTS idx_visitors_is_private ON visitors(is_private);