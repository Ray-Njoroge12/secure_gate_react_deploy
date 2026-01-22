
import { dbManager } from '../src/database/db.enhanced.js';

async function checkMigrations() {
  try {
    await dbManager.initializeAsync();
    
    // Check if table exists
    const tableCheck = await dbManager.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'schema_migrations')"
    );
    
    if (!tableCheck.rows[0].exists) {
      console.log('schema_migrations table does NOT exist.');
      return;
    }

    const res = await dbManager.query('SELECT * FROM schema_migrations ORDER BY id ASC');
    console.log(`Total migrations applied: ${res.rows.length}`);
    
    const appliedFilenames = new Set(res.rows.map(r => r.filename));
    const recent = res.rows.slice(-10); // Show last 10
    console.log('Last 10 applied migrations:');
    recent.forEach(row => {
      console.log(`${row.id}: ${row.filename}`);
    });

    const target = '047_notification_metrics_events.sql';
    if (appliedFilenames.has(target)) {
        console.log(`\n✅ ${target} IS marked as applied.`);
    } else {
        console.log(`\n❌ ${target} is NOT marked as applied.`);
    }

    const tableExists = await dbManager.query(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notification_metrics_events')"
    );
    if (tableExists.rows[0].exists) {
        console.log("✅ Table 'notification_metrics_events' EXISTS in database.");
    } else {
        console.log("❌ Table 'notification_metrics_events' does NOT exist in database.");
    }
  } catch (error) {
    console.error('Error checking migrations:', error);
  } finally {
    await dbManager.disconnect();
  }
}

checkMigrations();
