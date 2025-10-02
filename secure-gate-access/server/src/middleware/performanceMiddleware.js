/**
 * Performance Monitoring Middleware
 */

import { performance } from 'perf_hooks';
import loggingService from '../services/loggingService.js';

class PerformanceMiddleware {
    constructor() {
        this.metrics = {
            requests: 0,
            totalResponseTime: 0,
            averageResponseTime: 0,
            slowRequests: 0,
            errors: 0
        };
        
        this.slowRequestThreshold = parseInt(process.env.SLOW_REQUEST_THRESHOLD || '1000');
        this.endpointMetrics = new Map();
        this.startPeriodicReporting();
    }

    middleware() {
        return (req, res, next) => {
            const startTime = performance.now();
            const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            req.performance = {
                requestId,
                startTime,
                endpoint: `${req.method} ${req.route?.path || req.path}`
            };
            
            this.metrics.requests++;
            
            // Use on('finish') instead of overriding res.end to avoid header issues
            res.on('finish', () => {
                const endTime = performance.now();
                const duration = endTime - startTime;
                this.trackRequestEnd(req, res, duration);
            });

            next();
        };
    }

    trackRequestEnd(req, res, duration) {
        const responseTime = Math.round(duration);
        
        this.metrics.totalResponseTime += responseTime;
        this.metrics.averageResponseTime = this.metrics.totalResponseTime / this.metrics.requests;
        
        if (responseTime > this.slowRequestThreshold) {
            this.metrics.slowRequests++;
            loggingService.logWarn('Slow request detected', {
                endpoint: req.performance?.endpoint,
                duration: `${responseTime}ms`,
                method: req.method,
                url: req.originalUrl
            });
        }
        
        if (res.statusCode >= 400) {
            this.metrics.errors++;
        }
        
        if (req.performance) {
            this.trackEndpointMetrics(req.performance.endpoint, responseTime, res.statusCode);
        }
    }

    trackEndpointMetrics(endpoint, responseTime, statusCode) {
        const metrics = this.endpointMetrics.get(endpoint) || {
            count: 0,
            totalTime: 0,
            averageTime: 0,
            slowCount: 0,
            errorCount: 0
        };
        
        metrics.count++;
        metrics.totalTime += responseTime;
        metrics.averageTime = metrics.totalTime / metrics.count;
        
        if (responseTime > this.slowRequestThreshold) {
            metrics.slowCount++;
        }
        
        if (statusCode >= 400) {
            metrics.errorCount++;
        }
        
        this.endpointMetrics.set(endpoint, metrics);
    }

    startPeriodicReporting() {
        setInterval(() => {
            this.reportMetrics();
        }, 300000);
    }

    reportMetrics() {
        const report = {
            timestamp: new Date().toISOString(),
            overall: {
                requests: this.metrics.requests,
                averageResponseTime: `${this.metrics.averageResponseTime.toFixed(2)}ms`,
                slowRequests: this.metrics.slowRequests,
                errors: this.metrics.errors,
                errorRate: `${((this.metrics.errors / this.metrics.requests) * 100).toFixed(2)}%`
            },
            topEndpoints: this.getTopEndpoints(5)
        };
        
        loggingService.logInfo('Performance metrics report', report);
    }

    getTopEndpoints(limit = 10) {
        return Array.from(this.endpointMetrics.entries())
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, limit)
            .map(([endpoint, metrics]) => ({
                endpoint,
                count: metrics.count,
                averageTime: `${metrics.averageTime.toFixed(2)}ms`,
                slowCount: metrics.slowCount,
                errorCount: metrics.errorCount
            }));
    }

    getMetrics() {
        return {
            overall: {
                requests: this.metrics.requests,
                averageResponseTime: this.metrics.averageResponseTime,
                slowRequests: this.metrics.slowRequests,
                errors: this.metrics.errors,
                errorRate: this.metrics.requests > 0 ? (this.metrics.errors / this.metrics.requests) * 100 : 0
            },
            endpoints: Object.fromEntries(this.endpointMetrics)
        };
    }
}

export const performanceMonitor = new PerformanceMiddleware();
export default performanceMonitor;