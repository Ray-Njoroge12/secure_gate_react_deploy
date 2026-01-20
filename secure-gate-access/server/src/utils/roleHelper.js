/**
 * @file roleHelper.js
 * @description Centralized role validation utilities to prevent inconsistencies
 * between 'guard' and 'security' role naming
 * 
 * Part of Security Implementation Plan - Sprint 2.1
 */

// Standardized role constants
export const ROLES = {
    ADMIN: 'admin',
    RESIDENT: 'resident',
    GUARD: 'guard', // Preferred canonical name
    SECURITY: 'security', // Alias for guard (legacy support)
    SERVICE_PROVIDER: 'service_provider'
};

// Guard role aliases - both should be treated as equivalent
const GUARD_ROLES = ['guard', 'security'];

/**
 * Normalize a role to its canonical form
 * Maps 'security' to 'guard' for consistency
 * @param {string} role - The role to normalize
 * @returns {string} - The normalized role
 */
export function normalizeRole(role) {
    if (role === 'security') return 'guard';
    return role;
}

/**
 * Check if user has a guard/security role
 * Accepts both 'guard' and 'security' role values
 * @param {Object} user - User object with role property
 * @returns {boolean}
 */
export function isGuard(user) {
    return user && GUARD_ROLES.includes(user.role);
}

/**
 * Check if user is a resident
 * @param {Object} user - User object with role property
 * @returns {boolean}
 */
export function isResident(user) {
    return user?.role === ROLES.RESIDENT;
}

/**
 * Check if user is an admin
 * @param {Object} user - User object with role property
 * @returns {boolean}
 */
export function isAdmin(user) {
    return user?.role === ROLES.ADMIN;
}

/**
 * Check if user is a service provider
 * @param {Object} user - User object with role property
 * @returns {boolean}
 */
export function isServiceProvider(user) {
    return user?.role === ROLES.SERVICE_PROVIDER;
}

/**
 * Check if user has any of the specified roles
 * Handles guard/security aliasing automatically
 * @param {Object} user - User object with role property
 * @param {string[]} roles - Array of allowed roles
 * @returns {boolean}
 */
export function hasAnyRole(user, roles) {
    if (!user || !user.role) return false;

    // Normalize the user's role
    const normalizedUserRole = normalizeRole(user.role);

    // Normalize the allowed roles
    const normalizedRoles = roles.map(normalizeRole);

    return normalizedRoles.includes(normalizedUserRole);
}

/**
 * Check if user role matches exactly (without normalization)
 * Use hasAnyRole for most cases; this is for strict matching
 * @param {Object} user - User object with role property
 * @param {string} role - Role to check
 * @returns {boolean}
 */
export function hasExactRole(user, role) {
    return user?.role === role;
}

/**
 * Get display name for a role
 * @param {string} role - Role identifier
 * @returns {string} - Human readable role name
 */
export function getRoleDisplayName(role) {
    const displayNames = {
        admin: 'Administrator',
        resident: 'Resident',
        guard: 'Security Guard',
        security: 'Security Guard',
        service_provider: 'Service Provider'
    };

    return displayNames[role] || role;
}

/**
 * Check if a role can perform guard operations
 * This includes check-in, walk-in registration, etc.
 * @param {Object} user - User object with role property
 * @returns {boolean}
 */
export function canPerformGuardOperations(user) {
    // Guards and admins can perform guard operations
    return isGuard(user) || isAdmin(user);
}

/**
 * Check if a role can manage residents
 * @param {Object} user - User object with role property
 * @returns {boolean}
 */
export function canManageResidents(user) {
    return isAdmin(user);
}

/**
 * Check if a role can invite visitors
 * @param {Object} user - User object with role property
 * @returns {boolean}
 */
export function canInviteVisitors(user) {
    return isResident(user) || isAdmin(user);
}

/**
 * Middleware factory for role-based access control
 * Use this instead of manual role checks in controllers
 * @param {...string} roles - Allowed roles
 * @returns {Function} - Express middleware function
 */
export function requireAnyRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        if (!hasAnyRole(req.user, roles)) {
            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions',
                requiredRoles: roles
            });
        }

        next();
    };
}

/**
 * Middleware to require guard role (accepts both 'guard' and 'security')
 * @returns {Function} - Express middleware function
 */
export function requireGuard() {
    return requireAnyRole('guard', 'security');
}

/**
 * Middleware to require admin role
 * @returns {Function} - Express middleware function
 */
export function requireAdmin() {
    return requireAnyRole('admin');
}

/**
 * Middleware to require resident role
 * @returns {Function} - Express middleware function
 */
export function requireResident() {
    return requireAnyRole('resident');
}

export default {
    ROLES,
    normalizeRole,
    isGuard,
    isResident,
    isAdmin,
    isServiceProvider,
    hasAnyRole,
    hasExactRole,
    getRoleDisplayName,
    canPerformGuardOperations,
    canManageResidents,
    canInviteVisitors,
    requireAnyRole,
    requireGuard,
    requireAdmin,
    requireResident
};
