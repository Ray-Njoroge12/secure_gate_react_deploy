import { dbManager } from '../database/db.enhanced.js';
import { respond, respondError, camelize } from '../utils/respond.js';
import { maskEmail, maskPhone } from '../utils/redaction.js';
import { getAuditLogs as fetchAuditLogs } from '../middleware/auditLogger.js';
import metricsService from '../services/metricsService.js';

/**
 * Super Admin Controller
 * Handles platform-wide operations and metrics
 */

const getPlatformOverview = async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'super_admin') {
            return respondError(res, 403, 'Forbidden: Super Admin access required');
        }

        // Parallel queries for platform stats
        const [
            estatesRes,
            usersRes,
            visitorsRes,
            incidentsRes
        ] = await Promise.all([
            dbManager.query('SELECT COUNT(*) FROM estates'),
            dbManager.query('SELECT COUNT(*) FROM users'),
            dbManager.query('SELECT COUNT(*) FROM visitors'),
            dbManager.query('SELECT COUNT(*) FROM incidents')
        ]);

        const systemHealth = {
            database: 'connected', // We know it's connected if queries succeeded
            timestamp: new Date().toISOString()
        };

        const overview = {
            stats: {
                totalEstates: parseInt(estatesRes.rows[0].count, 10),
                totalUsers: parseInt(usersRes.rows[0].count, 10),
                totalVisitors: parseInt(visitorsRes.rows[0].count, 10),
                totalIncidents: parseInt(incidentsRes.rows[0].count, 10)
            },
            systemHealth
        };

        respond(res, overview);
    } catch (error) {
        console.error('Error fetching platform overview:', error);
        respondError(res, 500, 'Failed to fetch platform overview');
    }
};

const listEstates = async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'super_admin') {
            return respondError(res, 403, 'Forbidden: Super Admin access required');
        }

        const query = `
      SELECT 
        e.id, 
        e.name, 
        e.status,
        e.created_at,
        COUNT(u.id) as user_count,
        COUNT(DISTINCT v.id) as visitor_count
      FROM estates e
      LEFT JOIN users u ON e.id = u.estate_id
      LEFT JOIN visitors v ON e.id = v.estate_id
      GROUP BY e.id, e.name, e.status, e.created_at
      ORDER BY e.created_at DESC
    `;

        const result = await dbManager.query(query);

        respond(res, camelize(result.rows));
    } catch (error) {
        console.error('Error listing estates:', error);
        respondError(res, 500, 'Failed to list estates');
    }
};

const createEstate = async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'super_admin') {
            return respondError(res, 403, 'Forbidden: Super Admin access required');
        }

        const { name, address, adminName, adminEmail, adminPassword } = req.body;

        if (!name || !adminEmail || !adminPassword) {
            return respondError(res, 400, 'Estate name, admin email, and password are required');
        }

        // Transaction to create estate and admin user
        const result = await dbManager.transaction(async (client) => {
            // 1. Create Estate
            const estateRes = await client.query(
                `INSERT INTO estates (name, address_line1, slug, created_at, updated_at) 
                 VALUES ($1, $2, $3, NOW(), NOW()) 
                 RETURNING id, name`,
                [
                    name,
                    address || '',
                    name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.floor(Math.random() * 1000)
                ]
            );
            const estate = estateRes.rows[0];

            // 2. Create Admin User
            // We need to hash the password here. Since we can't easily import the class instance method from here cleanly 
            // if it wasn't exported as such, we'll use the userService helper if possible or duplicate hash logic.
            // Better: use userService.createUser which handles hashing, but we need to run it within THIS transaction context.
            // Limitations: userService might not support passing a client.
            // Workaround: We will use the 'passwordService' from tokenService.js if available or just raw argon2?
            // Checking imports... we don't have passwordService imported.
            // Let's import userService and hope it's transactional or just use it after estate creation (small risk of orphan estate).
            // Actually, best practice is to require passwordService.

            // For now, let's use userService.createUser sequentially. If it fails, we should rollback estate... 
            // but dbManager.transaction doesn't easily span services unless designed to.
            // Simplified approach: Create estate. Then create user. If user fail, delete estate (manual rollback).

            return estate;
        });

        console.error('CONTROLLER TRANSACTION RESULT:', result);

        // Creating user outside transaction block to use existing service
        try {
            await import('../services/userService.js').then(async (module) => {
                const userService = module.default || module;
                console.error('CONTROLLER IMPORTED USER_SERVICE KEYS:', Object.keys(userService)); // Debug
                const newUser = await userService.createUser({
                    username: adminName || 'Admin',
                    email: adminEmail,
                    password: adminPassword,
                    role: 'admin',
                    estate_id: result.id,
                    employee_id: 'ADM-' + Date.now(),
                    status: 'active'
                });
                console.error('CONTROLLER newUser RESULT:', newUser);

                // Send Welcome Email
                try {
                    const { default: emailService } = await import('../services/emailService.js');
                    await emailService.sendWelcomeEmail(newUser.email, newUser.username, adminPassword);
                    console.log(`Welcome email sent to ${newUser.email}`);
                } catch (emailErr) {
                    console.error('Failed to send welcome email:', emailErr);
                    // Non-blocking error
                }
            });
        } catch (userError) {
            console.error('Failed to create admin user, rolling back estate:', userError);
            if (result && result.id) {
                await dbManager.query('DELETE FROM estates WHERE id = $1', [result.id]);
            }
            throw new Error('Failed to create admin user: ' + userError.message);
        }

        respond(res, { message: 'Estate created successfully', estate: result }, 201);

    } catch (error) {
        console.error('Error creating estate:', error);
        respondError(res, 500, 'Failed to create estate: ' + error.message);
    }
};

// Update estate status (Suspend/Activate)
const updateEstateStatus = async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'super_admin') {
            return respondError(res, 403, 'Forbidden: Super Admin access required');
        }

        const { id } = req.params;
        const { status } = req.body; // 'active', 'suspended'
        console.log('SUPERADMIN: updateEstateStatus called for:', id, 'New Status:', status);
        console.log('User:', req.user);

        if (!['active', 'suspended'].includes(status)) {
            return respondError(res, 400, 'Invalid status. Must be active or suspended');
        }

        const result = await dbManager.query(
            'UPDATE estates SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, status',
            [status, id]
        );

        if (result.rows.length === 0) {
            return respondError(res, 404, 'Estate not found');
        }

        respond(res, result.rows[0]);
    } catch (error) {
        console.error('Error updating estate status:', error);
        respondError(res, 500, 'Failed to update estate status');
    }
};

// Soft delete estate (Decommission) - or hard delete for now if requested, but let's stick to status updates first.
// Actually, user requested "Delete Estate: (High Risk) Soft delete functionality."
// We can use status = 'decommissioned' or a delete flag. Let's use status='decommissioned' for safety.
const deleteEstate = async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'super_admin') {
            return respondError(res, 403, 'Forbidden: Super Admin access required');
        }

        const { id } = req.params;

        // Soft delete via status
        const result = await dbManager.query(
            'UPDATE estates SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, status',
            ['decommissioned', id]
        );

        if (result.rows.length === 0) {
            return respondError(res, 404, 'Estate not found');
        }

        respond(res, { message: 'Estate decommissioned successfully', estate: result.rows[0] });

    } catch (error) {
        console.error('Error deleting estate:', error);
        respondError(res, 500, 'Failed to delete estate');
    }
}

// Search users globally across all estates
const searchGlobalUsers = async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'super_admin') {
            return respondError(res, 403, 'Forbidden: Super Admin access required');
        }

        const { q } = req.query;
        if (!q || q.length < 3) {
            return respondError(res, 400, 'Search query must be at least 3 characters');
        }

        // Using parameterized query for partial search
        const result = await dbManager.query(
            `SELECT 
                u.id, u.name, u.email, u.phone, u.role, u.status, u.estate_id, u.created_at,
                e.name as estate_name
             FROM users u
             LEFT JOIN estates e ON u.estate_id = e.id
             WHERE 
                u.name ILIKE $1 OR 
                u.email ILIKE $1 OR 
                u.phone ILIKE $1
             LIMIT 20`,
            [`%${q}%`]
        );

        // Apply privacy masking to the results for the list view
        const safeUsers = result.rows.map(user => ({
            id: user.id,
            name: user.name,
            email: maskEmail(user.email),
            phone: maskPhone(user.phone),
            role: user.role,
            status: user.status,
            estate_id: user.estate_id,
            estate_name: user.estate_name || 'N/A',
            created_at: user.created_at
        }));

        // Log the search action
        if (req.audit) {
            await req.audit('user.search.global', 'user', null, { query: q, resultCount: safeUsers.length });
        }

        respond(res, safeUsers);

    } catch (error) {
        console.error('Error searching global users:', error);
        respondError(res, 500, 'Failed to search users');
    }
};

// Get global audit logs
const getGlobalLogs = async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'super_admin') {
            return respondError(res, 403, 'Forbidden: Super Admin access required');
        }

        const { limit = 50, offset = 0, type, level } = req.query;

        const logs = await fetchAuditLogs({
            limit: parseInt(limit),
            offset: parseInt(offset),
            eventType: type,
            level
        });

        respond(res, logs);

    } catch (error) {
        console.error('Error fetching global logs:', error);
        respondError(res, 500, 'Failed to fetch audit logs');
    }
};

// Get system health metrics
const getSystemMetrics = async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'super_admin') {
            return respondError(res, 403, 'Forbidden: Super Admin access required');
        }

        // Force a poll to get the absolute latest data
        const snapshot = await metricsService.poll();

        respond(res, snapshot);

    } catch (error) {
        console.error('Error fetching system metrics:', error);
        respondError(res, 500, 'Failed to fetch system metrics');
    }
};

export {
    getPlatformOverview,
    listEstates,
    createEstate,
    updateEstateStatus,
    deleteEstate,
    searchGlobalUsers,
    getGlobalLogs,
    getSystemMetrics
};
