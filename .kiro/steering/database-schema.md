# Database Schema & Data Modeling Conventions

## Overview

The Secure Gate Access Control System uses PostgreSQL as its primary database with a comprehensive schema designed for multi-tenant estate management, visitor tracking, and security operations. This guide covers the database architecture, modeling conventions, and data management patterns.

## Database Architecture

### Connection Management
```javascript
// Enhanced Database Manager Configuration
{
  // Connection pooling optimized for cloud environments
  max: 20,                    // Maximum connections (production)
  min: 5,                     // Minimum connections
  idleTimeoutMillis: 10000,   // 10 seconds idle timeout
  connectionTimeoutMillis: 60000, // 60 seconds for cloud cold starts
  
  // SSL configuration for cloud providers
  ssl: { rejectUnauthorized: true },
  
  // Statement timeouts
  statement_timeout: 30000,   // 30 seconds max query time
  query_timeout: 30000,
  
  // Health monitoring
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000
}
```

### Multi-Tenant Architecture
- **Estate Scoping**: All data scoped by `estate_id` for tenant isolation
- **Data Isolation**: Strict filtering prevents cross-estate data access
- **Shared Tables**: Common lookup tables shared across estates
- **Tenant Provisioning**: Automated estate setup with default data

## Core Schema Design

### Primary Entities

#### Estates Table
```sql
CREATE TABLE estates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  plan_id VARCHAR(50),
  timezone VARCHAR(50) DEFAULT 'UTC',
  settings JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_estates_slug ON estates(slug);
CREATE INDEX idx_estates_status ON estates(status);
```

#### Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'admin', 'guard', 'resident')),
  phone VARCHAR(20),
  area VARCHAR(100),
  house VARCHAR(100),
  unit_number VARCHAR(50),
  
  -- Estate association (NULL for super_admin)
  estate_id INT REFERENCES estates(id),
  
  -- Account status and verification
  account_status VARCHAR(20) DEFAULT 'pending' CHECK (account_status IN ('pending', 'active', 'suspended', 'deleted')),
  verified BOOLEAN DEFAULT false,
  verification_token TEXT,
  verification_expires TIMESTAMP,
  
  -- Notification preferences
  notify_email BOOLEAN DEFAULT true,
  notify_sms BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_estate_role ON users(estate_id, role);
CREATE INDEX idx_users_status ON users(account_status);
CREATE INDEX idx_users_verification ON users(verification_token) WHERE verification_token IS NOT NULL;
```

#### Visitors Table
```sql
CREATE TABLE visitors (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(100),
  id_number VARCHAR(50),
  vehicle_plate VARCHAR(20),
  purpose TEXT,
  
  -- Estate and host association
  estate_id INT REFERENCES estates(id) NOT NULL,
  resident_id INT REFERENCES users(id),
  host_id INT REFERENCES users(id),
  created_by VARCHAR(255), -- Email of creator
  
  -- Visit scheduling
  date_of_visit DATE,
  time_of_visit TIME,
  expected_arrival TIMESTAMP,
  
  -- Access control
  invite_code VARCHAR(100) UNIQUE,
  qr_code TEXT,
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'VERIFIED', 'ON_PREMISE', 'CHECKED_OUT', 'REVOKED', 'EXPIRED')),
  
  -- OTP verification
  otp_hash TEXT,
  otp_expires_at TIMESTAMP,
  otp_attempts INT DEFAULT 0,
  
  -- Check-in/out tracking
  check_in_time TIMESTAMP,
  check_out_time TIMESTAMP,
  check_in_guard_id INT REFERENCES users(id),
  check_out_guard_id INT REFERENCES users(id),
  check_in_notes TEXT,
  check_out_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX idx_visitors_estate_id ON visitors(estate_id);
CREATE INDEX idx_visitors_invite_code ON visitors(invite_code);
CREATE INDEX idx_visitors_status ON visitors(status);
CREATE INDEX idx_visitors_host_id ON visitors(host_id);
CREATE INDEX idx_visitors_qr_code ON visitors(qr_code);
CREATE INDEX idx_visitors_date_status ON visitors(date_of_visit, status);
CREATE INDEX idx_visitors_check_in_time ON visitors(check_in_time) WHERE check_in_time IS NOT NULL;
```

### Security & Audit Tables

#### Audit Logs Table
```sql
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  resource VARCHAR(100) NOT NULL DEFAULT 'system',
  user_role VARCHAR(50),
  request_id VARCHAR(100),
  estate_id INTEGER REFERENCES estates(id),
  
  -- Entity tracking
  entity_type VARCHAR(50),
  entity_id VARCHAR(100),
  outcome VARCHAR(20) CHECK (outcome IN ('success', 'failure', 'error')),
  
  -- Details
  message TEXT,
  details TEXT,
  metadata JSONB,
  
  -- Request context
  ip_address INET,
  user_agent TEXT,
  
  -- Timestamps
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Audit log indexes
CREATE INDEX idx_audit_logs_user_created ON audit_logs(user_id, created_at);
CREATE INDEX idx_audit_logs_estate_action ON audit_logs(estate_id, action);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_outcome ON audit_logs(outcome);
```

#### Token Management Tables
```sql
-- Revoked tokens for JWT blacklisting
CREATE TABLE revoked_tokens (
  jti TEXT PRIMARY KEY,
  revoked_at TIMESTAMP DEFAULT NOW()
);

-- Refresh token storage
CREATE TABLE refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  jti TEXT UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  
  -- Session context
  user_agent TEXT,
  ip_address INET,
  
  -- Token lifecycle
  is_revoked BOOLEAN DEFAULT false,
  revoked_at TIMESTAMP,
  last_used_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Token indexes
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_jti ON refresh_tokens(jti);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at);
CREATE INDEX idx_revoked_tokens_revoked_at ON revoked_tokens(revoked_at);
```

### Operational Tables

#### Incidents Table
```sql
CREATE TABLE incidents (
  id SERIAL PRIMARY KEY,
  guard_id INT REFERENCES users(id),
  reported_by INT REFERENCES users(id),
  visitor_id INT REFERENCES visitors(id),
  estate_id INT REFERENCES estates(id) NOT NULL,
  
  -- Incident classification
  category VARCHAR(50) NOT NULL CHECK (category IN ('security', 'safety', 'maintenance', 'visitor', 'other')),
  severity VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  priority INT DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  
  -- Incident details
  description TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  
  -- Resolution tracking
  resolution TEXT,
  resolved_at TIMESTAMP,
  resolved_by INT REFERENCES users(id),
  closed_at TIMESTAMP,
  closed_by INT REFERENCES users(id),
  
  -- Assignment and escalation
  assigned_to INT REFERENCES users(id),
  assigned_by INT REFERENCES users(id),
  assigned_at TIMESTAMP,
  escalated_to INT REFERENCES users(id),
  escalated_by INT REFERENCES users(id),
  escalated_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Incident indexes
CREATE INDEX idx_incidents_estate_status ON incidents(estate_id, status);
CREATE INDEX idx_incidents_assigned_to ON incidents(assigned_to);
CREATE INDEX idx_incidents_severity ON incidents(severity);
CREATE INDEX idx_incidents_created_at ON incidents(created_at);
```

#### Bulk Invites Table
```sql
CREATE TABLE bulk_invites (
  id SERIAL PRIMARY KEY,
  event_name VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  num_guests INT NOT NULL,
  invite_code VARCHAR(100) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_by VARCHAR(100),
  remaining_slots INT NOT NULL DEFAULT 0,
  estate_id INT REFERENCES estates(id) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Bulk invite indexes
CREATE INDEX idx_bulk_invites_code ON bulk_invites(invite_code);
CREATE INDEX idx_bulk_invites_estate ON bulk_invites(estate_id);
CREATE INDEX idx_bulk_invites_expires ON bulk_invites(expires_at);
```

## Data Archival & Retention

### Archive Tables
```sql
-- Visitors archive for data retention compliance
CREATE TABLE visitors_archive (
  id INT,
  name VARCHAR(100),
  estate_id INT,
  phone VARCHAR(20),
  email VARCHAR(100),
  -- ... all original columns ...
  
  -- Archive metadata
  archived_at TIMESTAMP DEFAULT NOW(),
  archived_by VARCHAR(100),
  archive_reason TEXT
);

-- Audit logs archive
CREATE TABLE audit_logs_archive (
  id INT,
  user_id INT,
  action VARCHAR(100),
  -- ... all original columns ...
  
  archived_at TIMESTAMP DEFAULT NOW()
);
```

### Retention Policies
```sql
-- Automatic archival after 2 years
CREATE OR REPLACE FUNCTION archive_old_visitors()
RETURNS void AS $$
BEGIN
  INSERT INTO visitors_archive 
  SELECT *, NOW(), 'system', 'automatic_retention'
  FROM visitors 
  WHERE created_at < NOW() - INTERVAL '2 years';
  
  DELETE FROM visitors 
  WHERE created_at < NOW() - INTERVAL '2 years';
END;
$$ LANGUAGE plpgsql;
```

## Data Modeling Conventions

### Naming Conventions
- **Tables**: Plural nouns in snake_case (`users`, `audit_logs`)
- **Columns**: snake_case with descriptive names (`created_at`, `estate_id`)
- **Primary Keys**: Always `id SERIAL PRIMARY KEY`
- **Foreign Keys**: `{table}_id` format (`user_id`, `estate_id`)
- **Indexes**: `idx_{table}_{columns}` format

### Data Types
```sql
-- Standard data types
id SERIAL PRIMARY KEY                    -- Auto-incrementing primary key
name VARCHAR(255) NOT NULL              -- Names and titles
email VARCHAR(255) UNIQUE NOT NULL      -- Email addresses
phone VARCHAR(20)                       -- Phone numbers (international format)
status VARCHAR(20) DEFAULT 'active'     -- Status enums
description TEXT                        -- Long text content
metadata JSONB                          -- Flexible JSON data
created_at TIMESTAMP DEFAULT NOW()      -- Creation timestamp
updated_at TIMESTAMP DEFAULT NOW()      -- Last update timestamp
```

### Constraints and Validation
```sql
-- Check constraints for data integrity
ALTER TABLE users ADD CONSTRAINT chk_users_role 
  CHECK (role IN ('super_admin', 'admin', 'guard', 'resident'));

ALTER TABLE visitors ADD CONSTRAINT chk_visitors_status 
  CHECK (status IN ('PENDING', 'APPROVED', 'VERIFIED', 'ON_PREMISE', 'CHECKED_OUT', 'REVOKED', 'EXPIRED'));

-- Unique constraints
ALTER TABLE users ADD CONSTRAINT uk_users_email UNIQUE (email);
ALTER TABLE visitors ADD CONSTRAINT uk_visitors_invite_code UNIQUE (invite_code);

-- Foreign key constraints with proper cascading
ALTER TABLE visitors ADD CONSTRAINT fk_visitors_estate 
  FOREIGN KEY (estate_id) REFERENCES estates(id) ON DELETE RESTRICT;

ALTER TABLE refresh_tokens ADD CONSTRAINT fk_refresh_tokens_user 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
```

## Indexing Strategy

### Performance Indexes
```sql
-- Composite indexes for common query patterns
CREATE INDEX idx_visitors_estate_status_date ON visitors(estate_id, status, date_of_visit);
CREATE INDEX idx_audit_logs_estate_user_time ON audit_logs(estate_id, user_id, created_at);
CREATE INDEX idx_users_estate_role_status ON users(estate_id, role, account_status);

-- Partial indexes for specific conditions
CREATE INDEX idx_visitors_active ON visitors(estate_id, status) 
  WHERE status IN ('PENDING', 'APPROVED', 'VERIFIED', 'ON_PREMISE');

CREATE INDEX idx_users_pending_verification ON users(verification_token) 
  WHERE verification_token IS NOT NULL;

-- Text search indexes
CREATE INDEX idx_visitors_name_search ON visitors USING gin(to_tsvector('english', name));
CREATE INDEX idx_users_search ON users USING gin(to_tsvector('english', username || ' ' || email));
```

### Index Maintenance
```sql
-- Regular index maintenance
REINDEX INDEX CONCURRENTLY idx_visitors_estate_status_date;
ANALYZE visitors;

-- Monitor index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

## Query Patterns

### Estate Scoping Pattern
```sql
-- Always include estate_id in WHERE clause for multi-tenant queries
SELECT * FROM visitors 
WHERE estate_id = $1 AND status = 'PENDING'
ORDER BY created_at DESC;

-- Join with estate validation
SELECT v.*, u.username as host_name
FROM visitors v
JOIN users u ON v.host_id = u.id
WHERE v.estate_id = $1 AND u.estate_id = $1;
```

### Pagination Pattern
```sql
-- Offset-based pagination for small datasets
SELECT * FROM visitors
WHERE estate_id = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- Cursor-based pagination for large datasets
SELECT * FROM audit_logs
WHERE estate_id = $1 AND created_at < $2
ORDER BY created_at DESC
LIMIT $3;
```

### Audit Trail Pattern
```sql
-- Insert audit log for all data modifications
INSERT INTO audit_logs (
  user_id, action, resource, entity_type, entity_id,
  outcome, message, metadata, ip_address, estate_id
) VALUES (
  $1, 'visitor_created', 'visitor', 'visitor', $2,
  'success', 'Visitor invitation created', $3, $4, $5
);
```

## Data Migration Patterns

### Migration File Structure
```javascript
// Migration naming: YYYYMMDD_HHMMSS_description.sql
// Example: 20250101_120000_add_visitor_notes.sql

-- Migration Up
ALTER TABLE visitors ADD COLUMN notes TEXT;
CREATE INDEX idx_visitors_notes ON visitors USING gin(to_tsvector('english', notes));

-- Migration Down (for rollback)
DROP INDEX IF EXISTS idx_visitors_notes;
ALTER TABLE visitors DROP COLUMN IF EXISTS notes;
```

### Schema Versioning
```sql
-- Schema version tracking
CREATE TABLE schema_migrations (
  version VARCHAR(255) PRIMARY KEY,
  applied_at TIMESTAMP DEFAULT NOW()
);

-- Track applied migrations
INSERT INTO schema_migrations (version) VALUES ('20250101_120000_add_visitor_notes');
```

## Performance Optimization

### Connection Pooling
```javascript
// Optimized pool configuration
const poolConfig = {
  max: process.env.NODE_ENV === 'test' ? 40 : 20,
  min: process.env.NODE_ENV === 'test' ? 10 : 5,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 60000,
  statement_timeout: 30000,
  query_timeout: 30000
};
```

### Query Optimization
```sql
-- Use EXPLAIN ANALYZE for query optimization
EXPLAIN ANALYZE SELECT * FROM visitors 
WHERE estate_id = 1 AND status = 'PENDING'
ORDER BY created_at DESC LIMIT 20;

-- Optimize with covering indexes
CREATE INDEX idx_visitors_estate_status_covering 
ON visitors(estate_id, status) 
INCLUDE (id, name, phone, created_at);
```

### Batch Operations
```sql
-- Batch inserts for better performance
INSERT INTO audit_logs (user_id, action, resource, estate_id, created_at)
VALUES 
  ($1, $2, $3, $4, NOW()),
  ($5, $6, $7, $8, NOW()),
  ($9, $10, $11, $12, NOW());

-- Batch updates with CASE statements
UPDATE visitors 
SET status = CASE 
  WHEN id = $1 THEN 'APPROVED'
  WHEN id = $2 THEN 'REJECTED'
  ELSE status
END
WHERE id IN ($1, $2);
```

## Backup & Recovery

### Backup Strategy
```bash
# Daily full backup
pg_dump -h $PGHOST -U $PGUSER -d $PGDATABASE \
  --format=custom --compress=9 \
  --file=backup_$(date +%Y%m%d_%H%M%S).dump

# Point-in-time recovery setup
archive_mode = on
archive_command = 'cp %p /backup/archive/%f'
wal_level = replica
```

### Recovery Procedures
```sql
-- Restore from backup
pg_restore -h $PGHOST -U $PGUSER -d $PGDATABASE \
  --clean --if-exists backup_20250101_120000.dump

-- Point-in-time recovery
pg_ctl stop -D $PGDATA
pg_ctl start -D $PGDATA
```

## Monitoring & Maintenance

### Health Checks
```sql
-- Database health monitoring
SELECT 
  schemaname,
  tablename,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes,
  n_live_tup as live_rows,
  n_dead_tup as dead_rows
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;

-- Connection monitoring
SELECT count(*) as active_connections,
       max_conn,
       max_conn - count(*) as available_connections
FROM pg_stat_activity, 
     (SELECT setting::int as max_conn FROM pg_settings WHERE name = 'max_connections') mc
GROUP BY max_conn;
```

### Maintenance Tasks
```sql
-- Regular maintenance
VACUUM ANALYZE visitors;
REINDEX TABLE visitors;

-- Statistics update
ANALYZE;

-- Cleanup old data
DELETE FROM revoked_tokens WHERE revoked_at < NOW() - INTERVAL '30 days';
DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '1 year';
```

This database schema documentation provides the foundation for consistent, scalable, and maintainable data management across the Secure Gate Access Control System.