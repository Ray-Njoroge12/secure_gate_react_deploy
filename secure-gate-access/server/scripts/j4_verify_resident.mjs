import '../load-env.js';
import pg from 'pg';
import { passwordService } from '../src/services/tokenService.js';

const { Client } = pg;
const client = new Client(process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: process.env.PGHOST || 'localhost',
      port: Number(process.env.PGPORT || 5432),
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      database: process.env.PGDATABASE
    }
);

try {
  await client.connect();
  const result = await client.query(
    'SELECT email, role, estate_id, account_status, verified, password_hash FROM users WHERE email = $1 LIMIT 1',
    ['resident1@securegate.com']
  );

  if (result.rowCount === 0) {
    console.log(JSON.stringify({ ok: false, reason: 'user_not_found' }));
  } else {
    const user = result.rows[0];
    const passwordMatch = await passwordService.verifyPassword('ResidentPass123!', user.password_hash);
    console.log(
      JSON.stringify({
        ok: passwordMatch,
        password_match: passwordMatch,
        role: user.role,
        estate_id: user.estate_id,
        account_status: user.account_status,
        verified: user.verified
      })
    );
  }
} catch (error) {
  console.log(JSON.stringify({ ok: false, error: error.message }));
} finally {
  await client.end().catch(() => {});
}
