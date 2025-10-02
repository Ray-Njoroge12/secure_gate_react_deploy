/**
 * Redis Cache Service
 * Advanced caching with Redis for high-performance data access
 */

import { createClient } from 'redis';
import loggingService from './loggingService.js';
import crypto from 'crypto';

class RedisCacheService {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.cacheStats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            expires: 0,
            errors: 0
        };
        
        this.config = {
            url: process.env.REDIS_URL || 'redis://localhost:6379',
            retryDelayOnFailover: 100,
            enableReadyCheck: false,
            maxRetriesPerRequest: 3,
            lazyConnect: true,
            socket: {
                connectTimeout: 10000,
                commandTimeout: 5000
            },
            // Cache configuration
            defaultTTL: parseInt(process.env.CACHE_DEFAULT_TTL || '300'), // 5 minutes
            maxKeys: parseInt(process.env.CACHE_MAX_KEYS || '10000'),
            compressionThreshold: parseInt(process.env.CACHE_COMPRESSION_THRESHOLD || '1024'),
            enableCompression: process.env.CACHE_ENABLE_COMPRESSION === 'true',
            enableEncryption: process.env.CACHE_ENABLE_ENCRYPTION === 'true',
            encryptionKey: process.env.CACHE_ENCRYPTION_KEY
        };
        
        this.keyPrefixes = {
            user: 'user:',
            visitor: 'visitor:',
            invitation: 'invitation:',
            checkin: 'checkin:',
            session: 'session:',
            rateLimit: 'rate_limit:',
            health: 'health:',
            backup: 'backup:',
            dr: 'dr:',
            performance: 'perf:'
        };
    }

    /**
     * Initialize Redis cache service
     */
    async initialize() {
        try {
            this.client = createClient(this.config);
            
            // Set up event handlers
            this.client.on('error', (err) => {
                this.cacheStats.errors++;
                loggingService.logError('Redis cache error', err);
            });
            
            this.client.on('connect', () => {
                loggingService.logInfo('Redis cache connected');
            });
            
            this.client.on('ready', () => {
                this.isConnected = true;
                loggingService.logInfo('Redis cache ready for operations');
            });
            
            this.client.on('end', () => {
                this.isConnected = false;
                loggingService.logInfo('Redis cache connection ended');
            });
            
            this.client.on('reconnecting', () => {
                loggingService.logInfo('Redis cache reconnecting...');
            });
            
            // Connect to Redis
            await this.client.connect();
            
            // Test connection
            await this.client.ping();
            
            loggingService.logInfo('Redis Cache Service initialized', {
                url: this.config.url,
                defaultTTL: this.config.defaultTTL,
                maxKeys: this.config.maxKeys,
                compression: this.config.enableCompression,
                encryption: this.config.enableEncryption
            });
            
        } catch (error) {
            loggingService.logError('Failed to initialize Redis Cache Service', error);
            this.isConnected = false;
            throw error;
        }
    }

    /**
     * Generate cache key with prefix
     */
    generateKey(prefix, key, options = {}) {
        const { namespace, version } = options;
        let fullKey = `${this.keyPrefixes[prefix] || ''}${key}`;
        
        if (namespace) {
            fullKey = `${namespace}:${fullKey}`;
        }
        
        if (version) {
            fullKey = `${fullKey}:v${version}`;
        }
        
        return fullKey;
    }

    /**
     * Get value from cache
     */
    async get(key, options = {}) {
        if (!this.isConnected) {
            this.cacheStats.misses++;
            return options.defaultValue || null;
        }

        try {
            const startTime = Date.now();
            const fullKey = this.generateKey(options.prefix || 'default', key, options);
            const value = await this.client.get(fullKey);
            const duration = Date.now() - startTime;

            if (value !== null) {
                this.cacheStats.hits++;
                
                // Decrypt if enabled
                let decryptedValue = value;
                if (this.config.enableEncryption) {
                    decryptedValue = this.decrypt(value);
                }
                
                // Decompress if needed
                let finalValue = decryptedValue;
                if (this.config.enableCompression && decryptedValue.startsWith('compressed:')) {
                    finalValue = this.decompress(decryptedValue);
                }
                
                return JSON.parse(finalValue);
            } else {
                this.cacheStats.misses++;
                return options.defaultValue || null;
            }
        } catch (error) {
            this.cacheStats.errors++;
            loggingService.logError('Cache get error', { key, error: error.message });
            return options.defaultValue || null;
        }
    }

    /**
     * Set value in cache
     */
    async set(key, value, ttl = this.config.defaultTTL, options = {}) {
        if (!this.isConnected) {
            this.cacheStats.errors++;
            return false;
        }

        try {
            const startTime = Date.now();
            const fullKey = this.generateKey(options.prefix || 'default', key, options);
            
            // Serialize value
            let serializedValue = JSON.stringify(value);
            
            // Compress if above threshold
            if (this.config.enableCompression && 
                serializedValue.length > this.config.compressionThreshold) {
                serializedValue = this.compress(serializedValue);
            }
            
            // Encrypt if enabled
            if (this.config.enableEncryption) {
                serializedValue = this.encrypt(serializedValue);
            }
            
            // Set with TTL
            if (ttl > 0) {
                await this.client.setEx(fullKey, ttl, serializedValue);
            } else {
                await this.client.set(fullKey, serializedValue);
            }
            
            const duration = Date.now() - startTime;
            this.cacheStats.sets++;
            
            return true;
        } catch (error) {
            this.cacheStats.errors++;
            loggingService.logError('Cache set error', { key, error: error.message });
            return false;
        }
    }

    /**
     * Delete key from cache
     */
    async del(key, options = {}) {
        if (!this.isConnected) {
            this.cacheStats.errors++;
            return false;
        }

        try {
            const fullKey = this.generateKey(options.prefix || 'default', key, options);
            const result = await this.client.del(fullKey);
            this.cacheStats.deletes++;
            return result > 0;
        } catch (error) {
            this.cacheStats.errors++;
            loggingService.logError('Cache delete error', { key, error: error.message });
            return false;
        }
    }

    /**
     * Delete multiple keys
     */
    async delMultiple(keys, options = {}) {
        if (!this.isConnected) {
            this.cacheStats.errors++;
            return 0;
        }

        try {
            const fullKeys = keys.map(key => this.generateKey(options.prefix || 'default', key, options));
            const result = await this.client.del(fullKeys);
            this.cacheStats.deletes += result;
            return result;
        } catch (error) {
            this.cacheStats.errors++;
            loggingService.logError('Cache delete multiple error', { keys, error: error.message });
            return 0;
        }
    }

    /**
     * Check if key exists
     */
    async exists(key, options = {}) {
        if (!this.isConnected) return false;

        try {
            const fullKey = this.generateKey(options.prefix || 'default', key, options);
            const result = await this.client.exists(fullKey);
            return result === 1;
        } catch (error) {
            this.cacheStats.errors++;
            loggingService.logError('Cache exists error', { key, error: error.message });
            return false;
        }
    }

    /**
     * Get TTL for key
     */
    async ttl(key, options = {}) {
        if (!this.isConnected) return -1;

        try {
            const fullKey = this.generateKey(options.prefix || 'default', key, options);
            return await this.client.ttl(fullKey);
        } catch (error) {
            this.cacheStats.errors++;
            loggingService.logError('Cache TTL error', { key, error: error.message });
            return -1;
        }
    }

    /**
     * Set TTL for key
     */
    async expire(key, ttl, options = {}) {
        if (!this.isConnected) return false;

        try {
            const fullKey = this.generateKey(options.prefix || 'default', key, options);
            const result = await this.client.expire(fullKey, ttl);
            if (result) {
                this.cacheStats.expires++;
            }
            return result;
        } catch (error) {
            this.cacheStats.errors++;
            loggingService.logError('Cache expire error', { key, error: error.message });
            return false;
        }
    }

    /**
     * Get multiple keys
     */
    async mget(keys, options = {}) {
        if (!this.isConnected) return keys.map(() => null);

        try {
            const fullKeys = keys.map(key => this.generateKey(options.prefix || 'default', key, options));
            const values = await this.client.mGet(fullKeys);
            
            return values.map((value, index) => {
                if (value !== null) {
                    this.cacheStats.hits++;
                    
                    // Decrypt and decompress if needed
                    let finalValue = value;
                    if (this.config.enableEncryption) {
                        finalValue = this.decrypt(finalValue);
                    }
                    if (this.config.enableCompression && finalValue.startsWith('compressed:')) {
                        finalValue = this.decompress(finalValue);
                    }
                    
                    return JSON.parse(finalValue);
                } else {
                    this.cacheStats.misses++;
                    return null;
                }
            });
        } catch (error) {
            this.cacheStats.errors++;
            loggingService.logError('Cache mget error', { keys, error: error.message });
            return keys.map(() => null);
        }
    }

    /**
     * Set multiple keys
     */
    async mset(keyValuePairs, ttl = this.config.defaultTTL, options = {}) {
        if (!this.isConnected) {
            this.cacheStats.errors++;
            return false;
        }

        try {
            const pipeline = this.client.multi();
            
            for (const [key, value] of keyValuePairs) {
                const fullKey = this.generateKey(options.prefix || 'default', key, options);
                
                // Serialize, compress, and encrypt value
                let serializedValue = JSON.stringify(value);
                if (this.config.enableCompression && 
                    serializedValue.length > this.config.compressionThreshold) {
                    serializedValue = this.compress(serializedValue);
                }
                if (this.config.enableEncryption) {
                    serializedValue = this.encrypt(serializedValue);
                }
                
                if (ttl > 0) {
                    pipeline.setEx(fullKey, ttl, serializedValue);
                } else {
                    pipeline.set(fullKey, serializedValue);
                }
            }
            
            await pipeline.exec();
            this.cacheStats.sets += keyValuePairs.length;
            return true;
        } catch (error) {
            this.cacheStats.errors++;
            loggingService.logError('Cache mset error', { keyValuePairs, error: error.message });
            return false;
        }
    }

    /**
     * Increment counter
     */
    async incr(key, amount = 1, options = {}) {
        if (!this.isConnected) return 0;

        try {
            const fullKey = this.generateKey(options.prefix || 'default', key, options);
            const result = await this.client.incrBy(fullKey, amount);
            return result;
        } catch (error) {
            this.cacheStats.errors++;
            loggingService.logError('Cache incr error', { key, error: error.message });
            return 0;
        }
    }

    /**
     * Decrement counter
     */
    async decr(key, amount = 1, options = {}) {
        if (!this.isConnected) return 0;

        try {
            const fullKey = this.generateKey(options.prefix || 'default', key, options);
            const result = await this.client.decrBy(fullKey, amount);
            return result;
        } catch (error) {
            this.cacheStats.errors++;
            loggingService.logError('Cache decr error', { key, error: error.message });
            return 0;
        }
    }

    /**
     * Get all keys matching pattern
     */
    async keys(pattern, options = {}) {
        if (!this.isConnected) return [];

        try {
            const fullPattern = this.generateKey(options.prefix || 'default', pattern, options);
            return await this.client.keys(fullPattern);
        } catch (error) {
            this.cacheStats.errors++;
            loggingService.logError('Cache keys error', { pattern, error: error.message });
            return [];
        }
    }

    /**
     * Clear all cache
     */
    async clear() {
        if (!this.isConnected) return false;

        try {
            await this.client.flushAll();
            this.cacheStats = {
                hits: 0,
                misses: 0,
                sets: 0,
                deletes: 0,
                expires: 0,
                errors: 0
            };
            return true;
        } catch (error) {
            this.cacheStats.errors++;
            loggingService.logError('Cache clear error', error);
            return false;
        }
    }

    /**
     * Clear cache by prefix
     */
    async clearByPrefix(prefix) {
        if (!this.isConnected) return 0;

        try {
            const pattern = `${this.keyPrefixes[prefix] || prefix}*`;
            const keys = await this.client.keys(pattern);
            
            if (keys.length > 0) {
                const result = await this.client.del(keys);
                this.cacheStats.deletes += result;
                return result;
            }
            
            return 0;
        } catch (error) {
            this.cacheStats.errors++;
            loggingService.logError('Cache clear by prefix error', { prefix, error: error.message });
            return 0;
        }
    }

    /**
     * Compress data
     */
    compress(data) {
        // Simple compression simulation (in production, use zlib)
        return `compressed:${Buffer.from(data).toString('base64')}`;
    }

    /**
     * Decompress data
     */
    decompress(data) {
        // Simple decompression simulation (in production, use zlib)
        if (data.startsWith('compressed:')) {
            return Buffer.from(data.substring(11), 'base64').toString();
        }
        return data;
    }

    /**
     * Encrypt data
     */
    encrypt(data) {
        if (!this.config.encryptionKey) return data;
        
        const cipher = crypto.createCipher('aes-256-cbc', this.config.encryptionKey);
        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return encrypted;
    }

    /**
     * Decrypt data
     */
    decrypt(data) {
        if (!this.config.encryptionKey) return data;
        
        try {
            const decipher = crypto.createDecipher('aes-256-cbc', this.config.encryptionKey);
            let decrypted = decipher.update(data, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        } catch (error) {
            loggingService.logError('Cache decryption error', error);
            return data;
        }
    }

    /**
     * Get cache statistics
     */
    getStats() {
        const total = this.cacheStats.hits + this.cacheStats.misses;
        const hitRate = total > 0 ? (this.cacheStats.hits / total) * 100 : 0;
        
        return {
            ...this.cacheStats,
            hitRate: parseFloat(hitRate.toFixed(2)),
            isConnected: this.isConnected,
            config: {
                defaultTTL: this.config.defaultTTL,
                maxKeys: this.config.maxKeys,
                compression: this.config.enableCompression,
                encryption: this.config.enableEncryption
            }
        };
    }

    /**
     * Health check
     */
    async healthCheck() {
        try {
            if (!this.isConnected) {
                return {
                    status: 'unhealthy',
                    error: 'Not connected to Redis'
                };
            }
            
            const startTime = Date.now();
            await this.client.ping();
            const responseTime = Date.now() - startTime;
            
            return {
                status: 'healthy',
                responseTime: `${responseTime}ms`,
                isConnected: this.isConnected,
                stats: this.getStats()
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                isConnected: false
            };
        }
    }

    /**
     * Close Redis connection
     */
    async close() {
        try {
            if (this.client) {
                await this.client.quit();
                this.isConnected = false;
                loggingService.logInfo('Redis cache connection closed');
            }
        } catch (error) {
            loggingService.logError('Failed to close Redis cache connection', error);
        }
    }
}

export default new RedisCacheService();
