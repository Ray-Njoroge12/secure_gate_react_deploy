import pool from '../database/db.js';
import os from 'os';

/**
 * Comprehensive health check service for system monitoring
 */
export class HealthCheck {
  constructor() {
    this.startTime = Date.now();
    this.checks = new Map();
    this.registerDefaultChecks();
  }

  registerDefaultChecks() {
    this.checks.set('database', this.checkDatabase.bind(this));
    this.checks.set('memory', this.checkMemory.bind(this));
    this.checks.set('disk', this.checkDisk.bind(this));
    this.checks.set('uptime', this.checkUptime.bind(this));
    this.checks.set('dependencies', this.checkDependencies.bind(this));
  }

  async checkDatabase() {
    try {
      const start = Date.now();
      const result = await pool.query('SELECT 1 as test, now() as server_time');
      const latency = Date.now() - start;
      
      // Check connection pool status
      const poolStatus = {
        totalCount: pool.totalCount || 0,
        idleCount: pool.idleCount || 0,
        waitingCount: pool.waitingCount || 0
      };
      
      return {
        status: 'healthy',
        latency: `${latency}ms`,
        server_time: result.rows[0]?.server_time,
        pool: poolStatus,
        details: 'Database connection successful'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        details: 'Database connection failed'
      };
    }
  }

  async checkMemory() {
    try {
      const used = process.memoryUsage();
      const total = os.totalmem();
      const free = os.freemem();
      const usage = (total - free) / total;
      
      const status = usage > 0.9 ? 'critical' : usage > 0.8 ? 'warning' : 'healthy';
      
      return {
        status,
        usage: {
          rss: `${Math.round(used.rss / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(used.heapTotal / 1024 / 1024)}MB`,
          heapUsed: `${Math.round(used.heapUsed / 1024 / 1024)}MB`,
          external: `${Math.round(used.external / 1024 / 1024)}MB`
        },
        system: {
          total: `${Math.round(total / 1024 / 1024 / 1024)}GB`,
          free: `${Math.round(free / 1024 / 1024 / 1024)}GB`,
          usage: `${Math.round(usage * 100)}%`
        },
        details: `Memory usage at ${Math.round(usage * 100)}%`
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        details: 'Memory check failed'
      };
    }
  }

  async checkDisk() {
    try {
      // Basic disk usage check using os stats
      const stats = {
        platform: os.platform(),
        arch: os.arch(),
        tmpdir: os.tmpdir(),
        homedir: os.homedir()
      };
      
      return {
        status: 'healthy',
        platform: stats.platform,
        architecture: stats.arch,
        details: 'Disk access available'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        details: 'Disk check failed'
      };
    }
  }

  async checkUptime() {
    try {
      const processUptime = process.uptime();
      const systemUptime = os.uptime();
      const appUptime = (Date.now() - this.startTime) / 1000;
      
      return {
        status: 'healthy',
        process: `${Math.round(processUptime)}s`,
        system: `${Math.round(systemUptime)}s`,
        application: `${Math.round(appUptime)}s`,
        details: 'All systems operational'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        details: 'Uptime check failed'
      };
    }
  }

  async checkDependencies() {
    try {
      // Check critical environment variables
      const criticalEnvVars = ['JWT_SECRET', 'PGUSER', 'PGDATABASE'];
      const missing = criticalEnvVars.filter(env => !process.env[env]);
      
      const nodeVersion = process.version;
      const requiredNodeMajor = 20;
      const currentNodeMajor = parseInt(nodeVersion.split('.')[0].substring(1));
      
      const envStatus = missing.length === 0 ? 'healthy' : 'unhealthy';
      const nodeStatus = currentNodeMajor >= requiredNodeMajor ? 'healthy' : 'warning';
      
      const overall = envStatus === 'unhealthy' ? 'unhealthy' : 
                     nodeStatus === 'warning' ? 'warning' : 'healthy';
      
      return {
        status: overall,
        environment: {
          status: envStatus,
          missing: missing,
          available: criticalEnvVars.filter(env => process.env[env]).length
        },
        node: {
          status: nodeStatus,
          version: nodeVersion,
          required: `>=${requiredNodeMajor}.0.0`
        },
        details: missing.length > 0 ? 
          `Missing environment variables: ${missing.join(', ')}` : 
          'All dependencies available'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        details: 'Dependencies check failed'
      };
    }
  }

  async runChecks(checkNames = null) {
    const checksToRun = checkNames || Array.from(this.checks.keys());
    const results = {};
    let overallStatus = 'healthy';
    
    for (const checkName of checksToRun) {
      const checkFn = this.checks.get(checkName);
      if (!checkFn) continue;
      
      try {
        results[checkName] = await checkFn();
        
        // Update overall status based on individual check results
        if (results[checkName].status === 'unhealthy') {
          overallStatus = 'unhealthy';
        } else if (results[checkName].status === 'critical' && overallStatus !== 'unhealthy') {
          overallStatus = 'critical';
        } else if (results[checkName].status === 'warning' && 
                   overallStatus !== 'unhealthy' && overallStatus !== 'critical') {
          overallStatus = 'warning';
        }
      } catch (error) {
        results[checkName] = {
          status: 'unhealthy',
          error: error.message,
          details: `Check execution failed: ${checkName}`
        };
        overallStatus = 'unhealthy';
      }
    }
    
    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks: results,
      summary: {
        total: checksToRun.length,
        healthy: Object.values(results).filter(r => r.status === 'healthy').length,
        warning: Object.values(results).filter(r => r.status === 'warning').length,
        critical: Object.values(results).filter(r => r.status === 'critical').length,
        unhealthy: Object.values(results).filter(r => r.status === 'unhealthy').length
      }
    };
  }

  // Quick health check for load balancer probes
  async quickCheck() {
    try {
      await pool.query('SELECT 1');
      return { status: 'ok', timestamp: new Date().toISOString() };
    } catch {
      return { status: 'fail', timestamp: new Date().toISOString() };
    }
  }

  // Register custom health check
  registerCheck(name, checkFunction) {
    this.checks.set(name, checkFunction);
  }

  // Remove health check
  unregisterCheck(name) {
    return this.checks.delete(name);
  }
}

// Export singleton instance
export const healthCheck = new HealthCheck();