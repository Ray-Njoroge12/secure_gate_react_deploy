
import { dbManager } from './server/src/database/db.enhanced.js';

async function checkColumns() {
    try {
        const result = await dbManager.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'visitors' 
      AND column_name IN ('otp_hash', 'otp_expires_at', 'otp_attempts');
    `);

        console.log('OTP Columns found:', result.rows);
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkColumns();
