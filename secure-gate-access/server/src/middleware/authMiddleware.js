// server/src/middleware/authMiddleware.js
import pool from '../database/db.js';
import { tokenService } from '../services/tokenService.js';

// Enhanced authentication middleware with secure token verification
export async function authenticateToken(req, res, next) {
	try {
		const authHeader = req.headers['authorization'];
		const token = authHeader && authHeader.split(' ')[1];

		if (!token) {
			console.log('[AUTH] No token provided');
			return res.status(401).json({ success: false, message: 'Token required' });
		}

		// Verify token using enhanced token service
		let payload;
		try {
			payload = tokenService.verifyAccessToken(token);
		} catch (error) {
			console.log('[AUTH] Token verification failed:', error.message);
			return res.status(401).json({ success: false, message: 'Invalid or expired token' });
		}

		console.log('[AUTH] Token decoded:', { email: payload.email, role: payload.role, exp: new Date(payload.exp * 1000) });

		// Validate required fields
		if (!payload.email) {
			console.log('[AUTH] Token missing email field');
			return res.status(401).json({ success: false, message: 'Invalid token format' });
		}

		// Look up user in database to get full user info
		const userQuery = await pool.query(
			'SELECT id, email, username, role, verified FROM users WHERE LOWER(email) = LOWER($1)',
			[payload.email]
		);

		if (userQuery.rowCount === 0) {
			console.log('[AUTH] User not found in database:', payload.email);
			return res.status(401).json({ success: false, message: 'User not found' });
		}

		const dbUser = userQuery.rows[0];
		console.log('[AUTH] Database user found:', { id: dbUser.id, email: dbUser.email, role: dbUser.role });

		// Set req.user with database info
		req.user = {
			id: dbUser.id,
			email: dbUser.email,
			username: dbUser.username,
			role: dbUser.role,
			verified: dbUser.verified
		};

		return next();
	} catch (err) {
		if (err.name === 'JsonWebTokenError') {
			console.log('[AUTH] Invalid JWT:', err.message);
			return res.status(401).json({ success: false, message: 'Invalid token' });
		} else if (err.name === 'TokenExpiredError') {
			console.log('[AUTH] Expired JWT:', err.message);
			return res.status(401).json({ success: false, message: 'Token expired' });
		} else {
			console.error('[AUTH] Unexpected error:', err);
			return res.status(500).json({ success: false, message: 'Authentication error' });
		}
	}
}

// Convenience middleware: attach user when Authorization header present but don't fail.
export async function attachUserFromToken(req, res, next) {
	try {
		const authHeader = req.headers['authorization'];
		const token = authHeader && authHeader.split(' ')[1];
		if (!token) return next();
		
		// Use standardized token service
		const payload = tokenService.verifyAccessToken(token);
		
		// Support both legacy and new token structures
		const userIdentifier = payload.email || payload.sub || payload.userId;
		if (!userIdentifier) return next();
		
		// Look up user in database - support both email and user ID lookups
		let userQuery;
		if (userIdentifier.includes('@')) {
			// Email lookup for legacy tokens
			userQuery = await pool.query(
				'SELECT id, email, username, role, verified FROM users WHERE LOWER(email) = LOWER($1)',
				[userIdentifier]
			);
		} else {
			// ID lookup for standardized tokens (sub claim)
			userQuery = await pool.query(
				'SELECT id, email, username, role, verified FROM users WHERE id = $1',
				[parseInt(userIdentifier)]
			);
		}
		
		if (userQuery.rowCount > 0) {
			const dbUser = userQuery.rows[0];
			req.user = {
				id: dbUser.id,
				email: dbUser.email,
				username: dbUser.username,
				role: dbUser.role,
				verified: dbUser.verified
			};
		}
	} catch (err) {
		// ignore invalid token in attachUserFromToken (non-fatal)
		console.log('[AUTH] Non-fatal token error in attachUserFromToken:', err.message);
	}
	return next();
}

export default authenticateToken;
