import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const serverRoot = resolve(__dirname, '../..');
const importArgs = ['--input-type=module', '-e', "await import('./src/database/db.enhanced.js');"];

describe('db.enhanced bootstrap warning gating', () => {
  test('does not warn about DATABASE_URL during local test bootstrap with PG variables', async () => {
    const { stderr } = await execFileAsync('node', importArgs, {
      cwd: serverRoot,
      env: {
        ...process.env,
        NODE_ENV: 'test',
        DATABASE_URL: '',
        PGHOST: 'localhost',
        PGPORT: '5432',
        PGDATABASE: 'secure_gate_test',
        PGUSER: 'raynj',
        PGPASSWORD: '',
        RENDER: '',
        RENDER_SERVICE_ID: '',
        RENDER_EXTERNAL_URL: ''
      }
    });

    expect(stderr).not.toContain('DATABASE_URL not set');
  });

  test('does not warn when a Render-like environment has explicit PG fallback configuration', async () => {
    const { stderr } = await execFileAsync('node', importArgs, {
      cwd: serverRoot,
      env: {
        ...process.env,
        NODE_ENV: 'production',
        DATABASE_URL: '',
        PGHOST: 'db.internal',
        PGPORT: '5432',
        PGDATABASE: 'secure_gate',
        PGUSER: 'securegate_user',
        PGPASSWORD: 'render-secret',
        RENDER: 'true',
        RENDER_SERVICE_ID: '',
        RENDER_EXTERNAL_URL: ''
      }
    });

    expect(stderr).not.toContain('Render environment missing DATABASE_URL');
  });

  test('warns when a Render-like environment is missing DATABASE_URL and explicit PG fallback configuration', async () => {
    const { stderr } = await execFileAsync('node', importArgs, {
      cwd: serverRoot,
      env: {
        ...process.env,
        NODE_ENV: 'production',
        DATABASE_URL: '',
        PGHOST: '',
        PGPORT: '',
        PGDATABASE: '',
        PGUSER: '',
        PGPASSWORD: '',
        PG_HOST: '',
        PG_PORT: '',
        PG_DATABASE: '',
        PG_USER: '',
        PG_PASSWORD: '',
        POSTGRES_HOST: '',
        POSTGRES_PORT: '',
        POSTGRES_DB: '',
        POSTGRES_USER: '',
        POSTGRES_PASSWORD: '',
        RENDER: 'true',
        RENDER_SERVICE_ID: '',
        RENDER_EXTERNAL_URL: ''
      }
    });

    expect(stderr).toContain('Render environment missing DATABASE_URL and explicit PGHOST, PGDATABASE, PGUSER, PGPASSWORD configuration');
  });
});