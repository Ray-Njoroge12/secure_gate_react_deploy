// Top-level server entry (secure-gate-access/server.js)
// Adapted from provided snippet with corrected import paths
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { initializeDatabase, pool } from './database/db.js';
import userRoutes from './server/src/routes/userRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Health endpoint with actual DB check
app.get('/health', async (req, res) => {
	try {
		await pool.query('SELECT 1');
		res.json({ success: true, db: 'ok' });
	} catch (err) {
		console.error('[Health] DB check failed:', err.message);
		res.status(500).json({ success: false, db: 'fail' });
	}
});

// User routes (registration, profile, etc.)
app.use('/api/users', userRoutes);

// Start server after DB initialized
initializeDatabase()
	.then(() => {
		console.log('[DB] Initialized');
		app.listen(PORT, () => {
			console.log(`[Server] running on http://localhost:${PORT}`);
		});
	})
	.catch(err => {
		console.error('[Server] DB init failed:', err);
		process.exit(1);
	});

export default app;
