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
const crypto = require("crypto");
let resetTokens = []; // { email, token, expires }

router.post("/forgot-password", (req, res) => {
  const { email } = req.body;
  const user = users.find((u) => u.email === email);
  if (!user) return res.status(400).json({ message: "User not found" });

  const token = crypto.randomBytes(20).toString("hex");
  resetTokens.push({ email, token, expires: Date.now() + 15 * 60 * 1000 }); // 15 min

  // TODO: send email in real project
  res.json({ message: "Reset link generated", resetLink: `http://localhost:3000/reset-password/${token}` });
});

router.post("/reset-password/:token", async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  const stored = resetTokens.find((t) => t.token === token && t.expires > Date.now());
  if (!stored) return res.status(400).json({ message: "Invalid or expired token" });

  const user = users.find((u) => u.email === stored.email);
  user.password = await bcrypt.hash(password, 10);

  resetTokens = resetTokens.filter((t) => t.token !== token); // clear token
  res.json({ message: "Password reset successful" });
});

