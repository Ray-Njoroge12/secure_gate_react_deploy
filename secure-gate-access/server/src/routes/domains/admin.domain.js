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
import securityRoutes from '../securityRoutes.js';
import enhancedSecurityRoutes from '../enhancedSecurityRoutes.js';
import rateLimitRoutes from '../rateLimitRoutes.js';
import breachNotificationRoutes from '../breachNotificationRoutes.js';
import kenyaDPARoutes from '../kenyaDPARoutes.js';
import dataPrivacyRoutes from '../dataPrivacyRoutes.js';
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
    { prefix: '/api/admin/analytics', router: kenyaDPARoutes, options: { description: 'Kenya DPA admin routes' } },
    { prefix: '/api/admin', router: integrationsRoutes, options: { description: 'Multi-site integrations' } },
    { prefix: '/api/admin/incidents', router: incidentWorkflowRoutes, options: { description: 'Incident workflows' } },
    { prefix: '/api/admin/breach', router: breachNotificationRoutes, options: { description: '72h breach notification' } },
    { prefix: '/api/admin/notification-queue', router: notificationQueueRoutes, options: { description: 'Notification queue management' } },
    { prefix: '/api/tenants', router: tenantProvisioningRoutes, options: { description: 'Tenant provisioning' } },
    { prefix: '/api/dashboard', router: dashboardRoutes, options: { description: 'Dashboard aggregation' } },
    { prefix: '/api/estates', router: estateRoutes, options: { description: 'Estate onboarding' } },
    { prefix: '/api/resident', router: residentRoutes, options: { description: 'Resident features' } },
    { prefix: '/api/privacy', router: dataPrivacyRoutes, options: { description: 'Data privacy (Kenya DPA)' } },
    { prefix: '/api/privacy', router: kenyaDPARoutes, options: { description: 'Kenya DPA privacy routes' } },
    { prefix: '/api/privacy', router: privacyComplianceRoutes, options: { description: 'Privacy compliance' } },
    { prefix: '/api/dsr', router: dsrRoutes, options: { description: 'Data subject rights' } },
    { prefix: '/api/consent', router: consentRoutes, options: { description: 'Consent management' } },
    { prefix: '/api/performance', router: performanceRoutes, options: { description: 'Performance monitoring' } },
    { prefix: '/api/monitoring', router: monitoringRoutes, options: { description: 'Monitoring dashboard' } },
    { prefix: '/api/security', router: securityRoutes, options: { description: 'Security configuration' } },
    { prefix: '/api/security', router: enhancedSecurityRoutes, options: { description: 'Enhanced security features' } },
    { prefix: '/api/rate-limits', router: rateLimitRoutes, options: { description: 'Rate limit management' } },

];
