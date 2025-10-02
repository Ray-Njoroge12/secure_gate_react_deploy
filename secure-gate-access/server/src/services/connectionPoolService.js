/**
 * Connection Pool Service
 * Advanced database connection pooling and management
 */

import { Pool } from 'pg';
import loggingService from './loggingService.js';

class ConnectionPoolService {
    constructor() {
        this.pools = new Map();
        this.metrics = {
            totalConnections: 0,
            activeConnections: 0,
            idleConnections: 0,
            waitingClients: 0,
            totalQueries: 0,
            successfulQueries: 0,
            failedQueries: 0,
            averageQueryTime: 0,
            connectionErrors: 0
        };
        
        this.config = {
            // Primary database pool
            primary: {
                host: process.env.PGHOST || 'localhost',
                port: parseInt(process.env.PGPORT || '5432'),
                database: process.env.PGDATABASE || 'secure_gate',
                user: process.env.PGUSER || 'postgres',
                password: process.env.PGPASSWORD || 'postgres',
                ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : false,
                
                // Pool configuration
                max: parseInt(process.env.DB_POOL_MAX || '20'),
                min: parseInt(process.env.DB_POOL_MIN || '5'),
                idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
                connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000'),
                acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '60000'),
                
                // Performance settings
                statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || '30000'),
                query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT || '30000'),
                application_name: 'secure-gate-api',
                
                // Connection lifecycle
                keepAlive: true,
                keepAliveInitialDelayMillis: 0,
                
                // Error handling
                allowExitOnIdle: false
            },
            
            // Read replica pool (if configured)
            readReplica: process.env.DB_READ_REPLICA_URL ? {
                connectionString: process.env.DB_READ_REPLICA_URL,
                max: parseInt(process.env.DB_READ_POOL_MAX || '10'),
                min: parseInt(process.env.DB_READ_POOL_MIN || '2'),
                idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
                connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000'),
                acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '60000'),
                statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || '30000'),
                query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT || '30000'),
                application_name: 'secure-gate-api-read',
                keepAlive: true,
                keepAliveInitialDelayMillis: 0,
                allowExitOnIdle: false
            } : null
        };
    }

    /**
     * Initialize connection pools
     */
    async initialize() {
        try {
            // Initialize primary pool
            await this.initializePool('primary', this.config.primary);
            
            // Initialize read replica pool if configured
            if (this.config.readReplica) {
                await this.initializePool('readReplica', this.config.readReplica);
            }
            
            // Start monitoring
            this.startMonitoring();
            
            loggingService.logInfo('Connection Pool Service initialized', {
                primaryPool: true,
                readReplicaPool: !!this.config.readReplica,
                maxConnections: this.config.primary.max
            });
            
        } catch (error) {
            loggingService.logError('Failed to initialize Connection Pool Service', error);
            throw error;
        }
    }

    /**
     * Initialize a connection pool
     */
    async initializePool(name, config) {
        try {
            const pool = new Pool(config);
            
            // Set up event handlers
            pool.on('connect', (client) => {
                this.metrics.totalConnections++;
                this.metrics.activeConnections++;
                loggingService.logInfo(`New database connection established for ${name} pool`);
            });
            
            pool.on('acquire', (client) => {
                this.metrics.activeConnections++;
                this.metrics.idleConnections = Math.max(0, this.metrics.idleConnections - 1);
            });
            
            pool.on('remove', (client) => {
                this.metrics.totalConnections = Math.max(0, this.metrics.totalConnections - 1);
                this.metrics.activeConnections = Math.max(0, this.metrics.activeConnections - 1);
                loggingService.logInfo(`Database connection removed from ${name} pool`);
            });
            
            pool.on('error', (err, client) => {
                this.metrics.connectionErrors++;
                loggingService.logError(`Database pool error in ${name} pool`, err);
            });
            
            // Test the connection
            const client = await pool.connect();
            await client.query('SELECT 1');
            client.release();
            
            this.pools.set(name, pool);
            loggingService.logInfo(`Connection pool ${name} initialized successfully`);
            
        } catch (error) {
            loggingService.logError(`Failed to initialize ${name} pool`, error);
            throw error;
        }
    }

    /**
     * Get a connection from the appropriate pool
     */
    async getConnection(useReadReplica = false) {
        const poolName = useReadReplica && this.pools.has('readReplica') ? 'readReplica' : 'primary';
        const pool = this.pools.get(poolName);
        
        if (!pool) {
            throw new Error(`Pool ${poolName} not available`);
        }
        
        try {
            const client = await pool.connect();
            return {
                client,
                pool: poolName,
                release: () => {
                    this.metrics.activeConnections = Math.max(0, this.metrics.activeConnections - 1);
                    this.metrics.idleConnections++;
                    client.release();
                }
            };
        } catch (error) {
            this.metrics.connectionErrors++;
            loggingService.logError(`Failed to get connection from ${poolName} pool`, error);
            throw error;
        }
    }

    /**
     * Execute a query with automatic connection management
     */
    async query(text, params = [], options = {}) {
        const { useReadReplica = false, timeout = null } = options;
        const startTime = Date.now();
        
        let connection;
        try {
            connection = await this.getConnection(useReadReplica);
            
            // Set query timeout if specified
            if (timeout) {
                await connection.client.query(`SET statement_timeout = ${timeout}`);
            }
            
            const result = await connection.client.query(text, params);
            const duration = Date.now() - startTime;
            
            this.metrics.totalQueries++;
            this.metrics.successfulQueries++;
            this.updateAverageQueryTime(duration);
            
            return result;
            
        } catch (error) {
            const duration = Date.now() - startTime;
            this.metrics.totalQueries++;
            this.metrics.failedQueries++;
            this.updateAverageQueryTime(duration);
            
            loggingService.logError('Database query failed', {
                query: text.substring(0, 100) + '...',
                duration: `${duration}ms`,
                error: error.message,
                pool: connection?.pool
            });
            
            throw error;
        } finally {
            if (connection) {
                connection.release();
            }
        }
    }

    /**
     * Execute a transaction
     */
    async transaction(callback) {
        let connection;
        try {
            connection = await this.getConnection();
            await connection.client.query('BEGIN');
            
            const result = await callback(connection.client);
            
            await connection.client.query('COMMIT');
            return result;
            
        } catch (error) {
            if (connection) {
                try {
                    await connection.client.query('ROLLBACK');
                } catch (rollbackError) {
                    loggingService.logError('Failed to rollback transaction', rollbackError);
                }
            }
            throw error;
        } finally {
            if (connection) {
                connection.release();
            }
        }
    }

    /**
     * Execute multiple queries in a batch
     */
    async batch(queries) {
        const results = [];
        let connection;
        
        try {
            connection = await this.getConnection();
            
            for (const { text, params } of queries) {
                const result = await connection.client.query(text, params);
                results.push(result);
            }
            
            return results;
            
        } catch (error) {
            loggingService.logError('Batch query failed', error);
            throw error;
        } finally {
            if (connection) {
                connection.release();
            }
        }
    }

    /**
     * Get read-only connection for reporting queries
     */
    async getReadOnlyConnection() {
        return this.getConnection(true);
    }

    /**
     * Update average query time
     */
    updateAverageQueryTime(duration) {
        const totalTime = this.metrics.averageQueryTime * (this.metrics.totalQueries - 1) + duration;
        this.metrics.averageQueryTime = totalTime / this.metrics.totalQueries;
    }

    /**
     * Start monitoring connection pools
     */
    startMonitoring() {
        setInterval(() => {
            this.logPoolMetrics();
        }, 60000); // Every minute
        
        setInterval(() => {
            this.cleanupIdleConnections();
        }, 300000); // Every 5 minutes
    }

    /**
     * Log pool metrics
     */
    logPoolMetrics() {
        for (const [name, pool] of this.pools) {
            const poolMetrics = {
                totalCount: pool.totalCount,
                idleCount: pool.idleCount,
                waitingCount: pool.waitingCount
            };
            
            loggingService.logInfo(`Pool ${name} metrics`, poolMetrics);
        }
        
        loggingService.logInfo('Overall connection metrics', this.metrics);
    }

    /**
     * Cleanup idle connections
     */
    async cleanupIdleConnections() {
        for (const [name, pool] of this.pools) {
            try {
                // Force cleanup of idle connections
                await pool.end();
                await this.initializePool(name, this.config[name] || this.config.primary);
                loggingService.logInfo(`Cleaned up idle connections in ${name} pool`);
            } catch (error) {
                loggingService.logError(`Failed to cleanup ${name} pool`, error);
            }
        }
    }

    /**
     * Get pool statistics
     */
    getPoolStats() {
        const stats = {
            metrics: { ...this.metrics },
            pools: {}
        };
        
        for (const [name, pool] of this.pools) {
            stats.pools[name] = {
                totalCount: pool.totalCount,
                idleCount: pool.idleCount,
                waitingCount: pool.waitingCount
            };
        }
        
        return stats;
    }

    /**
     * Health check for all pools
     */
    async healthCheck() {
        const health = {
            status: 'healthy',
            pools: {},
            timestamp: new Date().toISOString()
        };
        
        for (const [name, pool] of this.pools) {
            try {
                const client = await pool.connect();
                await client.query('SELECT 1');
                client.release();
                
                health.pools[name] = {
                    status: 'healthy',
                    totalCount: pool.totalCount,
                    idleCount: pool.idleCount,
                    waitingCount: pool.waitingCount
                };
            } catch (error) {
                health.pools[name] = {
                    status: 'unhealthy',
                    error: error.message
                };
                health.status = 'unhealthy';
            }
        }
        
        return health;
    }

    /**
     * Close all connection pools
     */
    async close() {
        try {
            for (const [name, pool] of this.pools) {
                await pool.end();
                loggingService.logInfo(`Closed ${name} pool`);
            }
            
            this.pools.clear();
            loggingService.logInfo('All connection pools closed');
            
        } catch (error) {
            loggingService.logError('Failed to close connection pools', error);
            throw error;
        }
    }
}

export default new ConnectionPoolService();
