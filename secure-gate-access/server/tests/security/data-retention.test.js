/**
 * Modernized data retention security baseline tests.
 */

import { describe, it, expect } from '@jest/globals';
import retentionService from '../../src/services/retentionService.js';

describe('SEC-RETENTION: Data Retention Baseline', () => {
  it('should expose a valid retention config contract', () => {
    expect(retentionService.config).toBeDefined();
    expect(retentionService.config.visitorArchiveDays).toBeGreaterThan(0);
    expect(retentionService.config.accessLogArchiveDays).toBeGreaterThan(0);
    expect(retentionService.config.auditLogArchiveDays).toBeGreaterThan(0);
    expect(retentionService.config.batchSize).toBeGreaterThan(0);
  });

  it('should use visitor expiry SQL based on visit lifecycle timestamps', () => {
    const sql = retentionService.getVisitorExpirySql();

    expect(sql).toContain('check_out_time');
    expect(sql).toContain('check_in_time');
    expect(sql).toContain('created_at');
  });

  it('should reject invalid retention setting type', async () => {
    await expect(
      retentionService.updateRetentionSetting('test-setting', 'unknownType', 30)
    ).rejects.toThrow('Invalid retention setting type');
  });

  it('should reject invalid retention duration', async () => {
    await expect(
      retentionService.updateRetentionSetting('test-setting', 'visitorArchiveDays', 0)
    ).rejects.toThrow('Duration must be a positive integer');
  });
});
