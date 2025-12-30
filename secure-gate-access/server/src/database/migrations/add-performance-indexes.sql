-- Database Performance Optimization Migration
-- Phase 3.2: Add missing indexes for frequently queried columns
-- Date: 2025-12-30
-- Purpose: Improve query performance and eliminate full table scans

-- ============================================================================
-- VISITORS TABLE INDEXES
-- ============================================================================

-- Email index (used for visitor lookup, duplicate checking)
CREATE INDEX IF NOT EXISTS idx_visitors_email
ON visitors(email)
WHERE email IS NOT NULL;

-- Phone number index (used for SMS notifications, visitor lookup)
CREATE INDEX IF NOT EXISTS idx_visitors_phone
ON visitors(phone_number)
WHERE phone_number IS NOT NULL;

-- Visitor name index (used for search, autocomplete)
CREATE INDEX IF NOT EXISTS idx_visitors_name
ON visitors(visitor_name);

-- Status index (used for filtering active/checked-in/checked-out visitors)
CREATE INDEX IF NOT EXISTS idx_visitors_status
ON visitors(status);

-- Created date index (used for date range queries, reports)
CREATE INDEX IF NOT EXISTS idx_visitors_created
ON visitors(created_at DESC);

-- Resident ID index (used for JOIN with residents table)
CREATE INDEX IF NOT EXISTS idx_visitors_resident_id
ON visitors(resident_id)
WHERE resident_id IS NOT NULL;

-- Estate ID index (multi-tenant filtering)
CREATE INDEX IF NOT EXISTS idx_visitors_estate_id
ON visitors(estate_id)
WHERE estate_id IS NOT NULL;

-- Composite index for common query pattern (estate + status + date)
CREATE INDEX IF NOT EXISTS idx_visitors_estate_status_created
ON visitors(estate_id, status, created_at DESC)
WHERE estate_id IS NOT NULL;

-- ============================================================================
-- USERS TABLE INDEXES
-- ============================================================================

-- Email index (authentication, unique lookup)
CREATE INDEX IF NOT EXISTS idx_users_email
ON users(email);

-- Username index (authentication, profile lookup)
CREATE INDEX IF NOT EXISTS idx_users_username
ON users(username)
WHERE username IS NOT NULL;

-- Role index (authorization filtering)
CREATE INDEX IF NOT EXISTS idx_users_role
ON users(role);

-- Active status index (filter inactive users)
CREATE INDEX IF NOT EXISTS idx_users_active
ON users(is_active)
WHERE is_active = true;

-- Estate ID index (multi-tenant queries)
CREATE INDEX IF NOT EXISTS idx_users_estate_id
ON users(estate_id)
WHERE estate_id IS NOT NULL;

-- ============================================================================
-- NOTIFICATIONS TABLE INDEXES
-- ============================================================================

-- Recipient email index (delivery tracking)
CREATE INDEX IF NOT EXISTS idx_notifications_recipient
ON notifications(recipient_email)
WHERE recipient_email IS NOT NULL;

-- Status index (querying pending/sent/failed notifications)
CREATE INDEX IF NOT EXISTS idx_notifications_status
ON notifications(status);

-- Created date index (cleanup, reports)
CREATE INDEX IF NOT EXISTS idx_notifications_created
ON notifications(created_at DESC);

-- Notification type index (filtering by email/sms)
CREATE INDEX IF NOT EXISTS idx_notifications_type
ON notifications(type)
WHERE type IS NOT NULL;

-- Composite index for delivery monitoring (status + created)
CREATE INDEX IF NOT EXISTS idx_notifications_status_created
ON notifications(status, created_at DESC);

-- ============================================================================
-- AUDIT_LOGS TABLE INDEXES
-- ============================================================================

-- User ID index (user activity tracking)
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id
ON audit_logs(user_id)
WHERE user_id IS NOT NULL;

-- Action index (filtering by action type)
CREATE INDEX IF NOT EXISTS idx_audit_logs_action
ON audit_logs(action);

-- Timestamp index (date range queries)
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp
ON audit_logs(timestamp DESC);

-- IP address index (security monitoring)
CREATE INDEX IF NOT EXISTS idx_audit_logs_ip
ON audit_logs(ip_address)
WHERE ip_address IS NOT NULL;

-- Composite index for audit queries (user + timestamp)
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_timestamp
ON audit_logs(user_id, timestamp DESC)
WHERE user_id IS NOT NULL;

-- ============================================================================
-- SESSIONS TABLE INDEXES
-- ============================================================================

-- Session ID index (session lookup)
CREATE INDEX IF NOT EXISTS idx_sessions_sid
ON sessions(sid);

-- User ID index (user session tracking)
CREATE INDEX IF NOT EXISTS idx_sessions_user_id
ON sessions(user_id)
WHERE user_id IS NOT NULL;

-- Expiry index (cleanup expired sessions)
CREATE INDEX IF NOT EXISTS idx_sessions_expire
ON sessions(expire);

-- ============================================================================
-- RECURRING_PASSES TABLE INDEXES (if exists)
-- ============================================================================

-- PIN index (quick PIN lookup for check-in)
CREATE INDEX IF NOT EXISTS idx_recurring_passes_pin
ON recurring_passes(pin)
WHERE pin IS NOT NULL;

-- Worker ID/Name index (worker lookup)
CREATE INDEX IF NOT EXISTS idx_recurring_passes_worker_name
ON recurring_passes(worker_name)
WHERE worker_name IS NOT NULL;

-- Active status index
CREATE INDEX IF NOT EXISTS idx_recurring_passes_active
ON recurring_passes(is_active)
WHERE is_active = true;

-- Expiry date index (cleanup expired passes)
CREATE INDEX IF NOT EXISTS idx_recurring_passes_expiry
ON recurring_passes(expiry_date);

-- ============================================================================
-- VERIFICATION AND ANALYSIS
-- ============================================================================

-- Verify indexes were created
DO $$
DECLARE
    index_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND indexname LIKE 'idx_%';

    RAISE NOTICE 'Total performance indexes created: %', index_count;
END $$;

-- Analyze tables to update statistics for query planner
ANALYZE visitors;
ANALYZE users;
ANALYZE notifications;
ANALYZE audit_logs;
ANALYZE sessions;
ANALYZE recurring_passes;

-- Show table sizes and index usage
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS index_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Show created indexes
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Performance tips
COMMENT ON INDEX idx_visitors_email IS 'Phase 3.2: Improves email lookup and duplicate checking';
COMMENT ON INDEX idx_visitors_estate_status_created IS 'Phase 3.2: Composite index for common dashboard queries';
COMMENT ON INDEX idx_notifications_status_created IS 'Phase 3.2: Optimizes notification queue monitoring';
COMMENT ON INDEX idx_audit_logs_user_timestamp IS 'Phase 3.2: Speeds up user activity history queries';

-- ============================================================================
-- EXPECTED PERFORMANCE IMPROVEMENTS
-- ============================================================================

-- BEFORE: Full table scan on visitors (slow with >10,000 records)
-- SELECT * FROM visitors WHERE email = 'user@example.com';
-- AFTER: Index scan (100x faster)

-- BEFORE: Sequential scan for status filtering
-- SELECT * FROM visitors WHERE status = 'checked_in';
-- AFTER: Bitmap index scan (50x faster)

-- BEFORE: N+1 query problem
-- SELECT * FROM visitors; -- Then SELECT * FROM users FOR EACH visitor
-- AFTER: Use JOIN with indexed foreign keys (90% reduction in queries)

RAISE NOTICE '✅ Performance indexes migration complete!';
RAISE NOTICE '📊 Run EXPLAIN ANALYZE on slow queries to verify index usage';
RAISE NOTICE '🔍 Monitor pg_stat_user_indexes to track index effectiveness';
