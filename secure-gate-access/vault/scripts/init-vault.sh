#!/bin/bash

# Vault Initialization Script for Secure Gate Access Control System
# This script initializes Vault with necessary policies, secrets engines, and configurations

set -e

# Configuration
VAULT_ADDR=${VAULT_ADDR:-http://vault:8200}
VAULT_TOKEN=${VAULT_TOKEN:-SG2024!VaultRootTokenForSecureGate}
SCRIPT_DIR="/vault/scripts"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

# Wait for Vault to be ready
wait_for_vault() {
    log "Waiting for Vault to be ready..."
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if vault status >/dev/null 2>&1; then
            log "Vault is ready!"
            return 0
        fi
        
        log "Attempt $attempt/$max_attempts: Vault not ready yet, waiting 10 seconds..."
        sleep 10
        ((attempt++))
    done
    
    error "Vault failed to become ready after $max_attempts attempts"
    exit 1
}

# Enable secrets engines
enable_secrets_engines() {
    log "Enabling secrets engines..."
    
    # Enable KV v2 secrets engine
    vault secrets enable -path=secure-gate kv-v2 || warn "KV v2 already enabled"
    
    # Enable Transit secrets engine for encryption
    vault secrets enable -path=transit transit || warn "Transit already enabled"
    
    # Enable Database secrets engine
    vault secrets enable -path=database database || warn "Database already enabled"
    
    # Enable PKI secrets engine for certificates
    vault secrets enable -path=pki pki || warn "PKI already enabled"
    
    log "Secrets engines enabled successfully"
}

# Create Vault policies
create_policies() {
    log "Creating Vault policies..."
    
    # Application policy for secure-gate-backend
    vault policy write secure-gate-backend - <<EOF
# Policy for Secure Gate Backend Application
path "secure-gate/data/*" {
  capabilities = ["read", "list"]
}

path "transit/encrypt/secure-gate-key" {
  capabilities = ["update"]
}

path "transit/decrypt/secure-gate-key" {
  capabilities = ["update"]
}

path "database/creds/secure-gate-db" {
  capabilities = ["read"]
}

path "pki/issue/secure-gate-cert" {
  capabilities = ["update"]
}
EOF

    # Admin policy for full access
    vault policy write secure-gate-admin - <<EOF
# Policy for Secure Gate Administrators
path "*" {
  capabilities = ["create", "read", "update", "delete", "list", "sudo"]
}
EOF

    # Guard policy for limited access
    vault policy write secure-gate-guard - <<EOF
# Policy for Security Guards
path "secure-gate/data/visitor-*" {
  capabilities = ["read", "list"]
}

path "secure-gate/data/access-*" {
  capabilities = ["read", "list"]
}
EOF

    log "Policies created successfully"
}

# Configure database secrets engine
configure_database() {
    log "Configuring database secrets engine..."
    
    # Configure PostgreSQL connection
    vault write database/config/secure-gate-db \
        plugin_name=postgresql-database-plugin \
        connection_url="postgresql://{{username}}:{{password}}@postgres:5432/secure_gate_db?sslmode=require" \
        allowed_roles="secure-gate-role" \
        username="vault_user" \
        password="vault_password" || warn "Database config already exists"
    
    # Create database role
    vault write database/roles/secure-gate-role \
        db_name=secure-gate-db \
        creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
        default_ttl="1h" \
        max_ttl="24h" || warn "Database role already exists"
    
    log "Database secrets engine configured"
}

# Configure PKI secrets engine
configure_pki() {
    log "Configuring PKI secrets engine..."
    
    # Generate root CA
    vault write -field=certificate pki/root/generate/internal \
        common_name="Secure Gate Root CA" \
        ttl=87600h > /tmp/root_ca.crt || warn "Root CA already exists"
    
    # Configure CA and CRL URLs
    vault write pki/config/urls \
        issuing_certificates="http://vault:8200/v1/pki/ca" \
        crl_distribution_points="http://vault:8200/v1/pki/crl" || warn "PKI URLs already configured"
    
    # Create role for application certificates
    vault write pki/roles/secure-gate-cert \
        allowed_domains="secure-gate.local,localhost" \
        allow_subdomains=true \
        max_ttl="720h" || warn "PKI role already exists"
    
    log "PKI secrets engine configured"
}

# Create encryption key
create_encryption_key() {
    log "Creating encryption key..."
    
    vault write -f transit/keys/secure-gate-key \
        type="aes256-gcm96" \
        exportable=false \
        allow_plaintext_backup=false || warn "Encryption key already exists"
    
    log "Encryption key created"
}

# Store initial secrets
store_initial_secrets() {
    log "Storing initial secrets..."
    
    # Database credentials
    vault kv put secure-gate/database \
        host="postgres" \
        port="5432" \
        database="secure_gate_db" \
        username="secure_gate_user" \
        password="SecureGate2024!DBPassword" \
        ssl_mode="require"
    
    # JWT secrets
    vault kv put secure-gate/jwt \
        secret="SecureGate2024!JWTSecretKeyForTokenSigning" \
        refresh_secret="SecureGate2024!JWTRefreshSecretKey" \
        algorithm="HS256" \
        access_token_ttl="15m" \
        refresh_token_ttl="7d"
    
    # API keys
    vault kv put secure-gate/api \
        sendgrid_key="SG.SecureGate2024!SendGridAPIKey" \
        twilio_sid="ACSecureGate2024!TwilioSID" \
        twilio_token="SecureGate2024!TwilioAuthToken" \
        redis_url="redis://redis:6379"
    
    # Application configuration
    vault kv put secure-gate/config \
        environment="production" \
        log_level="info" \
        max_file_size="10MB" \
        session_timeout="3600" \
        rate_limit="100" \
        encryption_enabled="true"
    
    # Security settings
    vault kv put secure-gate/security \
        password_min_length="12" \
        password_require_special="true" \
        password_require_numbers="true" \
        password_require_uppercase="true" \
        mfa_required="true" \
        session_timeout="1800" \
        max_login_attempts="5"
    
    log "Initial secrets stored successfully"
}

# Create application tokens
create_application_tokens() {
    log "Creating application tokens..."
    
    # Backend application token
    BACKEND_TOKEN=$(vault token create -policy=secure-gate-backend -ttl=24h -format=json | jq -r '.auth.client_token')
    echo "BACKEND_TOKEN=$BACKEND_TOKEN" > /vault/secrets/backend-token.env
    
    # Guard application token
    GUARD_TOKEN=$(vault token create -policy=secure-gate-guard -ttl=8h -format=json | jq -r '.auth.client_token')
    echo "GUARD_TOKEN=$GUARD_TOKEN" > /vault/secrets/guard-token.env
    
    log "Application tokens created and stored"
}

# Setup secret rotation
setup_secret_rotation() {
    log "Setting up secret rotation..."
    
    # Create rotation policy for database credentials
    vault write database/config/secure-gate-db \
        rotation_statements="ALTER USER \"{{name}}\" WITH PASSWORD '{{password}}';" \
        rotation_period="30d" || warn "Rotation already configured"
    
    # Create rotation policy for JWT secrets
    vault write transit/keys/secure-gate-jwt \
        type="aes256-gcm96" \
        min_available_version=2 \
        min_decryption_version=1 \
        min_encryption_version=2 || warn "JWT rotation already configured"
    
    log "Secret rotation configured"
}

# Main initialization function
main() {
    log "Starting Vault initialization for Secure Gate Access Control System"
    
    # Wait for Vault to be ready
    wait_for_vault
    
    # Initialize Vault components
    enable_secrets_engines
    create_policies
    configure_database
    configure_pki
    create_encryption_key
    store_initial_secrets
    create_application_tokens
    setup_secret_rotation
    
    log "Vault initialization completed successfully!"
    log "Vault UI available at: http://localhost:8200"
    log "Root token: $VAULT_TOKEN"
    log "Backend token stored in: /vault/secrets/backend-token.env"
    log "Guard token stored in: /vault/secrets/guard-token.env"
}

# Run main function
main "$@"
