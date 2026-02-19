import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { sendTemplatedNotification } from '../src/controllers/notificationController.js';
import { dbManager as db } from '../src/database/db.enhanced.js';

dotenv.config();

/**
 * Test Notification Script
 * This script verifies that the template-based notification system is working.
 */
async function runTest() {
    console.log('🚀 Starting notification test...');

    try {
        // Initialize database manager
        await db.initializeAsync();
        // 1. Create a dummy visitor if none exists, or use a test one
        const visitorName = 'Test Visitor ' + Date.now();
        const visitorPhone = '+254711222333'; // Sandbox phone
        const visitorEmail = 'testvisitor@example.com';
        const estateId = 1;

        console.log('📝 Creating test visitor entry...');
        const visitorRes = await db.query(
            `INSERT INTO visitors (name, phone, email, purpose, date_of_visit, estate_id, status)
       VALUES ($1, $2, $3, 'Test Notification', CURRENT_DATE, $4, 'pending')
       RETURNING id`,
            [visitorName, visitorPhone, visitorEmail, estateId]
        );
        const visitorId = visitorRes.rows[0].id;

        console.log(`✅ Visitor created with ID: ${visitorId}`);

        // 2. Trigger a templated notification
        // We'll test 'visitor_invite' via 'email'
        console.log('📧 Sending templated email notification...');
        const result = await sendTemplatedNotification({
            recipientType: 'visitor',
            recipientId: visitorId,
            channel: 'email',
            templateName: 'visitor_invite',
            variables: {
                visitorName: visitorName,
                siteName: 'Secure Gate Demo',
                residentName: 'Test Host',
                visitDate: new Date().toLocaleDateString(),
                visitTime: '14:00',
                purpose: 'Security Tour',
                inviteCode: 'TEST-123',
                inviteLink: 'http://localhost:3000/invite/TEST-123',
                expiryDate: '2026-03-01'
            },
            visitorId: visitorId
        });

        if (result.success) {
            console.log('✨ SUCCESS: Notification sent!');
            console.log('Log Entry ID:', result.logId);
        } else {
            console.error('❌ FAILED: Notification sending failed:', result.error);
        }

        // 3. Check the logs
        const logRes = await db.query('SELECT * FROM notification_log WHERE id = $1', [result.logId]);
        console.log('📊 Log Entry Details:', JSON.stringify(logRes.rows[0], null, 2));

        const metricRes = await db.query('SELECT * FROM notification_metrics_events ORDER BY created_at DESC LIMIT 1');
        console.log('📈 Latest Metric Event:', JSON.stringify(metricRes.rows[0], null, 2));

    } catch (error) {
        console.error('💥 CRITICAL ERROR during test:', error);
    } finally {
        process.exit(0);
    }
}

runTest();
