/**
 * Connection Monitor Utility
 * Monitors database connection pool usage during test execution
 *
 * Usage:
 * 1. In globalSetup.js:
 *    import { ConnectionMonitor } from '../utils/connectionMonitor.js';
 *    if (process.env.DEBUG_CONNECTIONS === 'true') {
 *      const monitor = new ConnectionMonitor(db);
 *      monitor.start();
 *      global.__CONN_MONITOR__ = monitor;
 *    }
 *
 * 2. In globalTeardown.js:
 *    if (global.__CONN_MONITOR__) {
 *      global.__CONN_MONITOR__.stop();
 *    }
 *
 * 3. Run tests with monitoring:
 *    DEBUG_CONNECTIONS=true npm test
 */

export class ConnectionMonitor {
  constructor(dbManager) {
    this.db = dbManager;
    this.snapshots = [];
    this.interval = null;
    this.warnings = [];
  }

  /**
   * Start monitoring connection pool
   * @param {number} intervalMs - Monitoring interval in milliseconds (default: 5000)
   */
  start(intervalMs = 5000) {
    console.log(`\n📊 Connection Monitor Started (interval: ${intervalMs}ms)\n`);

    this.interval = setInterval(() => {
      this.takeSnapshot();
    }, intervalMs);

    // Take initial snapshot
    this.takeSnapshot();
  }

  /**
   * Take a snapshot of current pool status
   */
  takeSnapshot() {
    try {
      const status = this.db.getStatus();

      const snapshot = {
        timestamp: new Date().toISOString(),
        totalCount: status.totalCount,
        idleCount: status.idleCount,
        waitingCount: status.waitingCount,
        queries: status.metrics?.queries || 0,
        errors: status.metrics?.errors || 0
      };

      this.snapshots.push(snapshot);

      // Log warnings for problematic conditions
      if (status.waitingCount > 0) {
        const warning = `⚠️  ${snapshot.timestamp}: Pool has ${status.waitingCount} waiting connections`;
        console.warn(warning);
        this.warnings.push(warning);
      }

      if (status.totalCount >= 38) {
        const warning = `⚠️  ${snapshot.timestamp}: Pool near capacity: ${status.totalCount}/40`;
        console.warn(warning);
        this.warnings.push(warning);
      }

      // Log normal status every 10 snapshots
      if (this.snapshots.length % 10 === 0) {
        console.log(`📊 [${snapshot.timestamp}] Pool: ${status.totalCount} total, ${status.idleCount} idle, ${status.waitingCount} waiting`);
      }
    } catch (error) {
      console.error('❌ Connection Monitor error:', error.message);
    }
  }

  /**
   * Stop monitoring and print report
   */
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    this.printReport();
  }

  /**
   * Print monitoring report
   */
  printReport() {
    if (this.snapshots.length === 0) {
      console.log('\nℹ️  No connection monitoring data available\n');
      return;
    }

    console.log('\n' + '='.repeat(70));
    console.log('📊 CONNECTION MONITOR REPORT');
    console.log('='.repeat(70));

    // Calculate statistics
    const maxTotal = Math.max(...this.snapshots.map(s => s.totalCount));
    const minTotal = Math.min(...this.snapshots.map(s => s.totalCount));
    const avgTotal = (this.snapshots.reduce((sum, s) => sum + s.totalCount, 0) / this.snapshots.length).toFixed(1);

    const maxWaiting = Math.max(...this.snapshots.map(s => s.waitingCount));
    const avgWaiting = (this.snapshots.reduce((sum, s) => sum + s.waitingCount, 0) / this.snapshots.length).toFixed(1);

    const maxIdle = Math.max(...this.snapshots.map(s => s.idleCount));
    const minIdle = Math.min(...this.snapshots.map(s => s.idleCount));
    const avgIdle = (this.snapshots.reduce((sum, s) => sum + s.idleCount, 0) / this.snapshots.length).toFixed(1);

    const totalQueries = this.snapshots[this.snapshots.length - 1]?.queries || 0;
    const totalErrors = this.snapshots[this.snapshots.length - 1]?.errors || 0;

    console.log('\n📈 POOL STATISTICS:');
    console.log(`  Total Snapshots: ${this.snapshots.length}`);
    console.log(`  Duration: ${this.getDuration()}`);
    console.log('');
    console.log(`  Active Connections:`);
    console.log(`    - Peak: ${maxTotal}/40 (${(maxTotal / 40 * 100).toFixed(1)}% capacity)`);
    console.log(`    - Average: ${avgTotal}`);
    console.log(`    - Minimum: ${minTotal}`);
    console.log('');
    console.log(`  Idle Connections:`);
    console.log(`    - Maximum: ${maxIdle}`);
    console.log(`    - Average: ${avgIdle}`);
    console.log(`    - Minimum: ${minIdle}`);
    console.log('');
    console.log(`  Waiting Connections:`);
    console.log(`    - Peak: ${maxWaiting}`);
    console.log(`    - Average: ${avgWaiting}`);
    console.log('');
    console.log(`  Query Metrics:`);
    console.log(`    - Total Queries: ${totalQueries}`);
    console.log(`    - Total Errors: ${totalErrors}`);
    console.log(`    - Success Rate: ${totalQueries > 0 ? ((totalQueries - totalErrors) / totalQueries * 100).toFixed(2) : 100}%`);

    // Health assessment
    console.log('\n🏥 HEALTH ASSESSMENT:');
    const healthIssues = [];

    if (maxTotal >= 40) {
      healthIssues.push('❌ Pool exhaustion detected (reached maximum capacity)');
    } else if (maxTotal >= 35) {
      healthIssues.push('⚠️  Pool stress detected (>87.5% capacity)');
    } else {
      console.log('  ✅ Pool capacity healthy (peak < 87.5%)');
    }

    if (maxWaiting > 5) {
      healthIssues.push(`⚠️  High wait queue detected (peak: ${maxWaiting} waiting)`);
    } else if (maxWaiting > 0) {
      console.log(`  ⚠️  Occasional waiting detected (peak: ${maxWaiting})`);
    } else {
      console.log('  ✅ No connection waiting');
    }

    if (totalErrors > totalQueries * 0.05) {
      healthIssues.push(`❌ High error rate (${(totalErrors / totalQueries * 100).toFixed(2)}%)`);
    } else {
      console.log(`  ✅ Low error rate (${totalErrors} errors)`);
    }

    if (healthIssues.length > 0) {
      console.log('\n⚠️  ISSUES DETECTED:');
      healthIssues.forEach(issue => console.log(`  ${issue}`));
    }

    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    if (maxTotal >= 35) {
      console.log('  • Consider increasing PGPOOL_MAX or reducing maxWorkers');
    }
    if (maxWaiting > 5) {
      console.log('  • High wait times detected - reduce test parallelism');
    }
    if (avgIdle > 20) {
      console.log('  • High idle count - pool may be over-provisioned');
    }
    if (healthIssues.length === 0) {
      console.log('  ✅ Pool configuration is optimal');
    }

    // Warning summary
    if (this.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS (' + this.warnings.length + ' total):');
      // Show first 5 and last 5 warnings if more than 10
      const warningsToShow = this.warnings.length > 10
        ? [...this.warnings.slice(0, 5), '  ...', ...this.warnings.slice(-5)]
        : this.warnings;
      warningsToShow.forEach(w => console.log(`  ${w}`));
    }

    console.log('\n' + '='.repeat(70) + '\n');
  }

  /**
   * Get monitoring duration as human-readable string
   */
  getDuration() {
    if (this.snapshots.length < 2) return 'N/A';

    const start = new Date(this.snapshots[0].timestamp);
    const end = new Date(this.snapshots[this.snapshots.length - 1].timestamp);
    const durationMs = end - start;

    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Get current snapshot (for external use)
   */
  getCurrentSnapshot() {
    return this.snapshots[this.snapshots.length - 1];
  }

  /**
   * Get all snapshots (for external analysis)
   */
  getAllSnapshots() {
    return [...this.snapshots];
  }
}

export default ConnectionMonitor;
