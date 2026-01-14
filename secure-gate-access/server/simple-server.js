import express from 'express';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { dbManager } from './src/database/db.enhanced.js';
import app from './src/app.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const PORT = 3001;

async function start() {
  console.log('Starting simple server...');
  try {
    await dbManager.initializeAsync();
    console.log('DB connected.');
    
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (e) {
    console.error('Fatal start error:', e);
  }
}

start();
