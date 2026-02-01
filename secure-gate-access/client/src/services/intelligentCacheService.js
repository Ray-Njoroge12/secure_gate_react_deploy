/**
 * @fileoverview Intelligent Cache Service
 * @description Implements intelligent preloading and caching strategies
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import performanceService from './performanceService.js';
import logger from '../utils/logger.js';

class IntelligentCacheService {
  constructor() {
    this.cache = new Map();
    this.preloadQueue = new Set();
    this.accessPatterns = new Map();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      preloadHits: 0,
      evictions: 0
    };
    
    // Configuration
    this.maxCacheSize = 100; // Maximum number of cached items
    this.maxCacheAge = 5 * 60 * 1000; // 5 minutes
    this.preloadThreshold = 0.7; // Preload when 70% likely to be accessed
    this.networkAwarePreloading = true;
    
    this.initializeService();
  }

  /**
   * Initialize the cache service
   */
  initializeService() {
    this.setupNetworkAwareness();
    this.setupAccessPatternTracking();
    this.setupCacheCleanup();
    
    logger.debug('[CACHE] Intelligent cache service initialized');
  }

  /**
   * Setup network awareness for adaptive caching
   */
  setupNetworkAwareness() {
    // Listen for network changes
    window.addEventListener('networkchange', (event) => {
      const { performanceLevel } = event.detail;
      this.adjustCacheStrategy(performanceLevel);
    });

    // Listen for connectivity changes
    window.addEventListener('connectivitychange', (event) => {
      const { isOnline } = event.detail;
      this.handleConnectivityChange(isOnline);
    });
  }

  /**
   * Setup access pattern tracking
   */
  setupAccessPatternTracking() {
    // Track page navigation patterns
    this.trackNavigationPatterns();
    
    // Track user interaction patterns
    this.trackInteractionPatterns();
  }

  /**
   * Track navigation patterns for predictive preloading
   */
  trackNavigationPatterns() {
    let currentPath = window.location.pathname;
    
    // Listen for route changes
    const trackNavigation = () => {
      const newPath = window.location.pathname;
      if (newPath !== currentPath) {
        this.recordNavigation(currentPath, newPath);
        currentPath = newPath;
      }
    };

    // Use both popstate and a periodic check for SPA navigation
    window.addEventListener('popstate', trackNavigation);
    setInterval(trackNavigation, 1000);
  }

  /**
   * Track interaction patterns
   */
  trackInteractionPatterns() {
    // Track clicks on links and buttons
    document.addEventListener('click', (event) => {
      const target = event.target.closest('a, button');
      if (target) {
        this.recordInteraction(target);
      }
    }, { passive: true });

    // Track hover events for preloading
    document.addEventListener('mouseover', (event) => {
      const target = event.target.closest('a');
      if (target && target.href) {
        this.considerPreloading(target.href);
      }
    }, { passive: true });
  }

  /**
   * Record navigation pattern
   */
  recordNavigation(fromPath, toPath) {
    const pattern = `${fromPath} -> ${toPath}`;
    
    if (!this.accessPatterns.has(fromPath)) {
      this.accessPatterns.set(fromPath, new Map());
    }
    
    const pathPatterns = this.accessPatterns.get(fromPath);
    const currentCount = pathPatterns.get(toPath) || 0;
    pathPatterns.set(toPath, currentCount + 1);
    
    // Trigger predictive preloading
    this.updatePreloadPredictions(fromPath);
    
    logger.debug(`[CACHE] Navigation pattern recorded: ${pattern}`);
  }

  /**
   * Record interaction pattern
   */
  recordInteraction(element) {
    const href = element.href || element.getAttribute('data-href');
    const action = element.getAttribute('data-action');
    
    if (href || action) {
      const key = href || action;
      const interactions = this.accessPatterns.get('interactions') || new Map();
      const currentCount = interactions.get(key) || 0;
      interactions.set(key, currentCount + 1);
      this.accessPatterns.set('interactions', interactions);
    }
  }

  /**
   * Consider preloading based on hover
   */
  considerPreloading(url) {
    const probability = this.calculatePreloadProbability(url);
    
    if (probability >= this.preloadThreshold) {
      this.preloadResource(url);
    }
  }

  /**
   * Calculate preload probability
   */
  calculatePreloadProbability(url) {
    const currentPath = window.location.pathname;
    const pathPatterns = this.accessPatterns.get(currentPath);
    
    if (!pathPatterns) return 0;
    
    const totalNavigations = Array.from(pathPatterns.values()).reduce((sum, count) => sum + count, 0);
    const urlNavigations = pathPatterns.get(url) || 0;
    
    return totalNavigations > 0 ? urlNavigations / totalNavigations : 0;
  }

  /**
   * Update preload predictions
   */
  updatePreloadPredictions(currentPath) {
    const pathPatterns = this.accessPatterns.get(currentPath);
    if (!pathPatterns) return;

    // Find most likely next destinations
    const sortedDestinations = Array.from(pathPatterns.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3); // Top 3 destinations

    sortedDestinations.forEach(([destination, count]) => {
      const probability = this.calculatePreloadProbability(destination);
      if (probability >= this.preloadThreshold) {
        this.preloadResource(destination);
      }
    });
  }

  /**
   * Preload resource
   */
  async preloadResource(url) {
    if (this.preloadQueue.has(url) || this.cache.has(url)) {
      return;
    }

    // Check network conditions
    if (this.networkAwarePreloading && !this.shouldPreloadOnCurrentNetwork()) {
      return;
    }

    this.preloadQueue.add(url);
    
    try {
      const startTime = performance.now();
      const response = await fetch(url, { 
        method: 'GET',
        headers: { 'X-Preload': 'true' }
      });
      
      if (response.ok) {
        const data = await response.json();
        const loadTime = performance.now() - startTime;
        
        this.set(url, data, { preloaded: true });
        
        performanceService.recordMetric('intelligent_cache', {
          type: 'preload',
          url,
          loadTime,
          success: true,
          timestamp: Date.now()
        });
        
        logger.debug(`[CACHE] Preloaded resource: ${url} in ${loadTime.toFixed(2)}ms`);
      }
    } catch (error) {
      logger.warn(`[CACHE] Failed to preload resource: ${url}`, error);
    } finally {
      this.preloadQueue.delete(url);
    }
  }

  /**
   * Check if preloading should occur on current network
   */
  shouldPreloadOnCurrentNetwork() {
    const networkCondition = performanceService.getCurrentNetworkCondition();
    
    if (!networkCondition) return true;
    
    const { effectiveType, saveData } = networkCondition;
    
    // Don't preload on slow networks or when data saver is enabled
    if (saveData || effectiveType === 'slow-2g' || effectiveType === '2g') {
      return false;
    }
    
    return true;
  }

  /**
   * Adjust cache strategy based on performance level
   */
  adjustCacheStrategy(performanceLevel) {
    const strategies = {
      low: {
        maxCacheSize: 50,
        maxCacheAge: 10 * 60 * 1000, // 10 minutes
        preloadThreshold: 0.9, // Very conservative
        networkAwarePreloading: true
      },
      medium: {
        maxCacheSize: 75,
        maxCacheAge: 7 * 60 * 1000, // 7 minutes
        preloadThreshold: 0.8,
        networkAwarePreloading: true
      },
      high: {
        maxCacheSize: 150,
        maxCacheAge: 3 * 60 * 1000, // 3 minutes
        preloadThreshold: 0.6,
        networkAwarePreloading: false
      }
    };

    const strategy = strategies[performanceLevel] || strategies.medium;
    
    Object.assign(this, strategy);
    
    // Adjust current cache size if needed
    if (this.cache.size > this.maxCacheSize) {
      this.evictOldestEntries(this.cache.size - this.maxCacheSize);
    }
    
    logger.info(`[CACHE] Adjusted strategy for ${performanceLevel} performance`, strategy);
  }

  /**
   * Handle connectivity changes
   */
  handleConnectivityChange(isOnline) {
    if (!isOnline) {
      // Stop all preloading when offline
      this.preloadQueue.clear();
    } else {
      // Resume intelligent preloading when back online
      this.updatePreloadPredictions(window.location.pathname);
    }
  }

  /**
   * Setup cache cleanup
   */
  setupCacheCleanup() {
    // Clean up expired entries every minute
    setInterval(() => {
      this.cleanupExpiredEntries();
    }, 60000);
  }

  /**
   * Get item from cache
   */
  get(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.cacheStats.misses++;
      return null;
    }
    
    // Check if entry is expired
    if (Date.now() - entry.timestamp > this.maxCacheAge) {
      this.cache.delete(key);
      this.cacheStats.misses++;
      return null;
    }
    
    // Update access time and count
    entry.lastAccessed = Date.now();
    entry.accessCount = (entry.accessCount || 0) + 1;
    
    // Track preload hits
    if (entry.metadata?.preloaded) {
      this.cacheStats.preloadHits++;
    }
    
    this.cacheStats.hits++;
    return entry.data;
  }

  /**
   * Set item in cache
   */
  set(key, data, metadata = {}) {
    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      this.evictOldestEntries(1);
    }
    
    const entry = {
      data,
      timestamp: Date.now(),
      lastAccessed: Date.now(),
      accessCount: 0,
      metadata
    };
    
    this.cache.set(key, entry);
    
    performanceService.recordMetric('intelligent_cache', {
      type: 'set',
      key,
      cacheSize: this.cache.size,
      timestamp: Date.now()
    });
  }

  /**
   * Delete item from cache
   */
  delete(key) {
    return this.cache.delete(key);
  }

  /**
   * Clear entire cache
   */
  clear() {
    this.cache.clear();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      preloadHits: 0,
      evictions: 0
    };
    
    logger.debug('[CACHE] Cache cleared');
  }

  /**
   * Evict oldest entries
   */
  evictOldestEntries(count) {
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed)
      .slice(0, count);
    
    entries.forEach(([key]) => {
      this.cache.delete(key);
      this.cacheStats.evictions++;
    });
  }

  /**
   * Clean up expired entries
   */
  cleanupExpiredEntries() {
    const now = Date.now();
    const expiredKeys = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.maxCacheAge) {
        expiredKeys.push(key);
      }
    }
    
    expiredKeys.forEach(key => {
      this.cache.delete(key);
    });
    
    if (expiredKeys.length > 0) {
      logger.debug(`[CACHE] Cleaned up ${expiredKeys.length} expired entries`);
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const totalRequests = this.cacheStats.hits + this.cacheStats.misses;
    const hitRate = totalRequests > 0 ? (this.cacheStats.hits / totalRequests) * 100 : 0;
    const preloadEffectiveness = this.cacheStats.hits > 0 ? 
      (this.cacheStats.preloadHits / this.cacheStats.hits) * 100 : 0;
    
    return {
      ...this.cacheStats,
      totalRequests,
      hitRate: hitRate.toFixed(2) + '%',
      preloadEffectiveness: preloadEffectiveness.toFixed(2) + '%',
      cacheSize: this.cache.size,
      maxCacheSize: this.maxCacheSize,
      preloadQueueSize: this.preloadQueue.size
    };
  }

  /**
   * Get access patterns
   */
  getAccessPatterns() {
    const patterns = {};
    
    for (const [path, destinations] of this.accessPatterns.entries()) {
      patterns[path] = Object.fromEntries(destinations);
    }
    
    return patterns;
  }

  /**
   * Export cache data for debugging
   */
  exportCacheData() {
    return {
      cache: Object.fromEntries(this.cache),
      stats: this.getStats(),
      patterns: this.getAccessPatterns(),
      preloadQueue: Array.from(this.preloadQueue)
    };
  }
}

// Create singleton instance
const intelligentCacheService = new IntelligentCacheService();

export default intelligentCacheService;
export { IntelligentCacheService };