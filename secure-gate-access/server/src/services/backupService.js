#!/usr/bin/env node
/**
 * Database Backup & Recovery Service
 * Provides comprehensive backup and disaster recovery capabilities
 */

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { spawn } from 'child_process';
import dotenv from 'dotenv';
import os from 'os';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class BackupService {
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
   * Create a full database backup
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
      
      // Create pg_dump command
      const pgDumpArgs = [
        '--host', this.dbConfig.host,
        '--port', this.dbConfig.port,
        '--username', this.dbConfig.user,
        '--dbname', this.dbConfig.database,
        '--verbose',
        '--clean',
        '--create',
        '--if-exists',
        '--format', 'plain',
        '--file', filePath
      ];

      // Add compression if requested
      if (options.compress) {
        pgDumpArgs.push('--compress', '9');
      }

      // Add schema only if requested
      if (options.schemaOnly) {
        pgDumpArgs.push('--schema-only');
      }

      // Add data only if requested
      if (options.dataOnly) {
        pgDumpArgs.push('--data-only');
      }

      const startTime = Date.now();
      
      // Execute pg_dump
      await this.executePgDump(pgDumpArgs, filePath);
      
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
   * Create an incremental backup (WAL files)
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
      
      // Create WAL backup using pg_basebackup
      await this.executePgBasebackup(filePath, options);
      
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
   * Create a data-only backup (excludes schema)
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
      
      // Create data-only backup
      const pgDumpArgs = [
        '--host', this.dbConfig.host,
        '--port', this.dbConfig.port,
        '--username', this.dbConfig.user,
        '--dbname', this.dbConfig.database,
        '--verbose',
        '--data-only',
        '--format', 'plain',
        '--file', filePath
      ];

      await this.executePgDump(pgDumpArgs, filePath);
      
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
   * Restore database from backup
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
      
      // Determine backup type and restore accordingly
      if (backupPath.endsWith('.sql')) {
        await this.restoreFromSql(backupPath, options);
      } else if (backupPath.endsWith('.tar')) {
        await this.restoreFromTar(backupPath, options);
      } else {
        throw new Error('Unsupported backup format');
      }
      
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
   * Execute pg_dump command using Docker
   */
  async executePgDump(args, outputPath) {
    return new Promise((resolve, reject) => {
      // Use Docker to run pg_dump
      const dockerArgs = [
        'run', '--rm',
        '--network', 'host',
        '-e', `PGPASSWORD=${this.dbConfig.password}`,
        'postgres:13',
        'pg_dump',
        ...args
      ];
      
      const docker = spawn('docker', dockerArgs);
      
      let stdout = '';
      let stderr = '';
      
      // Write output to file (using fs imported at module level)
      const writeStream = fs.createWriteStream(outputPath);
      
      docker.stdout.pipe(writeStream);
      
      docker.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      docker.on('close', (code) => {
        writeStream.end();
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`pg_dump failed with code ${code}: ${stderr}`));
        }
      });
      
      docker.on('error', (error) => {
        writeStream.end();
        reject(new Error(`pg_dump error: ${error.message}`));
      });
    });
  }

  /**
   * Execute pg_basebackup command using Docker
   */
  async executePgBasebackup(outputPath, options = {}) {
    return new Promise((resolve, reject) => {
      const args = [
        '--host', this.dbConfig.host,
        '--port', this.dbConfig.port,
        '--username', this.dbConfig.user,
        '--pgdata', '/tmp/backup',
        '--format', 'tar',
        '--verbose'
      ];
      
      if (options.compress) {
        args.push('--gzip');
      }
      
      // Use Docker to run pg_basebackup
      const dockerArgs = [
        'run', '--rm',
        '--network', 'host',
        '-e', `PGPASSWORD=${this.dbConfig.password}`,
        '-v', `${path.dirname(outputPath)}:/backup`,
        'postgres:13',
        'pg_basebackup',
        ...args
      ];
      
      const docker = spawn('docker', dockerArgs);
      
      let stdout = '';
      let stderr = '';
      
      docker.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      docker.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      docker.on('close', (code) => {
        if (code === 0) {
          // Move the backup file to the correct location (using fs imported at module level)
          const sourcePath = path.join(path.dirname(outputPath), 'backup.tar');
          if (fs.existsSync(sourcePath)) {
            fs.renameSync(sourcePath, outputPath);
          }
          resolve(stdout);
        } else {
          reject(new Error(`pg_basebackup failed with code ${code}: ${stderr}`));
        }
      });
      
      docker.on('error', (error) => {
        reject(new Error(`pg_basebackup error: ${error.message}`));
      });
    });
  }

  /**
   * Restore from SQL backup using Docker
   */
  async restoreFromSql(backupPath, options = {}) {
    return new Promise((resolve, reject) => {
      const args = [
        '--host', this.dbConfig.host,
        '--port', this.dbConfig.port,
        '--username', this.dbConfig.user,
        '--dbname', this.dbConfig.database,
        '--verbose',
        '--file', '/backup/restore.sql'
      ];
      
      // Use Docker to run psql
      const dockerArgs = [
        'run', '--rm',
        '--network', 'host',
        '-e', `PGPASSWORD=${this.dbConfig.password}`,
        '-v', `${path.dirname(backupPath)}:/backup`,
        'postgres:13',
        'psql',
        ...args
      ];
      
      const docker = spawn('docker', dockerArgs);
      
      let stdout = '';
      let stderr = '';
      
      docker.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      docker.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      docker.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`psql restore failed with code ${code}: ${stderr}`));
        }
      });
      
      docker.on('error', (error) => {
        reject(new Error(`psql restore error: ${error.message}`));
      });
    });
  }

  /**
   * Restore from TAR backup
   */
  async restoreFromTar(backupPath, options = {}) {
    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup file not found: ${backupPath}`);
    }

    const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'secure-gate-tar-'));
    try {
      await this.extractTarArchive(backupPath, tempDir);

      const isCustomFormat = fs.existsSync(path.join(tempDir, 'toc.dat'));
      if (isCustomFormat) {
        await this.restoreFromCustomTar(tempDir);
        return { format: 'custom' };
      }

      const isBasebackup = fs.existsSync(path.join(tempDir, 'PG_VERSION')) || fs.existsSync(path.join(tempDir, 'base'));
      if (!isBasebackup) {
        throw new Error('Unrecognized TAR backup contents: missing toc.dat or PG_VERSION');
      }

      await this.restoreFromBasebackupDirectory(tempDir, options);
      return { format: 'basebackup', targetDir: options.pgDataDir || process.env.PGDATA };
    } finally {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    }
  }

  async extractTarArchive(backupPath, destinationDir) {
    return new Promise((resolve, reject) => {
      const tarProcess = spawn('tar', ['-xf', backupPath, '-C', destinationDir]);

      let stderr = '';

      tarProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      tarProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`tar extraction failed with code ${code}: ${stderr}`));
        }
      });

      tarProcess.on('error', (error) => {
        reject(new Error(`tar extraction error: ${error.message}`));
      });
    });
  }

  async restoreFromCustomTar(extractedDir) {
    return new Promise((resolve, reject) => {
      const args = [
        '--host', this.dbConfig.host,
        '--port', this.dbConfig.port,
        '--username', this.dbConfig.user,
        '--dbname', this.dbConfig.database,
        '--verbose',
        '--clean',
        '--if-exists',
        '--no-owner',
        '--format', 'directory',
        '/backup'
      ];

      const dockerArgs = [
        'run', '--rm',
        '--network', 'host',
        '-e', `PGPASSWORD=${this.dbConfig.password}`,
        '-v', `${extractedDir}:/backup`,
        'postgres:13',
        'pg_restore',
        ...args
      ];

      const docker = spawn('docker', dockerArgs);

      let stderr = '';

      docker.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      docker.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`pg_restore failed with code ${code}: ${stderr}`));
        }
      });

      docker.on('error', (error) => {
        reject(new Error(`pg_restore error: ${error.message}`));
      });
    });
  }

  async restoreFromBasebackupDirectory(sourceDir, options = {}) {
    const targetDir = options.pgDataDir || process.env.PGDATA;
    if (!targetDir) {
      throw new Error('PGDATA or options.pgDataDir must be set for basebackup restores');
    }

    await fs.promises.rm(targetDir, { recursive: true, force: true });
    await fs.promises.mkdir(targetDir, { recursive: true });
    await fs.promises.cp(sourceDir, targetDir, { recursive: true });
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

export default BackupService;
