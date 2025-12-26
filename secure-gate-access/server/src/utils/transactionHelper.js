import { dbManager } from '../database/db.enhanced.js';

export async function withTransaction(work, options = {}) {
  return dbManager.transaction(async (client) => work(client), options);
}

export default { withTransaction };
