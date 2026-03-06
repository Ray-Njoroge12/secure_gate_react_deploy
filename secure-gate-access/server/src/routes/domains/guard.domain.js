/**
 * Guard Domain Routes
 * Covers: guard operations, incidents, analytics, management, events, collaboration, emergency, announcements, whatsapp
 */
import guardRoutes from '../guardRoutes.js';
import guardManagementRoutes from '../guardManagementRoutes.js';
import guardIncidentRoutes from '../guardIncidentRoutes.js';
import guardAnalyticsRoutes from '../guardAnalyticsRoutes.js';
import emergencyRoutes from '../emergencyRoutes.js';
import eventManagementRoutes from '../eventManagementRoutes.js';
import collaborationRoutes from '../collaborationRoutes.js';
import announcementsRoutes from '../announcementsRoutes.js';
import whatsappRoutes from '../whatsappRoutes.js';

export default [
    { prefix: '/api/guard', router: guardRoutes, options: { description: 'Guard operations' } },
    { prefix: '/api/guards', router: guardManagementRoutes, options: { description: 'Guard shift & management' } },
    { prefix: '/api/guard/incidents', router: guardIncidentRoutes, options: { description: 'Guard incident reporting' } },
    { prefix: '/api/guard/analytics', router: guardAnalyticsRoutes, options: { description: 'Guard performance analytics' } },
    { prefix: '/api/emergency', router: emergencyRoutes, options: { description: 'Emergency / panic button' } },
    { prefix: '/api/events', router: eventManagementRoutes, options: { description: 'Event management & bulk invitations' } },
    { prefix: '/api/collaboration', router: collaborationRoutes, options: { description: 'Cross-role collaboration' } },
    { prefix: '/api/announcements', router: announcementsRoutes, options: { description: 'Announcements' } },
    { prefix: '/api/whatsapp', router: whatsappRoutes, options: { description: 'WhatsApp Business API' } },
];
