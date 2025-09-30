// Enhanced database connection with stability features
import pkg from "pg";
import { EventEmitter } from 'events';
import { setTimeout } from 'timers/promises';

const { Pool, Client } = pkg;

/**
 * Database connection health monitoring and management
 */
class DatabaseManager extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      // Connection config
      user: process.env.PGUSER || "postgres",
      host: process.env.PGHOST || "localhost", 
      database: process.env.PGDATABASE || "secure_gate",
      password: process.env.PGPASSWORD || "postgres",
      port: Number(process.env.PGPORT) || 5432,
      
      // Pool configuration with enhanced stability
      max: Number(process.env.PGPOOL_MAX) || 20, // Max connections
      min: Number(process.env.PGPOOL_MIN) || 2,  // Min connections to keep open
      idleTimeoutMillis: Number(process.env.PGPOOL_IDLE_TIMEOUT) || 30000,
      connectionTimeoutMillis: Number(process.env.PGPOOL_CONN_TIMEOUT) || 5000,
      
      // Enhanced stability features
      acquireTimeoutMillis: Number(process.env.PGPOOL_ACQUIRE_TIMEOUT) || 10000,
      keepAlive: true,
      keepAliveInitialDelayMillis: Number(process.env.PGPOOL_KEEPALIVE_DELAY) || 10000,
      
      // Custom config overrides
      ...config
    };
    
    this.pool = null;
    this.isConnected = false;
    this.connectionAttempts = 0;
    this.maxConnectionAttempts = Number(process.env.PGPOOL_MAX_RETRY) || 5;
    this.retryDelay = Number(process.env.PGPOOL_RETRY_DELAY) || 2000; // Start with 2 seconds
    this.maxRetryDelay = Number(process.env.PGPOOL_MAX_RETRY_DELAY) || 30000; // Max 30 seconds
    
    // Health monitoring
    this.healthCheckInterval = Number(process.env.PGPOOL_HEALTH_INTERVAL) || 30000; // 30 seconds
    this.healthTimer = null;
    this.lastHealthCheck = null;
    this.consecutiveFailures = 0;
    
    // Metrics
    this.metrics = {
      totalConnections: 0,
      failedConnections: 0,
      queries: 0,
      errors: 0,
      avgResponseTime: 0,
      responseTimes: []
    };
    
    this.initialize();
  }
  
  async initialize() {
    try {
      await this.connect();
      this.startHealthMonitoring();
      console.log('✅ Database manager initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize database manager:', error.message);
      this.emit('error', error);
    }
  }
  
  async connect() {
    if (this.pool) {
      await this.disconnect();
    }
    
    this.pool = new Pool(this.config);
    
    // Enhanced event listeners
    this.pool.on('connect', (client) => {
      this.metrics.totalConnections++;
      this.isConnected = true;
      this.connectionAttempts = 0;
      this.consecutiveFailures = 0;
      
      console.log('✅ Database connection established');
      this.emit('connect', { client, totalConnections: this.metrics.totalConnections });
    });
    
    this.pool.on('error', (err, client) => {
      this.metrics.failedConnections++;
      this.metrics.errors++;
      this.consecutiveFailures++;
      
      console.error('❌ Database connection error:', err.message);
      this.emit('connectionError', { error: err, client, metrics: this.metrics });
      
      // Auto-reconnect on connection errors
      if (err.code === 'ECONNRESET' || err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
        this.handleConnectionLoss();
      }
    });
    
    this.pool.on('acquire', (client) => {
      this.emit('acquire', { client });
    });
    
    this.pool.on('remove', (client) => {
      this.emit('remove', { client });
    });
    
    // Test the connection
    await this.testConnection();
  }
  
  async testConnection() {
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW() as connection_time, version() as db_version');
      client.release();
      
      this.isConnected = true;
      this.lastHealthCheck = new Date();
      
      console.log('✅ Database connection test successful:', {
        time: result.rows[0].connection_time,
        version: result.rows[0].db_version.split(' ')[0] // Just PostgreSQL version
      });
      
      this.emit('connectionTest', { success: true, result: result.rows[0] });
      return true;
    } catch (error) {
      this.isConnected = false;
      console.error('❌ Database connection test failed:', error.message);
      this.emit('connectionTest', { success: false, error });
      throw error;
    }
  }
  
  async handleConnectionLoss() {
    if (this.connectionAttempts >= this.maxConnectionAttempts) {
      const error = new Error(`Max connection attempts (${this.maxConnectionAttempts}) exceeded`);
      this.emit('maxRetriesExceeded', { error, attempts: this.connectionAttempts });
      return;
    }
    
    this.connectionAttempts++;
    const delay = Math.min(
      this.retryDelay * Math.pow(2, this.connectionAttempts - 1), // Exponential backoff
      this.maxRetryDelay
    );
    
    console.log(`🔄 Attempting to reconnect (${this.connectionAttempts}/${this.maxConnectionAttempts}) in ${delay}ms...`);
    this.emit('reconnectAttempt', { attempt: this.connectionAttempts, delay });
    
    await setTimeout(delay);
    
    try {
      await this.connect();
      console.log('✅ Database reconnection successful');
      this.emit('reconnectSuccess', { attempt: this.connectionAttempts });
    } catch (error) {
      console.error(`❌ Reconnection attempt ${this.connectionAttempts} failed:`, error.message);
      this.emit('reconnectFailed', { attempt: this.connectionAttempts, error });
      await this.handleConnectionLoss(); // Recursive retry
    }
  }
  
  startHealthMonitoring() {
    if (this.healthTimer) {
      clearInterval(this.healthTimer);
    }
    
    this.healthTimer = setInterval(async () => {
      try {
        const startTime = Date.now();
        await this.testConnection();
        const responseTime = Date.now() - startTime;
        
        // Track response times for metrics
        this.metrics.responseTimes.push(responseTime);
        if (this.metrics.responseTimes.length > 100) {
          this.metrics.responseTimes.shift(); // Keep only last 100 measurements
        }
        
        this.metrics.avgResponseTime = this.metrics.responseTimes.reduce((a, b) => a + b, 0) / this.metrics.responseTimes.length;
        
        this.emit('healthCheck', { 
          success: true, 
          responseTime, 
          avgResponseTime: this.metrics.avgResponseTime 
        });
        
      } catch (error) {
        this.emit('healthCheck', { success: false, error });
        console.warn('⚠️ Health check failed:', error.message);
      }
    }, this.healthCheckInterval);
  }
  
  /**
   * Enhanced query method with retry logic and metrics
   */
  async query(text, params = [], options = {}) {
    const { 
      retries = 3, 
      retryDelay = 1000,
      timeout = 30000 
    } = options;
    
    let lastError;
    
    for (let attempt = 1; attempt <= retries + 1; attempt++) {
      try {
        const startTime = Date.now();
        
        // Create timeout promise
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error(`Query timeout after ${timeout}ms`)), timeout);
        });
        
        // Execute query with timeout
        const queryPromise = this.pool.query(text, params);
        const result = await Promise.race([queryPromise, timeoutPromise]);
        
        const responseTime = Date.now() - startTime;
        
        // Update metrics
        this.metrics.queries++;
        this.metrics.responseTimes.push(responseTime);
        if (this.metrics.responseTimes.length > 100) {
          this.metrics.responseTimes.shift();
        }
        this.metrics.avgResponseTime = this.metrics.responseTimes.reduce((a, b) => a + b, 0) / this.metrics.responseTimes.length;
        
        this.emit('query', { 
          success: true, 
          responseTime, 
          rowCount: result.rowCount,
          attempt 
        });
        
        return result;
        
      } catch (error) {
        lastError = error;
        this.metrics.errors++;
        
        console.warn(`⚠️ Query attempt ${attempt} failed:`, error.message);
        this.emit('query', { 
          success: false, 
          error: error.message, 
          attempt,
          willRetry: attempt <= retries
        });
        
        // Don't retry on certain types of errors
        if (error.code && ['23505', '23503', '23514'].includes(error.code)) {
          // Constraint violations - don't retry
          throw error;
        }
        
        if (attempt <= retries) {
          await setTimeout(retryDelay * attempt); // Increasing delay
        }
      }
    }
    
    throw lastError;
  }
  
  /**
   * Transaction wrapper with retry logic
   */
  async transaction(callback, options = {}) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Get connection pool status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      totalCount: this.pool?.totalCount || 0,
      idleCount: this.pool?.idleCount || 0,
      waitingCount: this.pool?.waitingCount || 0,
      metrics: { ...this.metrics },
      lastHealthCheck: this.lastHealthCheck,
      consecutiveFailures: this.consecutiveFailures,
      connectionAttempts: this.connectionAttempts
    };
  }
  
  /**
   * Graceful shutdown
   */
  async disconnect() {
    if (this.healthTimer) {
      clearInterval(this.healthTimer);
      this.healthTimer = null;
    }
    
    if (this.pool) {
      console.log('🔄 Closing database connections...');
      await this.pool.end();
      this.pool = null;
    }
    
    this.isConnected = false;
    console.log('✅ Database connections closed gracefully');
    this.emit('disconnect');
  }
  
  /**
   * Force close all connections (emergency)
   */
  async forceDisconnect() {
    if (this.healthTimer) {
      clearInterval(this.healthTimer);
      this.healthTimer = null;
    }
    
    if (this.pool) {
      console.log('⚠️ Force closing database connections...');
      // Force close without waiting for idle connections
      this.pool.totalCount = 0;
      await this.pool.end();
      this.pool = null;
    }
    
    this.isConnected = false;
    console.log('✅ Database connections force closed');
    this.emit('forceDisconnect');
  }
}

// Create singleton instance
const dbManager = new DatabaseManager();

// Export both the manager and a pool-compatible interface
export default dbManager.pool;
export { dbManager };

// Graceful shutdown handlers
process.on('SIGINT', async () => {
  console.log('🔄 Received SIGINT, closing database connections...');
  await dbManager.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🔄 Received SIGTERM, closing database connections...');
  await dbManager.disconnect();
  process.exit(0);
});

process.on('uncaughtException', async (error) => {
  console.error('💥 Uncaught exception:', error);
  await dbManager.forceDisconnect();
  process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
  console.error('💥 Unhandled rejection at:', promise, 'reason:', reason);
  // Don't exit on unhandled rejection, but log it
});

// Export connection status for health checks
export const getDBStatus = () => dbManager.getStatus();
export const testDBConnection = () => dbManager.testConnection();

console.log('🚀 Enhanced database connection manager loaded');