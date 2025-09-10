import { Router } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";

const router = Router();

const SECRET_KEY = "supersecretkey"; // move to .env later
let users = [
  { email: "admin@secure.com", password: "adminadmin", role: "admin", username: "Admin" }
]; // temp store, replace with DB later

// ======================= MAILER =======================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "kaymacharia@gmail.com",
    pass: "eqbi qinf qonp olrv", // move to .env
  },
});

// ======================= LOGIN =======================
router.post("/login", async (req, res) => {
  const { email, password, remember } = req.body;
  try {
    console.log("Login request body:", req.body);
    const user = users.find((u) => u.email === email);
    console.log("User found:", user);
    if (!user) {
      console.log("No user found");
      return res.status(401).json({ message: "Invalid credentials", reason: "no_user", email });
    }
    // Accept either plaintext or bcrypt-hashed passwords (handles both dev and registered users)
    console.log("Received password (length):", password ? password.length : 0);
    let bcryptMatch = false;
    try {
      bcryptMatch = await bcrypt.compare(password, user.password);
    } catch (e) {
      bcryptMatch = false;
    }
    const plainMatch = password === user.password;
    const validPassword = bcryptMatch || plainMatch;
    console.log("Password valid (bcrypt/plain):", bcryptMatch, plainMatch);
    if (!validPassword) {
      console.log("Password mismatch");
      return res.status(401).json({ message: "Invalid credentials", reason: "password_mismatch" });
    }
    const token = jwt.sign(
      { email: user.email, role: user.role },
      SECRET_KEY,
      { expiresIn: remember ? "7d" : "1h" }
    );
    console.log("Login successful");
    res.json({
      token,
      user: { email: user.email, role: user.role, username: user.username }
    });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ error: "Login failed", details: err.message });
  }
});

// ======================= REGISTER =======================
router.post("/register", async (req, res) => {
  const { username, email, password, role, area, phone, house } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: "All required fields must be filled" });
  }

  if (users.find((u) => u.email === email)) {
    return res.status(409).json({ message: "User already exists" });
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

  res.status(201).json({ message: "User registered successfully", user: newUser });
});


// ======================= FORGOT PASSWORD =======================
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  const user = users.find((u) => u.email === email);

  if (!user) return res.status(400).json({ message: "User not found" });

  const resetToken = jwt.sign({ email: user.email }, SECRET_KEY, { expiresIn: "15m" });
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
    const decoded = jwt.verify(token, SECRET_KEY);
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
    const decoded = jwt.verify(token, SECRET_KEY);
    res.json({ user: decoded });
  } catch (e) {
    res.sendStatus(403);
  }
});

export default router;
