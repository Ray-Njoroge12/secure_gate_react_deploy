#!/usr/bin/env node

/**
 * Audit Log Management Script
 * 
 * Provides utilities for managing audit logs including cleanup,
 * archival, and analysis of security events.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class AuditLogManager {
  constructor() {
    this.logDir = process.env.AUDIT_LOG_DIR || path.join(__dirname, '../logs');
    this.retentionDays = parseInt(process.env.AUDIT_RETENTION_DAYS || '90');
    this.archiveDir = process.env.AUDIT_ARCHIVE_DIR || path.join(this.logDir, 'archive');
  }

  /**
   * Clean up old audit logs
   */
  async cleanup() {
    try {
      console.log('🧹 Starting audit log cleanup...');
      
      if (!fs.existsSync(this.logDir)) {
        console.log('📋 No audit logs directory found');
        return;
      }

      const files = await fs.promises.readdir(this.logDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

      let cleanedCount = 0;
      let archivedCount = 0;

      for (const file of files) {
        if (!file.startsWith('security-audit-') || !file.endsWith('.log')) continue;
        
        const filePath = path.join(this.logDir, file);
        const stats = await fs.promises.stat(filePath);

        if (stats.mtime < cutoffDate) {
          // Archive before deletion if archive is enabled
          if (process.env.AUDIT_ARCHIVE_ENABLED === 'true') {
            await this.archiveFile(filePath, file);
            archivedCount++;
          }
          
          await fs.promises.unlink(filePath);
          cleanedCount++;
          console.log(`📄 Cleaned: ${file}`);
        }
      }

      console.log(`✅ Cleanup complete: ${cleanedCount} files cleaned, ${archivedCount} archived`);
      
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
      process.exit(1);
    }
  }

  /**
   * Archive audit log file
   */
  async archiveFile(filePath, filename) {
    try {
      // Ensure archive directory exists
      await fs.promises.mkdir(this.archiveDir, { recursive: true });
      
      // Compress file (simplified - in production use gzip)
      const archivePath = path.join(this.archiveDir, `${filename}.archived`);
      await fs.promises.copyFile(filePath, archivePath);
      
      console.log(`📦 Archived: ${filename}`);
    } catch (error) {
      console.error(`❌ Failed to archive ${filename}:`, error);
    }
  }

  /**
   * Analyze audit logs for security insights
   */
  async analyze() {
    try {
      console.log('🔍 Analyzing audit logs...');
      
      const files = await fs.promises.readdir(this.logDir);
      const auditFiles = files.filter(f => f.startsWith('security-audit-') && f.endsWith('.log'));
      
      if (auditFiles.length === 0) {
        console.log('📋 No audit logs found for analysis');
        return;
      }

      const analysis = {
        totalEvents: 0,
        eventsByType: {},
        eventsBySeverity: {},
        topIPs: {},
        suspiciousActivity: [],
        timeRange: { start: null, end: null }
      };

      for (const file of auditFiles) {
        const filePath = path.join(this.logDir, file);
        const content = await fs.promises.readFile(filePath, 'utf8');
        const lines = content.trim().split('\n').filter(line => line.length > 0);

        for (const line of lines) {
          try {
            const event = JSON.parse(line);
            this.analyzeEvent(event, analysis);
          } catch (error) {
            // Skip malformed lines
            continue;
          }
        }
      }

      this.printAnalysis(analysis);
      
    } catch (error) {
      console.error('❌ Analysis failed:', error);
      process.exit(1);
    }
  }

  /**
   * Analyze individual security event
   */
  analyzeEvent(event, analysis) {
    analysis.totalEvents++;

    // Event type analysis
    analysis.eventsByType[event.eventType] = (analysis.eventsByType[event.eventType] || 0) + 1;

    // Severity analysis
    analysis.eventsBySeverity[event.severity] = (analysis.eventsBySeverity[event.severity] || 0) + 1;

    // IP analysis
    if (event.ipAddress) {
      analysis.topIPs[event.ipAddress] = (analysis.topIPs[event.ipAddress] || 0) + 1;
    }

    // Time range
    const eventTime = new Date(event.timestamp);
    if (!analysis.timeRange.start || eventTime < analysis.timeRange.start) {
      analysis.timeRange.start = eventTime;
    }
    if (!analysis.timeRange.end || eventTime > analysis.timeRange.end) {
      analysis.timeRange.end = eventTime;
    }

    // Suspicious activity detection
    if (event.severity === 'HIGH' || event.riskScore > 50) {
      analysis.suspiciousActivity.push({
        timestamp: event.timestamp,
        eventType: event.eventType,
        ipAddress: event.ipAddress,
        userId: event.userId,
        riskScore: event.riskScore,
        details: event.data
      });
    }
  }

  /**
   * Print analysis results
   */
  printAnalysis(analysis) {
    console.log('\n📊 AUDIT LOG ANALYSIS REPORT');
    console.log('=' .repeat(50));
    
    console.log(`\n📋 Overview:`);
    console.log(`   Total Events: ${analysis.totalEvents}`);
    console.log(`   Time Range: ${analysis.timeRange.start?.toISOString()} - ${analysis.timeRange.end?.toISOString()}`);

    console.log(`\n📈 Events by Type:`);
    const sortedEventTypes = Object.entries(analysis.eventsByType)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);
    
    for (const [type, count] of sortedEventTypes) {
      console.log(`   ${type}: ${count}`);
    }

    console.log(`\n🚨 Events by Severity:`);
    for (const [severity, count] of Object.entries(analysis.eventsBySeverity)) {
      const emoji = severity === 'HIGH' ? '🔴' : severity === 'MEDIUM' ? '🟡' : '🟢';
      console.log(`   ${emoji} ${severity}: ${count}`);
    }

    console.log(`\n🌐 Top IP Addresses:`);
    const sortedIPs = Object.entries(analysis.topIPs)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);
    
    for (const [ip, count] of sortedIPs) {
      console.log(`   ${ip}: ${count} events`);
    }

    if (analysis.suspiciousActivity.length > 0) {
      console.log(`\n🚨 Suspicious Activity (${analysis.suspiciousActivity.length} events):`);
      const recentSuspicious = analysis.suspiciousActivity
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 5);
      
      for (const activity of recentSuspicious) {
        console.log(`   ${activity.timestamp} | ${activity.eventType} | IP: ${activity.ipAddress || 'unknown'} | Risk: ${activity.riskScore}`);
      }
    }

    console.log('\n✅ Analysis complete');
  }

  /**
   * Monitor audit logs in real-time
   */
  async monitor() {
    console.log('👀 Starting real-time audit log monitoring...');
    console.log('Press Ctrl+C to stop\n');

    const logFile = path.join(this.logDir, `security-audit-${this.getDateString()}.log`);
    
    if (!fs.existsSync(logFile)) {
      console.log(`📋 Waiting for log file: ${logFile}`);
    }

    // Watch for file changes
    fs.watchFile(logFile, { interval: 1000 }, async (curr, prev) => {
      if (curr.mtime > prev.mtime) {
        await this.displayRecentEvents(logFile, prev.size || 0);
      }
    });

    // Keep process alive
    process.on('SIGINT', () => {
      console.log('\n👋 Stopping monitor...');
      fs.unwatchFile(logFile);
      process.exit(0);
    });

    // Display existing events
    if (fs.existsSync(logFile)) {
      await this.displayRecentEvents(logFile, 0);
    }
  }

  /**
   * Display recent audit events
   */
  async displayRecentEvents(logFile, fromSize) {
    try {
      const stats = await fs.promises.stat(logFile);
      if (stats.size <= fromSize) return;

      const fd = await fs.promises.open(logFile, 'r');
      const buffer = Buffer.alloc(stats.size - fromSize);
      await fd.read(buffer, 0, buffer.length, fromSize);
      await fd.close();

      const lines = buffer.toString().trim().split('\n').filter(line => line.length > 0);
      
      for (const line of lines) {
        try {
          const event = JSON.parse(line);
          this.displayEvent(event);
        } catch (error) {
          // Skip malformed lines
        }
      }
    } catch (error) {
      console.error('❌ Error reading log file:', error);
    }
  }

  /**
   * Display formatted audit event
   */
  displayEvent(event) {
    const emoji = this.getSeverityEmoji(event.severity);
    const timestamp = new Date(event.timestamp).toLocaleString();
    const user = event.userId ? `User:${event.userId}` : 'Anonymous';
    const ip = event.ipAddress || 'unknown';
    
    console.log(`${emoji} [${timestamp}] ${event.eventType} | ${user} | IP:${ip}`);
    
    if (event.severity === 'HIGH') {
      console.log(`   Risk Score: ${event.riskScore} | Data:`, JSON.stringify(event.data, null, 2));
    }
  }

  /**
   * Get emoji for severity level
   */
  getSeverityEmoji(severity) {
    const emojis = {
      'LOW': '🟢',
      'MEDIUM': '🟡',
      'HIGH': '🔴'
    };
    return emojis[severity] || '📋';
  }

  /**
   * Get date string for file naming
   */
  getDateString() {
    return new Date().toISOString().split('T')[0];
  }
}

// CLI Interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const command = args[0];
  const manager = new AuditLogManager();

  switch (command) {
    case 'cleanup':
      await manager.cleanup();
      break;

    case 'analyze':
      await manager.analyze();
      break;

    case 'monitor':
      await manager.monitor();
      break;

    default:
      console.log('Audit Log Management Tool');
      console.log('');
      console.log('Usage:');
      console.log('  node manage-audit-logs.js cleanup   - Remove old audit log files');
      console.log('  node manage-audit-logs.js analyze   - Analyze audit logs for security insights');
      console.log('  node manage-audit-logs.js monitor   - Monitor audit logs in real-time');
      console.log('');
      console.log('Environment Variables:');
      console.log('  AUDIT_LOG_DIR         - Directory containing audit logs');
      console.log('  AUDIT_RETENTION_DAYS  - Days to retain logs (default: 90)');
      console.log('  AUDIT_ARCHIVE_ENABLED - Enable archiving before cleanup (true/false)');
      console.log('  AUDIT_ARCHIVE_DIR     - Archive directory path');
  }
}

export default AuditLogManager;