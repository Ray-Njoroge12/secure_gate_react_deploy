import dbManager from '../database/db.enhanced.js';
import loggingService from './loggingService.js';

const DEFAULT_INTERVAL_MS = 24 * 60 * 60 * 1000; // daily
let schedulerStarted = false;
let retentionTimer = null;

const recordRetentionAudit = async ({ tableName, action, affectedRows }) => {
  const details = {
    table: tableName,
    action,
    affectedRows,
    executedAt: new Date().toISOString()
  };

  await dbManager.query(
    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())`,
    [null, 'data_retention_cleanup', 'data_retention', tableName, JSON.stringify(details)]
  );
};

const cleanupAccessLogs = async (retentionDays) => {
  const result = await dbManager.query(
    `DELETE FROM access_logs
     WHERE created_at < NOW() - ($1 || ' days')::INTERVAL`,
    [retentionDays]
  );

  await recordRetentionAudit({
    tableName: 'access_logs',
    action: 'delete',
    affectedRows: result.rowCount
  });

  return result.rowCount;
};

const cleanupDeliveryPhotos = async (retentionDays) => {
  const result = await dbManager.query(
    `DELETE FROM delivery_photos
     WHERE (expires_at IS NOT NULL AND expires_at < NOW())
        OR created_at < NOW() - ($1 || ' days')::INTERVAL`,
    [retentionDays]
  );

  await recordRetentionAudit({
    tableName: 'delivery_photos',
    action: 'delete',
    affectedRows: result.rowCount
  });

  return result.rowCount;
};

const anonymizeAuditLogs = async (retentionDays) => {
  const result = await dbManager.query(
    `UPDATE audit_logs
     SET user_id = NULL,
         ip_address = NULL,
         user_agent = NULL,
         details = NULL
     WHERE created_at < NOW() - ($1 || ' days')::INTERVAL
       AND (user_id IS NOT NULL OR ip_address IS NOT NULL OR user_agent IS NOT NULL OR details IS NOT NULL)`,
    [retentionDays]
  );

  await recordRetentionAudit({
    tableName: 'audit_logs',
    action: 'anonymize',
    affectedRows: result.rowCount
  });

  return result.rowCount;
};

const policyHandlers = {
  access_logs: cleanupAccessLogs,
  delivery_photos: cleanupDeliveryPhotos,
  audit_logs: anonymizeAuditLogs
};

export const runDataRetentionCleanup = async () => {
  try {
    const policiesResult = await dbManager.query(
      `SELECT table_name, retention_days, auto_delete
       FROM data_retention_policies
       WHERE table_name IN ('access_logs', 'delivery_photos', 'audit_logs')
       ORDER BY table_name`
    );

    for (const policy of policiesResult.rows) {
      const handler = policyHandlers[policy.table_name];
      if (!handler) {
        continue;
      }

      await handler(policy.retention_days);

      await dbManager.query(
        `UPDATE data_retention_policies
         SET last_cleanup_at = NOW()
         WHERE table_name = $1`,
        [policy.table_name]
      );
    }
  } catch (error) {
    loggingService.logError('Data retention cleanup failed', error, {
      component: 'dataRetentionService'
    });
  }
};

export const startDataRetentionScheduler = ({ intervalMs = DEFAULT_INTERVAL_MS } = {}) => {
  if (schedulerStarted) {
    return;
  }

  schedulerStarted = true;
  runDataRetentionCleanup();

  retentionTimer = setInterval(() => {
    runDataRetentionCleanup();
  }, intervalMs);
};

export const stopDataRetentionScheduler = () => {
  if (retentionTimer) {
    clearInterval(retentionTimer);
    retentionTimer = null;
  }
  schedulerStarted = false;
};

export default {
  startDataRetentionScheduler,
  stopDataRetentionScheduler,
  runDataRetentionCleanup
};
