import EnvironmentConfig from './environment.js';

// Get validated database config
const config = new EnvironmentConfig();
const dbConfig = config.getDatabaseConfig();

// Check if we should use SQLite (Development only)
const USE_SQLITE = process.env.USE_SQLITE === 'true';

let db;

if (USE_SQLITE && !config.isProduction && !config.isStaging) {
    console.log('🔧 Using SQLite for local development');

    // SQLite implementation
    db = {
        query: async (text, params) => {
            console.log('SQLite query:', text);
            return { rows: [] };
        },
        pool: {
            connect: async () => ({
                query: async () => ({ rows: [] }),
                release: () => { }
            })
        }
    };
} else {
    // Use PostgreSQL
    const pg = await import('pg');

    // Create pool with standardized config
    const pool = new pg.default.Pool(
        dbConfig.connectionString
            ? {
                connectionString: dbConfig.connectionString,
                ssl: dbConfig.ssl,
                ...dbConfig.pool
            }
            : {
                user: dbConfig.user,
                host: dbConfig.host,
                database: dbConfig.database,
                password: dbConfig.password,
                port: dbConfig.port,
                ssl: dbConfig.ssl,
                ...dbConfig.pool
            }
    );

    db = {
        query: (text, params) => pool.query(text, params),
        pool
    };

    console.log(`📡 Database connection pool initialized (${dbConfig.host || 'via URL'})`);
}

export default db;
