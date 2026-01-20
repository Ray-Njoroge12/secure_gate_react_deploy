#!/usr/bin/env node
/**
 * Database Backup & Recovery Service
 * Provides comprehensive backup and disaster recovery capabilities
 */

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as crypto from 'crypto';
import { spawn } from 'child_process';
import dotenv from 'dotenv';
import os from 'os';
import { pipeline } from 'stream/promises';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKUP_IV_LENGTH = 16;
const BACKUP_AUTH_TAG_LENGTH = 16;

class BackupService {
  constructor() {
    this.dbConfig = {
      host: process.env.PGHOST || process.env.DB_HOST || 'localhost',
      port: process.env.PGPORT || process.env.DB_PORT || 5432,
      database: process.env.PGDATABASE || process.env.DB_NAME || 'secure_gate',
      user: process.env.PGUSER || process.env.DB_USER || 'postgres',  // Standardized to postgres
      password: process.env.PGPASSWORD ?? process.env.DB_PASSWORD ?? 'postgres',  // Allow empty password when configured
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    };

    this.dockerHost = process.env.BACKUP_DOCKER_HOST
      || (process.platform === 'darwin' ? 'host.docker.internal' : this.dbConfig.host);
    this.dockerImage = process.env.BACKUP_DOCKER_IMAGE
      || process.env.POSTGRES_DOCKER_IMAGE
      || 'postgres:14';
    
    this.pool = new Pool(this.dbConfig);
    this.backupDir = path.join(__dirname, '../../backups');
    this.retentionDays = parseInt(process.env.BACKUP_RETENTION_DAYS) || 30;
    this.backupEncryption = {
      enabled: process.env.BACKUP_ENCRYPTION_ENABLED === 'true' || !!process.env.BACKUP_ENCRYPTION_KEY,
      keepPlaintext: process.env.BACKUP_ENCRYPTION_KEEP_PLAINTEXT === 'true',
      key: process.env.BACKUP_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY || null
    };

    if (this.backupEncryption.enabled && !this.backupEncryption.key) {
      console.warn('⚠️  Backup encryption enabled but BACKUP_ENCRYPTION_KEY is not set; continuing without encryption.');
      this.backupEncryption.enabled = false;
    }
    
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

  async createPgPassFile() {
    const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'secure-gate-pgpass-'));
    const filePath = path.join(dir, 'pgpass');
    const entry = `${this.dockerHost}:${this.dbConfig.port}:${this.dbConfig.database}:${this.dbConfig.user}:${this.dbConfig.password}\n`;
    await fs.promises.writeFile(filePath, entry, { mode: 0o600 });

    return {
      filePath,
      cleanup: async () => {
        await fs.promises.rm(dir, { recursive: true, force: true });
      }
    };
  }

  getBackupEncryptionKey() {
    if (!this.backupEncryption.enabled) {
      return null;
    }
    if (!this.backupEncryption.key) {
      throw new Error('BACKUP_ENCRYPTION_KEY is required when backup encryption is enabled');
    }
    return crypto.createHash('sha256').update(this.backupEncryption.key).digest();
  }

  async encryptBackupFile(filePath) {
    const key = this.getBackupEncryptionKey();
    if (!key) {
      return filePath;
    }

    const iv = crypto.randomBytes(BACKUP_IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const outputPath = `${filePath}.enc`;
    const outputStream = fs.createWriteStream(outputPath, { mode: 0o600 });

    outputStream.write(iv);
    await pipeline(fs.createReadStream(filePath), cipher, outputStream);
    const authTag = cipher.getAuthTag();
    await fs.promises.appendFile(outputPath, authTag);

    if (!this.backupEncryption.keepPlaintext) {
      await fs.promises.unlink(filePath);
    }

    return outputPath;
  }

  async decryptBackupFile(encryptedPath) {
    const key = this.getBackupEncryptionKey();
    if (!key) {
      throw new Error('BACKUP_ENCRYPTION_KEY is required to decrypt encrypted backups');
    }

    const stats = await fs.promises.stat(encryptedPath);
    if (stats.size < BACKUP_IV_LENGTH + BACKUP_AUTH_TAG_LENGTH) {
      throw new Error('Encrypted backup file is too small to be valid');
    }

    const fileHandle = await fs.promises.open(encryptedPath, 'r');
    const iv = Buffer.alloc(BACKUP_IV_LENGTH);
    const authTag = Buffer.alloc(BACKUP_AUTH_TAG_LENGTH);

    try {
      await fileHandle.read(iv, 0, BACKUP_IV_LENGTH, 0);
      await fileHandle.read(authTag, 0, BACKUP_AUTH_TAG_LENGTH, stats.size - BACKUP_AUTH_TAG_LENGTH);
    } finally {
      await fileHandle.close();
    }

    const cipherTextStart = BACKUP_IV_LENGTH;
    const cipherTextEnd = stats.size - BACKUP_AUTH_TAG_LENGTH - 1;
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'secure-gate-restore-'));
    const outputPath = path.join(tempDir, path.basename(encryptedPath, '.enc'));

    await pipeline(
      fs.createReadStream(encryptedPath, { start: cipherTextStart, end: cipherTextEnd }),
      decipher,
      fs.createWriteStream(outputPath, { mode: 0o600 })
    );

    return {
      outputPath,
      cleanup: async () => {
        await fs.promises.rm(tempDir, { recursive: true, force: true });
      }
    };
  }

  async finalizeBackupFile(filePath) {
    if (!this.backupEncryption.enabled) {
      const fileSize = fs.statSync(filePath).size;
      return { filePath, fileSize, encrypted: false };
    }

    const encryptedPath = await this.encryptBackupFile(filePath);
    const fileSize = fs.statSync(encryptedPath).size;
    return { filePath: encryptedPath, fileSize, encrypted: true };
  }

  async prepareBackupForRestore(backupPath) {
    if (!backupPath.endsWith('.enc')) {
      return { path: backupPath, cleanup: async () => {} };
    }

    const decrypted = await this.decryptBackupFile(backupPath);
    return { path: decrypted.outputPath, cleanup: decrypted.cleanup };
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
        '--host', this.dockerHost,
        '--port', this.dbConfig.port,
        '--username', this.dbConfig.user,
        '--dbname', this.dbConfig.database,
        '--verbose',
        '--clean',
        '--create',
        '--if-exists',
        '--format', 'plain'
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
      
      const { filePath: finalPath, fileSize, encrypted } = await this.finalizeBackupFile(filePath);
      const duration = Date.now() - startTime;
      const finalName = path.basename(finalPath);
      
      // Log backup completion
      await this.logBackupCompletion(backupId, 'completed', fileSize, duration, null, finalPath);
      
      console.log(`✅ Full backup completed: ${finalName} (${this.formatFileSize(fileSize)}, ${duration}ms)`);
      
      return {
        backupId,
        fileName: finalName,
        filePath: finalPath,
        fileSize,
        duration,
        type: 'full',
        encrypted
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
      
      const { filePath: finalPath, fileSize, encrypted } = await this.finalizeBackupFile(filePath);
      const duration = Date.now() - startTime;
      const finalName = path.basename(finalPath);
      
      // Log backup completion
      await this.logBackupCompletion(backupId, 'completed', fileSize, duration, null, finalPath);
      
      console.log(`✅ Incremental backup completed: ${finalName} (${this.formatFileSize(fileSize)}, ${duration}ms)`);
      
      return {
        backupId,
        fileName: finalName,
        filePath: finalPath,
        fileSize,
        duration,
        type: 'incremental',
        encrypted
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
        '--host', this.dockerHost,
        '--port', this.dbConfig.port,
        '--username', this.dbConfig.user,
        '--dbname', this.dbConfig.database,
        '--verbose',
        '--data-only',
        '--format', 'plain'
      ];

      await this.executePgDump(pgDumpArgs, filePath);
      
      const { filePath: finalPath, fileSize, encrypted } = await this.finalizeBackupFile(filePath);
      const duration = Date.now() - startTime;
      const finalName = path.basename(finalPath);
      
      // Log backup completion
      await this.logBackupCompletion(backupId, 'completed', fileSize, duration, null, finalPath);
      
      console.log(`✅ Data backup completed: ${finalName} (${this.formatFileSize(fileSize)}, ${duration}ms)`);
      
      return {
        backupId,
        fileName: finalName,
        filePath: finalPath,
        fileSize,
        duration,
        type: 'data',
        encrypted
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

    let restoreId = null;
    let preparedBackup = null;

    try {
      const startTime = Date.now();
      
      // Log restore start
      restoreId = this.generateBackupId();
      await this.logRestoreStart(restoreId, backupPath);

      preparedBackup = await this.prepareBackupForRestore(backupPath);
      const restorePath = preparedBackup.path;

      // Determine backup type and restore accordingly
      if (restorePath.endsWith('.sql')) {
        await this.restoreFromSql(restorePath, options);
      } else if (restorePath.endsWith('.tar')) {
        await this.restoreFromTar(restorePath, options);
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
      if (restoreId) {
        await this.logRestoreCompletion(restoreId, 'failed', 0, error.message);
      }
      throw error;
    } finally {
      if (preparedBackup) {
        await preparedBackup.cleanup();
      }
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
    const pgPass = await this.createPgPassFile();

    return new Promise((resolve, reject) => {
      // Use Docker to run pg_dump
      const dockerArgs = [
        'run', '--rm',
        '--network', 'host',
        '-v', `${pgPass.filePath}:/tmp/pgpass:ro`,
        '-e', 'PGPASSFILE=/tmp/pgpass',
        this.dockerImage,
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
      
      const finalize = (handler) => {
        pgPass.cleanup().catch(() => {}).finally(handler);
      };

      docker.on('close', (code) => {
        writeStream.end();
        finalize(() => {
          if (code === 0) {
            resolve(stdout);
          } else {
            reject(new Error(`pg_dump failed with code ${code}: ${stderr}`));
          }
        });
      });
      
      docker.on('error', (error) => {
        writeStream.end();
        finalize(() => {
          reject(new Error(`pg_dump error: ${error.message}`));
        });
      });
    });
  }

  /**
   * Execute pg_basebackup command using Docker
   */
  async executePgBasebackup(outputPath, options = {}) {
    const pgPass = await this.createPgPassFile();

    return new Promise((resolve, reject) => {
      const args = [
        '--host', this.dockerHost,
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
        '-v', `${pgPass.filePath}:/tmp/pgpass:ro`,
        '-e', 'PGPASSFILE=/tmp/pgpass',
        '-v', `${path.dirname(outputPath)}:/backup`,
        this.dockerImage,
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

      const finalize = (handler) => {
        pgPass.cleanup().catch(() => {}).finally(handler);
      };
      
      docker.on('close', (code) => {
        finalize(() => {
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
      });
      
      docker.on('error', (error) => {
        finalize(() => {
          reject(new Error(`pg_basebackup error: ${error.message}`));
        });
      });
    });
  }

  /**
   * Restore from SQL backup using Docker
   */
  async restoreFromSql(backupPath, options = {}) {
    const pgPass = await this.createPgPassFile();

    return new Promise((resolve, reject) => {
      const restoreFileName = path.basename(backupPath);
      const args = [
        '--host', this.dockerHost,
        '--port', this.dbConfig.port,
        '--username', this.dbConfig.user,
        '--dbname', this.dbConfig.database,
        '--file', `/backup/${restoreFileName}`
      ];
      
      // Use Docker to run psql
      const dockerArgs = [
        'run', '--rm',
        '--network', 'host',
        '-v', `${pgPass.filePath}:/tmp/pgpass:ro`,
        '-e', 'PGPASSFILE=/tmp/pgpass',
        '-v', `${path.dirname(backupPath)}:/backup`,
        this.dockerImage,
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

      const finalize = (handler) => {
        pgPass.cleanup().catch(() => {}).finally(handler);
      };
      
      docker.on('close', (code) => {
        finalize(() => {
          if (code === 0) {
            resolve(stdout);
          } else {
            reject(new Error(`psql restore failed with code ${code}: ${stderr}`));
          }
        });
      });
      
      docker.on('error', (error) => {
        finalize(() => {
          reject(new Error(`psql restore error: ${error.message}`));
        });
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
    const pgPass = await this.createPgPassFile();

    return new Promise((resolve, reject) => {
      const args = [
        '--host', this.dockerHost,
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
        '-v', `${pgPass.filePath}:/tmp/pgpass:ro`,
        '-e', 'PGPASSFILE=/tmp/pgpass',
        '-v', `${extractedDir}:/backup`,
        this.dockerImage,
        'pg_restore',
        ...args
      ];

      const docker = spawn('docker', dockerArgs);

      let stderr = '';

      docker.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      const finalize = (handler) => {
        pgPass.cleanup().catch(() => {}).finally(handler);
      };

      docker.on('close', (code) => {
        finalize(() => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`pg_restore failed with code ${code}: ${stderr}`));
          }
        });
      });

      docker.on('error', (error) => {
        finalize(() => {
          reject(new Error(`pg_restore error: ${error.message}`));
        });
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
  async logBackupCompletion(backupId, status, fileSize, duration, errorMessage = null, filePath = null) {
    try {
      const client = await this.pool.connect();
      await client.query(`
        UPDATE backup_log 
        SET status = $1, file_size = $2, duration = $3, completed_at = NOW(), error_message = $4,
            file_path = COALESCE($5, file_path)
        WHERE backup_id = $6
      `, [status, fileSize, duration, errorMessage, filePath, backupId]);
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
        INSERT INTO dr_recovery_log (recovery_id, issue_type, severity, description, status, created_at)
        VALUES ($1, $2, $3, $4, 'in_progress', NOW())
      `, [
        restoreId,
        'backup_restore',
        'low',
        `Restore initiated for backup: ${backupPath}`
      ]);
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
      const resultPayload = {
        durationMs: duration,
        error: errorMessage || null
      };
      await client.query(`
        UPDATE dr_recovery_log 
        SET status = $1, result = $2, completed_at = NOW()
        WHERE recovery_id = $3
      `, [status, JSON.stringify(resultPayload), restoreId]);
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
