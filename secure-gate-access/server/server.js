// server/server.js
import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import userRoutes from "./src/routes/userRoutes.js";
import authRoutes from "./src/routes/authRoutes.js";
import dotenv from "dotenv";
dotenv.config();


const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Dummy database
let users = [
  { email: "adminadmin", password: "adminadmin", role: "admin", username: "Admin" }
];

const SECRET_KEY = "supersecretkey";

// Mount /api/auth/* routes from authRoutes.js
app.use("/api/auth", authRoutes);


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

// ...existing code...
// app.use("/api/auth", authnode server.jsRoutes); // Remove incorrect line
app.use("/api/user", userRoutes);
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
