/**
 * Legacy compatibility entrypoint for System Health Service.
 *
 * HealthCore is the canonical implementation; this file preserves historical
 * import paths used by tests and older runtime modules.
 */

import { healthCore } from './healthCore.js';

export const systemHealthService = healthCore;
export default healthCore;
