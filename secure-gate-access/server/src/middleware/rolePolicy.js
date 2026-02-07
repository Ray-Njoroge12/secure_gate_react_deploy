import { requireRole } from './authMiddleware.js';

export const ROLE_POLICIES = Object.freeze({
  adminOnly: ['admin', 'super_admin'],
  guardOnly: ['guard'],
  residentOnly: ['resident'],
  adminOrGuard: ['admin', 'guard', 'super_admin'],
  adminOrResident: ['admin', 'resident', 'super_admin'],
  adminOrSuperAdmin: ['admin', 'super_admin'],
  estateUsers: ['admin', 'guard', 'resident', 'super_admin']
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
