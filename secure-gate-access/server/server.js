// server/server.js
import dotenv from 'dotenv';
dotenv.config();

import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import visitorRoutes from './src/routes/visitorRoutes.js';
import userRoutes from './src/routes/userRoutes.js';
import { initializeDatabase, pool } from '../database/db.js';
import { attachUser } from './src/middleware/authMiddleware.js';

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 5000;

app.use(cors());
app.use(express.json());

// Initialize DB
initializeDatabase().then(() => console.log('Database initialized successfully')).catch(err => console.error('Database initialization failed:', err));

// Lightweight auth user attach middleware (reads x-resident-email header and sets req.user if user exists)
app.use(attachUser);

// Mount API routes
app.use('/api/users', userRoutes);
app.use('/api/visitors', visitorRoutes);

// Health
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ success: true, db: 'ok' });
  } catch (err) {
    res.status(500).json({ success: false, db: 'fail', error: err.message });
  }
});

// Start
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
