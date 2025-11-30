/**
 * Secret Management Service
 * Handles secrets using HashiCorp Vault with rotation and audit logging
 */

import { createClient } from 'node-vault';
import loggingService from './loggingService.js';
import crypto from 'crypto';

class SecretManagementService {
    constructor() {
        this.vaultClient = null;
        this.isInitialized = false;
        this.secretCache = new Map();
        this.cacheExpiry = new Map();
        this.rotationSchedule = new Map();
        
        // Configuration
        this.vaultConfig = {
            apiVersion: 'v1',
            endpoint: process.env.VAULT_ADDR || 'http://localhost:8200',
            token: process.env.VAULT_TOKEN,
            namespace: process.env.VAULT_NAMESPACE
        };
        
        this.cacheTimeout = parseInt(process.env.SECRET_CACHE_TIMEOUT || '300000'); // 5 minutes
        this.rotationInterval = parseInt(process.env.SECRET_ROTATION_INTERVAL || '86400000'); // 24 hours
    }

    /**
     * Initialize Vault client
     */
    async initialize() {
        try {
            if (!this.vaultConfig.token) {
                throw new Error('VAULT_TOKEN environment variable is required');
            }

            this.vaultClient = createClient(this.vaultConfig);
            
            // Test connection
            await this.vaultClient.health();
            
            this.isInitialized = true;
            loggingService.logInfo('Secret Management Service initialized', {
                vaultEndpoint: this.vaultConfig.endpoint,
                namespace: this.vaultConfig.namespace
            });

            // Start rotation scheduler
            this.startRotationScheduler();
            
        } catch (error) {
            loggingService.logError('Failed to initialize Secret Management Service', error);
            throw error;
        }
    }

    /**
     * Get secret from Vault with caching
     */
    async getSecret(path, key = null) {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            const cacheKey = `${path}:${key || 'all'}`;
            const now = Date.now();
            
            // Check cache first
            if (this.secretCache.has(cacheKey) && this.cacheExpiry.get(cacheKey) > now) {
                loggingService.logDebug('Secret retrieved from cache', { path, key });
                return this.secretCache.get(cacheKey);
            }

            // Fetch from Vault
            const response = await this.vaultClient.read(path);
            const secret = response.data?.data || response.data;
            
            if (!secret) {
                throw new Error(`Secret not found at path: ${path}`);
            }

            const result = key ? secret[key] : secret;
            
            // Cache the result
            this.secretCache.set(cacheKey, result);
            this.cacheExpiry.set(cacheKey, now + this.cacheTimeout);
            
            loggingService.logInfo('Secret retrieved from Vault', { 
                path, 
                key,
                cached: false 
            });

            return result;
            
        } catch (error) {
            loggingService.logError('Failed to retrieve secret', {
                path,
                key,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Store secret in Vault
     */
    async storeSecret(path, data, metadata = {}) {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            const secretData = {
                data: data,
                metadata: {
                    ...metadata,
                    created_at: new Date().toISOString(),
                    version: 1
                }
            };

            await this.vaultClient.write(path, secretData);
            
            // Clear cache for this path
            this.clearCacheForPath(path);
            
            loggingService.logInfo('Secret stored in Vault', { 
                path,
                metadata: secretData.metadata
            });

            return true;
            
        } catch (error) {
            loggingService.logError('Failed to store secret', {
                path,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Update secret in Vault
     */
    async updateSecret(path, data, metadata = {}) {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            // Get current version
            const current = await this.vaultClient.read(path);
            const currentVersion = current.data?.metadata?.version || 1;
            
            const secretData = {
                data: data,
                metadata: {
                    ...metadata,
                    updated_at: new Date().toISOString(),
                    version: currentVersion + 1,
                    previous_version: currentVersion
                }
            };

            await this.vaultClient.write(path, secretData);
            
            // Clear cache for this path
            this.clearCacheForPath(path);
            
            loggingService.logInfo('Secret updated in Vault', { 
                path,
                version: secretData.metadata.version
            });

            return true;
            
        } catch (error) {
            loggingService.logError('Failed to update secret', {
                path,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Delete secret from Vault
     */
    async deleteSecret(path) {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            await this.vaultClient.delete(path);
            
            // Clear cache for this path
            this.clearCacheForPath(path);
            
            loggingService.logInfo('Secret deleted from Vault', { path });
            return true;
            
        } catch (error) {
            loggingService.logError('Failed to delete secret', {
                path,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Generate new secret
     */
    generateSecret(type = 'random', length = 32) {
        switch (type.toLowerCase()) {
            case 'random':
                return crypto.randomBytes(length).toString('hex');
            case 'uuid':
                return crypto.randomUUID();
            case 'password':
                return this.generatePassword(length);
            case 'jwt':
                return this.generateJWTSecret();
            default:
                return crypto.randomBytes(length).toString('hex');
        }
    }

    /**
     * Generate secure password
     */
    generatePassword(length = 16) {
        const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        let password = '';
        
        for (let i = 0; i < length; i++) {
            password += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        
        return password;
    }

    /**
     * Generate JWT secret
     */
    generateJWTSecret() {
        return crypto.randomBytes(64).toString('base64');
    }

    /**
     * Rotate secret
     */
    async rotateSecret(path, key, secretType = 'random') {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            // Generate new secret
            const newSecret = this.generateSecret(secretType);
            
            // Get current secret data
            const currentData = await this.getSecret(path);
            const updatedData = { ...currentData, [key]: newSecret };
            
            // Update in Vault
            await this.updateSecret(path, updatedData, {
                rotation_reason: 'scheduled_rotation',
                rotated_at: new Date().toISOString()
            });
            
            // Clear cache
            this.clearCacheForPath(path);
            
            loggingService.logInfo('Secret rotated successfully', {
                path,
                key,
                type: secretType
            });

            return newSecret;
            
        } catch (error) {
            loggingService.logError('Failed to rotate secret', {
                path,
                key,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Schedule secret rotation
     */
    scheduleRotation(path, key, secretType = 'random', interval = null) {
        const rotationInterval = interval || this.rotationInterval;
        const rotationId = `${path}:${key}`;
        
        // Clear existing rotation if any
        if (this.rotationSchedule.has(rotationId)) {
            clearInterval(this.rotationSchedule.get(rotationId));
        }
        
        // Schedule new rotation
        const intervalId = setInterval(async () => {
            try {
                await this.rotateSecret(path, key, secretType);
            } catch (error) {
                loggingService.logError('Scheduled rotation failed', {
                    path,
                    key,
                    error: error.message
                });
            }
        }, rotationInterval);
        
        this.rotationSchedule.set(rotationId, intervalId);
        
        loggingService.logInfo('Secret rotation scheduled', {
            path,
            key,
            interval: rotationInterval
        });
    }

    /**
     * Start rotation scheduler
     */
    startRotationScheduler() {
        // Schedule rotation for critical secrets
        this.scheduleRotation('secret/data/secure-gate/jwt/access', 'secret', 'jwt');
        this.scheduleRotation('secret/data/secure-gate/jwt/refresh', 'secret', 'jwt');
        this.scheduleRotation('secret/data/secure-gate/database', 'password', 'password');
        this.scheduleRotation('secret/data/secure-gate/redis', 'password', 'password');
    }

    /**
     * Clear cache for specific path
     */
    clearCacheForPath(path) {
        const keysToDelete = [];
        for (const [key, value] of this.secretCache.entries()) {
            if (key.startsWith(path)) {
                keysToDelete.push(key);
            }
        }
        
        keysToDelete.forEach(key => {
            this.secretCache.delete(key);
            this.cacheExpiry.delete(key);
        });
    }

    /**
     * Clear all cache
     */
    clearCache() {
        this.secretCache.clear();
        this.cacheExpiry.clear();
        loggingService.logInfo('Secret cache cleared');
    }

    /**
     * Get secret metadata
     */
    async getSecretMetadata(path) {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            const response = await this.vaultClient.read(path);
            return response.data?.metadata || {};
            
        } catch (error) {
            loggingService.logError('Failed to get secret metadata', {
                path,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * List secrets
     */
    async listSecrets(path) {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            const response = await this.vaultClient.list(path);
            return response.data?.keys || [];
            
        } catch (error) {
            loggingService.logError('Failed to list secrets', {
                path,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Health check
     */
    async healthCheck() {
        try {
            if (!this.isInitialized) {
                return { status: 'not_initialized', healthy: false };
            }

            const health = await this.vaultClient.health();
            return {
                status: health.initialized ? 'initialized' : 'not_initialized',
                healthy: health.initialized && !health.sealed,
                sealed: health.sealed,
                version: health.version,
                cluster_name: health.cluster_name
            };
            
        } catch (error) {
            loggingService.logError('Vault health check failed', error);
            return { status: 'error', healthy: false, error: error.message };
        }
    }

    /**
     * Get service status
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            cacheSize: this.secretCache.size,
            rotationSchedules: this.rotationSchedule.size,
            vaultEndpoint: this.vaultConfig.endpoint,
            namespace: this.vaultConfig.namespace
        };
    }
}

export default new SecretManagementService();
