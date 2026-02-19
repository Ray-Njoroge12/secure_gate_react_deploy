/**
 * @file services/tourService.js
 * @description Singleton tour management service using driver.js.
 * Manages tour lifecycle: start, complete, reset, and persistence.
 *
 * Reuses existing localStorage key pattern: securegate-tour-completed-{role}
 */

import { createDriver, residentTourSteps, guardTourSteps, adminTourSteps, visitorTourSteps } from '../tours';

const TOUR_KEY_PREFIX = 'securegate-tour-completed-';

// Map roles to their tour step definitions
const tourStepsMap = {
  resident: residentTourSteps,
  guard: guardTourSteps,
  admin: adminTourSteps,
  super_admin: adminTourSteps, // Super admin uses admin tour
  visitor: visitorTourSteps,
};

// Active driver instance (only one tour at a time)
let activeDriver = null;

/**
 * Start a guided tour for the given role.
 * Destroys any active tour before starting a new one.
 *
 * @param {string} role - User role ('resident' | 'guard' | 'admin' | 'super_admin' | 'visitor')
 * @param {Object} options - Optional driver.js overrides
 * @param {Function} options.onComplete - Callback fired when tour finishes
 * @param {Function} options.onSkip - Callback fired when tour is dismissed
 * @returns {Object|null} driver.js instance, or null if no steps found
 */
export function startTour(role, options = {}) {
  const steps = tourStepsMap[role];
  if (!steps || steps.length === 0) {
    console.warn(`[tourService] No tour steps defined for role: ${role}`);
    return null;
  }

  // Destroy any active tour
  if (activeDriver) {
    try {
      activeDriver.destroy();
    } catch (_) {
      // Ignore — driver may already be destroyed
    }
  }

  const { onComplete, onSkip, ...driverOptions } = options;

  activeDriver = createDriver(steps, {
    onDestroyStarted: () => {
      // Check if tour was completed (on last step) or skipped
      if (activeDriver && activeDriver.isLastStep()) {
        completeTour(role);
        if (onComplete) onComplete();
      } else {
        // Skipped — still mark as completed so we don't nag
        completeTour(role);
        if (onSkip) onSkip();
      }
      activeDriver.destroy();
    },
    onDestroyed: () => {
      activeDriver = null;
    },
    ...driverOptions,
  });

  activeDriver.drive();
  return activeDriver;
}

/**
 * Mark a tour as completed in localStorage.
 * @param {string} role
 */
export function completeTour(role) {
  try {
    localStorage.setItem(`${TOUR_KEY_PREFIX}${role}`, 'completed');
  } catch (e) {
    console.warn('[tourService] Could not write to localStorage:', e);
  }
}

/**
 * Check if a tour has been completed (or skipped).
 * @param {string} role
 * @returns {boolean}
 */
export function isTourCompleted(role) {
  try {
    return !!localStorage.getItem(`${TOUR_KEY_PREFIX}${role}`);
  } catch (e) {
    return false;
  }
}

/**
 * Reset tour completion — removes the localStorage flag.
 * Call this before startTour() to re-launch a tour.
 * @param {string} role
 */
export function resetTour(role) {
  try {
    localStorage.removeItem(`${TOUR_KEY_PREFIX}${role}`);
  } catch (e) {
    console.warn('[tourService] Could not clear localStorage:', e);
  }
}

/**
 * Destroy the currently active tour, if any.
 */
export function destroyActiveTour() {
  if (activeDriver) {
    try {
      activeDriver.destroy();
    } catch (_) {
      // Ignore
    }
    activeDriver = null;
  }
}

/**
 * Get available roles that have tour definitions.
 * @returns {string[]}
 */
export function getAvailableRoles() {
  return Object.keys(tourStepsMap);
}

export default {
  startTour,
  completeTour,
  isTourCompleted,
  resetTour,
  destroyActiveTour,
  getAvailableRoles,
};
