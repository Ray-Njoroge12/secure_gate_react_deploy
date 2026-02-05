import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import dotenv from 'dotenv';
import pkg from 'pg';

const { Client } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

console.log('🚀 Starting Development Environment Setup...');

// 1. Sync .env
const envPath = path.join(rootDir, '.env');
const envExamplePath = path.join(rootDir, '.env.example');

if (!fs.existsSync(envPath)) {
  console.log('📝 .env not found. Creating from .env.example...');
  fs.copyFileSync(envExamplePath, envPath);
  console.log('✅ .env created. PLEASE UPDATE IT WITH YOUR SECRETS!');
} else {
  // Check for missing keys
  const envConfig = dotenv.parse(fs.readFileSync(envPath));
  const exampleConfig = dotenv.parse(fs.readFileSync(envExamplePath));
  const missingKeys = Object.keys(exampleConfig).filter(key => !envConfig.hasOwnProperty(key));

  if (missingKeys.length > 0) {
    console.warn('⚠️  Your .env is missing new variables:');
    missingKeys.forEach(key => console.warn(`   - ${key}`));
    console.log('💡 Appending missing keys with default values...');
    
    let appendStr = '\n# Added by setup-dev.js on ' + new Date().toISOString() + '\n';
    missingKeys.forEach(key => {
      appendStr += `${key}=${exampleConfig[key]}\n`;
    });
    
    fs.appendFileSync(envPath, appendStr);
    console.log('✅ Missing keys appended to .env');
  } else {
    console.log('✅ .env is up to date');
  }
}

// Reload env to get new values
dotenv.config({ path: envPath });

// 2. Verify DB Connection
async function checkDb() {
  const dbConfig = process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        user: process.env.PGUSER || 'postgres',
        host: process.env.PGHOST || 'localhost',
        database: process.env.PGDATABASE || 'secure_gate',
        password: process.env.PGPASSWORD || 'postgres',
        port: parseInt(process.env.PGPORT || '5432', 10),
      };

  fs.writeFileSync('setup_debug.log', JSON.stringify({
    timestamp: new Date().toISOString(),
    envLoaded: fs.existsSync(envPath),
    envKeys: Object.keys(process.env).filter(k => k.startsWith('PG')),
    config: { ...dbConfig, password: dbConfig.password ? '***' : 'none' }
  }, null, 2));

  console.log('   Connection Config logged to setup_debug.log');
  const client = new Client(dbConfig);

  try {
    await client.connect();
    console.log('✅ Database connected successfully');
    await client.end();
    return true;
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    console.log('💡 Tip: Ensure PostgreSQL is running and you have created the database.');
    return false;
  }
}

// 3. Run Migrations
async function runMigrations() {
  console.log('🔄 Running Migrations...');
  try {
    execSync('npm run db:migrate', { stdio: 'inherit', cwd: rootDir });
    console.log('✅ Migrations applied successfully');
  } catch (err) {
    console.error('❌ Failed to run migrations.');
    process.exit(1);
  }
}

// 4. Platform Checks
function checkPlatform() {
  // Warn if using Mac-specific commands in scripts (simple check)
  const pkgPath = path.join(rootDir, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const scripts = packageJson.scripts || {};
  
  const potentiallyDangerousCommands = ['rm -rf', 'cp -r', 'mv '];
  const riskyScripts = [];

  Object.entries(scripts).forEach(([name, cmd]) => {
    if (potentiallyDangerousCommands.some(c => cmd.includes(c))) {
      riskyScripts.push(name);
    }
  });

  if (riskyScripts.length > 0) {
    console.warn('⚠️  Found potential cross-platform script issues (Unix-only commands):');
    riskyScripts.forEach(s => console.warn(`   - ${s}`));
    console.log('💡 Consider using "rimraf" or "copyfiles" for better Windows compatibility.');
  }
}

(async () => {
  const dbOk = await checkDb();
  if (!dbOk) process.exit(1);

  await runMigrations();
  checkPlatform();

  console.log('\n✨ Setup Complete! You are ready to code.');
})();
