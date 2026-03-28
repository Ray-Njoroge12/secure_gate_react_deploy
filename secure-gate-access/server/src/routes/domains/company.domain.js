/**
 * Company Domain Routes
 * Covers: company registration, approval, worker management, passes, check-in/out
 */
import companyRoutes from '../companyRoutes.js';
import workerRoutes from '../workerRoutes.js';

export default [
    { prefix: '/api/companies', router: companyRoutes, options: { description: 'Company registration & management' } },
    { prefix: '/api/workers', router: workerRoutes, options: { description: 'Worker management, passes & check-in' } },
];
