# Vault Configuration for Secure Gate Access Control System
# Production-ready configuration with HA mode and security hardening

# Storage backend (Consul for HA)
storage "consul" {
  address = "consul:8500"
  path    = "vault/"
  service = "vault"
  service_tags = "vault"
  service_address = "vault"
  disable_clustering = false
}

# High Availability configuration
ha_storage "consul" {
  address = "consul:8500"
  path    = "vault-ha/"
  service = "vault"
  service_tags = "vault"
  service_address = "vault"
  disable_clustering = false
}

# API server configuration
listener "tcp" {
  address     = "0.0.0.0:8200"
  tls_disable = true  # Enable TLS in production
  # tls_cert_file = "/vault/config/tls/vault.crt"
  # tls_key_file = "/vault/config/tls/vault.key"
}

# Cluster configuration
listener "tcp" {
  address     = "0.0.0.0:8201"
  cluster_address = "0.0.0.0:8201"
  tls_disable = true  # Enable TLS in production
  # tls_cert_file = "/vault/config/tls/vault.crt"
  # tls_key_file = "/vault/config/tls/vault.key"
}

# UI configuration
ui = true

# Logging configuration
log_level = "INFO"
log_format = "json"

# Telemetry configuration
telemetry {
  prometheus_retention_time = "30s"
  disable_hostname = false
  enable_hostname_label = true
}

# Seal configuration (for production, use AWS KMS, Azure Key Vault, or HSM)
seal "transit" {
  address = "http://vault:8200"
  disable_renewal = false
  key_name = "vault-seal-key"
  mount_path = "transit/"
}

# Audit logging
audit_device "file" {
  path = "/vault/logs/audit.log"
  log_raw = false
  hmac_accessor = true
  mode = 0600
}

# Performance tuning
max_lease_ttl = "720h"
default_lease_ttl = "168h"

# Security headers
api_addr = "http://vault:8200"
cluster_addr = "http://vault:8201"
