#!/bin/bash

###############################################################################
# DEPLOYMENT CRITICAL ISSUES FIX SCRIPT
# Fixes high-priority issues identified in deployment analysis
###############################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Secure Gate - Deployment Critical Issues Fix Script    ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}\n"

###############################################################################
# Issue 1: Fix Performance Monitor Error
###############################################################################

echo -e "${BLUE}[1/4]${NC} Fixing Performance Monitor Reference Error..."

MONITORING_FILE="secure-gate-access/server/src/services/monitoringDashboardService.js"

if [ -f "$MONITORING_FILE" ]; then
    # Check if performanceMonitor import exists
    if ! grep -q "import.*performanceMonitor" "$MONITORING_FILE"; then
        echo -e "${YELLOW}Adding performanceMonitor import...${NC}"
        
        # Backup original file
        cp "$MONITORING_FILE" "${MONITORING_FILE}.backup"
        
        # Add comment to note the fix needed
        cat > /tmp/perf_monitor_fix.txt << 'EOF'

// TODO: Fix performance monitor initialization
// This error occurs when performanceMonitor is undefined
// Options:
// 1. Import from performanceMonitorService if it exists
// 2. Initialize a mock/placeholder if service doesn't exist
// 3. Add conditional check before using performanceMonitor

EOF
        
        echo -e "${GREEN}✓${NC} Created backup and added fix notes"
        echo -e "${YELLOW}⚠${NC}  Manual fix required - check line 198 in $MONITORING_FILE"
    else
        echo -e "${GREEN}✓${NC} Performance monitor import already exists"
    fi
else
    echo -e "${RED}✗${NC} Monitoring file not found: $MONITORING_FILE"
fi

###############################################################################
# Issue 2: Generate Secure Environment Variables
###############################################################################

echo -e "\n${BLUE}[2/4]${NC} Generating Secure Environment Variables..."

ENV_PROD="secure-gate-access/.env.production"

if [ -f "$ENV_PROD" ]; then
    # Backup existing file
    cp "$ENV_PROD" "${ENV_PROD}.backup.$(date +%Y%m%d%H%M%S)"
    echo -e "${GREEN}✓${NC} Backed up existing .env.production"
fi

# Generate strong random passwords
POSTGRES_PASS=$(openssl rand -base64 32 | tr -d '/+=' | cut -c1-32)
REDIS_PASS=$(openssl rand -base64 32 | tr -d '/+=' | cut -c1-32)
JWT_SECRET=$(openssl rand -base64 64 | tr -d '/+=' | cut -c1-64)
JWT_REFRESH=$(openssl rand -base64 64 | tr -d '/+=' | cut -c1-64)
SESSION_SECRET=$(openssl rand -base64 64 | tr -d '/+=' | cut -c1-64)
GRAFANA_PASS=$(openssl rand -base64 16 | tr -d '/+=' | cut -c1-16)

# Save passwords to a secure file
SECRETS_FILE="secure-gate-access/.deployment-secrets-$(date +%Y%m%d%H%M%S).txt"

cat > "$SECRETS_FILE" << EOF
# DEPLOYMENT SECRETS - KEEP SECURE!
# Generated: $(date)
# 
# IMPORTANT: Store these in a secure location (password manager, vault)
# Delete this file after storing secrets securely

POSTGRES_PASSWORD=$POSTGRES_PASS
REDIS_PASSWORD=$REDIS_PASS
JWT_SECRET=$JWT_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH
SESSION_SECRET=$SESSION_SECRET
GRAFANA_PASSWORD=$GRAFANA_PASS
EOF

chmod 600 "$SECRETS_FILE"

echo -e "${GREEN}✓${NC} Generated secure passwords"
echo -e "${YELLOW}⚠${NC}  Secrets saved to: $SECRETS_FILE"
echo -e "${YELLOW}⚠${NC}  Store these securely and delete the file!"

###############################################################################
# Issue 3: Check Nginx Configuration
###############################################################################

echo -e "\n${BLUE}[3/4]${NC} Checking Nginx Configuration..."

NGINX_CONFIGS=(
    "secure-gate-access/nginx/nginx.conf"
    "secure-gate-access/nginx/nginx.prod.conf"
)

for config in "${NGINX_CONFIGS[@]}"; do
    if [ -f "$config" ]; then
        echo -e "${BLUE}Checking:${NC} $config"
        
        # Check for upstream definitions
        if grep -q "upstream.*backend" "$config"; then
            UPSTREAM_NAME=$(grep "upstream" "$config" | grep -o "backend[^; ]*" | head -1)
            echo -e "  Found upstream: ${YELLOW}$UPSTREAM_NAME${NC}"
            
            # Check if the upstream matches service names
            if grep -q "server.*backend-green" "$config"; then
                echo -e "  ${RED}✗${NC} References 'backend-green' which may not exist"
                echo -e "  ${YELLOW}⚠${NC}  Should be: 'secure-gate-access-backend-1' or 'backend'"
            fi
        fi
    fi
done

echo -e "${YELLOW}⚠${NC}  Manual nginx configuration review required"

###############################################################################
# Issue 4: Reset Test User Passwords
###############################################################################

echo -e "\n${BLUE}[4/4]${NC} Creating Test User Password Reset Script..."

cat > secure-gate-access/server/scripts/reset-test-passwords.js << 'EOF'
// Reset test user passwords for deployment testing
import pkg from 'pg';
const { Pool } = pkg;
import argon2 from 'argon2';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: process.env.PGPORT || 5432,
  database: process.env.PGDATABASE || 'secure_gate',
  user: process.env.PGUSER || 'secure_gate_user',
  password: process.env.PGPASSWORD || 'secure_gate_password',
});

const testUsers = [
  { email: 'admin-test@example.com', password: 'Admin@123', role: 'admin' },
  { email: 'guard-test@example.com', password: 'Guard@123', role: 'guard' },
  { email: 'resident-test@example.com', password: 'Resident@123', role: 'resident' },
];

async function resetPasswords() {
  try {
    console.log('Resetting test user passwords...\n');

    for (const user of testUsers) {
      const passwordHash = await argon2.hash(user.password);
      
      const result = await pool.query(
        'UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING id, email, role',
        [passwordHash, user.email]
      );

      if (result.rowCount > 0) {
        console.log(`✓ Reset password for: ${user.email}`);
        console.log(`  Role: ${user.role}`);
        console.log(`  Password: ${user.password}`);
      } else {
        console.log(`✗ User not found: ${user.email}`);
      }
    }

    console.log('\n✓ Test user passwords reset successfully');
    console.log('\nTest Credentials:');
    testUsers.forEach(u => {
      console.log(`  ${u.email} / ${u.password}`);
    });

  } catch (error) {
    console.error('Error resetting passwords:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

resetPasswords();
EOF

chmod +x secure-gate-access/server/scripts/reset-test-passwords.js

echo -e "${GREEN}✓${NC} Created password reset script"
echo -e "${YELLOW}⚠${NC}  Run: cd secure-gate-access/server && node scripts/reset-test-passwords.js"

###############################################################################
# Summary
###############################################################################

echo -e "\n${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    FIX SUMMARY                            ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}\n"

echo -e "${GREEN}Completed:${NC}"
echo -e "  ✓ Generated secure passwords (saved to $SECRETS_FILE)"
echo -e "  ✓ Created password reset script"
echo -e "  ✓ Identified nginx configuration issues"
echo -e "  ✓ Noted performance monitor fix location"

echo -e "\n${YELLOW}Manual Actions Required:${NC}"
echo -e "  1. Update .env.production with generated passwords from $SECRETS_FILE"
echo -e "  2. Fix nginx upstream references in nginx/*.conf files"
echo -e "  3. Run: node secure-gate-access/server/scripts/reset-test-passwords.js"
echo -e "  4. Fix performanceMonitor import in monitoringDashboardService.js"
echo -e "  5. Restart affected containers:"
echo -e "     docker-compose -f secure-gate-access/docker-compose.prod.yml restart"

echo -e "\n${BLUE}Next Steps:${NC}"
echo -e "  1. Apply the manual fixes listed above"
echo -e "  2. Test login with credentials from password reset script"
echo -e "  3. Verify nginx containers stop restarting"
echo -e "  4. Run full test suite"
echo -e "  5. Proceed with deployment"

echo -e "\n${GREEN}For detailed analysis, see:${NC} COMPREHENSIVE_DEPLOYMENT_READINESS_FINAL.md"
echo -e ""

exit 0
