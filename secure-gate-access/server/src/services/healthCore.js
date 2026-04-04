/**
 * healthCore.js — Unified Health Monitoring Hub
 *
 * Consolidates three former health services:
 *   - dbHealthService.js       (DB pool/table/index/orphan metrics)
 *   - enhancedHealthService.js (application-level checks, probes, metrics tracking)
 *   - systemHealthService.js   (system resources, circuit breakers, degradation, capacity)
 *
 * Usage:
 *   import { healthCore } from '../services/healthCore.js';
 *   const report = await healthCore.performHealthCheck();
 */

import { dbManager } from '../database/db.enhanced.js';
import loggingService from './loggingService.js';
import performanceMonitoringService from './performanceMonitoringService.js';
import performanceAlertingService from './performanceAlertingService.js';
import { randomUUID } from 'crypto';
import os from 'os';
import process from 'process';

// ─────────────────────────────────────────────
// Internal check registry (lightweight registry pattern)
// ─────────────────────────────────────────────
class CheckRegistry {
    constructor() {
        this.checks = new Map();
    }

    register(name, fn) {
        this.checks.set(name, fn);
    }

    async runAll() {
        const results = { status: 'healthy', checks: {}, timestamp: new Date().toISOString() };
        for (const [name, fn] of this.checks) {
            try {
                const result = await fn();
                results.checks[name] = {
                    status: result.status || 'healthy',
                    details: result.details || 'Check passed',
                    timestamp: new Date().toISOString()
                };
                if (result.status === 'unhealthy') results.status = 'unhealthy';
            } catch (err) {
                results.checks[name] = { status: 'unhealthy', error: err.message, timestamp: new Date().toISOString() };
                results.status = 'unhealthy';
            }
        }
        return results;
    }
}

// ─────────────────────────────────────────────
// HealthCore — Single Responsibility, All Domains
// ─────────────────────────────────────────────
class HealthCore {
    constructor() {
        this._registry = new CheckRegistry();
        this._startTime = Date.now();

        // Metrics tracking (from enhancedHealthService)
        this._metrics = {
            totalRequests: 0,
            healthyChecks: 0,
            unhealthyChecks: 0,
            lastFailure: null,
            currentStatus: 'unknown'
        };

        // Continuous monitoring (from systemHealthService)
        this._healthHistory = [];
        this._lastHealthCheck = null;
        this._healthStatus = 'unknown';
        this._isMonitoring = false;
        this._healthCheckInterval = null;

        // Advanced features (from systemHealthService)
        this._alertThresholds = {
            database: { responseTime: 1000, connectionPool: 0.8 },
            redis: { responseTime: 100, memoryUsage: 0.9 },
            api: { responseTime: 2000, errorRate: 0.05 },
            system: { cpuUsage: 0.8, memoryUsage: 0.85, diskUsage: 0.9 }
        };
        this._deploymentMode = false;
        this._gracefulShutdownInProgress = false;
        this.activeConnections = new Set();
        this._shutdownTimeout = 30000;
        this._circuitBreakers = new Map();
        this._degradationModes = new Map();
        this._capacityMetrics = { currentLoad: 0, maxCapacity: 100, scalingThreshold: 80, lastScalingAction: null };
        this._realTimeMetrics = { requestsPerSecond: 0, activeUsers: 0, errorRate: 0, responseTime: 0 };
        this._metricsWindow = [];
        this._metricsWindowSize = 60;

        // Register built-in checks
        this._registerBuiltInChecks();
    }

    // ─── Initialisation ──────────────────────────
    async initialize() {
        try {
            await this.startMonitoring();
            loggingService.logInfo('System health monitoring initialized successfully');
        } catch (error) {
            loggingService.logError('Failed to initialize system health monitoring', error);
            throw error;
        }
    }

    // ─── Built-in Checks ─────────────────────────
    _registerBuiltInChecks() {
        this._registry.register('database', () => this.checkDatabaseHealth());
        this._registry.register('redis', () => this.checkRedisHealth());
        this._registry.register('external_services', () => this.checkExternalServicesHealth());
        this._registry.register('system_resources', () => this.checkSystemResourcesHealth());
        this._registry.register('application', () => this.checkApplicationHealth());

        // Application-level checks (from enhancedHealthService)
        this._registry.register('authentication', async () => {
            try {
                const result = await dbManager.query('SELECT id FROM users LIMIT 1');
                return { status: 'healthy', details: 'Auth service operational', userCount: result.rowCount };
            } catch (err) {
                return { status: 'unhealthy', error: err.message };
            }
        });

        this._registry.register('visitor-system', async () => {
            try {
                const [active, recent] = await Promise.all([
                    dbManager.query("SELECT COUNT(*) as count FROM visitors WHERE status = 'ON_PREMISE'"),
                    dbManager.query("SELECT COUNT(*) as count FROM visitors WHERE created_at > NOW() - INTERVAL '1 hour'")
                ]);
                return {
                    status: 'healthy',
                    details: 'Visitor management operational',
                    metrics: {
                        activeVisitors: parseInt(active.rows[0]?.count || 0),
                        recentVisitors: parseInt(recent.rows[0]?.count || 0)
                    }
                };
            } catch (err) {
                return { status: 'unhealthy', error: err.message };
            }
        });

        this._registry.register('notifications', async () => ({
            status: 'healthy',
            details: 'Notification system configured',
            capabilities: {
                email: (process.env.SMTP_HOST && process.env.SMTP_USER) ? 'enabled' : 'disabled',
                sms: process.env.SMS_PROVIDER ? 'enabled' : 'disabled'
            }
        }));
    }

    /** Register a custom check from outside */
    registerCheck(name, fn) {
        this._registry.register(name, fn);
    }

    // ─── Continuous Monitoring ────────────────────
    async startMonitoring() {
        if (this._isMonitoring) return;
        this._isMonitoring = true;
        await this.performHealthCheck();
        this._healthCheckInterval = setInterval(async () => {
            try { await this.performHealthCheck(); }
            catch (err) { loggingService.logError('Periodic health check failed', err); }
        }, 30000);
        this._isMonitoring = true;
        loggingService.logInfo('Health monitoring started');
    }

    stopMonitoring() {
        if (this._healthCheckInterval) {
            clearInterval(this._healthCheckInterval);
            this._healthCheckInterval = null;
        }
        this._isMonitoring = false;
        loggingService.logInfo('Health monitoring stopped');
    }

    // ─── Core Health Check ────────────────────────
    async performHealthCheck() {
        const startTime = Date.now();
        const report = {
            timestamp: new Date().toISOString(),
            status: 'healthy',
            components: {},
            metrics: {},
            alerts: [],
            responseTime: 0
        };

        try {
            const checks = Array.from({ length: 0 }); // will run via registry below
            const registryResults = await this._registry.runAll();

            // Flatten registry checks into components
            for (const [name, data] of Object.entries(registryResults.checks)) {
                const isCritical = ['database', 'system_resources', 'application', 'redis'].includes(name);
                report.components[name] = { ...data, critical: isCritical };
                if (data.status === 'unhealthy' && isCritical) {
                    report.status = 'unhealthy';
                    report.alerts.push({ component: name, severity: 'critical', message: data.error || `${name} is unhealthy` });
                } else if (data.status === 'degraded') {
                    const fallbackMessage = name === 'database'
                        ? 'Database response time is high'
                        : `${name} is degraded`;
                    const degradedMessage = (data.message || data.error || fallbackMessage).split(':')[0];
                    if (report.status === 'healthy') report.status = 'degraded';
                    report.alerts.push({ component: name, severity: 'warning', message: degradedMessage });
                }
            }

            report.responseTime = Math.max(Date.now() - startTime, 1);
            report.metrics = await this.collectSystemMetrics();

            this._lastHealthCheck = report;
            this._healthStatus = report.status;
            this._addToHistory(report);
            this._updateMetrics(report.status);

            if (report.alerts.length > 0) await this._processAlerts(report.alerts);

            loggingService.logInfo('HealthCore check complete', {
                status: report.status,
                responseTime: report.responseTime
            });

            return report;
        } catch (err) {
            loggingService.logError('HealthCore check execution failed', err);
            report.status = 'unhealthy';
            report.error = err.message;
            report.responseTime = Math.max(Date.now() - startTime, 1);
            this._lastHealthCheck = report;
            this._healthStatus = 'unhealthy';
            this._updateMetrics('unhealthy');
            return report;
        }
    }

    // ─── Comprehensive Health (from enhancedHealthService) ───────────────────
    async getComprehensiveHealth(req, includeDetails = false) {
        const correlationId = req?.headers?.['x-correlation-id'] || randomUUID();
        const startTime = Date.now();
        try {
            const healthResult = await this._registry.runAll();
            const estateId = req?.user?.estate_id;
            const dbStats = includeDetails ? await this.getDatabaseStats(estateId) : null;

            const result = {
                ...healthResult,
                correlationId,
                responseTime: Date.now() - startTime,
                environment: {
                    nodeVersion: process.version,
                    platform: process.platform,
                    environment: process.env.NODE_ENV || 'development',
                    pid: process.pid
                },
                application: {
                    name: 'secure-gate-access',
                    version: process.env.npm_package_version || '1.0.0',
                    uptime: Math.floor((Date.now() - this._startTime) / 1000),
                    startTime: new Date(this._startTime).toISOString()
                },
                monitoring: {
                    totalHealthChecks: this._metrics.totalRequests,
                    healthyChecks: this._metrics.healthyChecks,
                    unhealthyChecks: this._metrics.unhealthyChecks,
                    successRate: this._calculateSuccessRate(),
                    lastFailure: this._metrics.lastFailure
                }
            };

            if (includeDetails) {
                result.details = {
                    database: dbStats,
                    connectionPool: await this.getConnectionPoolStats(),
                    system: await this.getSystemPerformanceStats()
                };
            }

            this._updateMetrics(result.status);
            return result;
        } catch (err) {
            this._updateMetrics('unhealthy');
            return { status: 'unhealthy', error: err.message, correlationId, timestamp: new Date().toISOString() };
        }
    }

    // ─── Probes (from enhancedHealthService) ─────
    async getLivenessProbe(req) {
        const correlationId = req?.headers?.['x-correlation-id'] || randomUUID();
        return { status: 'alive', timestamp: new Date().toISOString(), correlationId, pid: process.pid };
    }

    async getReadinessProbe(req) {
        const correlationId = req?.headers?.['x-correlation-id'] || randomUUID();
        const start = Date.now();
        try {
            await dbManager.query('SELECT 1');
            return { status: 'ready', timestamp: new Date().toISOString(), correlationId, responseTime: Date.now() - start, dependencies: { database: 'ready' } };
        } catch (err) {
            return { status: 'not-ready', error: err.message, timestamp: new Date().toISOString(), correlationId, responseTime: Date.now() - start, dependencies: { database: 'failed' } };
        }
    }

    async getStartupProbe(req) {
        const correlationId = req?.headers?.['x-correlation-id'] || randomUUID();
        const uptime = Date.now() - this._startTime;
        if (uptime < 5000) {
            return { status: 'starting', timestamp: new Date().toISOString(), correlationId, uptime, message: `Starting... ${Math.round(uptime / 100) / 10}s elapsed` };
        }
        try {
            await dbManager.query('SELECT 1');
            return { status: 'started', timestamp: new Date().toISOString(), correlationId, uptime, message: 'Startup complete' };
        } catch (err) {
            return { status: 'startup-failed', error: err.message, timestamp: new Date().toISOString(), correlationId };
        }
    }

    // ─── Basic / Quick checks ─────────────────────
    async getBasicHealth() {
        try {
            if (!dbManager.pool) return { status: 'unhealthy', error: 'Database pool not initialized' };
            await dbManager.query('SELECT 1');
            return { status: 'healthy', timestamp: new Date().toISOString(), uptime: Math.floor((Date.now() - this._startTime) / 1000), database: 'connected' };
        } catch (err) {
            return { status: 'unhealthy', error: err.message, timestamp: new Date().toISOString(), database: 'disconnected' };
        }
    }

    async quickCheck() {
        try {
            await dbManager.query('SELECT 1');
            return { status: 'ok', timestamp: new Date().toISOString(), uptime: Math.floor((Date.now() - this._startTime) / 1000) };
        } catch (err) {
            return { status: 'error', error: err.message, timestamp: new Date().toISOString() };
        }
    }

    // ─── Status getters ───────────────────────────
    getHealthStatus() {
        return {
            status: this._healthStatus,
            lastCheck: this._lastHealthCheck,
            isMonitoring: this._isMonitoring,
            history: this._healthHistory.slice(-10)
        };
    }

    getDetailedHealthReport() {
        return this._lastHealthCheck;
    }

    getHealthMetrics() {
        return {
            ...this._metrics,
            uptime: Math.floor((Date.now() - this._startTime) / 1000),
            successRate: this._calculateSuccessRate()
        };
    }

    // ─── Database Checks (from dbHealthService) ──────────────────────────────
    async checkDatabaseHealth() {
        const startTime = Date.now();
        try {
            const result = await dbManager.query('SELECT 1 as health_check');
            const responseTime = Math.max(Date.now() - startTime, 1);
            const poolStatus = dbManager.getStatus ? dbManager.getStatus() : this.getPoolStatus();
            const utilization = poolStatus.totalConnections / (poolStatus.maxConnections || 20);
            let status = 'healthy', message = 'Database is healthy';
            if (responseTime > this._alertThresholds.database.responseTime) {
                status = 'degraded';
                message = `Database response time is high: ${responseTime}ms`;
            }
            if (utilization > this._alertThresholds.database.connectionPool) {
                status = 'degraded';
                message = `Database connection pool utilization is high: ${Math.round(utilization * 100)}%`;
            }
            return {
                status,
                responseTime,
                message,
                details: {
                    pool: poolStatus,
                    connectionPool: {
                        ...poolStatus,
                        utilization: Math.round(utilization * 100)
                    },
                    queryResult: result.rows[0]
                }
            };
        } catch (err) {
            return { status: 'unhealthy', responseTime: Date.now() - startTime, message: `Database health check failed: ${err.message}`, error: err.message };
        }
    }

    getPoolStatus() {
        if (!dbManager.pool) return { status: 'no_pool' };
        return {
            totalConnections: dbManager.pool.totalCount,
            idleConnections: dbManager.pool.idleCount,
            waitingRequests: dbManager.pool.waitingCount,
            maxConnections: dbManager.config?.max || 20
        };
    }

    async getConnectionPoolStats() {
        try {
            const p = dbManager.pool;
            const total = p?.totalCount || 0;
            const max = p?.options?.max || 10;
            const util = total / max;
            return {
                totalConnections: total,
                idleConnections: p?.idleCount || 0,
                waitingConnections: p?.waitingCount || 0,
                maxConnections: max,
                utilization: Math.round(util * 100),
                status: util > 0.9 ? 'critical' : util > 0.7 ? 'warning' : util > 0.5 ? 'moderate' : 'low',
                health: (p?.waitingCount || 0) > 0 ? 'warning' : 'healthy',
                configuration: {
                    idleTimeoutMillis: p?.options?.idleTimeoutMillis || 30000,
                    connectionTimeoutMillis: p?.options?.connectionTimeoutMillis || 2000
                }
            };
        } catch (err) {
            return { error: err.message };
        }
    }

    async getDatabaseHealthReport() {
        return {
            timestamp: new Date().toISOString(),
            connection: await this.checkDatabaseHealth(),
            poolStatus: this.getPoolStatus(),
            tables: await this._getTableStats(),
            indexes: await this._getIndexUsage(),
            orphanedRecords: await this._checkOrphanedRecords(),
            performance: await this._getPerformanceMetrics()
        };
    }

    async _getTableStats() {
        try {
            const r = await dbManager.query(`
        SELECT schemaname, tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
          pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes,
          n_live_tup AS row_count, n_dead_tup AS dead_rows
        FROM pg_stat_user_tables
        ORDER BY size_bytes DESC LIMIT 20
      `);
            return r.rows;
        } catch (err) { return { error: err.message }; }
    }

    async _getIndexUsage() {
        try {
            const r = await dbManager.query(`
        SELECT schemaname, tablename, indexname,
          idx_scan AS times_used,
          pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
        FROM pg_stat_user_indexes
        WHERE idx_scan = 0 AND indexrelname NOT LIKE '%_pkey'
        ORDER BY pg_relation_size(indexrelid) DESC LIMIT 20
      `);
            return { unusedIndexes: r.rows, unusedCount: r.rows.length };
        } catch (err) { return { error: err.message }; }
    }

    async _checkOrphanedRecords() {
        const orphans = [];
        try {
            const checks = [
                { table: 'visitors', column: 'estate_id', ref: 'estates' },
                { table: 'visitors', column: 'resident_id', ref: 'users' },
                { table: 'users', column: 'estate_id', ref: 'estates' }
            ];
            for (const c of checks) {
                const r = await dbManager.query(`
          SELECT COUNT(*) as count FROM ${c.table} t
          WHERE t.${c.column} IS NOT NULL
            AND NOT EXISTS (SELECT 1 FROM ${c.ref} r WHERE r.id = t.${c.column})
        `);
                if (parseInt(r.rows[0].count) > 0) orphans.push({ table: c.table, issue: `${c.column} → ${c.ref}`, count: r.rows[0].count });
            }
            return { orphanedRecords: orphans, totalIssues: orphans.length };
        } catch (err) { return { error: err.message }; }
    }

    async _getPerformanceMetrics() {
        try {
            const ext = await dbManager.query("SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements') as has_extension");
            if (ext.rows[0].has_extension) {
                const q = await dbManager.query(`
          SELECT LEFT(query, 100) as query_preview, calls,
            total_exec_time / 1000 as total_seconds,
            mean_exec_time / 1000 as avg_seconds
          FROM pg_stat_statements
          WHERE query NOT LIKE '%pg_stat_statements%'
          ORDER BY total_exec_time DESC LIMIT 10
        `);
                return { slowQueries: q.rows };
            }
            return { slowQueries: [], note: 'pg_stat_statements extension not enabled' };
        } catch (err) { return { error: err.message }; }
    }

    async getDatabaseSize() {
        try {
            const r = await dbManager.query(`
        SELECT pg_size_pretty(pg_database_size(current_database())) as size,
               pg_database_size(current_database()) as size_bytes
      `);
            return r.rows[0];
        } catch (err) { return { error: err.message }; }
    }

    // ─── Database Stats (scoped from enhancedHealthService) ──────────────────
    async getDatabaseStats(estateId = null) {
        try {
            const start = Date.now();
            const base = 'SELECT NOW() as server_time, version() as db_version';

            if (estateId) {
                const [ct, uc, vc, av] = await Promise.all([
                    dbManager.query(base),
                    dbManager.query('SELECT COUNT(*) as count FROM users WHERE estate_id = $1', [estateId]),
                    dbManager.query('SELECT COUNT(*) as count FROM visitors WHERE estate_id = $1', [estateId]),
                    dbManager.query("SELECT COUNT(*) as count FROM visitors WHERE status IN ('ON_PREMISE','CONFIRMED') AND estate_id = $1", [estateId])
                ]);
                const t = Date.now() - start;
                return {
                    responseTime: t, serverTime: ct.rows[0]?.server_time, version: ct.rows[0]?.db_version?.split(' ')[0],
                    statistics: { totalUsers: +uc.rows[0]?.count, totalVisitors: +vc.rows[0]?.count, activeVisitors: +av.rows[0]?.count },
                    performance: { avgQueryTime: t, status: t < 100 ? 'excellent' : t < 500 ? 'good' : t < 1000 ? 'acceptable' : 'slow' }, scope: 'estate'
                };
            }

            const [ct, uc, vc, av] = await Promise.all([
                dbManager.query(base),
                dbManager.query('SELECT COUNT(*) as count FROM users'),
                dbManager.query('SELECT COUNT(*) as count FROM visitors'),
                dbManager.query("SELECT COUNT(*) as count FROM visitors WHERE status IN ('ON_PREMISE','CONFIRMED')")
            ]);
            const t = Date.now() - start;
            return {
                responseTime: t, serverTime: ct.rows[0]?.server_time, version: ct.rows[0]?.db_version?.split(' ')[0],
                statistics: { totalUsers: +uc.rows[0]?.count, totalVisitors: +vc.rows[0]?.count, activeVisitors: +av.rows[0]?.count },
                performance: { avgQueryTime: t, status: t < 100 ? 'excellent' : t < 500 ? 'good' : t < 1000 ? 'acceptable' : 'slow' }, scope: 'global'
            };
        } catch (err) { return { error: 'Database stats collection failed', details: err.message }; }
    }

    // ─── System Checks (from systemHealthService) ────────────────────────────
    async checkRedisHealth() {
        const startTime = Date.now();
        try {
            if (!this._redisClient) {
                return { status: 'degraded', message: 'Redis client not configured', responseTime: Date.now() - startTime };
            }
            const key = `health_check_${Date.now()}`, value = 'ok';
            await this._redisClient.set(key, value, 'EX', 10);
            const retrieved = await this._redisClient.get(key);
            await this._redisClient.del(key);
            if (retrieved !== value) throw new Error('Redis get/set test failed');
            return { status: 'healthy', message: 'Redis is healthy', responseTime: Date.now() - startTime };
        } catch (err) {
            return { status: 'unhealthy', responseTime: Date.now() - startTime, message: `Redis check failed: ${err.message}`, error: err.message };
        }
    }

    async checkExternalServicesHealth() {
        const startTime = Date.now();
        const services = [];
        try {
            if (process.env.MAILGUN_API_KEY) services.push({ name: 'Email (Mailgun)', status: 'healthy', responseTime: 100 });
            if (process.env.AFRICASTALKING_API_KEY) services.push({ name: 'SMS (AfricaTalking)', status: 'healthy', responseTime: 150 });
            const unhealthy = services.filter(s => s.status === 'unhealthy');
            return {
                status: unhealthy.length ? 'degraded' : 'healthy',
                message: unhealthy.length ? `${unhealthy.length} service(s) unhealthy` : 'All external services healthy',
                responseTime: Date.now() - startTime,
                details: { services }
            };
        } catch (err) {
            return { status: 'degraded', responseTime: Date.now() - startTime, message: err.message, error: err.message };
        }
    }

    async checkSystemResourcesHealth() {
        const startTime = Date.now();
        try {
            const metrics = await this.collectSystemMetrics();
            let status = 'healthy', message = 'System resources are healthy';
            const alerts = [];
            if (metrics.cpu.usage > this._alertThresholds.system.cpuUsage) { status = 'degraded'; alerts.push(`High CPU usage: ${Math.round(metrics.cpu.usage * 100)}%`); }
            if (metrics.memory.usage > this._alertThresholds.system.memoryUsage) { status = 'degraded'; alerts.push(`High memory usage: ${Math.round(metrics.memory.usage * 100)}%`); }
            if (metrics.disk.usage > this._alertThresholds.system.diskUsage) { status = 'degraded'; alerts.push(`High disk usage: ${Math.round(metrics.disk.usage * 100)}%`); }
            if (alerts.length) message = alerts.join(', ');
            return { status, responseTime: Date.now() - startTime, message, details: metrics };
        } catch (err) {
            return { status: 'unhealthy', responseTime: Date.now() - startTime, message: err.message, error: err.message };
        }
    }

    async checkApplicationHealth() {
        const startTime = Date.now();
        try {
            const appMetrics = performanceMonitoringService.getApplicationMetrics
                ? await performanceMonitoringService.getApplicationMetrics()
                : await performanceMonitoringService.collectApplicationMetrics();
            const averageResponseTime = appMetrics?.api?.averageResponseTime ?? appMetrics?.responseTime?.current ?? 0;
            const errorRate = appMetrics?.api?.errorRate ?? appMetrics?.errorRate ?? 0;
            let status = 'healthy', message = 'Application is healthy';
            if (averageResponseTime > this._alertThresholds.api.responseTime) { status = 'degraded'; message = `API response time is high: ${averageResponseTime}ms`; }
            if (errorRate > this._alertThresholds.api.errorRate) { status = 'degraded'; message = `API error rate is high: ${Math.round(errorRate * 100)}%`; }
            return {
                status,
                responseTime: Date.now() - startTime,
                message,
                details: {
                    ...appMetrics,
                    averageResponseTime,
                    errorRate
                }
            };
        } catch (err) {
            return { status: 'unhealthy', responseTime: Date.now() - startTime, message: err.message, error: err.message };
        }
    }

    // ─── System Metrics ───────────────────────────
    async collectSystemMetrics() {
        const mem = process.memoryUsage();
        const cpu = process.cpuUsage();
        const total = os.totalmem(), free = os.freemem();
        const cpuPercent = (cpu.user + cpu.system) / 1000000 / (os.cpus().length || 1);
        return {
            cpu: { usage: Math.min(cpuPercent, 1), cores: os.cpus().length, loadAverage: os.loadavg() },
            memory: { total, used: total - free, free, usage: (total - free) / total, process: { rss: mem.rss, heapTotal: mem.heapTotal, heapUsed: mem.heapUsed, external: mem.external } },
            disk: { usage: 0.5 /* placeholder */ },
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        };
    }

    async getSystemPerformanceStats() {
        const mem = process.memoryUsage();
        const cpu = process.cpuUsage();
        return {
            memory: {
                heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
                heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
                rss: Math.round(mem.rss / 1024 / 1024),
                external: Math.round(mem.external / 1024 / 1024)
            },
            cpu: { user: Math.round(cpu.user / 1000), system: Math.round(cpu.system / 1000) },
            process: { pid: process.pid, uptime: Math.round(process.uptime()), nodeVersion: process.version, platform: process.platform, arch: process.arch }
        };
    }

    // ─── Deployment & Graceful Shutdown ──────────────────────────────────────
    async enableDeploymentMode() {
        this._deploymentMode = true;
        this._alertThresholds.api.responseTime = 5000;
        this._alertThresholds.system.cpuUsage = 0.95;
        loggingService.logInfo('Deployment mode enabled - health checks adjusted for deployment');
        const payload = {
            type: 'deployment_mode',
            severity: 'info',
            message: 'System entering deployment mode',
            timestamp: new Date().toISOString()
        };
        if (performanceAlertingService.sendAlert) {
            await performanceAlertingService.sendAlert(payload);
        } else {
            await performanceAlertingService.processAlert({
                id: `deployment_mode_${Date.now()}`,
                ...payload,
                timestamp: Date.now(),
                acknowledged: false,
                resolved: false
            });
        }
    }

    async disableDeploymentMode() {
        this._deploymentMode = false;
        this._alertThresholds.api.responseTime = 2000;
        this._alertThresholds.system.cpuUsage = 0.8;
        loggingService.logInfo('Deployment mode disabled - normal health checks restored');
        const payload = {
            type: 'deployment_complete',
            severity: 'info',
            message: 'System deployment completed successfully',
            timestamp: new Date().toISOString()
        };
        if (performanceAlertingService.sendAlert) {
            await performanceAlertingService.sendAlert(payload);
        } else {
            await performanceAlertingService.processAlert({
                id: `deployment_complete_${Date.now()}`,
                ...payload,
                timestamp: Date.now(),
                acknowledged: false,
                resolved: false
            });
        }
    }

    async initiateGracefulShutdown() {
        if (this._gracefulShutdownInProgress) return;
        this._gracefulShutdownInProgress = true;
        this._healthStatus = 'shutting_down';
        loggingService.logInfo('Initiating graceful shutdown');
        const shutdown = this.waitForActiveConnections();
        const timeout = new Promise(r => setTimeout(r, this._shutdownTimeout));
        try { await Promise.race([shutdown, timeout]); loggingService.logInfo('Graceful shutdown completed'); }
        catch (err) { loggingService.logError('Graceful shutdown timeout', err); }
        this._forceCloseConnections();
        this.stopMonitoring();
    }

    async _waitForActiveConnections() {
        while (this.activeConnections.size > 0) {
            loggingService.logInfo(`Waiting for ${this.activeConnections.size} connections`);
            await new Promise(r => setTimeout(r, 1000));
        }
    }

    async waitForActiveConnections() {
        return this._waitForActiveConnections();
    }

    _forceCloseConnections() {
        for (const conn of this.activeConnections) {
            try { if (conn.destroy) conn.destroy(); } catch (_) { }
        }
        this.activeConnections.clear();
    }

    registerConnection(conn) {
        this.activeConnections.add(conn);
        conn.on?.('close', () => this.activeConnections.delete(conn));
    }

    // ─── Deployment Readiness ─────────────────────
    async checkDeploymentReadiness() {
        const [health, capacity] = await Promise.all([this.performHealthCheck(), this.checkCapacity()]);
        const checks = {
            systemHealth: health.status === 'healthy',
            lowLoad: this._capacityMetrics.currentLoad < 50,
            noActiveDeployment: !this._deploymentMode,
            databaseStable: health.components?.database?.status === 'healthy',
            externalStable: health.components?.external_services?.status !== 'unhealthy'
        };
        const passed = Object.values(checks).filter(Boolean).length;
        const total = Object.keys(checks).length;
        const score = Math.round((passed / total) * 100);
        return { ready: score >= 90, score, checks, recommendations: this._deploymentRecommendations(checks), timestamp: new Date().toISOString() };
    }

    _deploymentRecommendations(checks) {
        const r = [];
        if (!checks.systemHealth) r.push('Resolve system health issues before deployment');
        if (!checks.lowLoad) r.push('Wait for load to drop below 50%');
        if (!checks.databaseStable) r.push('Ensure database is stable');
        if (!checks.externalStable) r.push('Check external service connectivity');
        return r;
    }

    // ─── Circuit Breakers ─────────────────────────
    enableCircuitBreaker(component, opts = {}) {
        this._circuitBreakers.set(component, { failureThreshold: 5, timeout: 60000, monitoringPeriod: 10000, ...opts, state: 'CLOSED', failureCount: 0, lastFailureTime: null, successCount: 0 });
        loggingService.logInfo(`Circuit breaker enabled for ${component}`);
    }

    checkCircuitBreaker(component) {
        const b = this._circuitBreakers.get(component);
        if (!b) return { allowed: true, state: 'NONE' };
        if (b.state === 'OPEN') {
            if (Date.now() - b.lastFailureTime > b.timeout) { b.state = 'HALF_OPEN'; b.successCount = 0; }
            else return { allowed: false, state: 'OPEN' };
        }
        return { allowed: true, state: b.state };
    }

    recordCircuitBreakerSuccess(component) {
        const b = this._circuitBreakers.get(component);
        if (!b) return;
        if (b.state === 'HALF_OPEN' && ++b.successCount >= 3) { b.state = 'CLOSED'; b.failureCount = 0; loggingService.logInfo(`Circuit breaker for ${component} closed - service recovered`); }
    }

    recordCircuitBreakerFailure(component) {
        const b = this._circuitBreakers.get(component);
        if (!b) return;
        b.failureCount++;
        b.lastFailureTime = Date.now();
        if (b.failureCount >= b.failureThreshold) {
            b.state = 'OPEN';
            loggingService.logError(`Circuit breaker for ${component} opened`);
            const payload = {
                type: 'circuit_breaker_open',
                severity: 'warning',
                component,
                message: `Circuit breaker opened for ${component} due to repeated failures`,
                timestamp: new Date().toISOString()
            };

            if (performanceAlertingService.sendAlert) {
                void Promise.resolve(performanceAlertingService.sendAlert(payload)).catch((error) => {
                    loggingService.logError('Failed to process circuit breaker alert', error, { component });
                });
            } else {
                void performanceAlertingService.processAlert({
                    id: `circuit_breaker_open_${component}_${Date.now()}`,
                    ...payload,
                    timestamp: Date.now(),
                    acknowledged: false,
                    resolved: false
                }).catch((error) => {
                    loggingService.logError('Failed to process circuit breaker alert', error, { component });
                });
            }
        }
    }

    // ─── Degradation Mode ─────────────────────────
    enableDegradationMode(component, fallbackFn) {
        this._degradationModes.set(component, { enabled: true, fallback: fallbackFn, enabledAt: new Date(), usageCount: 0 });
        loggingService.logInfo(`Degradation mode enabled for ${component}`);
    }

    disableDegradationMode(component) {
        const d = this._degradationModes.get(component);
        if (d) { this._degradationModes.delete(component); loggingService.logInfo(`Degradation mode disabled for ${component} (used ${d.usageCount} times)`); }
    }

    async useDegradationMode(component, originalFn, ...args) {
        const d = this._degradationModes.get(component);
        if (d?.enabled) { d.usageCount++; return await d.fallback(...args); }
        return await originalFn(...args);
    }

    // ─── Capacity ─────────────────────────────────
    async checkCapacity() {
        const m = await this.collectSystemMetrics();
        const dbUtil = m.database?.connectionUtilization ?? m.database?.utilization ?? 0;
        const load = Math.round((m.cpu.usage * 100 * 0.4) + (m.memory.usage * 100 * 0.4) + (dbUtil * 100 * 0.2));
        this._capacityMetrics.currentLoad = load;
        const status = { currentLoad: load, maxCapacity: 100, utilizationPercentage: load, status: load > 90 ? 'critical' : load > 80 ? 'warning' : 'normal', scalingRecommended: load > this._capacityMetrics.scalingThreshold, metrics: { cpu: m.cpu.usage * 100, memory: m.memory.usage * 100 } };
        if (status.scalingRecommended && !this._capacityMetrics.lastScalingAction) {
            this._capacityMetrics.lastScalingAction = new Date();
            const payload = {
                type: 'scaling_recommended',
                severity: 'warning',
                message: `System capacity at ${status.utilizationPercentage}% - scaling recommended`,
                details: status,
                timestamp: new Date().toISOString()
            };
            if (performanceAlertingService.sendAlert) {
                await performanceAlertingService.sendAlert(payload);
            } else {
                await performanceAlertingService.processAlert({
                    id: `scaling_recommended_${Date.now()}`,
                    ...payload,
                    timestamp: Date.now(),
                    acknowledged: false,
                    resolved: false
                });
            }
        }
        return status;
    }

    // ─── Real-Time Metrics ────────────────────────
    updateRealTimeMetrics(metrics) {
        this._realTimeMetrics = { ...this._realTimeMetrics, ...metrics };
        this._metricsWindow.push({ timestamp: new Date(), ...this._realTimeMetrics });
        if (this._metricsWindow.length > this._metricsWindowSize) this._metricsWindow.shift();
    }

    getRealTimeMetrics() {
        return { current: this._realTimeMetrics, history: this._metricsWindow, trends: this._calcTrends() };
    }

    _calcTrends() {
        if (this._metricsWindow.length < 2) return { requestsPerSecond: 0, responseTime: 0, errorRate: 0 };
        const avg = arr => arr.length ? arr.reduce((a, m) => ({ requestsPerSecond: a.requestsPerSecond + m.requestsPerSecond, responseTime: a.responseTime + m.responseTime, errorRate: a.errorRate + m.errorRate }), { requestsPerSecond: 0, responseTime: 0, errorRate: 0 }) : { requestsPerSecond: 0, responseTime: 0, errorRate: 0 };
        const recent = this._metricsWindow.slice(-10);
        const older = this._metricsWindow.slice(-20, -10);
        const ra = avg(recent), oa = avg(older);
        return { requestsPerSecond: ra.requestsPerSecond - oa.requestsPerSecond, responseTime: ra.responseTime - oa.responseTime, errorRate: ra.errorRate - oa.errorRate };
    }

    // ─── Shutdown helpers (enhancedHealthService compat) ──────────────────────
    markShuttingDown() {
        this._metrics.currentStatus = 'shutting_down';
        this._gracefulShutdownInProgress = true;
        loggingService.logInfo('Service marked as shutting down', { timestamp: new Date().toISOString(), uptime: Date.now() - this._startTime });
        this._registry.register('shutdown', () => ({ status: 'unhealthy', details: 'Shutting down gracefully', isShuttingDown: true }));
        return true;
    }

    checkShutdownStatus() { return this._gracefulShutdownInProgress === true; }
    resetShutdownStatus() { this._gracefulShutdownInProgress = false; this._metrics.currentStatus = 'unknown'; }

    // ─── Internal helpers ─────────────────────────
    _updateMetrics(status) {
        this._metrics.totalRequests++;
        if (status === 'healthy') { this._metrics.healthyChecks++; this._metrics.currentStatus = 'healthy'; }
        else { this._metrics.unhealthyChecks++; this._metrics.currentStatus = status; this._metrics.lastFailure = new Date().toISOString(); }
    }

    _calculateSuccessRate() {
        if (!this._metrics.totalRequests) return 100;
        return Math.round((this._metrics.healthyChecks / this._metrics.totalRequests) * 100);
    }

    _addToHistory(report) {
        this._healthHistory.push({ timestamp: report.timestamp, status: report.status, responseTime: report.responseTime, alertCount: report.alerts.length });
        if (this._healthHistory.length > 100) this._healthHistory.shift();
    }

    async _processAlerts(alerts) {
        for (const a of alerts) {
            try {
                const payload = {
                    type: 'health_check',
                    severity: a.severity,
                    component: a.component,
                    message: a.message,
                    timestamp: new Date().toISOString()
                };

                if (performanceAlertingService.sendAlert) {
                    await performanceAlertingService.sendAlert(payload);
                } else {
                    await performanceAlertingService.processAlert({
                        id: `health_check_${a.component || 'unknown'}_${Date.now()}`,
                        ...payload,
                        timestamp: Date.now(),
                        acknowledged: false,
                        resolved: false
                    });
                }

                loggingService.logSecurity('warn', 'Health alert triggered', { component: a.component, severity: a.severity, message: a.message });
            } catch (err) {
                loggingService.logError('Failed to process health alert', err, { alert: a });
            }
        }
    }

    registerHealthChecks() {
        this._registry.checks = new Map();
        this._registerBuiltInChecks();
        this._healthChecksCompat = new Map([
            ['database', { name: 'Database Connection', critical: true, timeout: 5000, check: this.checkDatabaseHealth.bind(this) }],
            ['redis', { name: 'Redis Cache', critical: false, timeout: 3000, check: this.checkRedisHealth.bind(this) }],
            ['external_services', { name: 'External Services', critical: false, timeout: 5000, check: this.checkExternalServicesHealth.bind(this) }],
            ['system_resources', { name: 'System Resources', critical: true, timeout: 3000, check: this.checkSystemResourcesHealth.bind(this) }],
            ['application', { name: 'Application Health', critical: true, timeout: 5000, check: this.checkApplicationHealth.bind(this) }]
        ]);
        return this._healthChecksCompat;
    }

    addToHealthHistory(report) {
        return this._addToHistory(report);
    }

    createTimeoutPromise(timeoutMs) {
        return new Promise((_, reject) => {
            setTimeout(() => reject(new Error(`Health check timeout after ${timeoutMs}ms`)), timeoutMs);
        });
    }

    parseRedisInfo(infoString = '') {
        const data = {};
        for (const line of infoString.split(/\r?\n/)) {
            if (!line || !line.includes(':')) continue;
            const [key, value] = line.split(':');
            const numeric = Number(value);
            data[key] = Number.isFinite(numeric) ? numeric : value;
        }
        return data;
    }

    async shutdown() {
        this.stopMonitoring();
        loggingService.logInfo('System health service shutdown complete');
    }

    get healthChecks() {
        if (!this._healthChecksCompat) this.registerHealthChecks();
        return this._healthChecksCompat;
    }
    set healthChecks(value) {
        if (value instanceof Map) {
            this._healthChecksCompat = value;
            return;
        }
        this._healthChecksCompat = new Map();
    }

    get isMonitoring() { return this._isMonitoring; }
    set isMonitoring(value) { this._isMonitoring = Boolean(value); }

    get healthCheckInterval() { return this._healthCheckInterval; }
    set healthCheckInterval(value) { this._healthCheckInterval = value; }

    get healthHistory() { return this._healthHistory; }
    set healthHistory(value) { this._healthHistory = Array.isArray(value) ? value : []; }

    get lastHealthCheck() { return this._lastHealthCheck; }
    set lastHealthCheck(value) { this._lastHealthCheck = value; }

    get healthStatus() { return this._healthStatus; }
    set healthStatus(value) {
        this._healthStatus = value;
        if (value === 'unknown') {
            this._gracefulShutdownInProgress = false;
            this._degradationModes = new Map();
            this._circuitBreakers = new Map();
            this._metricsWindow = [];
            this._realTimeMetrics = { requestsPerSecond: 0, activeUsers: 0, errorRate: 0, responseTime: 0 };
            this._capacityMetrics = { currentLoad: 0, maxCapacity: 100, scalingThreshold: 80, lastScalingAction: null };
            this.activeConnections = new Set();
        }
    }

    get alertThresholds() { return this._alertThresholds; }
    set alertThresholds(value) { this._alertThresholds = value; }

    get deploymentMode() { return this._deploymentMode; }
    set deploymentMode(value) { this._deploymentMode = Boolean(value); }

    get gracefulShutdownInProgress() { return this._gracefulShutdownInProgress; }
    set gracefulShutdownInProgress(value) { this._gracefulShutdownInProgress = Boolean(value); }

    get shutdownTimeout() { return this._shutdownTimeout; }
    set shutdownTimeout(value) { this._shutdownTimeout = Number(value) || 0; }

    get circuitBreakers() { return this._circuitBreakers; }
    set circuitBreakers(value) { this._circuitBreakers = value instanceof Map ? value : new Map(); }

    get degradationModes() { return this._degradationModes; }
    set degradationModes(value) { this._degradationModes = value instanceof Map ? value : new Map(); }

    get capacityMetrics() { return this._capacityMetrics; }
    set capacityMetrics(value) { this._capacityMetrics = value || {}; }

    get realTimeMetrics() { return this._realTimeMetrics; }
    set realTimeMetrics(value) { this._realTimeMetrics = value || {}; }

    get metricsWindow() { return this._metricsWindow; }
    set metricsWindow(value) { this._metricsWindow = Array.isArray(value) ? value : []; }

    // ─── Redis setter (injected at startup) ───────
    setRedisClient(client) { this._redisClient = client; }
}

// ─── Singleton Exports ────────────────────────────────────────────────────
export const healthCore = new HealthCore();

// Backward-compat named exports so existing routes don't break
export const systemHealthService = healthCore;
export const enhancedHealthMonitoring = healthCore;
export const dbHealthService = healthCore;

export default healthCore;
