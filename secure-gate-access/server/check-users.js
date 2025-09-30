import pool from './src/database/db.js';

(async () => {
  try {
    const res = await pool.query('SELECT email, role FROM users ORDER BY email');
    console.log('Existing users:');
    res.rows.forEach(r => console.log(`- ${r.email} (${r.role})`));
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();