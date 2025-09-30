// Shim re-export for local dev: some imports resolve to secure-gate-access/database/db.js
// Re-export the real pool implementation from the server package.
export { default } from '../server/src/database/db.js';
