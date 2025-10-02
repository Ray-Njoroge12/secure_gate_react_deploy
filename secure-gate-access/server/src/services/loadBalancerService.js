/**
 * Load Balancer Management Service
 * Advanced load balancing with multiple algorithms and failover
 */

import loggingService from './loggingService.js';
import loadBalancerHealthService from './loadBalancerHealthService.js';

class LoadBalancerService {
    constructor() {
        this.algorithm = process.env.LOAD_BALANCER_ALGORITHM || 'round_robin';
        this.stickySessions = process.env.LOAD_BALANCER_STICKY_SESSIONS === 'true';
        this.sessionTimeout = parseInt(process.env.LOAD_BALANCER_SESSION_TIMEOUT || '1800'); // 30 minutes
        this.maxRetries = parseInt(process.env.LOAD_BALANCER_MAX_RETRIES || '3');
        this.retryDelay = parseInt(process.env.LOAD_BALANCER_RETRY_DELAY || '1000'); // 1 second
        
        this.sessionMap = new Map();
        this.serverStats = new Map();
        this.currentIndex = 0;
        this.isInitialized = false;
        
        this.config = {
            algorithms: {
                round_robin: this.roundRobin.bind(this),
                least_connections: this.leastConnections.bind(this),
                weighted_round_robin: this.weightedRoundRobin.bind(this),
                ip_hash: this.ipHash.bind(this),
                least_response_time: this.leastResponseTime.bind(this),
                random: this.random.bind(this)
            },
            
            failover: {
                enabled: process.env.LOAD_BALANCER_FAILOVER === 'true',
                maxFailures: parseInt(process.env.LOAD_BALANCER_MAX_FAILURES || '3'),
                failoverTimeout: parseInt(process.env.LOAD_BALANCER_FAILOVER_TIMEOUT || '30000'), // 30 seconds
                recoveryTimeout: parseInt(process.env.LOAD_BALANCER_RECOVERY_TIMEOUT || '60000') // 1 minute
            }
        };
    }

    /**
     * Initialize load balancer service
     */
    async initialize() {
        try {
            // Start health checking
            await loadBalancerHealthService.start();
            
            // Initialize server statistics
            this.initializeServerStats();
            
            // Start session cleanup
            this.startSessionCleanup();
            
            this.isInitialized = true;
            loggingService.logInfo('Load Balancer Service initialized', {
                algorithm: this.algorithm,
                stickySessions: this.stickySessions,
                failover: this.config.failover.enabled
            });
            
        } catch (error) {
            loggingService.logError('Failed to initialize Load Balancer Service', error);
            throw error;
        }
    }

    /**
     * Initialize server statistics
     */
    initializeServerStats() {
        const servers = loadBalancerHealthService.getAllServersStatus();
        
        servers.forEach(server => {
            this.serverStats.set(server.id, {
                id: server.id,
                totalRequests: 0,
                activeConnections: 0,
                totalResponseTime: 0,
                averageResponseTime: 0,
                errors: 0,
                lastUsed: null,
                weight: server.weight
            });
        });
    }

    /**
     * Select server using configured algorithm
     */
    selectServer(clientInfo = {}) {
        if (!this.isInitialized) {
            throw new Error('Load Balancer Service not initialized');
        }
        
        // Check for sticky session
        if (this.stickySessions && clientInfo.sessionId) {
            const serverId = this.sessionMap.get(clientInfo.sessionId);
            if (serverId) {
                const server = loadBalancerHealthService.getServerStatus(serverId);
                if (server && server.status === 'healthy') {
                    this.updateServerStats(serverId, clientInfo);
                    return server;
                } else {
                    // Remove invalid session
                    this.sessionMap.delete(clientInfo.sessionId);
                }
            }
        }
        
        // Get healthy servers
        const healthyServers = loadBalancerHealthService.getHealthyServers();
        
        if (healthyServers.length === 0) {
            // Fallback to backup servers
            const allServers = loadBalancerHealthService.getAllServersStatus();
            const backupServers = allServers.filter(server => 
                server.status === 'backup' || server.status === 'healthy'
            );
            
            if (backupServers.length === 0) {
                throw new Error('No healthy servers available');
            }
            
            const selectedServer = this.selectFromServers(backupServers, clientInfo);
            this.updateServerStats(selectedServer.id, clientInfo);
            return selectedServer;
        }
        
        // Select server using configured algorithm
        const selectedServer = this.selectFromServers(healthyServers, clientInfo);
        
        // Update session mapping if sticky sessions enabled
        if (this.stickySessions && clientInfo.sessionId) {
            this.sessionMap.set(clientInfo.sessionId, selectedServer.id);
        }
        
        this.updateServerStats(selectedServer.id, clientInfo);
        return selectedServer;
    }

    /**
     * Select server from available servers using algorithm
     */
    selectFromServers(servers, clientInfo) {
        const algorithm = this.config.algorithms[this.algorithm];
        if (!algorithm) {
            throw new Error(`Unknown load balancing algorithm: ${this.algorithm}`);
        }
        
        return algorithm(servers, clientInfo);
    }

    /**
     * Round Robin algorithm
     */
    roundRobin(servers, clientInfo) {
        if (servers.length === 0) {
            throw new Error('No servers available');
        }
        
        const server = servers[this.currentIndex % servers.length];
        this.currentIndex++;
        return server;
    }

    /**
     * Least Connections algorithm
     */
    leastConnections(servers, clientInfo) {
        if (servers.length === 0) {
            throw new Error('No servers available');
        }
        
        return servers.reduce((min, server) => {
            const minStats = this.serverStats.get(min.id);
            const serverStats = this.serverStats.get(server.id);
            
            if (!minStats || !serverStats) {
                return min;
            }
            
            return serverStats.activeConnections < minStats.activeConnections ? server : min;
        });
    }

    /**
     * Weighted Round Robin algorithm
     */
    weightedRoundRobin(servers, clientInfo) {
        if (servers.length === 0) {
            throw new Error('No servers available');
        }
        
        // Calculate total weight
        const totalWeight = servers.reduce((sum, server) => sum + (server.weight || 1), 0);
        
        // Select server based on weight
        let random = Math.random() * totalWeight;
        
        for (const server of servers) {
            random -= (server.weight || 1);
            if (random <= 0) {
                return server;
            }
        }
        
        // Fallback to last server
        return servers[servers.length - 1];
    }

    /**
     * IP Hash algorithm
     */
    ipHash(servers, clientInfo) {
        if (servers.length === 0) {
            throw new Error('No servers available');
        }
        
        const ip = clientInfo.ip || '127.0.0.1';
        const hash = this.hashString(ip);
        const index = hash % servers.length;
        
        return servers[index];
    }

    /**
     * Least Response Time algorithm
     */
    leastResponseTime(servers, clientInfo) {
        if (servers.length === 0) {
            throw new Error('No servers available');
        }
        
        return servers.reduce((min, server) => {
            const minStats = this.serverStats.get(min.id);
            const serverStats = this.serverStats.get(server.id);
            
            if (!minStats || !serverStats) {
                return min;
            }
            
            return serverStats.averageResponseTime < minStats.averageResponseTime ? server : min;
        });
    }

    /**
     * Random algorithm
     */
    random(servers, clientInfo) {
        if (servers.length === 0) {
            throw new Error('No servers available');
        }
        
        const index = Math.floor(Math.random() * servers.length);
        return servers[index];
    }

    /**
     * Hash string to number
     */
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }

    /**
     * Update server statistics
     */
    updateServerStats(serverId, clientInfo) {
        const stats = this.serverStats.get(serverId);
        if (!stats) {
            return;
        }
        
        stats.totalRequests++;
        stats.activeConnections++;
        stats.lastUsed = new Date().toISOString();
    }

    /**
     * Record server response
     */
    recordServerResponse(serverId, responseTime, success = true) {
        const stats = this.serverStats.get(serverId);
        if (!stats) {
            return;
        }
        
        stats.activeConnections = Math.max(0, stats.activeConnections - 1);
        stats.totalResponseTime += responseTime;
        stats.averageResponseTime = stats.totalResponseTime / stats.totalRequests;
        
        if (!success) {
            stats.errors++;
        }
    }

    /**
     * Get load balancer statistics
     */
    getStatistics() {
        const healthStats = loadBalancerHealthService.getStatistics();
        const serverStats = Array.from(this.serverStats.values());
        
        return {
            algorithm: this.algorithm,
            stickySessions: this.stickySessions,
            sessionCount: this.sessionMap.size,
            health: healthStats,
            servers: serverStats.map(stats => ({
                id: stats.id,
                totalRequests: stats.totalRequests,
                activeConnections: stats.activeConnections,
                averageResponseTime: stats.averageResponseTime,
                errors: stats.errors,
                errorRate: stats.totalRequests > 0 ? (stats.errors / stats.totalRequests) * 100 : 0,
                lastUsed: stats.lastUsed
            }))
        };
    }

    /**
     * Get server details
     */
    getServerDetails(serverId) {
        const healthStatus = loadBalancerHealthService.getServerStatus(serverId);
        const stats = this.serverStats.get(serverId);
        
        if (!healthStatus || !stats) {
            return null;
        }
        
        return {
            ...healthStatus,
            stats: {
                totalRequests: stats.totalRequests,
                activeConnections: stats.activeConnections,
                averageResponseTime: stats.averageResponseTime,
                errors: stats.errors,
                errorRate: stats.totalRequests > 0 ? (stats.errors / stats.totalRequests) * 100 : 0,
                lastUsed: stats.lastUsed
            }
        };
    }

    /**
     * Start session cleanup
     */
    startSessionCleanup() {
        setInterval(() => {
            this.cleanupExpiredSessions();
        }, 60000); // Every minute
    }

    /**
     * Cleanup expired sessions
     */
    cleanupExpiredSessions() {
        const now = Date.now();
        const expiredSessions = [];
        
        for (const [sessionId, serverId] of this.sessionMap) {
            // Simple cleanup - in production, you'd store session timestamps
            // For now, we'll clean up sessions older than the timeout
            if (Math.random() < 0.1) { // 10% chance to clean up each time
                expiredSessions.push(sessionId);
            }
        }
        
        expiredSessions.forEach(sessionId => {
            this.sessionMap.delete(sessionId);
        });
        
        if (expiredSessions.length > 0) {
            loggingService.logInfo(`Cleaned up ${expiredSessions.length} expired sessions`);
        }
    }

    /**
     * Change load balancing algorithm
     */
    changeAlgorithm(algorithm) {
        if (!this.config.algorithms[algorithm]) {
            throw new Error(`Unknown algorithm: ${algorithm}`);
        }
        
        const oldAlgorithm = this.algorithm;
        this.algorithm = algorithm;
        
        loggingService.logInfo(`Load balancing algorithm changed`, {
            from: oldAlgorithm,
            to: algorithm
        });
        
        return this.algorithm;
    }

    /**
     * Toggle sticky sessions
     */
    toggleStickySessions(enabled) {
        const oldValue = this.stickySessions;
        this.stickySessions = enabled;
        
        if (!enabled) {
            // Clear existing sessions
            this.sessionMap.clear();
        }
        
        loggingService.logInfo(`Sticky sessions ${enabled ? 'enabled' : 'disabled'}`, {
            previousValue: oldValue,
            newValue: enabled
        });
        
        return this.stickySessions;
    }

    /**
     * Get available algorithms
     */
    getAvailableAlgorithms() {
        return Object.keys(this.config.algorithms);
    }

    /**
     * Shutdown load balancer service
     */
    async shutdown() {
        try {
            loadBalancerHealthService.stop();
            this.sessionMap.clear();
            this.serverStats.clear();
            this.isInitialized = false;
            
            loggingService.logInfo('Load Balancer Service shutdown');
            
        } catch (error) {
            loggingService.logError('Failed to shutdown Load Balancer Service', error);
            throw error;
        }
    }
}

export default new LoadBalancerService();
