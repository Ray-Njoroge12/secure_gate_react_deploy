/**
 * Auth Controller
 * Extracted logic from authRoutes.js
 */
import { randomBytes } from 'crypto';
import { userService } from '../services/userService.js';
import { tokenService } from '../services/tokenService.js';
import loggingService from '../services/loggingService.js';
import emailService from '../services/emailService.js';
import { maskEmail } from '../utils/redaction.js';
import { getCookieOptions } from '../utils/cookies.js';
import { AppError } from '../middleware/standardizedErrorHandler.js';
import {
    successResponse,
    createdResponse
} from '../utils/responseFormatter.js';

// Helper: Get platform from headers
const getClientPlatform = (req) => {
    const header = req.headers['x-client-platform'] || req.headers['x-client-type'];
    if (typeof header === 'string') {
        const normalized = header.trim().toLowerCase();
        if (normalized === 'mobile' || normalized === 'api') return 'mobile';
    }
    return 'web';
};

// Helper: Get bearer token
const getBearerToken = (req) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return null;
    const [scheme, token] = authHeader.split(' ');
    if (scheme?.toLowerCase() !== 'bearer') return null;
    return token;
};

/**
 * Register a new user (Resident by default)
 */
export const register = async (req, res) => {
    const { username, first_name, last_name, email, password, phone, estate_id } = req.body;

    loggingService.info('Public registration request received', {
        event: 'auth.register.requested',
        username,
        email: maskEmail(email),
        request_id: req.requestId
    });

    if (!username || !first_name || !last_name || !email || !password) {
        throw new AppError('Missing required registration fields', 400);
    }

    // Validate estate_id if provided
    if (estate_id) {
        const estateCheck = await userService.db.query('SELECT id FROM estates WHERE id = $1', [estate_id]);
        if (estateCheck.rowCount === 0) {
            throw new AppError('Invalid estate selected', 400);
        }
    }

    const user = await userService.createUser({
        username, first_name, last_name, email, password, phone,
        role: 'resident',
        account_status: 'pending',
        estate_id: estate_id || null
    });

    loggingService.info('User created successfully - pending approval', {
        event: 'auth.register.success',
        userId: user.id,
        username: user.username,
        request_id: req.requestId
    });

    // Async email verification
    try {
        await emailService.sendRegistrationConfirmation(user.email, user.username, user.verification_token);
        loggingService.info('Verification email sent successfully', {
            event: 'auth.register.email_sent',
            request_id: req.requestId
        });
    } catch (err) {
        loggingService.error('Failed to send verification email', {
            event: 'auth.register.email_failed',
            error: err.message,
            userId: user.id
        });
    }

    return createdResponse(res, {
        user: { id: user.id, username: user.username, email: user.email, role: user.role }
    }, 'User registered successfully. Please check your email for verification.');
};

/**
 * Login user
 */
export const login = async (req, res) => {
    const { username, email, password, estate_id } = req.body;
    const identifier = username || email;

    if (!identifier || !password) {
        throw new AppError('Identifier and password required', 400);
    }

    const user = await userService.authenticateUser(identifier, password, estate_id);

    if (user.mfa_enabled) {
        loggingService.info('MFA required for user', {
            event: 'auth.login.mfa_required',
            user_id: user.id,
            request_id: req.requestId
        });

        const mfaSessionId = randomBytes(32).toString('hex');
        await userService.db.query(
            `INSERT INTO additional_auth_sessions (session_id, user_id, operation, required_factors, expires_at, ip_address, user_agent)
       VALUES ($1, $2, 'login_mfa', $3, NOW() + INTERVAL '5 minutes', $4, $5)`,
            [mfaSessionId, user.id, JSON.stringify(['totp']), req.ip, req.get('User-Agent')]
        );

        return successResponse(res, { requiresMFA: true, mfaSessionId, userId: user.id, expiresIn: 300 }, 'MFA verification required');
    }

    const platform = getClientPlatform(req);
    const isWeb = platform === 'web';
    const { accessToken, refreshToken, refreshJti, expiresIn, tokenType } = tokenService.generateTokens(user);

    const refreshInfo = tokenService.getTokenInfo(refreshToken);
    const refreshExpiresAt = refreshInfo?.exp ? new Date(refreshInfo.exp * 1000) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await tokenService.storeRefreshToken(refreshJti, user.id, refreshToken, refreshExpiresAt, {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip
    });

    if (isWeb) {
        const cookieOptions = getCookieOptions();
        res.cookie('accessToken', accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
        res.cookie('refreshToken', refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });

        // Ensure browser clients receive a CSRF token as part of login response.
        if (req.session) {
            if (!req.session.csrfToken) {
                req.session.csrfToken = randomBytes(32).toString('hex');
            }
            res.setHeader('X-CSRF-Token', req.session.csrfToken);
        }
    }

    loggingService.info('Login successful', {
        event: 'auth.login.success',
        user_id: user.id,
        session_type: isWeb ? 'cookie' : 'token',
        request_id: req.requestId
    });

    return successResponse(res, {
        user: { id: user.id, username: user.username, role: user.role, estate_id: user.estate_id, mfaEnabled: user.mfa_enabled || false },
        ...(isWeb ? { session: { type: 'cookie' } } : { accessToken, refreshToken, tokenType, expiresIn })
    }, 'Login successful');
};

/**
 * Refresh tokens
 */
export const refresh = async (req, res) => {
    const platform = getClientPlatform(req);
    const isWebClient = platform === 'web';
    const refreshToken = isWebClient ? req.cookies?.refreshToken : (getBearerToken(req) || req.body?.refreshToken);

    if (!refreshToken) {
        throw new AppError('Refresh token required', 400);
    }

    let decoded;
    try {
        decoded = await tokenService.verifyRefreshToken(refreshToken);
    } catch (error) {
        throw new AppError('Invalid refresh token', 401, 'INVALID_TOKEN');
    }

    const userId = Number(decoded.sub || decoded.userId);
    const user = await userService.getUserById(userId);

    if (!user) {
        throw new AppError('Invalid refresh token', 401, 'INVALID_TOKEN');
    }

    const storedToken = await tokenService.getRefreshTokenRecord(refreshToken);
    if (!storedToken || storedToken.is_revoked) {
        const refreshReuseWindow = 30000; // 30s grace window
        const revokedAt = storedToken?.revoked_at ? new Date(storedToken.revoked_at) : null;
        const withinReuseWindow = Boolean(storedToken?.is_revoked && revokedAt && Date.now() - revokedAt.getTime() <= refreshReuseWindow);

        if (!storedToken || !withinReuseWindow) {
            throw new AppError('Refresh token has been revoked', 401, 'INVALID_TOKEN');
        }
    }

    if (storedToken.user_id !== user.id) {
        throw new AppError('Refresh token mismatch', 401, 'INVALID_TOKEN');
    }

    if (storedToken.expires_at && new Date(storedToken.expires_at) <= new Date()) {
        throw new AppError('Refresh token expired', 401, 'INVALID_TOKEN');
    }

    await tokenService.markRefreshTokenUsed(refreshToken);
    if (!storedToken.is_revoked) {
        await tokenService.revokeRefreshToken(refreshToken);
    }

    const { accessToken, refreshToken: nextRefreshToken, refreshJti, expiresIn, tokenType } = tokenService.generateTokens(user);
    const refreshInfo = tokenService.getTokenInfo(nextRefreshToken);
    const refreshExpiresAt = refreshInfo?.exp ? new Date(refreshInfo.exp * 1000) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await tokenService.storeRefreshToken(refreshJti, user.id, nextRefreshToken, refreshExpiresAt, {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip
    });

    if (isWebClient) {
        const cookieOptions = getCookieOptions();
        res.cookie('accessToken', accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
        res.cookie('refreshToken', nextRefreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });
    }

    return successResponse(res, {
        ...(isWebClient ? { session: { type: 'cookie' } } : { accessToken, refreshToken: nextRefreshToken, tokenType, expiresIn })
    }, 'Token refreshed successfully');
};

/**
 * Verify current password
 */
export const verifyPassword = async (req, res) => {
    const { password } = req.body;
    if (!password) throw new AppError('Password is required', 400);

    const isValid = await userService.verifyPassword(req.user.id, password);
    if (!isValid) throw new AppError('Invalid password', 401, 'INVALID_CREDENTIALS');

    return successResponse(res, { verified: true }, 'Password verified successfully');
};

/**
 * Handle password reset request
 */
export const forgotPassword = async (req, res) => {
    const { email } = req.body;
    const genericMessage = 'If this email exists in our system, a password reset link has been sent.';

    try {
        const result = await userService.requestPasswordReset(email);
        if (result && result.user && result.resetToken) {
            await emailService.sendPasswordResetEmail(result.user.email, result.user.username, result.resetToken);
        }
    } catch (error) {
        loggingService.error('Password reset request failed internal', { error: error.message });
    }

    return successResponse(res, {}, genericMessage);
};

/**
 * Reset password with token
 */
export const resetPassword = async (req, res) => {
    const { token, password } = req.body;
    try {
        await userService.resetPasswordWithToken(token, password);
        return successResponse(res, {}, 'Password reset successful');
    } catch (error) {
        throw new AppError('Invalid or expired reset token', 400, 'PASSWORD_RESET_FAILED');
    }
};

/**
 * Get CSRF Token
 */
export const getCsrfToken = async (req, res) => {
    if (!req.session) throw new AppError('Session not initialized', 500);

    if (!req.session.csrfToken) {
        req.session.csrfToken = randomBytes(32).toString('hex');
    }

    res.setHeader('X-CSRF-Token', req.session.csrfToken);
    return successResponse(res, { csrfToken: req.session.csrfToken }, 'CSRF token issued');
};

/**
 * Logout user
 */
export const logout = async (req, res) => {
    const cookieOptions = getCookieOptions();
    const accessToken = getBearerToken(req) || req.cookies?.accessToken;
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (accessToken) await tokenService.revokeToken(accessToken);
    if (refreshToken) await tokenService.revokeRefreshToken(refreshToken);

    res.clearCookie('accessToken', cookieOptions);
    res.clearCookie('refreshToken', cookieOptions);

    // Backward-compat: some older clients stored refresh token cookie on this legacy path.
    if ((cookieOptions.path || '/') !== '/api/auth/refresh') {
        res.clearCookie('refreshToken', { ...cookieOptions, path: '/api/auth/refresh' });
    }

    return successResponse(res, {}, 'Logout successful');
};

/**
 * Get current user profile
 */
export const getProfile = async (req, res) => {
    const { user } = req;
    return successResponse(res, {
        user: {
            id: user.id, username: user.username, email: user.email, role: user.role,
            estate_id: user.estate_id, mfaEnabled: !!user.mfa_enabled
        }
    }, 'Profile retrieved');
};

/**
 * Update user profile
 */
export const updateProfile = async (req, res) => {
    const allowedFields = ['username', 'email', 'phone', 'first_name', 'last_name', 'notify_email', 'notify_sms'];
    const data = {};
    allowedFields.forEach(f => { if (req.body[f] !== undefined) data[f] = req.body[f]; });

    const updated = await userService.updateUser(req.user.id, data);
    return successResponse(res, { user: updated }, 'Profile updated');
};

/**
 * Verify Email
 */
export const verifyEmail = async (req, res) => {
    const { token } = req.query;
    if (!token) throw new AppError('Token required', 400);

    const result = await userService.db.query(
        'SELECT id FROM users WHERE verification_token = $1 AND (verification_expires IS NULL OR verification_expires > NOW())',
        [token]
    );

    if (result.rows.length === 0) throw new AppError('Invalid or expired token', 400);

    await userService.db.query('UPDATE users SET verified = true, verification_token = NULL WHERE id = $1', [result.rows[0].id]);
    return successResponse(res, { verified: true }, 'Email verified');
};

/**
 * Check Email Availability
 */
export const checkEmail = async (req, res) => {
    const { email } = req.query;
    const result = await userService.db.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email?.trim()]);
    return successResponse(res, { exists: result.rows.length > 0 }, 'Email availability checked');
};
