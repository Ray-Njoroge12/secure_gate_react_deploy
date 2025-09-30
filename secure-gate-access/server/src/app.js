import express from 'express';
import RedisService from './services/redisService.js';
import { setRedisService } from './middleware/sessionMiddleware.js';
import enhancedSessionManager from './middleware/enhancedSessionMiddleware.js';
import { setCacheRedisService } from './middleware/cacheMiddleware.js';
import rateLimitMiddleware, { setRateLimitRedisService, generalRateLimit, speedLimitMiddleware, ddosProtection } from './middleware/rateLimitMiddleware.js';
import cookieParser from 'cookie-parser';

// Import logging infrastructure
import loggingService from './services/loggingService.js';
import { 
  correlationIdMiddleware, 
  requestLoggingMiddleware,
  accessLoggingMiddleware,
  errorLoggingMiddleware
} from './middleware/loggingMiddleware.js';
import monitoringDashboard from './services/monitoringDashboardService.js';

// Initialize Redis service instance
const redisService = new RedisService();
import { randomUUID } from 'crypto';
import visitorRoutes from './routes/visitorRoutes.js';
import userRoutes from './routes/userRoutes.js';
import adminRoutesPhase3 from './routes/adminRoutes.phase3.js';
import attachRequestAudit from './middleware/auditLogger.js';
import './jobs/inviteLifecycle.js';
import { attachUserFromToken } from './middleware/authMiddleware.js';
import { eventBus, metrics, log } from './utils/tokenHelper.js';
import normalizeResponse from './middleware/normalizeResponse.js';
import { healthCheck } from './services/healthService.js';
import { alertingService } from './services/alertingService.js';
import { 
  helmetConfig, 
  corsConfig, 
  authRateLimit as legacyAuthRateLimit, 
  otpRateLimit,
  securityHeaders,
  requestId,
  securityAudit
} from './middleware/securityMiddleware.js';
import { 
  enhancedHelmetConfig,
  customSecurityHeaders,
  securityResponseMiddleware,
  contentTypeValidation,
  requestSizeLimit,
  securityEventLogger
} from './middleware/securityHeadersMiddleware.js';
import { 
  transportSecurityStack,
  initializeTransportSecurity 
} from './middleware/transportSecurity.js';
import { 
  globalErrorHandler, 
  requestIdMiddleware, 
  notFoundHandler 
} from './middleware/errorHandler.js';
import { responseMiddleware } from './utils/responseUtils.js';

// Session manager (legacy import - replaced with enhanced version)
// import { sessionManager } from './middleware/sessionMiddleware.js';

// Import routes 
import createCacheRoutes from './routes/cacheRoutes.js';
import rateLimitRoutes from './routes/rateLimitRoutes.js';
import securityRoutes from './routes/securityRoutes.js';
import performanceRoutes from './routes/performanceRoutes.js';
import loggingRoutes from './routes/loggingRoutes.js';
import monitoringRoutes from './routes/monitoringRoutes.js';
import sessionRoutes from './routes/sessionRoutes.js';

// Import performance middleware
import { 
  performanceMonitor,
  compressionMiddleware,
  responseOptimizationMiddleware,
  requestTimeoutMiddleware 
} from './middleware/performanceMiddleware.js';

const app = express();

// Trust proxy for secure headers (IMPORTANT: Only enable if behind trusted proxy)
app.set('trust proxy', process.env.NODE_ENV === 'production' ? 1 : false);

// Initialize logging service
loggingService.initialize();

// Logging middleware - MUST be early in the chain
app.use(correlationIdMiddleware); // Generate correlation IDs for request tracing

// Security middleware - ORDER MATTERS!
app.use(requestIdMiddleware); // Enhanced request ID for tracing and error correlation
app.use(requestId); // Original request ID (keeping for backward compatibility)
app.use(...transportSecurityStack); // Transport security (HTTPS, HSTS, secure cookies)

// Enhanced Security Headers (Production-Ready)
app.use(enhancedHelmetConfig); // Enhanced Helmet configuration with CSP, HSTS, etc.
app.use(customSecurityHeaders); // Custom security headers and cache control
app.use(contentTypeValidation); // Validate request content types
app.use(requestSizeLimit); // Prevent large payload attacks
app.use(securityResponseMiddleware); // Add security metadata to responses
app.use(securityEventLogger); // Log security events for monitoring

app.use(corsConfig); // Strict CORS policy
app.use(cookieParser()); // Parse cookies securely

// Performance optimization middleware
app.use(requestTimeoutMiddleware); // Prevent hanging requests
app.use(compressionMiddleware); // Response compression with gzip/brotli
app.use(responseOptimizationMiddleware); // Cache headers and response optimization
app.use(performanceMonitor.middleware()); // Performance monitoring and metrics

// Global rate limiting and DDoS protection middleware
app.use(ddosProtection());
app.use(speedLimitMiddleware());
app.use(generalRateLimit());

app.use(securityAudit); // Security event logging
app.use(express.json({ limit: '10mb' })); // JSON parsing with size limit
app.use(responseMiddleware); // Standardized response utilities

// Request logging and performance tracking
app.use(requestLoggingMiddleware); // Log all requests with correlation tracking
app.use(accessLoggingMiddleware); // Access logging with Morgan
app.use(normalizeResponse);

// APM Middleware - should be early in the middleware chain
import { apmService } from './services/apmService.js';
app.use(apmService.middleware());

// Health check route (lightweight)
app.get('/health', (req, res) => {
	res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Request ID and structured request logging
app.use((req, res, next) => {
	const rid = req.headers['x-request-id'] || randomUUID?.() || Math.random().toString(36).slice(2);
	req.headers['x-request-id'] = rid;
	res.setHeader('X-Request-Id', rid);
	const start = Date.now();
	log('info', 'request.start', { request_id: rid, method: req.method, path: req.originalUrl });
	res.on('finish', () => {
		const ms = Date.now() - start;
		log('info', 'request.finish', { request_id: rid, method: req.method, path: req.originalUrl, status: res.statusCode, duration_ms: ms });
	});
	next();
});

// Optional HTTPS enforcement (env-gated)
app.use((req, res, next) => {
	if (process.env.ENFORCE_HTTPS === 'true') {
		const proto = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
		if (proto !== 'https') {
			const url = `https://${req.headers.host}${req.originalUrl}`;
			return res.redirect(308, url);
		}
	}
	next();
});

// Import optimized database service
import optimizedDb from './services/optimizedDatabaseService.js';

// Initialize Redis session middleware and performance services
async function initializeServices() {
  try {
    await redisService.initialize();
    
    // Inject Redis service into middlewares
    setRedisService(redisService);
    setCacheRedisService(redisService);
    setRateLimitRedisService(redisService);
    enhancedSessionManager.setRedisService(redisService);
    
    // Initialize optimized database service
    await optimizedDb.initialize(redisService);
    console.log('✅ Optimized database service initialized');
    
    // Initialize enhanced session middleware with security hardening
    const enhancedSessionMiddleware = await enhancedSessionManager.initialize();
    app.use(enhancedSessionMiddleware);
    
    // Add session security validation middleware
    app.use(enhancedSessionManager.sessionSecurityMiddleware());
    app.use(enhancedSessionManager.concurrentSessionMiddleware(5)); // Max 5 concurrent sessions
    app.use(enhancedSessionManager.privilegeEscalationMiddleware());
    
    loggingService.logSecurity('Enhanced session security middleware initialized', {});
    console.log('✅ Enhanced Redis session middleware with security hardening initialized');
  } catch (error) {
    console.error('❌ Enhanced session initialization failed:', error.message);
    console.warn('⚠️  Continuing with fallback session configuration');
    
    // Fallback to basic session initialization
    try {
      const basicSessionMiddleware = await enhancedSessionManager.initialize();
      app.use(basicSessionMiddleware);
      console.log('✅ Fallback session middleware initialized');
    } catch (fallbackError) {
      console.error('❌ Fallback session initialization failed:', fallbackError.message);
    }
    
    // Still try to initialize optimized database without Redis caching
    try {
      await optimizedDb.initialize();
      console.log('✅ Optimized database service initialized (without Redis caching)');
    } catch (dbError) {
      console.error('❌ Database optimization initialization failed:', dbError.message);
    }
  }
}

// Initialize services
initializeServices();

// Attach user from token when present but do not enforce globally; route-level enforcement uses authenticateToken
app.use(attachUserFromToken);
// Attach lightweight audit helper
app.use(attachRequestAudit);

// Routes
app.use('/api/users', userRoutes);
app.use('/api/visitors', visitorRoutes);
app.use('/api/admin', adminRoutesPhase3);

// Database health monitoring routes
import databaseHealthRoutes from './routes/databaseHealthRoutes.js';
app.use('/api/db', databaseHealthRoutes);

// Cache and session management routes
app.use('/api/cache', createCacheRoutes(redisService));
app.use('/api/rate-limit', rateLimitRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/logging', loggingRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/sessions', sessionRoutes);

// Simple SSE channel for guards/admins
app.get('/api/ws/guards', attachUserFromToken, (req, res) => {
	const role = req.user?.role || null;
	if (!['guard','admin'].includes(role)) {
		res.status(403).json({ success:false, error:'Forbidden' });
		return;
	}
	res.setHeader('Content-Type', 'text/event-stream');
	res.setHeader('Cache-Control', 'no-cache');
	res.setHeader('Connection', 'keep-alive');
	res.flushHeaders?.();

	metrics.sse_clients++;

			const send = (event, data) => {
		try {
									const sev = (data?.severity || 'info');
									const safe = { event_type: data?.event_type, severity: sev, target: data?.target, timestamp: data?.timestamp, outcome: data?.outcome, metadata: { status: data?.metadata?.status } };
				res.write(`event: ${event}\n`);
				res.write(`data: ${JSON.stringify(safe)}\n\n`);
									// Metrics: count emissions by severity
									try {
										metrics.sse_emitted_total = (metrics.sse_emitted_total || 0) + 1;
										if (!metrics.sse_by_severity) metrics.sse_by_severity = { info: 0, warning: 0, error: 0 };
										if (sev === 'warning') metrics.sse_by_severity.warning++;
										else if (sev === 'error') metrics.sse_by_severity.error++;
										else metrics.sse_by_severity.info++;
									} catch {}
		} catch {}
	};
	const onIn = (p) => send('visitor.check_in', p);
	const onOut = (p) => send('visitor.check_out', p);
	const onRev = (p) => send('visitor.revoked', p);
	const onSelf = (p) => send('visitor.self_check_in', p);
	eventBus.on('visitor.check_in', onIn);
	eventBus.on('visitor.check_out', onOut);
	eventBus.on('visitor.revoked', onRev);
	eventBus.on('visitor.self_check_in', onSelf);

	req.on('close', () => {
		eventBus.off('visitor.check_in', onIn);
		eventBus.off('visitor.check_out', onOut);
		eventBus.off('visitor.revoked', onRev);
		eventBus.off('visitor.self_check_in', onSelf);
		metrics.sse_clients = Math.max(0, metrics.sse_clients - 1);
		try { res.end(); } catch {}
	});
});

// Admin-only comprehensive metrics endpoint
app.get('/api/metrics', attachUserFromToken, async (req, res) => {
	const role = req.user?.role || null;
	if (role !== 'admin') return res.status(403).json({ success:false, error:'Forbidden' });
	
	try {
		// Get APM metrics
		const apmMetrics = apmService.getMetrics();
		
		// Get system health
		const systemHealth = await healthCheck.runChecks();
		
		// Enhanced metrics with business intelligence
		const enhancedMetrics = {
			...metrics,
			performance: {
				...apmMetrics,
				systemHealth: {
					status: systemHealth.status,
					database: systemHealth.checks.database,
					memory: systemHealth.checks.memory,
					uptime: systemHealth.checks.uptime
				}
			},
			security: {
				authFailures: metrics.auth_failures || 0,
				otpIssued: metrics.otp_issued || 0,
				otpVerified: metrics.otp_verified || 0,
				visitorRevocations: metrics.visitor_revoked || 0
			},
			business: {
				totalInvites: metrics.bulk_invites || 0,
				activeVisitors: metrics.visitor_checkin - metrics.visitor_checkout || 0,
				completedVisits: metrics.visitor_checkout || 0,
				avgResponseTime: apmMetrics.globalStats?.avgResponseTime || 0,
				errorRate: apmMetrics.globalStats?.errorRate || 0
			},
			system: {
				requestsTotal: apmMetrics.globalStats?.totalRequests || 0,
				slowRequests: apmMetrics.slowRequests?.length || 0,
				timestamp: new Date().toISOString(),
				uptime: process.uptime()
			}
		};
		
		// Check thresholds and generate alerts
		const newAlerts = alertingService.checkThresholds(enhancedMetrics);
		
		res.json({ 
			success: true, 
			data: {
				...enhancedMetrics,
				alerts: {
					active: alertingService.getActiveAlerts().length,
					recent: newAlerts.length,
					stats: alertingService.getAlertStats()
				}
			}
		});
	} catch (error) {
		log('error', 'metrics.collection.failed', { error: error.message });
		res.status(500).json({ 
			success: false, 
			error: 'Failed to collect metrics',
			data: { ...metrics, performance: apmService.getMetrics() }
		});
	}
});

// APM Performance endpoint
app.get('/api/metrics/performance', attachUserFromToken, (req, res) => {
	const role = req.user?.role || null;
	if (role !== 'admin') return res.status(403).json({ success:false, error:'Forbidden' });
	
	res.json({ 
		success: true, 
		data: apmService.getMetrics()
	});
});

// APM Endpoint Statistics
app.get('/api/metrics/endpoints', attachUserFromToken, (req, res) => {
	const role = req.user?.role || null;
	if (role !== 'admin') return res.status(403).json({ success:false, error:'Forbidden' });
	
	res.json({ 
		success: true, 
		data: apmService.getEndpointStats()
	});
});

// Security Events Monitoring
app.get('/api/metrics/security', attachUserFromToken, (req, res) => {
	const role = req.user?.role || null;
	if (role !== 'admin') return res.status(403).json({ success:false, error:'Forbidden' });
	
	const securityMetrics = {
		authentication: {
			failures: metrics.auth_failures || 0,
			successes: (metrics.user_login || 0) - (metrics.auth_failures || 0),
			otpIssued: metrics.otp_issued || 0,
			otpVerified: metrics.otp_verified || 0,
			otpFailures: (metrics.otp_issued || 0) - (metrics.otp_verified || 0)
		},
		visitors: {
			invitesSent: metrics.bulk_invites || 0,
			activeVisitors: Math.max(0, (metrics.visitor_checkin || 0) - (metrics.visitor_checkout || 0)),
			completedVisits: metrics.visitor_checkout || 0,
			revocations: metrics.visitor_revoked || 0
		},
		systemAccess: {
			adminRequests: apmService.getEndpointStats().filter(s => s.path.includes('/admin')).length || 0,
			guardRequests: apmService.getEndpointStats().filter(s => s.path.includes('/ws/guards')).length || 0,
			unauthorizedAttempts: apmService.getMetrics().globalStats?.unauthorizedRequests || 0
		},
		threats: {
			rateLimitHits: 0, // Placeholder for future rate limiting
			suspiciousActivity: 0, // Placeholder for anomaly detection
			blockedIPs: [] // Placeholder for IP blocking
		}
	};
	
	res.json({ 
		success: true, 
		data: securityMetrics,
		timestamp: new Date().toISOString()
	});
});

// Real-time System Status
app.get('/api/metrics/status', attachUserFromToken, async (req, res) => {
	const role = req.user?.role || null;
	if (role !== 'admin') return res.status(403).json({ success:false, error:'Forbidden' });
	
	try {
		const systemHealth = await healthCheck.runChecks();
		const apmMetrics = apmService.getMetrics();
		
		const systemStatus = {
			overall: systemHealth.status === 'healthy' && apmMetrics.globalStats?.errorRate < 0.05 ? 'operational' : 'degraded',
			components: {
				database: systemHealth.checks.database,
				api: {
					status: apmMetrics.globalStats?.errorRate < 0.05 ? 'healthy' : 'degraded',
					responseTime: apmMetrics.globalStats?.avgResponseTime,
					errorRate: apmMetrics.globalStats?.errorRate,
					requestRate: apmMetrics.globalStats?.requestsPerMinute || 0
				},
				memory: systemHealth.checks.memory,
				uptime: systemHealth.checks.uptime
			},
			alerts: [],
			lastUpdated: new Date().toISOString()
		};
		
		// Add alerts for concerning metrics
		if (apmMetrics.globalStats?.errorRate > 0.05) {
			systemStatus.alerts.push({
				level: 'warning',
				message: `High error rate: ${(apmMetrics.globalStats.errorRate * 100).toFixed(1)}%`,
				timestamp: new Date().toISOString()
			});
		}
		
		if (apmMetrics.globalStats?.avgResponseTime > 1000) {
			systemStatus.alerts.push({
				level: 'warning', 
				message: `Slow response time: ${apmMetrics.globalStats.avgResponseTime}ms`,
				timestamp: new Date().toISOString()
			});
		}
		
		if (systemHealth.checks.memory.system && parseInt(systemHealth.checks.memory.system.usage) > 90) {
			systemStatus.alerts.push({
				level: 'critical',
				message: `High memory usage: ${systemHealth.checks.memory.system.usage}`,
				timestamp: new Date().toISOString()
			});
		}
		
		res.json({ 
			success: true, 
			data: systemStatus
		});
	} catch (error) {
		log('error', 'system.status.failed', { error: error.message });
		res.status(500).json({ 
			success: false, 
			error: 'Failed to get system status' 
		});
	}
});

// Alert Management Endpoints
app.get('/api/alerts', attachUserFromToken, (req, res) => {
	const role = req.user?.role || null;
	if (role !== 'admin') return res.status(403).json({ success: false, error: 'Forbidden' });
	
	const alerts = alertingService.getActiveAlerts();
	const stats = alertingService.getAlertStats();
	
	res.json({
		success: true,
		data: {
			alerts,
			stats,
			total: alerts.length
		}
	});
});

app.get('/api/alerts/history', attachUserFromToken, (req, res) => {
	const role = req.user?.role || null;
	if (role !== 'admin') return res.status(403).json({ success: false, error: 'Forbidden' });
	
	const limit = parseInt(req.query.limit) || 100;
	const history = alertingService.getAlertHistory(limit);
	
	res.json({
		success: true,
		data: history
	});
});

app.post('/api/alerts/:alertId/acknowledge', attachUserFromToken, (req, res) => {
	const role = req.user?.role || null;
	if (role !== 'admin') return res.status(403).json({ success: false, error: 'Forbidden' });
	
	const { alertId } = req.params;
	const acknowledged = alertingService.acknowledgeAlert(alertId);
	
	if (acknowledged) {
		res.json({ success: true, message: 'Alert acknowledged' });
	} else {
		res.status(404).json({ success: false, error: 'Alert not found' });
	}
});

app.post('/api/alerts/:alertId/resolve', attachUserFromToken, (req, res) => {
	const role = req.user?.role || null;
	if (role !== 'admin') return res.status(403).json({ success: false, error: 'Forbidden' });
	
	const { alertId } = req.params;
	const resolved = alertingService.resolveAlert(alertId);
	
	if (resolved) {
		res.json({ success: true, message: 'Alert resolved' });
	} else {
		res.status(404).json({ success: false, error: 'Alert not found' });
	}
});

// Error handling middleware (MUST be last)
app.use(notFoundHandler); // Handle 404s for unmatched routes
app.use(errorLoggingMiddleware); // Log all errors with correlation tracking
app.use(globalErrorHandler); // Global error handling

// Initialize transport security validation
initializeTransportSecurity();

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}, starting graceful shutdown...`);
  
  try {
    // Close Redis connections
    await redisService.close();
    
    // Clear session store
    await sessionManager.shutdown();
    
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

// Register shutdown handlers
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

// Ensure a default export is present for ESM imports from server.js
export default app;
