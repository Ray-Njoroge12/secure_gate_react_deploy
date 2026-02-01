/**
 * Auto Scaling Service
 * Handles automatic resource scaling and intelligent capacity management
 */

import loggingService from './loggingService.js';
import performanceMonitoringService from './performanceMonitoringService.js';
import performanceAlertingService from './performanceAlertingService.js';

class AutoScalingService {
  constructor() {
    this.scalingPolicies = new Map();
    this.scalingHistory = [];
    this.isEnabled = process.env.AUTO_SCALING_ENABLED === 'true';
    this.scalingInterval = null;
    this.cooldownPeriod = 5 * 60 * 1000; // 5 minutes
    this.lastScalingAction = null;

    // Default scaling thresholds
    this.thresholds = {
      cpu: {
        scaleUp: 0.7,    // 70% CPU usage
        scaleDown: 0.3,  // 30% CPU usage
        duration: 300    // 5 minutes sustained
      },
      memory: {
        scaleUp: 0.8,    // 80% memory usage
        scaleDown: 0.4,  // 40% memory usage
        duration: 300    // 5 minutes sustained
      },
      responseTime: {
        scaleUp: 2000,   // 2 seconds average response time
        scaleDown: 500,  // 500ms average response time
        duration: 180    // 3 minutes sustained
      },
      errorRate: {
        scaleUp: 0.05,   // 5% error rate
        duration: 120    // 2 minutes sustained
      },
      connections: {
        scaleUp: 0.8,    // 80% of max connections
        scaleDown: 0.3,  // 30% of max connections
        duration: 300    // 5 minutes sustained
      }
    };

    // Scaling limits
    this.limits = {
      minInstances: parseInt(process.env.MIN_INSTANCES) || 2,
      maxInstances: parseInt(process.env.MAX_INSTANCES) || 10,
      minCpuCores: 1,
      maxCpuCores: 8,
      minMemoryGB: 1,
      maxMemoryGB: 16
    };

    this.currentCapacity = {
      instances: 2,
      cpuCores: 2,
      memoryGB: 4
    };
  }

  /**
   * Initialize auto scaling service
   */
  async initialize() {
    if (!this.isEnabled) {
      loggingService.logInfo('Auto scaling is disabled');
      return;
    }

    try {
      // Load scaling policies
      await this.loadScalingPolicies();

      // Start monitoring
      await this.startMonitoring();

      loggingService.logInfo('Auto scaling service initialized', {
        enabled: this.isEnabled,
        thresholds: this.thresholds,
        limits: this.limits,
        currentCapacity: this.currentCapacity
      });

    } catch (error) {
      loggingService.logError('Failed to initialize auto scaling service', error);
      throw error;
    }
  }

  /**
   * Load scaling policies from configuration
   */
  async loadScalingPolicies() {
    // CPU-based scaling policy
    this.scalingPolicies.set('cpu_scaling', {
      name: 'CPU-based Scaling',
      metric: 'cpu_usage',
      enabled: true,
      scaleUpThreshold: this.thresholds.cpu.scaleUp,
      scaleDownThreshold: this.thresholds.cpu.scaleDown,
      evaluationPeriod: this.thresholds.cpu.duration,
      scalingAction: 'horizontal', // horizontal or vertical
      priority: 1
    });

    // Memory-based scaling policy
    this.scalingPolicies.set('memory_scaling', {
      name: 'Memory-based Scaling',
      metric: 'memory_usage',
      enabled: true,
      scaleUpThreshold: this.thresholds.memory.scaleUp,
      scaleDownThreshold: this.thresholds.memory.scaleDown,
      evaluationPeriod: this.thresholds.memory.duration,
      scalingAction: 'vertical',
      priority: 2
    });

    // Response time-based scaling policy
    this.scalingPolicies.set('response_time_scaling', {
      name: 'Response Time-based Scaling',
      metric: 'response_time',
      enabled: true,
      scaleUpThreshold: this.thresholds.responseTime.scaleUp,
      scaleDownThreshold: this.thresholds.responseTime.scaleDown,
      evaluationPeriod: this.thresholds.responseTime.duration,
      scalingAction: 'horizontal',
      priority: 3
    });

    // Error rate-based scaling policy
    this.scalingPolicies.set('error_rate_scaling', {
      name: 'Error Rate-based Scaling',
      metric: 'error_rate',
      enabled: true,
      scaleUpThreshold: this.thresholds.errorRate.scaleUp,
      scaleDownThreshold: 0, // Only scale up on errors
      evaluationPeriod: this.thresholds.errorRate.duration,
      scalingAction: 'horizontal',
      priority: 4
    });

    // Database connection-based scaling policy
    this.scalingPolicies.set('connection_scaling', {
      name: 'Database Connection-based Scaling',
      metric: 'db_connections',
      enabled: true,
      scaleUpThreshold: this.thresholds.connections.scaleUp,
      scaleDownThreshold: this.thresholds.connections.scaleDown,
      evaluationPeriod: this.thresholds.connections.duration,
      scalingAction: 'horizontal',
      priority: 5
    });
  }

  /**
   * Start monitoring for scaling decisions
   */
  async startMonitoring() {
    if (this.scalingInterval) {
      return;
    }

    // Check scaling conditions every minute
    this.scalingInterval = setInterval(async () => {
      try {
        await this.evaluateScalingConditions();
      } catch (error) {
        loggingService.logError('Scaling evaluation failed', error);
      }
    }, 60000);

    loggingService.logInfo('Auto scaling monitoring started');
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.scalingInterval) {
      clearInterval(this.scalingInterval);
      this.scalingInterval = null;
    }
    loggingService.logInfo('Auto scaling monitoring stopped');
  }

  /**
   * Evaluate scaling conditions
   */
  async evaluateScalingConditions() {
    try {
      // Check cooldown period
      if (this.isInCooldownPeriod()) {
        return;
      }

      // Get current metrics
      const metrics = await this.getCurrentMetrics();

      // Evaluate each scaling policy
      const scalingDecisions = [];

      for (const [policyId, policy] of this.scalingPolicies) {
        if (!policy.enabled) continue;

        const decision = await this.evaluatePolicy(policy, metrics);
        if (decision) {
          scalingDecisions.push({ policyId, policy, decision });
        }
      }

      // Process scaling decisions
      if (scalingDecisions.length > 0) {
        await this.processScalingDecisions(scalingDecisions);
      }

    } catch (error) {
      loggingService.logError('Failed to evaluate scaling conditions', error);
    }
  }

  /**
   * Get current system metrics
   */
  async getCurrentMetrics() {
    const systemMetrics = await performanceMonitoringService.getSystemMetrics();
    const appMetrics = await performanceMonitoringService.getApplicationMetrics();

    return {
      cpu_usage: systemMetrics.cpu?.usage || 0,
      memory_usage: systemMetrics.memory?.usage || 0,
      response_time: appMetrics.api?.averageResponseTime || 0,
      error_rate: appMetrics.api?.errorRate || 0,
      db_connections: systemMetrics.database?.connectionUtilization || 0,
      timestamp: new Date()
    };
  }

  /**
   * Evaluate individual scaling policy
   */
  async evaluatePolicy(policy, metrics) {
    const metricValue = metrics[policy.metric];

    if (metricValue === undefined) {
      return null;
    }

    // Check if metric has been sustained for the evaluation period
    const sustained = await this.isMetricSustained(
      policy.metric,
      metricValue,
      policy.evaluationPeriod
    );

    if (!sustained) {
      return null;
    }

    // Determine scaling direction
    let scalingDirection = null;
    let reason = '';

    if (metricValue >= policy.scaleUpThreshold) {
      scalingDirection = 'up';
      reason = `${policy.metric} (${metricValue}) exceeded scale-up threshold (${policy.scaleUpThreshold})`;
    } else if (policy.scaleDownThreshold > 0 && metricValue <= policy.scaleDownThreshold) {
      scalingDirection = 'down';
      reason = `${policy.metric} (${metricValue}) below scale-down threshold (${policy.scaleDownThreshold})`;
    }

    if (!scalingDirection) {
      return null;
    }

    return {
      direction: scalingDirection,
      action: policy.scalingAction,
      reason,
      metricValue,
      threshold: scalingDirection === 'up' ? policy.scaleUpThreshold : policy.scaleDownThreshold,
      priority: policy.priority
    };
  }

  /**
   * Check if metric has been sustained for the required period
   */
  async isMetricSustained(metric, value, duration) {
    // Get historical metrics for the evaluation period
    const historicalMetrics = await performanceMonitoringService.getHistoricalMetrics(
      metric,
      duration
    );

    if (!historicalMetrics || historicalMetrics.length === 0) {
      return false;
    }

    // Check if all values in the period meet the condition
    const sustainedCount = historicalMetrics.filter(m => {
      if (metric === 'cpu_usage' || metric === 'memory_usage' || metric === 'db_connections') {
        return m.value >= value * 0.9; // Allow 10% variance
      } else if (metric === 'response_time') {
        return m.value >= value * 0.9;
      } else if (metric === 'error_rate') {
        return m.value >= value * 0.8; // Allow 20% variance for error rates
      }
      return false;
    }).length;

    // Require at least 80% of the period to be sustained
    return sustainedCount >= (historicalMetrics.length * 0.8);
  }

  /**
   * Process scaling decisions
   */
  async processScalingDecisions(scalingDecisions) {
    // Sort by priority (lower number = higher priority)
    scalingDecisions.sort((a, b) => a.policy.priority - b.policy.priority);

    // Take the highest priority decision
    const primaryDecision = scalingDecisions[0];

    try {
      const scalingResult = await this.executeScalingAction(primaryDecision);

      if (scalingResult.success) {
        this.lastScalingAction = {
          timestamp: new Date(),
          decision: primaryDecision,
          result: scalingResult
        };

        // Add to scaling history
        this.addToScalingHistory(this.lastScalingAction);

        // Send alert about scaling action
        await performanceAlertingService.sendAlert({
          type: 'auto_scaling',
          severity: 'info',
          message: `Auto scaling executed: ${scalingResult.description}`,
          details: {
            policy: primaryDecision.policy.name,
            reason: primaryDecision.decision.reason,
            oldCapacity: scalingResult.oldCapacity,
            newCapacity: scalingResult.newCapacity
          }
        });

        loggingService.logInfo('Auto scaling action executed', {
          policy: primaryDecision.policy.name,
          decision: primaryDecision.decision,
          result: scalingResult
        });
      }

    } catch (error) {
      loggingService.logError('Failed to execute scaling action', error, {
        decision: primaryDecision
      });

      await performanceAlertingService.sendAlert({
        type: 'auto_scaling_error',
        severity: 'warning',
        message: `Auto scaling action failed: ${error.message}`,
        details: {
          policy: primaryDecision.policy.name,
          error: error.message
        }
      });
    }
  }

  /**
   * Execute scaling action
   */
  async executeScalingAction(scalingDecision) {
    const { policy, decision } = scalingDecision;
    const oldCapacity = { ...this.currentCapacity };

    let newCapacity = { ...this.currentCapacity };
    let description = '';

    if (decision.action === 'horizontal') {
      // Horizontal scaling (add/remove instances)
      if (decision.direction === 'up') {
        const newInstances = Math.min(
          this.currentCapacity.instances + 1,
          this.limits.maxInstances
        );

        if (newInstances > this.currentCapacity.instances) {
          newCapacity.instances = newInstances;
          description = `Scaled up from ${oldCapacity.instances} to ${newInstances} instances`;
        } else {
          return { success: false, reason: 'Already at maximum instance limit' };
        }
      } else {
        const newInstances = Math.max(
          this.currentCapacity.instances - 1,
          this.limits.minInstances
        );

        if (newInstances < this.currentCapacity.instances) {
          newCapacity.instances = newInstances;
          description = `Scaled down from ${oldCapacity.instances} to ${newInstances} instances`;
        } else {
          return { success: false, reason: 'Already at minimum instance limit' };
        }
      }
    } else if (decision.action === 'vertical') {
      // Vertical scaling (increase/decrease resources per instance)
      if (decision.direction === 'up') {
        if (policy.metric === 'cpu_usage') {
          const newCpuCores = Math.min(
            this.currentCapacity.cpuCores + 1,
            this.limits.maxCpuCores
          );

          if (newCpuCores > this.currentCapacity.cpuCores) {
            newCapacity.cpuCores = newCpuCores;
            description = `Scaled up CPU from ${oldCapacity.cpuCores} to ${newCpuCores} cores`;
          } else {
            return { success: false, reason: 'Already at maximum CPU limit' };
          }
        } else if (policy.metric === 'memory_usage') {
          const newMemoryGB = Math.min(
            this.currentCapacity.memoryGB + 2,
            this.limits.maxMemoryGB
          );

          if (newMemoryGB > this.currentCapacity.memoryGB) {
            newCapacity.memoryGB = newMemoryGB;
            description = `Scaled up memory from ${oldCapacity.memoryGB}GB to ${newMemoryGB}GB`;
          } else {
            return { success: false, reason: 'Already at maximum memory limit' };
          }
        }
      } else {
        if (policy.metric === 'cpu_usage') {
          const newCpuCores = Math.max(
            this.currentCapacity.cpuCores - 1,
            this.limits.minCpuCores
          );

          if (newCpuCores < this.currentCapacity.cpuCores) {
            newCapacity.cpuCores = newCpuCores;
            description = `Scaled down CPU from ${oldCapacity.cpuCores} to ${newCpuCores} cores`;
          } else {
            return { success: false, reason: 'Already at minimum CPU limit' };
          }
        } else if (policy.metric === 'memory_usage') {
          const newMemoryGB = Math.max(
            this.currentCapacity.memoryGB - 2,
            this.limits.minMemoryGB
          );

          if (newMemoryGB < this.currentCapacity.memoryGB) {
            newCapacity.memoryGB = newMemoryGB;
            description = `Scaled down memory from ${oldCapacity.memoryGB}GB to ${newMemoryGB}GB`;
          } else {
            return { success: false, reason: 'Already at minimum memory limit' };
          }
        }
      }
    }

    // In a real implementation, this would trigger actual infrastructure scaling
    // For now, we simulate the scaling action
    await this.simulateScalingAction(oldCapacity, newCapacity);

    this.currentCapacity = newCapacity;

    return {
      success: true,
      description,
      oldCapacity,
      newCapacity,
      timestamp: new Date()
    };
  }

  /**
   * Simulate scaling action (placeholder for actual infrastructure scaling)
   */
  async simulateScalingAction(oldCapacity, newCapacity) {
    // In production, this would:
    // 1. Call cloud provider APIs (AWS ECS, Kubernetes, etc.)
    // 2. Update load balancer configuration
    // 3. Wait for new instances to be ready
    // 4. Perform health checks
    // 5. Update monitoring configuration

    // For simulation, just add a delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    loggingService.logInfo('Scaling action simulated', {
      oldCapacity,
      newCapacity
    });
  }

  /**
   * Check if we're in cooldown period
   */
  isInCooldownPeriod() {
    if (!this.lastScalingAction) {
      return false;
    }

    const timeSinceLastAction = Date.now() - this.lastScalingAction.timestamp.getTime();
    return timeSinceLastAction < this.cooldownPeriod;
  }

  /**
   * Add scaling action to history
   */
  addToScalingHistory(scalingAction) {
    this.scalingHistory.push(scalingAction);

    // Keep only last 100 scaling actions
    if (this.scalingHistory.length > 100) {
      this.scalingHistory.shift();
    }
  }

  /**
   * Get scaling status
   */
  getScalingStatus() {
    return {
      enabled: this.isEnabled,
      currentCapacity: this.currentCapacity,
      limits: this.limits,
      thresholds: this.thresholds,
      lastScalingAction: this.lastScalingAction,
      scalingHistory: this.scalingHistory.slice(-10), // Last 10 actions
      cooldownRemaining: this.isInCooldownPeriod() ?
        this.cooldownPeriod - (Date.now() - this.lastScalingAction.timestamp.getTime()) : 0,
      policies: Array.from(this.scalingPolicies.entries()).map(([id, policy]) => ({
        id,
        ...policy
      }))
    };
  }

  /**
   * Update scaling policy
   */
  async updateScalingPolicy(policyId, updates) {
    const policy = this.scalingPolicies.get(policyId);

    if (!policy) {
      throw new Error(`Scaling policy ${policyId} not found`);
    }

    // Update policy
    Object.assign(policy, updates);

    loggingService.logInfo('Scaling policy updated', {
      policyId,
      updates
    });
  }

  /**
   * Enable/disable auto scaling
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;

    if (enabled) {
      this.startMonitoring();
    } else {
      this.stopMonitoring();
    }

    loggingService.logInfo(`Auto scaling ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Shutdown auto scaling service
   */
  async shutdown() {
    this.stopMonitoring();
    loggingService.logInfo('Auto scaling service shutdown complete');
  }
}

export const autoScalingService = new AutoScalingService();