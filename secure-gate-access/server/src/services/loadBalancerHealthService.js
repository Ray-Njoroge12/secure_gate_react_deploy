/**
 * Load Balancer Health Check Service
 * Comprehensive health monitoring for load balancer backends
 */

import loggingService from './loggingService.js';
import { performance } from 'perf_hooks';

class LoadBalancerHealthService {
    constructor() {
        this.backendServers = new Map();
        this.healthCheckInterval = parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000'); // 30 seconds
        this.healthCheckTimeout = parseInt(process.env.HEALTH_CHECK_TIMEOUT || '5000'); // 5 seconds
        this.failureThreshold = parseInt(process.env.HEALTH_FAILURE_THRESHOLD || '3');
        this.recoveryThreshold = parseInt(process.env.HEALTH_RECOVERY_THRESHOLD || '2');
        this.isRunning = false;
        
        this.config = {
            // Backend server configurations
            backends: [
                {
                    id: 'backend-1',
                    host: process.env.BACKEND_1_HOST || 'backend-1',
                    port: parseInt(process.env.BACKEND_1_PORT || '5000'),
                    weight: parseInt(process.env.BACKEND_1_WEIGHT || '3'),
                    maxFails: parseInt(process.env.BACKEND_1_MAX_FAILS || '3'),
                    failTimeout: parseInt(process.env.BACKEND_1_FAIL_TIMEOUT || '30'),
                    healthCheckPath: '/health',
                    enabled: process.env.BACKEND_1_ENABLED !== 'false'
                },
                {
                    id: 'backend-2',
                    host: process.env.BACKEND_2_HOST || 'backend-2',
                    port: parseInt(process.env.BACKEND_2_PORT || '5000'),
                    weight: parseInt(process.env.BACKEND_2_WEIGHT || '3'),
                    maxFails: parseInt(process.env.BACKEND_2_MAX_FAILS || '3'),
                    failTimeout: parseInt(process.env.BACKEND_2_FAIL_TIMEOUT || '30'),
                    healthCheckPath: '/health',
                    enabled: process.env.BACKEND_2_ENABLED !== 'false'
                },
                {
                    id: 'backend-3',
                    host: process.env.BACKEND_3_HOST || 'backend-3',
                    port: parseInt(process.env.BACKEND_3_PORT || '5000'),
                    weight: parseInt(process.env.BACKEND_3_WEIGHT || '2'),
                    maxFails: parseInt(process.env.BACKEND_3_MAX_FAILS || '3'),
                    failTimeout: parseInt(process.env.BACKEND_3_FAIL_TIMEOUT || '30'),
                    healthCheckPath: '/health',
                    enabled: process.env.BACKEND_3_ENABLED !== 'false'
                }
            ],
            
            // Backup servers
            backups: [
                {
                    id: 'backup-1',
                    host: process.env.BACKUP_1_HOST || 'backup-1',
                    port: parseInt(process.env.BACKUP_1_PORT || '5000'),
                    weight: 1,
                    maxFails: 2,
                    failTimeout: 60,
                    healthCheckPath: '/health',
                    enabled: process.env.BACKUP_1_ENABLED === 'true'
                },
                {
                    id: 'backup-2',
                    host: process.env.BACKUP_2_HOST || 'backup-2',
                    port: parseInt(process.env.BACKUP_2_PORT || '5000'),
                    weight: 1,
                    maxFails: 2,
                    failTimeout: 60,
                    healthCheckPath: '/health',
                    enabled: process.env.BACKUP_2_ENABLED === 'true'
                }
            ]
        };
        
        this.initializeBackendServers();
    }

    /**
     * Initialize backend servers
     */
    initializeBackendServers() {
        // Initialize primary backends
        this.config.backends.forEach(backend => {
            if (backend.enabled) {
                this.backendServers.set(backend.id, {
                    ...backend,
                    status: 'unknown',
                    consecutiveFailures: 0,
                    consecutiveSuccesses: 0,
                    lastCheck: null,
                    responseTime: 0,
                    totalChecks: 0,
                    successfulChecks: 0,
                    failedChecks: 0,
                    lastError: null
                });
            }
        });
        
        // Initialize backup servers
        this.config.backups.forEach(backup => {
            if (backup.enabled) {
                this.backendServers.set(backup.id, {
                    ...backup,
                    status: 'backup',
                    consecutiveFailures: 0,
                    consecutiveSuccesses: 0,
                    lastCheck: null,
                    responseTime: 0,
                    totalChecks: 0,
                    successfulChecks: 0,
                    failedChecks: 0,
                    lastError: null
                });
            }
        });
    }

    /**
     * Start health checking
     */
    async start() {
        try {
            this.isRunning = true;
            
            // Perform initial health checks
            await this.performHealthChecks();
            
            // Start periodic health checking
            this.healthCheckTimer = setInterval(async () => {
                await this.performHealthChecks();
            }, this.healthCheckInterval);
            
            loggingService.logInfo('Load Balancer Health Service started', {
                interval: this.healthCheckInterval,
                timeout: this.healthCheckTimeout,
                backends: this.backendServers.size
            });
            
        } catch (error) {
            loggingService.logError('Failed to start Load Balancer Health Service', error);
            throw error;
        }
    }

    /**
     * Stop health checking
     */
    stop() {
        this.isRunning = false;
        
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
            this.healthCheckTimer = null;
        }
        
        loggingService.logInfo('Load Balancer Health Service stopped');
    }

    /**
     * Perform health checks on all backends
     */
    async performHealthChecks() {
        const healthCheckPromises = Array.from(this.backendServers.values())
            .filter(server => server.enabled)
            .map(server => this.checkServerHealth(server));
        
        await Promise.allSettled(healthCheckPromises);
        
        // Log overall health status
        this.logHealthStatus();
    }

    /**
     * Check health of a single server
     */
    async checkServerHealth(server) {
        const startTime = performance.now();
        
        try {
            const healthUrl = `http://${server.host}:${server.port}${server.healthCheckPath}`;
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.healthCheckTimeout);
            
            const response = await fetch(healthUrl, {
                method: 'GET',
                signal: controller.signal,
                headers: {
                    'User-Agent': 'LoadBalancer-HealthCheck/1.0',
                    'Accept': 'application/json'
                }
            });
            
            clearTimeout(timeoutId);
            
            const endTime = performance.now();
            const responseTime = endTime - startTime;
            
            if (response.ok) {
                await this.handleHealthCheckSuccess(server, responseTime);
            } else {
                await this.handleHealthCheckFailure(server, `HTTP ${response.status}`, responseTime);
            }
            
        } catch (error) {
            const endTime = performance.now();
            const responseTime = endTime - startTime;
            
            await this.handleHealthCheckFailure(server, error.message, responseTime);
        }
    }

    /**
     * Handle successful health check
     */
    async handleHealthCheckSuccess(server, responseTime) {
        server.consecutiveSuccesses++;
        server.consecutiveFailures = 0;
        server.lastCheck = new Date().toISOString();
        server.responseTime = responseTime;
        server.totalChecks++;
        server.successfulChecks++;
        server.lastError = null;
        
        // Check if server should be marked as healthy
        if (server.status === 'unhealthy' && server.consecutiveSuccesses >= this.recoveryThreshold) {
            server.status = 'healthy';
            loggingService.logInfo(`Server ${server.id} recovered`, {
                server: server.id,
                consecutiveSuccesses: server.consecutiveSuccesses,
                responseTime: `${responseTime.toFixed(2)}ms`
            });
        } else if (server.status === 'unknown') {
            server.status = 'healthy';
            loggingService.logInfo(`Server ${server.id} is healthy`, {
                server: server.id,
                responseTime: `${responseTime.toFixed(2)}ms`
            });
        }
    }

    /**
     * Handle failed health check
     */
    async handleHealthCheckFailure(server, error, responseTime) {
        server.consecutiveFailures++;
        server.consecutiveSuccesses = 0;
        server.lastCheck = new Date().toISOString();
        server.responseTime = responseTime;
        server.totalChecks++;
        server.failedChecks++;
        server.lastError = error;
        
        // Check if server should be marked as unhealthy
        if (server.consecutiveFailures >= this.failureThreshold) {
            if (server.status !== 'unhealthy') {
                server.status = 'unhealthy';
                loggingService.logWarn(`Server ${server.id} marked as unhealthy`, {
                    server: server.id,
                    consecutiveFailures: server.consecutiveFailures,
                    error: error,
                    responseTime: `${responseTime.toFixed(2)}ms`
                });
            }
        }
    }

    /**
     * Log overall health status
     */
    logHealthStatus() {
        const healthyServers = Array.from(this.backendServers.values())
            .filter(server => server.status === 'healthy').length;
        
        const unhealthyServers = Array.from(this.backendServers.values())
            .filter(server => server.status === 'unhealthy').length;
        
        const totalServers = this.backendServers.size;
        
        loggingService.logInfo('Load Balancer Health Status', {
            total: totalServers,
            healthy: healthyServers,
            unhealthy: unhealthyServers,
            unknown: totalServers - healthyServers - unhealthyServers
        });
    }

    /**
     * Get server status
     */
    getServerStatus(serverId) {
        const server = this.backendServers.get(serverId);
        if (!server) {
            return null;
        }
        
        return {
            id: server.id,
            host: server.host,
            port: server.port,
            status: server.status,
            weight: server.weight,
            responseTime: server.responseTime,
            lastCheck: server.lastCheck,
            consecutiveFailures: server.consecutiveFailures,
            consecutiveSuccesses: server.consecutiveSuccesses,
            totalChecks: server.totalChecks,
            successfulChecks: server.successfulChecks,
            failedChecks: server.failedChecks,
            successRate: server.totalChecks > 0 ? (server.successfulChecks / server.totalChecks) * 100 : 0,
            lastError: server.lastError
        };
    }

    /**
     * Get all servers status
     */
    getAllServersStatus() {
        const servers = [];
        
        for (const [id, server] of this.backendServers) {
            servers.push(this.getServerStatus(id));
        }
        
        return servers;
    }

    /**
     * Get healthy servers only
     */
    getHealthyServers() {
        return Array.from(this.backendServers.values())
            .filter(server => server.status === 'healthy' && server.enabled)
            .map(server => ({
                id: server.id,
                host: server.host,
                port: server.port,
                weight: server.weight,
                responseTime: server.responseTime
            }));
    }

    /**
     * Get load balancer statistics
     */
    getStatistics() {
        const servers = Array.from(this.backendServers.values());
        const totalChecks = servers.reduce((sum, server) => sum + server.totalChecks, 0);
        const successfulChecks = servers.reduce((sum, server) => sum + server.successfulChecks, 0);
        const failedChecks = servers.reduce((sum, server) => sum + server.failedChecks, 0);
        
        const avgResponseTime = servers.length > 0 
            ? servers.reduce((sum, server) => sum + server.responseTime, 0) / servers.length 
            : 0;
        
        return {
            totalServers: servers.length,
            healthyServers: servers.filter(s => s.status === 'healthy').length,
            unhealthyServers: servers.filter(s => s.status === 'unhealthy').length,
            unknownServers: servers.filter(s => s.status === 'unknown').length,
            totalChecks,
            successfulChecks,
            failedChecks,
            successRate: totalChecks > 0 ? (successfulChecks / totalChecks) * 100 : 0,
            averageResponseTime: avgResponseTime,
            isRunning: this.isRunning
        };
    }

    /**
     * Force health check on specific server
     */
    async forceHealthCheck(serverId) {
        const server = this.backendServers.get(serverId);
        if (!server) {
            throw new Error(`Server ${serverId} not found`);
        }
        
        await this.checkServerHealth(server);
        return this.getServerStatus(serverId);
    }

    /**
     * Enable/disable server
     */
    toggleServer(serverId, enabled) {
        const server = this.backendServers.get(serverId);
        if (!server) {
            throw new Error(`Server ${serverId} not found`);
        }
        
        server.enabled = enabled;
        
        loggingService.logInfo(`Server ${serverId} ${enabled ? 'enabled' : 'disabled'}`);
        
        return this.getServerStatus(serverId);
    }

    /**
     * Update server configuration
     */
    updateServerConfig(serverId, config) {
        const server = this.backendServers.get(serverId);
        if (!server) {
            throw new Error(`Server ${serverId} not found`);
        }
        
        // Update allowed configuration fields
        const allowedFields = ['weight', 'maxFails', 'failTimeout', 'healthCheckPath'];
        allowedFields.forEach(field => {
            if (config[field] !== undefined) {
                server[field] = config[field];
            }
        });
        
        loggingService.logInfo(`Server ${serverId} configuration updated`, config);
        
        return this.getServerStatus(serverId);
    }
}

export default new LoadBalancerHealthService();
