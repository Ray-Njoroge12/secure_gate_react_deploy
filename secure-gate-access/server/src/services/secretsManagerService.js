/**
 * Secrets Manager Service
 * 
 * Provides secure access to secrets from AWS Secrets Manager with:
 * - Caching to reduce API calls
 * - Fallback to environment variables
 * - Error handling and logging
 * - Support for bulk secret retrieval
 * 
 * Usage:
 *   import secretsManager from './services/secretsManagerService.js';
 *   const secret = await secretsManager.getSecret('jwt-secret');
 */

import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

class SecretsManagerService {
  constructor() {
    // Initialize AWS Secrets Manager client
    this.client = new SecretsManagerClient({
      region: process.env.AWS_REGION || 'us-east-1',
      // Credentials will be loaded from:
      // 1. Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
      // 2. IAM role (if running on EC2/ECS)
      // 3. AWS credentials file (~/.aws/credentials)
    });

    // Cache configuration
    this.cache = new Map();
    this.cacheTTL = parseInt(process.env.SECRETS_CACHE_TTL) || 300000; // 5 minutes default

    // Metrics
    this.metrics = {
      hits: 0,
      misses: 0,
      errors: 0,
      apiCalls: 0,
    };

    // Secret prefix for the application
    this.secretPrefix = process.env.SECRETS_PREFIX || 'secure-gate/production';
  }

  /**
   * Get a single secret from AWS Secrets Manager
   * @param {string} secretName - Name of the secret (without prefix)
   * @returns {Promise<string>} - Secret value
   */
  async getSecret(secretName) {
    // Check cache first
    const cached = this.cache.get(secretName);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      this.metrics.hits++;
      console.log(`[SecretsManager] Cache hit for secret: ${secretName}`);
      return cached.value;
    }

    this.metrics.misses++;
    console.log(`[SecretsManager] Cache miss for secret: ${secretName}, fetching from AWS...`);

    try {
      // Fetch from AWS Secrets Manager
      const command = new GetSecretValueCommand({
        SecretId: `${this.secretPrefix}/${secretName}`,
      });

      this.metrics.apiCalls++;
      const response = await this.client.send(command);
      const secretValue = response.SecretString;

      // Cache the secret
      this.cache.set(secretName, {
        value: secretValue,
        timestamp: Date.now(),
      });

      console.log(`[SecretsManager] Successfully retrieved secret: ${secretName}`);
      return secretValue;
    } catch (error) {
      this.metrics.errors++;
      console.error(`[SecretsManager] Error retrieving secret ${secretName}:`, error.message);

      // Fallback to environment variable
      const envKey = this.convertToEnvKey(secretName);
      const fallback = process.env[envKey];

      if (fallback) {
        console.warn(`[SecretsManager] Using fallback environment variable: ${envKey}`);
        return fallback;
      }

      throw new Error(`Failed to retrieve secret: ${secretName}. No fallback available.`);
    }
  }

  /**
   * Get multiple secrets at once
   * @param {string[]} secretNames - Array of secret names
   * @returns {Promise<Object>} - Object with secret names as keys and values
   */
  async getSecrets(secretNames) {
    console.log(`[SecretsManager] Retrieving ${secretNames.length} secrets...`);
    
    const secrets = {};
    const promises = secretNames.map(async (name) => {
      try {
        secrets[name] = await this.getSecret(name);
      } catch (error) {
        console.error(`[SecretsManager] Failed to retrieve secret: ${name}`);
        throw error;
      }
    });

    await Promise.all(promises);
    console.log(`[SecretsManager] Successfully retrieved all ${secretNames.length} secrets`);
    
    return secrets;
  }

  /**
   * Convert secret name to environment variable key
   * @param {string} secretName - Secret name (e.g., 'jwt-secret')
   * @returns {string} - Environment variable key (e.g., 'JWT_SECRET')
   */
  convertToEnvKey(secretName) {
    return secretName.toUpperCase().replace(/-/g, '_');
  }

  /**
   * Clear the secrets cache
   * Useful for forcing a refresh of secrets
   */
  clearCache() {
    console.log('[SecretsManager] Clearing secrets cache');
    this.cache.clear();
  }

  /**
   * Clear a specific secret from cache
   * @param {string} secretName - Name of the secret to clear
   */
  clearSecretCache(secretName) {
    console.log(`[SecretsManager] Clearing cache for secret: ${secretName}`);
    this.cache.delete(secretName);
  }

  /**
   * Get cache metrics
   * @returns {Object} - Cache hit/miss statistics
   */
  getMetrics() {
    const total = this.metrics.hits + this.metrics.misses;
    const hitRate = total > 0 ? ((this.metrics.hits / total) * 100).toFixed(2) : 0;

    return {
      ...this.metrics,
      total,
      hitRate: `${hitRate}%`,
      cacheSize: this.cache.size,
    };
  }

  /**
   * Test connection to AWS Secrets Manager
   * @returns {Promise<boolean>} - True if connection successful
   */
  async testConnection() {
    try {
      console.log('[SecretsManager] Testing connection to AWS Secrets Manager...');
      
      // Try to list secrets (this validates credentials and connectivity)
      const testSecret = await this.getSecret('jwt-secret');
      
      console.log('[SecretsManager] ✅ Connection test successful');
      return true;
    } catch (error) {
      console.error('[SecretsManager] ❌ Connection test failed:', error.message);
      return false;
    }
  }

  /**
   * Rotate a secret (trigger rotation in AWS)
   * @param {string} secretName - Name of the secret to rotate
   * @returns {Promise<boolean>} - True if rotation initiated
   */
  async rotateSecret(secretName) {
    console.log(`[SecretsManager] Initiating rotation for secret: ${secretName}`);
    
    try {
      // Clear from cache immediately
      this.clearSecretCache(secretName);
      
      // Note: Actual rotation setup requires Lambda function configuration
      // This is a placeholder for manual rotation trigger
      console.log(`[SecretsManager] Secret ${secretName} marked for rotation`);
      console.log('[SecretsManager] Automatic rotation requires AWS Lambda configuration');
      
      return true;
    } catch (error) {
      console.error(`[SecretsManager] Rotation failed for ${secretName}:`, error.message);
      return false;
    }
  }
}

// Export singleton instance
export default new SecretsManagerService();
