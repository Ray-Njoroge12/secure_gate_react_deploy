#!/bin/bash

# Migration execution script
# Runs all migrations in the correct order

echo "========================================="
echo "Starting Database Migrations"
echo "========================================="

# Database connection details from .env
DB_USER=${DB_USER:-"postgres"}
DB_NAME=${DB_NAME:-"secure_gate"}
DB_HOST=${DB_HOST:-"localhost"}
DB_PORT=${DB_PORT:-"5432"}

MIGRATION_DIR="$(dirname "$0")"

# Array of migrations in execution order
MIGRATIONS=(
  "add-visitor-token.sql"
  "add-notification-system.sql"
  "add-swahili-templates.sql"
  "add-admin-analytics-tables.sql"
  "add-rbac-system.sql"
  "add-policies-watchlist.sql"
  "add-incident-workflow.sql"
  "add-multisite-integrations.sql"
)

# Function to run a migration
run_migration() {
  local migration=$1
  echo ""
  echo "-------------------------------------"
  echo "Running: $migration"
  echo "-------------------------------------"
  
  if [ -f "$MIGRATION_DIR/$migration" ]; then
    psql -U "$DB_USER" -d "$DB_NAME" -h "$DB_HOST" -p "$DB_PORT" -f "$MIGRATION_DIR/$migration"
    
    if [ $? -eq 0 ]; then
      echo "✅ SUCCESS: $migration"
    else
      echo "❌ FAILED: $migration"
      echo "Migration failed. Stopping execution."
      exit 1
    fi
  else
    echo "⚠️  NOT FOUND: $migration"
  fi
}

# Run all migrations
for migration in "${MIGRATIONS[@]}"; do
  run_migration "$migration"
done

echo ""
echo "========================================="
echo "All Migrations Completed Successfully! ✅"
echo "========================================="
echo ""

# Verify table count
echo "Verifying database state..."
psql -U "$DB_USER" -d "$DB_NAME" -h "$DB_HOST" -p "$DB_PORT" -c "
  SELECT 
    COUNT(*) as table_count 
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE';
"

echo ""
echo "Migration Summary:"
echo "- Total migrations run: ${#MIGRATIONS[@]}"
echo "- Status: Complete"
echo ""
