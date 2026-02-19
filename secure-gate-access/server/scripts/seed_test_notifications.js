import { dbManager as db } from '../src/database/db.enhanced.js';
import logger from '../src/config/logger.js';

async function seedTestNotifications() {
    console.log('🚀 Seeding test notifications...');

    try {
        await db.initializeAsync();

        // 1. Get test users for each role
        const users = await db.query(`
      SELECT id, role, first_name, email FROM users 
      WHERE role IN ('resident', 'guard', 'admin', 'super_admin')
    `);

        // Group by role
        const usersByRole = users.rows.reduce((acc, user) => {
            acc[user.role] = acc[user.role] || [];
            acc[user.role].push(user);
            return acc;
        }, {});

        console.log('Found users:',
            Object.keys(usersByRole).map(role => `${role}: ${usersByRole[role].length}`)
        );

        const now = new Date();

        // 2. Define notification templates for each role
        const notifications = [
            // Resident Notifications
            ...(usersByRole['resident'] || []).slice(0, 3).flatMap(user => [
                {
                    userId: user.id,
                    type: 'visit_approved',
                    channel: 'app',
                    subject: 'Visitor Approved',
                    body: 'Your visitor John Doe has been approved by security.',
                    status: 'sent',
                    read: false
                },
                {
                    userId: user.id,
                    type: 'package_delivery',
                    channel: 'app',
                    subject: 'Package Arrived',
                    body: 'You have a package waiting at the front desk.',
                    status: 'sent',
                    read: true
                },
                {
                    userId: user.id,
                    type: 'maintenance_alert',
                    channel: 'email',
                    subject: 'Scheduled Maintenance',
                    body: 'Water supply will be interrupted tomorrow from 10 AM to 2 PM.',
                    status: 'sent',
                    read: false
                }
            ]),

            // Guard Notifications
            ...(usersByRole['guard'] || []).slice(0, 3).flatMap(user => [
                {
                    userId: user.id,
                    type: 'shift_reminder',
                    channel: 'sms',
                    subject: 'Shift Reminder',
                    body: 'Your shift starts in 1 hour.',
                    status: 'sent',
                    read: true
                },
                {
                    userId: user.id,
                    type: 'incident_alert',
                    channel: 'app',
                    subject: 'New Incident Reported',
                    body: 'Noise complaint reported in Block B.',
                    status: 'sent',
                    read: false
                },
                {
                    userId: user.id,
                    type: 'visitor_flagged',
                    channel: 'app',
                    subject: 'Visitor Flagged',
                    body: 'Visitor ID 12345 has been flagged for security review.',
                    status: 'sent',
                    read: false
                }
            ]),

            // Admin Notifications
            ...((usersByRole['admin'] || []).concat(usersByRole['super_admin'] || [])).slice(0, 3).flatMap(user => [
                {
                    userId: user.id,
                    type: 'system_alert',
                    channel: 'email',
                    subject: 'System Updates Available',
                    body: 'New security patches are available for deployment.',
                    status: 'sent',
                    read: true
                },
                {
                    userId: user.id,
                    type: 'new_resident',
                    channel: 'app',
                    subject: 'New Resident Registration',
                    body: 'A new resident application is pending approval.',
                    status: 'sent',
                    read: false
                },
                {
                    userId: user.id,
                    type: 'security_summary',
                    channel: 'email',
                    subject: 'Daily Security Summary',
                    body: 'Yesterday: 145 visitors, 0 incidents.',
                    status: 'sent',
                    read: true
                },
                {
                    userId: user.id,
                    type: 'system_health',
                    channel: 'email',
                    subject: 'Database Connection Warning',
                    body: 'Metrics indicate high latency on database connections.',
                    status: 'failed',
                    read: false
                }
            ])
        ];

        if (notifications.length === 0) {
            console.log('❌ No users found to seed notifications for.');
            process.exit(0);
        }

        console.log(`📝 Seeding ${notifications.length} notifications...`);

        // 3. Insert notifications
        let insertedCount = 0;

        for (const note of notifications) {
            /*
               INSERT INTO notification_log (
                 recipient_type, recipient_id, notification_type, channel, 
                 subject, body, status, created_at, read_at
               )
            */
            const readAt = note.read ? new Date(now.getTime() - Math.random() * 86400000) : null;
            const sentAt = new Date(now.getTime() - Math.random() * 86400000 * 2); // random time in last 2 days

            // We use 'user' as recipient_type for registered users
            const query = `
        INSERT INTO notification_log (
          recipient_type, recipient_id, notification_type, channel, 
          subject, body, status, created_at, sent_at, read_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `;

            await db.query(query, [
                'user',
                note.userId,
                note.type,
                note.channel,
                note.subject,
                note.body,
                note.status,
                sentAt, // created_at same as sent_at for simplicity
                note.status === 'sent' ? sentAt : null,
                readAt
            ]);

            insertedCount++;
        }

        console.log(`✅ Successfully seeded ${insertedCount} test notifications across user roles.`);

    } catch (error) {
        console.error('❌ Database error:', error);
    } finally {
        // We cannot easily close the pool as db.enhanced.js doesn't expose a clean close method easily 
        // or it's a singleton. But script exit handles it.
        process.exit(0);
    }
}

seedTestNotifications();
