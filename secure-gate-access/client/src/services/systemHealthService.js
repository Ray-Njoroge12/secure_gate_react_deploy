/**
 * System Health Service - Client
 * Handles communication with the backend health monitoring system
 */

import apiClient from '../utils/apiClient.js';

class SystemHealthService {
  constructor() {
    this.baseUrl = '/api/health';
    this.cache = new Map();
    this.cacheTimeout = 10000; // 10 seconds
  }

  /**
   * Get basic system health status
   */
  async getSystemHealth() {
    try {
      const cacheKey = 'system_health';
      const cached = this.getCachedData(cacheKey);

      if (cached) {
        return cached;
      }

      const response = await apiClient.get(`${this.baseUrl}/detailed`);

      this.setCachedData(cacheKey, response.data);
      return response.data;

    } catch (error) {
      console.error('Failed to fetch system health:', error);
      throw new Error(`Failed to fetch system health: ${error.message}`);
    }
  }

  /**
   * Get detailed health report
   */
  async getDetailedHealthReport() {
    try {
      const response = await apiClient.get(`${this.baseUrl}/detailed`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch detailed health report:', error);
      throw new Error(`Failed to fetch detailed health report: ${error.message}`);
    }
  }

  /**
   * Get health history
   */
  async getHealthHistory(limit = 50) {
    try {
      const response = await apiClient.get(`${this.baseUrl}/history`, {
        params: { limit }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch health history:', error);
      throw new Error(`Failed to fetch health history: ${error.message}`);
    }
  }

  /**
   * Get system metrics
   */
  async getSystemMetrics() {
    try {
      const cacheKey = 'system_metrics';
      const cached = this.getCachedData(cacheKey);

      if (cached) {
        return cached;
      }

      const response = await apiClient.get(`${this.baseUrl}/metrics`);

      this.setCachedData(cacheKey, response.data);
      return response.data;

    } catch (error) {
      console.error('Failed to fetch system metrics:', error);
      throw new Error(`Failed to fetch system metrics: ${error.message}`);
    }
  }

  /**
   * Get performance alerts
   */
  async getPerformanceAlerts(severity = null) {
    try {
      const params = {};
      if (severity) {
        params.severity = severity;
      }

      const response = await apiClient.get(`${this.baseUrl}/alerts`, { params });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch performance alerts:', error);
      throw new Error(`Failed to fetch performance alerts: ${error.message}`);
    }
  }

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(alertId) {
    try {
      const response = await apiClient.post(`${this.baseUrl}/alerts/${alertId}/acknowledge`);
      return response.data;
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
      throw new Error(`Failed to acknowledge alert: ${error.message}`);
    }
  }

  /**
   * Get launch readiness status
   */
  async getLaunchReadinessStatus() {
    try {
      const response = await apiClient.get(`${this.baseUrl}/launch-readiness`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch launch readiness status:', error);
      throw new Error(`Failed to fetch launch readiness status: ${error.message}`);
    }
  }

  /**
   * Trigger manual health check
   */
  async triggerHealthCheck() {
    try {
      const response = await apiClient.post(`${this.baseUrl}/check`);

      // Clear cache to force fresh data
      this.clearCache();

      return response.data;
    } catch (error) {
      console.error('Failed to trigger health check:', error);
      throw new Error(`Failed to trigger health check: ${error.message}`);
    }
  }

  /**
   * Get component-specific health
   */
  async getComponentHealth(componentName) {
    try {
      const response = await apiClient.get(`${this.baseUrl}/components/${componentName}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch ${componentName} health:`, error);
      throw new Error(`Failed to fetch ${componentName} health: ${error.message}`);
    }
  }

  /**
   * Subscribe to real-time health updates
   */
  subscribeToHealthUpdates(callback) {
    if (!window.EventSource) {
      console.warn('EventSource not supported, falling back to polling');
      return this.startPolling(callback);
    }

    try {
      const eventSource = new EventSource(`${this.baseUrl}/stream`);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          callback(data);
        } catch (error) {
          console.error('Failed to parse health update:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('Health update stream error:', error);
        eventSource.close();

        // Fallback to polling
        setTimeout(() => {
          this.startPolling(callback);
        }, 5000);
      };

      return {
        close: () => eventSource.close()
      };

    } catch (error) {
      console.error('Failed to establish health update stream:', error);
      return this.startPolling(callback);
    }
  }

  /**
   * Start polling for health updates (fallback)
   */
  startPolling(callback, interval = 30000) {
    const pollHealth = async () => {
      try {
        const health = await this.getSystemHealth();
        callback(health);
      } catch (error) {
        console.error('Health polling error:', error);
      }
    };

    // Initial call
    pollHealth();

    // Set up interval
    const intervalId = setInterval(pollHealth, interval);

    return {
      close: () => clearInterval(intervalId)
    };
  }

  /**
   * Get cached data
   */
  getCachedData(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  /**
   * Set cached data
   */
  setCachedData(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Format health status for display
   */
  formatHealthStatus(status) {
    const statusMap = {
      healthy: { text: 'Healthy', color: 'green', icon: 'check-circle' },
      degraded: { text: 'Degraded', color: 'yellow', icon: 'alert-triangle' },
      unhealthy: { text: 'Unhealthy', color: 'red', icon: 'x-circle' },
      unknown: { text: 'Unknown', color: 'gray', icon: 'help-circle' }
    };

    return statusMap[status] || statusMap.unknown;
  }

  /**
   * Calculate uptime percentage
   */
  calculateUptimePercentage(healthHistory) {
    if (!healthHistory || healthHistory.length === 0) {
      return 0;
    }

    const healthyChecks = healthHistory.filter(check => check.status === 'healthy').length;
    return Math.round((healthyChecks / healthHistory.length) * 100);
  }

  /**
   * Get health trend
   */
  getHealthTrend(healthHistory) {
    if (!healthHistory || healthHistory.length < 2) {
      return 'stable';
    }

    const recent = healthHistory.slice(-5);
    const healthyCount = recent.filter(check => check.status === 'healthy').length;
    const degradedCount = recent.filter(check => check.status === 'degraded').length;
    const unhealthyCount = recent.filter(check => check.status === 'unhealthy').length;

    if (unhealthyCount > degradedCount && unhealthyCount > healthyCount) {
      return 'declining';
    } else if (healthyCount > degradedCount && healthyCount > unhealthyCount) {
      return 'improving';
    } else {
      return 'stable';
    }
  }

  /**
   * Format response time
   */
  formatResponseTime(responseTime) {
    if (responseTime < 1000) {
      return `${responseTime}ms`;
    } else {
      return `${(responseTime / 1000).toFixed(1)}s`;
    }
  }

  /**
   * Format bytes
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get severity color
   */
  getSeverityColor(severity) {
    const colorMap = {
      low: 'blue',
      normal: 'green',
      warning: 'yellow',
      high: 'orange',
      critical: 'red',
      emergency: 'purple'
    };

    return colorMap[severity] || 'gray';
  }
}

export const systemHealthService = new SystemHealthService();