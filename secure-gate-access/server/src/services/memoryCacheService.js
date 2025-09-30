// server/src/services/memoryCacheService.js
import { EventEmitter } from 'events';

/**
 * In-Memory Cache Service (Fallback for Redis)
 * Provides basic caching functionality when Redis is unavailable
 */
class MemoryCacheService extends EventEmitter {
  constructor() {
    super();
    this.cache = new Map();
    this.timers = new Map();
    this.isConnected = true; // Always "connected" for memory cache
    this.cacheStats = {
      hits: 0,
      misses: 0,
      errors: 0,
      operations: 0
    };

    console.log('⚠️  Using in-memory cache (not recommended for production)');
  }

  /**
   * Initialize (no-op for memory cache)
   */
  async initialize() {
    console.log('✅ Memory cache initialized');
    this.emit('ready');
    return this;
  }

  /**
   * Set cache value with TTL
   */
  async set(key, value, ttlSeconds = 3600) {
    try {
      this.cacheStats.operations++;
      
      // Clear existing timer
      if (this.timers.has(key)) {
        clearTimeout(this.timers.get(key));
      }

      // Store value
      this.cache.set(key, value);

      // Set expiration timer
      const timer = setTimeout(() => {
        this.cache.delete(key);
        this.timers.delete(key);
      }, ttlSeconds * 1000);

      this.timers.set(key, timer);
      
      console.log(`[MEMORY CACHE] Set: ${key} (TTL: ${ttlSeconds}s)`);
      return true;
    } catch (error) {
      console.error('[MEMORY CACHE] Set error:', error.message);
      this.cacheStats.errors++;
      return false;
    }
  }

  /**
   * Get cache value
   */
  async get(key) {
    try {
      this.cacheStats.operations++;
      
      if (this.cache.has(key)) {
        this.cacheStats.hits++;
        console.log(`[MEMORY CACHE] Hit: ${key}`);
        return this.cache.get(key);
      } else {
        this.cacheStats.misses++;
        console.log(`[MEMORY CACHE] Miss: ${key}`);
        return null;
      }
    } catch (error) {
      console.error('[MEMORY CACHE] Get error:', error.message);
      this.cacheStats.errors++;
      this.cacheStats.misses++;
      return null;
    }
  }

  /**
   * Delete cache key
   */
  async delete(key) {
    try {
      this.cacheStats.operations++;
      
      // Clear timer
      if (this.timers.has(key)) {
        clearTimeout(this.timers.get(key));
        this.timers.delete(key);
      }

      const existed = this.cache.delete(key);
      console.log(`[MEMORY CACHE] Delete: ${key} (found: ${existed})`);
      return existed;
    } catch (error) {
      console.error('[MEMORY CACHE] Delete error:', error.message);
      this.cacheStats.errors++;
      return false;
    }
  }

  /**
   * Delete multiple keys by pattern
   */
  async deletePattern(pattern) {
    try {
      this.cacheStats.operations++;
      
      // Convert Redis pattern to regex
      const regex = new RegExp(
        '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
      );

      let deletedCount = 0;
      for (const [key] of this.cache) {
        if (regex.test(key)) {
          await this.delete(key);
          deletedCount++;
        }
      }

      console.log(`[MEMORY CACHE] Pattern delete: ${pattern} (${deletedCount} keys)`);
      return deletedCount;
    } catch (error) {
      console.error('[MEMORY CACHE] Pattern delete error:', error.message);
      this.cacheStats.errors++;
      return 0;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key) {
    try {
      this.cacheStats.operations++;
      return this.cache.has(key);
    } catch (error) {
      console.error('[MEMORY CACHE] Exists error:', error.message);
      this.cacheStats.errors++;
      return false;
    }
  }

  /**
   * Set TTL for existing key
   */
  async expire(key, ttlSeconds) {
    try {
      this.cacheStats.operations++;
      
      if (!this.cache.has(key)) {
        return false;
      }

      // Clear existing timer
      if (this.timers.has(key)) {
        clearTimeout(this.timers.get(key));
      }

      // Set new expiration timer
      const timer = setTimeout(() => {
        this.cache.delete(key);
        this.timers.delete(key);
      }, ttlSeconds * 1000);

      this.timers.set(key, timer);
      return true;
    } catch (error) {
      console.error('[MEMORY CACHE] Expire error:', error.message);
      this.cacheStats.errors++;
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate = this.cacheStats.operations > 0 
      ? (this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses) * 100).toFixed(2)
      : 0;

    return {
      ...this.cacheStats,
      hitRate: `${hitRate}%`,
      isConnected: true,
      type: 'memory',
      keys: this.cache.size,
      timers: this.timers.size
    };
  }

  /**
   * Reset cache statistics
   */
  resetStats() {
    this.cacheStats = {
      hits: 0,
      misses: 0,
      errors: 0,
      operations: 0
    };
  }

  /**
   * Health check
   */
  async healthCheck() {
    return {
      status: 'healthy',
      type: 'memory',
      stats: this.getStats(),
      warning: 'Using memory cache - not suitable for production'
    };
  }

  /**
   * Clear all cached data
   */
  clear() {
    try {
      // Clear all timers
      for (const timer of this.timers.values()) {
        clearTimeout(timer);
      }
      
      this.timers.clear();
      this.cache.clear();
      
      console.log('[MEMORY CACHE] Cache cleared');
      return true;
    } catch (error) {
      console.error('[MEMORY CACHE] Clear error:', error.message);
      return false;
    }
  }

  /**
   * Clear all cache
   */
  async shutdown() {
    this.clear();
  }
}

export default MemoryCacheService;