const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const router = express.Router();

const SECRET = "secure-gate-secret"; // move to .env later
const users = []; // temp store, replace with DB

// Register
router.post("/register", async (req, res) => {
  const { username, password } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  users.push({ username, password: hashed });
  res.json({ message: "User registered" });
});

// Login
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = users.find((u) => u.username === username);
  if (!user) return res.status(400).json({ error: "User not found" });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(400).json({ error: "Invalid password" });

  const token = jwt.sign({ username }, SECRET, { expiresIn: "1h" });
  res.json({ token });
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
