# Vault Configuration for Secure Gate Access Control System
# Production-ready Vault configuration with security best practices

# Storage backend configuration
storage "file" {
  path = "/vault/data"
}

# Listener configuration
listener "tcp" {
  address     = "0.0.0.0:8200"
  tls_disable = 1  # Disable TLS for development - enable in production
}

# API address
api_addr = "http://0.0.0.0:8200"
cluster_addr = "http://0.0.0.0:8201"

# UI configuration
ui = true

# Logging configuration
log_level = "INFO"
log_format = "json"

# Default lease TTL
default_lease_ttl = "24h"
max_lease_ttl = "720h"

# Disable mlock for development
disable_mlock = true

# Enable audit logging
audit {
  enabled = true
  options = {
    file_path = "/vault/logs/audit.log"
    log_raw = false
    hmac_accessor = true
    mode = 0600
  }
}

# Enable additional audit devices
audit {
  enabled = true
  options = {
    file_path = "/vault/logs/audit-json.log"
    log_raw = true
    hmac_accessor = false
    mode = 0600
  }
}

# Telemetry configuration
telemetry {
  prometheus_retention_time = "30s"
  disable_hostname = false
  enable_hostname_label = true
}
