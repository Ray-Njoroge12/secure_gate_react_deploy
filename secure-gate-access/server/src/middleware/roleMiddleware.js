// server/src/middleware/roleMiddleware.js
// Consolidated with authMiddleware implementation to fix AUTH-009 (Duplicate Middleware)
// and AUTH-007 (Debug Logging PII Leak)
import { requireRole } from './authMiddleware.js';

export { requireRole };
export default requireRole;
