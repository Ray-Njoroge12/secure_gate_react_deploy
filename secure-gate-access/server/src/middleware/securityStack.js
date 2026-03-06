/**
 * Security Stack Middleware
 * Unifies comprehensive security headers, transport security, and CSRF protection.
 * Consolidates transportSecurity.js, securityHeaders.js, and securityHeadersMiddleware.js.
 */
import helmet from 'helmet';
import { randomBytes } from 'crypto';
import securityConfig from '../config/securityConfig.js';
import loggingService from '../services/loggingService.js';
import { errorResponse } from '../utils/responseFormatter.js';
import { getCookieOptions } from '../utils/cookies.js';

const {
    cspDirectives,
    hstsConfig,
    permissionsPolicy,
    securityHeaders,
    environmentConfig
} = securityConfig;

/**
 * 1. Generate unique nonce for each request (prevents XSS)
 */
export const generateNonce = (req, res, next) => {
    res.locals.nonce = randomBytes(16).toString('base64');
    next();
};

/**
 * 2. Unified Helmet & Custom Security Headers
 */
export const unifiedSecurityMiddleware = (req, res, next) => {
    const isSensitive = req.path.includes('/api/auth/') || req.path.includes('/api/admin/') || req.path.includes('/api/security/');

    // Custom headers that Helmet doesn't manage or that need specific values
    res.set({
        'X-Permitted-Cross-Domain-Policies': 'none',
        'Server': 'SecureGate',
        'X-Request-ID': req.requestId,
        ...(isSensitive && {
            'Cache-Control': 'no-store, no-cache, must-revalidate, private',
            'Pragma': 'no-cache',
            'Expires': '0'
        })
    });

    // Apply Helmet with unified config
    return helmet({
        contentSecurityPolicy: {
            directives: {
                ...cspDirectives,
                // Ensure nonce is injected into script/style tags
                scriptSrc: cspDirectives.scriptSrc.map(s => typeof s === 'function' ? s(req, res) : s),
                styleSrc: cspDirectives.styleSrc.map(s => typeof s === 'function' ? s(req, res) : s)
            },
            reportOnly: environmentConfig.cspReportOnly,
            useDefaults: false
        },
        hsts: environmentConfig.strictTransportSecurity ? hstsConfig : false,
        frameguard: { action: securityHeaders.frameOptions.toLowerCase() },
        noSniff: true,
        xssFilter: true,
        referrerPolicy: { policy: securityHeaders.referrerPolicy },
        ieNoOpen: true,
        dnsPrefetchControl: { allow: false },
        crossOriginEmbedderPolicy: false,
        crossOriginOpenerPolicy: { policy: securityHeaders.crossOriginOpenerPolicy },
        crossOriginResourcePolicy: { policy: securityHeaders.crossOriginResourcePolicy },
        permissionsPolicy: permissionsPolicy,
        hidePoweredBy: true
    })(req, res, next);
};

/**
 * 3. Secure Cookie Wrapper
 * Overrides res.cookie to ensure mandatory security flags in production
 */
export const secureCookieMiddleware = (req, res, next) => {
    const originalCookie = res.cookie.bind(res);
    const baseOptions = getCookieOptions();
    const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';

    res.cookie = (name, value, options = {}) => {
        const secureOptions = {
            ...baseOptions,
            ...options,
            httpOnly: options.httpOnly !== false,
            secure: options.secure ?? (environmentConfig.httpsOnly || isHttps),
            sameSite: options.sameSite ?? baseOptions.sameSite
        };
        return originalCookie(name, value, secureOptions);
    };
    next();
};

/**
 * 4. Unified CSRF Protection
 */
export const csrfMiddleware = {
    // Protection logic
    protect: (req, res, next) => {
        if (process.env.NODE_ENV === 'test' || (process.env.NODE_ENV === 'development' && process.env.DISABLE_CSRF === 'true')) return next();
        if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

        const publicEndpoints = ['/api/auth/login', '/api/auth/register', '/api/auth/refresh', '/api/health', '/api/public'];
        if (publicEndpoints.some(e => req.path.startsWith(e))) return next();

        const token = req.headers['x-csrf-token'] || req.headers['csrf-token'] || req.body?._csrf || req.cookies?.['csrf-token'];
        const sessionToken = req.session?.csrfToken;

        if (!token || !sessionToken || token !== sessionToken) {
            loggingService.logSecurity('warn', 'CSRF validation failed', { statusCode: 403, method: req.method, path: req.path });
            return errorResponse(res, 'Invalid or missing CSRF token', 'CSRF_VALIDATION_FAILED', 403, null, req);
        }
        next();
    },

    // Generator logic
    generate: (req, res, next) => {
        if (req.session && !req.session.csrfToken) {
            req.session.csrfToken = randomBytes(32).toString('hex');
        }
        if (req.session?.csrfToken) {
            res.setHeader('X-CSRF-Token', req.session.csrfToken);
        }
        next();
    }
};

/**
 * Composite Security Stack
 */
export const securityStack = [
    generateNonce,
    unifiedSecurityMiddleware,
    secureCookieMiddleware,
    csrfMiddleware.generate,
    csrfMiddleware.protect
];

export default securityStack;
