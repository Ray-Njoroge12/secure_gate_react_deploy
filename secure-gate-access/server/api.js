import express from "express";
import nodemailer from "nodemailer";
import bcrypt from "bcryptjs";
import jwtPkg from "jsonwebtoken";
const { sign, verify } = jwtPkg;

// SECURITY: Validate JWT secret is properly configured
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('🚨 FATAL SECURITY ERROR: JWT_SECRET must be set and >= 32 characters');
  console.error('🔧 Generate a secure secret: openssl rand -hex 32');
  process.exit(1);
}

const router = express.Router();
const SECRET_KEY = process.env.JWT_SECRET;

let users = []; // replace with DB later

// ✅ Email transporter configuration
let transporter = null;

// SECURITY: Only initialize email if credentials are provided via environment variables
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
} else {
  console.warn('⚠️  SMTP credentials not configured - email functionality disabled');
}

/* ---------------- Registration ---------------- */
router.post("/api/register", async (req, res) => {
  try {
    const { username, email, password, role, phone, area, houseNumber } = req.body;

    if (users.find(u => u.email === email)) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    const newUser = {
      id: users.length + 1,
      username,
      email,
      password: hashedPassword,
      role,
      phone,
      area,
      houseNumber,
      verified: false,
    };
    users.push(newUser);

    // generate verification token
    const token = sign({ email }, SECRET_KEY, { expiresIn: "1d" });
    const verificationLink = `http://localhost:3000/api/verify/${token}`;

    if (transporter) {
      await transporter.sendMail({
        from: `"${process.env.SMTP_FROM_NAME || 'Secure Gate'}" <${process.env.SMTP_USER}>`,
        to: email,
        subject: "Verify your email",
        html: `<p>Hello ${username},</p>
               <p>Please verify your email by clicking below:</p>
               <a href="${verificationLink}">Verify Email</a>`,
      });
    } else {
      console.warn('⚠️  Email not sent - SMTP not configured');
    }

    res.json({ message: "Registration successful. Check your email to verify." });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

/* ---------------- Email Verification ---------------- */
router.get("/api/verify/:token", (req, res) => {
  try {
    const decoded = verify(req.params.token, SECRET_KEY);
    const user = users.find(u => u.email === decoded.email);
    if (!user) return res.status(400).send("Invalid verification link.");
    user.verified = true;
    res.send("Email verified successfully! You can now log in.");
  } catch (err) {
    res.status(400).send("Invalid or expired verification link.");
  }
});

/* ---------------- Login + Remember Me ---------------- */
router.post("/api/login", (req, res) => {
  const { email, password, remember } = req.body;
  const user = users.find(u => u.email === email);

  if (!user) return res.status(401).json({ message: "Invalid credentials" });

  const isMatch = bcrypt.compareSync(password, user.password);
  if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

  if (!user.verified) return res.status(403).json({ message: "Please verify your email first." });

  // if "remember me" checked → longer expiry
  const expiresIn = remember ? "7d" : "1h";

  const token = sign(
    { email: user.email, role: user.role },
    SECRET_KEY,
    { expiresIn }
  );

  res.json({ token, role: user.role });
});

/* ---------------- Forgot Password ---------------- */
router.post("/api/forgot-password", async (req, res) => {
  const { email } = req.body;
  const user = users.find(u => u.email === email);
  if (!user) return res.status(404).json({ message: "User not found" });

  const resetToken = sign({ email }, SECRET_KEY, { expiresIn: "15m" });
  const resetLink = `http://localhost:3000/reset-password/${resetToken}`;

  try {
    if (transporter) {
      await transporter.sendMail({
        from: `"${process.env.SMTP_FROM_NAME || 'Secure Gate'}" <${process.env.SMTP_USER}>`,
        to: email,
        subject: "Password Reset Request",
        html: `<p>Hello,</p>
               <p>Click below to reset your password (valid for 15 minutes):</p>
               <a href="${resetLink}">Reset Password</a>`,
      });
    } else {
      console.warn('⚠️  Password reset email not sent - SMTP not configured');
      return res.status(500).json({ message: "Email service not configured" });
    }

    res.json({ message: "Password reset email sent." });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ message: "Error sending reset email" });
  }
});

/* ---------------- Reset Password ---------------- */
router.post("/api/reset-password/:token", (req, res) => {
  try {
    const decoded = verify(req.params.token, SECRET_KEY);
    const user = users.find(u => u.email === decoded.email);
    if (!user) return res.status(400).json({ message: "Invalid token" });

    const { newPassword } = req.body;
    user.password = bcrypt.hashSync(newPassword, 10);

    res.json({ message: "Password reset successful" });
  } catch (err) {
    res.status(400).json({ message: "Invalid or expired reset link" });
  }
});

/* ---------------- Update Profile ---------------- */
router.put("/api/user/profile", (req, res) => {
  const { email, name, phone, profilePic } = req.body;
  const user = users.find(u => u.email === email);
  if (!user) return res.status(404).json({ success: false, message: "User not found" });
  user.username = name;
  user.phone = phone;
  user.profilePic = profilePic;
  res.json({ success: true, user });
});

export default router;
