#!/bin/bash

# Vault Initialization Script
# Sets up Vault with policies and secrets for Secure Gate Access Control System

set -euo pipefail

# Configuration
VAULT_ADDR="${VAULT_ADDR:-http://vault:8200}"
VAULT_TOKEN="${VAULT_TOKEN:-root-token-change-me}"
INIT_TIMEOUT=60

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✅${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ❌${NC} $1"
}

# Wait for Vault to be ready
wait_for_vault() {
    log "Waiting for Vault to be ready..."
    
    local count=0
    while [ $count -lt $INIT_TIMEOUT ]; do
        if vault status >/dev/null 2>&1; then
            log_success "Vault is ready"
            return 0
        fi
        
        log "Waiting for Vault... ($count/$INIT_TIMEOUT)"
        sleep 2
        count=$((count + 2))
    done
    
    log_error "Vault did not become ready within $INIT_TIMEOUT seconds"
    return 1
}

# Enable KV secrets engine
enable_kv_secrets() {
    log "Enabling KV secrets engine..."
    
    if vault secrets list | grep -q "secret/"; then
        log_success "KV secrets engine already enabled"
    else
        vault secrets enable -path=secret kv-v2
        log_success "KV secrets engine enabled"
    fi
}

# Create policies
create_policies() {
    log "Creating Vault policies..."
    
    # Create application policy
    vault policy write secure-gate-app /vault/config/policies.hcl
    log_success "Application policy created"
    
    # Create admin policy
    vault policy write secure-gate-admin - <<EOF
# Admin policy for Secure Gate Access Control System
path "secret/data/secure-gate/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "secret/metadata/secure-gate/*" {
  capabilities = ["read", "list"]
}

path "sys/audit" {
  capabilities = ["read", "list"]
}

path "sys/audit/*" {
  capabilities = ["read", "list"]
}

path "sys/health" {
  capabilities = ["read"]
}

path "sys/seal-status" {
  capabilities = ["read"]
}

path "auth/token/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}
EOF
    log_success "Admin policy created"
}

# Create application token
create_app_token() {
    log "Creating application token..."
    
    # Create token for application
    local token_response
    token_response=$(vault token create \
        -policy=secure-gate-app \
        -ttl=24h \
        -renewable=true \
        -format=json)
    
    local app_token
    app_token=$(echo "$token_response" | jq -r '.auth.client_token')
    
    # Store token in environment file
    echo "VAULT_TOKEN=$app_token" > /vault/secrets/vault-token.env
    
    log_success "Application token created and stored"
}

# Create initial secrets
create_initial_secrets() {
    log "Creating initial secrets..."
    
    # JWT secrets
    vault kv put secret/secure-gate/jwt/access \
        secret="$(openssl rand -base64 64)" \
        algorithm="HS256" \
        expires_in="3600"
    
    vault kv put secret/secure-gate/jwt/refresh \
        secret="$(openssl rand -base64 64)" \
        algorithm="HS256" \
        expires_in="604800"
    
    # Database secrets
    vault kv put secret/secure-gate/database \
        host="postgres" \
        port="5432" \
        database="secure_gate" \
        username="postgres" \
        password="$(openssl rand -base64 32)"
    
    # Redis secrets
    vault kv put secret/secure-gate/redis \
        host="redis" \
        port="6379" \
        password="$(openssl rand -base64 32)"
    
    # Email secrets
    vault kv put secret/secure-gate/email \
        host="smtp.gmail.com" \
        port="587" \
        username="your-email@gmail.com" \
        password="your-app-password" \
        from="noreply@securegate.com"
    
    # SMS secrets
    vault kv put secret/secure-gate/sms \
        account_sid="your-twilio-account-sid" \
        auth_token="your-twilio-auth-token" \
        from_number="+1234567890"
    
    # Application secrets
    vault kv put secret/secure-gate/app \
        name="Secure Gate Access Control System" \
        version="1.0.0" \
        environment="production" \
        log_level="info"
    
    log_success "Initial secrets created"
}

# Enable audit logging
enable_audit_logging() {
    log "Enabling audit logging..."
    
    # Enable file audit device
    vault audit enable file file_path=/vault/logs/audit.log
    log_success "File audit logging enabled"
    
    # Enable JSON audit device
    vault audit enable file file_path=/vault/logs/audit-json.log log_raw=true
    log_success "JSON audit logging enabled"
}

# Create secret rotation configuration
create_rotation_config() {
    log "Creating secret rotation configuration..."
    
    # This would typically be done through the application
    # For now, we'll just log that it should be configured
    log_warning "Secret rotation configuration should be set up through the application"
}

# Main initialization function
main() {
    log "Starting Vault initialization..."
    
    # Wait for Vault to be ready
    wait_for_vault || exit 1
    
    # Enable KV secrets engine
    enable_kv_secrets
    
    # Create policies
    create_policies
    
    # Create application token
    create_app_token
    
    # Create initial secrets
    create_initial_secrets
    
    # Enable audit logging
    enable_audit_logging
    
    # Create rotation configuration
    create_rotation_config
    
    log_success "Vault initialization completed successfully"
}

# Run main function
main "$@"
