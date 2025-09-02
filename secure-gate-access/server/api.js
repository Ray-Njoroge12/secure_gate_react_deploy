import express from "express";
import nodemailer from "nodemailer";
import bcrypt from "bcryptjs";
import jwtPkg from "jsonwebtoken";
const { sign } = jwtPkg;

const router = express.Router();
const SECRET_KEY = "supersecretkey";

let users = []; // ideally replace with database

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "kaymacharia@gmail.com",
    pass: "eqbi qinf qonp olrv", // use app password from Google
  },
});
// Registration route
router.post("/register", async (req, res) => {
  try {
    const { username, email, role, area, phone, house, password } = req.body;

    if (users.find(u => u.email === email)) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    const newUser = { username, email, role, area, phone, house, password: hashedPassword };
    users.push(newUser);

    // send email invitation
    const mailOptions = {
      from: "kaymacharia@gmail.com",
      to: email,
      subject: "Secure Gate Registration",
      html: `<p>Hello ${username},</p>
             <p>Thank you for registering! Your account has been created. Please login using your email.</p>`
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) console.error(err);
      else console.log("Email sent:", info.response);
    });

    res.status(201).json({ message: "User registered, check your email" });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/api/register", async (req, res) => {
  const { username, email, password, role, phone, area, houseNumber } = req.body;

  // check if email already exists
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ message: "Email already registered" });
  }

  // create new user object
  const newUser = {
    id: users.length + 1,
    username,
    email,
    password,
    role,
    phone,
    area,
    houseNumber,
    verified: false,
  };
  users.push(newUser);

  // generate verification token
  const token = jwt.sign({ email }, SECRET_KEY, { expiresIn: "1d" });

  // create verification link
  const verificationLink = `http://localhost:3000/api/verify/${token}`;

  try {
    await transporter.sendMail({
      from: `"Secure Gate" <your-email@gmail.com>`,
      to: email,
      subject: "Verify your email",
      html: `<p>Hello ${username},</p>
             <p>Thank you for registering. Please verify your email by clicking the link below:</p>
             <a href="${verificationLink}">Verify Email</a>`,
    });

    res.json({ message: "Registration successful. Check your email to verify your account." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error sending verification email" });
  }
});

// Verification route
router.get("/api/verify/:token", (req, res) => {
  const { token } = req.params;

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    const user = users.find(u => u.email === decoded.email);

    if (!user) return res.status(400).send("Invalid verification link.");
    user.verified = true;

    res.send("Email verified successfully! You can now log in.");
  } catch (err) {
    res.status(400).send("Invalid or expired verification link.");
  }
});
// server.js or api.js

router.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);

  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  // compare hashed password
  const isMatch = bcrypt.compareSync(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  if (!user.verified) {
    return res.status(403).json({ message: "Please verify your email first." });
  }

  const token = jwt.sign(
    { email: user.email, role: user.role },
    SECRET_KEY,
    { expiresIn: "1h" }
  );

  res.json({ token, role: user.role });
});

