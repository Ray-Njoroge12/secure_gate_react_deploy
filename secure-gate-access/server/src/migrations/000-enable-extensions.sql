-- Enable PostgreSQL extensions required for migrations
-- Must run before all other migrations

-- Enable pgcrypto for gen_random_bytes() and other crypto functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Enable uuid-ossp for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Verify extensions
SELECT extname, extversion FROM pg_extension 
WHERE extname IN ('pgcrypto', 'uuid-ossp');
