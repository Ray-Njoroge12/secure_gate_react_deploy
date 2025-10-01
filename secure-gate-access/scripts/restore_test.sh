#!/bin/bash

# Restore test script for Secure Gate Access Control System
# This script validates backup integrity by performing a test restore

BACKUP_DIR="/backups/secure-gate"
TEST_DB="secure_gate_test"
LOG_FILE="/var/log/secure-gate-restore-test.log"

# Log function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> $LOG_FILE
}

log "Starting restore test..."

# Find latest backup
LATEST_BACKUP=$(find $BACKUP_DIR -name "db_backup_*.sql" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-)

if [ -z "$LATEST_BACKUP" ]; then
    log "No backup found for restore test"
    exit 1
fi

log "Using backup: $LATEST_BACKUP"

# Create test database
log "Creating test database..."
createdb -h secure-gate-db -U secure_gate_user $TEST_DB

if [ $? -eq 0 ]; then
    log "Test database created successfully"
else
    log "Failed to create test database"
    exit 1
fi

# Restore backup to test database
log "Restoring backup to test database..."
psql -h secure-gate-db -U secure_gate_user -d $TEST_DB < $LATEST_BACKUP

if [ $? -eq 0 ]; then
    log "Restore test completed successfully"
    
    # Verify data integrity
    log "Verifying data integrity..."
    TABLE_COUNT=$(psql -h secure-gate-db -U secure_gate_user -d $TEST_DB -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
    log "Tables in test database: $TABLE_COUNT"
    
    # Cleanup test database
    log "Cleaning up test database..."
    dropdb -h secure-gate-db -U secure_gate_user $TEST_DB
    log "Test database cleaned up"
else
    log "Restore test failed"
    exit 1
fi

log "Restore test completed successfully"
