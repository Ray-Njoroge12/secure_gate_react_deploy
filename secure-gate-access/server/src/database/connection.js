/**
 * Database Connection Export
 * Re-exports the pool from the enhanced database manager
 * for backward compatibility with services expecting { pool }
 */

import dbManager from './db.enhanced.js';

// Export pool property from dbManager for services that expect { pool }
export const pool = dbManager;

// Also export the dbManager directly
export { dbManager };
export default dbManager;
