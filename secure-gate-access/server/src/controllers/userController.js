import pool from '../../../database/db.js';

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

export default { updateProfile };
