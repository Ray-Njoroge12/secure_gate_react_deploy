#!/usr/bin/env python3
"""
Migration Renumbering Script
Renames migration files to sequential order without conflicts
"""

import os
import shutil
from pathlib import Path

# Define the renaming map
RENAME_MAP = {
    "001_initial_schema.sql": "001_initial_schema.sql",
    "001_compliance_tables.sql": "002_compliance_tables.sql",
    "002_secret_management.sql": "003_secret_management.sql",
    "003_backup_dr.sql": "004_backup_dr.sql",
    "003_performance_optimizations.sql": "005_performance_optimizations.sql",
    "004_logging_monitoring.sql": "006_logging_monitoring.sql",
    "005_refresh_tokens_user_enhancements.sql": "007_refresh_tokens_user_enhancements.sql",
    "006_missing_core_tables.sql": "008_missing_core_tables.sql",
    "007_add_visitor_consent_fields.sql": "009_add_visitor_consent_fields.sql",
    "007_dpa_compliance_enhancements.sql": "010_dpa_compliance_enhancements.sql",
    "008_add_encrypted_fields.sql": "011_add_encrypted_fields.sql",
    "009_add_resident_id_to_visitors.sql": "012_add_resident_id_to_visitors.sql",
    "010_create_qr_codes.sql": "013_create_qr_codes.sql",
    "011_add_visitor_public_tokens.sql": "014_add_visitor_public_tokens.sql",
    "012_add_bulk_invite_id_to_visitors.sql": "015_add_bulk_invite_id_to_visitors.sql",
    "013_add_visitor_approval_fields.sql": "016_add_visitor_approval_fields.sql",
    "014_normalize_visitor_statuses.sql": "017_normalize_visitor_statuses.sql",
    "015_add_rejected_by_to_visitors.sql": "018_add_rejected_by_to_visitors.sql",
    "016_add_user_email_verification_fields.sql": "019_add_user_email_verification_fields.sql",
    "017_phase2_delivery_directions_autoapproval.sql": "020_phase2_delivery_directions_autoapproval.sql",
    "018_add_invite_directions_privacy_fields.sql": "021_add_invite_directions_privacy_fields.sql",
    "019_delivery_handoff_decisions.sql": "022_delivery_handoff_decisions.sql",
    "020_recurring_visitors.sql": "023_recurring_visitors.sql",
    "021_rideshare_quick_entry.sql": "024_rideshare_quick_entry.sql",
    "022_security_fixes.sql": "025_security_fixes.sql",
}

def main():
    migrations_dir = Path("secure-gate-access/server/src/database/migrations")

    print("🔄 Renaming migration files to sequential order...")
    print()

    # Get all .sql files in the migrations directory
    existing_files = list(migrations_dir.glob("*.sql"))

    # Create mapping of current to new names
    renames = []
    for file_path in existing_files:
        filename = file_path.name
        if filename in RENAME_MAP:
            new_name = RENAME_MAP[filename]
            if filename != new_name:
                renames.append((file_path, migrations_dir / new_name, filename, new_name))

    if not renames:
        print("✅ No files need renaming!")
        return

    print(f"📋 Files to rename: {len(renames)}")
    for _, _, old_name, new_name in renames:
        print(f"  {old_name} → {new_name}")
    print()

    # Use a two-phase rename to avoid conflicts
    # Phase 1: Rename to temporary names
    print("📝 Phase 1: Renaming to temporary names...")
    temp_renames = []
    for old_path, new_path, old_name, new_name in renames:
        temp_path = old_path.with_suffix('.sql.tmp')
        old_path.rename(temp_path)
        temp_renames.append((temp_path, new_path, old_name, new_name))
        print(f"  ✓ {old_name} → {temp_path.name}")

    print()
    print("📥 Phase 2: Renaming to final names...")
    for temp_path, new_path, old_name, new_name in temp_renames:
        temp_path.rename(new_path)
        print(f"  ✓ {temp_path.name} → {new_name}")

    print()
    print("✅ Migration renumbering complete!")
    print()
    print("📊 Summary:")
    print(f"  Total migrations: {len(RENAME_MAP)}")
    print(f"  Files renamed: {len(renames)}")
    print(f"  Conflicts resolved: 6 files (001, 003, 007 prefixes)")
    print()
    print("Next steps:")
    print("  1. Review changes: git status")
    print("  2. Add to git: git add secure-gate-access/server/src/database/migrations/")
    print("  3. Commit changes: git commit -m 'refactor: renumber migrations to resolve conflicts'")

if __name__ == "__main__":
    main()
