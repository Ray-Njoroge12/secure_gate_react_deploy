import pool from '../../../database/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Update user profile (PostgreSQL version)
export const updateProfile = async (req, res) => {
	const { email, name, phone, profilePic } = req.body;
	if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

	try {
		const existingRes = await pool.query('SELECT id, email, role, name, phone, profile_pic, created_at FROM users WHERE email = $1', [email]);
		if (existingRes.rowCount === 0) {
			return res.status(404).json({ success: false, message: 'User not found' });
		}
		const existing = existingRes.rows[0];

		await pool.query(
			'UPDATE users SET name = $1, phone = $2, profile_pic = $3 WHERE email = $4',
			[name || existing.name || null, phone || existing.phone || null, profilePic || existing.profile_pic || null, email]
		);

		const updatedRes = await pool.query('SELECT id, email, role, name, phone, profile_pic, created_at FROM users WHERE email = $1', [email]);
		res.json({ success: true, user: updatedRes.rows[0] });
	} catch (err) {
		console.error('updateProfile error', err);
		res.status(500).json({ success: false, message: 'Server error' });
	}
};

// Register user (used by /api/users/register)
export const registerUser = async (req, res) => {
	try {
		const { email, username, role, password, phone, area, house } = req.body;
		if (!email || !username || !role || !password) {
			return res.status(400).json({ success: false, message: 'Missing required fields' });
		}
		if (password.length < 8 || !/\d/.test(password)) {
			return res.status(400).json({ success: false, message: 'Weak password (min 8 chars incl. number)' });
		}
		// quick connectivity sanity check (cheap)
		// await pool.query('SELECT 1');
		const exists = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
		if (exists.rowCount > 0) {
			return res.status(409).json({ success: false, message: 'Email already registered' });
		}
		console.log('[RegisterUser] invoked payload:', req.body);
		const salt = await bcrypt.genSalt(10);
		const hash = await bcrypt.hash(password, salt);
		// Use existing schema column name: password (not password_hash)
		const result = await pool.query(
			`INSERT INTO users (email, username, role, password_hash, verified, phone, area, house)
			 VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
			 RETURNING id, email, username, role, phone, area, house, verified, created_at`,
			[email, username, role, hash, false, phone || null, area || null, house || null]
		);
		res.status(201).json({ success: true, user: result.rows[0] });
	} catch (err) {
		console.error('[RegisterUser] error:', err);
		if (err.code === '23505') {
			return res.status(409).json({ success: false, message: 'Email already registered' });
		}
		// Provide an internal reference id for easier debugging
		const ref = Date.now().toString(36);
		res.status(500).json({ success: false, message: 'Server error', ref });
	}
};

// Login user (used by /api/users/login)
export const loginUser = async (req, res) => {
	try {
		const { email, password } = req.body;
		if (!email || !password) {
			return res.status(400).json({ success: false, message: 'Email and password required' });
		}
		const result = await pool.query('SELECT id, email, username, role, password_hash, phone, area, house, verified FROM users WHERE email=$1', [email]);
		if (result.rowCount === 0) {
			return res.status(401).json({ success: false, message: 'Invalid credentials' });
		}
		const user = result.rows[0];
		const valid = await bcrypt.compare(password, user.password_hash);
		if (!valid) {
			return res.status(401).json({ success: false, message: 'Invalid credentials' });
		}
		const secret = process.env.JWT_SECRET || 'dev-insecure-secret-change-me';
		const token = jwt.sign({ sub: user.id, role: user.role }, secret, { expiresIn: '1h' });
		delete user.password_hash;
		res.json({ success: true, token, role: user.role, user });
	} catch (err) {
		console.error('[LoginUser] error:', { message: err.message, code: err.code, detail: err.detail, stack: err.stack });
		const ref = Date.now().toString(36);
		res.status(500).json({ success: false, message: 'Server error', ref });
	}
};

export default { updateProfile, registerUser, loginUser };
