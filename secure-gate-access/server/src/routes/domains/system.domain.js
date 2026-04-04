/**
 * System Domain Routes
 * Covers: health, system info, db health, cache, SSE, notifications, webhooks, whatsapp callback
 */
import healthRoutes from '../healthRoutes.js';
import systemRoutes from '../systemRoutes.js';
import databaseHealthRoutes from '../databaseHealthRoutes.js';
import cacheRoutes from '../cacheRoutes.js';
import sseRoutes from '../sseRoutes.js';
import notificationRoutes from '../notificationRoutes.js';
import notificationWebhooks from '../notificationWebhooks.js';

// Cache middleware is required for cacheRoutes factory fn
import cacheMiddleware from '../../middleware/cacheMiddleware.js';

export default [
    { prefix: '/health', router: healthRoutes, options: { description: 'Load balancer health check' } },
    { prefix: '/api/health', router: healthRoutes, options: { description: 'API health check' } },
    { prefix: '/api/system', router: systemRoutes, options: { description: 'System info & status' } },
    { prefix: '/api/db', router: databaseHealthRoutes, options: { description: 'Database health' } },
    { prefix: '/api/cache', router: cacheRoutes(cacheMiddleware), options: { description: 'Cache management' } },
    { prefix: '/api/sse', router: sseRoutes, options: { description: 'Server-Sent Events (real-time)' } },
    { prefix: '/api/notifications', router: notificationRoutes, options: { description: 'Notification management' } },
    { prefix: '/api/intelligent-notifications', router: notificationRoutes, options: { description: 'Notification management (legacy alias; deprecated)' } },
    { prefix: '/api/webhooks', router: notificationWebhooks, options: { description: 'Notification delivery webhooks (no auth)' } },
];
