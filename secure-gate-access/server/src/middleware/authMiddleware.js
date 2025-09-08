// server/src/middleware/authMiddleware.js
import pool from '../../../database/db.js';

export async function attachUser(req, res, next) {
	try {
		const headerEmail = req.headers['x-resident-email'];
		if (!headerEmail) return next();
		const q = await pool.query('SELECT id, email, role FROM users WHERE email = $1', [headerEmail]);
		if (q.rowCount > 0) {
			req.user = { id: q.rows[0].id, email: q.rows[0].email, role: q.rows[0].role };
		} else {
			req.user = { id: null, email: headerEmail, role: 'resident' }; // dev fallback
		}
		return next();
	} catch (err) {
		console.error('attachUser error:', err);
		return next();
	}
}

export default attachUser;
