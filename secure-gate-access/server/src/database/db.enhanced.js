// Enhanced database connection with stability features
import pkg from 'pg';
import { EventEmitter } from 'events';
import { setTimeout as setTimeoutPromise } from 'timers/promises';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Ensure environment variables are loaded first
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
dotenv.config({ path: join(__dirname, '../..', envFile) });

const { Pool, Client } = pkg;

/**
 * Database connection health monitoring and management
 */
class DatabaseManager extends EventEmitter {
  constructor(config = {}) {
    super();

    // Support DATABASE_URL (Render provides this) or individual PG* variables
    const connectionString = process.env.DATABASE_URL;
    
    // Log which connection method is being used (without exposing credentials)
    if (connectionString) {
      // Parse DATABASE_URL to show connection info without password
      try {
        const url = new URL(connectionString);
        console.log(`📊 Database: Using DATABASE_URL (host: ${url.hostname}, db: ${url.pathname.slice(1)})`);
        console.log(`📊 Database: SSL required for cloud deployment`);
      } catch {
        console.log('📊 Database: Using DATABASE_URL connection string');
      }
    } else {
      console.log(`📊 Database: Using individual PG* variables (host: ${process.env.PGHOST || 'localhost'})`);
      console.warn('⚠️ DATABASE_URL not set - this may cause issues on Render');
    }
    
    this.config = {
      // Use DATABASE_URL if provided, otherwise use individual variables
      ...(connectionString ? { connectionString } : {
        user: process.env.PGUSER || 'postgres',
        host: process.env.PGHOST || 'localhost',
        database: process.env.PGDATABASE || 'secure_gate',
        password: process.env.PGPASSWORD || 'postgres',
        port: Number(process.env.PGPORT) || 5432,
      }),

      // SSL configuration for cloud providers
      // Render, Railway, Heroku all require SSL
      ssl: process.env.DATABASE_URL || process.env.NODE_ENV === 'production' 
        ? { rejectUnauthorized: false } 
        : false,

      // Pool configuration optimized for cloud environments (especially Render)
      // Phase 3.2: Increased pool size for better performance
      max: Number(process.env.PGPOOL_MAX) || 20, // Increased from 5 to 20 for production load
      min: Number(process.env.PGPOOL_MIN) || 5,  // Maintain 5 connections minimum
      idleTimeoutMillis: Number(process.env.PGPOOL_IDLE_TIMEOUT) || 10000, // 10s idle timeout
      connectionTimeoutMillis: Number(process.env.PGPOOL_CONN_TIMEOUT) || 60000, // 60s for cloud cold starts
      
      // Statement timeout to prevent hanging queries
      statement_timeout: Number(process.env.PGPOOL_STATEMENT_TIMEOUT) || 30000,
      query_timeout: Number(process.env.PGPOOL_QUERY_TIMEOUT) || 30000,

      // Enhanced stability features for cloud
      keepAlive: true,
      keepAliveInitialDelayMillis: Number(process.env.PGPOOL_KEEPALIVE_DELAY) || 10000,
      
      // Allow pooling to handle connection drops gracefully
      allowExitOnIdle: true,

      // Custom config overrides
      ...config
    };

    this.pool = null;
    this.isConnected = false;
    this.connectionAttempts = 0;
    this.maxConnectionAttempts = Number(process.env.PGPOOL_MAX_RETRY) || 10; // More retries for cloud
    this.retryDelay = Number(process.env.PGPOOL_RETRY_DELAY) || 5000; // Start with 5 seconds
    this.maxRetryDelay = Number(process.env.PGPOOL_MAX_RETRY_DELAY) || 60000; // Max 60 seconds
    this.initializationPromise = null;
    this.isInitialized = false;

    // Health monitoring
    this.healthCheckInterval = Number(process.env.PGPOOL_HEALTH_INTERVAL) || 120000; // 2 minutes for cloud
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

    // Don't auto-initialize in constructor - let it be called explicitly
    // This prevents unhandled promise rejections during module load
    // this.initialize(); // REMOVED - call initializeAsync() instead
  }

  /**
   * Async initialization that can be awaited
   * This should be called from server.js after environment is loaded
   */
  async initializeAsync() {
    if (this.isInitialized) {
      return true;
    }
    
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._doInitialize();
    return this.initializationPromise;
  }

  async _doInitialize() {
    const maxAttempts = this.maxConnectionAttempts;
    let lastError = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`🔄 Database connection attempt ${attempt}/${maxAttempts}...`);
        await this.connect();
        
        // Only try to ensure indexes if connection succeeded
        try {
          await this.ensureIndexes();
        } catch (indexError) {
          console.warn('⚠️ Index creation failed (non-critical):', indexError.message);
        }
        
        this.startHealthMonitoring();
        this.isInitialized = true;
        console.log('✅ Database manager initialized successfully');
        return true;
      } catch (error) {
        lastError = error;
        console.error(`❌ Database connection attempt ${attempt} failed:`, error.message);
        
        // Provide specific diagnostics for common issues
        if (error.message.includes('timeout')) {
          console.error('💡 Timeout error - possible causes:');
          console.error('   - Database server not reachable (check host/port)');
          console.error('   - Firewall blocking connection');
          console.error('   - Database cold start (Render free tier)');
          console.error('   - SSL handshake issues');
        } else if (error.message.includes('ECONNREFUSED')) {
          console.error('💡 Connection refused - database server not accepting connections');
        } else if (error.message.includes('ENOTFOUND')) {
          console.error('💡 Host not found - check DATABASE_URL hostname');
        } else if (error.message.includes('authentication')) {
          console.error('💡 Authentication failed - check DATABASE_URL credentials');
        }
        
        if (attempt < maxAttempts) {
          const delay = Math.min(this.retryDelay * Math.pow(1.5, attempt - 1), this.maxRetryDelay);
          console.log(`⏳ Waiting ${Math.round(delay/1000)}s before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All attempts failed
    console.error(`❌ Failed to initialize database after ${maxAttempts} attempts`);
    console.error('🔧 Troubleshooting steps:');
    console.error('   1. Verify DATABASE_URL is set correctly in Render environment');
    console.error('   2. Check if PostgreSQL database is running and accessible');
    console.error('   3. Ensure database is in the same region as your Render service');
    console.error('   4. Try increasing PGPOOL_CONN_TIMEOUT (current: 60000ms)');
    
    this.emit('initializationFailed', { error: lastError, attempts: maxAttempts });
    
    // In production, we might want to continue without DB and let health checks fail
    // This allows the server to start and potentially recover
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DB_FAILURE === 'true') {
      console.warn('⚠️ Running without database connection (ALLOW_DB_FAILURE=true)');
      return false;
    }
    
    throw lastError;
  }

  async ensureIndexes() {
    try {
      const indexes = [
        'CREATE INDEX IF NOT EXISTS idx_visitors_invite_code ON visitors(invite_code)',
        'CREATE INDEX IF NOT EXISTS idx_visitors_status_date ON visitors(status, date_of_visit)',
        'CREATE INDEX IF NOT EXISTS idx_passes_pass_id ON passes(pass_id)',
        'CREATE INDEX IF NOT EXISTS idx_passes_visitor_id ON passes(visitor_id)',
        'CREATE INDEX IF NOT EXISTS idx_access_logs_user_created ON access_logs(user_id, log_time)',
        'CREATE INDEX IF NOT EXISTS idx_visitors_created_by ON visitors(created_by)',
        'CREATE INDEX IF NOT EXISTS idx_visitors_qr_code ON visitors(qr_code)'
      ];

      for (const indexQuery of indexes) {
        try {
          await this.query(indexQuery);
        } catch (error) {
          // Ignore errors for indexes that might already exist or columns that don't exist yet
          console.warn(`Index creation warning: ${error.message}`);
        }
      }
      console.log('✓ Database indexes ensured');
    } catch (error) {
      console.warn('Index creation failed:', error.message);
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

      // Database connection established
      this.emit('connect', { client, totalConnections: this.metrics.totalConnections });
    });

    this.pool.on('error', (err, client) => {
      this.metrics.failedConnections++;
      this.metrics.errors++;
      this.consecutiveFailures++;

      console.error('❌ Database pool error:', err.message);
      this.emit('connectionError', { error: err, client, metrics: this.metrics });

      // Auto-reconnect on connection errors (wrapped in catch to prevent unhandled rejections)
      if (err.code === 'ECONNRESET' || err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
        this.handleConnectionLoss().catch(reconnectErr => {
          console.error('❌ Auto-reconnection failed:', reconnectErr.message);
        });
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
    const timeout = this.config.connectionTimeoutMillis || 60000;
    
    try {
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Connection test timed out after ${timeout}ms`));
        }, timeout);
      });
      
      // Race the connection against the timeout
      const connectionPromise = (async () => {
        const client = await this.pool.connect();
        const result = await client.query('SELECT NOW() as connection_time, version() as db_version');
        client.release();
        return result;
      })();
      
      const result = await Promise.race([connectionPromise, timeoutPromise]);

      this.isConnected = true;
      this.lastHealthCheck = new Date();

      console.log('✅ Database connection test passed');
      
      // Database connection test successful
      this.emit('connectionTest', { 
        success: true, 
        result: {
          time: result.rows[0].connection_time,
          version: result.rows[0].db_version.split(' ')[0] // Just PostgreSQL version
        }
      });
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

    // Attempting to reconnect
    this.emit('reconnectAttempt', { attempt: this.connectionAttempts, delay });

    await setTimeoutPromise(delay);

    try {
      await this.connect();
      // Database reconnection successful
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

    console.log(`🏥 Starting database health monitoring (interval: ${this.healthCheckInterval}ms)`);

    this.healthTimer = setInterval(() => {
      // Wrap in IIFE to ensure all promise rejections are caught
      (async () => {
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
          console.warn('⚠️ Database health check failed:', error.message);
          // Don't rethrow - this is periodic monitoring, not critical path
        }
      })().catch(err => {
        // Safety net - should never reach here, but prevents unhandled rejection
        console.error('⚠️ Unexpected health check error:', err.message);
      });
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
          await setTimeoutPromise(retryDelay * attempt); // Increasing delay
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
    // Database connections closed gracefully
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
      // Force close all connections
      await this.pool.end();
      this.pool = null;
    }

    this.isConnected = false;
    // Database connections force closed
    this.emit('forceDisconnect');
  }
}

// Create singleton instance
const dbManager = new DatabaseManager();

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
  // Only log, don't take action - let server.js handle this
  console.error('� [DB] Unhandled rejection detected:', reason?.message || reason);
});

// Export connection status for health checks
export const getDBStatus = () => dbManager.getStatus();
export const testDBConnection = () => dbManager.testConnection();

// Export the dbManager instance for queries (aliased as both 'db' and 'dbManager')
export const db = dbManager;
export { dbManager };
export default dbManager;

console.log('🚀 Enhanced database connection manager loaded');