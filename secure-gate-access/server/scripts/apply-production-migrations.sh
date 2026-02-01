#!/bin/bash
# ============================================
# DATABASE MIGRATION SCRIPT FOR PRODUCTION
# ============================================
# 
# This script applies all security-related database migrations
# to the production database in the correct order.
#
# Usage: ./scripts/apply-production-migrations.sh
# ============================================

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║     🗄️  Database Migration Script                     ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}ERROR: DATABASE_URL environment variable is not set!${NC}"
    echo ""
    echo "Please set it before running this script:"
    echo "  export DATABASE_URL='postgresql://user:pass@host:port/db'"
    echo ""
    exit 1
fi

echo -e "${BLUE}Database URL:${NC} ${DATABASE_URL:0:30}... (masked for security)"
echo ""

# Confirm before proceeding
echo -e "${YELLOW}⚠️  WARNING: This will modify your production database!${NC}"
echo ""
read -p "Have you backed up the database? (yes/no): " BACKUP_CONFIRM

if [ "$BACKUP_CONFIRM" != "yes" ]; then
    echo -e "${RED}Please backup your database first!${NC}"
    echo "Run: pg_dump \$DATABASE_URL > backup_\$(date +%Y%m%d_%H%M%S).sql"
    exit 1
fi

echo ""
read -p "Continue with migrations? (yes/no): " CONTINUE

if [ "$CONTINUE" != "yes" ]; then
    echo "Migration cancelled."
    exit 0
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Starting Database Migrations${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Function to apply migration
apply_migration() {
    local migration_file=$1
    local migration_name=$2
    
    echo -e "${YELLOW}Applying: $migration_name${NC}"
    
    if [ ! -f "$migration_file" ]; then
        echo -e "${RED}ERROR: Migration file not found: $migration_file${NC}"
        return 1
    fi
    
    if psql "$DATABASE_URL" -f "$migration_file" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Success: $migration_name${NC}"
        return 0
    else
        echo -e "${RED}✗ Failed: $migration_name${NC}"
        return 1
    fi
}

# Migration 1: ID Encryption
echo "1/3: ID Number Encryption"
if apply_migration \
    "src/database/migrations/035_encrypt_id_numbers.sql" \
    "035_encrypt_id_numbers"; then
    echo "   Added columns: id_number_encrypted, id_number_encrypted_at"
else
    echo -e "${RED}Migration 1 failed! Stopping.${NC}"
    exit 1
fi
echo ""

# Migration 2: Archive Tables
echo "2/3: Data Retention Archive Tables"
if apply_migration \
    "src/database/migrations/037_add_archive_tables.sql" \
    "037_add_archive_tables"; then
    echo "   Created tables: visitors_archive, access_logs_archive, audit_logs_archive"
else
    echo -e "${RED}Migration 2 failed! Stopping.${NC}"
    exit 1
fi
echo ""

# Migration 3: QR Token Mapping
echo "3/3: QR Token Mapping"
if apply_migration \
    "src/database/migrations/038_add_qr_token_mapping.sql" \
    "038_add_qr_token_mapping"; then
    echo "   Created table: qr_token_mapping with indexes"
else
    echo -e "${RED}Migration 3 failed! Stopping.${NC}"
    exit 1
fi
echo ""

# Verify migrations
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Verifying Migrations${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "Checking for new columns and tables..."
echo ""

# Check ID encryption columns
echo -e "${YELLOW}ID Encryption Columns:${NC}"
psql "$DATABASE_URL" -c "\
SELECT column_name, data_type, is_nullable \
FROM information_schema.columns \
WHERE table_name = 'visitors' \
AND column_name IN ('id_number_encrypted', 'id_number_encrypted_at');" \
--quiet --tuples-only 2>/dev/null || echo "No encryption columns found"
echo ""

# Check archive tables
echo -e "${YELLOW}Archive Tables:${NC}"
psql "$DATABASE_URL" -c "\
SELECT table_name \
FROM information_schema.tables \
WHERE table_name LIKE '%_archive' \
ORDER BY table_name;" \
--quiet --tuples-only 2>/dev/null || echo "No archive tables found"
echo ""

# Check QR token mapping
echo -e "${YELLOW}QR Token Mapping Table:${NC}"
psql "$DATABASE_URL" -c "\
SELECT table_name, \
       (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'qr_token_mapping') as column_count \
FROM information_schema.tables \
WHERE table_name = 'qr_token_mapping';" \
--quiet --tuples-only 2>/dev/null || echo "QR token mapping table not found"
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ All migrations completed successfully!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${GREEN}Next steps:${NC}"
echo "  1. Run data migration scripts:"
echo "     node scripts/migrate-id-numbers.js"
echo "     node scripts/migrate-qr-codes.js"
echo ""
echo "  2. Deploy application code"
echo ""
echo "  3. Verify deployment:"
echo "     ./scripts/quick-readiness-check.sh"
echo ""

echo "════════════════════════════════════════════════════════"
echo ""
