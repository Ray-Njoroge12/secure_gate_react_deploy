// server/server.js
import dotenv from 'dotenv';
dotenv.config();

import app from './src/app.js';
import pool from './src/database/db.js';

const PORT = process.env.PORT ? Number(process.env.PORT) : 5000;

// Health (keep here to ensure pool is available in tests, too)
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
