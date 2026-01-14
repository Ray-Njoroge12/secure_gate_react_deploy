// server/src/middleware/roleMiddleware.js
import { requireRole as requireRoleFromAuth } from './authMiddleware.js';

export const requireRole = (...allowedRoles) => requireRoleFromAuth(...allowedRoles);

export default requireRole;
