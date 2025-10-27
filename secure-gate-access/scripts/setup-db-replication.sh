#!/bin/bash

# Database Replication Setup Script
# This script sets up PostgreSQL streaming replication for high availability

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PRIMARY_HOST="${1:-localhost}"
REPLICA_HOST="${2:-localhost}"
PRIMARY_PORT="${3:-5432}"
REPLICA_PORT="${4:-5433}"
DB_NAME="${5:-secure_gate}"
DB_USER="${6:-secure_gate_user}"
REPLICATION_USER="${7:-replication_user}"

echo -e "${BLUE}🗄️ Database Replication Setup${NC}"
echo -e "Primary: ${PRIMARY_HOST}:${PRIMARY_PORT}"
echo -e "Replica: ${REPLICA_HOST}:${REPLICA_PORT}"
echo -e "Database: ${DB_NAME}"
echo -e "User: ${DB_USER}"
echo ""

# Check if running as root
check_root() {
    if [ "$EUID" -eq 0 ]; then
        echo -e "${YELLOW}⚠${NC} Running as root. This is not recommended for production."
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# Check prerequisites
check_prerequisites() {
    echo -e "${BLUE}🔍 Checking prerequisites...${NC}"
    
    # Check if PostgreSQL is installed
    if ! command -v psql >/dev/null 2>&1; then
        echo -e "${RED}✗${NC} PostgreSQL client (psql) not found"
        echo -e "${YELLOW}💡${NC} Install PostgreSQL client: sudo apt-get install postgresql-client"
        exit 1
    fi
    
    # Check if pg_basebackup is available
    if ! command -v pg_basebackup >/dev/null 2>&1; then
        echo -e "${RED}✗${NC} pg_basebackup not found"
        echo -e "${YELLOW}💡${NC} Install PostgreSQL server tools"
        exit 1
    fi
    
    echo -e "${GREEN}✓${NC} Prerequisites check passed"
}

# Generate replication password
generate_replication_password() {
    echo -e "${BLUE}🔐 Generating replication password...${NC}"
    
    REPLICATION_PASSWORD=$(openssl rand -base64 32)
    echo -e "${GREEN}✓${NC} Generated replication password"
    echo -e "${YELLOW}⚠${NC} Save this password securely: ${REPLICATION_PASSWORD}"
    
    # Save to environment file
    echo "REPLICATION_PASSWORD=${REPLICATION_PASSWORD}" >> "${PROJECT_ROOT}/.env.production"
    echo -e "${GREEN}✓${NC} Added replication password to .env.production"
}

# Setup primary server
setup_primary() {
    echo -e "${BLUE}🏗️ Setting up primary server...${NC}"
    
    # Create replication user
    echo -e "${BLUE}👤 Creating replication user...${NC}"
    psql -h "$PRIMARY_HOST" -p "$PRIMARY_PORT" -U "$DB_USER" -d "$DB_NAME" <<EOF
CREATE USER ${REPLICATION_USER} REPLICATION LOGIN CONNECTION LIMIT 3 ENCRYPTED PASSWORD '${REPLICATION_PASSWORD}';
GRANT CONNECT ON DATABASE ${DB_NAME} TO ${REPLICATION_USER};
GRANT USAGE ON SCHEMA public TO ${REPLICATION_USER};
GRANT SELECT ON ALL TABLES IN SCHEMA public TO ${REPLICATION_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO ${REPLICATION_USER};
EOF
    
    echo -e "${GREEN}✓${NC} Replication user created"
    
    # Configure PostgreSQL for replication
    echo -e "${BLUE}⚙️ Configuring PostgreSQL for replication...${NC}"
    
    # Backup current postgresql.conf
    sudo cp /etc/postgresql/*/main/postgresql.conf /etc/postgresql/*/main/postgresql.conf.backup.$(date +%Y%m%d_%H%M%S)
    
    # Add replication settings to postgresql.conf
    sudo tee -a /etc/postgresql/*/main/postgresql.conf > /dev/null <<EOF

# Replication Settings
wal_level = replica
max_wal_senders = 3
max_replication_slots = 3
wal_keep_size = 64MB
hot_standby = on
hot_standby_feedback = on
EOF
    
    # Configure pg_hba.conf for replication
    echo -e "${BLUE}🔒 Configuring pg_hba.conf for replication...${NC}"
    
    # Backup current pg_hba.conf
    sudo cp /etc/postgresql/*/main/pg_hba.conf /etc/postgresql/*/main/pg_hba.conf.backup.$(date +%Y%m%d_%H%M%S)
    
    # Add replication entry
    sudo tee -a /etc/postgresql/*/main/pg_hba.conf > /dev/null <<EOF

# Replication
host replication ${REPLICATION_USER} ${REPLICA_HOST}/32 md5
EOF
    
    echo -e "${GREEN}✓${NC} Primary server configuration completed"
    
    # Restart PostgreSQL
    echo -e "${BLUE}🔄 Restarting PostgreSQL...${NC}"
    sudo systemctl restart postgresql
    
    # Wait for PostgreSQL to start
    sleep 5
    
    echo -e "${GREEN}✓${NC} PostgreSQL restarted"
}

# Setup replica server
setup_replica() {
    echo -e "${BLUE}🏗️ Setting up replica server...${NC}"
    
    # Stop PostgreSQL on replica
    echo -e "${BLUE}⏹️ Stopping PostgreSQL on replica...${NC}"
    sudo systemctl stop postgresql
    
    # Backup existing data directory
    echo -e "${BLUE}💾 Backing up existing data directory...${NC}"
    sudo mv /var/lib/postgresql/*/main /var/lib/postgresql/*/main.backup.$(date +%Y%m%d_%H%M%S)
    
    # Create base backup
    echo -e "${BLUE}📦 Creating base backup...${NC}"
    sudo -u postgres pg_basebackup \
        -h "$PRIMARY_HOST" \
        -p "$PRIMARY_PORT" \
        -U "$REPLICATION_USER" \
        -D /var/lib/postgresql/*/main \
        -v -P -W
    
    echo -e "${GREEN}✓${NC} Base backup completed"
    
    # Create recovery configuration
    echo -e "${BLUE}⚙️ Creating recovery configuration...${NC}"
    
    sudo tee /var/lib/postgresql/*/main/recovery.conf > /dev/null <<EOF
standby_mode = 'on'
primary_conninfo = 'host=${PRIMARY_HOST} port=${PRIMARY_PORT} user=${REPLICATION_USER} password=${REPLICATION_PASSWORD}'
recovery_target_timeline = 'latest'
EOF
    
    # Configure PostgreSQL for standby
    sudo tee -a /var/lib/postgresql/*/main/postgresql.conf > /dev/null <<EOF

# Standby Settings
hot_standby = on
hot_standby_feedback = on
EOF
    
    echo -e "${GREEN}✓${NC} Replica server configuration completed"
    
    # Start PostgreSQL on replica
    echo -e "${BLUE}▶️ Starting PostgreSQL on replica...${NC}"
    sudo systemctl start postgresql
    
    # Wait for PostgreSQL to start
    sleep 5
    
    echo -e "${GREEN}✓${NC} PostgreSQL started on replica"
}

# Verify replication
verify_replication() {
    echo -e "${BLUE}🔍 Verifying replication...${NC}"
    
    # Check primary server
    echo -e "${BLUE}📊 Checking primary server status...${NC}"
    PRIMARY_STATUS=$(psql -h "$PRIMARY_HOST" -p "$PRIMARY_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT pg_is_in_recovery();")
    
    if [ "$PRIMARY_STATUS" = " f" ]; then
        echo -e "${GREEN}✓${NC} Primary server is running in master mode"
    else
        echo -e "${RED}✗${NC} Primary server is not in master mode"
        return 1
    fi
    
    # Check replica server
    echo -e "${BLUE}📊 Checking replica server status...${NC}"
    REPLICA_STATUS=$(psql -h "$REPLICA_HOST" -p "$REPLICA_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT pg_is_in_recovery();")
    
    if [ "$REPLICA_STATUS" = " t" ]; then
        echo -e "${GREEN}✓${NC} Replica server is running in recovery mode"
    else
        echo -e "${RED}✗${NC} Replica server is not in recovery mode"
        return 1
    fi
    
    # Check replication lag
    echo -e "${BLUE}📊 Checking replication lag...${NC}"
    REPLICATION_LAG=$(psql -h "$PRIMARY_HOST" -p "$PRIMARY_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp()));")
    
    if [ -n "$REPLICATION_LAG" ] && [ "$REPLICATION_LAG" != " " ]; then
        echo -e "${GREEN}✓${NC} Replication lag: ${REPLICATION_LAG} seconds"
    else
        echo -e "${YELLOW}⚠${NC} Could not determine replication lag"
    fi
    
    # Check replication slots
    echo -e "${BLUE}📊 Checking replication slots...${NC}"
    REPLICATION_SLOTS=$(psql -h "$PRIMARY_HOST" -p "$PRIMARY_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT slot_name, plugin, slot_type, database, active FROM pg_replication_slots;")
    echo "$REPLICATION_SLOTS"
    
    echo -e "${GREEN}✓${NC} Replication verification completed"
}

# Create monitoring script
create_monitoring_script() {
    echo -e "${BLUE}📝 Creating replication monitoring script...${NC}"
    
    cat > "${PROJECT_ROOT}/scripts/monitor-replication.sh" <<EOF
#!/bin/bash

# Replication Monitoring Script
# Monitors PostgreSQL replication status and health

PRIMARY_HOST="${PRIMARY_HOST}"
REPLICA_HOST="${REPLICA_HOST}"
PRIMARY_PORT="${PRIMARY_PORT}"
REPLICA_PORT="${REPLICA_PORT}"
DB_NAME="${DB_NAME}"
DB_USER="${DB_USER}"

echo "=== PostgreSQL Replication Status ==="
echo "Timestamp: \$(date)"
echo ""

# Primary server status
echo "--- Primary Server (${PRIMARY_HOST}:${PRIMARY_PORT}) ---"
psql -h "\$PRIMARY_HOST" -p "\$PRIMARY_PORT" -U "\$DB_USER" -d "\$DB_NAME" -c "
SELECT 
    'Primary' as server_type,
    pg_is_in_recovery() as in_recovery,
    pg_current_wal_lsn() as current_wal_lsn,
    pg_walfile_name(pg_current_wal_lsn()) as current_wal_file;
"

# Replica server status
echo "--- Replica Server (${REPLICA_HOST}:${REPLICA_PORT}) ---"
psql -h "\$REPLICA_HOST" -p "\$REPLICA_PORT" -U "\$DB_USER" -d "\$DB_NAME" -c "
SELECT 
    'Replica' as server_type,
    pg_is_in_recovery() as in_recovery,
    pg_last_wal_receive_lsn() as last_received_lsn,
    pg_last_wal_replay_lsn() as last_replayed_lsn,
    pg_walfile_name(pg_last_wal_receive_lsn()) as last_received_wal_file;
"

# Replication lag
echo "--- Replication Lag ---"
psql -h "\$PRIMARY_HOST" -p "\$PRIMARY_PORT" -U "\$DB_USER" -d "\$DB_NAME" -c "
SELECT 
    client_addr,
    application_name,
    state,
    pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), flush_lsn)) as lag_size,
    EXTRACT(EPOCH FROM (now() - backend_start)) as lag_seconds
FROM pg_stat_replication;
"

# Replication slots
echo "--- Replication Slots ---"
psql -h "\$PRIMARY_HOST" -p "\$PRIMARY_PORT" -U "\$DB_USER" -d "\$DB_NAME" -c "
SELECT 
    slot_name,
    plugin,
    slot_type,
    database,
    active,
    pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), confirmed_flush_lsn)) as retained_wal
FROM pg_replication_slots;
"
EOF
    
    chmod +x "${PROJECT_ROOT}/scripts/monitor-replication.sh"
    echo -e "${GREEN}✓${NC} Monitoring script created: scripts/monitor-replication.sh"
}

# Test failover (optional)
test_failover() {
    echo -e "${BLUE}🧪 Testing failover scenario...${NC}"
    
    read -p "Do you want to test failover? This will stop the primary server temporarily. (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}⚠${NC} Skipping failover test"
        return 0
    fi
    
    echo -e "${YELLOW}⚠${NC} Stopping primary server for failover test..."
    sudo systemctl stop postgresql
    
    echo -e "${BLUE}⏳ Waiting for failover detection...${NC}"
    sleep 10
    
    # Check if replica is still accessible
    echo -e "${BLUE}🔍 Checking replica accessibility...${NC}"
    if psql -h "$REPLICA_HOST" -p "$REPLICA_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Replica is still accessible"
    else
        echo -e "${RED}✗${NC} Replica is not accessible"
    fi
    
    echo -e "${BLUE}▶️ Restarting primary server...${NC}"
    sudo systemctl start postgresql
    
    # Wait for replication to resume
    sleep 10
    
    echo -e "${BLUE}🔍 Checking replication status...${NC}"
    verify_replication
    
    echo -e "${GREEN}✓${NC} Failover test completed"
}

# Main execution
main() {
    echo -e "${BLUE}🚀 Starting database replication setup...${NC}"
    echo ""
    
    check_root
    check_prerequisites
    generate_replication_password
    
    # Setup primary server
    echo -e "${BLUE}📋 Setting up primary server...${NC}"
    setup_primary
    
    # Setup replica server
    echo -e "${BLUE}📋 Setting up replica server...${NC}"
    setup_replica
    
    # Verify replication
    echo -e "${BLUE}📋 Verifying replication...${NC}"
    verify_replication
    
    # Create monitoring script
    create_monitoring_script
    
    # Test failover (optional)
    test_failover
    
    echo ""
    echo -e "${GREEN}🎉 Database replication setup completed successfully!${NC}"
    echo ""
    echo -e "${BLUE}💡 Next steps:${NC}"
    echo "   1. Monitor replication: bash scripts/monitor-replication.sh"
    echo "   2. Test backup/restore: bash scripts/test-backup-restore.sh"
    echo "   3. Configure application for read/write splitting"
    echo "   4. Set up automated failover monitoring"
    echo ""
    echo -e "${YELLOW}⚠ Important:${NC}"
    echo "   • Keep replication password secure"
    echo "   • Monitor replication lag regularly"
    echo "   • Test failover procedures periodically"
    echo "   • Backup both primary and replica configurations"
}

# Run main function
main "$@"
