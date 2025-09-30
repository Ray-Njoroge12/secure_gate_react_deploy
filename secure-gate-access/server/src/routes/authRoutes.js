const express = require('express');
const Router = express.Router;
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = Router();

// SECURITY: Validate JWT secret is properly configured
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('🚨 FATAL SECURITY ERROR: JWT_SECRET must be set and >= 32 characters');
  console.error('🔧 Generate a secure secret: openssl rand -hex 32');
  process.exit(1);
}

const SECRET_KEY = process.env.JWT_SECRET;
let users = [
  { email: "admin@secure.com", password: "adminadmin", role: "admin", username: "Admin" }
]; // temp store, replace with DB later

// ======================= MAILER =======================
let transporter = null;
try {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (host && user && pass) {
    transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
  }
} catch {}

// ======================= LOGIN =======================
router.post("/login", async (req, res) => {
  const { email, password, remember } = req.body;
  try {
    const user = users.find((u) => u.email === email);
    if (!user) {
  return res.status(401).json({ success:false, status:'error', message: "Invalid credentials", reason: "no_user", email });
    }
    // Only accept properly hashed passwords - NEVER plaintext
    let validPassword = false;
    try {
      // Validate that the stored password is properly hashed
      if (!user.password || user.password.length < 10 || !user.password.startsWith('$')) {
        console.error('SECURITY ALERT: User has invalid password hash format:', user.email);
        return res.status(401).json({ 
          success: false, 
          status: 'error', 
          message: "Invalid credentials", 
          reason: "invalid_password_format" 
        });
      }
      
      validPassword = await bcrypt.compare(password, user.password);
    } catch (e) {
      console.error('Password verification error:', e);
      validPassword = false;
    }
    if (!validPassword) {
  return res.status(401).json({ success:false, status:'error', message: "Invalid credentials", reason: "password_mismatch" });
    }
    const token = jwt.sign(
      { email: user.email, role: user.role },
      SECRET_KEY,
      { expiresIn: remember ? "7d" : "1h" }
    );
  res.json({ success:true, status:'ok', data: { token, user: { email: user.email, role: user.role, username: user.username } } });
  } catch (err) {
  console.error("Login error:", err.message);
  res.status(500).json({ success:false, status:'error', message: "Login failed", details: err.message });
  }
});

// ======================= REGISTER =======================
router.post("/register", async (req, res) => {
  const { username, email, password, role, area, phone, house } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ success:false, status:'error', message: "All required fields must be filled" });
  }

  if (users.find((u) => u.email === email)) {
    return res.status(409).json({ success:false, status:'error', message: "User already exists" });
  }

  const hashed = await bcrypt.hash(password, 10);

  const newUser = {
    id: users.length + 1,
    username,
    email,
    role: role || "resident",
    area,
    phone,
    house,
    password: hashed,
    verified: true,
  };

  users.push(newUser);

  res.status(201).json({ success:true, status:'ok', data: { user: newUser } });
});


// ======================= FORGOT PASSWORD =======================
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  const user = users.find((u) => u.email === email);

  if (!user) return res.status(400).json({ success:false, status:'error', message: "User not found" });

  const resetToken = jwt.sign({ email: user.email }, SECRET_KEY, { expiresIn: "15m" });
  const resetLink = `http://localhost:3000/reset-password/${resetToken}`;

  try {
    if (!transporter) return res.json({ success:true, status:'ok', message: "Password reset email skipped (no SMTP)" });
    await transporter.sendMail({
      from: '"Secure Gate" <kaymacharia@gmail.com>',
      to: email,
      subject: "Password Reset Request",
      html: `<p>Hello,</p>
             <p>You requested a password reset. Click the link below to reset your password:</p>
             <a href="${resetLink}">Reset Password</a>
             <p>This link expires in 15 minutes.</p>`,
    });

  res.json({ success:true, status:'ok', message: "Password reset email sent" });
  } catch (err) {
  console.error(err);
  res.status(500).json({ success:false, status:'error', message: "Error sending reset email" });
  }
});

// ======================= RESET PASSWORD =======================
router.post("/reset-password/:token", async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    const user = users.find((u) => u.email === decoded.email);

  if (!user) return res.status(400).json({ success:false, status:'error', message: "Invalid token" });

    user.password = await bcrypt.hash(newPassword, 10);

  res.json({ success:true, status:'ok', message: "Password reset successful" });
  } catch (err) {
  console.error(err);
  res.status(400).json({ success:false, status:'error', message: "Invalid or expired reset link" });
  }
});

// ======================= PROTECTED TEST =======================
router.get('/me', authenticateToken, (req, res) => {
  // authenticateToken populates req.user
  return res.json({ success:true, status:'ok', data: { user: req.user } });
});

module.exports = router;
