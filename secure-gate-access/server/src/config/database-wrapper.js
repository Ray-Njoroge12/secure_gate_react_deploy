import { config } from 'dotenv';
config();

// Check if we should use SQLite
const USE_SQLITE = process.env.USE_SQLITE === 'true';

let db;

if (USE_SQLITE) {
    console.log('🔧 Using SQLite for local development');
    
    // SQLite implementation
    db = {
        query: async (text, params) => {
            // Mock implementation for development
            console.log('SQLite query:', text);
            return { rows: [] };
        },
        pool: {
            connect: async () => ({
                query: async () => ({ rows: [] }),
                release: () => {}
            })
        }
    };
} else {
    // Use PostgreSQL
    const pg = await import('pg');
    const pool = new pg.default.Pool({
        user: process.env.PGUSER || 'postgres',
        host: process.env.PGHOST || 'localhost',
        database: process.env.PGDATABASE || 'secure_gate',
        password: process.env.PGPASSWORD || 'postgres',
        port: parseInt(process.env.PGPORT || '5432')
    });
    
    db = {
        query: (text, params) => pool.query(text, params),
        pool
    };
}

export default db;
