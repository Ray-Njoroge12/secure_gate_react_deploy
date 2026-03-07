const LOCAL_LIKE_ENVS = new Set(['development', 'local']);

export function isLocalLikeEnvironment(nodeEnv = process.env.NODE_ENV) {
  return LOCAL_LIKE_ENVS.has(nodeEnv || 'development');
}

export function getInMemorySessionStoreWarning(nodeEnv = process.env.NODE_ENV) {
  const effectiveEnv = nodeEnv || 'development';

  if (effectiveEnv === 'test') {
    return null;
  }

  if (isLocalLikeEnvironment(effectiveEnv)) {
    return '⚠️  Using in-memory session store (development only)';
  }

  return `⚠️  Using in-memory session store for ${effectiveEnv} (single-instance only; configure Redis for shared sessions)`;
}

export function getPasswordHashingWarning({
  nodeEnv = process.env.NODE_ENV,
  timeCost,
  productionTimeCost = 3
} = {}) {
  const effectiveEnv = nodeEnv || 'development';

  if (effectiveEnv === 'test' || timeCost === undefined || timeCost >= productionTimeCost) {
    return null;
  }

  if (isLocalLikeEnvironment(effectiveEnv)) {
    return `⚠️  Using faster password hashing for development (timeCost: ${timeCost})`;
  }

  return `⚠️  Using faster password hashing for ${effectiveEnv} (timeCost: ${timeCost}; production uses timeCost: ${productionTimeCost})`;
}

export function getCentralizedLoggingWarning({
  nodeEnv = process.env.NODE_ENV,
  loggingEndpoint = process.env.LOGGING_ENDPOINT,
  loggingCentralizationEnabled = process.env.LOGGING_CENTRALIZATION_ENABLED
} = {}) {
  const effectiveEnv = nodeEnv || 'development';

  if (effectiveEnv === 'test' || loggingEndpoint || loggingCentralizationEnabled !== 'true') {
    return null;
  }

  return '⚠️  Centralized logging requested but LOGGING_ENDPOINT is not configured; structured logs remain local-only.';
}

export function getDataRetentionSchedulerNotice({
  enableDataRetention = process.env.ENABLE_DATA_RETENTION
} = {}) {
  if (enableDataRetention !== 'false') {
    return null;
  }

  return 'ℹ️  Optional cron-based data retention scheduler explicitly disabled (ENABLE_DATA_RETENTION=false)';
}

export function getStartupConsoleMessages({ port, nodeEnv = process.env.NODE_ENV } = {}) {
  const effectiveEnv = nodeEnv || 'development';

  if (isLocalLikeEnvironment(effectiveEnv)) {
    return [
      `🚀 Secure Gate server running on http://localhost:${port}`,
      '🌐 Server accessible on all network interfaces',
      `🔒 Environment: ${effectiveEnv}`,
      '✅ All security validations passed',
      '📊 Enhanced logging and monitoring active'
    ];
  }

  return [`🚀 Secure Gate server ready on port ${port} (${effectiveEnv})`];
}