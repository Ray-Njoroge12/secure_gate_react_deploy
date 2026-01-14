import { requireRole } from './authMiddleware.js';

export const ROLE_POLICIES = Object.freeze({
  adminOnly: ['admin'],
  guardOnly: ['guard'],
  residentOnly: ['resident'],
  adminOrGuard: ['admin', 'guard'],
  adminOrResident: ['admin', 'resident'],
  adminOrSuperAdmin: ['admin', 'super_admin'],
  estateUsers: ['admin', 'guard', 'resident']
});

export const requireRolePolicy = (policy) => {
  if (Array.isArray(policy)) {
    return requireRole(policy);
  }

  const roles = ROLE_POLICIES[policy];
  if (!roles) {
    throw new Error(`Unknown role policy: ${policy}`);
  }

  return requireRole(roles);
};
