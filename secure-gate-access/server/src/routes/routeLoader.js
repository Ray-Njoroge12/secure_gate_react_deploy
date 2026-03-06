/**
 * RouteLoader
 * @description Utility to define and mount route domains within app.js in a single,
 * declarative block. Each domain is a named group of Express routers mapped
 * to a URL prefix.
 */

/**
 * @typedef {Object} RouteDomain
 * @property {string} prefix - The base URL prefix (e.g. '/api/auth')
 * @property {import('express').Router} router - The Express router for this domain
 * @property {Object} [options]
 * @property {boolean} [options.logMount] - Log when this domain is mounted (default: true)
 * @property {string} [options.description] - Human-readable description for startup log
 */

/**
 * Mount all route domains onto the Express app.
 *
 * @param {import('express').Application} app
 * @param {RouteDomain[]} domains
 */
export function loadRoutes(app, domains) {
    const mounted = [];
    const errors = [];

    for (const { prefix, router, options = {} } of domains) {
        const { logMount = true, description = '' } = options;
        try {
            app.use(prefix, router);
            mounted.push({ prefix, description });
            if (logMount && process.env.NODE_ENV !== 'test') {
                // defer logging so it doesn't clutter startup before the server message
                process.nextTick(() => {
                    console.log(`  ✓ ${prefix}${description ? ` (${description})` : ''}`);
                });
            }
        } catch (err) {
            errors.push({ prefix, error: err.message });
            console.error(`  ✗ Failed to mount ${prefix}:`, err.message);
        }
    }

    if (process.env.NODE_ENV !== 'test') {
        process.nextTick(() => {
            console.log(`\n🔀 Route domains loaded: ${mounted.length} mounted, ${errors.length} failed`);
        });
    }

    return { mounted, errors };
}

export default loadRoutes;
