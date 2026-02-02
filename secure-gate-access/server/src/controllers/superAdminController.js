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

        let newUserForEmail = null;

        // Transaction to create estate and admin user atomically
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

            // 2. Create Admin User using the same transaction client
            // Import userService dynamically to avoid potential circular dependency issues at top level,
            // or we could move it to top if verified safe. For now keeping dynamic but inside transaction.
            const module = await import('../services/userService.js');
            const userService = module.default || module;

            const newUser = await userService.createUser({
                username: adminName || 'Admin',
                email: adminEmail,
                password: adminPassword,
                role: 'admin',
                estate_id: estate.id,
                employee_id: 'ADM-' + Date.now(),
                status: 'active',
                account_status: 'active' // Ensure admin is active immediately
            }, client); // Pass the transaction client!

            newUserForEmail = newUser;
            return estate;
        });

        // Send Welcome Email (Outside transaction - if email fails, we don't rollback DB)
        if (newUserForEmail) {
            try {
                const { default: emailService } = await import('../services/emailService.js');
                await emailService.sendWelcomeEmail(newUserForEmail.email, newUserForEmail.username, adminPassword);
                console.log(`Welcome email sent to ${newUserForEmail.email}`);
            } catch (emailErr) {
                console.error('Failed to send welcome email:', emailErr);
                // Non-blocking error
            }
        }

        respond(res, { message: 'Estate created successfully', estate: result }, 201);

    } catch (error) {
        console.error('Error creating estate:', error);
        // Transaction automatically rolled back by dbManager on error
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
        // Fix: Use correct columns (username, first_name, last_name, account_status)
        // Removed phone as it likely doesn't exist in schema
        const result = await dbManager.query(
            `SELECT 
                u.id, u.username, u.first_name, u.last_name, u.email, u.role, u.account_status as status, u.estate_id, u.created_at,
                e.name as estate_name
             FROM users u
             LEFT JOIN estates e ON u.estate_id = e.id
             WHERE 
                u.username ILIKE $1 OR 
                u.first_name ILIKE $1 OR
                u.last_name ILIKE $1 OR
                u.email ILIKE $1
             LIMIT 20`,
            [`%${q}%`]
        );

        // Apply privacy masking to the results for the list view
        const safeUsers = result.rows.map(user => ({
            id: user.id,
            name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username,
            username: user.username,
            email: maskEmail(user.email),
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
