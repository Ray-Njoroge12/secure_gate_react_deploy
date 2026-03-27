/**
 * Visitor Domain Routes
 * Covers: invites, OTP, check-in/out, walk-ins, approvals, QR codes, bulk, recurring, rideshare, directions, ANPR
 */
import visitorRoutes from '../visitorRoutes.js';
import visitorPublicRoutes from '../visitorPublicRoutes.js';
import checkInRoutes from '../checkInRoutes.js';
import checkOutRoutes from '../checkOutRoutes.js';
import approvalRoutes from '../approvalRoutes.js';
import qrCodeRoutes from '../qrCodeRoutes.js';
import bulkOperationsRoutes from '../bulkOperationsRoutes.js';
import recurringVisitorRoutes from '../recurringVisitorRoutes.js';
import rideshareRoutes from '../rideshareRoutes.js';
import directionsRoutes from '../directionsRoutes.js';
import anprRoutes from '../anprRoutes.js';
import syncRoutes from '../syncRoutes.js';
import autoApprovalRoutes from '../autoApprovalRoutes.js';
import deliveryRoutes from '../deliveryRoutes.js';

export default [
    { prefix: '/api/visitors', router: visitorRoutes, options: { description: 'Visitor invitations & management' } },
    { prefix: '/api/admin/visitors', router: visitorRoutes, options: { description: 'Admin compatibility alias for visitor routes' } },
    { prefix: '/api/public/visitors', router: visitorPublicRoutes, options: { description: 'Visitor public routes (no auth)' } },
    { prefix: '/api/public', router: visitorPublicRoutes, options: { description: 'Legacy public alias' } },
    { prefix: '/api/check-in', router: checkInRoutes, options: { description: 'Visitor check-in' } },
    { prefix: '/api/check-out', router: checkOutRoutes, options: { description: 'Visitor check-out' } },
    { prefix: '/api/approvals', router: approvalRoutes, options: { description: 'Approval workflows' } },
    { prefix: '/api/qr', router: qrCodeRoutes, options: { description: 'QR code generation & validation' } },
    { prefix: '/api/bulk-operations', router: bulkOperationsRoutes, options: { description: 'Bulk invite operations' } },
    { prefix: '/api/recurring-passes', router: recurringVisitorRoutes, options: { description: 'Recurring visitor passes' } },
    { prefix: '/api/rideshare', router: rideshareRoutes, options: { description: 'Rideshare quick-entry' } },
    { prefix: '/api/directions', router: directionsRoutes, options: { description: 'Directions to estate' } },
    { prefix: '/api/anpr', router: anprRoutes, options: { description: 'ANPR / barrier integration (feature-flagged)' } },
    { prefix: '/api/sync', router: syncRoutes, options: { description: 'Offline sync' } },
    { prefix: '/api/auto-approval', router: autoApprovalRoutes, options: { description: 'Auto-approval rules' } },
    { prefix: '/api/deliveries', router: deliveryRoutes, options: { description: 'Delivery management' } },
];
