// server/src/middleware/roleMiddleware.js
import { errorResponse } from '../utils/responseFormatter.js';
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    try {
      const userRole = req.user?.role || null;
      const userEmail = req.user?.email || 'unknown';

      console.log(`[ROLE] Checking role for ${userEmail}: has "${userRole}", requires one of [${allowedRoles.join(', ')}]`);

      if (!userRole) {
        console.log('[ROLE] No role found in req.user');
        return errorResponse(res, 'Unauthorized - no role', 'UNAUTHORIZED', 401, null, req);
      }

      if (allowedRoles.length && !allowedRoles.includes(userRole)) {
        console.log(`[ROLE] Role "${userRole}" not in allowed roles [${allowedRoles.join(', ')}]`);
        return errorResponse(res, 'Forbidden - insufficient role', 'FORBIDDEN', 403, null, req);
      }

      console.log('[ROLE] Role check passed');
      return next();
    } catch (err) {
      console.error('[ROLE] Role middleware error:', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  };
}

export default requireRole;
