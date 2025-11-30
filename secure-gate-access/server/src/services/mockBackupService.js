#!/usr/bin/env node
/**
 * Mock Database Backup Service for Testing
 * Provides mock backup functionality for testing environments
 */

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MockBackupService {
  constructor() {
    this.dbConfig = {
      host: process.env.PGHOST || process.env.DB_HOST || 'localhost',
      port: process.env.PGPORT || process.env.DB_PORT || 5432,
      database: process.env.PGDATABASE || process.env.DB_NAME || 'secure_gate',
      user: process.env.PGUSER || process.env.DB_USER || 'postgres',  // Standardized to postgres
      password: process.env.PGPASSWORD || process.env.DB_PASSWORD || 'postgres',  // Standardized default
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    };
    
    this.pool = new Pool(this.dbConfig);
    this.backupDir = path.join(__dirname, '../../backups');
    this.retentionDays = parseInt(process.env.BACKUP_RETENTION_DAYS) || 30;
    
    // Ensure backup directory exists
    this.ensureBackupDirectory();
  }

  /**
   * Ensure backup directory exists
   */
  ensureBackupDirectory() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      console.log(`📁 Created backup directory: ${this.backupDir}`);
    }
  }

  /**
   * Create a full database backup (mock)
   */
  async createFullBackup(options = {}) {
    const backupId = this.generateBackupId();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `full_backup_${timestamp}_${backupId}.sql`;
    const filePath = path.join(this.backupDir, fileName);
    
    console.log(`🔄 Creating full backup: ${fileName}`);
    
    try {
      // Log backup start
      await this.logBackupStart(backupId, 'full', filePath);
      
      const startTime = Date.now();
      
      // Create mock backup content
      const mockBackupContent = this.generateMockBackupContent('full', options);
      fs.writeFileSync(filePath, mockBackupContent);
      
      const duration = Date.now() - startTime;
      const fileSize = fs.statSync(filePath).size;
      
      // Log backup completion
      await this.logBackupCompletion(backupId, 'completed', fileSize, duration);
      
      console.log(`✅ Full backup completed: ${fileName} (${this.formatFileSize(fileSize)}, ${duration}ms)`);
      
      return {
        backupId,
        fileName,
        filePath,
        fileSize,
        duration,
        type: 'full'
      };
      
    } catch (error) {
      console.error(`❌ Full backup failed: ${error.message}`);
      await this.logBackupCompletion(backupId, 'failed', 0, 0, error.message);
      throw error;
    }
  }

  /**
   * Create an incremental backup (mock)
   */
  async createIncrementalBackup(options = {}) {
    const backupId = this.generateBackupId();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `incremental_backup_${timestamp}_${backupId}.tar`;
    const filePath = path.join(this.backupDir, fileName);
    
    console.log(`🔄 Creating incremental backup: ${fileName}`);
    
    try {
      // Log backup start
      await this.logBackupStart(backupId, 'incremental', filePath);
      
      const startTime = Date.now();
      
      // Create mock backup content
      const mockBackupContent = this.generateMockBackupContent('incremental', options);
      fs.writeFileSync(filePath, mockBackupContent);
      
      const duration = Date.now() - startTime;
      const fileSize = fs.statSync(filePath).size;
      
      // Log backup completion
      await this.logBackupCompletion(backupId, 'completed', fileSize, duration);
      
      console.log(`✅ Incremental backup completed: ${fileName} (${this.formatFileSize(fileSize)}, ${duration}ms)`);
      
      return {
        backupId,
        fileName,
        filePath,
        fileSize,
        duration,
        type: 'incremental'
      };
      
    } catch (error) {
      console.error(`❌ Incremental backup failed: ${error.message}`);
      await this.logBackupCompletion(backupId, 'failed', 0, 0, error.message);
      throw error;
    }
  }

  /**
   * Create a data-only backup (mock)
   */
  async createDataBackup(options = {}) {
    const backupId = this.generateBackupId();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `data_backup_${timestamp}_${backupId}.sql`;
    const filePath = path.join(this.backupDir, fileName);
    
    console.log(`🔄 Creating data backup: ${fileName}`);
    
    try {
      // Log backup start
      await this.logBackupStart(backupId, 'data', filePath);
      
      const startTime = Date.now();
      
      // Create mock backup content
      const mockBackupContent = this.generateMockBackupContent('data', options);
      fs.writeFileSync(filePath, mockBackupContent);
      
      const duration = Date.now() - startTime;
      const fileSize = fs.statSync(filePath).size;
      
      // Log backup completion
      await this.logBackupCompletion(backupId, 'completed', fileSize, duration);
      
      console.log(`✅ Data backup completed: ${fileName} (${this.formatFileSize(fileSize)}, ${duration}ms)`);
      
      return {
        backupId,
        fileName,
        filePath,
        fileSize,
        duration,
        type: 'data'
      };
      
    } catch (error) {
      console.error(`❌ Data backup failed: ${error.message}`);
      await this.logBackupCompletion(backupId, 'failed', 0, 0, error.message);
      throw error;
    }
  }

  /**
   * Restore database from backup (mock)
   */
  async restoreFromBackup(backupPath, options = {}) {
    console.log(`🔄 Restoring database from: ${backupPath}`);
    
    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup file not found: ${backupPath}`);
    }

    try {
      const startTime = Date.now();
      
      // Log restore start
      const restoreId = this.generateBackupId();
      await this.logRestoreStart(restoreId, backupPath);
      
      // Simulate restore process
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const duration = Date.now() - startTime;
      
      // Log restore completion
      await this.logRestoreCompletion(restoreId, 'completed', duration);
      
      console.log(`✅ Database restored successfully (${duration}ms)`);
      
      return {
        restoreId,
        backupPath,
        duration,
        status: 'completed'
      };
      
    } catch (error) {
      console.error(`❌ Database restore failed: ${error.message}`);
      await this.logRestoreCompletion(restoreId, 'failed', 0, error.message);
      throw error;
    }
  }

  /**
   * List all available backups
   */
  async listBackups(options = {}) {
    try {
      const client = await this.pool.connect();
      
      let query = `
        SELECT 
          backup_id,
          backup_type,
          file_path,
          file_size,
          duration,
          status,
          created_at,
          completed_at,
          error_message
        FROM backup_log
        WHERE 1=1
      `;
      
      const params = [];
      let paramCount = 0;
      
      if (options.type) {
        paramCount++;
        query += ` AND backup_type = $${paramCount}`;
        params.push(options.type);
      }
      
      if (options.status) {
        paramCount++;
        query += ` AND status = $${paramCount}`;
        params.push(options.status);
      }
      
      if (options.limit) {
        query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1}`;
        params.push(options.limit);
      } else {
        query += ` ORDER BY created_at DESC`;
      }
      
      const result = await client.query(query, params);
      client.release();
      
      return result.rows;
      
    } catch (error) {
      console.error(`❌ Failed to list backups: ${error.message}`);
      throw error;
    }
  }

  /**
   * Clean up old backups
   */
  async cleanupOldBackups() {
    console.log(`🧹 Cleaning up backups older than ${this.retentionDays} days`);
    
    try {
      const client = await this.pool.connect();
      
      // Get old backups
      const oldBackups = await client.query(`
        SELECT backup_id, file_path, created_at
        FROM backup_log
        WHERE created_at < NOW() - INTERVAL '${this.retentionDays} days'
        AND status = 'completed'
      `);
      
      let deletedCount = 0;
      let totalSize = 0;
      
      for (const backup of oldBackups.rows) {
        try {
          // Delete file if it exists
          if (fs.existsSync(backup.file_path)) {
            const stats = fs.statSync(backup.file_path);
            totalSize += stats.size;
            fs.unlinkSync(backup.file_path);
          }
          
          // Delete database record
          await client.query('DELETE FROM backup_log WHERE backup_id = $1', [backup.backup_id]);
          deletedCount++;
          
        } catch (fileError) {
          console.warn(`⚠️  Failed to delete backup file: ${backup.file_path} - ${fileError.message}`);
        }
      }
      
      client.release();
      
      console.log(`✅ Cleanup completed: ${deletedCount} backups deleted, ${this.formatFileSize(totalSize)} freed`);
      
      return {
        deletedCount,
        totalSize,
        retentionDays: this.retentionDays
      };
      
    } catch (error) {
      console.error(`❌ Cleanup failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get backup statistics
   */
  async getBackupStatistics() {
    try {
      const client = await this.pool.connect();
      
      const stats = await client.query(`
        SELECT 
          backup_type,
          status,
          COUNT(*) as count,
          SUM(file_size) as total_size,
          AVG(duration) as avg_duration,
          MIN(created_at) as oldest_backup,
          MAX(created_at) as newest_backup
        FROM backup_log
        GROUP BY backup_type, status
        ORDER BY backup_type, status
      `);
      
      const totalStats = await client.query(`
        SELECT 
          COUNT(*) as total_backups,
          SUM(file_size) as total_size,
          AVG(duration) as avg_duration
        FROM backup_log
        WHERE status = 'completed'
      `);
      
      client.release();
      
      return {
        byType: stats.rows,
        totals: totalStats.rows[0]
      };
      
    } catch (error) {
      console.error(`❌ Failed to get backup statistics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate mock backup content
   */
  generateMockBackupContent(type, options = {}) {
    const timestamp = new Date().toISOString();
    let content = `-- Mock ${type} backup\n`;
    content += `-- Generated: ${timestamp}\n`;
    content += `-- Options: ${JSON.stringify(options)}\n\n`;
    
    if (type === 'full') {
      content += `-- Full database backup\n`;
      content += `CREATE DATABASE secure_gate;\n`;
      content += `\\c secure_gate;\n\n`;
      content += `-- Users table\n`;
      content += `CREATE TABLE users (\n`;
      content += `  id SERIAL PRIMARY KEY,\n`;
      content += `  username VARCHAR(100) UNIQUE NOT NULL,\n`;
      content += `  email VARCHAR(255) UNIQUE NOT NULL,\n`;
      content += `  password_hash VARCHAR(255) NOT NULL,\n`;
      content += `  role VARCHAR(50) NOT NULL,\n`;
      content += `  created_at TIMESTAMP DEFAULT NOW()\n`;
      content += `);\n\n`;
      content += `-- Sample data\n`;
      content += `INSERT INTO users (username, email, password_hash, role) VALUES\n`;
      content += `  ('admin', 'admin@example.com', '$2b$10$hash', 'admin'),\n`;
      content += `  ('user1', 'user1@example.com', '$2b$10$hash', 'resident');\n`;
    } else if (type === 'incremental') {
      content += `-- Incremental backup (WAL files)\n`;
      content += `-- This would contain WAL segments\n`;
    } else if (type === 'data') {
      content += `-- Data-only backup\n`;
      content += `INSERT INTO users (username, email, password_hash, role) VALUES\n`;
      content += `  ('admin', 'admin@example.com', '$2b$10$hash', 'admin'),\n`;
      content += `  ('user1', 'user1@example.com', '$2b$10$hash', 'resident');\n`;
    }
    
    return content;
  }

  /**
   * Log backup start
   */
  async logBackupStart(backupId, backupType, filePath) {
    try {
      const client = await this.pool.connect();
      await client.query(`
        INSERT INTO backup_log (backup_id, backup_type, file_path, status, created_at)
        VALUES ($1, $2, $3, 'pending', NOW())
      `, [backupId, backupType, filePath]);
      client.release();
    } catch (error) {
      console.warn(`⚠️  Failed to log backup start: ${error.message}`);
    }
  }

  /**
   * Log backup completion
   */
  async logBackupCompletion(backupId, status, fileSize, duration, errorMessage = null) {
    try {
      const client = await this.pool.connect();
      await client.query(`
        UPDATE backup_log 
        SET status = $1, file_size = $2, duration = $3, completed_at = NOW(), error_message = $4
        WHERE backup_id = $5
      `, [status, fileSize, duration, errorMessage, backupId]);
      client.release();
    } catch (error) {
      console.warn(`⚠️  Failed to log backup completion: ${error.message}`);
    }
  }

  /**
   * Log restore start
   */
  async logRestoreStart(restoreId, backupPath) {
    try {
      const client = await this.pool.connect();
      await client.query(`
        INSERT INTO dr_recovery_log (recovery_id, backup_path, status, started_at)
        VALUES ($1, $2, 'in_progress', NOW())
      `, [restoreId, backupPath]);
      client.release();
    } catch (error) {
      console.warn(`⚠️  Failed to log restore start: ${error.message}`);
    }
  }

  /**
   * Log restore completion
   */
  async logRestoreCompletion(restoreId, status, duration, errorMessage = null) {
    try {
      const client = await this.pool.connect();
      await client.query(`
        UPDATE dr_recovery_log 
        SET status = $1, duration = $2, completed_at = NOW(), error_message = $3
        WHERE recovery_id = $4
      `, [status, duration, errorMessage, restoreId]);
      client.release();
    } catch (error) {
      console.warn(`⚠️  Failed to log restore completion: ${error.message}`);
    }
  }

  /**
   * Generate unique backup ID
   */
  generateBackupId() {
    return crypto.randomBytes(8).toString('hex');
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes) {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Close database connection
   */
  async close() {
    await this.pool.end();
  }
}

export default MockBackupService;




