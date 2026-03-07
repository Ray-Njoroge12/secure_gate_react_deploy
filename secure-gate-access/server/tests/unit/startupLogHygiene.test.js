import { describe, expect, it } from '@jest/globals';

import {
  getCentralizedLoggingWarning,
  getInMemorySessionStoreWarning,
  getPasswordHashingWarning,
  getStartupConsoleMessages,
  isLocalLikeEnvironment
} from '../../src/utils/startupLogHygiene.js';

describe('startupLogHygiene', () => {
  it('treats development and local as local-like environments', () => {
    expect(isLocalLikeEnvironment('development')).toBe(true);
    expect(isLocalLikeEnvironment('local')).toBe(true);
  });

  it('does not treat non-local deployment environments as local-like', () => {
    expect(isLocalLikeEnvironment('staging')).toBe(false);
    expect(isLocalLikeEnvironment('production')).toBe(false);
    expect(isLocalLikeEnvironment('test')).toBe(false);
  });

  it('keeps the development-only session-store warning for local-like environments', () => {
    expect(getInMemorySessionStoreWarning('development')).toBe(
      '⚠️  Using in-memory session store (development only)'
    );
  });

  it('uses environment-accurate session-store warning text for non-local deployment environments', () => {
    expect(getInMemorySessionStoreWarning('staging')).toBe(
      '⚠️  Using in-memory session store for staging (single-instance only; configure Redis for shared sessions)'
    );
    expect(getInMemorySessionStoreWarning('test')).toBeNull();
  });

  it('keeps the development-only password-hashing warning for local-like environments', () => {
    expect(getPasswordHashingWarning({ nodeEnv: 'development', timeCost: 1 })).toBe(
      '⚠️  Using faster password hashing for development (timeCost: 1)'
    );
  });

  it('uses environment-accurate password-hashing warning text for non-local deployment environments', () => {
    expect(getPasswordHashingWarning({ nodeEnv: 'staging', timeCost: 1 })).toBe(
      '⚠️  Using faster password hashing for staging (timeCost: 1; production uses timeCost: 3)'
    );
    expect(getPasswordHashingWarning({ nodeEnv: 'production', timeCost: 3 })).toBeNull();
    expect(getPasswordHashingWarning({ nodeEnv: 'test', timeCost: 1 })).toBeNull();
  });

  it('suppresses centralized-logging warning noise when centralization is simply unconfigured', () => {
    expect(getCentralizedLoggingWarning({
      nodeEnv: 'staging',
      loggingEndpoint: '',
      loggingCentralizationEnabled: undefined
    })).toBeNull();

    expect(getCentralizedLoggingWarning({
      nodeEnv: 'staging',
      loggingEndpoint: '',
      loggingCentralizationEnabled: 'false'
    })).toBeNull();
  });

  it('warns only when centralized logging is explicitly enabled without an endpoint', () => {
    expect(getCentralizedLoggingWarning({
      nodeEnv: 'staging',
      loggingEndpoint: '',
      loggingCentralizationEnabled: 'true'
    })).toBe(
      '⚠️  Centralized logging requested but LOGGING_ENDPOINT is not configured; structured logs remain local-only.'
    );

    expect(getCentralizedLoggingWarning({
      nodeEnv: 'staging',
      loggingEndpoint: 'http://loki:3100',
      loggingCentralizationEnabled: 'true'
    })).toBeNull();

    expect(getCentralizedLoggingWarning({
      nodeEnv: 'test',
      loggingEndpoint: '',
      loggingCentralizationEnabled: 'true'
    })).toBeNull();
  });

  it('keeps the detailed startup banner for local-like environments', () => {
    expect(getStartupConsoleMessages({ port: 3001, nodeEnv: 'development' })).toEqual([
      '🚀 Secure Gate server running on http://localhost:3001',
      '🌐 Server accessible on all network interfaces',
      '🔒 Environment: development',
      '✅ All security validations passed',
      '📊 Enhanced logging and monitoring active'
    ]);
  });

  it('returns a concise readiness line for non-local deployment environments', () => {
    expect(getStartupConsoleMessages({ port: 3011, nodeEnv: 'staging' })).toEqual([
      '🚀 Secure Gate server ready on port 3011 (staging)'
    ]);
  });
});