import pool from '../database/db.js';  
// Update user profile
const updateProfile = async (req, res) => {
  const { email, name, phone, profilePic } = req.body;
  try {
    const result = await pool.query(
      "UPDATE users SET name = $1, phone = $2, profile_pic = $3 WHERE email = $4 RETURNING *",
      [name, phone, profilePic, email]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export default { updateProfile };  // 🔑 ES Module export
