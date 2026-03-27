-- Allow estate_id to be NULL for pending users
-- Pending users will have estate_id assigned during activation

DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
		  AND table_name = 'users'
		  AND column_name = 'estate_id'
	) THEN
		ALTER TABLE users ALTER COLUMN estate_id DROP NOT NULL;

		-- Add comment
		COMMENT ON COLUMN users.estate_id IS 'Estate assignment - NULL for pending users, assigned during activation';
	ELSE
		RAISE NOTICE 'users.estate_id column not present yet; nullability/comment deferred to later migration';
	END IF;
END $$;
