-- PERFORMANCE OPTIMIZATION INDEXES
-- Adds critical indexes for improved query performance
-- Date: November 6, 2025

-- ============================================
-- USERS TABLE INDEXES
-- ============================================

-- Unique index on email for fast lookups and uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email 
ON users(LOWER(email));

-- Index on username for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_username 
ON users(LOWER(username));

-- Index on phone for lookups
CREATE INDEX IF NOT EXISTS idx_users_phone 
ON users(phone) 
WHERE phone IS NOT NULL;

-- Index on role for filtering
CREATE INDEX IF NOT EXISTS idx_users_role 
ON users(role);

-- Composite index for login queries
CREATE INDEX IF NOT EXISTS idx_users_email_password 
ON users(LOWER(email), password_hash);

-- Index for active users
CREATE INDEX IF NOT EXISTS idx_users_active 
ON users(created_at DESC) 
WHERE deleted_at IS NULL;

-- ============================================
-- VISITORS TABLE INDEXES
-- ============================================

-- Index on ID number for fast lookups
CREATE INDEX IF NOT EXISTS idx_visitors_id_number 
ON visitors(id_number);

-- Index on phone for lookups
CREATE INDEX IF NOT EXISTS idx_visitors_phone 
ON visitors(phone);

-- Index on host user for relationship queries
CREATE INDEX IF NOT EXISTS idx_visitors_host_user 
ON visitors(host_user_id);

-- Index on creation date for sorting
CREATE INDEX IF NOT EXISTS idx_visitors_created 
ON visitors(created_at DESC);

-- Composite index for visitor search
CREATE INDEX IF NOT EXISTS idx_visitors_search 
ON visitors(LOWER(name), id_number, phone);

-- Index for active visitors
CREATE INDEX IF NOT EXISTS idx_visitors_active 
ON visitors(created_at DESC) 
WHERE deleted_at IS NULL;

-- ============================================
-- VISITOR_LOGS TABLE INDEXES
-- ============================================

-- Index on visitor ID for relationship queries
CREATE INDEX IF NOT EXISTS idx_visitor_logs_visitor 
ON visitor_logs(visitor_id);

-- Index on check-in time for time-based queries
CREATE INDEX IF NOT EXISTS idx_visitor_logs_checkin 
ON visitor_logs(check_in_time DESC);

-- Index on check-out time for time-based queries
CREATE INDEX IF NOT EXISTS idx_visitor_logs_checkout 
ON visitor_logs(check_out_time DESC) 
WHERE check_out_time IS NOT NULL;

-- Composite index for active visitors
CREATE INDEX IF NOT EXISTS idx_visitor_logs_active 
ON visitor_logs(visitor_id, check_in_time DESC) 
WHERE check_out_time IS NULL;

-- Index for daily reports
CREATE INDEX IF NOT EXISTS idx_visitor_logs_daily 
ON visitor_logs(DATE(check_in_time), visitor_id);

-- ============================================
-- AUDIT_LOGS TABLE INDEXES
-- ============================================

-- Index on user ID for user activity queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user 
ON audit_logs(user_id);

-- Index on action for filtering
CREATE INDEX IF NOT EXISTS idx_audit_logs_action 
ON audit_logs(action);

-- Index on timestamp for time-based queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp 
ON audit_logs(timestamp DESC);

-- Index on IP address for security analysis
CREATE INDEX IF NOT EXISTS idx_audit_logs_ip 
ON audit_logs(ip_address);

-- Composite index for user activity analysis
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_activity 
ON audit_logs(user_id, timestamp DESC, action);

-- ============================================
-- SESSIONS TABLE INDEXES (if exists)
-- ============================================

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'public' 
             AND table_name = 'sessions') THEN
    
    -- Index on session ID
    CREATE INDEX IF NOT EXISTS idx_sessions_sid 
    ON sessions(sid);
    
    -- Index on expiry for cleanup
    CREATE INDEX IF NOT EXISTS idx_sessions_expire 
    ON sessions(expire);
    
    -- Index on user data (JSONB)
    CREATE INDEX IF NOT EXISTS idx_sessions_sess_gin 
    ON sessions USING gin (sess);
  END IF;
END $$;

-- ============================================
-- MFA_SETTINGS TABLE INDEXES (if exists)
-- ============================================

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'public' 
             AND table_name = 'mfa_settings') THEN
    
    -- Unique index on user_id
    CREATE UNIQUE INDEX IF NOT EXISTS idx_mfa_settings_user 
    ON mfa_settings(user_id);
    
    -- Index on enabled status
    CREATE INDEX IF NOT EXISTS idx_mfa_settings_enabled 
    ON mfa_settings(enabled) 
    WHERE enabled = true;
  END IF;
END $$;

-- ============================================
-- PRIVACY_CONSENT TABLE INDEXES (if exists)
-- ============================================

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'public' 
             AND table_name = 'privacy_consent') THEN
    
    -- Index on user_id
    CREATE INDEX IF NOT EXISTS idx_privacy_consent_user 
    ON privacy_consent(user_id);
    
    -- Index on consent type
    CREATE INDEX IF NOT EXISTS idx_privacy_consent_type 
    ON privacy_consent(consent_type);
    
    -- Composite index for consent lookup
    CREATE INDEX IF NOT EXISTS idx_privacy_consent_lookup 
    ON privacy_consent(user_id, consent_type, granted);
  END IF;
END $$;

-- ============================================
-- PERFORMANCE STATISTICS
-- ============================================

-- Analyze tables to update statistics
ANALYZE users;
ANALYZE visitors;
ANALYZE visitor_logs;
ANALYZE audit_logs;

-- Show index usage statistics (for monitoring)
CREATE OR REPLACE VIEW index_usage_stats AS
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Show table statistics
CREATE OR REPLACE VIEW table_stats AS
SELECT 
  schemaname,
  tablename,
  n_live_tup as live_rows,
  n_dead_tup as dead_rows,
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;

-- ============================================
-- MAINTENANCE COMMANDS
-- ============================================

-- Reindex all tables (run periodically for maintenance)
-- REINDEX TABLE users;
-- REINDEX TABLE visitors;
-- REINDEX TABLE visitor_logs;
-- REINDEX TABLE audit_logs;

-- Vacuum and analyze all tables (run periodically)
-- VACUUM ANALYZE users;
-- VACUUM ANALYZE visitors;
-- VACUUM ANALYZE visitor_logs;
-- VACUUM ANALYZE audit_logs;

-- ============================================
-- VERIFICATION
-- ============================================

-- List all indexes created
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Show execution plan improvements (example query)
-- EXPLAIN (ANALYZE, BUFFERS) 
-- SELECT * FROM users WHERE LOWER(email) = 'test@example.com';

-- ============================================
-- ROLLBACK SCRIPT
-- ============================================

-- To rollback these changes, run:
/*
DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_users_username;
DROP INDEX IF EXISTS idx_users_phone;
DROP INDEX IF EXISTS idx_users_role;
DROP INDEX IF EXISTS idx_users_email_password;
DROP INDEX IF EXISTS idx_users_active;

DROP INDEX IF EXISTS idx_visitors_id_number;
DROP INDEX IF EXISTS idx_visitors_phone;
DROP INDEX IF EXISTS idx_visitors_host_user;
DROP INDEX IF EXISTS idx_visitors_created;
DROP INDEX IF EXISTS idx_visitors_search;
DROP INDEX IF EXISTS idx_visitors_active;

DROP INDEX IF EXISTS idx_visitor_logs_visitor;
DROP INDEX IF EXISTS idx_visitor_logs_checkin;
DROP INDEX IF EXISTS idx_visitor_logs_checkout;
DROP INDEX IF EXISTS idx_visitor_logs_active;
DROP INDEX IF EXISTS idx_visitor_logs_daily;

DROP INDEX IF EXISTS idx_audit_logs_user;
DROP INDEX IF EXISTS idx_audit_logs_action;
DROP INDEX IF EXISTS idx_audit_logs_timestamp;
DROP INDEX IF EXISTS idx_audit_logs_ip;
DROP INDEX IF EXISTS idx_audit_logs_user_activity;

DROP INDEX IF EXISTS idx_sessions_sid;
DROP INDEX IF EXISTS idx_sessions_expire;
DROP INDEX IF EXISTS idx_sessions_sess_gin;

DROP INDEX IF EXISTS idx_mfa_settings_user;
DROP INDEX IF EXISTS idx_mfa_settings_enabled;

DROP INDEX IF EXISTS idx_privacy_consent_user;
DROP INDEX IF EXISTS idx_privacy_consent_type;
DROP INDEX IF EXISTS idx_privacy_consent_lookup;

DROP VIEW IF EXISTS index_usage_stats;
DROP VIEW IF EXISTS table_stats;
*/

-- End of performance optimization script
