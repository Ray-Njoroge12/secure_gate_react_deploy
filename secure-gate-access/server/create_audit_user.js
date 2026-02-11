
const { Client } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.DATABASE_URL
});

async function createAuditUser() {
    try {
        await client.connect();
        console.log('Connected to database...');

        // Hash password
        const hashedPassword = await bcrypt.hash('ResidentPass123!', 10);

        // Get an estate ID
        const estateRes = await client.query('SELECT id FROM estates LIMIT 1');
        const estateId = estateRes.rows[0].id;

        const query = `
      INSERT INTO users (username, email, password_hash, first_name, last_name, role, estate_id, house_number, phone, account_status, is_active, verified)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (email) DO UPDATE 
      SET password_hash = $3, account_status = $10, is_active = $11, verified = $12
      RETURNING id, email, role;
    `;

        const values = [
            'ui_audit_res',
            'ui.audit@securegate.com',
            hashedPassword,
            'UI',
            'Audit',
            'resident',
            estateId,
            'B2-202',
            '5550002222',
            'active',
            true,
            true
        ];

        const res = await client.query(query, values);
        console.log('User created/updated:', res.rows[0]);

    } catch (err) {
        console.error('Error creating user:', err);
    } finally {
        await client.end();
    }
}

createAuditUser();
