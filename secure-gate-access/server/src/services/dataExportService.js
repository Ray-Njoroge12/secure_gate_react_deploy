import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import db from '../database/db.enhanced.js';
import { userService } from './userService.js';

const EXPORT_DIR = path.resolve(process.cwd(), 'storage', 'exports');
const EXPORT_TTL_MS = 24 * 60 * 60 * 1000;

let exportQueue = [];
let isProcessing = false;
let workerStarted = false;

const ensureExportDirectory = async () => {
  await fs.mkdir(EXPORT_DIR, { recursive: true, mode: 0o700 });
};

const sanitizeExportFormat = (format = 'json') => {
  const normalized = String(format).toLowerCase();
  return ['json', 'csv'].includes(normalized) ? normalized : 'json';
};

const convertToCsv = (data) => {
  const rows = [['section', 'data']];
  Object.entries(data).forEach(([key, value]) => {
    rows.push([key, JSON.stringify(value)]);
  });

  return rows
    .map((row) =>
      row
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(',')
    )
    .join('\n');
};

const writeExportFile = async (requestId, format, exportData) => {
  await ensureExportDirectory();

  const extension = format === 'csv' ? 'csv' : 'json';
  const fileName = `${requestId}.${extension}`;
  const filePath = path.join(EXPORT_DIR, fileName);
  const contents =
    format === 'csv'
      ? convertToCsv(exportData)
      : JSON.stringify(exportData, null, 2);

  await fs.writeFile(filePath, contents, { mode: 0o600 });
  const stats = await fs.stat(filePath);

  return { filePath, fileSize: stats.size };
};

const calculateExpiresAt = (processedAt) => {
  if (!processedAt) return null;
  const processedTime = new Date(processedAt).getTime();
  return new Date(processedTime + EXPORT_TTL_MS).toISOString();
};

const recordAuditEvent = async (userId, action, requestId, outcome, message, metadata = null) => {
  await db.query(
    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, outcome, message, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      userId,
      action,
      'data_export',
      requestId,
      outcome,
      message,
      metadata ? JSON.stringify(metadata) : null
    ]
  );
};

const processExportJob = async (job) => {
  const { requestId, userId, format, ipAddress, userAgent } = job;
  const normalizedFormat = sanitizeExportFormat(format);

  await db.query(
    `UPDATE portability_requests
     SET status = $1, updated_at = NOW()
     WHERE request_id = $2`,
    ['processing', requestId]
  );

  await recordAuditEvent(
    userId,
    'data_export_processing',
    requestId,
    'in_progress',
    'Data export processing started',
    { format: normalizedFormat }
  );

  try {
    const exportData = await userService.exportUserData(userId);
    const { filePath, fileSize } = await writeExportFile(
      requestId,
      normalizedFormat,
      exportData
    );

    await db.query(
      `UPDATE portability_requests
       SET status = $1,
           processed_at = NOW(),
           file_path = $2,
           file_size = $3,
           updated_at = NOW()
       WHERE request_id = $4`,
      ['completed', filePath, fileSize, requestId]
    );

    const recordCounts = exportData.exportMetadata?.recordCounts || {};
    const totalRecords = Object.values(recordCounts).reduce((total, value) => total + value, 0);

    await db.query(
      `INSERT INTO data_export_log (user_id, export_type, format, record_count, file_size_bytes, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, 'full_export', normalizedFormat.toUpperCase(), totalRecords, fileSize, ipAddress, userAgent]
    );

    await recordAuditEvent(
      userId,
      'data_export_completed',
      requestId,
      'success',
      'Data export completed successfully',
      { format: normalizedFormat, fileSize }
    );
  } catch (error) {
    await db.query(
      `UPDATE portability_requests
       SET status = $1,
           processed_at = NOW(),
           updated_at = NOW()
       WHERE request_id = $2`,
      ['failed', requestId]
    );

    await recordAuditEvent(
      userId,
      'data_export_failed',
      requestId,
      'failure',
      'Data export failed',
      { error: error.message }
    );

    throw error;
  }
};

const processQueue = async () => {
  if (isProcessing) return;

  const job = exportQueue.shift();
  if (!job) return;

  isProcessing = true;
  try {
    await processExportJob(job);
  } finally {
    isProcessing = false;
    if (exportQueue.length > 0) {
      setImmediate(processQueue);
    }
  }
};

const enqueueExportJob = (job) => {
  exportQueue.push(job);
  setImmediate(processQueue);
};

const hydrateQueuedExport = async () => {
  if (exportQueue.length > 0 || isProcessing) return;
  if (!db.isInitialized || !db.pool) return;

  const result = await db.query(
    `SELECT request_id, user_id, format, ip_address, user_agent
     FROM portability_requests
     WHERE status = 'queued'
     ORDER BY requested_at ASC
     LIMIT 1`
  );

  const nextJob = result.rows[0];
  if (nextJob) {
    enqueueExportJob({
      requestId: nextJob.request_id,
      userId: nextJob.user_id,
      format: nextJob.format,
      ipAddress: nextJob.ip_address,
      userAgent: nextJob.user_agent
    });
  }
};

const startExportWorker = () => {
  if (workerStarted) return;
  if (process.env.NODE_ENV === 'test') return;
  if (!db.isInitialized || !db.pool) {
    setTimeout(startExportWorker, 5000);
    return;
  }

  workerStarted = true;

  hydrateQueuedExport().catch(() => {});
  setInterval(() => {
    hydrateQueuedExport().catch(() => {});
  }, 30000);
};

export const getExportQueueDepth = () => ({
  queued: exportQueue.length,
  processing: isProcessing ? 1 : 0
});

export const createExportRequest = async ({
  userId,
  format,
  ipAddress,
  userAgent
}) => {
  const requestId = uuidv4();
  const normalizedFormat = sanitizeExportFormat(format);

  await db.query(
    `INSERT INTO portability_requests (user_id, format, status, request_id, requested_at, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, NOW(), $5, $6)`,
    [userId, normalizedFormat, 'queued', requestId, ipAddress, userAgent]
  );

  await recordAuditEvent(
    userId,
    'data_export_requested',
    requestId,
    'queued',
    'Data export request queued',
    { format: normalizedFormat }
  );

  enqueueExportJob({
    requestId,
    userId,
    format: normalizedFormat,
    ipAddress,
    userAgent
  });

  return {
    requestId,
    status: 'queued',
    format: normalizedFormat,
    requestedAt: new Date().toISOString()
  };
};

export const getExportStatus = async (requestId, userId) => {
  const result = await db.query(
    `SELECT request_id, status, format, requested_at, processed_at, file_path, file_size
     FROM portability_requests
     WHERE request_id = $1 AND user_id = $2`,
    [requestId, userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const record = result.rows[0];
  const expiresAt = record.processed_at ? calculateExpiresAt(record.processed_at) : null;
  const downloadAvailable =
    record.status === 'completed' && Boolean(record.file_path) && (!expiresAt || Date.now() < new Date(expiresAt).getTime());

  return {
    requestId: record.request_id,
    status: record.status,
    format: record.format,
    requestedAt: record.requested_at,
    processedAt: record.processed_at,
    expiresAt,
    fileSize: record.file_size,
    downloadAvailable
  };
};

export const getExportFile = async (requestId, userId) => {
  const result = await db.query(
    `SELECT request_id, status, format, processed_at, file_path
     FROM portability_requests
     WHERE request_id = $1 AND user_id = $2`,
    [requestId, userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const record = result.rows[0];
  if (record.status !== 'completed' || !record.file_path) {
    return { status: record.status };
  }

  const expiresAt = calculateExpiresAt(record.processed_at);
  if (expiresAt && Date.now() > new Date(expiresAt).getTime()) {
    return { status: 'expired', expiresAt };
  }

  const resolvedPath = path.resolve(record.file_path);
  if (!resolvedPath.startsWith(EXPORT_DIR)) {
    return { status: 'invalid_path' };
  }

  return {
    status: 'completed',
    format: record.format,
    filePath: resolvedPath,
    expiresAt
  };
};

export const logExportDownload = async (userId, requestId, format) => {
  await recordAuditEvent(
    userId,
    'data_export_downloaded',
    requestId,
    'success',
    'Data export downloaded',
    { format }
  );
};

startExportWorker();

export default {
  createExportRequest,
  getExportStatus,
  getExportFile,
  logExportDownload
};
