import { rest } from 'msw';

// Note: Using wildcard pattern (*/api/...) to match both relative and absolute URLs
// This ensures MSW intercepts requests regardless of whether baseURL is set

export const handlers = [
    // GET /api/estates/available
    rest.get('*/api/estates/available', (req, res, ctx) => {
        return res(
            ctx.status(200),
            ctx.json({
                success: true,
                data: {
                    estates: [
                        { id: 1, name: 'Sunnyvale Estate' },
                        { id: 2, name: 'Greenwood Estate' }
                    ]
                }
            })
        );
    }),

    // GET /api/auth/me - Check auth status
    rest.get('*/api/auth/me', (req, res, ctx) => {
        const isAuthenticated = req.cookies && req.cookies.token;
        return res(
            ctx.status(401),
            ctx.json({ success: false, message: 'Not authenticated' })
        );
    }),

    // POST /api/auth/login
    rest.post('*/api/auth/login', async (req, res, ctx) => {
        const { username, password } = await req.json();

        if (username === 'resident@test.com' && password === 'testpass123') {
            return res(
                ctx.status(200),
                ctx.cookie('token', 'mock-jwt-token'),
                ctx.json({
                    success: true,
                    data: {
                        user: {
                            id: 1,
                            email: 'resident@test.com',
                            username: 'testuser',
                            role: 'resident'
                        }
                    }
                })
            );
        }

        if (username === 'wrong@test.com') {
            return res(
                ctx.status(401),
                ctx.json({ success: false, message: 'Invalid credentials' })
            );
        }

        return res(
            ctx.status(401),
            ctx.json({ success: false, message: 'Invalid credentials' })
        );
    }),

    // POST /api/auth/logout
    rest.post('*/api/auth/logout', (req, res, ctx) => {
        return res(
            ctx.status(200),
            ctx.cookie('token', ''),
            ctx.json({ success: true, message: 'Logged out' })
        );
    }),

    // POST /api/auth/register
    rest.post('*/api/auth/register', async (req, res, ctx) => {
        const body = await req.json();

        if (body.username === 'duplicate') {
            return res(
                ctx.status(409),
                ctx.json({ success: false, message: 'Email already exists' })
            );
        }

        return res(
            ctx.status(201),
            ctx.json({
                success: true,
                message: 'Registration successful',
                data: {
                    user: {
                        id: 2,
                        email: body.email,
                        username: body.username,
                        role: 'resident'
                    }
                }
            })
        );
    }),

    // POST /api/visitors - Create visitor
    rest.post('*/api/visitors', async (req, res, ctx) => {
        const visitorData = await req.json();

        const newVisitor = {
            id: Math.floor(Math.random() * 1000),
            ...visitorData,
            status: 'pending',
            invite_code: 'NEW' + Math.random().toString(36).substr(2, 6).toUpperCase(),
            created_at: new Date().toISOString()
        };

        return res(
            ctx.status(201),
            ctx.json(newVisitor)
        );
    }),

    // GET /api/visitors - Get all visitors
    rest.get('*/api/visitors', (req, res, ctx) => {
        return res(
            ctx.status(200),
            ctx.json({
                success: true,
                data: {
                    visitors: [
                        {
                            id: 1,
                            name: 'John Doe',
                            phone: '+254700123456',
                            status: 'pending'
                        },
                        {
                            id: 2,
                            name: 'Jane Smith',
                            phone: '+254700123457',
                            status: 'approved'
                        }
                    ]
                },
                total: 2
            })
        );
    }),

    // GET /api/dashboard/stats - Resident dashboard stats
    rest.get('*/api/dashboard/stats', (req, res, ctx) => {
        return res(
            ctx.status(200),
            ctx.json({
                upcomingVisits: 5,
                activeVisitors: 2,
                totalVisitors: 15
            })
        );
    }),

    // GET /api/visitors/active - Guard dashboard active visitors
    rest.get('*/api/visitors/active', (req, res, ctx) => {
        return res(
            ctx.status(200),
            ctx.json([
                {
                    id: 2,
                    name: 'Jane Smith',
                    phone: '+254700123457',
                    status: 'approved'
                }
            ])
        );
    }),

    // POST /api/visitors/:id/check-in - Check in visitor
    rest.post('*/api/visitors/:id/check-in', (req, res, ctx) => {
        return res(
            ctx.status(200),
            ctx.json({
                message: 'Visitor checked in successfully',
                check_in: new Date().toISOString()
            })
        );
    }),

    // GET /api/admin/metrics - Admin dashboard metrics
    rest.get('*/api/admin/metrics', (req, res, ctx) => {
        return res(
            ctx.status(200),
            ctx.json({
                totalUsers: 150,
                totalVisitors: 1250,
                activeVisitors: 15,
                todayStats: {
                    checkIns: 23,
                    checkOuts: 20
                }
            })
        );
    }),

    // ============================================
    // RESIDENT ENDPOINTS
    // ============================================

    // POST /api/visitors/bulk-invite - Bulk invite visitors
    rest.post('*/api/visitors/bulk-invite', async (req, res, ctx) => {
        const { visitors } = await req.json();
        const results = visitors.map((v, i) => ({
            ...v,
            id: 100 + i,
            status: 'pending',
            invite_code: 'BULK' + Math.random().toString(36).substr(2, 6).toUpperCase(),
            success: true
        }));
        return res(
            ctx.status(201),
            ctx.json({ success: true, data: results, sent: visitors.length, failed: 0 })
        );
    }),

    // GET /api/auto-approval/rules - Get auto-approval rules
    rest.get('*/api/auto-approval/rules', (req, res, ctx) => {
        return res(
            ctx.status(200),
            ctx.json({
                success: true,
                data: [
                    { id: 1, name: 'Family', category: 'family', match_name: 'John Doe', match_phone: null, active: true },
                    { id: 2, name: 'Cleaner', category: 'service', match_name: null, match_phone: '+254700111222', active: true }
                ]
            })
        );
    }),

    // POST /api/auto-approval/rules - Create auto-approval rule
    rest.post('*/api/auto-approval/rules', async (req, res, ctx) => {
        const rule = await req.json();
        return res(
            ctx.status(201),
            ctx.json({
                success: true,
                data: { id: 3, ...rule, active: true, created_at: new Date().toISOString() }
            })
        );
    }),

    // PUT /api/auto-approval/rules/:id - Update auto-approval rule
    rest.put('*/api/auto-approval/rules/:id', async (req, res, ctx) => {
        const { id } = req.params;
        const updates = await req.json();
        return res(
            ctx.status(200),
            ctx.json({ success: true, data: { id: parseInt(id), ...updates } })
        );
    }),

    // DELETE /api/auto-approval/rules/:id - Delete auto-approval rule
    rest.delete('*/api/auto-approval/rules/:id', (req, res, ctx) => {
        return res(ctx.status(200), ctx.json({ success: true, message: 'Rule deleted' }));
    }),

    // PATCH /api/auto-approval/rules/:id/toggle - Toggle rule active state
    rest.patch('*/api/auto-approval/rules/:id/toggle', (req, res, ctx) => {
        return res(ctx.status(200), ctx.json({ success: true, active: false }));
    }),

    // GET /api/auto-approval/categories - Get rule categories
    rest.get('*/api/auto-approval/categories', (req, res, ctx) => {
        return res(
            ctx.status(200),
            ctx.json({
                success: true,
                data: ['family', 'friend', 'service', 'delivery', 'other']
            })
        );
    }),

    // GET /api/favorites - Get favorite visitors
    rest.get('*/api/favorites', (req, res, ctx) => {
        return res(
            ctx.status(200),
            ctx.json({
                success: true,
                data: [
                    { id: 1, name: 'Mom', phone: '+254700111111', category: 'family' },
                    { id: 2, name: 'Plumber Joe', phone: '+254700222222', category: 'service' }
                ]
            })
        );
    }),

    // POST /api/favorites - Add favorite visitor
    rest.post('*/api/favorites', async (req, res, ctx) => {
        const favorite = await req.json();
        return res(
            ctx.status(201),
            ctx.json({ success: true, data: { id: 3, ...favorite } })
        );
    }),

    // DELETE /api/favorites/:id - Remove favorite
    rest.delete('*/api/favorites/:id', (req, res, ctx) => {
        return res(ctx.status(200), ctx.json({ success: true }));
    }),

    // GET /api/deliveries - Get resident deliveries
    rest.get('*/api/deliveries', (req, res, ctx) => {
        return res(
            ctx.status(200),
            ctx.json({
                success: true,
                data: [
                    { id: 1, courier: 'DHL', description: 'Package', status: 'pending', created_at: new Date().toISOString() },
                    { id: 2, courier: 'FedEx', description: 'Documents', status: 'collected', created_at: new Date().toISOString() }
                ]
            })
        );
    }),

    // PUT /api/deliveries/:id/handoff-preference - Set delivery preference
    rest.put('*/api/deliveries/:id/handoff-preference', async (req, res, ctx) => {
        const { preference } = await req.json();
        return res(ctx.status(200), ctx.json({ success: true, preference }));
    }),

    // GET /api/visitors/:id/pass - Generate visitor pass
    rest.get('*/api/visitors/:id/pass', (req, res, ctx) => {
        const { id } = req.params;
        return res(
            ctx.status(200),
            ctx.json({
                success: true,
                data: {
                    visitor_id: parseInt(id),
                    qr_code: `PASS-${id}-${Date.now()}`,
                    valid_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
                }
            })
        );
    }),

    // POST /api/visitors/:id/approve - Approve visitor
    rest.post('*/api/visitors/:id/approve', (req, res, ctx) => {
        return res(
            ctx.status(200),
            ctx.json({ success: true, message: 'Visitor approved', status: 'approved' })
        );
    }),

    // POST /api/visitors/:id/reject - Reject visitor
    rest.post('*/api/visitors/:id/reject', (req, res, ctx) => {
        return res(
            ctx.status(200),
            ctx.json({ success: true, message: 'Visitor rejected', status: 'rejected' })
        );
    }),

    // GET /api/visitors/pending-approval - Get pending visitors for resident
    rest.get('*/api/visitors/pending-approval', (req, res, ctx) => {
        return res(
            ctx.status(200),
            ctx.json({
                success: true,
                data: [
                    { id: 10, name: 'Walk-in Guest', phone: '+254700333333', status: 'pending_approval', created_at: new Date().toISOString() }
                ]
            })
        );
    }),

    // GET /api/auth/profile - Get user profile
    rest.get('*/api/auth/profile', (req, res, ctx) => {
        return res(
            ctx.status(200),
            ctx.json({
                success: true,
                data: {
                    id: 1,
                    email: 'resident@test.com',
                    name: 'Test Resident',
                    phone: '+254700000000',
                    estate_id: 1,
                    unit_number: 'A101'
                }
            })
        );
    }),

    // PUT /api/auth/profile - Update user profile
    rest.put('*/api/auth/profile', async (req, res, ctx) => {
        const updates = await req.json();
        return res(
            ctx.status(200),
            ctx.json({ success: true, data: { id: 1, ...updates } })
        );
    }),

    // ============================================
    // GUARD ENDPOINTS
    // ============================================

    // POST /api/visitors/walk-in - Register walk-in visitor
    rest.post('*/api/visitors/walk-in', async (req, res, ctx) => {
        const visitor = await req.json();
        return res(
            ctx.status(201),
            ctx.json({
                success: true,
                data: {
                    id: 50,
                    ...visitor,
                    status: 'pending_approval',
                    created_at: new Date().toISOString()
                }
            })
        );
    }),

    // POST /api/visitors/:id/check-out - Check out visitor
    rest.post('*/api/visitors/:id/check-out', (req, res, ctx) => {
        return res(
            ctx.status(200),
            ctx.json({
                success: true,
                message: 'Visitor checked out',
                check_out: new Date().toISOString()
            })
        );
    }),

    // GET /api/visitors/by-qr/:code - Lookup visitor by QR code
    rest.get('*/api/visitors/by-qr/:code', (req, res, ctx) => {
        const { code } = req.params;
        if (code === 'INVALID') {
            return res(ctx.status(404), ctx.json({ success: false, message: 'Invalid QR code' }));
        }
        if (code === 'EXPIRED') {
            return res(ctx.status(410), ctx.json({ success: false, message: 'Pass has expired' }));
        }
        return res(
            ctx.status(200),
            ctx.json({
                success: true,
                data: {
                    id: 2,
                    name: 'Jane Smith',
                    phone: '+254700123457',
                    status: 'approved',
                    host_name: 'Test Resident',
                    unit_number: 'A101'
                }
            })
        );
    }),

    // POST /api/emergency/panic-button - Trigger emergency
    rest.post('*/api/emergency/panic-button', async (req, res, ctx) => {
        const { location } = await req.json();
        return res(
            ctx.status(201),
            ctx.json({
                success: true,
                data: {
                    id: 1,
                    status: 'active',
                    triggered_by: 'guard-1',
                    location,
                    created_at: new Date().toISOString(),
                    cancel_deadline: new Date(Date.now() + 30000).toISOString()
                }
            })
        );
    }),

    // POST /api/emergency/:id/cancel - Cancel emergency
    rest.post('*/api/emergency/:id/cancel', (req, res, ctx) => {
        return res(ctx.status(200), ctx.json({ success: true, message: 'Emergency cancelled' }));
    }),

    // POST /api/emergency/:id/acknowledge - Acknowledge emergency
    rest.post('*/api/emergency/:id/acknowledge', (req, res, ctx) => {
        return res(ctx.status(200), ctx.json({ success: true, message: 'Emergency acknowledged' }));
    }),

    // POST /api/emergency/:id/resolve - Resolve emergency
    rest.post('*/api/emergency/:id/resolve', (req, res, ctx) => {
        return res(ctx.status(200), ctx.json({ success: true, message: 'Emergency resolved' }));
    }),

    // GET /api/emergency/active - Get active emergencies
    rest.get('*/api/emergency/active', (req, res, ctx) => {
        return res(ctx.status(200), ctx.json({ success: true, data: [] }));
    }),

    // GET /api/guard/incidents - Get incidents
    rest.get('*/api/guard/incidents', (req, res, ctx) => {
        return res(
            ctx.status(200),
            ctx.json({
                success: true,
                data: [
                    { id: 1, type: 'suspicious_activity', description: 'Unknown vehicle', status: 'open', created_at: new Date().toISOString() }
                ]
            })
        );
    }),

    // POST /api/guard/incidents - Create incident
    rest.post('*/api/guard/incidents', async (req, res, ctx) => {
        const incident = await req.json();
        return res(
            ctx.status(201),
            ctx.json({
                success: true,
                data: { id: 2, ...incident, status: 'open', created_at: new Date().toISOString() }
            })
        );
    }),

    // GET /api/guard/analytics - Guard analytics
    rest.get('*/api/guard/analytics', (req, res, ctx) => {
        return res(
            ctx.status(200),
            ctx.json({
                success: true,
                data: {
                    todayCheckIns: 15,
                    todayCheckOuts: 12,
                    avgProcessingTime: 45,
                    peakHour: '09:00'
                }
            })
        );
    }),

    // GET /api/deliveries/pending - Guard pending deliveries
    rest.get('*/api/deliveries/pending', (req, res, ctx) => {
        return res(
            ctx.status(200),
            ctx.json({
                success: true,
                data: [
                    { id: 1, resident_name: 'Test Resident', unit: 'A101', courier: 'DHL', created_at: new Date().toISOString() }
                ]
            })
        );
    }),

    // POST /api/deliveries - Register delivery
    rest.post('*/api/deliveries', async (req, res, ctx) => {
        const delivery = await req.json();
        return res(
            ctx.status(201),
            ctx.json({
                success: true,
                data: { id: 3, ...delivery, status: 'pending', created_at: new Date().toISOString() }
            })
        );
    }),

    // POST /api/deliveries/:id/notify - Notify resident about delivery
    rest.post('*/api/deliveries/:id/notify', (req, res, ctx) => {
        return res(ctx.status(200), ctx.json({ success: true, message: 'Notification sent' }));
    }),

    // POST /api/deliveries/:id/collect - Mark delivery collected
    rest.post('*/api/deliveries/:id/collect', (req, res, ctx) => {
        return res(
            ctx.status(200),
            ctx.json({ success: true, message: 'Delivery marked as collected', status: 'collected' })
        );
    }),

    // GET /api/guard/visitor-history - Guard visitor history
    rest.get('*/api/guard/visitor-history', (req, res, ctx) => {
        return res(
            ctx.status(200),
            ctx.json({
                success: true,
                data: [
                    { id: 1, name: 'Past Visitor', check_in: new Date().toISOString(), check_out: new Date().toISOString() }
                ],
                total: 1
            })
        );
    }),

    // ============================================
    // ADMIN ENDPOINTS
    // ============================================

    // GET /api/admin/users/pending - Pending user approvals
    rest.get('*/api/admin/users/pending', (req, res, ctx) => {
        return res(
            ctx.status(200),
            ctx.json({
                success: true,
                data: [
                    { id: 5, email: 'newuser@test.com', name: 'New User', phone: '+254700444444', created_at: new Date().toISOString() }
                ]
            })
        );
    }),

    // PUT /api/admin/users/:id/status - Update user status
    rest.put('*/api/admin/users/:id/status', async (req, res, ctx) => {
        const { status, estate_id } = await req.json();
        return res(
            ctx.status(200),
            ctx.json({ success: true, message: `User ${status}`, estate_id })
        );
    }),

    // GET /api/admin/residents - Get all residents
    rest.get('*/api/admin/residents', (req, res, ctx) => {
        return res(
            ctx.status(200),
            ctx.json({
                success: true,
                data: [
                    { id: 1, name: 'Test Resident', email: 'resident@test.com', unit: 'A101', status: 'active' },
                    { id: 2, name: 'Another Resident', email: 'another@test.com', unit: 'B202', status: 'active' }
                ],
                total: 2
            })
        );
    }),

    // PUT /api/admin/residents/:id - Update resident
    rest.put('*/api/admin/residents/:id', async (req, res, ctx) => {
        const updates = await req.json();
        return res(ctx.status(200), ctx.json({ success: true, data: updates }));
    }),

    // DELETE /api/admin/residents/:id - Delete resident
    rest.delete('*/api/admin/residents/:id', (req, res, ctx) => {
        return res(ctx.status(200), ctx.json({ success: true, message: 'Resident deleted' }));
    }),

    // GET /api/guards - Get all guards
    rest.get('*/api/guards', (req, res, ctx) => {
        return res(
            ctx.status(200),
            ctx.json({
                success: true,
                data: [
                    { id: 1, name: 'Guard One', email: 'guard1@test.com', status: 'active', shift: 'day' },
                    { id: 2, name: 'Guard Two', email: 'guard2@test.com', status: 'active', shift: 'night' }
                ]
            })
        );
    }),

    // POST /api/guards - Create guard
    rest.post('*/api/guards', async (req, res, ctx) => {
        const guard = await req.json();
        return res(
            ctx.status(201),
            ctx.json({ success: true, data: { id: 3, ...guard, status: 'active' } })
        );
    }),

    // PUT /api/guards/:id - Update guard
    rest.put('*/api/guards/:id', async (req, res, ctx) => {
        const updates = await req.json();
        return res(ctx.status(200), ctx.json({ success: true, data: updates }));
    }),

    // GET /api/guards/:id/shifts - Get guard shifts
    rest.get('*/api/guards/:id/shifts', (req, res, ctx) => {
        return res(
            ctx.status(200),
            ctx.json({
                success: true,
                data: [
                    { id: 1, date: new Date().toISOString(), start: '06:00', end: '18:00', type: 'day' }
                ]
            })
        );
    }),

    // POST /api/guards/:id/shifts - Create guard shift
    rest.post('*/api/guards/:id/shifts', async (req, res, ctx) => {
        const shift = await req.json();
        return res(ctx.status(201), ctx.json({ success: true, data: { id: 2, ...shift } }));
    }),

    // GET /api/admin/audit-logs - Get audit logs
    rest.get('*/api/admin/audit-logs', (req, res, ctx) => {
        return res(
            ctx.status(200),
            ctx.json({
                success: true,
                data: [
                    { id: 1, action: 'user.login', actor: 'admin@test.com', timestamp: new Date().toISOString() },
                    { id: 2, action: 'visitor.check_in', actor: 'guard@test.com', timestamp: new Date().toISOString() }
                ],
                total: 2
            })
        );
    }),

    // GET /api/visitors/reports - Get visitor reports
    rest.get('*/api/visitors/reports', (req, res, ctx) => {
        return res(
            ctx.status(200),
            ctx.json({
                success: true,
                data: {
                    summary: { total: 100, checked_in: 80, checked_out: 75, pending: 5 },
                    daily: [
                        { date: new Date().toISOString(), count: 15 }
                    ]
                }
            })
        );
    }),

    // GET /api/announcements - Get announcements
    rest.get('*/api/announcements', (req, res, ctx) => {
        return res(
            ctx.status(200),
            ctx.json({
                success: true,
                data: [
                    { id: 1, title: 'Maintenance Notice', content: 'Water will be off tomorrow', active: true, created_at: new Date().toISOString() }
                ]
            })
        );
    }),

    // POST /api/announcements - Create announcement
    rest.post('*/api/announcements', async (req, res, ctx) => {
        const announcement = await req.json();
        return res(
            ctx.status(201),
            ctx.json({ success: true, data: { id: 2, ...announcement, active: true, created_at: new Date().toISOString() } })
        );
    }),

    // PUT /api/announcements/:id - Update announcement
    rest.put('*/api/announcements/:id', async (req, res, ctx) => {
        const updates = await req.json();
        return res(ctx.status(200), ctx.json({ success: true, data: updates }));
    }),

    // DELETE /api/announcements/:id - Delete announcement
    rest.delete('*/api/announcements/:id', (req, res, ctx) => {
        return res(ctx.status(200), ctx.json({ success: true, message: 'Announcement deleted' }));
    }),

    // GET /api/admin/analytics - Admin analytics
    rest.get('*/api/admin/analytics', (req, res, ctx) => {
        return res(
            ctx.status(200),
            ctx.json({
                success: true,
                data: {
                    visitorTrends: [{ date: new Date().toISOString(), count: 25 }],
                    peakHours: { '09:00': 15, '14:00': 20 },
                    topHosts: [{ name: 'Test Resident', count: 10 }]
                }
            })
        );
    }),

    // GET /api/health/detailed - Health check
    rest.get('*/api/health/detailed', (req, res, ctx) => {
        return res(
            ctx.status(200),
            ctx.json({
                status: 'healthy',
                services: {
                    database: 'up',
                    redis: 'up',
                    email: 'up'
                }
            })
        );
    }),

    // ============================================
    // VISITOR (PUBLIC) ENDPOINTS
    // ============================================

    // GET /api/public/visitors/by-token/:token - Get visitor by token
    rest.get('*/api/public/visitors/by-token/:token', (req, res, ctx) => {
        const { token } = req.params;
        if (token === 'invalid-token') {
            return res(ctx.status(404), ctx.json({ success: false, message: 'Invite not found or has expired' }));
        }
        if (token === 'expired-token') {
            return res(ctx.status(410), ctx.json({ success: false, message: 'Invite has expired' }));
        }
        return res(
            ctx.status(200),
            ctx.json({
                success: true,
                data: {
                    id: 1,
                    name: 'Test Visitor',
                    phone: '+254700123456',
                    status: 'pending_confirmation',
                    date_of_visit: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                    time_of_visit: '10:00',
                    host_name: 'Test Resident',
                    estate_id: 1,
                    qr_code: 'PASS-1-' + Date.now()
                }
            })
        );
    }),

    // POST /api/public/visitors/:token/confirm - Confirm visitor details
    rest.post('*/api/public/visitors/:token/confirm', async (req, res, ctx) => {
        const { id_number, vehicle_plate, consent } = await req.json();
        if (!consent) {
            return res(ctx.status(400), ctx.json({ success: false, message: 'Privacy consent required' }));
        }
        return res(
            ctx.status(200),
            ctx.json({
                success: true,
                message: 'Visit confirmed',
                data: { status: 'approved', id_number, vehicle_plate }
            })
        );
    }),

    // GET /api/public/visitors/:token/status - Get visitor status
    rest.get('*/api/public/visitors/:token/status', (req, res, ctx) => {
        return res(
            ctx.status(200),
            ctx.json({ success: true, data: { status: 'approved' } })
        );
    }),

    // GET /api/public/estate-info - Get estate info for visitors
    rest.get('*/api/public/estate-info', (req, res, ctx) => {
        const estateId = req.url.searchParams.get('estateId');
        return res(
            ctx.status(200),
            ctx.json({
                success: true,
                data: {
                    id: parseInt(estateId) || 1,
                    name: 'Test Estate',
                    address: '123 Test Street',
                    directions: 'Take the main gate entrance'
                }
            })
        );
    }),

    // GET /api/residents/search - Search residents by unit
    rest.get('*/api/residents/search', (req, res, ctx) => {
        const unit = req.url.searchParams.get('unit');
        if (unit === 'NOTFOUND') {
            return res(ctx.status(404), ctx.json({ success: false, message: 'Unit not found' }));
        }
        return res(
            ctx.status(200),
            ctx.json({
                success: true,
                data: {
                    id: 1,
                    name: 'Test Resident',
                    unit_number: unit || 'A101'
                }
            })
        );
    })
];
