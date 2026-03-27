import apiClient from '../../utils/apiClient.js';
import preferenceService from '../../services/preferenceService';

jest.mock('../../utils/apiClient.js', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    put: jest.fn(),
    post: jest.fn()
  }
}));

jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn()
  }
}));

describe('preferenceService API paths', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    preferenceService.cache.clear();
  });

  test('uses /api/preferences base for get and update', async () => {
    apiClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: { preferences: {}, version: 1, isDefault: false }
      }
    });
    apiClient.put.mockResolvedValueOnce({
      data: {
        success: true,
        data: { preferences: { notifications: {} }, version: 2 }
      }
    });

    await preferenceService.getUserPreferences();
    await preferenceService.updateUserPreferences({ notifications: {} }, 1);

    expect(apiClient.get).toHaveBeenCalledWith('/api/preferences');
    expect(apiClient.put).toHaveBeenCalledWith('/api/preferences', {
      preferences: { notifications: {} },
      version: 1
    });
  });

  test('uses /api/preferences base for all backup/list/reset endpoints', async () => {
    apiClient.get.mockResolvedValue({ data: { success: true, data: { preferences: [], backups: [] } } });
    apiClient.post.mockResolvedValue({ data: { success: true, data: { preferences: {}, version: 1 } } });

    await preferenceService.getAllUserPreferences();
    await preferenceService.createPreferenceBackup('nightly');
    await preferenceService.restorePreferenceBackup('nightly');
    await preferenceService.listPreferenceBackups();
    await preferenceService.resetToDefaults();

    expect(apiClient.get).toHaveBeenNthCalledWith(1, '/api/preferences/all');
    expect(apiClient.post).toHaveBeenNthCalledWith(1, '/api/preferences/backup', { backupName: 'nightly' });
    expect(apiClient.post).toHaveBeenNthCalledWith(2, '/api/preferences/backup/nightly/restore');
    expect(apiClient.get).toHaveBeenNthCalledWith(2, '/api/preferences/backups');
    expect(apiClient.post).toHaveBeenNthCalledWith(3, '/api/preferences/reset');
  });
});
