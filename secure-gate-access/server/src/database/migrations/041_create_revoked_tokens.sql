-- Migration: Create revoked_tokens table for JWT invalidation

CREATE TABLE IF NOT EXISTS revoked_tokens (
    jti VARCHAR(255) PRIMARY KEY,
    revoked_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP -- Optional: for cleanup jobs
);

CREATE INDEX IF NOT EXISTS idx_revoked_tokens_jti ON revoked_tokens(jti);
