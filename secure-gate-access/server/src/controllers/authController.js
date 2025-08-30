const pool = require("../database/db");

async function login(req, res, role) {
  const { email, password } = req.body;

  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1 AND password = $2 AND role = $3",
      [email, password, role]
    );

    if (result.rows.length > 0) {
      res.json({ success: true, token: "fake-jwt-token", role });
    } else {
      res.status(401).json({ success: false, message: "Invalid credentials" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

module.exports = { login };
