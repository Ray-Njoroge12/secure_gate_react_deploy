/**
 * Admin Domain Routes
 * Covers: admin panel, analytics, breach notifications, compliance, DPA, DSR, consent, tenant provisioning,
 *         incident workflows, integrations, notification queue, performance, monitoring, security, rate limits, enhanced security
 */
import adminRoutes from '../adminRoutes.js';
import adminAnalyticsRoutes from '../adminAnalyticsRoutes.js';
import tenantProvisioningRoutes from '../tenantProvisioningRoutes.js';
import incidentWorkflowRoutes from '../incidentWorkflowRoutes.js';
import integrationsRoutes from '../integrationsRoutes.js';
import notificationQueueRoutes from '../notificationQueueRoutes.js';
import performanceRoutes from '../performanceRoutes.js';
import monitoringRoutes from '../monitoringRoutes.js';
import securityUnifiedRoutes from '../securityUnifiedRoutes.js';
import rateLimitRoutes from '../rateLimitRoutes.js';
import breachNotificationRoutes from '../breachNotificationRoutes.js';
import privacyUnifiedRoutes from '../privacyUnifiedRoutes.js';
import dsrRoutes from '../dsrRoutes.js';
import consentRoutes from '../consentRoutes.js';
import privacyComplianceRoutes from '../privacyComplianceRoutes.js';
import watchlistRoutes from '../watchlistRoutes.js';
import policyRoutes from '../policyRoutes.js';
import dashboardRoutes from '../dashboardRoutes.js';
import residentRoutes from '../residentRoutes.js';
import estateRoutes from '../estateRoutes.js';


export default [
    { prefix: '/api/admin', router: adminRoutes, options: { description: 'Admin panel' } },
    { prefix: '/api/admin/watchlist', router: watchlistRoutes, options: { description: 'Watchlist management' } },
    { prefix: '/api/admin/policies', router: policyRoutes, options: { description: 'Policy engine' } },
    { prefix: '/api/admin/analytics', router: adminAnalyticsRoutes, options: { description: 'Admin analytics' } },
    { prefix: '/api/integrations', router: integrationsRoutes, options: { description: 'Multi-site integrations' } },
    { prefix: '/api/admin/incidents', router: incidentWorkflowRoutes, options: { description: 'Incident workflows' } },
    { prefix: '/api/admin/breach', router: breachNotificationRoutes, options: { description: '72h breach notification' } },
    { prefix: '/api/admin/notification-queue', router: notificationQueueRoutes, options: { description: 'Notification queue management' } },
    { prefix: '/api/tenants', router: tenantProvisioningRoutes, options: { description: 'Tenant provisioning' } },
    { prefix: '/api/dashboard', router: dashboardRoutes, options: { description: 'Dashboard aggregation' } },
    { prefix: '/api/estates', router: estateRoutes, options: { description: 'Estate onboarding' } },
    { prefix: '/api/resident', router: residentRoutes, options: { description: 'Resident features' } },
    { prefix: '/api/privacy/dsr', router: dsrRoutes, options: { description: 'Data subject rights (canonical)' } },
    { prefix: '/api/privacy/consent', router: consentRoutes, options: { description: 'Consent management (canonical)' } },
    { prefix: '/api/privacy', router: privacyUnifiedRoutes, options: { description: 'Data privacy & Kenya DPA routes' } },
    { prefix: '/api/privacy/compliance', router: privacyComplianceRoutes, options: { description: 'Privacy compliance' } },
    { prefix: '/api/dsr', router: dsrRoutes, options: { description: 'Data subject rights (legacy path)' } },
    { prefix: '/api/consent', router: consentRoutes, options: { description: 'Consent management (legacy path)' } },
    { prefix: '/api/performance', router: performanceRoutes, options: { description: 'Performance monitoring' } },
    { prefix: '/api/monitoring', router: monitoringRoutes, options: { description: 'Monitoring dashboard' } },
    { prefix: '/api/security', router: securityUnifiedRoutes, options: { description: 'Security configuration & enhanced security' } },
    { prefix: '/api/rate-limits', router: rateLimitRoutes, options: { description: 'Rate limit management' } },

];
