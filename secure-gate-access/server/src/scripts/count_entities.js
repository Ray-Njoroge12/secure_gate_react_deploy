
import 'dotenv/config';
import { dbManager } from '../database/db.enhanced.js';

async function fixSchema() {
    try {
        await dbManager.initializeAsync();
        console.log('Creating announcements tables...');

        await dbManager.query(`
            CREATE TABLE IF NOT EXISTS announcements (
              id UUID PRIMARY KEY,
              title VARCHAR(255) NOT NULL,
              content TEXT NOT NULL,
              priority VARCHAR(20) DEFAULT 'normal',
              target_audience VARCHAR(20) DEFAULT 'all',
              is_pinned BOOLEAN DEFAULT false,
              is_active BOOLEAN DEFAULT true,
              created_by UUID REFERENCES users(id),
              estate_id UUID REFERENCES estates(id),
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              expires_at TIMESTAMP WITH TIME ZONE
            );
        `);

        await dbManager.query(`
            CREATE TABLE IF NOT EXISTS announcement_reads (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE,
              user_id UUID REFERENCES users(id) ON DELETE CASCADE,
              read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              UNIQUE(announcement_id, user_id)
            );
        `);

        console.log('Schema fix applied successfully.');

    } catch (err) {
        console.error('Error fixing schema:', err);
    } finally {
        // Keep process open for a bit to ensure logs flush if needed, then exit
        setTimeout(() => process.exit(0), 500);
    }
}

fixSchema();
