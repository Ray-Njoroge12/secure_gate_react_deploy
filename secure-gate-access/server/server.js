// server/server.js
import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import userRoutes from "./src/routes/userRoutes.js";
import apiRoutes from "../client/api.js";
import { initializeDatabase } from "../database/db.js";

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Dummy database
const users = [
  { email: "adminadmin", password: "adminadmin", role: "admin", username: "Admin" }
];

const SECRET_KEY = "supersecretkey";

// Mount all /api/* routes from api.js
app.use("/api", apiRoutes);

// --- Nodemailer transporter ---
const createTransporter = async () => {
  try {
    return nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: "kaymacharia@gmail.com",
        pass: "eqbi qinf qonp olrv" // replace with your app password
      }
    });
  } catch (err) {
    console.log("Gmail transporter failed, using test account");
    const testAccount = await nodemailer.createTestAccount();
    return nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      auth: { user: testAccount.user, pass: testAccount.pass }
    });
  }
};

// --- Registration Route ---
app.post("/api/register", async (req, res) => {
  try {
    const { username, email, phone, area, house, role, password } = req.body;

    if (!username || !email || !role || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (users.find(u => u.email === email)) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = { username, email, phone, area, house, role, password: hashedPassword, verified: false };
    users.push(newUser);

    const token = jwt.sign({ email }, SECRET_KEY, { expiresIn: "1h" });
    const verificationLink = `http://localhost:3000/login?verify=${token}`;

    const transporter = await createTransporter();
    const mailOptions = {
      from: '"Secure Gate" <no-reply@securegate.com>',
      to: email,
      subject: "Verify Your Account",
      html: `<p>Hello ${username}, click <a href="${verificationLink}">here</a> to verify your account</p>`
    };

    const info = await transporter.sendMail(mailOptions);
    if (nodemailer.getTestMessageUrl(info)) {
      console.log("Preview URL:", nodemailer.getTestMessageUrl(info));
    }

    res.status(201).json({ message: "Registered! Verification email sent." });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ message: "Server error. Try again later." });
  }
});

// --- Login Route ---
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  const user = users.find(u => u.email === email);
  if (!user) return res.status(401).json({ message: "Invalid credentials" });

  if (user.role === "admin") {
    if (password !== user.password) return res.status(401).json({ message: "Invalid credentials" });
  } else {
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign({ email: user.email, role: user.role }, SECRET_KEY, { expiresIn: "1h" });
  res.json({ token, role: user.role });
});

// --- User Routes ---
app.use("/api/user", userRoutes);

// --- Start Server ---
(async () => {
  try {
    await initializeDatabase();
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  } catch (err) {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  }
})();
