import { jest } from '@jest/globals';

const mockDbManager = {
  isInitialized: false,
  pool: null,
  query: jest.fn()
};

const mockLoggingService = {
  logInfo: jest.fn(),
  logError: jest.fn()
};

jest.unstable_mockModule('../../src/database/db.enhanced.js', () => ({
  dbManager: mockDbManager
}));

jest.unstable_mockModule('../../src/services/loggingService.js', () => ({
  default: mockLoggingService
}));

jest.unstable_mockModule('../../src/middleware/standardizedErrorHandler.js', () => ({
  ErrorHelper: {
    notFound: (entity, id) => Object.assign(new Error(`${entity} ${id} not found`), { statusCode: 404 }),
    badRequest: (message, details) => Object.assign(new Error(message), { statusCode: 400, details })
  }
}));

const { preferenceService } = await import('../../src/services/preferenceService.js');

describe('PreferenceService', () => {
  test('does not initialize preference tables before dbManager is ready', () => {
    expect(mockDbManager.query).not.toHaveBeenCalled();
    expect(preferenceService.databaseInitialized).toBe(false);
  });

  test('initializes preference tables lazily on first use after dbManager is ready', async () => {
    jest.clearAllMocks();
    mockDbManager.isInitialized = true;
    mockDbManager.pool = { connect: jest.fn() };
    preferenceService.databaseInitialized = false;
    preferenceService.databaseInitializationPromise = null;

    mockDbManager.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ role: 'resident' }] });

    const result = await preferenceService.getUserPreferences(123, 1);

    expect(mockDbManager.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('CREATE TABLE IF NOT EXISTS user_preferences')
    );
    expect(mockDbManager.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('CREATE INDEX IF NOT EXISTS idx_user_preferences_user_estate')
    );
    expect(mockDbManager.query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('CREATE TABLE IF NOT EXISTS preference_backups')
    );
    expect(mockDbManager.query).toHaveBeenNthCalledWith(
      4,
      'SELECT preferences, version FROM user_preferences WHERE user_id = $1 AND estate_id = $2',
      [123, 1]
    );
    expect(result).toMatchObject({
      version: 1,
      isDefault: true,
      preferences: expect.objectContaining({
        dashboardLayout: expect.objectContaining({ theme: 'system' })
      })
    });
    expect(preferenceService.databaseInitialized).toBe(true);
    expect(mockLoggingService.logInfo).toHaveBeenCalledWith('Preference service database initialized');
  });
});