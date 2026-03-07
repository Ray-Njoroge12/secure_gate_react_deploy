import { jest } from '@jest/globals';

describe('bootstrap warning hygiene', () => {
  let originalEnv;

  const mockSentryDependencies = () => {
    const sentryInit = jest.fn();

    jest.unstable_mockModule('@sentry/node', () => ({
      init: sentryInit,
      Integrations: {
        Http: class HttpIntegration {},
        Express: class ExpressIntegration {},
        Postgres: class PostgresIntegration {},
        Console: class ConsoleIntegration {}
      },
      Handlers: {
        requestHandler: jest.fn(),
        tracingHandler: jest.fn(),
        errorHandler: jest.fn()
      },
      captureException: jest.fn(),
      captureMessage: jest.fn(),
      setUser: jest.fn(),
      setTag: jest.fn(),
      setContext: jest.fn(),
      startTransaction: jest.fn(),
      close: jest.fn()
    }));

    jest.unstable_mockModule('@sentry/profiling-node', () => ({
      ProfilingIntegration: class MockProfilingIntegration {}
    }));

    return { sentryInit };
  };

  beforeAll(() => {
    originalEnv = { ...process.env };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    process.env = { ...originalEnv, NODE_ENV: 'test' };
    delete process.env.AT_USERNAME;
    delete process.env.AT_API_KEY;
    delete process.env.SMS_PROVIDER;
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
    delete process.env.SENTRY_DSN;
    delete process.env.SENTRY_ENVIRONMENT;
    delete process.env.SENTRY_RELEASE;
    delete process.env.SENTRY_TRACES_SAMPLE_RATE;
    delete process.env.SENTRY_PROFILES_SAMPLE_RATE;
  });

  it('suppresses the Africa\'s Talking local-simulation bootstrap notice in test env', async () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    jest.unstable_mockModule('../../src/services/localMessageStore.js', () => ({
      default: { save: jest.fn() }
    }));

    await import('../../src/services/smsService.js');

    expect(consoleLogSpy).not.toHaveBeenCalledWith(
      'ℹ️  Africa\'s Talking credentials missing - defaulting to LOCAL SIMULATION mode'
    );

    consoleLogSpy.mockRestore();
  });

  it('suppresses the Africa\'s Talking bootstrap notice on staging when the provider is not explicitly selected', async () => {
    process.env.NODE_ENV = 'staging';
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    jest.unstable_mockModule('../../src/services/localMessageStore.js', () => ({
      default: { save: jest.fn() }
    }));

    await import('../../src/services/smsService.js');

    expect(consoleLogSpy).not.toHaveBeenCalledWith(
      'ℹ️  Africa\'s Talking credentials missing - defaulting to LOCAL SIMULATION mode'
    );

    consoleLogSpy.mockRestore();
  });

  it('preserves the Africa\'s Talking bootstrap notice for explicit provider selection without credentials', async () => {
    process.env.NODE_ENV = 'staging';
    process.env.SMS_PROVIDER = 'africastalking';
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    jest.unstable_mockModule('../../src/services/localMessageStore.js', () => ({
      default: { save: jest.fn() }
    }));

    await import('../../src/services/smsService.js');

    expect(consoleLogSpy).toHaveBeenCalledWith(
      'ℹ️  Africa\'s Talking credentials missing - defaulting to LOCAL SIMULATION mode'
    );

    consoleLogSpy.mockRestore();
  });

  it('suppresses the missing push-config bootstrap warning in test env', async () => {
    const mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    };

    jest.unstable_mockModule('../../src/config/logger.js', () => ({
      default: mockLogger
    }));
    jest.unstable_mockModule('../../src/database/db.enhanced.js', () => ({
      dbManager: { query: jest.fn() }
    }));
    jest.unstable_mockModule('../../src/services/notificationMetricsService.js', () => ({
      default: { recordNotificationResult: jest.fn() }
    }));
    jest.unstable_mockModule('web-push', () => ({
      default: {
        setVapidDetails: jest.fn(),
        sendNotification: jest.fn()
      }
    }));

    const pushNotificationService = (await import('../../src/services/pushNotificationService.js')).default;

    expect(pushNotificationService.isConfigured()).toBe(false);
    expect(mockLogger.warn).not.toHaveBeenCalledWith(
      'Push notification service NOT configured (missing keys)'
    );
  });

  it('suppresses the missing push-config bootstrap warning on staging when push is not explicitly configured', async () => {
    process.env.NODE_ENV = 'staging';
    const mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    };

    jest.unstable_mockModule('../../src/config/logger.js', () => ({
      default: mockLogger
    }));
    jest.unstable_mockModule('../../src/database/db.enhanced.js', () => ({
      dbManager: { query: jest.fn() }
    }));
    jest.unstable_mockModule('../../src/services/notificationMetricsService.js', () => ({
      default: { recordNotificationResult: jest.fn() }
    }));
    jest.unstable_mockModule('web-push', () => ({
      default: {
        setVapidDetails: jest.fn(),
        sendNotification: jest.fn()
      }
    }));

    const pushNotificationService = (await import('../../src/services/pushNotificationService.js')).default;

    expect(pushNotificationService.isConfigured()).toBe(false);
    expect(mockLogger.warn).not.toHaveBeenCalledWith(
      'Push notification service NOT configured (missing keys)'
    );
  });

  it('preserves the missing push-config bootstrap warning for explicit partial VAPID configuration on staging', async () => {
    process.env.NODE_ENV = 'staging';
    process.env.VAPID_PUBLIC_KEY = 'test-public-key';
    const mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    };

    jest.unstable_mockModule('../../src/config/logger.js', () => ({
      default: mockLogger
    }));
    jest.unstable_mockModule('../../src/database/db.enhanced.js', () => ({
      dbManager: { query: jest.fn() }
    }));
    jest.unstable_mockModule('../../src/services/notificationMetricsService.js', () => ({
      default: { recordNotificationResult: jest.fn() }
    }));
    jest.unstable_mockModule('web-push', () => ({
      default: {
        setVapidDetails: jest.fn(),
        sendNotification: jest.fn()
      }
    }));

    const pushNotificationService = (await import('../../src/services/pushNotificationService.js')).default;

    expect(pushNotificationService.isConfigured()).toBe(false);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Push notification service NOT configured (missing keys)'
    );
  });

  it('suppresses the missing Sentry DSN startup warning on staging when Sentry is not explicitly configured', async () => {
    process.env.NODE_ENV = 'staging';
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { sentryInit } = mockSentryDependencies();

    const { initializeSentry } = await import('../../src/config/sentry.js');

    expect(initializeSentry()).toBeNull();
    expect(sentryInit).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalledWith(
      '⚠️  Sentry DSN not configured - error tracking disabled'
    );
    expect(consoleWarnSpy).not.toHaveBeenCalledWith(
      '⚠️  Sentry configuration detected but SENTRY_DSN is missing - error tracking disabled'
    );

    consoleWarnSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  it('preserves a narrowed Sentry startup warning for explicit partial Sentry configuration without DSN', async () => {
    process.env.NODE_ENV = 'staging';
    process.env.SENTRY_RELEASE = 'build-123';
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { sentryInit } = mockSentryDependencies();

    const { initializeSentry } = await import('../../src/config/sentry.js');

    expect(initializeSentry()).toBeNull();
    expect(sentryInit).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalledWith(
      '⚠️  Sentry DSN not configured - error tracking disabled'
    );
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '⚠️  Sentry configuration detected but SENTRY_DSN is missing - error tracking disabled'
    );
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '   Set SENTRY_DSN or remove Sentry-specific environment variables'
    );

    consoleWarnSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  it('suppresses the data retention scheduler bootstrap notice on staging when ENABLE_DATA_RETENTION is unset', async () => {
    process.env.NODE_ENV = 'staging';

    const { getDataRetentionSchedulerNotice } = await import('../../src/utils/startupLogHygiene.js');

    expect(getDataRetentionSchedulerNotice()).toBeNull();
  });

  it('preserves a narrowed data retention scheduler notice when the cron scheduler is explicitly disabled', async () => {
    process.env.NODE_ENV = 'staging';
    process.env.ENABLE_DATA_RETENTION = 'false';

    const { getDataRetentionSchedulerNotice } = await import('../../src/utils/startupLogHygiene.js');

    expect(getDataRetentionSchedulerNotice()).toBe(
      'ℹ️  Optional cron-based data retention scheduler explicitly disabled (ENABLE_DATA_RETENTION=false)'
    );
  });
});