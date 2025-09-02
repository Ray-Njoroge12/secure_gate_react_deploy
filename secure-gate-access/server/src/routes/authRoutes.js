const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const router = express.Router();

const SECRET = "secure-gate-secret"; // move to .env later
const users = []; // temp store, replace with DB

// Register
router.post("/register", async (req, res) => {
  try {
    const { username, email, role, area, phone, house, password } = req.body;

    if (users.find((u) => u.email === email)) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const newUser = {
      username,
      email,
      role,      // "resident" or "security"
      area,
      phone,
      house,
      password: hashed,
      verified: true, // skip email verification for now
    };

    users.push(newUser);

    res.json({ message: "User registered successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = users.find((u) => u.email === email);

  if (!user) return res.status(400).json({ message: "User not found" });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(400).json({ message: "Invalid password" });

  const token = jwt.sign({ email: user.email, role: user.role }, SECRET, { expiresIn: "1h" });

  res.json({ token, role: user.role });
});

// Protected test
router.get("/me", (req, res) => {
  const auth = req.headers["authorization"];
  if (!auth) return res.sendStatus(401);
  try {
    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, SECRET);
    res.json({ user: decoded });
  } catch (e) {
    res.sendStatus(403);
  }
});

module.exports = router;
