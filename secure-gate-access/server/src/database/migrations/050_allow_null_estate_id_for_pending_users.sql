-- Allow estate_id to be NULL for pending users
-- Pending users will have estate_id assigned during activation

ALTER TABLE users ALTER COLUMN estate_id DROP NOT NULL;

-- Add comment
COMMENT ON COLUMN users.estate_id IS 'Estate assignment - NULL for pending users, assigned during activation';
