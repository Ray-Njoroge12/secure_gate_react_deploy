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
const SHOULD_LOG_DB = process.env.NODE_ENV !== 'test';
const logDb = (...args) => {
  if (SHOULD_LOG_DB) {
    console.log(...args);
  }
};

/**
 * Database connection health monitoring and management
 */
class DatabaseManager extends EventEmitter {
  constructor(config = {}) {
    super();

    // Support DATABASE_URL (Render provides this) or individual PG* variables
    const connectionString = process.env.DATABASE_URL;
    const pgHost = process.env.PGHOST || process.env.PG_HOST || process.env.POSTGRES_HOST || 'localhost';
    const pgPort = Number(process.env.PGPORT || process.env.PG_PORT || process.env.POSTGRES_PORT) || 5432;
    const pgUser = process.env.PGUSER || process.env.PG_USER || process.env.POSTGRES_USER || 'postgres';
    const pgDatabase = process.env.PGDATABASE || process.env.PG_DATABASE || process.env.POSTGRES_DB || 'secure_gate';
    const pgPassword = process.env.PGPASSWORD || process.env.PG_PASSWORD || process.env.POSTGRES_PASSWORD || 'postgres';

    // Log which connection method is being used (without exposing credentials)
    if (connectionString) {
      // Parse DATABASE_URL to show connection info without password
      try {
        const url = new URL(connectionString);
        logDb(`📊 Database: Using DATABASE_URL (host: ${url.hostname}, db: ${url.pathname.slice(1)})`);
        logDb(`📊 Database: SSL required for cloud deployment`);
      } catch {
        logDb('📊 Database: Using DATABASE_URL connection string');
      }
    } else {
      logDb(`📊 Database: Using individual PG* variables (host: ${pgHost})`);
      console.warn('⚠️ DATABASE_URL not set - this may cause issues on Render');
    }

    this.config = {
      // Use DATABASE_URL if provided, otherwise use individual variables
      ...(connectionString ? { connectionString } : {
        user: pgUser,
        host: pgHost,
        database: pgDatabase,
        password: pgPassword,
        port: pgPort,
      }),

      // SSL configuration for cloud providers
      // Render, Railway, Heroku all require SSL
      ssl: process.env.DATABASE_URL || process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false } // Render requires this for managed Postgres (self-signed certs)
        : false,

      // Pool configuration optimized for cloud environments (especially Render)
      // Phase 3.2: Increased pool size for better performance
      // Phase 2 Integration Testing: Higher pool size for test environment (40) vs production (20)
      max: Number(process.env.PGPOOL_MAX) || (process.env.NODE_ENV === 'test' ? 40 : 20),
      min: Number(process.env.PGPOOL_MIN) || (process.env.NODE_ENV === 'test' ? 10 : 5),
      idleTimeoutMillis: Number(process.env.PGPOOL_IDLE_TIMEOUT) || (process.env.NODE_ENV === 'test' ? 30000 : 10000),
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
        // Sanitize config for logging (hide sensitive data)
        const sanitizedConfig = {
          ...this.config,
          password: this.config.password ? '****' : undefined,
          ssl: this.config.ssl ? 'enabled' : 'disabled'
        };
        logDb(`🔄 Database connection attempt ${attempt}/${maxAttempts}...`);
        logDb('📊 Connection Config:', JSON.stringify(sanitizedConfig, null, 2));

        await this.connect();

        // Only try to ensure indexes if connection succeeded
        try {
          await this.ensureIndexes();
        } catch (indexError) {
          console.warn('⚠️ Index creation failed (non-critical):', indexError.message);
        }

        this.startHealthMonitoring();
        this.isInitialized = true;
        logDb('✅ Database manager initialized successfully');
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
        } else if (error.message.includes('authentication') || error.message.includes('password authentication failed')) {
          console.error('💡 Authentication failed - check DATABASE_URL credentials.');
          console.error(`   User: ${this.config.user}`);
          console.error(`   Database: ${this.config.database}`);
          console.error(`   Host: ${this.config.host}`);
        }

        if (attempt < maxAttempts) {
          const delay = Math.min(this.retryDelay * Math.pow(1.5, attempt - 1), this.maxRetryDelay);
          logDb(`⏳ Waiting ${Math.round(delay / 1000)}s before retry...`);
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
    // First ensure essential tables exist (for fresh databases)
    await this.ensureEssentialTables();

    try {
      const indexes = [
        'CREATE INDEX IF NOT EXISTS idx_visitors_invite_code ON visitors(invite_code)',
        'CREATE INDEX IF NOT EXISTS idx_visitors_status ON visitors(status)',
        'CREATE INDEX IF NOT EXISTS idx_access_logs_user_created ON access_logs(user_id, log_time)',
        'CREATE INDEX IF NOT EXISTS idx_visitors_host_id ON visitors(host_id)',
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
      logDb('✓ Database indexes ensured');
    } catch (error) {
      console.warn('Index creation failed:', error.message);
    }
  }

  /**
   * Ensure essential tables exist for a fresh database
   */
  async ensureEssentialTables() {
    logDb('🔄 Ensuring essential database tables...');

    const tables = [
      {
        name: 'estates',
        sql: `CREATE TABLE IF NOT EXISTS estates (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          plan_id VARCHAR(50),
          status VARCHAR(20) NOT NULL DEFAULT 'active',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )`
      },
      {
        name: 'users',
        sql: `CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(100) UNIQUE NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255),
          password_hash VARCHAR(255) NOT NULL,
          role VARCHAR(50) NOT NULL,
          phone VARCHAR(20),
          area VARCHAR(100),
          house VARCHAR(100),
          estate_id INT REFERENCES estates(id),
          notify_email BOOLEAN DEFAULT true,
          notify_sms BOOLEAN DEFAULT false,
          verified BOOLEAN DEFAULT false,
          verification_token TEXT,
          verification_expires TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )`
      },
      {
        name: 'visitors',
        sql: `CREATE TABLE IF NOT EXISTS visitors (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          estate_id INT REFERENCES estates(id),
          resident_id INT,
          phone VARCHAR(20),
          email VARCHAR(100),
          id_number VARCHAR(50),
          vehicle_plate VARCHAR(20),
          purpose TEXT,
          date_of_visit DATE,
          time_of_visit TIME,
          invite_code VARCHAR(100) UNIQUE,
          status VARCHAR(20) DEFAULT 'PENDING',
          otp_hash TEXT,
          otp_expires_at TIMESTAMP,
          otp_attempts INT DEFAULT 0,
          qr_code TEXT,
          check_in_time TIMESTAMP,
          check_out_time TIMESTAMP,
          check_in_guard_id INT REFERENCES users(id),
          check_out_guard_id INT REFERENCES users(id),
          check_in_notes TEXT,
          check_out_notes TEXT,
          created_by VARCHAR(255),
          host_id INT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )`
      },
      {
        name: 'incidents',
        sql: `CREATE TABLE IF NOT EXISTS incidents (
          id SERIAL PRIMARY KEY,
          guard_id INT REFERENCES users(id),
          reported_by INT REFERENCES users(id),
          visitor_id INT REFERENCES visitors(id),
          category VARCHAR(50) NOT NULL,
          severity VARCHAR(20) NOT NULL DEFAULT 'medium',
          description TEXT NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'open',
          priority INT DEFAULT 3,
          resolution TEXT,
          resolved_at TIMESTAMP,
          resolved_by INT REFERENCES users(id),
          closed_at TIMESTAMP,
          closed_by INT REFERENCES users(id),
          assigned_to INT REFERENCES users(id),
          assigned_by INT REFERENCES users(id),
          assigned_at TIMESTAMP,
          escalated_to INT REFERENCES users(id),
          escalated_by INT REFERENCES users(id),
          escalated_at TIMESTAMP,
          site_id INT REFERENCES estates(id),
          estate_id INT REFERENCES estates(id),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )`
      },
      {
        name: 'bulk_invites',
        sql: `CREATE TABLE IF NOT EXISTS bulk_invites (
          id SERIAL PRIMARY KEY,
          event_name VARCHAR(255) NOT NULL,
          date DATE NOT NULL,
          time TIME NOT NULL,
          num_guests INT NOT NULL,
          invite_code VARCHAR(100) UNIQUE NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          created_by VARCHAR(100),
          remaining_slots INT NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW()
        )`
      },
      {
        name: 'access_logs',
        sql: `CREATE TABLE IF NOT EXISTS access_logs (
          id SERIAL PRIMARY KEY,
          user_id INT,
          action VARCHAR(100),
          log_time TIMESTAMP DEFAULT NOW(),
          request_id VARCHAR(100),
          entity_type VARCHAR(50),
          entity_id VARCHAR(100),
          outcome VARCHAR(20),
          message TEXT,
          metadata JSONB
        )`
      },
      {
        name: 'audit_logs',
        sql: `CREATE TABLE IF NOT EXISTS audit_logs (
          id SERIAL PRIMARY KEY,
          user_id INT,
          action VARCHAR(100) NOT NULL,
          resource VARCHAR(100) NOT NULL DEFAULT 'system',
          user_role VARCHAR(50),
          request_id VARCHAR(100),
          estate_id INTEGER,
          entity_type VARCHAR(50),
          entity_id VARCHAR(100),
          outcome VARCHAR(20),
          message TEXT,
          details TEXT,
          metadata JSONB,
          ip_address INET,
          user_agent TEXT,
          timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          created_at TIMESTAMP DEFAULT NOW()
        )`
      },
      {
        name: 'revoked_tokens',
        sql: `CREATE TABLE IF NOT EXISTS revoked_tokens (
          jti TEXT PRIMARY KEY,
          revoked_at TIMESTAMP DEFAULT NOW()
        )`
      },
      {
        name: 'refresh_tokens',
        sql: `CREATE TABLE IF NOT EXISTS refresh_tokens (
          id SERIAL PRIMARY KEY,
          user_id INT REFERENCES users(id) ON DELETE CASCADE,
          token TEXT NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          user_agent TEXT,
          ip_address INET,
          is_revoked BOOLEAN DEFAULT false,
          revoked_at TIMESTAMP,
          last_used_at TIMESTAMP,
          jti TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        )`
      },
      {
        name: 'delivery_logs',
        sql: `CREATE TABLE IF NOT EXISTS delivery_logs (
          id SERIAL PRIMARY KEY,
          recipient_id INT REFERENCES users(id),
          resident_id INT REFERENCES users(id),
          carrier TEXT,
          tracking_number TEXT,
          recipient_name TEXT,
          status TEXT,
          received_at TIMESTAMP,
          picked_up_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )`
      },
      {
        name: 'idempotency_keys',
        sql: `CREATE TABLE IF NOT EXISTS idempotency_keys (
          id SERIAL PRIMARY KEY,
          key TEXT NOT NULL,
          scope TEXT NOT NULL,
          request_hash TEXT,
          response_code INT,
          response_body JSONB,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          UNIQUE (key, scope)
        )`
      },
      {
        name: 'visitors_archive',
        sql: `CREATE TABLE IF NOT EXISTS visitors_archive (
          id INT,
          name VARCHAR(100),
          estate_id INT,
          phone VARCHAR(20),
          email VARCHAR(100),
          id_number VARCHAR(50),
          vehicle_plate VARCHAR(20),
          purpose TEXT,
          date_of_visit DATE,
          time_of_visit TIME,
          invite_code VARCHAR(100),
          status VARCHAR(20),
          otp_hash TEXT,
          otp_expires_at TIMESTAMP,
          otp_attempts INT,
          qr_code TEXT,
          check_in_time TIMESTAMP,
          check_out_time TIMESTAMP,
          created_by VARCHAR(255),
          host_id INT,
          created_at TIMESTAMP,
          updated_at TIMESTAMP,
          archived_at TIMESTAMP DEFAULT NOW(),
          archived_by VARCHAR(100),
          archive_reason TEXT
        )`
      },
      {
        name: 'access_logs_archive',
        sql: `CREATE TABLE IF NOT EXISTS access_logs_archive (
          id INT,
          user_id INT,
          action VARCHAR(100),
          log_time TIMESTAMP,
          request_id VARCHAR(100),
          entity_type VARCHAR(50),
          entity_id VARCHAR(100),
          outcome VARCHAR(20),
          message TEXT,
          metadata JSONB,
          archived_at TIMESTAMP DEFAULT NOW()
        )`
      },
      {
        name: 'audit_logs_archive',
        sql: `CREATE TABLE IF NOT EXISTS audit_logs_archive (
          id INT,
          user_id INT,
          action VARCHAR(100),
          resource VARCHAR(100),
          user_role VARCHAR(50),
          request_id VARCHAR(100),
          estate_id INTEGER,
          entity_type VARCHAR(50),
          entity_id VARCHAR(100),
          outcome VARCHAR(20),
          message TEXT,
          details TEXT,
          metadata JSONB,
          ip_address INET,
          user_agent TEXT,
          timestamp TIMESTAMP,
          created_at TIMESTAMP,
          archived_at TIMESTAMP DEFAULT NOW()
        )`
      },
      {
        name: 'backup_log',
        sql: `CREATE TABLE IF NOT EXISTS backup_log (
          id SERIAL PRIMARY KEY,
          backup_id VARCHAR(100) UNIQUE NOT NULL,
          backup_type VARCHAR(50) NOT NULL,
          file_path VARCHAR(500) NOT NULL,
          file_size BIGINT NOT NULL DEFAULT 0,
          duration INTEGER NOT NULL DEFAULT 0,
          status VARCHAR(20) NOT NULL DEFAULT 'pending',
          error_message TEXT,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          completed_at TIMESTAMP WITH TIME ZONE
        )`
      },
      {
        name: 'dr_recovery_log',
        sql: `CREATE TABLE IF NOT EXISTS dr_recovery_log (
          id SERIAL PRIMARY KEY,
          recovery_id VARCHAR(100) UNIQUE NOT NULL,
          issue_type VARCHAR(50) NOT NULL,
          severity VARCHAR(20) NOT NULL,
          description TEXT NOT NULL,
          strategy VARCHAR(50),
          status VARCHAR(20) NOT NULL DEFAULT 'in_progress',
          result JSONB,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          completed_at TIMESTAMP WITH TIME ZONE
        )`
      },
      {
        name: 'notification_metrics_events',
        sql: `CREATE TABLE IF NOT EXISTS notification_metrics_events (
          id SERIAL PRIMARY KEY,
          event_type VARCHAR(50) NOT NULL,
          event_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          payload JSONB,
          created_at TIMESTAMP DEFAULT NOW()
        )`
      }
    ];

    for (const table of tables) {
      try {
        await this.query(table.sql);
        logDb(`  ✓ Table ${table.name} ready`);
      } catch (error) {
        console.warn(`  ⚠ Table ${table.name}: ${error.message}`);
      }
    }

    const visitorColumnUpdates = [
      'ALTER TABLE visitors ADD COLUMN IF NOT EXISTS resident_id INT',
      'ALTER TABLE visitors ADD COLUMN IF NOT EXISTS check_in_time TIMESTAMP',
      'ALTER TABLE visitors ADD COLUMN IF NOT EXISTS check_out_time TIMESTAMP',
      'ALTER TABLE visitors ADD COLUMN IF NOT EXISTS check_in_guard_id INT REFERENCES users(id)',
      'ALTER TABLE visitors ADD COLUMN IF NOT EXISTS check_out_guard_id INT REFERENCES users(id)',
      'ALTER TABLE visitors ADD COLUMN IF NOT EXISTS check_in_notes TEXT',
      'ALTER TABLE visitors ADD COLUMN IF NOT EXISTS check_out_notes TEXT',
      'ALTER TABLE visitors ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()'
    ];

    for (const columnQuery of visitorColumnUpdates) {
      try {
        await this.query(columnQuery);
      } catch (error) {
        console.warn(`  ⚠ Visitors column update: ${error.message}`);
      }
    }

    logDb('✅ Essential tables check complete');
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
    let timeoutId;

    try {
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
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

      logDb('✅ Database connection test passed');

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
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
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

    logDb(`🏥 Starting database health monitoring (interval: ${this.healthCheckInterval}ms)`);

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
      let timeoutId;
      try {
        const startTime = Date.now();

        // Create timeout promise
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error(`Query timeout after ${timeout}ms`)), timeout);
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
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId);
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
      logDb('🔄 Closing database connections...');
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
      logDb('⚠️ Force closing database connections...');
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
  logDb('🔄 Received SIGINT, closing database connections...');
  await dbManager.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logDb('🔄 Received SIGTERM, closing database connections...');
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

logDb('🚀 Enhanced database connection manager loaded');
