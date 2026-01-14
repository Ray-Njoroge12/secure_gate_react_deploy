import { dbManager } from './db.enhanced.js';

async function run() {
  await dbManager.initializeAsync();
  const res = await dbManager.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
  console.log('Tables:', res.rows.map(r => r.table_name));
  await dbManager.disconnect();
}

run().catch(console.error);
