/**
 * Secret Audit Service
 * Comprehensive audit logging for secret management operations
 */

import loggingService from './loggingService.js';
import optimizedDb from './optimizedDatabaseService.js';
import crypto from 'crypto';

class SecretAuditService {
    constructor() {
        this.auditQueue = [];
        this.batchSize = parseInt(process.env.SECRET_AUDIT_BATCH_SIZE || '100');
        this.flushInterval = parseInt(process.env.SECRET_AUDIT_FLUSH_INTERVAL || '30000'); // 30 seconds
        this.isFlushing = false;
        
        // Start batch processor
        this.startBatchProcessor();
    }

    /**
     * Log secret access event
     */
    logSecretAccess(operation, path, key, userId, ip, userAgent, metadata = {}) {
        const auditEvent = {
            eventType: 'secret_access',
            operation,
            path,
            key,
            userId,
            ip,
            userAgent,
            timestamp: new Date().toISOString(),
            metadata: {
                ...metadata,
                sessionId: this.generateSessionId(),
                requestId: this.generateRequestId()
            }
        };

        this.addToAuditQueue(auditEvent);
    }

    /**
     * Log secret modification event
     */
    logSecretModification(operation, path, key, userId, ip, userAgent, changes = {}) {
        const auditEvent = {
            eventType: 'secret_modification',
            operation,
            path,
            key,
            userId,
            ip,
            userAgent,
            timestamp: new Date().toISOString(),
            changes: {
                ...changes,
                changeId: this.generateChangeId()
            },
            metadata: {
                sessionId: this.generateSessionId(),
                requestId: this.generateRequestId()
            }
        };

        this.addToAuditQueue(auditEvent);
    }

    /**
     * Log secret rotation event
     */
    logSecretRotation(operation, path, key, userId, ip, userAgent, rotationData = {}) {
        const auditEvent = {
            eventType: 'secret_rotation',
            operation,
            path,
            key,
            userId,
            ip,
            userAgent,
            timestamp: new Date().toISOString(),
            rotationData: {
                ...rotationData,
                rotationId: this.generateRotationId()
            },
            metadata: {
                sessionId: this.generateSessionId(),
                requestId: this.generateRequestId()
            }
        };

        this.addToAuditQueue(auditEvent);
    }

    /**
     * Log secret deletion event
     */
    logSecretDeletion(operation, path, key, userId, ip, userAgent, deletionReason = '') {
        const auditEvent = {
            eventType: 'secret_deletion',
            operation,
            path,
            key,
            userId,
            ip,
            userAgent,
            timestamp: new Date().toISOString(),
            deletionReason,
            metadata: {
                sessionId: this.generateSessionId(),
                requestId: this.generateRequestId()
            }
        };

        this.addToAuditQueue(auditEvent);
    }

    /**
     * Log authentication event
     */
    logAuthentication(operation, userId, ip, userAgent, success, failureReason = '') {
        const auditEvent = {
            eventType: 'authentication',
            operation,
            userId,
            ip,
            userAgent,
            success,
            failureReason,
            timestamp: new Date().toISOString(),
            metadata: {
                sessionId: this.generateSessionId(),
                requestId: this.generateRequestId()
            }
        };

        this.addToAuditQueue(auditEvent);
    }

    /**
     * Log authorization event
     */
    logAuthorization(operation, userId, resource, action, ip, userAgent, granted, reason = '') {
        const auditEvent = {
            eventType: 'authorization',
            operation,
            userId,
            resource,
            action,
            ip,
            userAgent,
            granted,
            reason,
            timestamp: new Date().toISOString(),
            metadata: {
                sessionId: this.generateSessionId(),
                requestId: this.generateRequestId()
            }
        };

        this.addToAuditQueue(auditEvent);
    }

    /**
     * Log system event
     */
    logSystemEvent(eventType, operation, details = {}) {
        const auditEvent = {
            eventType: 'system',
            operation,
            timestamp: new Date().toISOString(),
            details: {
                ...details,
                eventId: this.generateEventId()
            },
            metadata: {
                sessionId: this.generateSessionId(),
                requestId: this.generateRequestId()
            }
        };

        this.addToAuditQueue(auditEvent);
    }

    /**
     * Add event to audit queue
     */
    addToAuditQueue(auditEvent) {
        // Add to queue
        this.auditQueue.push(auditEvent);
        
        // Log to application logs
        loggingService.logInfo('Secret audit event', auditEvent);
        
        // Flush if queue is full
        if (this.auditQueue.length >= this.batchSize) {
            this.flushAuditQueue();
        }
    }

    /**
     * Start batch processor
     */
    startBatchProcessor() {
        setInterval(() => {
            if (this.auditQueue.length > 0 && !this.isFlushing) {
                this.flushAuditQueue();
            }
        }, this.flushInterval);
    }

    /**
     * Flush audit queue to database
     */
    async flushAuditQueue() {
        if (this.isFlushing || this.auditQueue.length === 0) {
            return;
        }

        this.isFlushing = true;
        const eventsToFlush = this.auditQueue.splice(0, this.batchSize);

        try {
            await this.saveAuditEvents(eventsToFlush);
            loggingService.logDebug('Audit events flushed to database', {
                count: eventsToFlush.length
            });
        } catch (error) {
            loggingService.logError('Failed to flush audit events', error);
            // Put events back in queue for retry
            this.auditQueue.unshift(...eventsToFlush);
        } finally {
            this.isFlushing = false;
        }
    }

    /**
     * Save audit events to database
     */
    async saveAuditEvents(events) {
        if (events.length === 0) return;

        const query = `
            INSERT INTO secret_audit_log 
            (event_type, operation, secret_path, secret_key, user_id, 
             ip_address, user_agent, success, details, metadata, timestamp)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `;

        for (const event of events) {
            const values = [
                event.eventType,
                event.operation,
                event.path || null,
                event.key || null,
                event.userId || null,
                event.ip || null,
                event.userAgent || null,
                event.success !== undefined ? event.success : true,
                JSON.stringify(event.details || event.changes || event.rotationData || {}),
                JSON.stringify(event.metadata || {}),
                event.timestamp
            ];

            await optimizedDb.query(query, values);
        }
    }

    /**
     * Get audit events
     */
    async getAuditEvents(filters = {}) {
        try {
            let query = `
                SELECT * FROM secret_audit_log 
                WHERE 1=1
            `;
            const values = [];
            let paramCount = 0;

            if (filters.eventType) {
                query += ` AND event_type = $${++paramCount}`;
                values.push(filters.eventType);
            }

            if (filters.userId) {
                query += ` AND user_id = $${++paramCount}`;
                values.push(filters.userId);
            }

            if (filters.secretPath) {
                query += ` AND secret_path = $${++paramCount}`;
                values.push(filters.secretPath);
            }

            if (filters.startDate) {
                query += ` AND timestamp >= $${++paramCount}`;
                values.push(filters.startDate);
            }

            if (filters.endDate) {
                query += ` AND timestamp <= $${++paramCount}`;
                values.push(filters.endDate);
            }

            query += ` ORDER BY timestamp DESC`;

            if (filters.limit) {
                query += ` LIMIT $${++paramCount}`;
                values.push(filters.limit);
            }

            const result = await optimizedDb.query(query, values);
            return result.rows;

        } catch (error) {
            loggingService.logError('Failed to get audit events', error);
            throw error;
        }
    }

    /**
     * Get audit statistics
     */
    async getAuditStatistics(startDate, endDate) {
        try {
            const query = `
                SELECT 
                    event_type,
                    operation,
                    COUNT(*) as count,
                    COUNT(CASE WHEN success = true THEN 1 END) as success_count,
                    COUNT(CASE WHEN success = false THEN 1 END) as failure_count
                FROM secret_audit_log 
                WHERE timestamp >= $1 AND timestamp <= $2
                GROUP BY event_type, operation
                ORDER BY count DESC
            `;

            const result = await optimizedDb.query(query, [startDate, endDate]);
            return result.rows;

        } catch (error) {
            loggingService.logError('Failed to get audit statistics', error);
            throw error;
        }
    }

    /**
     * Generate session ID
     */
    generateSessionId() {
        return crypto.randomUUID();
    }

    /**
     * Generate request ID
     */
    generateRequestId() {
        return `req_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    }

    /**
     * Generate change ID
     */
    generateChangeId() {
        return `chg_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    }

    /**
     * Generate rotation ID
     */
    generateRotationId() {
        return `rot_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    }

    /**
     * Generate event ID
     */
    generateEventId() {
        return `evt_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    }

    /**
     * Get service status
     */
    getStatus() {
        return {
            queueSize: this.auditQueue.length,
            isFlushing: this.isFlushing,
            batchSize: this.batchSize,
            flushInterval: this.flushInterval
        };
    }
}

export default new SecretAuditService();
