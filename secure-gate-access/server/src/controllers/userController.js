import pool from '../database/db.js';
import { auditLog } from '../services/auditService.js';
import { tokenService, passwordService, accountSecurity } from '../services/tokenService.js';
import auditLogger from '../services/auditLogger.js';
import { ErrorHelper, asyncHandler } from '../middleware/errorHandler.js';
import { CommonResponses, sanitizeUser } from '../utils/responseUtils.js';
import sessionSecurityService from '../services/sessionSecurityService.js';
import loggingService from '../services/loggingService.js';

// Update user profile (PostgreSQL version) - Updated with standardized error handling
export const updateProfile = asyncHandler(async (req, res) => {
	const { email, name, phone, profilePic, notify_email, notify_sms } = req.body;

	// Validation: prevent both notify_email and notify_sms being false if no fallback
	if (notify_email === false && notify_sms === false) {
		// UI fallback will allow OTP/QR view when notifications are disabled
	}
	
	// Input validation
	if (!email) {
		throw ErrorHelper.requiredField('email');
	}

	// Check if user exists
	const existingRes = await pool.query(
		'SELECT id, email, role, name, phone, profile_pic, notify_email, notify_sms, created_at FROM users WHERE email = $1', 
		[email]
	);
	
	if (existingRes.rowCount === 0) {
		throw ErrorHelper.notFound('User', email);
	}
	
	const existing = existingRes.rows[0];

	// Update user profile
	await pool.query(
		'UPDATE users SET name = $1, phone = $2, profile_pic = $3, notify_email = $4, notify_sms = $5 WHERE email = $6',
		[
			name || existing.name || null, 
			phone || existing.phone || null, 
			profilePic || existing.profile_pic || null,
			notify_email !== undefined ? notify_email : existing.notify_email,
			notify_sms !== undefined ? notify_sms : existing.notify_sms,
			email
		]
	);

	// Get updated user data
	const updatedRes = await pool.query(
		'SELECT id, email, role, name, phone, profile_pic, notify_email, notify_sms, created_at FROM users WHERE email = $1', 
		[email]
	);

	return CommonResponses.updated(res, sanitizeUser(updatedRes.rows[0]), 'Profile updated successfully');
});

// Register user with enhanced password security - Updated with standardized error handling
export const registerUser = asyncHandler(async (req, res) => {
	const { email, username, role, password, phone, area, house, notify_email, notify_sms } = req.body;
	
	// Input validation
	const requiredFields = ['email', 'username', 'role', 'password'];
	const missingFields = requiredFields.filter(field => !req.body[field]);
	if (missingFields.length > 0) {
		throw ErrorHelper.requiredField(missingFields.join(', '));
	}

	// Enhanced password strength validation
	const passwordCheck = passwordService.checkPasswordStrength(password);
	if (passwordCheck.strength === 'weak') {
		throw ErrorHelper.invalidFormat('password', 'Strong password required', {
			requirements: passwordCheck.message,
			strength: passwordCheck.strength
		});
	}

	// Check if email already exists
	const exists = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
	if (exists.rowCount > 0) {
		throw ErrorHelper.alreadyExists('User', email);
	}

	// Hash password using Argon2
	const hash = await passwordService.hashPassword(password);
	
	// Create user with secure password hash
	const result = await pool.query(
		`INSERT INTO users (email, username, role, password_hash, verified, phone, area, house, notify_email, notify_sms)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
		 RETURNING id, email, username, role, phone, area, house, notify_email, notify_sms, verified, created_at`,
		[email, username, role, hash, false, phone || null, area || null, house || null,
		 notify_email !== undefined ? notify_email : true,
		 notify_sms !== undefined ? notify_sms : false]
	);

	const newUser = result.rows[0];

	// Log security event
	await auditLog('USER_REGISTERED', newUser.id, {
		email: email,
		role: role,
		ip: req.ip,
		userAgent: req.get('User-Agent')
	});

	return CommonResponses.created(res, sanitizeUser(newUser), 'User registered successfully', {
		requiresVerification: true
	});
});

// Enhanced login with security features
export const loginUser = async (req, res) => {
	try {
		const { email, password } = req.body;
		if (!email || !password) {
			return res.status(400).json({ status: 'error', message: 'Email and password required' });
		}

		// Get user from database
		const result = await pool.query(
			'SELECT id, email, username, role, password_hash, phone, area, house, verified FROM users WHERE email=$1', 
			[email]
		);
		
		if (result.rowCount === 0) {
			// Record failed attempt for non-existent user (prevent enumeration)
			console.warn(`[SECURITY] Login attempt for non-existent email: ${email} from IP: ${req.ip}`);
			
			// Enhanced audit logging
			await auditLogger.logLoginAttempt(
				false, 
				null, 
				req.ip, 
				req.get('User-Agent'), 
				req.sessionID,
				{ email: email, reason: 'user_not_found' }
			);
			
			// Legacy audit log for backwards compatibility
			await auditLog('LOGIN_FAILED', null, {
				email: email,
				reason: 'user_not_found',
				ip: req.ip,
				userAgent: req.get('User-Agent')
			});
			
			return res.status(401).json({ status: 'error', message: 'Invalid credentials' });
		}

		const user = result.rows[0];

		// Check if account is locked
		if (accountSecurity.isAccountLocked(user.id)) {
			const lockInfo = accountSecurity.getLockoutInfo(user.id);
			
			// Enhanced audit logging for account lockout
			await auditLogger.logAccountLockout(
				user.id, 
				req.ip, 
				'login_attempt_while_locked',
				lockInfo.attemptCount
			);
			
			// Legacy audit log
			await auditLog('LOGIN_BLOCKED', user.id, {
				reason: 'account_locked',
				lockoutInfo: lockInfo,
				ip: req.ip,
				userAgent: req.get('User-Agent')
			});
			
			return res.status(423).json({
				status: 'error',
				message: 'Account temporarily locked',
				lockedUntil: lockInfo.lockedUntil,
				remainingTime: Math.ceil(lockInfo.remainingTime / 1000 / 60) // minutes
			});
		}

		// Verify password (supports both bcrypt and argon2)
		let valid = false;
		try {
			if (user.password_hash.startsWith('$argon2')) {
				valid = await passwordService.verifyPassword(password, user.password_hash);
			} else {
				// Legacy bcrypt support
				const bcrypt = await import('bcryptjs');
				valid = await bcrypt.compare(password, user.password_hash);
			}
		} catch (error) {
			console.error('Password verification error:', error);
			return res.status(500).json({ status: 'error', message: 'Authentication system error' });
		}

		if (!valid) {
			// Record failed attempt
			const failInfo = accountSecurity.recordFailedAttempt(user.id, req.ip);
			
			// Enhanced audit logging for failed login
			await auditLogger.logLoginAttempt(
				false,
				user.id,
				req.ip,
				req.get('User-Agent'),
				req.sessionID,
				{ 
					reason: 'invalid_password',
					attemptCount: failInfo.totalAttempts,
					remainingAttempts: failInfo.remainingAttempts,
					isLocked: failInfo.isLocked 
				}
			);
			
			// Legacy audit log
			await auditLog('LOGIN_FAILED', user.id, {
				reason: 'invalid_password',
				failedAttempts: failInfo,
				ip: req.ip,
				userAgent: req.get('User-Agent')
			});

			// Log account lockout if it just occurred
			if (failInfo.isLocked) {
				await auditLogger.logAccountLockout(
					user.id,
					req.ip,
					'too_many_failed_attempts',
					failInfo.totalAttempts
				);
			}

			let message = 'Invalid credentials';
			if (failInfo.isLocked) {
				message = 'Too many failed attempts. Account temporarily locked.';
			} else if (failInfo.remainingAttempts <= 2) {
				message = `Invalid credentials. ${failInfo.remainingAttempts} attempts remaining before lockout.`;
			}

			return res.status(401).json({ 
				status: 'error', 
				message,
				remainingAttempts: failInfo.remainingAttempts
			});
		}

		// Successful login - clear failed attempts
		accountSecurity.clearFailedAttempts(user.id);

		// Initialize secure session with session security service
		try {
			await sessionSecurityService.initializeSession(req, {
				id: user.id,
				email: user.email,
				role: user.role
			});
		} catch (sessionError) {
			loggingService.logSecurity('Session initialization failed during login', {
				error: sessionError.message,
				userId: user.id,
				correlationId: req.correlationId
			});
			// Continue with login but log the issue
		}

		// Generate secure token pair
		const tokens = tokenService.generateTokens({
			id: user.id,
			email: user.email,
			role: user.role
		});

		// Enhanced audit logging for successful login
		await auditLogger.logLoginAttempt(
			true,
			user.id,
			req.ip,
			req.get('User-Agent'),
			req.sessionID,
			{
				role: user.role,
				tokenId: tokens.tokenId,
				loginMethod: 'password',
				sessionSecurityEnabled: true
			}
		);

		// Legacy audit log
		await auditLog('LOGIN_SUCCESS', user.id, {
			role: user.role,
			ip: req.ip,
			userAgent: req.get('User-Agent'),
			tokenId: tokens.tokenId
		});

		// Set secure refresh token cookie
		res.cookie('refreshToken', tokens.refreshToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
			path: '/api/auth/refresh'
		});

		// Remove sensitive data
		delete user.password_hash;

		res.json({
			success: true,
			accessToken: tokens.accessToken,
			tokenType: tokens.tokenType,
			expiresIn: tokens.expiresIn,
			role: user.role,
			user: user
		});

	} catch (err) {
		console.error('Login error:', err);
		const ref = Date.now().toString(36);
		res.status(500).json({ status: 'error', message: 'Server error', details: { ref } });
	}
};

// Refresh access token using refresh token
export const refreshToken = async (req, res) => {
	try {
		const refreshToken = req.cookies.refreshToken;
		
		if (!refreshToken) {
			return res.status(401).json({ 
				status: 'error', 
				message: 'Refresh token not provided' 
			});
		}

		// Verify refresh token
		let decoded;
		try {
			decoded = tokenService.verifyRefreshToken(refreshToken);
		} catch (error) {
			return res.status(401).json({ 
				status: 'error', 
				message: 'Invalid or expired refresh token' 
			});
		}

		// Get current user data
		const result = await pool.query(
			'SELECT id, email, username, role, verified FROM users WHERE id=$1', 
			[decoded.userId]
		);
		
		if (result.rowCount === 0) {
			return res.status(401).json({ 
				status: 'error', 
				message: 'User not found' 
			});
		}

		const user = result.rows[0];

		// Generate new token pair (invalidates old refresh token)
		const tokens = tokenService.generateTokens({
			id: user.id,
			email: user.email,
			role: user.role
		});

		// Set new refresh token cookie
		res.cookie('refreshToken', tokens.refreshToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
			path: '/api/auth/refresh'
		});

		// Enhanced audit logging for token refresh
		await auditLogger.logSecurityEvent('user.token.refresh', {
			oldTokenId: decoded.tokenId,
			newTokenId: tokens.tokenId,
			tokenType: 'jwt_refresh'
		}, {
			userId: user.id,
			ipAddress: req.ip,
			userAgent: req.get('User-Agent'),
			sessionId: req.sessionID
		});

		// Log token refresh
		await auditLog('TOKEN_REFRESHED', user.id, {
			oldTokenId: decoded.tokenId,
			newTokenId: tokens.tokenId,
			ip: req.ip,
			userAgent: req.get('User-Agent')
		});

		res.json({
			success: true,
			accessToken: tokens.accessToken,
			tokenType: tokens.tokenType,
			expiresIn: tokens.expiresIn
		});

	} catch (err) {
		console.error('Token refresh error:', err);
		res.status(500).json({ status: 'error', message: 'Server error' });
	}
};

// Logout and revoke tokens
export const logoutUser = async (req, res) => {
	try {
		const refreshToken = req.cookies.refreshToken;
		const authHeader = req.headers['authorization'];
		const accessToken = authHeader && authHeader.split(' ')[1];

		// Destroy secure session first
		try {
			if (req.session && req.sessionID) {
				await sessionSecurityService.destroySession(req, 'user_logout');
			}
		} catch (sessionError) {
			loggingService.logSecurity('Session destruction failed during logout', {
				error: sessionError.message,
				userId: req.user?.id,
				correlationId: req.correlationId
			});
			// Continue with logout even if session destruction fails
		}

		// Revoke tokens if they exist
		if (refreshToken) {
			tokenService.revokeToken(refreshToken);
		}
		if (accessToken) {
			tokenService.revokeToken(accessToken);
		}

		// Clear refresh token cookie
		res.clearCookie('refreshToken', { path: '/api/auth/refresh' });

		// Enhanced audit logging for logout
		if (req.user) {
			await auditLogger.logSecurityEvent('user.logout', {
				hasRefreshToken: !!refreshToken,
				hasAccessToken: !!accessToken,
				tokensRevoked: true,
				sessionDestroyed: true
			}, {
				userId: req.user.id,
				ipAddress: req.ip,
				userAgent: req.get('User-Agent'),
				sessionId: req.sessionID
			});
		}

		// Log logout
		if (req.user) {
			await auditLog('LOGOUT', req.user.id, {
				ip: req.ip,
				userAgent: req.get('User-Agent')
			});
		}

		res.json({ success: true, message: 'Logged out successfully' });

	} catch (err) {
		console.error('Logout error:', err);
		res.status(500).json({ status: 'error', message: 'Server error' });
	}
};

export default { updateProfile, registerUser, loginUser, refreshToken, logoutUser };
