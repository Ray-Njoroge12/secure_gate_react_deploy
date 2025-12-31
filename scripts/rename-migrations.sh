#!/bin/bash

# Migration Renumbering Script
# Renames migration files to sequential order without conflicts

set -e

MIGRATIONS_DIR="secure-gate-access/server/src/database/migrations"

echo "🔄 Renaming migration files to sequential order..."
echo ""

# Create temporary directory for renaming
TEMP_DIR=$(mktemp -d)
echo "Using temporary directory: $TEMP_DIR"

# Define the renaming map
declare -A rename_map=(
  ["001_initial_schema.sql"]="001_initial_schema.sql"
  ["001_compliance_tables.sql"]="002_compliance_tables.sql"
  ["002_secret_management.sql"]="003_secret_management.sql"
  ["003_backup_dr.sql"]="004_backup_dr.sql"
  ["003_performance_optimizations.sql"]="005_performance_optimizations.sql"
  ["004_logging_monitoring.sql"]="006_logging_monitoring.sql"
  ["005_refresh_tokens_user_enhancements.sql"]="007_refresh_tokens_user_enhancements.sql"
  ["006_missing_core_tables.sql"]="008_missing_core_tables.sql"
  ["007_add_visitor_consent_fields.sql"]="009_add_visitor_consent_fields.sql"
  ["007_dpa_compliance_enhancements.sql"]="010_dpa_compliance_enhancements.sql"
  ["008_add_encrypted_fields.sql"]="011_add_encrypted_fields.sql"
  ["009_add_resident_id_to_visitors.sql"]="012_add_resident_id_to_visitors.sql"
  ["010_create_qr_codes.sql"]="013_create_qr_codes.sql"
  ["011_add_visitor_public_tokens.sql"]="014_add_visitor_public_tokens.sql"
  ["012_add_bulk_invite_id_to_visitors.sql"]="015_add_bulk_invite_id_to_visitors.sql"
  ["013_add_visitor_approval_fields.sql"]="016_add_visitor_approval_fields.sql"
  ["014_normalize_visitor_statuses.sql"]="017_normalize_visitor_statuses.sql"
  ["015_add_rejected_by_to_visitors.sql"]="018_add_rejected_by_to_visitors.sql"
  ["016_add_user_email_verification_fields.sql"]="019_add_user_email_verification_fields.sql"
  ["017_phase2_delivery_directions_autoapproval.sql"]="020_phase2_delivery_directions_autoapproval.sql"
  ["018_add_invite_directions_privacy_fields.sql"]="021_add_invite_directions_privacy_fields.sql"
  ["019_delivery_handoff_decisions.sql"]="022_delivery_handoff_decisions.sql"
  ["020_recurring_visitors.sql"]="023_recurring_visitors.sql"
  ["021_rideshare_quick_entry.sql"]="024_rideshare_quick_entry.sql"
  ["022_security_fixes.sql"]="025_security_fixes.sql"
)

# Step 1: Copy all files to temp directory
echo "📦 Step 1: Copying files to temporary directory..."
for old_name in "${!rename_map[@]}"; do
  if [ -f "$MIGRATIONS_DIR/$old_name" ]; then
    cp "$MIGRATIONS_DIR/$old_name" "$TEMP_DIR/${rename_map[$old_name]}"
    echo "  ✓ Copied $old_name → ${rename_map[$old_name]}"
  fi
done

# Step 2: Remove old files
echo ""
echo "🗑️  Step 2: Removing old migration files..."
for old_name in "${!rename_map[@]}"; do
  if [ -f "$MIGRATIONS_DIR/$old_name" ]; then
    rm "$MIGRATIONS_DIR/$old_name"
    echo "  ✓ Removed $old_name"
  fi
done

# Step 3: Copy renamed files back
echo ""
echo "📥 Step 3: Copying renamed files back..."
for new_name in "${rename_map[@]}"; do
  if [ -f "$TEMP_DIR/$new_name" ]; then
    cp "$TEMP_DIR/$new_name" "$MIGRATIONS_DIR/$new_name"
    echo "  ✓ Created $new_name"
  fi
done

# Step 4: Add to git
echo ""
echo "📝 Step 4: Adding renamed files to git..."
git add "$MIGRATIONS_DIR"/*.sql

# Cleanup
rm -rf "$TEMP_DIR"

echo ""
echo "✅ Migration renumbering complete!"
echo ""
echo "📊 Summary:"
echo "  Total migrations: ${#rename_map[@]}"
echo "  Conflicts resolved: 6 files (001, 003, 007 prefixes)"
echo ""
echo "Next steps:"
echo "  1. Review changes: git status"
echo "  2. Verify files: ls -1 $MIGRATIONS_DIR/*.sql | head -15"
echo "  3. Commit changes: git commit -m 'refactor: renumber migration files to resolve conflicts'"
echo ""
