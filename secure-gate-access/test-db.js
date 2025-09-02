// Test database connection
import { initializeDatabase } from './database/db.js';

(async () => {
  try {
    console.log('Testing database initialization...');
    await initializeDatabase();
    console.log('Database initialization completed successfully!');
  } catch (error) {
    console.error('Database initialization failed:', error);
  }
})();
