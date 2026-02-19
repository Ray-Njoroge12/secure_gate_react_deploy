/**
 * @file tours/index.js
 * @description Driver.js tour registry and shared configuration.
 * Creates configured driver instances for role-specific product tours.
 */

import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import '../styles/driver-theme.css';

/**
 * Create a configured driver.js instance with shared defaults.
 * @param {Array} steps - Array of driver.js step objects
 * @param {Object} options - Override options
 * @returns {Object} driver.js instance
 */
export function createDriver(steps, options = {}) {
  const driverInstance = driver({
    showProgress: true,
    animate: true,
    overlayColor: 'rgba(0, 0, 0, 0.75)',
    smoothScroll: true,
    allowClose: true,
    stagePadding: 8,
    stageRadius: 8,
    popoverClass: 'securegate-tour-popover',
    steps,
    ...options,
  });

  return driverInstance;
}

export { default as residentTourSteps } from './residentTour';
export { default as guardTourSteps } from './guardTour';
export { default as adminTourSteps } from './adminTour';
export { default as visitorTourSteps } from './visitorTour';
