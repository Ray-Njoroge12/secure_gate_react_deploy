/**
 * Legacy-compatible Audit Logger Middleware
 *
 * Keeps the historical auditLogger.js contract used by routes/tests while
 * coexisting with the newer unified audit logging module.
 */

import loggingService from '../services/loggingService.js';
import { dbManager } from '../database/db.enhanced.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Audit event types for different data access activities
 */
export const AUDIT_EVENTS = {
	// Authentication events
	LOGIN_SUCCESS: 'auth.login.success',
	LOGIN_FAILED: 'auth.login.failed',
	LOGOUT: 'auth.logout',
	TOKEN_REFRESH: 'auth.token.refresh',
	PASSWORD_CHANGE: 'auth.password.change',

	// Data access events
	DATA_READ: 'data.read',
	DATA_CREATE: 'data.create',
	DATA_UPDATE: 'data.update',
	DATA_DELETE: 'data.delete',
	DATA_EXPORT: 'data.export',

	// User management events
	USER_CREATE: 'user.create',
	USER_UPDATE: 'user.update',
	USER_DELETE: 'user.delete',
	USER_ACCESS: 'user.access',

	// Visitor management events
	VISITOR_CREATE: 'visitor.create',
	VISITOR_READ: 'visitor.read',
	VISITOR_UPDATE: 'visitor.update',
	VISITOR_DELETE: 'visitor.delete',
	VISITOR_CHECKIN: 'visitor.checkin',
	VISITOR_CHECKOUT: 'visitor.checkout',

	// Administrative events
	ADMIN_ACCESS: 'admin.access',
	ADMIN_ACTION: 'admin.action',
	SYSTEM_CONFIG: 'system.config',
	BACKUP_TRIGGER: 'backup.trigger',

	// Security events
	SECURITY_ALERT: 'security.alert',
	SUSPICIOUS_ACTIVITY: 'security.suspicious',
	ACCESS_DENIED: 'security.access.denied',
	RATE_LIMIT_EXCEEDED: 'security.rate_limit',

	// Data privacy events
	CONSENT_GIVEN: 'privacy.consent.given',
	CONSENT_WITHDRAWN: 'privacy.consent.withdrawn',
	DATA_REQUEST: 'privacy.data.request',
	DATA_DELETION: 'privacy.data.deletion',
	DATA_EXPORT: 'privacy.data.export'
};

/**
 * Audit log levels
 */
export const AUDIT_LEVELS = {
	INFO: 'info',
	WARN: 'warn',
	ERROR: 'error',
	CRITICAL: 'critical'
};

/**
 * Enhanced audit logger middleware
 */
const auditLogger = (...args) => {
	const options = args[0] ?? {};

	// Support being used directly as Express middleware: auditLogger(req, res, next)
	if (
		args.length >= 3 &&
		args[0] &&
		args[1] &&
		typeof args[2] === 'function' &&
		typeof args[0].method === 'string'
	) {
		const req = args[0];
		const res = args[1];
		const next = args[2];
		return auditLogger({})(req, res, next);
	}

	const {
		logLevel = AUDIT_LEVELS.INFO,
		includeRequestBody = false,
		includeResponseBody = false,
		sensitiveFields = ['password', 'token', 'secret', 'key'],
		excludePaths = ['/health', '/api/health'],
		maxBodySize = 1000
	} = options;

	return async (req, res, next) => {
		const startTime = Date.now();
		const auditId = uuidv4();
		const requestId = req.requestId || uuidv4();

		// Controller-level audit helper (best-effort)
		if (!req.audit) {
			req.audit = async (action, entityType, entityId, details = {}) => {
				try {
					const query = `
						INSERT INTO audit_logs (
							action, resource, user_id, user_role, estate_id, request_id,
							ip_address, user_agent, details, timestamp, created_at
						) VALUES (
							$1, $2, $3, $4, $5,
							$6, $7, $8, $9, NOW(), NOW()
						)
					`;

					const resource = (entityType || req.path || 'unknown').toString().substring(0, 100);
					const userAgent = req.get?.('User-Agent') || req.headers?.['user-agent'] || null;

					await dbManager.query(query, [
						String(action || 'unknown').substring(0, 100),
						resource,
						req.user?.id || null,
						req.user?.role || null,
						req.user?.estate_id ?? null,
						requestId,
						req.ip || '127.0.0.1',
						userAgent,
						JSON.stringify(
							sanitizeData(
								{
									entity_type: entityType || null,
									entity_id: entityId || null,
									...details
								},
								sensitiveFields
							)
						)
					]);
				} catch {
					// Ignore audit insert failures
				}
			};
		}

		req.auditId = auditId;
		req.auditStartTime = startTime;

		if (excludePaths.some((path) => req.path.startsWith(path))) {
			return next();
		}

		const originalSend = res.send;
		const originalJson = res.json;
		const originalEnd = res.end;

		let responseBody = '';
		let responseSize = 0;

		res.send = function (data) {
			responseBody = data;
			try {
				let stringData;
				if (data === undefined || data === null) {
					stringData = '';
				} else if (typeof data === 'string') {
					stringData = data;
				} else if (Buffer.isBuffer(data)) {
					stringData = data.toString('utf8');
				} else {
					stringData = JSON.stringify(data) || '';
				}
				responseSize = stringData ? Buffer.byteLength(stringData, 'utf8') : 0;
			} catch {
				responseSize = 0;
			}
			return originalSend.call(this, data);
		};

		res.json = function (data) {
			try {
				if (data === undefined || data === null) {
					responseBody = '';
				} else {
					responseBody = JSON.stringify(data) || '';
				}
				responseSize = responseBody ? Buffer.byteLength(responseBody, 'utf8') : 0;
			} catch {
				responseBody = '';
				responseSize = 0;
			}
			return originalJson.call(this, data);
		};

		res.end = function (data) {
			if (data) {
				responseBody = data;
				try {
					let stringData;
					if (data === undefined || data === null) {
						stringData = '';
					} else if (typeof data === 'string') {
						stringData = data;
					} else if (Buffer.isBuffer(data)) {
						stringData = data.toString('utf8');
					} else {
						stringData = JSON.stringify(data) || '';
					}
					responseSize = stringData ? Buffer.byteLength(stringData, 'utf8') : 0;
				} catch {
					responseSize = 0;
				}
			}
			return originalEnd.call(this, data);
		};

		const auditData = {
			auditId,
			requestId,
			timestamp: new Date().toISOString(),
			level: logLevel,
			event: determineEventType(req),
			user: sanitizeData(
				{
					id: req.user?.id || null,
					email: req.user?.email || null,
					role: req.user?.role || null,
					estate_id: req.user?.estate_id ?? null,
					ip: req.ip || req.connection.remoteAddress,
					userAgent: req.get('User-Agent') || null
				},
				sensitiveFields
			),
			request: {
				method: req.method,
				url: req.originalUrl,
				path: req.path,
				query: sanitizeData(req.query, sensitiveFields),
				headers: sanitizeHeaders(req.headers),
				body: includeRequestBody ? sanitizeData(req.body, sensitiveFields) : null,
				size: req.get('Content-Length') || 0
			},
			response: {
				statusCode: res.statusCode,
				headers: sanitizeHeaders(res.getHeaders()),
				body:
					includeResponseBody && responseSize <= maxBodySize
						? sanitizeData(JSON.parse(responseBody || '{}'), sensitiveFields)
						: null,
				size: responseSize
			},
			performance: {
				duration: 0,
				memoryUsage: process.memoryUsage()
			},
			metadata: sanitizeData(
				{
					sessionId: req.sessionID || null,
					correlationId: req.correlationId || null,
					apiVersion: req.get('API-Version') || '1.0',
					clientId: req.get('X-Client-ID') || null
				},
				sensitiveFields
			)
		};

		req.auditData = auditData;

		res.on('finish', async () => {
			try {
				auditData.performance.duration = Date.now() - startTime;
				auditData.response.statusCode = res.statusCode;

				if (isSecurityEvent(req, res)) {
					auditData.level = AUDIT_LEVELS.WARN;
					auditData.event = determineSecurityEvent(req, res);
				}

				if (isPrivacyEvent(req)) {
					auditData.event = determinePrivacyEvent(req);
				}

				await logAuditEvent(auditData);
				await logToCentralizedService(auditData);

				if (auditData.level === AUDIT_LEVELS.CRITICAL) {
					console.error('🚨 CRITICAL AUDIT EVENT:', {
						auditId: auditData.auditId,
						requestId: auditData.requestId,
						event: auditData.event,
						userId: auditData.user?.id,
						statusCode: auditData.response?.statusCode
					});
				}
			} catch (error) {
				console.error('❌ Audit logging failed:', error);
			}
		});

		next();
	};
};

function determineEventType(req) {
	const { method, path } = req;

	if (path.includes('/auth/login')) {
		return AUDIT_EVENTS.LOGIN_SUCCESS;
	}
	if (path.includes('/auth/logout')) {
		return AUDIT_EVENTS.LOGOUT;
	}
	if (path.includes('/auth/refresh')) {
		return AUDIT_EVENTS.TOKEN_REFRESH;
	}

	if (method === 'GET') {
		return AUDIT_EVENTS.DATA_READ;
	}
	if (method === 'POST') {
		return AUDIT_EVENTS.DATA_CREATE;
	}
	if (method === 'PUT' || method === 'PATCH') {
		return AUDIT_EVENTS.DATA_UPDATE;
	}
	if (method === 'DELETE') {
		return AUDIT_EVENTS.DATA_DELETE;
	}

	return AUDIT_EVENTS.DATA_READ;
}

function isSecurityEvent(req, res) {
	if (res.statusCode === 401 || res.statusCode === 403 || res.statusCode === 429) {
		return true;
	}

	if (req.path.includes('admin') && !req.user?.role?.includes('admin')) {
		return true;
	}

	return false;
}

function determineSecurityEvent(req, res) {
	if (res.statusCode === 401) {
		return AUDIT_EVENTS.LOGIN_FAILED;
	}
	if (res.statusCode === 403) {
		return AUDIT_EVENTS.ACCESS_DENIED;
	}
	if (res.statusCode === 429) {
		return AUDIT_EVENTS.RATE_LIMIT_EXCEEDED;
	}
	return AUDIT_EVENTS.SUSPICIOUS_ACTIVITY;
}

function isPrivacyEvent(req) {
	if (req.path.includes('/export') || req.path.includes('/download')) {
		return true;
	}

	if (req.method === 'DELETE' && req.path.includes('/users/')) {
		return true;
	}

	if (req.path.includes('/privacy') || req.path.includes('/consent')) {
		return true;
	}

	return false;
}

function determinePrivacyEvent(req) {
	if (req.path.includes('/export')) {
		return AUDIT_EVENTS.DATA_EXPORT;
	}
	if (req.method === 'DELETE') {
		return AUDIT_EVENTS.DATA_DELETION;
	}
	if (req.path.includes('/consent')) {
		return AUDIT_EVENTS.CONSENT_GIVEN;
	}
	return AUDIT_EVENTS.DATA_REQUEST;
}

function sanitizeData(data, sensitiveFields) {
	if (!data || typeof data !== 'object') {
		return data;
	}

	if (Array.isArray(data)) {
		return data.map((item) => sanitizeData(item, sensitiveFields));
	}

	const sanitized = { ...data };

	for (const field of sensitiveFields) {
		if (sanitized[field]) {
			sanitized[field] = '[REDACTED]';
		}
	}

	for (const key in sanitized) {
		const value = sanitized[key];

		if (value && typeof value === 'object') {
			sanitized[key] = sanitizeData(value, sensitiveFields);
		}
	}

	return sanitized;
}

function sanitizeHeaders(headers) {
	const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
	const sanitized = { ...headers };

	for (const header of sensitiveHeaders) {
		if (sanitized[header]) {
			sanitized[header] = '[REDACTED]';
		}
	}

	return sanitized;
}

async function logAuditEvent(auditData) {
	try {
		const query = `
			INSERT INTO audit_logs (
				action, resource, user_id, user_role, estate_id, request_id,
				ip_address, user_agent, details, timestamp, created_at
			) VALUES (
				$1, $2, $3, $4, $5,
				$6, $7, $8, $9, NOW(), NOW()
			)
		`;

		const resource = auditData.request?.path || auditData.request?.url || 'unknown';

		const values = [
			auditData.event || 'unknown',
			resource.substring(0, 100),
			auditData.user?.id || null,
			auditData.user?.role || null,
			auditData.user?.estate_id ?? null,
			auditData.requestId || null,
			auditData.user?.ip || '127.0.0.1',
			auditData.user?.userAgent || null,
			JSON.stringify({
				timestamp: auditData.timestamp,
				level: auditData.level,
				user: auditData.user,
				request: auditData.request,
				response: auditData.response,
				performance: auditData.performance,
				metadata: auditData.metadata
			})
		];

		await dbManager.query(query, values);
	} catch (error) {
		console.error('❌ Failed to log audit event to database:', error);
		await logToFile(auditData);
	}
}

async function logToCentralizedService(auditData) {
	try {
		await loggingService.logAudit(
			'Audit event',
			auditData.event,
			auditData.user?.id || null,
			{
				auditId: auditData.auditId,
				requestId: auditData.requestId,
				level: auditData.level,
				event: auditData.event,
				method: auditData.request?.method,
				path: auditData.request?.path,
				statusCode: auditData.response?.statusCode,
				durationMs: auditData.performance?.duration,
				userRole: auditData.user?.role,
				estateId: auditData.user?.estate_id
			},
			auditData.requestId
		);
	} catch (error) {
		console.error('❌ Failed to log to centralized service:', error);
	}
}

async function logToFile(auditData) {
	try {
		const fs = await import('fs');
		const path = await import('path');

		const logDir = path.join(process.cwd(), 'logs', 'audit');
		const logFile = path.join(logDir, `audit-${new Date().toISOString().split('T')[0]}.json`);

		await fs.promises.mkdir(logDir, { recursive: true });
		await fs.promises.appendFile(logFile, `${JSON.stringify(auditData)}\n`);
	} catch (error) {
		console.error('❌ Failed to log to file:', error);
	}
}

export async function getAuditLogs(filters = {}) {
	try {
		const {
			userId = null,
			eventType = null,
			level = null,
			startDate = null,
			endDate = null,
			limit = 100,
			offset = 0
		} = filters;

		let query = 'SELECT * FROM audit_logs WHERE 1=1';
		const values = [];
		let paramCount = 0;

		if (userId) {
			query += ` AND user_id = $${++paramCount}`;
			values.push(userId);
		}

		if (eventType) {
			query += ` AND action = $${++paramCount}`;
			values.push(eventType);
		}

		if (level) {
			query += ` AND details::json->>'level' = $${++paramCount}`;
			values.push(level);
		}

		if (startDate) {
			query += ` AND created_at >= $${++paramCount}`;
			values.push(startDate);
		}

		if (endDate) {
			query += ` AND created_at <= $${++paramCount}`;
			values.push(endDate);
		}

		query += ` ORDER BY created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
		values.push(limit, offset);

		const result = await dbManager.query(query, values);
		return result.rows;
	} catch (error) {
		console.error('❌ Failed to get audit logs:', error);
		throw error;
	}
}

export async function getAuditStatistics(period = '24h') {
	try {
		const periodMap = {
			'1h': '1 hour',
			'24h': '24 hours',
			'7d': '7 days',
			'30d': '30 days'
		};

		const interval = periodMap[period] || '24 hours';

		const query = `
			SELECT
				action as event_type,
				details::json->>'level' as level,
				COUNT(*) as count,
				AVG((details::json->>'duration')::numeric) as avg_duration,
				MAX(created_at) as last_occurrence
			FROM audit_logs
			WHERE created_at >= NOW() - INTERVAL '${interval}'
			GROUP BY action, details::json->>'level'
			ORDER BY count DESC
		`;

		const result = await dbManager.query(query);
		return result.rows;
	} catch (error) {
		console.error('❌ Failed to get audit statistics:', error);
		throw error;
	}
}

export async function cleanupAuditLogs(retentionDays = 90) {
	try {
		const query = `
			DELETE FROM audit_logs
			WHERE created_at < NOW() - INTERVAL '${retentionDays} days'
		`;

		const result = await dbManager.query(query);
		console.log(`✅ Cleaned up ${result.rowCount} old audit logs`);
		return result.rowCount;
	} catch (error) {
		console.error('❌ Failed to cleanup audit logs:', error);
		throw error;
	}
}

// Backward-compatible named export used by legacy route imports.
export const attachRequestAudit = auditLogger;

export default auditLogger;