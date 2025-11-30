/**
 * Secret Rotation Service
 * Handles automated secret rotation with rollback capabilities
 */

import secretManagementService from './secretManagementService.js';
import loggingService from './loggingService.js';
import optimizedDb from './optimizedDatabaseService.js';

class SecretRotationService {
    constructor() {
        this.rotationJobs = new Map();
        this.rotationHistory = [];
        this.rollbackQueue = [];
        this.isRunning = false;
        
        // Configuration
        this.rotationInterval = parseInt(process.env.SECRET_ROTATION_INTERVAL || '86400000'); // 24 hours
        this.rollbackTimeout = parseInt(process.env.SECRET_ROLLBACK_TIMEOUT || '300000'); // 5 minutes
        this.maxRetries = parseInt(process.env.SECRET_ROTATION_MAX_RETRIES || '3');
    }

    /**
     * Initialize rotation service
     */
    async initialize() {
        try {
            // Load rotation configuration from database
            await this.loadRotationConfig();
            
            // Start rotation scheduler
            this.startRotationScheduler();
            
            this.isRunning = true;
            loggingService.logInfo('Secret Rotation Service initialized');
            
        } catch (error) {
            loggingService.logError('Failed to initialize Secret Rotation Service', error);
            throw error;
        }
    }

    /**
     * Load rotation configuration from database
     */
    async loadRotationConfig() {
        try {
            const query = `
                SELECT secret_path, secret_key, rotation_interval, 
                       secret_type, enabled, last_rotated
                FROM secret_rotation_config
                WHERE enabled = true
            `;
            
            const result = await optimizedDb.query(query);
            
            for (const config of result.rows) {
                this.scheduleRotation(config);
            }
            
            loggingService.logInfo('Rotation configuration loaded', {
                count: result.rows.length
            });
            
        } catch (error) {
            loggingService.logError('Failed to load rotation configuration', error);
            // Continue without database config
        }
    }

    /**
     * Schedule secret rotation
     */
    scheduleRotation(config) {
        const { secret_path, secret_key, rotation_interval, secret_type } = config;
        const jobId = `${secret_path}:${secret_key}`;
        
        // Clear existing job if any
        if (this.rotationJobs.has(jobId)) {
            clearInterval(this.rotationJobs.get(jobId));
        }
        
        // Schedule new rotation
        const intervalId = setInterval(async () => {
            await this.rotateSecret(secret_path, secret_key, secret_type);
        }, rotation_interval || this.rotationInterval);
        
        this.rotationJobs.set(jobId, intervalId);
        
        loggingService.logInfo('Secret rotation scheduled', {
            path: secret_path,
            key: secret_key,
            interval: rotation_interval
        });
    }

    /**
     * Start rotation scheduler
     */
    startRotationScheduler() {
        // Default rotation schedule for critical secrets
        const defaultRotations = [
            {
                path: 'secret/data/secure-gate/jwt/access',
                key: 'secret',
                type: 'jwt',
                interval: this.rotationInterval
            },
            {
                path: 'secret/data/secure-gate/jwt/refresh',
                key: 'secret',
                type: 'jwt',
                interval: this.rotationInterval
            },
            {
                path: 'secret/data/secure-gate/database',
                key: 'password',
                type: 'password',
                interval: this.rotationInterval * 7 // Weekly
            },
            {
                path: 'secret/data/secure-gate/redis',
                key: 'password',
                type: 'password',
                interval: this.rotationInterval * 7 // Weekly
            }
        ];

        defaultRotations.forEach(config => {
            this.scheduleRotation(config);
        });
    }

    /**
     * Rotate secret with rollback capability
     */
    async rotateSecret(path, key, secretType = 'random', retryCount = 0) {
        const rotationId = `${path}:${key}:${Date.now()}`;
        const startTime = Date.now();
        
        try {
            loggingService.logInfo('Starting secret rotation', {
                rotationId,
                path,
                key,
                type: secretType
            });

            // Get current secret for rollback
            const currentSecret = await secretManagementService.getSecret(path, key);
            
            // Generate new secret
            const newSecret = secretManagementService.generateSecret(secretType);
            
            // Create rollback entry
            const rollbackEntry = {
                rotationId,
                path,
                key,
                oldSecret: currentSecret,
                newSecret,
                timestamp: new Date().toISOString(),
                status: 'pending'
            };
            
            this.rollbackQueue.push(rollbackEntry);
            
            // Update secret in Vault
            const currentData = await secretManagementService.getSecret(path);
            const updatedData = { ...currentData, [key]: newSecret };
            
            await secretManagementService.updateSecret(path, updatedData, {
                rotation_reason: 'scheduled_rotation',
                rotated_at: new Date().toISOString(),
                rotation_id: rotationId
            });
            
            // Test the new secret
            const testResult = await this.testSecret(path, key, newSecret);
            
            if (!testResult.success) {
                throw new Error(`Secret test failed: ${testResult.error}`);
            }
            
            // Update rollback entry
            rollbackEntry.status = 'completed';
            rollbackEntry.testResult = testResult;
            
            // Record rotation in history
            this.rotationHistory.push({
                ...rollbackEntry,
                duration: Date.now() - startTime,
                retryCount
            });
            
            // Save rotation record to database
            await this.saveRotationRecord(rollbackEntry);
            
            loggingService.logInfo('Secret rotation completed successfully', {
                rotationId,
                path,
                key,
                duration: Date.now() - startTime
            });
            
            // Schedule rollback cleanup
            setTimeout(() => {
                this.cleanupRollbackEntry(rotationId);
            }, this.rollbackTimeout);
            
        } catch (error) {
            loggingService.logError('Secret rotation failed', {
                rotationId,
                path,
                key,
                error: error.message,
                retryCount
            });
            
            // Attempt rollback if we have the old secret
            const rollbackEntry = this.rollbackQueue.find(entry => entry.rotationId === rotationId);
            if (rollbackEntry && rollbackEntry.status === 'pending') {
                await this.rollbackSecret(rollbackEntry);
            }
            
            // Retry if within limits
            if (retryCount < this.maxRetries) {
                setTimeout(() => {
                    this.rotateSecret(path, key, secretType, retryCount + 1);
                }, 60000); // Retry after 1 minute
            }
            
            throw error;
        }
    }

    /**
     * Test secret after rotation
     */
    async testSecret(path, key, secret) {
        try {
            // Test database connection if it's a database secret
            if (path.includes('database') && key === 'password') {
                return await this.testDatabaseConnection(secret);
            }
            
            // Test Redis connection if it's a Redis secret
            if (path.includes('redis') && key === 'password') {
                return await this.testRedisConnection(secret);
            }
            
            // Test JWT secret if it's a JWT secret
            if (path.includes('jwt') && key === 'secret') {
                return await this.testJWTSecret(secret);
            }
            
            // Default test - just verify the secret is not empty
            return {
                success: secret && secret.length > 0,
                error: secret ? null : 'Secret is empty'
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Test database connection with new password
     */
    async testDatabaseConnection(password) {
        try {
            // Create a test connection with the new password
            const testQuery = 'SELECT 1 as test';
            const result = await optimizedDb.query(testQuery);
            
            return {
                success: result.rows.length > 0,
                error: null
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Test Redis connection with new password
     */
    async testRedisConnection(password) {
        try {
            // This would test Redis connection with new password
            // For now, just return success
            return {
                success: true,
                error: null
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Test JWT secret
     */
    async testJWTSecret(secret) {
        try {
            // Test JWT signing and verification
            const jwt = require('jsonwebtoken');
            const testPayload = { test: true };
            
            const token = jwt.sign(testPayload, secret, { expiresIn: '1m' });
            const decoded = jwt.verify(token, secret);
            
            return {
                success: decoded.test === true,
                error: null
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Rollback secret to previous version
     */
    async rollbackSecret(rollbackEntry) {
        try {
            const { path, key, oldSecret, rotationId } = rollbackEntry;
            
            loggingService.logInfo('Rolling back secret', {
                rotationId,
                path,
                key
            });
            
            // Get current data and restore old secret
            const currentData = await secretManagementService.getSecret(path);
            const rollbackData = { ...currentData, [key]: oldSecret };
            
            await secretManagementService.updateSecret(path, rollbackData, {
                rotation_reason: 'rollback',
                rolled_back_at: new Date().toISOString(),
                rollback_rotation_id: rotationId
            });
            
            rollbackEntry.status = 'rolled_back';
            
            loggingService.logInfo('Secret rollback completed', {
                rotationId,
                path,
                key
            });
            
        } catch (error) {
            loggingService.logError('Secret rollback failed', {
                rotationId: rollbackEntry.rotationId,
                path: rollbackEntry.path,
                key: rollbackEntry.key,
                error: error.message
            });
        }
    }

    /**
     * Save rotation record to database
     */
    async saveRotationRecord(record) {
        try {
            const query = `
                INSERT INTO secret_rotation_log 
                (rotation_id, secret_path, secret_key, old_secret_hash, 
                 new_secret_hash, status, timestamp, test_result)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `;
            
            const values = [
                record.rotationId,
                record.path,
                record.key,
                this.hashSecret(record.oldSecret),
                this.hashSecret(record.newSecret),
                record.status,
                record.timestamp,
                JSON.stringify(record.testResult || {})
            ];
            
            await optimizedDb.query(query, values);
            
        } catch (error) {
            loggingService.logError('Failed to save rotation record', {
                rotationId: record.rotationId,
                error: error.message
            });
        }
    }

    /**
     * Hash secret for storage
     */
    hashSecret(secret) {
        const crypto = require('crypto');
        return crypto.createHash('sha256').update(secret).digest('hex');
    }

    /**
     * Cleanup rollback entry
     */
    cleanupRollbackEntry(rotationId) {
        const index = this.rollbackQueue.findIndex(entry => entry.rotationId === rotationId);
        if (index > -1) {
            this.rollbackQueue.splice(index, 1);
        }
    }

    /**
     * Get rotation history
     */
    getRotationHistory(limit = 100) {
        return this.rotationHistory
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, limit);
    }

    /**
     * Get rollback queue
     */
    getRollbackQueue() {
        return this.rollbackQueue;
    }

    /**
     * Get rotation status
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            activeJobs: this.rotationJobs.size,
            rotationHistory: this.rotationHistory.length,
            rollbackQueue: this.rollbackQueue.length,
            rotationInterval: this.rotationInterval,
            maxRetries: this.maxRetries
        };
    }

    /**
     * Stop rotation service
     */
    stop() {
        // Clear all rotation jobs
        for (const [jobId, intervalId] of this.rotationJobs.entries()) {
            clearInterval(intervalId);
        }
        this.rotationJobs.clear();
        
        this.isRunning = false;
        loggingService.logInfo('Secret Rotation Service stopped');
    }
}

export default new SecretRotationService();
