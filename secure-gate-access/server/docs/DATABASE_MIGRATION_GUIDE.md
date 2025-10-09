# Database Migration System Guide

## Overview

The Secure Gate Access Control System uses a comprehensive database migration system built with `node-pg-migrate` and custom migration scripts. This system ensures database schema changes are version-controlled, reversible, and can be applied consistently across different environments.

## Migration System Architecture

### Core Components

1. **Migration Manager** (`src/database/migrate.js`) - Core migration logic
2. **Migration Script** (`scripts/migrate.js`) - CLI interface for running migrations
3. **Migration Files** (`src/database/migrations/`) - SQL migration files
4. **Migration Tests** (`tests/integration/migration.test.js`) - Comprehensive test suite

### Migration File Structure

Each migration file follows this structure:
```sql
-- Migration: migration_name
-- Created: 2025-10-06T12:00:00Z
-- Description: Brief description of what this migration does

-- Up migration
-- SQL statements to apply the migration
CREATE TABLE example_table (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);

-- Down migration (rollback)
-- SQL statements to reverse the migration
DROP TABLE IF EXISTS example_table;
```

## Available Migrations

### 001_initial_schema.sql
**Purpose**: Creates the core database schema
**Tables Created**:
- `users` - User accounts and authentication
- `visitors` - Visitor management and tracking
- `passes` - Access passes and QR codes
- `bulk_invites` - Bulk invitation management
- `access_logs` - System access logging
- `otp_resend_log` - OTP resend tracking
- `audit_logs` - Audit trail logging
- `security_events` - Security event monitoring

**Features**:
- Primary keys and foreign key constraints
- Comprehensive indexing for performance
- Automatic timestamp triggers
- Data validation constraints

### 002_compliance_tables.sql
**Purpose**: GDPR, Kenya DPA, and data protection compliance
**Tables Created**:
- `consent_records` - User consent tracking
- `dsar_requests` - Data Subject Access Requests
- `deletion_requests` - Data deletion requests
- `portability_requests` - Data portability requests
- `compliance_events` - Compliance event logging
- `retention_policies` - Data retention policies
- `privacy_policy_versions` - Privacy policy management
- `cookie_policy_versions` - Cookie policy management

**Features**:
- Compliance tracking and reporting
- Data retention policy enforcement
- Privacy policy versioning
- Consent management

### 003_performance_optimizations.sql
**Purpose**: Performance monitoring and optimization
**Tables Created**:
- `performance_metrics` - System performance tracking
- `system_health` - Component health monitoring
- `rate_limit_tracking` - Rate limiting analytics
- `cache_management` - Cache performance tracking

**Features**:
- Performance monitoring and alerting
- System health checks
- Rate limiting analytics
- Cache performance optimization
- Automated cleanup functions

## Usage

### Command Line Interface

#### Run All Pending Migrations
```bash
npm run db:migrate up
```

#### Run Specific Number of Migrations
```bash
npm run db:migrate up 3
```

#### Rollback Last Migration
```bash
npm run db:migrate down
```

#### Rollback Multiple Migrations
```bash
npm run db:migrate down 3
```

#### Check Migration Status
```bash
npm run db:migrate status
```

#### Create New Migration
```bash
npm run db:migrate create add_new_feature
```

#### Validate Migration Files
```bash
npm run db:migrate validate
```

### Programmatic Usage

```javascript
import DatabaseMigrator from './src/database/migrate.js';

const migrator = new DatabaseMigrator();

// Initialize
await migrator.initialize();

// Run migrations
await migrator.migrateUp();

// Check status
const status = await migrator.getStatus();

// Create new migration
await migrator.createMigration('add_user_preferences');

// Close connection
await migrator.close();
```

## Environment Configuration

### Required Environment Variables

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gatedb
DB_USER=postgres
DB_PASSWORD=your_password

# Optional Configuration
NODE_ENV=development
```

### Environment-Specific Settings

#### Development
```bash
NODE_ENV=development
DB_NAME=gatedb_dev
```

#### Testing
```bash
NODE_ENV=test
DB_NAME=gatedb_test
```

#### Production
```bash
NODE_ENV=production
DB_NAME=gatedb_prod
# SSL configuration for production
```

## Migration Best Practices

### 1. Migration Naming Convention
- Use descriptive names: `add_user_preferences_table`
- Include timestamp prefix: `20251006_add_user_preferences_table`
- Use snake_case for consistency

### 2. Writing Safe Migrations
- Always include both UP and DOWN sections
- Test rollbacks thoroughly
- Use transactions for complex operations
- Avoid data loss in rollbacks

### 3. Performance Considerations
- Add indexes after data migration
- Use `CREATE INDEX CONCURRENTLY` for large tables
- Consider table partitioning for large datasets
- Monitor migration performance

### 4. Data Migration
- Backup data before major changes
- Use data validation in migrations
- Consider data transformation scripts
- Test with production-like data

## Testing

### Running Migration Tests
```bash
# Run all migration tests
npm run test:integration -- tests/integration/migration.test.js

# Run with verbose output
npm run test:integration:verbose -- tests/integration/migration.test.js
```

### Test Coverage
- Migration system initialization
- Migration file validation
- Migration execution and rollback
- Database schema validation
- Performance monitoring
- Error handling

## Troubleshooting

### Common Issues

#### 1. Migration Fails
```bash
# Check migration status
npm run db:migrate status

# Validate migration files
npm run db:migrate validate

# Check database connection
psql -h localhost -U postgres -d gatedb -c "SELECT NOW();"
```

#### 2. Rollback Issues
```bash
# Check applied migrations
npm run db:migrate status

# Manual rollback if needed
psql -h localhost -U postgres -d gatedb -c "DELETE FROM pgmigrations WHERE migration_name = 'problematic_migration.sql';"
```

#### 3. Database Connection Issues
```bash
# Check environment variables
echo $DB_HOST
echo $DB_PORT
echo $DB_NAME
echo $DB_USER

# Test connection
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT NOW();"
```

### Debug Mode
```bash
# Enable debug logging
DEBUG=migration:* npm run db:migrate up

# Verbose output
npm run db:migrate up -- --verbose
```

## Production Deployment

### Pre-Deployment Checklist
- [ ] All migrations tested in staging
- [ ] Database backup created
- [ ] Rollback plan prepared
- [ ] Performance impact assessed
- [ ] Monitoring configured

### Deployment Process
1. **Backup Database**
   ```bash
   pg_dump -h localhost -U postgres gatedb > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Run Migrations**
   ```bash
   npm run db:migrate up
   ```

3. **Verify Schema**
   ```bash
   npm run db:migrate status
   ```

4. **Test Application**
   ```bash
   npm run test:integration
   ```

### Rollback Procedure
1. **Stop Application**
   ```bash
   pm2 stop secure-gate-server
   ```

2. **Rollback Migrations**
   ```bash
   npm run db:migrate down [count]
   ```

3. **Restore Database** (if needed)
   ```bash
   psql -h localhost -U postgres gatedb < backup_file.sql
   ```

4. **Restart Application**
   ```bash
   pm2 start secure-gate-server
   ```

## Monitoring and Maintenance

### Performance Monitoring
- Monitor migration execution time
- Track database performance metrics
- Alert on migration failures
- Monitor disk space usage

### Regular Maintenance
- Clean up old migration logs
- Optimize database indexes
- Update migration documentation
- Review and update retention policies

### Health Checks
```sql
-- Check migration status
SELECT migration_name, run_on FROM pgmigrations ORDER BY run_on DESC;

-- Check table sizes
SELECT * FROM get_database_stats();

-- Check system health
SELECT * FROM system_health ORDER BY last_check DESC;
```

## Security Considerations

### Access Control
- Limit migration access to authorized personnel
- Use separate database users for migrations
- Implement audit logging for migration operations
- Encrypt sensitive migration data

### Data Protection
- Sanitize migration inputs
- Validate migration file integrity
- Use checksums for migration verification
- Implement rollback security measures

## Conclusion

The database migration system provides a robust, reliable, and maintainable way to manage database schema changes in the Secure Gate Access Control System. By following the guidelines and best practices outlined in this guide, you can ensure smooth database evolution while maintaining data integrity and system reliability.

For questions or issues, refer to the main project documentation or contact the development team.




