# Vault Policies for Secure Gate Access Control System
# Role-based access control policies for different services

# Policy for the application service
path "secret/data/secure-gate/*" {
  capabilities = ["read", "list"]
}

path "secret/data/secure-gate/app/*" {
  capabilities = ["read", "list"]
}

path "secret/data/secure-gate/database/*" {
  capabilities = ["read", "list"]
}

path "secret/data/secure-gate/redis/*" {
  capabilities = ["read", "list"]
}

path "secret/data/secure-gate/jwt/*" {
  capabilities = ["read", "list"]
}

path "secret/data/secure-gate/email/*" {
  capabilities = ["read", "list"]
}

path "secret/data/secure-gate/sms/*" {
  capabilities = ["read", "list"]
}

# Policy for secret rotation
path "secret/data/secure-gate/rotation/*" {
  capabilities = ["read", "list", "create", "update"]
}

# Policy for audit logs
path "sys/audit" {
  capabilities = ["read", "list"]
}

path "sys/audit/*" {
  capabilities = ["read", "list"]
}

# Policy for health checks
path "sys/health" {
  capabilities = ["read"]
}

path "sys/seal-status" {
  capabilities = ["read"]
}

# Policy for token renewal
path "auth/token/renew-self" {
  capabilities = ["update"]
}

path "auth/token/lookup-self" {
  capabilities = ["read"]
}
