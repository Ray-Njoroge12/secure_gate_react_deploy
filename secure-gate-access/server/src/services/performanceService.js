/**
 * Performance Service
 * Comprehensive performance optimization and monitoring
 */

import loggingService from './loggingService.js';
import optimizedDb from './optimizedDatabaseService.js';
import { createClient } from 'redis';
import compression from 'compression';
import { performance } from 'perf_hooks';

class PerformanceService {
    constructor() {
        this.redisClient = null;
        this.cacheStats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0
        };
        this.queryStats = new Map();
        this.slowQueries = [];
        this.isInitialized = false;
        
        this.config = {
            // Redis configuration
            redis: {
                url: process.env.REDIS_URL || 'redis://localhost:6379',
                retryDelayOnFailover: 100,
                enableReadyCheck: false,
                maxRetriesPerRequest: 3,
                lazyConnect: true
            },
            
            // Cache configuration
            cache: {
                defaultTTL: 300, // 5 minutes
                maxKeys: 10000,
                compressionThreshold: 1024, // 1KB
                enableCompression: true
            },
            
            // Database performance
            database: {
                connectionPoolSize: parseInt(process.env.DB_POOL_SIZE || '20'),
                queryTimeout: parseInt(process.env.DB_QUERY_TIMEOUT || '30000'),
                slowQueryThreshold: parseInt(process.env.SLOW_QUERY_THRESHOLD || '1000'),
                enableQueryLogging: process.env.ENABLE_QUERY_LOGGING === 'true'
            },
            
            // Compression
            compression: {
                level: parseInt(process.env.COMPRESSION_LEVEL || '6'),
                threshold: parseInt(process.env.COMPRESSION_THRESHOLD || '1024'),
                filter: (req, res) => {
                    if (req.headers['x-no-compression']) {
                        return false;
                    }
                    return compression.filter(req, res);
                }
            }
        };
    }

    /**
     * Initialize performance service
     */
    async initialize() {
        try {
            // Initialize Redis connection
            await this.initializeRedis();
            
            // Initialize database optimizations
            await this.initializeDatabaseOptimizations();
            
            // Start performance monitoring
            this.startPerformanceMonitoring();
            
            this.isInitialized = true;
            loggingService.logInfo('Performance Service initialized', {
                redis: !!this.redisClient,
                cacheStats: this.cacheStats,
                databaseOptimizations: true
            });
            
        } catch (error) {
            loggingService.logError('Failed to initialize Performance Service', error);
            throw error;
        }
    }

    /**
     * Initialize Redis connection
     */
    async initializeRedis() {
        try {
            this.redisClient = createClient(this.config.redis);
            
            this.redisClient.on('error', (err) => {
                loggingService.logError('Redis connection error', err);
            });
            
            this.redisClient.on('connect', () => {
                loggingService.logInfo('Redis connected successfully');
            });
            
            this.redisClient.on('ready', () => {
                loggingService.logInfo('Redis ready for operations');
            });
            
            await this.redisClient.connect();
            
        } catch (error) {
            loggingService.logError('Failed to initialize Redis', error);
            this.redisClient = null;
        }
    }

    /**
     * Initialize database optimizations
     */
    async initializeDatabaseOptimizations() {
        try {
            // Create performance indexes
            await this.createPerformanceIndexes();
            
            // Analyze tables for query optimization
            await this.analyzeTables();
            
            // Set up query monitoring
            this.setupQueryMonitoring();
            
            loggingService.logInfo('Database optimizations initialized');
            
        } catch (error) {
            loggingService.logError('Failed to initialize database optimizations', error);
            throw error;
        }
    }

    /**
     * Create performance indexes
     */
    async createPerformanceIndexes() {
        const indexes = [
            // User authentication indexes
            {
                name: 'idx_users_email',
                table: 'users',
                columns: 'email',
                type: 'btree'
            },
            {
                name: 'idx_users_username',
                table: 'users',
                columns: 'username',
                type: 'btree'
            },
            {
                name: 'idx_users_role',
                table: 'users',
                columns: 'role',
                type: 'btree'
            },
            {
                name: 'idx_users_created_at',
                table: 'users',
                columns: 'created_at',
                type: 'btree'
            },
            
            // Visitor management indexes
            {
                name: 'idx_visitors_email',
                table: 'visitors',
                columns: 'email',
                type: 'btree'
            },
            {
                name: 'idx_visitors_phone',
                table: 'visitors',
                columns: 'phone',
                type: 'btree'
            },
            {
                name: 'idx_visitors_status',
                table: 'visitors',
                columns: 'status',
                type: 'btree'
            },
            {
                name: 'idx_visitors_created_at',
                table: 'visitors',
                columns: 'created_at',
                type: 'btree'
            },
            {
                name: 'idx_visitors_visit_date',
                table: 'visitors',
                columns: 'visit_date',
                type: 'btree'
            },
            
            // Invitation indexes
            {
                name: 'idx_invitations_code',
                table: 'invitations',
                columns: 'invitation_code',
                type: 'btree'
            },
            {
                name: 'idx_invitations_status',
                table: 'invitations',
                columns: 'status',
                type: 'btree'
            },
            {
                name: 'idx_invitations_expires_at',
                table: 'invitations',
                columns: 'expires_at',
                type: 'btree'
            },
            {
                name: 'idx_invitations_created_by',
                table: 'invitations',
                columns: 'created_by',
                type: 'btree'
            },
            
            // Check-in/out indexes
            {
                name: 'idx_checkins_visitor_id',
                table: 'checkins',
                columns: 'visitor_id',
                type: 'btree'
            },
            {
                name: 'idx_checkins_checkin_time',
                table: 'checkins',
                columns: 'checkin_time',
                type: 'btree'
            },
            {
                name: 'idx_checkins_checkout_time',
                table: 'checkins',
                columns: 'checkout_time',
                type: 'btree'
            },
            {
                name: 'idx_checkins_status',
                table: 'checkins',
                columns: 'status',
                type: 'btree'
            },
            
            // Audit log indexes
            {
                name: 'idx_audit_logs_user_id',
                table: 'audit_logs',
                columns: 'user_id',
                type: 'btree'
            },
            {
                name: 'idx_audit_logs_action',
                table: 'audit_logs',
                columns: 'action',
                type: 'btree'
            },
            {
                name: 'idx_audit_logs_created_at',
                table: 'audit_logs',
                columns: 'created_at',
                type: 'btree'
            },
            {
                name: 'idx_audit_logs_ip_address',
                table: 'audit_logs',
                columns: 'ip_address',
                type: 'btree'
            },
            
            // Composite indexes for common queries
            {
                name: 'idx_visitors_status_visit_date',
                table: 'visitors',
                columns: 'status, visit_date',
                type: 'btree'
            },
            {
                name: 'idx_checkins_visitor_status',
                table: 'checkins',
                columns: 'visitor_id, status',
                type: 'btree'
            },
            {
                name: 'idx_invitations_status_expires',
                table: 'invitations',
                columns: 'status, expires_at',
                type: 'btree'
            }
        ];

        for (const index of indexes) {
            try {
                const query = `CREATE INDEX IF NOT EXISTS ${index.name} ON ${index.table} USING ${index.type} (${index.columns})`;
                await optimizedDb.query(query);
                loggingService.logInfo(`Created index: ${index.name}`);
            } catch (error) {
                if (!error.message.includes('already exists')) {
                    loggingService.logError(`Failed to create index ${index.name}`, error);
                }
            }
        }
    }

    /**
     * Analyze tables for query optimization
     */
    async analyzeTables() {
        const tables = [
            'users', 'visitors', 'invitations', 'checkins', 
            'audit_logs', 'backup_log', 'dr_recovery_log',
            'health_check_log', 'backup_retention_policy',
            'dr_configuration', 'cross_region_replication',
            'backup_verification_log', 'dr_metrics'
        ];

        for (const table of tables) {
            try {
                await optimizedDb.query(`ANALYZE ${table}`);
                loggingService.logInfo(`Analyzed table: ${table}`);
            } catch (error) {
                loggingService.logError(`Failed to analyze table ${table}`, error);
            }
        }
    }

    /**
     * Setup query monitoring
     */
    setupQueryMonitoring() {
        if (!this.config.database.enableQueryLogging) return;

        // Override the query method to add monitoring
        const originalQuery = optimizedDb.query.bind(optimizedDb);
        
        optimizedDb.query = async (text, params) => {
            const startTime = performance.now();
            
            try {
                const result = await originalQuery(text, params);
                const duration = performance.now() - startTime;
                
                // Log slow queries
                if (duration > this.config.database.slowQueryThreshold) {
                    this.slowQueries.push({
                        query: text,
                        params,
                        duration,
                        timestamp: new Date().toISOString()
                    });
                    
                    loggingService.logWarn('Slow query detected', {
                        query: text.substring(0, 100) + '...',
                        duration: `${duration.toFixed(2)}ms`,
                        threshold: `${this.config.database.slowQueryThreshold}ms`
                    });
                }
                
                // Update query stats
                const queryKey = text.substring(0, 50);
                const stats = this.queryStats.get(queryKey) || { count: 0, totalTime: 0, avgTime: 0 };
                stats.count++;
                stats.totalTime += duration;
                stats.avgTime = stats.totalTime / stats.count;
                this.queryStats.set(queryKey, stats);
                
                return result;
                
            } catch (error) {
                const duration = performance.now() - startTime;
                loggingService.logError('Query failed', {
                    query: text.substring(0, 100) + '...',
                    duration: `${duration.toFixed(2)}ms`,
                    error: error.message
                });
                throw error;
            }
        };
    }

    /**
     * Start performance monitoring
     */
    startPerformanceMonitoring() {
        // Monitor cache performance
        setInterval(() => {
            this.logCacheStats();
        }, 60000); // Every minute

        // Monitor slow queries
        setInterval(() => {
            this.logSlowQueries();
        }, 300000); // Every 5 minutes

        // Monitor database connections
        setInterval(() => {
            this.monitorDatabaseConnections();
        }, 60000); // Every minute
    }

    /**
     * Cache operations
     */
    async get(key, defaultValue = null) {
        if (!this.redisClient) return defaultValue;

        try {
            const startTime = performance.now();
            const value = await this.redisClient.get(key);
            const duration = performance.now() - startTime;

            if (value !== null) {
                this.cacheStats.hits++;
                return JSON.parse(value);
            } else {
                this.cacheStats.misses++;
                return defaultValue;
            }
        } catch (error) {
            loggingService.logError('Cache get error', { key, error: error.message });
            this.cacheStats.misses++;
            return defaultValue;
        }
    }

    async set(key, value, ttl = this.config.cache.defaultTTL) {
        if (!this.redisClient) return false;

        try {
            const startTime = performance.now();
            const serializedValue = JSON.stringify(value);
            
            // Compress if above threshold
            let finalValue = serializedValue;
            if (this.config.cache.enableCompression && 
                serializedValue.length > this.config.cache.compressionThreshold) {
                // Compression would be implemented here
                // For now, just use the serialized value
            }
            
            await this.redisClient.setEx(key, ttl, finalValue);
            const duration = performance.now() - startTime;
            
            this.cacheStats.sets++;
            return true;
        } catch (error) {
            loggingService.logError('Cache set error', { key, error: error.message });
            return false;
        }
    }

    async del(key) {
        if (!this.redisClient) return false;

        try {
            await this.redisClient.del(key);
            this.cacheStats.deletes++;
            return true;
        } catch (error) {
            loggingService.logError('Cache delete error', { key, error: error.message });
            return false;
        }
    }

    async clear() {
        if (!this.redisClient) return false;

        try {
            await this.redisClient.flushAll();
            this.cacheStats = { hits: 0, misses: 0, sets: 0, deletes: 0 };
            return true;
        } catch (error) {
            loggingService.logError('Cache clear error', error);
            return false;
        }
    }

    /**
     * Log cache statistics
     */
    logCacheStats() {
        const hitRate = this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses) * 100;
        
        loggingService.logInfo('Cache Statistics', {
            hits: this.cacheStats.hits,
            misses: this.cacheStats.misses,
            sets: this.cacheStats.sets,
            deletes: this.cacheStats.deletes,
            hitRate: `${hitRate.toFixed(2)}%`
        });
    }

    /**
     * Log slow queries
     */
    logSlowQueries() {
        if (this.slowQueries.length > 0) {
            loggingService.logWarn('Slow Queries Summary', {
                count: this.slowQueries.length,
                queries: this.slowQueries.slice(-10) // Last 10 slow queries
            });
            
            // Keep only last 100 slow queries
            this.slowQueries = this.slowQueries.slice(-100);
        }
    }

    /**
     * Monitor database connections
     */
    async monitorDatabaseConnections() {
        try {
            const query = `
                SELECT 
                    count(*) as total_connections,
                    count(*) FILTER (WHERE state = 'active') as active_connections,
                    count(*) FILTER (WHERE state = 'idle') as idle_connections
                FROM pg_stat_activity 
                WHERE datname = current_database()
            `;
            
            const result = await optimizedDb.query(query);
            const stats = result.rows[0];
            
            loggingService.logInfo('Database Connection Stats', {
                total: stats.total_connections,
                active: stats.active_connections,
                idle: stats.idle_connections
            });
            
        } catch (error) {
            loggingService.logError('Failed to monitor database connections', error);
        }
    }

    /**
     * Get performance metrics
     */
    getMetrics() {
        return {
            cache: {
                ...this.cacheStats,
                hitRate: this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses) * 100
            },
            database: {
                slowQueries: this.slowQueries.length,
                queryStats: Array.from(this.queryStats.entries()).map(([query, stats]) => ({
                    query: query.substring(0, 50) + '...',
                    count: stats.count,
                    avgTime: stats.avgTime
                }))
            },
            redis: {
                connected: !!this.redisClient,
                status: this.redisClient?.isReady ? 'ready' : 'disconnected'
            }
        };
    }

    /**
     * Get compression middleware
     */
    getCompressionMiddleware() {
        return compression(this.config.compression);
    }

    /**
     * Cleanup resources
     */
    async cleanup() {
        try {
            if (this.redisClient) {
                await this.redisClient.quit();
            }
            this.isInitialized = false;
            loggingService.logInfo('Performance Service cleaned up');
        } catch (error) {
            loggingService.logError('Failed to cleanup Performance Service', error);
        }
    }
}

export default new PerformanceService();
