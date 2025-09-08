import jwt from 'jsonwebtoken';
import pool from '../../../database/db.js';

const SECRET = process.env.SECRET_KEY || 'supersecretkey';

export default async function authMiddleware(req, res, next) {
  try {
    // 1) Try Authorization: Bearer <token>
    const auth = req.headers.authorization || '';
    if (auth.startsWith('Bearer ')) {
      const token = auth.slice(7);
      try {
        const payload = jwt.verify(token, SECRET);
        // Accept several possible subject fields (sub, id, userId)
        const subject = payload.sub || payload.id || payload.userId;
        if (subject) {
          // There are two possibilities: id is uuid or email — attempt both safe queries
          let userRes;
          // If subject looks like an email (contains @), query by email
          if (typeof subject === 'string' && subject.includes('@')) {
            userRes = await pool.query('SELECT id, email, role FROM users WHERE email = $1', [subject]);
          } else {
            userRes = await pool.query('SELECT id, email, role FROM users WHERE id = $1', [subject]);
          }
          if (userRes && userRes.rowCount > 0) {
            req.user = {
              id: userRes.rows[0].id,
              email: userRes.rows[0].email,
              role: userRes.rows[0].role
            };
            return next();
          }
        }
      } catch (jwtErr) {
        // token invalid — continue to fallback
        console.warn('[auth] JWT verify failed:', jwtErr.message);
      }
    }

    // 2) Fallback: x-resident-email header (useful for local/dev/testing)
    const email = req.headers['x-resident-email'];
    if (email) {
      const u = await pool.query('SELECT id, email, role FROM users WHERE email = $1', [email]);
      if (u && u.rowCount > 0) {
        req.user = { id: u.rows[0].id, email: u.rows[0].email, role: u.rows[0].role };
        return next();
      }
    }

    // If neither method yields a user, return 401
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  } catch (err) {
    console.error('[auth] unexpected error:', err);
    return res.status(500).json({ success: false, error: 'Auth middleware failure' });
  }
}
