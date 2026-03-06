import { dbManager } from '../database/db.enhanced.js';
import { respond, respondError, camelize } from '../utils/respond.js';
import { maskEmail, maskPhone } from '../utils/redaction.js';

/**
 * Inline audit log query (replaces archived auditLogger.getAuditLogs)
 * Queries the audit_logs table directly with the same filter signature.
 */
const fetchAuditLogs = async (filters = {}) => {
    const {
        userId = null,
        eventType = null,
        level = null,
        startDate = null,
        endDate = null,
        limit = 100,
        offset = 0
    } = filters;

    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const values = [];
    let paramCount = 0;

    if (userId) {
        query += ` AND user_id = $${++paramCount}`;
        values.push(userId);
    }
    if (eventType) {
        query += ` AND action = $${++paramCount}`;
        values.push(eventType);
    }
    if (level) {
        query += ` AND details::json->>'level' = $${++paramCount}`;
        values.push(level);
    }
    if (startDate) {
        query += ` AND created_at >= $${++paramCount}`;
        values.push(startDate);
    }
    if (endDate) {
        query += ` AND created_at <= $${++paramCount}`;
        values.push(endDate);
    }
    query += ` ORDER BY created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    values.push(limit, offset);

    const result = await dbManager.query(query, values);
    return result.rows;
};
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

        // Comprehensive validation with detailed error messages
        const validationErrors = [];

        // Estate name validation
        if (!name || typeof name !== 'string') {
            validationErrors.push({ field: 'name', message: 'Estate name is required' });
        } else {
            const trimmedName = name.trim();
            if (trimmedName.length < 3) {
                validationErrors.push({ field: 'name', message: 'Estate name must be at least 3 characters' });
            } else if (trimmedName.length > 100) {
                validationErrors.push({ field: 'name', message: 'Estate name must not exceed 100 characters' });
            } else if (!/^[a-zA-Z0-9\s\-.'&]+$/.test(trimmedName)) {
                validationErrors.push({ field: 'name', message: 'Estate name contains invalid characters. Only letters, numbers, spaces, hyphens, periods, apostrophes, and ampersands are allowed.' });
            }
        }

        // Admin name validation (optional but if provided must be valid)
        if (adminName && typeof adminName === 'string') {
            const trimmedAdminName = adminName.trim();
            if (trimmedAdminName.length < 2) {
                validationErrors.push({ field: 'adminName', message: 'Admin name must be at least 2 characters' });
            } else if (trimmedAdminName.length > 100) {
                validationErrors.push({ field: 'adminName', message: 'Admin name must not exceed 100 characters' });
            }
        }

        // Admin email validation
        if (!adminEmail || typeof adminEmail !== 'string') {
            validationErrors.push({ field: 'adminEmail', message: 'Admin email is required' });
        } else {
            const trimmedEmail = adminEmail.trim().toLowerCase();
            const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
            if (!emailRegex.test(trimmedEmail)) {
                validationErrors.push({ field: 'adminEmail', message: 'Please provide a valid email address' });
            } else if (trimmedEmail.length > 255) {
                validationErrors.push({ field: 'adminEmail', message: 'Email address must not exceed 255 characters' });
            }
        }

        // Admin password validation (security requirements)
        if (!adminPassword || typeof adminPassword !== 'string') {
            validationErrors.push({ field: 'adminPassword', message: 'Admin password is required' });
        } else {
            if (adminPassword.length < 8) {
                validationErrors.push({ field: 'adminPassword', message: 'Password must be at least 8 characters' });
            }
            if (adminPassword.length > 128) {
                validationErrors.push({ field: 'adminPassword', message: 'Password must not exceed 128 characters' });
            }
            if (!/[a-z]/.test(adminPassword)) {
                validationErrors.push({ field: 'adminPassword', message: 'Password must contain at least one lowercase letter' });
            }
            if (!/[A-Z]/.test(adminPassword)) {
                validationErrors.push({ field: 'adminPassword', message: 'Password must contain at least one uppercase letter' });
            }
            if (!/[0-9]/.test(adminPassword)) {
                validationErrors.push({ field: 'adminPassword', message: 'Password must contain at least one number' });
            }
            if (!/[!@#$%^&*(),.?":{}|<>]/.test(adminPassword)) {
                validationErrors.push({ field: 'adminPassword', message: 'Password must contain at least one special character (!@#$%^&*(),.?":{}|<>)' });
            }
        }

        // Return validation errors if any
        if (validationErrors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: validationErrors
            });
        }

        // Check for duplicate estate name
        const existingEstate = await dbManager.query(
            'SELECT id FROM estates WHERE LOWER(name) = LOWER($1)',
            [name.trim()]
        );
        if (existingEstate.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'An estate with this name already exists',
                errors: [{ field: 'name', message: 'Estate name must be unique' }]
            });
        }

        // Check for duplicate admin email
        const existingUser = await dbManager.query(
            'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
            [adminEmail.trim()]
        );
        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'A user with this email already exists',
                errors: [{ field: 'adminEmail', message: 'Email address is already in use' }]
            });
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

/**
 * Get estate decommission impact summary
 * Shows what will be affected when decommissioning an estate
 */
const getEstateDecommissionImpact = async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'super_admin') {
            return respondError(res, 403, 'Forbidden: Super Admin access required');
        }

        const { id } = req.params;

        // Get estate details
        const estateResult = await dbManager.query(
            'SELECT id, name, status, created_at FROM estates WHERE id = $1',
            [id]
        );

        if (estateResult.rows.length === 0) {
            return respondError(res, 404, 'Estate not found');
        }

        const estate = estateResult.rows[0];

        if (estate.status === 'decommissioned') {
            return respondError(res, 400, 'Estate is already decommissioned');
        }

        // Get impact counts
        const [usersResult, adminsResult, guardsResult, residentsResult, visitorsResult, incidentsResult] = await Promise.all([
            dbManager.query('SELECT COUNT(*) FROM users WHERE estate_id = $1', [id]),
            dbManager.query("SELECT COUNT(*) FROM users WHERE estate_id = $1 AND role = 'admin'", [id]),
            dbManager.query("SELECT COUNT(*) FROM users WHERE estate_id = $1 AND role = 'guard'", [id]),
            dbManager.query("SELECT COUNT(*) FROM users WHERE estate_id = $1 AND role = 'resident'", [id]),
            dbManager.query('SELECT COUNT(*) FROM visitors WHERE estate_id = $1', [id]),
            dbManager.query('SELECT COUNT(*) FROM incidents WHERE estate_id = $1', [id])
        ]);

        const impact = {
            estate: {
                id: estate.id,
                name: estate.name,
                status: estate.status,
                createdAt: estate.created_at
            },
            affectedCounts: {
                totalUsers: parseInt(usersResult.rows[0].count),
                admins: parseInt(adminsResult.rows[0].count),
                guards: parseInt(guardsResult.rows[0].count),
                residents: parseInt(residentsResult.rows[0].count),
                visitors: parseInt(visitorsResult.rows[0].count),
                incidents: parseInt(incidentsResult.rows[0].count)
            },
            warnings: []
        };

        // Add warnings based on impact
        if (impact.affectedCounts.totalUsers > 0) {
            impact.warnings.push(`${impact.affectedCounts.totalUsers} users will lose access to the system`);
        }
        if (impact.affectedCounts.admins > 0) {
            impact.warnings.push(`${impact.affectedCounts.admins} admin account(s) will be affected`);
        }
        if (impact.affectedCounts.visitors > 0) {
            impact.warnings.push(`${impact.affectedCounts.visitors} visitor record(s) will be archived`);
        }

        // Generate confirmation code (estate name in uppercase, no spaces)
        impact.confirmationRequired = estate.name.toUpperCase().replace(/\s+/g, '');

        respond(res, impact);

    } catch (error) {
        console.error('Error getting estate decommission impact:', error);
        respondError(res, 500, 'Failed to get estate impact summary');
    }
};

/**
 * Decommission an estate with confirmation
 * Requires typing the estate name to confirm
 */
const deleteEstate = async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'super_admin') {
            return respondError(res, 403, 'Forbidden: Super Admin access required');
        }

        const { id } = req.params;
        const { confirmationText, reason } = req.body;

        // Get estate to validate confirmation
        const estateResult = await dbManager.query(
            'SELECT id, name, status FROM estates WHERE id = $1',
            [id]
        );

        if (estateResult.rows.length === 0) {
            return respondError(res, 404, 'Estate not found');
        }

        const estate = estateResult.rows[0];

        if (estate.status === 'decommissioned') {
            return respondError(res, 400, 'Estate is already decommissioned');
        }

        // Validate confirmation text (must match estate name in uppercase, no spaces)
        const expectedConfirmation = estate.name.toUpperCase().replace(/\s+/g, '');
        if (!confirmationText || confirmationText.toUpperCase().replace(/\s+/g, '') !== expectedConfirmation) {
            return res.status(400).json({
                success: false,
                message: 'Confirmation text does not match estate name',
                errors: [{
                    field: 'confirmationText',
                    message: `Please type "${expectedConfirmation}" to confirm decommissioning`
                }]
            });
        }

        // Log the decommission action before executing
        if (req.audit) {
            await req.audit('estate.decommission', 'estate', id, {
                estateName: estate.name,
                reason: reason || 'No reason provided',
                performedBy: req.user.id
            });
        }

        // Soft delete via status
        const result = await dbManager.query(
            `UPDATE estates 
             SET status = 'decommissioned', 
                 updated_at = NOW(),
                 decommissioned_at = NOW(),
                 decommissioned_by = $1,
                 decommission_reason = $2
             WHERE id = $3 
             RETURNING id, name, status`,
            [req.user.id, reason || null, id]
        );

        respond(res, {
            message: 'Estate decommissioned successfully',
            estate: result.rows[0],
            note: 'All users from this estate will no longer be able to access the system'
        });

    } catch (error) {
        console.error('Error deleting estate:', error);
        respondError(res, 500, 'Failed to delete estate');
    }
}

// Search users globally across all estates with pagination
const searchGlobalUsers = async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'super_admin') {
            return respondError(res, 403, 'Forbidden: Super Admin access required');
        }

        const { q, page = 1, limit = 20, role, status, estate_id, sortBy = 'created_at', sortOrder = 'desc' } = req.query;

        if (!q || q.length < 3) {
            return respondError(res, 400, 'Search query must be at least 3 characters');
        }

        // Validate and sanitize pagination params
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
        const offset = (pageNum - 1) * limitNum;

        // Validate sort options
        const allowedSortFields = ['created_at', 'username', 'email', 'role'];
        const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
        const safeSortOrder = sortOrder?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

        // Build dynamic WHERE clause for filters
        let whereConditions = `(u.username ILIKE $1 OR u.first_name ILIKE $1 OR u.last_name ILIKE $1 OR u.email ILIKE $1)`;
        const queryParams = [`%${q}%`];
        let paramIndex = 2;

        // Optional role filter
        if (role) {
            whereConditions += ` AND u.role = $${paramIndex}`;
            queryParams.push(role);
            paramIndex++;
        }

        // Optional status filter
        if (status) {
            whereConditions += ` AND u.account_status = $${paramIndex}`;
            queryParams.push(status);
            paramIndex++;
        }

        // Optional estate filter
        if (estate_id) {
            whereConditions += ` AND u.estate_id = $${paramIndex}`;
            queryParams.push(parseInt(estate_id));
            paramIndex++;
        }

        // Count total results for pagination
        const countQuery = `
            SELECT COUNT(*) as total
            FROM users u
            LEFT JOIN estates e ON u.estate_id = e.id
            WHERE ${whereConditions}
        `;
        const countResult = await dbManager.query(countQuery, queryParams);
        const totalItems = parseInt(countResult.rows[0].total);
        const totalPages = Math.ceil(totalItems / limitNum);

        // Main search query with pagination
        const searchQuery = `
            SELECT 
                u.id, u.username, u.first_name, u.last_name, u.email, u.role, 
                u.account_status as status, u.estate_id, u.created_at,
                e.name as estate_name
            FROM users u
            LEFT JOIN estates e ON u.estate_id = e.id
            WHERE ${whereConditions}
            ORDER BY u.${safeSortBy} ${safeSortOrder}
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;

        const result = await dbManager.query(searchQuery, [...queryParams, limitNum, offset]);

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
            await req.audit('user.search.global', 'user', null, {
                query: q,
                resultCount: safeUsers.length,
                totalCount: totalItems,
                filters: { role, status, estate_id }
            });
        }

        respond(res, {
            users: safeUsers,
            pagination: {
                page: pageNum,
                limit: limitNum,
                totalItems,
                totalPages,
                hasMore: pageNum < totalPages
            }
        });

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
    getEstateDecommissionImpact,
    deleteEstate,
    searchGlobalUsers,
    getGlobalLogs,
    getSystemMetrics
};
