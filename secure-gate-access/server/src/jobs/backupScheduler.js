#!/usr/bin/env node
/**
 * Automated Backup Scheduler
 * Handles scheduled backup operations using cron-like functionality
 */

import BackupService from '../services/backupService.js';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

class BackupScheduler {
  constructor() {
    this.backupService = new BackupService();
    this.dbConfig = {
      host: process.env.PGHOST || process.env.DB_HOST || 'localhost',
      port: process.env.PGPORT || process.env.DB_PORT || 5432,
      database: process.env.PGDATABASE || process.env.DB_NAME || 'secure_gate',
      user: process.env.PGUSER || process.env.DB_USER || 'postgres',  // Standardized to postgres
      password: process.env.PGPASSWORD || process.env.DB_PASSWORD || 'postgres',  // Standardized default
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    };
    
    this.pool = new Pool(this.dbConfig);
    this.isRunning = false;
    this.schedules = new Map();
    
    // Default backup schedules
    this.defaultSchedules = {
      full: {
        interval: 24 * 60 * 60 * 1000, // 24 hours
        lastRun: null,
        enabled: true,
        options: { compress: true }
      },
      incremental: {
        interval: 6 * 60 * 60 * 1000, // 6 hours
        lastRun: null,
        enabled: true,
        options: { compress: true }
      },
      data: {
        interval: 12 * 60 * 60 * 1000, // 12 hours
        lastRun: null,
        enabled: false,
        options: {}
      }
    };
    
    this.loadSchedules();
  }

  /**
   * Load backup schedules from database
   */
  async loadSchedules() {
    try {
      const client = await this.pool.connect();
      
      // Check if backup_schedules table exists, if not create it
      await this.ensureSchedulesTable(client);
      
      // Load schedules from database
      const result = await client.query(`
        SELECT schedule_type, interval_ms, enabled, options, last_run
        FROM backup_schedules
        ORDER BY schedule_type
      `);
      
      client.release();
      
      // Initialize schedules
      for (const row of result.rows) {
        this.schedules.set(row.schedule_type, {
          interval: row.interval_ms,
          lastRun: row.last_run ? new Date(row.last_run) : null,
          enabled: row.enabled,
          options: row.options || {}
        });
      }
      
      // Add default schedules if none exist
      for (const [type, schedule] of Object.entries(this.defaultSchedules)) {
        if (!this.schedules.has(type)) {
          this.schedules.set(type, schedule);
          await this.saveSchedule(type, schedule);
        }
      }
      
      console.log(`📅 Loaded ${this.schedules.size} backup schedules`);
      
    } catch (error) {
      console.error(`❌ Failed to load backup schedules: ${error.message}`);
      // Fallback to default schedules
      for (const [type, schedule] of Object.entries(this.defaultSchedules)) {
        this.schedules.set(type, schedule);
      }
    }
  }

  /**
   * Ensure backup_schedules table exists
   */
  async ensureSchedulesTable(client) {
    await client.query(`
      CREATE TABLE IF NOT EXISTS backup_schedules (
        id SERIAL PRIMARY KEY,
        schedule_type VARCHAR(50) NOT NULL UNIQUE,
        interval_ms BIGINT NOT NULL,
        enabled BOOLEAN NOT NULL DEFAULT true,
        options JSONB DEFAULT '{}',
        last_run TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);
  }

  /**
   * Save schedule to database
   */
  async saveSchedule(type, schedule) {
    try {
      const client = await this.pool.connect();
      
      await client.query(`
        INSERT INTO backup_schedules (schedule_type, interval_ms, enabled, options, last_run)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (schedule_type) 
        DO UPDATE SET 
          interval_ms = $2,
          enabled = $3,
          options = $4,
          last_run = $5,
          updated_at = NOW()
      `, [type, schedule.interval, schedule.enabled, JSON.stringify(schedule.options), schedule.lastRun]);
      
      client.release();
      
    } catch (error) {
      console.error(`❌ Failed to save schedule for ${type}: ${error.message}`);
    }
  }

  /**
   * Start the backup scheduler
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️  Backup scheduler is already running');
      return;
    }
    
    this.isRunning = true;
    console.log('🚀 Starting backup scheduler...');
    
    // Check for scheduled backups every minute
    this.intervalId = setInterval(() => {
      this.checkScheduledBackups();
    }, 60 * 1000);
    
    // Initial check
    this.checkScheduledBackups();
  }

  /**
   * Stop the backup scheduler
   */
  stop() {
    if (!this.isRunning) {
      console.log('⚠️  Backup scheduler is not running');
      return;
    }
    
    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    console.log('🛑 Backup scheduler stopped');
  }

  /**
   * Check for scheduled backups
   */
  async checkScheduledBackups() {
    if (!this.isRunning) {
      return;
    }
    
    const now = new Date();
    
    for (const [type, schedule] of this.schedules.entries()) {
      if (!schedule.enabled) {
        continue;
      }
      
      const shouldRun = this.shouldRunBackup(schedule, now);
      
      if (shouldRun) {
        console.log(`⏰ Running scheduled ${type} backup...`);
        
        try {
          await this.runScheduledBackup(type, schedule.options);
          
          // Update last run time
          schedule.lastRun = now;
          await this.saveSchedule(type, schedule);
          
        } catch (error) {
          console.error(`❌ Scheduled ${type} backup failed: ${error.message}`);
        }
      }
    }
  }

  /**
   * Determine if a backup should run
   */
  shouldRunBackup(schedule, now) {
    if (!schedule.lastRun) {
      return true; // First run
    }
    
    const timeSinceLastRun = now.getTime() - schedule.lastRun.getTime();
    return timeSinceLastRun >= schedule.interval;
  }

  /**
   * Run a scheduled backup
   */
  async runScheduledBackup(type, options) {
    switch (type) {
      case 'full':
        await this.backupService.createFullBackup(options);
        break;
      case 'incremental':
        await this.backupService.createIncrementalBackup(options);
        break;
      case 'data':
        await this.backupService.createDataBackup(options);
        break;
      default:
        throw new Error(`Unknown backup type: ${type}`);
    }
  }

  /**
   * Add or update a backup schedule
   */
  async addSchedule(type, intervalMs, enabled = true, options = {}) {
    const schedule = {
      interval: intervalMs,
      lastRun: null,
      enabled,
      options
    };
    
    this.schedules.set(type, schedule);
    await this.saveSchedule(type, schedule);
    
    console.log(`📅 Added schedule for ${type} backup (${intervalMs}ms interval)`);
  }

  /**
   * Remove a backup schedule
   */
  async removeSchedule(type) {
    this.schedules.delete(type);
    
    try {
      const client = await this.pool.connect();
      await client.query('DELETE FROM backup_schedules WHERE schedule_type = $1', [type]);
      client.release();
      
      console.log(`🗑️  Removed schedule for ${type} backup`);
      
    } catch (error) {
      console.error(`❌ Failed to remove schedule for ${type}: ${error.message}`);
    }
  }

  /**
   * Get all schedules
   */
  getSchedules() {
    const schedules = {};
    for (const [type, schedule] of this.schedules.entries()) {
      schedules[type] = {
        interval: schedule.interval,
        lastRun: schedule.lastRun,
        enabled: schedule.enabled,
        options: schedule.options
      };
    }
    return schedules;
  }

  /**
   * Enable/disable a schedule
   */
  async toggleSchedule(type, enabled) {
    const schedule = this.schedules.get(type);
    if (!schedule) {
      throw new Error(`Schedule not found: ${type}`);
    }
    
    schedule.enabled = enabled;
    await this.saveSchedule(type, schedule);
    
    console.log(`${enabled ? '✅' : '❌'} ${enabled ? 'Enabled' : 'Disabled'} schedule for ${type} backup`);
  }

  /**
   * Run cleanup of old backups
   */
  async runCleanup() {
    console.log('🧹 Running scheduled backup cleanup...');
    
    try {
      const result = await this.backupService.cleanupOldBackups();
      console.log(`✅ Cleanup completed: ${result.deletedCount} backups deleted, ${this.backupService.formatFileSize(result.totalSize)} freed`);
      
      return result;
      
    } catch (error) {
      console.error(`❌ Backup cleanup failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      running: this.isRunning,
      schedules: this.getSchedules(),
      nextRun: this.getNextRunTime()
    };
  }

  /**
   * Get next scheduled run time
   */
  getNextRunTime() {
    const now = new Date();
    let nextRun = null;
    
    for (const [type, schedule] of this.schedules.entries()) {
      if (!schedule.enabled) {
        continue;
      }
      
      const lastRun = schedule.lastRun || new Date(0);
      const nextRunForType = new Date(lastRun.getTime() + schedule.interval);
      
      if (!nextRun || nextRunForType < nextRun) {
        nextRun = nextRunForType;
      }
    }
    
    return nextRun;
  }

  /**
   * Close database connection
   */
  async close() {
    this.stop();
    await this.pool.end();
  }
}

export default BackupScheduler;




