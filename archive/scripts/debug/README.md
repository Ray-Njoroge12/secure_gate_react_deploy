# Archived Debug Scripts

**Date Archived:** 2026-04-01

**Reason for Archival:** These scripts were created for debugging and issue reproduction during development. They are no longer needed for active development but are preserved for reference and potential future debugging needs.

---

## Scripts

### repro_privacy.js

**Purpose:** Reproduction script for privacy leak issues in visitor management.

Tests whether guards can improperly access private visitor information that should be masked or hidden. Creates test users and a private visitor, then verifies that guard searches properly mask/hide private guest data.

**Original Location:** `secure-gate-access/server/scripts/repro_privacy.js`

---

### repro_history_full.js

**Purpose:** Reproduction script for visitor history scope and privacy validation.

Tests two scenarios:
1. Pending visitors should NOT appear in guard history views (scope check)
2. Checked-out private visitors should appear but with masked names (privacy check)

**Original Location:** `secure-gate-access/server/scripts/repro_history_full.js`

---

### revert_mfa_changes.js

**Purpose:** Database rollback script for MFA schema changes.

Reverts MFA-related database modifications including:
- Disabling MFA for test users (admin, guard1, resident1)
- Dropping MFA tables (user_mfa_secrets, user_otp_codes, user_backup_codes)
- Removing MFA columns from users table (mfa_enabled, mfa_methods)

**Original Location:** `secure-gate-access/server/scripts/revert_mfa_changes.js`

---

## Usage Note

These scripts require the application's database configuration and should only be run in development/test environments. They are archived rather than deleted to preserve git history and allow future reference if similar debugging is needed.
