/**
 * Vault Service for Secure Gate Access Control System
 * 
 * Provides secure secrets management using HashiCorp Vault
 * Features:
 * - Dynamic secret generation
 * - Secret rotation
 * - Encryption/decryption
 * - Policy-based access control
 * - Audit logging
 */

import vault from 'node-vault';
import loggingService from './loggingService.js';
import crypto from 'crypto';

class VaultService {
  constructor() {
    this.client = null;
    this.isInitialized = false;
    this.retryAttempts = 3;
    this.retryDelay = 1000;
    
    // Vault configuration
    this.config = {
      apiVersion: 'v1',
      endpoint: process.env.VAULT_ADDR || 'http://vault:8200',
      token: process.env.VAULT_TOKEN || process.env.VAULT_ROOT_TOKEN,
      timeout: 30000,
      retry: {
        retries: 3,
        retryDelay: 1000
      }
    };
    
    this.initializeService();
  }

  /**
   * Initialize Vault service
   */
  async initializeService() {
    try {
      // Create Vault client
      this.client = vault({
        apiVersion: this.config.apiVersion,
        endpoint: this.config.endpoint,
        token: this.config.token,
        timeout: this.config.timeout
      });

      // Test connection
      await this.testConnection();
      
      this.isInitialized = true;
      
      loggingService.logInfo('Vault service initialized successfully', {
        endpoint: this.config.endpoint,
        apiVersion: this.config.apiVersion
      });
      
    } catch (error) {
      loggingService.logError('Failed to initialize Vault service', error);
      throw error;
    }
  }

  /**
   * Test Vault connection
   */
  async testConnection() {
    try {
      const status = await this.client.status();
      
      if (!status.initialized) {
        throw new Error('Vault is not initialized');
      }
      
      if (status.sealed) {
        throw new Error('Vault is sealed');
      }
      
      loggingService.logInfo('Vault connection test successful', {
        version: status.version,
        initialized: status.initialized,
        sealed: status.sealed
      });
      
    } catch (error) {
      loggingService.logError('Vault connection test failed', error);
      throw error;
    }
  }

  /**
   * Get secret from Vault
   */
  async getSecret(path, options = {}) {
    if (!this.isInitialized) {
      throw new Error('Vault service not initialized');
    }

    try {
      const fullPath = `secure-gate/data/${path}`;
      
      loggingService.logInfo('Retrieving secret from Vault', {
        path: fullPath,
        options
      });

      const response = await this.client.read(fullPath);
      
      if (!response.data || !response.data.data) {
        throw new Error(`Secret not found at path: ${fullPath}`);
      }

      const secret = response.data.data;
      
      loggingService.logInfo('Secret retrieved successfully', {
        path: fullPath,
        keys: Object.keys(secret)
      });

      return secret;

    } catch (error) {
      loggingService.logError('Failed to retrieve secret from Vault', error, {
        path,
        options
      });
      throw error;
    }
  }

  /**
   * Store secret in Vault
   */
  async storeSecret(path, data, options = {}) {
    if (!this.isInitialized) {
      throw new Error('Vault service not initialized');
    }

    try {
      const fullPath = `secure-gate/data/${path}`;
      
      loggingService.logInfo('Storing secret in Vault', {
        path: fullPath,
        keys: Object.keys(data)
      });

      await this.client.write(fullPath, { data });
      
      loggingService.logInfo('Secret stored successfully', {
        path: fullPath
      });

    } catch (error) {
      loggingService.logError('Failed to store secret in Vault', error, {
        path,
        dataKeys: Object.keys(data)
      });
      throw error;
    }
  }

  /**
   * Get database credentials
   */
  async getDatabaseCredentials() {
    try {
      const secret = await this.getSecret('database');
      
      return {
        host: secret.host,
        port: secret.port,
        database: secret.database,
        username: secret.username,
        password: secret.password,
        sslMode: secret.ssl_mode
      };
      
    } catch (error) {
      loggingService.logError('Failed to get database credentials from Vault', error);
      throw error;
    }
  }

  /**
   * Get JWT configuration
   */
  async getJWTConfig() {
    try {
      const secret = await this.getSecret('jwt');
      
      return {
        secret: secret.secret,
        refreshSecret: secret.refresh_secret,
        algorithm: secret.algorithm,
        accessTokenTTL: secret.access_token_ttl,
        refreshTokenTTL: secret.refresh_token_ttl
      };
      
    } catch (error) {
      loggingService.logError('Failed to get JWT config from Vault', error);
      throw error;
    }
  }

  /**
   * Get API keys
   */
  async getAPIKeys() {
    try {
      const secret = await this.getSecret('api');
      
      return {
        sendgridKey: secret.sendgrid_key,
        redisUrl: secret.redis_url
      };
      
    } catch (error) {
      loggingService.logError('Failed to get API keys from Vault', error);
      throw error;
    }
  }

  /**
   * Get application configuration
   */
  async getAppConfig() {
    try {
      const secret = await this.getSecret('config');
      
      return {
        environment: secret.environment,
        logLevel: secret.log_level,
        maxFileSize: secret.max_file_size,
        sessionTimeout: secret.session_timeout,
        rateLimit: secret.rate_limit,
        encryptionEnabled: secret.encryption_enabled
      };
      
    } catch (error) {
      loggingService.logError('Failed to get app config from Vault', error);
      throw error;
    }
  }

  /**
   * Get security settings
   */
  async getSecuritySettings() {
    try {
      const secret = await this.getSecret('security');
      
      return {
        passwordMinLength: secret.password_min_length,
        passwordRequireSpecial: secret.password_require_special,
        passwordRequireNumbers: secret.password_require_numbers,
        passwordRequireUppercase: secret.password_require_uppercase,
        mfaRequired: secret.mfa_required,
        sessionTimeout: secret.session_timeout,
        maxLoginAttempts: secret.max_login_attempts
      };
      
    } catch (error) {
      loggingService.logError('Failed to get security settings from Vault', error);
      throw error;
    }
  }

  /**
   * Encrypt data using Vault Transit
   */
  async encryptData(data, keyName = 'secure-gate-key') {
    if (!this.isInitialized) {
      throw new Error('Vault service not initialized');
    }

    try {
      const plaintext = Buffer.from(JSON.stringify(data)).toString('base64');
      
      const response = await this.client.write(`transit/encrypt/${keyName}`, {
        plaintext: plaintext
      });
      
      const encryptedData = response.data.ciphertext;
      
      loggingService.logInfo('Data encrypted successfully', {
        keyName,
        dataType: typeof data
      });
      
      return encryptedData;
      
    } catch (error) {
      loggingService.logError('Failed to encrypt data using Vault', error, {
        keyName,
        dataType: typeof data
      });
      throw error;
    }
  }

  /**
   * Decrypt data using Vault Transit
   */
  async decryptData(encryptedData, keyName = 'secure-gate-key') {
    if (!this.isInitialized) {
      throw new Error('Vault service not initialized');
    }

    try {
      const response = await this.client.write(`transit/decrypt/${keyName}`, {
        ciphertext: encryptedData
      });
      
      const plaintext = Buffer.from(response.data.plaintext, 'base64').toString();
      const data = JSON.parse(plaintext);
      
      loggingService.logInfo('Data decrypted successfully', {
        keyName,
        dataType: typeof data
      });
      
      return data;
      
    } catch (error) {
      loggingService.logError('Failed to decrypt data using Vault', error, {
        keyName
      });
      throw error;
    }
  }

  /**
   * Generate dynamic database credentials
   */
  async generateDatabaseCredentials(role = 'secure-gate-role') {
    try {
      const response = await this.client.read(`database/creds/${role}`);
      
      const credentials = {
        username: response.data.username,
        password: response.data.password,
        leaseId: response.lease_id,
        leaseDuration: response.lease_duration,
        renewable: response.renewable
      };
      
      loggingService.logInfo('Dynamic database credentials generated', {
        role,
        username: credentials.username,
        leaseDuration: credentials.leaseDuration
      });
      
      return credentials;
      
    } catch (error) {
      loggingService.logError('Failed to generate dynamic database credentials', error, {
        role
      });
      throw error;
    }
  }

  /**
   * Renew lease for dynamic credentials
   */
  async renewLease(leaseId) {
    try {
      const response = await this.client.write(`sys/renew/${leaseId}`);
      
      loggingService.logInfo('Lease renewed successfully', {
        leaseId,
        newDuration: response.lease_duration
      });
      
      return response;
      
    } catch (error) {
      loggingService.logError('Failed to renew lease', error, {
        leaseId
      });
      throw error;
    }
  }

  /**
   * Revoke lease for dynamic credentials
   */
  async revokeLease(leaseId) {
    try {
      await this.client.write(`sys/revoke/${leaseId}`);
      
      loggingService.logInfo('Lease revoked successfully', {
        leaseId
      });
      
    } catch (error) {
      loggingService.logError('Failed to revoke lease', error, {
        leaseId
      });
      throw error;
    }
  }

  /**
   * Rotate secret
   */
  async rotateSecret(path, newData) {
    try {
      // Store new secret version
      await this.storeSecret(path, newData);
      
      // Log rotation event
      loggingService.logInfo('Secret rotated successfully', {
        path,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      loggingService.logError('Failed to rotate secret', error, {
        path
      });
      throw error;
    }
  }

  /**
   * Get Vault health status
   */
  async getHealthStatus() {
    try {
      const status = await this.client.status();
      
      return {
        initialized: status.initialized,
        sealed: status.sealed,
        standby: status.standby,
        version: status.version,
        clusterName: status.cluster_name,
        clusterId: status.cluster_id
      };
      
    } catch (error) {
      loggingService.logError('Failed to get Vault health status', error);
      throw error;
    }
  }

  /**
   * List secrets
   */
  async listSecrets(path = '') {
    try {
      const fullPath = `secure-gate/metadata/${path}`;
      const response = await this.client.list(fullPath);
      
      return response.data.keys || [];
      
    } catch (error) {
      loggingService.logError('Failed to list secrets', error, {
        path
      });
      throw error;
    }
  }

  /**
   * Delete secret
   */
  async deleteSecret(path) {
    try {
      const fullPath = `secure-gate/data/${path}`;
      await this.client.delete(fullPath);
      
      loggingService.logInfo('Secret deleted successfully', {
        path: fullPath
      });
      
    } catch (error) {
      loggingService.logError('Failed to delete secret', error, {
        path
      });
      throw error;
    }
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      endpoint: this.config.endpoint,
      apiVersion: this.config.apiVersion,
      retryAttempts: this.retryAttempts
    };
  }
}

// Create singleton instance
const vaultService = new VaultService();

export default vaultService;
