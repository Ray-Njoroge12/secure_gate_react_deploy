const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

const router = express.Router();

const SECRET = "secure-gate-secret"; // move to .env later
const users = []; // temp store, replace with DB later

// ======================= MAILER =======================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "kaymacharia@gmail.com",
    pass: "eqbi qinf qonp olrv", // move to .env
  },
});

// ======================= REGISTER =======================
router.post("/register", async (req, res) => {
  try {
    const { username, email, role, area, phone, house, password } = req.body;

    if (!username || !email || !password || !role) {
      return res.status(400).json({ message: "All required fields must be filled" });
    }

    if (users.find((u) => u.email === email)) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const newUser = {
      id: users.length + 1,
      username,
      email,
      role, // "resident" or "guard"
      area,
      phone,
      house: role === "resident" ? house : null,
      password: hashed,
      verified: true,
    };

    users.push(newUser);

    res.json({ message: "User registered successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ======================= LOGIN =======================
router.post("/login", async (req, res) => {
  const { email, password, remember } = req.body;
  try {
    console.log("Login attempt:", email);

    const user = users.find((u) => u.email === email);
    if (!user) {
      console.log("No user found");
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      console.log("Password mismatch");
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const expiresIn = remember ? "7d" : "1h";
    const token = jwt.sign(
      { id: user.id, role: user.role },
      SECRET,
      { expiresIn }
    );

    console.log("Login successful");
    res.json({
      token,
      user: { id: user.id, username: user.username, role: user.role }
    });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ error: "Login failed", details: err.message });
  }
});

// ======================= FORGOT PASSWORD =======================
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  const user = users.find((u) => u.email === email);

  if (!user) return res.status(400).json({ message: "User not found" });

  const resetToken = jwt.sign({ email: user.email }, SECRET, { expiresIn: "15m" });
  const resetLink = `http://localhost:3000/reset-password/${resetToken}`;

  try {
    await transporter.sendMail({
      from: '"Secure Gate" <kaymacharia@gmail.com>',
      to: email,
      subject: "Password Reset Request",
      html: `<p>Hello,</p>
             <p>You requested a password reset. Click the link below to reset your password:</p>
             <a href="${resetLink}">Reset Password</a>
             <p>This link expires in 15 minutes.</p>`,
    });

    res.json({ message: "Password reset email sent" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error sending reset email" });
  }
});

// ======================= RESET PASSWORD =======================
router.post("/reset-password/:token", async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  try {
    const decoded = jwt.verify(token, SECRET);
    const user = users.find((u) => u.email === decoded.email);

    if (!user) return res.status(400).json({ message: "Invalid token" });

    user.password = await bcrypt.hash(newPassword, 10);

    res.json({ message: "Password reset successful" });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: "Invalid or expired reset link" });
  }
});

// ======================= PROTECTED TEST =======================
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

export default router;
